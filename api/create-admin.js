import { createClient } from "@supabase/supabase-js";

const ROLE_MAP = {
  "Super Admin": "super_admin",
  "Event Manager": "admin",
  "Analytics Viewer": "analytics_viewer",

  super_admin: "super_admin",
  admin: "admin",
  analytics_viewer: "analytics_viewer",
};

const ALLOWED_ADMIN_ROLES = ["super_admin", "admin", "analytics_viewer"];

const getBearerToken = (request) => {
  const authorization = String(request.headers.authorization || "").trim();

  if (!authorization.startsWith("Bearer ")) {
    return "";
  }

  return authorization.slice(7).trim();
};

const sendJson = (response, status, payload) => {
  response.status(status).json(payload);
};

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");

    return sendJson(response, 405, {
      error: "Method not allowed.",
    });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey =
    process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    console.error(
      "Missing Supabase environment variables for create-admin API.",
    );

    return sendJson(response, 500, {
      error: "Server configuration is incomplete.",
    });
  }

  const accessToken = getBearerToken(request);

  if (!accessToken) {
    return sendJson(response, 401, {
      error: "Authentication is required.",
    });
  }

  // This client only validates the requesting administrator's token. It does not store or alter any browser session.
  const authVerificationClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  //    This separate server-only client performs privileged Auth actions. Never send SUPABASE_SERVICE_ROLE_KEY to the frontend.
  const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  try {
    // Validate the bearer token against Supabase Auth. getUser(token) performs server-side validation.
    const { data: authenticatedUserData, error: authenticatedUserError } =
      await authVerificationClient.auth.getUser(accessToken);

    if (authenticatedUserError || !authenticatedUserData?.user) {
      return sendJson(response, 401, {
        error: "Your session is invalid or has expired.",
      });
    }

    const requestingUser = authenticatedUserData.user;

    // Read the requester's authoritative role from public.users.Do not trust role information sent from the browser.
    const { data: requestingProfile, error: requestingProfileError } =
      await serviceClient
        .from("users")
        .select("id, full_name, email, role")
        .eq("id", requestingUser.id)
        .maybeSingle();

    if (requestingProfileError) {
      throw requestingProfileError;
    }

    if (!requestingProfile) {
      return sendJson(response, 403, {
        error: "Your administrator profile was not found.",
      });
    }

    // Only Super Admin can create administrator accounts. Change this condition if Event Managers should also have access.
    if (requestingProfile.role !== "super_admin") {
      return sendJson(response, 403, {
        error: "Only a Super Admin can create administrator accounts.",
      });
    }

    const body =
      typeof request.body === "string"
        ? JSON.parse(request.body)
        : request.body || {};

    const fullName = String(body.fullName || "").trim();

    const email = String(body.email || "")
      .trim()
      .toLowerCase();

    const password = String(body.password || "").trim();

    const faculty = String(body.faculty || "Computing").trim() || "Computing";

    const role = ROLE_MAP[body.role] || ROLE_MAP[String(body.role)];

    if (!fullName || !email || !password || !role) {
      return sendJson(response, 400, {
        error: "Full name, email, password, and role are required.",
      });
    }

    if (!email.endsWith("@taylors.edu.my")) {
      return sendJson(response, 400, {
        error: "Please use a valid Taylor's staff email address.",
      });
    }

    if (password.length < 8) {
      return sendJson(response, 400, {
        error: "The password must contain at least 8 characters.",
      });
    }

    if (!ALLOWED_ADMIN_ROLES.includes(role)) {
      return sendJson(response, 400, {
        error: "The selected administrator role is invalid.",
      });
    }

    // Check the public profile table first for a clearer error.
    const { data: existingProfile, error: existingProfileError } =
      await serviceClient
        .from("users")
        .select("id, email")
        .eq("email", email)
        .maybeSingle();

    if (existingProfileError) {
      throw existingProfileError;
    }

    if (existingProfile) {
      return sendJson(response, 409, {
        error: "An account with this email already exists.",
      });
    }

    // Admin createUser creates the account without signing it in. Therefore, the requesting administrator's browser session remains unchanged.
    const { data: createdAuthData, error: createAuthError } =
      await serviceClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          role,
          faculty,
          account_type: "admin",
        },
        app_metadata: {
          role,
          account_type: "admin",
        },
      });

    if (createAuthError) {
      const message = String(createAuthError.message || "").toLowerCase();

      if (
        message.includes("already") ||
        message.includes("registered") ||
        message.includes("exists")
      ) {
        return sendJson(response, 409, {
          error: "An Auth account with this email already exists.",
        });
      }

      throw createAuthError;
    }

    const createdAuthUser = createdAuthData?.user;

    if (!createdAuthUser?.id) {
      throw new Error("Supabase did not return the created Auth user.");
    }

    // Your auth.users trigger may already create this row. Upsert safely updates that generated profile instead of creating a duplicate.
    const { data: savedProfile, error: profileError } = await serviceClient
      .from("users")
      .upsert(
        {
          id: createdAuthUser.id,
          full_name: fullName,
          email,
          role,
          faculty,
          programme: null,
          avatar: fullName.charAt(0).toUpperCase(),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "id",
        },
      )
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
      .single();

    if (profileError) {
      // Avoid leaving an orphaned Auth account when profile creation fails.
      await serviceClient.auth.admin.deleteUser(createdAuthUser.id);

      throw profileError;
    }

    const { error: activityError } = await serviceClient
      .from("activity_logs")
      .insert({
        entity_type: "admin",
        event_id: null,
        event_title: fullName,
        event_host: null,
        admin_id: createdAuthUser.id,
        admin_email: email,
        action: "create",
        performed_by_id: requestingProfile.id,
        performed_by_name: requestingProfile.full_name,
        performed_by_role: requestingProfile.role,
      });

    if (activityError) {
      // The account was created successfully, so logging failure should not delete the account.
      console.error("Unable to save create-admin activity:", activityError);
    }

    return sendJson(response, 201, {
      message: "Administrator account created successfully.",
      user: savedProfile,
    });
  } catch (error) {
    console.error("Create administrator API failed:", error);

    return sendJson(response, 500, {
      error: error?.message || "Unable to create the administrator account.",
    });
  }
}
