import { motion } from "framer-motion";
import { useMemo, useState } from "react";

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
            Open time
          </p>
        </div>
      )}
    </div>
  );
}

export default function Timetable({
  mode = "focus",
  timetableData = [],
  loading = false,
  syncEnabled = true,
}) {
  const isFocus = mode === "focus";
  const [paused, setPaused] = useState(false);

  const currentDateLabel = useMemo(() => {
    const now = new Date();
    const label = now.toLocaleDateString("en-US", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
    const academicDay = timetableData?.[0]?.academicDay;
    const todayName = now.toLocaleDateString("en-US", { weekday: "long" });
    if (academicDay && academicDay !== todayName) {
      return `${label} · showing ${academicDay.slice(0, 3)}`;
    }
    return label;
  }, [timetableData]);

  const blocks = Array.isArray(timetableData) ? timetableData : [];
  const tickerBlocks = blocks.length > 0 ? [...blocks, ...blocks] : [];
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
      <div className="mb-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={`h-1.5 w-1.5 rounded-full ${isFocus ? "bg-taylor-red" : "bg-balance-accent"}`}
          />
          <p
            className={`font-inter text-[11px] font-medium uppercase tracking-widest ${
              isFocus ? "text-red-100" : "text-teal-100"
            }`}
          >
            Today&apos;s Schedule
          </p>
          <span
            className={`rounded-full px-2 py-0.5 font-inter text-[9px] uppercase tracking-wider ${
              isFocus
                ? "bg-taylor-red/20 text-red-200"
                : "bg-balance-accent/15 text-teal-200"
            }`}
          >
            {syncEnabled ? "Synced" : "Offline"}
          </span>
        </div>
        <p
          className={
            isFocus
              ? "font-inter text-[11px] text-red-200"
              : "font-inter text-[11px] text-teal-200"
          }
        >
          {currentDateLabel}
        </p>
      </div>

      {loading ? (
        <div
          className={`rounded-xl px-4 py-3 text-xs font-inter ${
            isFocus ? "text-red-100/80" : "text-teal-100/80"
          }`}
        >
          Loading your academic timetable…
        </div>
      ) : blocks.length === 0 ? (
        <div
          className={`rounded-xl border px-4 py-3 text-xs font-inter ${
            isFocus
              ? "border-taylor-red/20 bg-taylor-red/10 text-red-100"
              : "border-balance-accent/20 bg-balance-accent/10 text-teal-100"
          }`}
        >
          {syncEnabled
            ? "No classes listed for today. Open Schedule to browse other days."
            : "Turn on Timetable Sync in Profile to show your real classes here."}
        </div>
      ) : (
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
      )}
    </motion.div>
  );
}
