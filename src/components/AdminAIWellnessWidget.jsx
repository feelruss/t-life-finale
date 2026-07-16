// This is the src/components/AdminAIWellnessWidget.jsx file
import { useState } from "react";
import { motion } from "framer-motion";
import { replaceWellnessRecommendations } from "../utils/wellnessRecommendations";
import { cleanWellnessRecommendations } from "../utils/cleanWellnessRecommendations";

export default function AdminAIWellnessWidget({
  burnoutAnalytics,
  fallbackRecommendations,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [recommendations, setRecommendations] = useState(
    burnoutAnalytics.recommendations || fallbackRecommendations || [],
  );

  const generateRecommendations = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/wellness-recommendations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          riskScore: Number(burnoutAnalytics.riskScore || 0),
          studentsAtRisk: Number(burnoutAnalytics.studentsAtRisk || 0),
          studentsHighRisk: Number(burnoutAnalytics.studentsHighRisk || 0),
          facultyBreakdown: burnoutAnalytics.facultyBreakdown || [],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.details ||
            data.error ||
            "Failed to generate wellness recommendations.",
        );
      }

      if (!Array.isArray(data.recommendations)) {
        throw new Error("AI response did not include a recommendations array.");
      }

      const cleanedRecommendations = cleanWellnessRecommendations(
        data.recommendations,
      );

      if (cleanedRecommendations.length === 0) {
        throw new Error("No valid wellness recommendations were generated.");
      }

      await replaceWellnessRecommendations(cleanedRecommendations);

      setRecommendations(cleanedRecommendations);
    } catch (err) {
      console.error("AI Wellness Widget Error:", err);

      setError(err.message || "Failed to generate wellness recommendations.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <h3 className="text-sm font-outfit font-semibold text-white flex items-center gap-2">
            <span>🤖</span>
            AI Wellness Recommendations
          </h3>
          {/* <p className="text-[9px] font-inter text-gray-500 mt-1">
            Groq-generated recommendations from current burnout analytics
          </p> */}
        </div>

        <button
          onClick={generateRecommendations}
          disabled={loading}
          className="shrink-0 px-3 py-2 rounded-xl bg-balance-accent/10 text-balance-accent border border-balance-accent/20 hover:bg-balance-accent/20 disabled:opacity-50 text-[10px] font-outfit font-semibold"
        >
          {loading ? "Refreshing..." : "Refresh Recommendations"}
        </button>
      </div>

      {error && (
        <div className="mb-3 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2">
          <p className="text-[10px] font-inter text-red-300">{error}</p>
        </div>
      )}

      <div className="space-y-2">
        {recommendations.map((rec, i) => (
          <motion.div
            key={`ai-wellness-${i}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.08 }}
            className="flex items-start gap-2 p-2.5 rounded-lg bg-white/[0.02]"
          >
            <span className="text-balance-accent text-sm mt-0.5">💡</span>

            <p className="text-xs font-inter text-gray-400 leading-relaxed">
              {rec}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
