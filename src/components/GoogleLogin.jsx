// This is the src/components/GoogleLogin.jsx
import React, { useState } from "react";
import { motion } from "framer-motion";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export default function GoogleLogin() {
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) {
      console.error("Google login failed:", error);
      alert(error.message || "Google login failed.");
      setLoading(false);
    }
  };

  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleGoogleLogin}
      disabled={loading}
      className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-black font-bold py-3 px-4 rounded-xl shadow-md transition-all duration-200 disabled:opacity-60"
    >
      <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
        <path fill="#4285F4" d="M21.35 12.22c0-.71-.06-1.4-.18-2.05H12v3.87h5.24a4.48 4.48 0 0 1-1.94 2.94v2.51h3.14c1.84-1.69 2.91-4.19 2.91-7.27Z" />
        <path fill="#34A853" d="M12 21.75c2.62 0 4.82-.87 6.43-2.36l-3.14-2.51c-.87.58-1.99.93-3.29.93-2.53 0-4.68-1.71-5.45-4.01H3.31v2.59A9.72 9.72 0 0 0 12 21.75Z" />
        <path fill="#FBBC05" d="M6.55 13.8A5.84 5.84 0 0 1 6.25 12c0-.63.11-1.24.3-1.8V7.61H3.31A9.75 9.75 0 0 0 2.25 12c0 1.57.38 3.05 1.06 4.39l3.24-2.59Z" />
        <path fill="#EA4335" d="M12 6.19c1.43 0 2.72.49 3.73 1.45l2.79-2.79A9.35 9.35 0 0 0 12 2.25a9.72 9.72 0 0 0-8.69 5.36l3.24 2.59C7.32 7.9 9.47 6.19 12 6.19Z" />
      </svg>
      <span className="text-sm">
        {loading ? "Connecting to Google..." : "Sign in with Google"}
      </span>
    </motion.button>
  );
}
