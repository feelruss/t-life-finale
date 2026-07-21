// This is the src/pages/LoginPage.jsx file
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lock,
  Shield,
  ArrowRight,
  AlertCircle,
  Mail,
  Eye,
  EyeOff,
  Key,
} from "lucide-react";
import {
  signInWithPassword,
  sendPasswordReset,
  updatePassword,
} from "../libs/auth";

const LoginPage = ({ onLogin, passwordRecovery = false, onPasswordUpdated }) => {
  const [authView, setAuthView] = useState(
    passwordRecovery ? "reset" : "signin",
  ); // 'signin' | 'forgot' | 'reset'

  // Sign In State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [forgotEmail, setForgotEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    if (passwordRecovery) {
      setAuthView("reset");
      setError("");
      setSuccessMsg("Reset link verified. Choose a new password below.");
    }
  }, [passwordRecovery]);

  const handleSignIn = async (e) => {
    e.preventDefault();

    if (isSigningIn) return;

    setError("");
    setSuccessMsg("");
    setIsSigningIn(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();

      const user = await signInWithPassword(normalizedEmail, password);

      onLogin({
        type: user.role,
        user,
      });
    } catch (err) {
      console.error("Supabase sign-in failed:", err);

      setError(err.message || "Invalid campus email or password.");
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    const normalizedEmail = forgotEmail.trim().toLowerCase();

    if (!normalizedEmail) {
      setError("Please enter your campus email to reset your password.");
      return;
    }

    if (!normalizedEmail.endsWith("taylors.edu.my")) {
      setError("Please use a valid Taylor's University campus email.");
      return;
    }

    try {
      await sendPasswordReset(normalizedEmail);
      setSuccessMsg(
        "Check your email, open the reset link, then you’ll set a new password on this screen.",
      );
    } catch (err) {
      console.error("Password reset failed:", err);
      setError(err.message || "Unable to send password reset instructions.");
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      await updatePassword(newPassword);
      setSuccessMsg("Password updated. Signing you in…");
      setNewPassword("");
      setConfirmPassword("");
      onPasswordUpdated?.();
    } catch (err) {
      console.error("Password update failed:", err);
      setError(
        err.message ||
          "Unable to update password. Request a new reset link and try again.",
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#050508] text-white flex flex-col items-center justify-start px-6 pt-12 md:pt-16 pb-24 relative overflow-x-hidden font-sans">
      {/* Background Gradients */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-taylor-red/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-[100px]" />
      </div>

      <div className="z-10 max-w-md w-full flex flex-col items-center">
        {/* Logo */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="w-20 h-20 mb-6 bg-gradient-to-br from-taylor-red to-[#8a1525] rounded-3xl flex items-center justify-center shadow-glow-red"
        >
          <span className="text-4xl font-serif font-bold text-white">T</span>
        </motion.div>

        {/* Sign-in heading */}
        {authView === "signin" && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="mb-6 text-center"
          >
            <h1 className="font-outfit text-xl font-bold text-white">
              Sign In
            </h1>
            <p className="mt-1 text-xs font-inter text-gray-500">
              Access your Taylor&apos;s University account
            </p>
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-start gap-2 text-red-400 text-xs font-inter mb-4"
          >
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            <span className="leading-tight">{error}</span>
          </motion.div>
        )}

        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full bg-green-500/10 border border-green-500/30 rounded-xl p-3 flex items-start gap-2 text-green-400 text-xs font-inter mb-4"
          >
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            <span className="leading-tight">{successMsg}</span>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {authView === "signin" ? (
            <motion.form
              key="signin"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="w-full space-y-4 mb-8"
              onSubmit={handleSignIn}
            >
              <div className="space-y-1">
                <label className="text-xs font-inter text-gray-400 ml-1">
                  Campus Email
                </label>
                <div className="relative">
                  <Mail
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                    size={18}
                  />
                  <input
                    type="email"
                    placeholder="name@sd.taylors.edu.my"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-taylor-red/50 text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isSigningIn}
                    required
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-inter text-gray-400 ml-1">
                  Password
                </label>
                <div className="relative">
                  <Lock
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                    size={18}
                  />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-12 text-sm focus:outline-none focus:border-taylor-red/50 text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isSigningIn}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    disabled={isSigningIn}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center text-xs text-gray-400">
                <button
                  type="button"
                  onClick={() => {
                    setAuthView("forgot");
                    setError("");
                    setSuccessMsg("");
                  }}
                  className="text-taylor-red hover:text-white transition"
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={isSigningIn}
                className="w-full py-3 mt-4 bg-taylor-red hover:bg-taylor-red-light text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors shadow-glow-red disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSigningIn ? (
                  <>
                    <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Signing In...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              <p className="mt-4 text-center text-[11px] font-inter text-gray-500 leading-relaxed">
                University platform — sign in with your{" "}
                <span className="text-gray-300">Taylor's University</span> email.
              </p>
            </motion.form>
          ) : authView === "reset" ? (
            <motion.form
              key="reset"
              initial={{ x: 0, opacity: 0, y: 20 }}
              animate={{ x: 0, opacity: 1, y: 0 }}
              exit={{ x: 0, opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="w-full space-y-4 mb-8"
              onSubmit={handleResetPassword}
            >
              <div className="space-y-1 text-sm text-gray-300">
                <p className="text-white font-semibold">Set new password</p>
                <p className="text-gray-400">
                  Step 2 of 2 — choose a new campus password for your account.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-inter text-gray-400 ml-1">
                  New Password
                </label>
                <div className="relative">
                  <Lock
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                    size={18}
                  />
                  <input
                    type={showNewPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-12 text-sm focus:outline-none focus:border-taylor-red/50 text-white transition-colors"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                  >
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-inter text-gray-400 ml-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <Key
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                    size={18}
                  />
                  <input
                    type={showNewPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-taylor-red/50 text-white transition-colors"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 mt-2 bg-taylor-red hover:bg-taylor-red-light text-white rounded-xl font-bold text-sm transition-colors shadow-glow-red"
              >
                Save new password
              </button>
            </motion.form>
          ) : (
            <motion.form
              key="forgot"
              initial={{ x: 0, opacity: 0, y: 20 }}
              animate={{ x: 0, opacity: 1, y: 0 }}
              exit={{ x: 0, opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="w-full space-y-4 mb-8"
              onSubmit={handleForgotPassword}
            >
              <div className="space-y-1 text-sm text-gray-300">
                <p className="text-white font-semibold">Forgot Password</p>
                <p className="text-gray-400">
                  Step 1 — enter your campus email. We’ll email a reset link.
                  After you open that link, you’ll set a new password here.
                </p>
                <p className="text-[11px] text-gray-500">
                  Tip for admins: in Supabase Auth → URL Configuration, allow
                  redirect URLs for localhost and your Vercel domain so the
                  reset link opens this app.
                </p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-inter text-gray-400 ml-1">
                  Campus Email
                </label>
                <div className="relative">
                  <Mail
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                    size={18}
                  />
                  <input
                    type="email"
                    placeholder="name@sd.taylors.edu.my"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-taylor-red/50 text-white transition-colors"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-3 mt-2 bg-taylor-red hover:bg-taylor-red-light text-white rounded-xl font-bold text-sm transition-colors shadow-glow-red"
              >
                Send Reset Link
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthView("signin");
                  setError("");
                  setSuccessMsg("");
                }}
                className="w-full py-3 bg-white/5 hover:bg-white/10 text-gray-200 rounded-xl font-bold text-sm transition-colors"
              >
                Back to Sign In
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Admin test credentials stored in Supabase Auth */}
        {authView === "signin" && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="w-full mt-2"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-[10px] uppercase tracking-wider font-inter text-gray-500">
                Admin Test Credentials
              </span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => {
                  setEmail("faisal.admin@taylors.edu.my");
                  setPassword("admin123");
                  setError("");
                  setSuccessMsg("");
                }}
                className="w-full py-3 glass rounded-xl hover:bg-white/10 flex items-center justify-between px-4 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 text-left">
                  <div className="w-8 h-8 rounded-lg bg-yellow-500/20 text-yellow-500 flex items-center justify-center">
                    <Shield size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-outfit font-bold text-white">
                      Event Manager
                    </p>
                    <p className="text-[10px] font-inter text-gray-400 font-mono mt-0.5">
                      faisal.admin@taylors.edu.my
                    </p>
                    <p className="text-[10px] font-inter text-taylor-red font-mono mt-0.5">
                      Pass: admin123
                    </p>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEmail("danish.admin@taylors.edu.my");
                  setPassword("danish123");
                  setError("");
                  setSuccessMsg("");
                }}
                className="w-full py-3 glass rounded-xl hover:bg-white/10 flex items-center justify-between px-4 border border-taylor-red/20 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 text-left">
                  <div className="w-8 h-8 rounded-lg bg-taylor-red/20 text-taylor-red flex items-center justify-center">
                    <Shield size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-outfit font-bold text-white">
                      Super Admin
                    </p>
                    <p className="text-[10px] font-inter text-gray-400 font-mono mt-0.5">
                      danish.admin@taylors.edu.my
                    </p>
                    <p className="text-[10px] font-inter text-taylor-red font-mono mt-0.5">
                      Pass: danish123
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
