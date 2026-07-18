import React from "react";
import { motion } from "framer-motion";
import { Activity, Brain, Zap } from "lucide-react";

export default function FocusMeterWidget({
  currentMode,
  focusScore = 0,
  balanceScore = 0,
  recommendation = "Keep checking in to events to improve your meter trends.",
  loadingRecommendation = false,
  recommendationSource = "",
  refreshStatus = "",
  onRefreshRecommendation,
}) {
  const handleRefresh = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (loadingRecommendation) return;
    onRefreshRecommendation?.();
  };

  return (
    <div className="float-module glass relative z-20 rounded-2xl border border-white/10 p-5 w-full mt-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-outfit font-bold text-white">
          <Brain
            className={currentMode === "focus" ? "text-red-200" : "text-teal-200"}
            size={20}
          />
          <span>AI Status Meter</span>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={loadingRecommendation}
          className={`relative z-30 shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors disabled:cursor-wait disabled:opacity-50 ${
            currentMode === "focus"
              ? "bg-taylor-red/20 text-red-100 hover:bg-taylor-red/30 hover:text-white"
              : "bg-teal-400/15 text-teal-100 hover:bg-teal-400/25 hover:text-white"
          }`}
        >
          {loadingRecommendation ? "Analyzing…" : "Refresh"}
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <div className="mb-1 flex justify-between font-inter text-xs">
            <span
              className={
                currentMode === "focus"
                  ? "flex items-center gap-1 text-red-100"
                  : "flex items-center gap-1 text-teal-100"
              }
            >
              <Zap size={12} /> Focus
            </span>
            <span className="font-bold text-taylor-red">{focusScore}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${focusScore}%` }}
              transition={{ duration: 1 }}
              className="h-full bg-gradient-to-r from-red-600 to-red-500"
            />
          </div>
        </div>

        <div>
          <div className="mb-1 flex justify-between font-inter text-xs">
            <span
              className={
                currentMode === "focus"
                  ? "flex items-center gap-1 text-red-100"
                  : "flex items-center gap-1 text-teal-100"
              }
            >
              <Activity size={12} /> Wellness
            </span>
            <span className="font-bold text-teal-400">{balanceScore}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${balanceScore}%` }}
              transition={{ duration: 1, delay: 0.2 }}
              className="h-full bg-gradient-to-r from-teal-500 to-emerald-400"
            />
          </div>
        </div>

        <div
          className={
            currentMode === "focus"
              ? "mt-4 rounded-xl border border-red-500/20 bg-white/5 p-3 font-inter text-xs leading-relaxed text-red-50"
              : "mt-4 rounded-xl border border-teal-500/20 bg-white/5 p-3 font-inter text-xs leading-relaxed text-teal-50"
          }
        >
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="font-semibold text-white">AI Recommendation</span>
            {(refreshStatus || recommendationSource) && (
              <span className="text-[10px] uppercase tracking-wider text-white/50">
                {refreshStatus ||
                  (recommendationSource === "groq" ? "Live AI" : "Rules")}
              </span>
            )}
          </div>
          {loadingRecommendation
            ? "Analyzing your Focus & Wellness scores…"
            : recommendation}
        </div>
      </div>
    </div>
  );
}
