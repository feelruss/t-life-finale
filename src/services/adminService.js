import { supabase } from "../components/GoogleLogin";

const ROLE_MAP = {
  "Super Admin": "super_admin",
  "Event Manager": "admin",
  "Analytics Viewer": "analytics_viewer",

  super_admin: "super_admin",
  admin: "admin",
  analytics_viewer: "analytics_viewer",
};

export async function createAdminAccount({
  fullName,
  email,
  password,
  role,
  faculty = "Computing",
}) {
  const normalizedName = fullName.trim();
  const normalizedEmail = email.trim().toLowerCase();
  const dbRole = ROLE_MAP[role] || "admin";

  /*
   * Create account in Supabase Auth.
   *
   * Prefer using a database trigger to create public.users.
   * Creating another user's Auth account from the browser can also
   * change the current Supabase session, depending on email-confirmation
   * settings.
   */
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      data: {
        full_name: normalizedName,
        role: dbRole,
        faculty,
        account_type: "admin",
      },
    },
  });

  if (authError) {
    throw authError;
  }

  if (!authData?.user?.id) {
    throw new Error("Supabase did not return an admin user ID.");
  }

  /*
   * Use this only when you do not have an Auth trigger.
   * If your trigger already inserts public.users, remove this block
   * to avoid duplicate insertion.
   */
  const { error: profileError } = await supabase.from("users").upsert(
    {
      id: authData.user.id,
      full_name: normalizedName,
      email: normalizedEmail,
      role: dbRole,
      faculty,
      avatar: normalizedName.charAt(0).toUpperCase(),
      created_at: new Date().toISOString(),
    },
    {
      onConflict: "id",
    },
  );

  if (profileError) {
    throw profileError;
  }

  return {
    id: authData.user.id,
    full_name: normalizedName,
    email: normalizedEmail,
    role: dbRole,
    faculty,
  };
}

export async function getAdminUsers() {
  const { data, error } = await supabase
    .from("users")
    .select(
      "id, full_name, email, role, faculty, avatar, last_login, created_at",
    )
    .in("role", ["super_admin", "admin", "analytics_viewer"])
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return data || [];
}