import { supabase } from "../libs/supabase";

const VALID_ROLES = new Set([
  "student",
  "admin",
  "analytics_viewer",
  "super_admin",
]);


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

  if (
    value.includes("design") ||
    value.includes("communication")
  ) {
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
      last_login: new Date().toISOString(),
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

/**
 * Gets the currently authenticated Supabase user and combines it
 * with the matching public.users profile.
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

  if (!authUser) {
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
        created_at
      `,
    )
    .eq("id", authUser.id)
    .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  const metadata = authUser.user_metadata || {};

  const role = normalizeRole(
    profile?.role ||
      metadata.role ||
      metadata.account_type ||
      "student",
  );

  return {
    ...authUser,
    ...profile,

    id: authUser.id,

    email:
      profile?.email ||
      authUser.email ||
      "",

    full_name:
      profile?.full_name ||
      metadata.full_name ||
      metadata.name ||
      authUser.email?.split("@")[0] ||
      "User",

    role,

    faculty:
      profile?.faculty ||
      metadata.faculty ||
      "",

    programme:
      profile?.programme ||
      metadata.programme ||
      "",

    avatar:
      profile?.avatar ||
      (
        profile?.full_name ||
        metadata.full_name ||
        authUser.email ||
        "U"
      )
        .charAt(0)
        .toUpperCase(),

    user_metadata: metadata,
  };
}

/**
 * Sign in any existing student or admin account.
 */
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

  const { data, error } =
    await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

  if (error) {
    throw error;
  }

  if (!data.user) {
    throw new Error("Supabase did not return a user.");
  }

  return getCurrentSupabaseUser(data.user);
}

/**
 * Prototype signup.
 * Anyone may select student, admin, analytics_viewer, or super_admin.
 */
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
    throw new Error(
      "Password must contain at least 6 characters.",
    );
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
    throw new Error(
      "Supabase did not return a user ID.",
    );
  }

  /*
   * public.users is automatically created by
   * the on_auth_user_created database trigger.
   */

  if (data.session) {
    return getCurrentSupabaseUser(data.user);
  }

  return {
    ...data.user,
    full_name: normalizedName,
    email: normalizedEmail,
    role: normalizedRole,
    faculty,
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

  const redirectTo = `${window.location.origin}/`;

  const { error } =
    await supabase.auth.resetPasswordForEmail(
      normalizedEmail,
      {
        redirectTo,
      },
    );

  if (error) {
    throw error;
  }
}

export async function signOutUser() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}