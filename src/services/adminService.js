import { supabase } from "../libs/supabase";

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
  const normalizedName = String(
    fullName || "",
  ).trim();

  const normalizedEmail = String(email || "")
    .trim()
    .toLowerCase();

  const normalizedPassword = String(
    password || "",
  ).trim();

  const normalizedFaculty =
    String(faculty || "Computing").trim() ||
    "Computing";

  const dbRole = ROLE_MAP[role];

  if (!normalizedName) {
    throw new Error("Full name is required.");
  }

  if (!normalizedEmail.endsWith("@taylors.edu.my")) {
    throw new Error(
      "Please use a valid Taylor's staff email.",
    );
  }

  if (normalizedPassword.length < 8) {
    throw new Error(
      "Password must contain at least 8 characters.",
    );
  }

  if (!dbRole) {
    throw new Error("Please select a valid admin role.");
  }

  // Read the current administrator's existing session. This session is only sent as authorization to the API.
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    throw sessionError;
  }

  if (!session?.access_token) {
    throw new Error(
      "Your administrator session has expired. Please sign in again.",
    );
  }

  const response = await fetch("/api/create-admin", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      fullName: normalizedName,
      email: normalizedEmail,
      password: normalizedPassword,
      role: dbRole,
      faculty: normalizedFaculty,
    }),
  });

  const result = await response
    .json()
    .catch(() => ({
      error: "The server returned an invalid response.",
    }));

  if (!response.ok) {
    throw new Error(
      result.error ||
        "Unable to create administrator account.",
    );
  }

  return result.user;
}

export async function getAdminUsers() {
  const { data, error } = await supabase
    .from("users")
    .select(
      `
        id,
        full_name,
        email,
        role,
        faculty,
        avatar,
        last_login,
        created_at
      `,
    )
    .in("role", [
      "super_admin",
      "admin",
      "analytics_viewer",
    ])
    .order("created_at", {
      ascending: true,
    });

  if (error) {
    throw error;
  }

  return data || [];
}