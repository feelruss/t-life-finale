import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { timetable } from "../data/events";

function ScheduleCard({ block, isFocus }) {
  const [startTime = "", endTime = ""] = String(block.time || "").split(" - ");

  return (
    <div
      className={`flex-shrink-0 rounded-xl px-4 py-3 min-w-[170px] ${
        block.type === "free"
          ? "bg-gradient-to-br from-balance-accent/15 to-balance-accent/5 border border-balance-accent/25 shadow-glow-green"
          : "glass"
      }`}
    >
      <p
        className={`text-[10px] font-inter font-semibold uppercase tracking-wider mb-1 ${
          block.type === "free" ? "text-balance-accent" : "text-gray-500"
        }`}
      >
        {startTime}
        {endTime ? ` – ${endTime}` : ""}
      </p>
      <p
        className={`text-sm font-outfit font-semibold leading-tight ${
          block.type === "free"
            ? "text-balance-accent"
            : isFocus
              ? "text-red-50"
              : "text-teal-50"
        }`}
      >
        {block.subject}
      </p>
      {block.room && (
        <p
          className={
            isFocus
              ? "text-[10px] font-inter text-red-200 mt-1"
              : "text-[10px] font-inter text-teal-200 mt-1"
          }
        >
          {block.room}
        </p>
      )}
      {block.type === "free" && (
        <div className="flex items-center gap-1.5 mt-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-balance-accent opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-balance-accent" />
          </span>
          <p className="text-[10px] font-inter text-balance-accent/90">
            Searching...
          </p>
        </div>
      )}
    </div>
  );
}

export default function Timetable({ mode = "focus", timetableData = timetable }) {
  const isFocus = mode === "focus";
  const [paused, setPaused] = useState(false);

  const currentDateLabel = useMemo(
    () =>
      new Date().toLocaleDateString("en-US", {
        weekday: "short",
        day: "numeric",
        month: "short",
      }),
    [],
  );

  const blocks = Array.isArray(timetableData) ? timetableData : [];
  // Duplicate track so the news-crawl loops without a jump.
  const tickerBlocks = [...blocks, ...blocks];
  const durationSec = Math.max(18, blocks.length * 5);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className={`sticky top-0 z-30 backdrop-blur-xl px-5 py-3 ${
        isFocus
          ? "bg-[#2a090f]/90 border-b border-taylor-red/20"
          : "bg-[#081916]/90 border-b border-balance-accent/20"
      }`}
    >
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <div
            className={`w-1.5 h-1.5 rounded-full ${isFocus ? "bg-taylor-red" : "bg-balance-accent"}`}
          />
          <p
            className={`text-[11px] font-inter font-medium uppercase tracking-widest ${
              isFocus ? "text-red-100" : "text-teal-100"
            }`}
          >
            Today&apos;s Schedule
          </p>
          <span
            className={`rounded-full px-2 py-0.5 text-[9px] font-inter uppercase tracking-wider ${
              isFocus
                ? "bg-taylor-red/20 text-red-200"
                : "bg-balance-accent/15 text-teal-200"
            }`}
          >
            Live crawl
          </span>
        </div>
        <p
          className={
            isFocus
              ? "text-[11px] font-inter text-red-200"
              : "text-[11px] font-inter text-teal-200"
          }
        >
          {currentDateLabel}
        </p>
      </div>

      {/* Continuous TV news-line ticker */}
      <div
        className="schedule-ticker relative overflow-hidden pb-1"
        onPointerEnter={() => setPaused(true)}
        onPointerLeave={() => setPaused(false)}
        onTouchStart={() => setPaused(true)}
        onTouchEnd={() => setPaused(false)}
      >
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r ${
            isFocus ? "from-[#2a090f]" : "from-[#081916]"
          } to-transparent`}
        />
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l ${
            isFocus ? "from-[#2a090f]" : "from-[#081916]"
          } to-transparent`}
        />

        <div
          className={`schedule-ticker-track flex w-max gap-2.5 ${paused ? "is-paused" : ""}`}
          style={{ "--ticker-duration": `${durationSec}s` }}
        >
          {tickerBlocks.map((block, index) => (
            <ScheduleCard
              key={`${block.id}-${index}`}
              block={block}
              isFocus={isFocus}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
