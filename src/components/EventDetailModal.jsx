// This is the src/components/EventDetailModal.jsx file
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import {
  X,
  MapPin,
  Clock,
  Users,
  Calendar,
} from "lucide-react";

export default function EventDetailModal({
  event,
  isOpen,
  onClose,
  onCheckIn,
  onRSVP,
}) {
  const [isRSVPd, setIsRSVPd] = useState(
    Boolean(event?.isRSVPd),
  );

  const [rsvpLoading, setRSVPLoading] = useState(false);
  const [rsvpError, setRSVPError] = useState("");

  useEffect(() => {
    setIsRSVPd(Boolean(event?.isRSVPd));
    setRSVPError("");
    setRSVPLoading(false);
  }, [event?.id, event?.isRSVPd, isOpen]);

  if (!event || !isOpen) return null;

  const matchBreakdown = event.match_breakdown || {};

  const interest = Number(matchBreakdown.interest || 0);
  const schedule = Number(matchBreakdown.schedule || 0);
  const proximity = Number(matchBreakdown.proximity || 0);
  const social = Number(matchBreakdown.social || 0);

  const weightedScore =
    interest * 0.4 +
    schedule * 0.3 +
    proximity * 0.2 +
    social * 0.1;

  const registeredCount = Number(event.registered || 0);
  const capacityCount = Number(event.capacity || 0);

  const capacityPercent =
    capacityCount > 0
      ? Math.round(
          (registeredCount / capacityCount) * 100,
        )
      : 0;

  const isFull =
    capacityCount > 0 && capacityPercent >= 100;

  const handleRSVP = async () => {
    if (rsvpLoading) return;

    setRSVPLoading(true);
    setRSVPError("");

    try {
      /*
       * Let App.jsx persist the RSVP first.
       *
       * onRSVP should return:
       * {
       *   isRSVPd: true or false
       * }
       */
      const result = await onRSVP?.({
        ...event,
        isRSVPd,
      });

      if (typeof result?.isRSVPd === "boolean") {
        setIsRSVPd(result.isRSVPd);
      } else {
        /*
         * Fallback only when the parent does not return a result.
         */
        setIsRSVPd((previous) => !previous);
      }
    } catch (error) {
      console.error("RSVP action failed:", error);

      setRSVPError(
        error?.message ||
          "Unable to update your RSVP.",
      );
    } finally {
      setRSVPLoading(false);
    }
  };

  const handleCheckIn = () => {
    onCheckIn?.(event);
  };

  // Check-in is only for arrival at the event (same calendar day), not for browsing suggestions.
  const eventDateISO = String(event.date || event.event_date || "").slice(0, 10);
  const todayISO = new Date().toISOString().slice(0, 10);
  const canCheckIn = Boolean(eventDateISO && eventDateISO === todayISO);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{
              type: "spring",
              damping: 30,
              stiffness: 300,
            }}
            className="fixed bottom-0 left-0 right-0 z-[101] mx-auto max-w-[430px]"
          >
            <div className="max-h-[85vh] overflow-y-auto rounded-t-3xl border-x border-t border-white/10 bg-[#0a0a12] hide-scrollbar">
              <div className="sticky top-0 z-10 flex justify-center bg-[#0a0a12] pb-2 pt-3">
                <div className="h-1 w-10 rounded-full bg-white/20" />
              </div>

              <div className="px-5 pb-4">
                <div className="mb-3 flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      {event.match_score && (
                        <span className="rounded-lg border border-green-500/20 bg-green-500/10 px-2.5 py-1 text-[11px] font-inter font-bold text-green-400">
                          {event.match_score} Match
                        </span>
                      )}

                      {event.tag && (
                        <span className="rounded-lg bg-white/5 px-2 py-1 text-[11px] font-inter text-gray-500">
                          {event.tag}
                        </span>
                      )}

                      {event.zone && (
                        <span className="flex items-center gap-1 rounded-lg bg-white/5 px-2 py-1 text-[11px] font-inter text-gray-500">
                          <MapPin size={10} />
                          {event.zone}
                        </span>
                      )}
                    </div>

                    <h2 className="text-xl font-outfit font-bold leading-tight text-white">
                      {event.title}
                    </h2>

                    <p className="mt-1 text-sm font-inter text-gray-400">
                      by{" "}
                      <span className="text-gray-300">
                        {event.host || "Campus Event"}
                      </span>
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={onClose}
                    className="glass ml-3 rounded-xl p-2 transition-colors hover:bg-white/10"
                  >
                    <X size={18} className="text-gray-400" />
                  </button>
                </div>

                <div className="mb-4 grid grid-cols-3 gap-2">
                  <div className="glass rounded-xl p-3 text-center">
                    <Clock
                      size={14}
                      className="mx-auto mb-1 text-gray-400"
                    />
                    <p className="text-[10px] font-inter text-gray-500">
                      Time
                    </p>
                    <p className="text-xs font-outfit font-semibold text-white">
                      {event.time || "TBD"}
                    </p>
                  </div>

                  <div className="glass rounded-xl p-3 text-center">
                    <Calendar
                      size={14}
                      className="mx-auto mb-1 text-gray-400"
                    />
                    <p className="text-[10px] font-inter text-gray-500">
                      Date
                    </p>
                    <p className="text-xs font-outfit font-semibold text-white">
                      {event.date
                        ? new Date(
                            `${String(event.date).slice(0, 10)}T00:00:00`,
                          ).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })
                        : "TBD"}
                    </p>
                  </div>

                  <div className="glass rounded-xl p-3 text-center">
                    <Users
                      size={14}
                      className="mx-auto mb-1 text-gray-400"
                    />
                    <p className="text-[10px] font-inter text-gray-500">
                      Spots
                    </p>
                    <p className="text-xs font-outfit font-semibold text-white">
                      {capacityCount > 0
                        ? `${registeredCount}/${capacityCount}`
                        : "Available"}
                    </p>
                  </div>
                </div>

                {capacityCount > 0 && (
                  <div className="mb-4">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-[10px] font-inter text-gray-500">
                        Capacity
                      </span>

                      <span
                        className={`text-[10px] font-inter font-bold ${
                          isFull
                            ? "text-red-400"
                            : capacityPercent > 80
                              ? "text-yellow-400"
                              : "text-green-400"
                        }`}
                      >
                        {isFull
                          ? "FULL"
                          : `${capacityPercent}% filled`}
                      </span>
                    </div>

                    <div className="h-1.5 w-full rounded-full bg-white/5">
                      <motion.div
                        className={`h-full rounded-full ${
                          isFull
                            ? "bg-red-500"
                            : capacityPercent > 80
                              ? "bg-yellow-500"
                              : "bg-green-500"
                        }`}
                        initial={{ width: 0 }}
                        animate={{
                          width: `${Math.min(
                            capacityPercent,
                            100,
                          )}%`,
                        }}
                        transition={{ duration: 0.8 }}
                      />
                    </div>
                  </div>
                )}

                <div className="mb-4">
                  <h3 className="mb-2 text-xs font-outfit font-semibold text-gray-300">
                    About
                  </h3>

                  <p className="text-sm font-inter leading-relaxed text-gray-400">
                    {event.description ||
                      "No description available."}
                  </p>
                </div>

                {(interest > 0 ||
                  schedule > 0 ||
                  proximity > 0 ||
                  social > 0) && (
                  <div className="mb-4">
                    <h3 className="mb-2 text-xs font-outfit font-semibold text-gray-300">
                      Why this event matches you
                    </h3>

                    <div className="glass rounded-xl p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] font-inter text-gray-400">
                          Overall Match Score
                        </p>

                        <p className="text-lg font-outfit font-bold text-emerald-300">
                          {Math.round(weightedScore)}%
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {rsvpError && (
                  <div className="mb-3 rounded-xl border border-red-400/20 bg-red-400/5 px-3 py-2">
                    <p className="text-[11px] font-inter text-red-300">
                      {rsvpError}
                    </p>
                  </div>
                )}

                <div className="flex gap-3 pb-6">
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.95 }}
                    onClick={handleRSVP}
                    disabled={
                      rsvpLoading ||
                      (isFull && !isRSVPd)
                    }
                    className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-outfit font-semibold transition-all duration-300 ${
                      isRSVPd
                        ? "border border-green-500/30 bg-green-500/20 text-green-400"
                        : isFull
                          ? "cursor-not-allowed border border-gray-500/30 bg-gray-500/20 text-gray-400"
                          : "bg-gradient-to-r from-taylor-red to-taylor-red-light text-white shadow-glow-red"
                    }`}
                  >
                    {rsvpLoading
                      ? "Updating…"
                      : isRSVPd
                        ? "Cancel RSVP"
                        : isFull
                          ? "Event Full"
                          : "🚀 RSVP Now"}
                  </motion.button>

                  {canCheckIn && (
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.95 }}
                      onClick={handleCheckIn}
                      className="glass flex items-center gap-2 rounded-xl px-4 py-3.5 transition-colors hover:bg-white/10"
                    >
                      <span className="text-xs font-outfit font-semibold text-gray-300">
                        Check-in
                      </span>
                    </motion.button>
                  )}
                </div>
                {!canCheckIn && (
                  <p className="pb-4 text-center text-[10px] font-inter text-gray-500">
                    Check-in unlocks on the event day when you arrive.
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}