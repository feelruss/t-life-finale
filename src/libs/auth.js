// This is the src/libs/auth.js file
import { supabase } from "../libs/supabase";

const VALID_ROLES = new Set([
  "student",
  "admin",
  "analytics_viewer",
  "super_admin",
]);

const ADMIN_ROLES = new Set(["admin", "analytics_viewer", "super_admin"]);

export function getFacultyFromProgramme(programme) {
  const value = String(programme || "").toLowerCase();

  if (
    value.includes("computer") ||
    value.includes("software") ||
    value.includes("information technology") ||
    value.includes("artificial intelligence")
  ) {
    return "Computing";
  }

  if (value.includes("engineering")) return "Engineering";

  if (
    value.includes("business") ||
    value.includes("accounting") ||
    value.includes("marketing")
  ) {
    return "Business";
  }

  if (value.includes("design") || value.includes("communication")) {
    return "Design";
  }

  if (
    value.includes("hospitality") ||
    value.includes("tourism") ||
    value.includes("culinary")
  ) {
    return "Hospitality";
  }

  if (value.includes("psychology")) return "Social Sciences";

  return "General Studies";
}

export async function completeUserProfile({ programme }) {
  const normalizedProgramme = String(programme || "").trim();

  if (!normalizedProgramme) {
    throw new Error("Please select your programme.");
  }

  const {
    data: { user: authUser },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!authUser?.id) throw new Error("No authenticated user was found.");

  const faculty = getFacultyFromProgramme(normalizedProgramme);

  const { error } = await supabase
    .from("users")
    .update({
      programme: normalizedProgramme,
      faculty,
    })
    .eq("id", authUser.id);

  if (error) throw error;

  return getCurrentSupabaseUser(authUser);
}

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

  const programmeFromProfile = String(profile?.programme || "").trim();
  const programmeFromMeta = String(metadata.programme || "").trim();
  const programme = programmeFromProfile || programmeFromMeta;
  const faculty =
    profile?.faculty ||
    metadata.faculty ||
    (programme ? getFacultyFromProgramme(programme) : "") ||
    "";

  // Signup stores programme in auth metadata; sync once into public.users
  // so students are not asked again on Complete Profile.
  if (
    profile?.id &&
    !programmeFromProfile &&
    programmeFromMeta &&
    role === "student"
  ) {
    void supabase
      .from("users")
      .update({
        programme: programmeFromMeta,
        faculty: faculty || getFacultyFromProgramme(programmeFromMeta),
        updated_at: new Date().toISOString(),
      })
      .eq("id", authUser.id)
      .then(({ error }) => {
        if (error) {
          console.warn("Programme sync skipped:", error.message);
        }
      });
  }

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

  const { data, error } = await supabase.auth.signUp({
    email: normalizedEmail,
    password,

    options: {
      data: {
        full_name: normalizedName,
        role: normalizedRole,
        account_type: normalizedRole,
        faculty: faculty || null,
        programme: programme || null,
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
   * public.users is automatically created by
   * the on_auth_user_created database trigger.
   * Write programme immediately when we have a session
   * so Complete Profile is not shown again.
   */
  const resolvedFaculty =
    faculty || (programme ? getFacultyFromProgramme(programme) : "");

  if (data.session && programme && normalizedRole === "student") {
    const { error: profileError } = await supabase
      .from("users")
      .update({
        programme,
        faculty: resolvedFaculty || null,
        full_name: normalizedName,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.user.id);

    if (profileError) {
      console.warn("Signup programme write:", profileError.message);
    }
  }

  if (data.session) {
    return getCurrentSupabaseUser(data.user);
  }

  return {
    ...data.user,
    full_name: normalizedName,
    email: normalizedEmail,
    role: normalizedRole,
    faculty: resolvedFaculty,
    programme,
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
