// This is the src/pages/LoginPage.jsx file
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lock,
  User,
  Shield,
  ArrowRight,
  AlertCircle,
  Mail,
  BookOpen,
  Eye,
  EyeOff,
  Key,
} from "lucide-react";
import {
  signInWithPassword,
  signUpStudent,
  sendPasswordReset,
} from "../libs/auth";
import GoogleLogin from "../components/GoogleLogin";

const LoginPage = ({ onLogin }) => {
  const [authView, setAuthView] = useState("signin"); // 'signin' | 'signup' | 'forgot'

  // Sign In State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Sign Up State
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regProgramme, setRegProgramme] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);

  const programmes = [
    "Bachelor of Computer Science (Hons.)",
    "Bachelor of Software Engineering (Hons.)",
    "Bachelor of Business (Hons.)",
    "Bachelor of Accounting (Hons.)",
    "Bachelor of Psychology (Hons.)",
    "Foundation in Arts",
    "Foundation in Business",
    "Diploma in Communication",
    "Diploma in Information Technology",
    "Diploma in Hospitality Management",
  ];

  const [forgotEmail, setForgotEmail] = useState("");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);

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

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    const normalizedEmail = regEmail.trim().toLowerCase();

    if (!normalizedEmail.endsWith("@sd.taylors.edu.my")) {
      setError(
        "Student registration requires an @sd.taylors.edu.my email address.",
      );
      return;
    }

    if (regPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (!regProgramme) {
      setError("Please select your programme.");
      return;
    }

    try {
      const result = await signUpStudent({
        fullName: regName,
        email: normalizedEmail,
        password: regPassword,
        programme: regProgramme,
      });

      if (result.session) {
        const user = {
          ...result.user,
          full_name: regName.trim(),
          role: "student",
          programme: regProgramme,
        };
        onLogin({ type: "student", user });
        return;
      }

      setSuccessMsg(
        "Account created. Check your email to confirm the account before signing in.",
      );
      setAuthView("signin");
      setEmail(normalizedEmail);
      setPassword("");
    } catch (err) {
      console.error("Supabase sign-up failed:", err);
      setError(err.message || "Unable to create the account.");
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
        "Password reset instructions have been sent if the account exists.",
      );
    } catch (err) {
      console.error("Password reset failed:", err);
      setError(err.message || "Unable to send password reset instructions.");
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

        {/* Tabs */}
        {(authView === "signin" || authView === "signup") && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex bg-white/5 p-1 rounded-xl mb-6 w-full max-w-[240px]"
          >
            <button
              onClick={() => {
                setAuthView("signin");
                setError("");
                setSuccessMsg("");
              }}
              className={`flex-1 py-1.5 text-xs font-inter font-bold rounded-lg transition-colors ${authView === "signin" ? "bg-taylor-red text-white shadow-lg" : "text-gray-400 hover:text-white"}`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setAuthView("signup");
                setError("");
                setSuccessMsg("");
              }}
              className={`flex-1 py-1.5 text-xs font-inter font-bold rounded-lg transition-colors ${authView === "signup" ? "bg-taylor-red text-white shadow-lg" : "text-gray-400 hover:text-white"}`}
            >
              Sign Up
            </button>
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

              <div className="my-4 flex items-center gap-2">
                <div className="flex-1 h-px bg-white/10"></div>
                <span className="text-xs text-gray-500 font-inter">OR</span>
                <div className="flex-1 h-px bg-white/10"></div>
              </div>

              <GoogleLogin onLogin={onLogin} />
            </motion.form>
          ) : authView === "signup" ? (
            <motion.form
              key="signup"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 20, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="w-full space-y-4 mb-8"
              onSubmit={handleSignUp}
            >
              <div className="space-y-1">
                <label className="text-[10px] font-inter uppercase tracking-wider text-gray-400 ml-1 block">
                  Full Name *
                </label>
                <div className="relative">
                  <User
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                    size={16}
                  />
                  <input
                    type="text"
                    placeholder="e.g. John Doe"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-taylor-red/50 text-white"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-inter uppercase tracking-wider text-gray-400 ml-1 block">
                  Campus Email *
                </label>
                <div className="relative">
                  <Mail
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                    size={16}
                  />
                  <input
                    type="email"
                    placeholder="john@sd.taylors.edu.my"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-taylor-red/50 text-white"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-inter uppercase tracking-wider text-gray-400 ml-1 block">
                  Programme *
                </label>
                <div className="relative">
                  <BookOpen
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                    size={16}
                  />
                  <select
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-taylor-red/50 text-white appearance-none"
                    style={{
                      color: "#ffffff",
                      backgroundColor: "rgba(255,255,255,0.06)",
                    }}
                    value={regProgramme}
                    onChange={(e) => setRegProgramme(e.target.value)}
                    required
                  >
                    <option
                      value=""
                      disabled
                      style={{
                        color: "#9ca3af",
                        backgroundColor: "rgba(15, 23, 42, 0.95)",
                      }}
                    >
                      Select your programme
                    </option>
                    {programmes.map((programme) => (
                      <option
                        key={programme}
                        value={programme}
                        style={{
                          color: "#ffffff",
                          backgroundColor: "rgba(15, 23, 42, 0.95)",
                        }}
                      >
                        {programme}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-inter uppercase tracking-wider text-gray-400 ml-1 block">
                  Password *
                </label>
                <div className="relative">
                  <Lock
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                    size={16}
                  />
                  <input
                    type={showRegPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-12 text-sm focus:outline-none focus:border-taylor-red/50 text-white"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition"
                  >
                    {showRegPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 mt-4 bg-white hover:bg-gray-200 text-black rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors shadow-glow"
              >
                Create Student Account
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
                  Enter your campus email and we’ll send reset instructions.
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
