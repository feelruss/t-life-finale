import { useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, Loader2 } from "lucide-react";
import { completeGoogleUserProfile } from "../libs/auth";

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
      const completedUser = await completeGoogleUserProfile({ programme });
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
      <div className="mt-10 mb-8">
        <div className="w-14 h-14 rounded-2xl bg-taylor-red/15 border border-taylor-red/30 flex items-center justify-center mb-5">
          <BookOpen className="text-taylor-red-light" size={26} />
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-taylor-red-light mb-2">
          One last step
        </p>
        <h1 className="text-3xl font-bold text-white mb-3">Complete your profile</h1>
        <p className="text-sm leading-6 text-gray-400">
          Welcome, {user?.full_name || "Student"}. Select your programme so we can personalize your campus events.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="programme" className="block text-sm font-medium text-gray-200 mb-2">
            Programme
          </label>
          <select
            id="programme"
            value={programme}
            onChange={(event) => setProgramme(event.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-sm text-white outline-none focus:border-taylor-red"
            required
          >
            <option value="" className="bg-[#111116]">Select your programme</option>
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
