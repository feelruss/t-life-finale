// This is the src/libs/auth.js file
import { supabase } from "../libs/supabase";

const VALID_ROLES = new Set([
  "student",
  "admin",
  "analytics_viewer",
  "super_admin",
]);

const ADMIN_ROLES = new Set(["admin", "analytics_viewer", "super_admin"]);

export const PROGRAMME_FACULTY_MAP = Object.freeze({
  "Bachelor of Computer Science (Hons.)": "Computing",
  "Bachelor of Software Engineering (Hons.)": "Computing",
  "Bachelor of Business (Hons.)": "Business",
  "Bachelor of Accounting (Hons.)": "Business",
  "Bachelor of Psychology (Hons.)": "General Studies",
  "Foundation in Arts": "General Studies",
  "Foundation in Business": "Business",
  "Diploma in Communication": "Communication",
  "Diploma in Information Technology": "Computing",
  "Diploma in Hospitality Management": "Hospitality",
});

export const getFacultyFromProgramme = (programme) => {
  const normalizedProgramme = String(programme || "").trim();
  return PROGRAMME_FACULTY_MAP[normalizedProgramme] || "";
};

export const normalizeRole = (role) => {
  const normalized = String(role || "student")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");

  return VALID_ROLES.has(normalized) ? normalized : "student";
};

async function updateAdminLastLogin(userId, role) {
  const normalizedRole = normalizeRole(role);

  if (!userId || !ADMIN_ROLES.has(normalizedRole)) {
    return null;
  }

  const lastLogin = new Date().toISOString();

  const { data, error } = await supabase
    .from("users")
    .update({
      last_login: lastLogin,
    })
    .eq("id", userId)
    .select("last_login")
    .maybeSingle();

  if (error) {
    console.error("Failed to update admin last login:", error);
    return null;
  }

  if (!data) {
    console.warn(
      "Admin last login was not updated because no matching public.users row was found.",
    );
    return null;
  }

  return data.last_login || lastLogin;
}

/*
 * Gets the currently authenticated Supabase user and combines it with the matching public.users profile.
 */
export async function getCurrentSupabaseUser(sessionUser = null) {
  let authUser = sessionUser;

  if (!authUser) {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      throw error;
    }

    authUser = user;
  }

  if (!authUser?.id) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select(
      `
        id,
        full_name,
        email,
        role,
        faculty,
        programme,
        avatar,
        last_login,
        last_active_at,
        created_at,
        updated_at
      `,
    )
    .eq("id", authUser.id)
    .maybeSingle();

  if (profileError) {
    throw new Error(
      `Unable to load the authenticated user profile: ${profileError.message}`,
    );
  }

  /*
   * Important:
   * Do not return a user with role "student" when the database profile was not loaded.
   */
  if (!profile) {
    throw new Error(
      "The authenticated account exists, but its public.users profile could not be loaded.",
    );
  }

  const metadata = authUser.user_metadata || {};
  const role = normalizeRole(profile.role);

  return {
    ...authUser,
    ...profile,

    id: authUser.id,

    email: profile.email || authUser.email || "",

    full_name:
      profile.full_name ||
      metadata.full_name ||
      metadata.name ||
      authUser.email?.split("@")[0] ||
      "User",

    role,

    faculty: profile.faculty || "",

    programme: profile.programme || "",

    avatar:
      profile.avatar ||
      (profile.full_name || metadata.full_name || authUser.email || "U")
        .charAt(0)
        .toUpperCase(),

    user_metadata: metadata,
  };
}

// Sign in any existing student or admin account.
export async function signInWithPassword(email, password) {
  const normalizedEmail = String(email || "")
    .trim()
    .toLowerCase();

  if (!normalizedEmail) {
    throw new Error("Email is required.");
  }

  if (!password) {
    throw new Error("Password is required.");
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });

  if (error) {
    throw error;
  }

  if (!data.user) {
    throw new Error("Supabase did not return a user.");
  }

  // Load the public.users profile first so that the role comes from the database rather than editable metadata.
  const currentUser = await getCurrentSupabaseUser(data.user);

  if (!currentUser) {
    throw new Error("The authenticated user profile could not be loaded.");
  }

  const updatedLastLogin = await updateAdminLastLogin(
    currentUser.id,
    currentUser.role,
  );

  return {
    ...currentUser,
    last_login: updatedLastLogin || currentUser.last_login || null,
  };
}


async function saveSignupProfile({
  userId,
  fullName,
  email,
  role,
  faculty,
  programme,
}) {
  const profile = {
    id: userId,
    full_name: fullName,
    email,
    role,
    faculty: faculty || null,
    programme: programme || null,
    updated_at: new Date().toISOString(),
  };

  // The auth trigger normally creates this row first. Upsert also covers
  // projects where the trigger has not been installed yet.
  const { data, error } = await supabase
    .from("users")
    .upsert(profile, { onConflict: "id" })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Account created, but the student profile could not be saved: ${error.message}`);
  }

  return data;
}

//  * Anyone may sign up student, admin, analytics_viewer, or super_admin.
export async function signUpUser({
  fullName,
  email,
  password,
  role = "student",
  faculty = "",
  programme = "",
}) {
  const normalizedName = String(fullName || "").trim();

  const normalizedEmail = String(email || "")
    .trim()
    .toLowerCase();

  const normalizedRole = normalizeRole(role);
  const normalizedProgramme = String(programme || "").trim();
  const mappedFaculty = getFacultyFromProgramme(normalizedProgramme);
  const normalizedFaculty =
    normalizedRole === "student"
      ? mappedFaculty
      : String(faculty || "").trim();

  if (!normalizedName) {
    throw new Error("Full name is required.");
  }

  if (!normalizedEmail) {
    throw new Error("Email is required.");
  }

  if (!normalizedEmail.includes("@")) {
    throw new Error("Please enter a valid email address.");
  }

  if (!password || password.length < 6) {
    throw new Error("Password must contain at least 6 characters.");
  }

  if (normalizedRole === "student" && !normalizedProgramme) {
    throw new Error("Programme is required for student registration.");
  }

  if (normalizedRole === "student" && !mappedFaculty) {
    throw new Error("The selected programme does not have a valid faculty mapping.");
  }

  const { data, error } = await supabase.auth.signUp({
    email: normalizedEmail,
    password,

    options: {
      data: {
        full_name: normalizedName,
        role: normalizedRole,
        account_type: normalizedRole,
        faculty: normalizedFaculty || null,
        programme: normalizedProgramme || null,
      },
    },
  });

  if (error) {
    throw error;
  }

  if (!data.user?.id) {
    throw new Error("Supabase did not return a user ID.");
  }

  /*
   * When email confirmation is disabled, a session is available and the
   * frontend saves the public.users row immediately. When confirmation is
   * enabled, the database trigger uses the same metadata to create the row.
   */
  if (data.session) {
    await saveSignupProfile({
      userId: data.user.id,
      fullName: normalizedName,
      email: normalizedEmail,
      role: normalizedRole,
      faculty: normalizedFaculty,
      programme: normalizedProgramme,
    });

    const profileUser = await getCurrentSupabaseUser(data.user);

    return {
      user: profileUser,
      session: data.session,
      requiresEmailConfirmation: false,
    };
  }

  return {
    user: {
      ...data.user,
      full_name: normalizedName,
      email: normalizedEmail,
      role: normalizedRole,
      faculty: normalizedFaculty,
      programme: normalizedProgramme,
    },
    session: null,
    requiresEmailConfirmation: true,
  };
}

/**
 * Keep the existing student function name for components
 * that still import signUpStudent.
 */
export async function signUpStudent({
  fullName,
  email,
  password,
  programme = "",
  faculty = "",
}) {
  return signUpUser({
    fullName,
    email,
    password,
    programme,
    faculty,
    role: "student",
  });
}

/**
 * Signup helper for admin accounts.
 */
export async function signUpAdmin({
  fullName,
  email,
  password,
  role = "admin",
  faculty = "",
}) {
  return signUpUser({
    fullName,
    email,
    password,
    role,
    faculty,
    programme: "",
  });
}

export async function sendPasswordReset(email) {
  const normalizedEmail = String(email || "")
    .trim()
    .toLowerCase();

  if (!normalizedEmail) {
    throw new Error("Email is required.");
  }

  // Land back on the app so LoginPage can show the "set new password" step.
  const redirectTo = `${window.location.origin}/`;

  const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
    redirectTo,
  });

  if (error) {
    throw error;
  }
}

export async function updatePassword(newPassword) {
  const password = String(newPassword || "");

  if (password.length < 6) {
    throw new Error("Password must be at least 6 characters.");
  }

  const { data, error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    throw error;
  }

  return data?.user || null;
}

export async function signOutUser() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}
