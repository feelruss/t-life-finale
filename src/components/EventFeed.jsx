import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CodeBracketIcon,
  ShieldCheckIcon,
  BeakerIcon,
  HeartIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { getEventPreferences } from "../data/db";
import { fetchCampusEvents } from "../services/campusEventsService";
import {
  recommendEvents,
  loadHybridRecommendationContext,
  saveEventRecommendations,
  RECOMMENDATION_LIMIT,
} from "../services/eventRecommendationService";
import {
  loadEventPreferences,
  saveEventHidden,
  saveEventInterested,
} from "../services/eventPreferencesService";

const iconMap = {
  CodeBracketIcon: CodeBracketIcon,
  ShieldCheckIcon: ShieldCheckIcon,
  BeakerIcon: BeakerIcon,
  HeartIcon: HeartIcon,
  UserGroupIcon: UserGroupIcon,
};

export default function EventFeed({
  mode,
  onEventClick,
  userKey = "guest",
}) {
  const category = mode || "focus";
  const [events, setEvents] = useState([]);
  const [source, setSource] = useState("loading");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [preferences, setPreferences] = useState(() =>
    getEventPreferences(userKey),
  );
  const [hybridContext, setHybridContext] = useState(null);
  const [lastHidden, setLastHidden] = useState(null);
  const [undoTimer, setUndoTimer] = useState(null);
  const isFocus = category === "focus";
  const hiddenEvents = preferences.hidden || [];
  const interestedEvents = preferences.interested || [];

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setLoadError("");
      try {
        const result = await fetchCampusEvents({
          category,
          studentId: userKey !== "guest" ? userKey : null,
        });
        if (cancelled) return;
        setEvents(result.events || []);
        setSource(result.source || "supabase");
      } catch (error) {
        if (cancelled) return;
        setEvents([]);
        setSource("error");
        setLoadError(error.message || "Unable to load events.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [category, userKey]);

  useEffect(() => {
    let cancelled = false;
    setPreferences(getEventPreferences(userKey));
    loadEventPreferences(userKey).then((prefs) => {
      if (!cancelled) setPreferences(prefs);
    });
    return () => {
      cancelled = true;
    };
  }, [userKey]);


  useEffect(() => {
    let cancelled = false;

    loadHybridRecommendationContext(userKey)
      .then((context) => {
        if (!cancelled) setHybridContext(context);
      })
      .catch((error) => {
        console.warn("Unable to load hybrid recommendation data:", error);
        if (!cancelled) setHybridContext(null);
      });

    return () => {
      cancelled = true;
    };
  }, [userKey]);

  useEffect(() => {
    const onDataUpdate = (evt) => {
      const updatedKey = String(evt?.detail?.key || "");
      if (updatedKey.startsWith("taylors_event_preferences")) {
        setPreferences(getEventPreferences(userKey));
      }
    };

    window.addEventListener("taylors-db-updated", onDataUpdate);
    return () => window.removeEventListener("taylors-db-updated", onDataUpdate);
  }, [userKey]);

  const { recommended: visibleEvents, totalAvailable } = useMemo(() => {
    return recommendEvents({
      events,
      preferences: { interested: interestedEvents, hidden: hiddenEvents },
      mode: category,
      limit: RECOMMENDATION_LIMIT,
      hybridContext,
    });
  }, [events, hiddenEvents, interestedEvents, category, hybridContext]);

  useEffect(() => {
    if (
      userKey === "guest" ||
      loading ||
      !hybridContext ||
      visibleEvents.length === 0
    ) {
      return;
    }

    let cancelled = false;

    saveEventRecommendations({
      studentId: userKey,
      recommendations: visibleEvents,
    }).then((result) => {
      if (!cancelled && !result.success) {
        console.warn("Unable to persist event recommendations:", result.error);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [userKey, loading, hybridContext, visibleEvents]);

  useEffect(() => {
    return () => {
      if (undoTimer) clearTimeout(undoTimer);
    };
  }, [undoTimer]);

  const handleToggleInterested = async (eventId) => {
    const normalizedId = String(eventId);
    const isInterested = interestedEvents.some(
      (id) => String(id) === normalizedId,
    );
    const prefs = await saveEventInterested(
      userKey,
      eventId,
      !isInterested,
    );
    setPreferences(prefs);
  };

  const handleNotInterested = async (eventId) => {
    const prefs = await saveEventHidden(userKey, String(eventId), true);
    setPreferences(prefs);
    setLastHidden(eventId);
    if (undoTimer) clearTimeout(undoTimer);
    const t = setTimeout(() => setLastHidden(null), 5000);
    setUndoTimer(t);
  };

  const matchMath = (event) => {
    const b = event.match_breakdown || {};
    const fallback =
      Number(String(event.match_score || "0").replace("%", "")) || 0;

    return {
      content: Math.round(Number(event.content_score ?? b.content ?? fallback)),
      collaborative: Math.round(
        Number(event.collaborative_score ?? b.collaborative ?? 0),
      ),
      interest: Math.round(Number(b.interest ?? 0)),
      schedule: Math.round(Number(b.schedule ?? 100)),
      score: Math.round(Number(event.hybrid_score ?? fallback)),
    };
  };

  return (
    <div className="px-5 pb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <motion.div
            animate={{
              backgroundColor: isFocus ? "#FF3B5C" : "#4EEAAF",
            }}
            className="w-1.5 h-1.5 rounded-full"
          />
          <p
            className={`text-[11px] font-inter font-medium uppercase tracking-widest ${isFocus ? "text-red-100" : "text-teal-100"}`}
          >
            {isFocus ? "Recommended for you" : "Wellness picks for you"}
          </p>
        </div>
        <p
          className={
            isFocus
              ? "text-[11px] font-inter text-red-200"
              : "text-[11px] font-inter text-teal-200"
          }
        >
          {loading
            ? "Loading..."
            : `Top ${visibleEvents.length}${
                totalAvailable > visibleEvents.length
                  ? ` of ${totalAvailable}`
                  : ""
              }${source === "local" ? " · offline" : ""}`}
        </p>
      </div>

      {!loading && visibleEvents.length > 0 && (
        <p className="mb-3 text-[10px] font-inter text-gray-400">
          Hybrid recommendation: 60% content-based matching + 40% collaborative
          filtering from similar students’ RSVPs and attendance. New users begin
          with content-based recommendations until enough interaction data exists.
        </p>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={mode}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.35, ease: "easeInOut" }}
          className="flex flex-col gap-3"
        >
          {loading ? (
            <div className="rounded-2xl glass p-6 text-center text-gray-400">
              <p className="text-sm text-white">Loading campus events...</p>
            </div>
          ) : visibleEvents.length > 0 ? (
            visibleEvents.map((event, index) => {
              const IconComponent = iconMap[event.icon];
              const math = matchMath(event);

              return (
                <motion.div
                  key={event.id}
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.4}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{
                    opacity: 1,
                    y: [0, index % 2 === 0 ? -4 : -7, 0],
                  }}
                  transition={{
                    opacity: { duration: 0.4, delay: index * 0.08 },
                    y: {
                      duration: 3.2 + (index % 3) * 0.4,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: index * 0.12,
                    },
                  }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onEventClick?.(event)}
                  className="group relative rounded-2xl glass overflow-hidden cursor-grab active:cursor-grabbing transition-all duration-300 hover:border-white/10"
                >
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
                    style={{
                      backgroundColor: isFocus ? "#E21836" : "#10B981",
                    }}
                  />

                  <div className="p-4 pl-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-inter font-bold px-2 py-0.5 rounded border bg-white/5 text-gray-400 border-white/10">
                          Tap for RSVP
                        </span>
                        <span className="text-[10px] font-inter font-bold bg-gray-700/50 text-green-400 px-2 py-0.5 rounded border border-green-500/20">
                          {math.score}% Match
                        </span>
                      </div>
                      {IconComponent ? (
                        <IconComponent className="w-5 h-5 text-gray-400" />
                      ) : (
                        <span className="text-xl">{event.emoji}</span>
                      )}
                    </div>

                    <div className="mb-2">
                      <h3
                        className={`text-[15px] font-outfit font-semibold leading-tight mb-0.5 transition-colors ${isFocus ? "text-red-50 group-hover:text-white" : "text-teal-50 group-hover:text-white"}`}
                      >
                        {event.title}
                      </h3>
                      <p
                        className={
                          isFocus
                            ? "text-[11px] font-inter text-red-200"
                            : "text-[11px] font-inter text-teal-200"
                        }
                      >
                        by{" "}
                        <span
                          className={isFocus ? "text-red-50" : "text-teal-50"}
                        >
                          {event.host}
                        </span>
                      </p>
                    </div>

                    <p
                      className={
                        isFocus
                          ? "text-xs font-inter text-red-100 leading-relaxed mb-3 line-clamp-2"
                          : "text-xs font-inter text-teal-100 leading-relaxed mb-3 line-clamp-2"
                      }
                    >
                      {event.description}
                    </p>

                    {event.whyRecommended && (
                      <div
                        className={`mb-2 rounded-lg border px-3 py-2 ${
                          isFocus
                            ? "border-taylor-red/30 bg-taylor-red/10"
                            : "border-teal-400/25 bg-teal-400/10"
                        }`}
                      >
                        <p className="text-[9px] font-inter uppercase tracking-wider text-gray-400">
                          Why this is recommended
                        </p>
                        <p className="mt-0.5 text-[12px] font-outfit font-semibold text-white">
                          Because {event.whyRecommended}
                        </p>
                      </div>
                    )}

                    <div className="mb-3 rounded-lg bg-white/5 border border-white/10 px-3 py-2">
                      <p className="text-[10px] font-inter text-gray-400">
                        Hybrid match breakdown
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-2">
                        <span className="text-[10px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded px-2 py-0.5">
                          Content {math.content}%
                        </span>
                        <span className="text-[10px] text-purple-300 bg-purple-500/10 border border-purple-500/20 rounded px-2 py-0.5">
                          Collaborative {math.collaborative}%
                        </span>
                        <span className="text-[10px] text-blue-300 bg-blue-500/10 border border-blue-500/20 rounded px-2 py-0.5">
                          Schedule {math.schedule}%
                        </span>
                        <span className="text-[10px] text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded px-2 py-0.5">
                          Interest overlap {math.interest}%
                        </span>
                      </div>
                    </div>

                    <div className="flex items-stretch justify-end border-t border-white/5 pt-3 mt-1 gap-2">
                      <button
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-colors border active:scale-95 ${
                          interestedEvents.some(
                            (id) => String(id) === String(event.id),
                          )
                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/30"
                            : "bg-white/10 hover:bg-white/20 text-gray-200 border-white/5"
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleInterested(event.id);
                        }}
                      >
                        {interestedEvents.some(
                          (id) => String(id) === String(event.id),
                        )
                          ? "Interested ✓"
                          : "Interested"}
                      </button>

                      <button
                        className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-[10px] font-semibold text-gray-200 transition-colors border border-white/5 active:scale-95"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNotInterested(event.id);
                        }}
                      >
                        Not interested
                      </button>
                    </div>
                  </div>

                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 shimmer pointer-events-none" />
                </motion.div>
              );
            })
          ) : (
            <div className="rounded-2xl glass p-6 text-center text-gray-400">
              <p className="text-sm font-semibold text-white mb-2">
                {loadError ? "Couldn’t load events" : "Nothing here yet"}
              </p>
              <p className="text-xs">
                {loadError ||
                  "Try switching to the other mode or check Admin campus events."}
              </p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {lastHidden && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-[#0b0b10] border border-white/10 text-gray-200 px-4 py-2 rounded-full flex items-center gap-4 shadow-lg">
            <span className="text-sm">Removed from suggestions</span>
            <button
              className="text-sm text-taylor-red font-semibold"
              onClick={async () => {
                const prefs = await saveEventHidden(
                  userKey,
                  String(lastHidden),
                  false,
                );
                setPreferences(prefs);
                setLastHidden(null);
                if (undoTimer) {
                  clearTimeout(undoTimer);
                  setUndoTimer(null);
                }
              }}
            >
              Undo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
