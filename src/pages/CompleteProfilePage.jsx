import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { completeUserProfile } from "../libs/auth";

const PROGRAMMES = [
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

export default function CompleteProfilePage({ user, onCompleted }) {
  const [programme, setProgramme] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving) return;

    setError("");
    setSaving(true);

    try {
      const completedUser = await completeUserProfile({ programme });
      onCompleted?.(completedUser);
    } catch (err) {
      console.error("Profile completion failed:", err);
      setError(err.message || "Unable to save your programme.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      className="h-full overflow-y-auto px-6 py-10 bg-[#050508]"
      initial={{ opacity: 0, x: "100%" }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: "-100%" }}
    >
      <div className="mt-10 mb-8 flex flex-col items-center text-center">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.45 }}
          className="w-20 h-20 mb-6 bg-gradient-to-br from-taylor-red to-[#8a1525] rounded-3xl flex items-center justify-center shadow-glow-red"
        >
          <span className="text-4xl font-serif font-bold text-white">T</span>
        </motion.div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-taylor-red-light mb-2">
          One last step
        </p>
        <h1 className="text-3xl font-bold text-white mb-3">
          Complete Your Profile
        </h1>
        <p className="max-w-sm text-sm leading-6 text-gray-400">
          Welcome,
          <span className="text-white font-semibold">
            {" "}
            {user?.full_name || "Student"}
          </span>
          .
          <br />
          Select your programme so we can personalize your campus events and
          recommendations.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label
            htmlFor="programme"
            className="block text-sm font-medium text-gray-200 mb-2"
          >
            Programme
          </label>
          <select
            id="programme"
            value={programme}
            onChange={(event) => setProgramme(event.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-sm text-white outline-none focus:border-taylor-red"
            required
          >
            <option value="" className="bg-[#111116]">
              Select your programme
            </option>
            {PROGRAMMES.map((item) => (
              <option key={item} value={item} className="bg-[#111116]">
                {item}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={saving || !programme}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-taylor-red px-4 py-3.5 text-sm font-bold text-white transition hover:bg-taylor-red-light disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving && <Loader2 size={18} className="animate-spin" />}
          {saving ? "Saving profile..." : "Continue to T-Life"}
        </button>
      </form>
    </motion.div>
  );
}
