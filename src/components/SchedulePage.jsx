// This is the src/components/SchedulePage.jsx file
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  addDetectedFreeSlots,
  getStudentSchedule,
  groupScheduleByDay,
} from "../services/scheduleService";
import {
  getUpcomingRSVPEvents,
  normalizeRSVPEventId,
} from "../services/rsvpService";
import { getScheduleEvents } from "../services/eventScheduleService";
import { getEventPreferences, getUserRSVPEvents } from "../data/db";
import { computePersonalizedMatch } from "../services/eventRecommendationService";

function buildLocalRSVPCards(localRows, scheduleEvents = []) {
  const todayISO = new Date().toISOString().slice(0, 10);

  return (localRows || []).map((row) => {
    const eventId = normalizeRSVPEventId(row.eventId);
    const fromSchedule = (scheduleEvents || []).find((event) => {
      const candidate = normalizeRSVPEventId(
        event.sourceId || event.eventId || event.id,
      );
      return candidate && candidate === eventId;
    });

    if (fromSchedule) {
      const date = String(fromSchedule.date || "").slice(0, 10);
      return {
        ...fromSchedule,
        id: eventId,
        eventId,
        sourceId: eventId,
        sourceTable: fromSchedule.sourceTable || "campus_events",
        eventType: fromSchedule.eventType || "campus",
        rsvpId: row.id,
        isRSVPd: true,
        isPast: Boolean(date && date < todayISO),
        isUndated: !date,
      };
    }

    const date = String(row.date || "").slice(0, 10);
    return {
      id: eventId,
      eventId,
      sourceId: eventId,
      sourceTable: row.sourceTable || "campus_events",
      eventType: row.eventType || "campus",
      rsvpId: row.id,
      isRSVPd: true,
      title: row.title || "Registered event",
      host: row.host || "Campus Event",
      date,
      time: row.time || "",
      location: row.location || "Location TBC",
      category: row.category || "balance",
      match_score: row.match_score || null,
      capacity: Number(row.capacity || 0),
      registered: Number(row.registered || 0),
      description: row.description || "",
      tag: row.tag || "Campus",
      isPast: Boolean(date && date < todayISO),
      isUndated: !date,
    };
  });
}

function mergeRSVPLists(cloudRows, localRows, scheduleEvents) {
  const merged = new Map();

  for (const item of cloudRows || []) {
    const key = normalizeRSVPEventId(item.sourceId || item.eventId || item.id);
    if (key) merged.set(key, item);
  }

  for (const item of buildLocalRSVPCards(localRows, scheduleEvents)) {
    const key = normalizeRSVPEventId(item.sourceId || item.eventId || item.id);
    if (!key) continue;

    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, item);
      continue;
    }

    // Prefer a real title/details over a cloud stub when the join missed.
    if (
      !existing.title ||
      existing.title === "Registered event" ||
      (!existing.date && item.date)
    ) {
      merged.set(key, {
        ...item,
        ...existing,
        title:
          existing.title && existing.title !== "Registered event"
            ? existing.title
            : item.title,
        host: existing.host || item.host,
        date: existing.date || item.date,
        time: existing.time || item.time,
        location: existing.location || item.location,
        match_score: existing.match_score || item.match_score,
        eventType: existing.eventType || item.eventType,
        sourceTable: existing.sourceTable || item.sourceTable,
        isRSVPd: true,
      });
    }
  }

  return Array.from(merged.values()).sort((a, b) => {
    const aPast = a.isPast ? 1 : 0;
    const bPast = b.isPast ? 1 : 0;
    if (aPast !== bPast) return aPast - bPast;
    return String(a.date || "").localeCompare(String(b.date || ""));
  });
}

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

const weekConfigs = [
  {
    week: 1,
    startDate: "2026-04-20",
  },
  {
    week: 2,
    startDate: "2026-04-27",
  },
  {
    week: 3,
    startDate: "2026-05-04",
  },
  {
    week: 4,
    startDate: "2026-05-11",
  },
  {
    week: 5,
    startDate: "2026-05-18",
  },
  {
    week: 6,
    startDate: "2026-05-25",
  },
  {
    week: 7,
    startDate: "2026-06-01",
  },
  {
    week: 8,
    startDate: "2026-06-08",
  },
  {
    week: 9,
    startDate: "2026-06-15",
  },
  {
    week: 10,
    startDate: "2026-06-22",
  },
  {
    week: 11,
    startDate: "2026-06-29",
  },
  {
    week: 12,
    startDate: "2026-07-06",
  },
  {
    week: 13,
    startDate: "2026-07-13",
  },
  {
    week: 14,
    startDate: "2026-07-20",
  },
  {
    week: 15,
    startDate: "2026-07-27",
  },
  {
    week: 16,
    startDate: "2026-08-03",
  },
  {
    week: 17,
    startDate: "2026-08-10",
  },
  {
    week: 18,
    startDate: "2026-08-17",
  },
];

function getLocalDateOnly(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getInitialScheduleSelection() {
  const today = getLocalDateOnly();
  const currentDay = today.getDay(); // 0=Sun … 6=Sat

  // On weekends the Mon–Fri strip looks empty — jump to next Monday's week
  // so campus events (often starting next week) are visible immediately.
  const anchor = new Date(today);
  if (currentDay === 0) {
    anchor.setDate(anchor.getDate() + 1); // Sunday → Monday
  } else if (currentDay === 6) {
    anchor.setDate(anchor.getDate() + 2); // Saturday → Monday
  }

  const matchingWeekIndex = weekConfigs.findIndex((config) => {
    const weekStart = new Date(`${config.startDate}T00:00:00`);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    return anchor >= weekStart && anchor <= weekEnd;
  });

  let selectedWeekIndex = matchingWeekIndex;

  if (selectedWeekIndex === -1) {
    const firstWeekStart = new Date(`${weekConfigs[0].startDate}T00:00:00`);
    selectedWeekIndex = anchor < firstWeekStart ? 0 : weekConfigs.length - 1;
  }

  let selectedDayIndex;
  const anchorDay = anchor.getDay();

  if (anchorDay >= 1 && anchorDay <= 5) {
    selectedDayIndex = anchorDay - 1;
  } else {
    selectedDayIndex = 0;
  }

  return {
    weekIndex: selectedWeekIndex,
    dayIndex: selectedDayIndex,
  };
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function formatWeekRange(startDateISO) {
  const start = new Date(`${startDateISO}T00:00:00`);
  const end = new Date(start);
  end.setDate(start.getDate() + 4);
  return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
}

function toMinutes(clockToken) {
  const [clock, period] = clockToken.trim().split(" ");
  const [h, m] = clock.split(":").map(Number);
  let hour24 = h % 12;
  if (period === "PM") hour24 += 12;
  return hour24 * 60 + m;
}

function formatMinutes(totalMinutes) {
  const normalized = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const hour24 = Math.floor(normalized / 60);
  const minute = normalized % 60;
  const period = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;
  return `${hour12}:${pad2(minute)} ${period}`;
}

function parseRange(range) {
  const [start, end] = range.split(" - ");
  return { start: toMinutes(start), end: toMinutes(end) };
}

function databaseTimeToMinutes(value) {
  const [hours, minutes] = String(value || "00:00")
    .split(":")
    .map(Number);
  return hours * 60 + minutes;
}

function eventFitsInsideFreeSlot(event, freeSlot) {
  if (!event?.time || !String(event.time).includes(" - ")) {
    return false;
  }

  try {
    const eventRange = parseRange(event.time);
    const slotStart = databaseTimeToMinutes(freeSlot.startTime);
    const slotEnd = databaseTimeToMinutes(freeSlot.endTime);

    return eventRange.start >= slotStart && eventRange.end <= slotEnd;
  } catch {
    return false;
  }
}

function buildSlotSuggestionTime(slotTime, offsetMinutes) {
  const slot = parseRange(slotTime);
  const latestStart = Math.max(slot.start, slot.end - 60);
  const start = Math.min(slot.start + offsetMinutes, latestStart);
  const end = Math.min(start + 60, slot.end);
  return `${formatMinutes(start)} - ${formatMinutes(end)}`;
}

function SwipeableEventRow({ children }) {
  return (
    <div className="w-full min-w-0 overflow-hidden">
      <div
        className="flex w-full min-w-0 gap-2 overflow-x-auto overscroll-x-contain pb-1 hide-scrollbar snap-x snap-mandatory"
        style={{
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
        }}
      >
        {children}
      </div>
    </div>
  );
}
export default function SchedulePage({
  onEventClick,
  userKey = "guest",
  userId = null,
  programme = "",
  timetableSynced = true,
  timetableSyncLoading = false,
  focusMode = "focus",
}) {
  const initialSelection = useMemo(() => getInitialScheduleSelection(), []);

  const [selectedWeek, setSelectedWeek] = useState(initialSelection.weekIndex);

  const [selectedDay, setSelectedDay] = useState(initialSelection.dayIndex);

  const [upcomingRSVP, setUpcomingRSVP] = useState([]);
  const [upcomingRSVPLoading, setUpcomingRSVPLoading] = useState(false);
  const [upcomingRSVPError, setUpcomingRSVPError] = useState("");

  const [scheduleEvents, setScheduleEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState("");
  const [databaseSchedule, setDatabaseSchedule] = useState(() =>
    Object.fromEntries(days.map((day) => [day, []])),
  );

  useEffect(() => {
    let cancelled = false;

    const emptySchedule = Object.fromEntries(days.map((day) => [day, []]));

    const loadSchedule = async () => {
      if (!timetableSynced || (!userId && !programme)) {
        setDatabaseSchedule(emptySchedule);
        return;
      }

      try {
        const rows = await getStudentSchedule({
          studentId: userId,
          programme,
        });

        if (cancelled) return;

        if (!rows || rows.length === 0) {
          setDatabaseSchedule(emptySchedule);
          return;
        }

        const grouped = groupScheduleByDay(rows);
        const scheduleWithFreeSlots = addDetectedFreeSlots(grouped);

        setDatabaseSchedule(scheduleWithFreeSlots);
      } catch (error) {
        if (cancelled) return;

        console.error("Unable to load schedule from Supabase:", error);

        // Do not fall back to local mock timetable data.
        setDatabaseSchedule(emptySchedule);
      }
    };

    loadSchedule();

    return () => {
      cancelled = true;
    };
  }, [userId, programme, timetableSynced, selectedDay, selectedWeek]);

  useEffect(() => {
    let cancelled = false;

    const loadEvents = async () => {
      setEventsLoading(true);
      setEventsError("");

      const firstDate = weekConfigs[0].startDate;
      const lastWeekStart = new Date(
        `${weekConfigs[weekConfigs.length - 1].startDate}T00:00:00`,
      );
      lastWeekStart.setDate(lastWeekStart.getDate() + 6);
      const lastDate = `${lastWeekStart.getFullYear()}-${pad2(
        lastWeekStart.getMonth() + 1,
      )}-${pad2(lastWeekStart.getDate())}`;

      try {
        const rows = await getScheduleEvents({
          startDate: firstDate,
          endDate: lastDate,
        });

        const prefs = getEventPreferences(userKey || "guest");
        const personalized = (rows || []).map((event) => {
          const personal = computePersonalizedMatch(event, prefs, rows);
          return {
            ...event,
            match_score: personal.match_score,
            match_breakdown: personal.match_breakdown,
          };
        });

        if (!cancelled) {
          setScheduleEvents(personalized);
        }
      } catch (error) {
        if (cancelled) return;
        console.error("Unable to load campus and club events:", error);
        setScheduleEvents([]);
        setEventsError("Unable to load events from Supabase.");
      } finally {
        if (!cancelled) setEventsLoading(false);
      }
    };

    const handleEventsUpdated = () => loadEvents();

    loadEvents();
    window.addEventListener("taylors-events-updated", handleEventsUpdated);
    window.addEventListener("taylors-db-updated", handleEventsUpdated);

    return () => {
      cancelled = true;
      window.removeEventListener("taylors-events-updated", handleEventsUpdated);
      window.removeEventListener("taylors-db-updated", handleEventsUpdated);
    };
  }, [selectedDay, selectedWeek, userKey]);

  useEffect(() => {
    let cancelled = false;

    const loadUpcomingRSVPs = async () => {
      if (!userId) {
        setUpcomingRSVP([]);
        setUpcomingRSVPError("");
        setUpcomingRSVPLoading(false);
        return;
      }

      setUpcomingRSVPLoading(true);
      setUpcomingRSVPError("");

      try {
        let cloudRows = [];
        try {
          cloudRows = await getUpcomingRSVPEvents(userId);
        } catch (cloudError) {
          console.warn(
            "Cloud RSVP list unavailable, using local RSVPs:",
            cloudError?.message || cloudError,
          );
        }

        if (cancelled) return;

        const localRows = getUserRSVPEvents(userKey || "guest");
        const prefs = getEventPreferences(userKey || "guest");
        const merged = mergeRSVPLists(cloudRows, localRows, scheduleEvents).map(
          (item) => {
            const personal = computePersonalizedMatch(
              item,
              prefs,
              scheduleEvents,
            );
            return {
              ...item,
              match_score: personal.match_score || item.match_score,
              match_breakdown: personal.match_breakdown || item.match_breakdown,
            };
          },
        );

        setUpcomingRSVP(merged);
      } catch (error) {
        if (cancelled) return;

        console.error("Unable to load upcoming RSVP events:", error);

        setUpcomingRSVP([]);
        setUpcomingRSVPError("Unable to load your upcoming RSVP events.");
      } finally {
        if (!cancelled) {
          setUpcomingRSVPLoading(false);
        }
      }
    };

    const handleRSVPUpdate = (event) => {
      const updatedStudentId = event?.detail?.studentId;

      if (updatedStudentId && String(updatedStudentId) !== String(userId)) {
        return;
      }

      loadUpcomingRSVPs();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        loadUpcomingRSVPs();
      }
    };

    loadUpcomingRSVPs();

    window.addEventListener("taylors-rsvp-updated", handleRSVPUpdate);

    window.addEventListener("focus", loadUpcomingRSVPs);

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;

      window.removeEventListener("taylors-rsvp-updated", handleRSVPUpdate);

      window.removeEventListener("focus", loadUpcomingRSVPs);

      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [userId, userKey, scheduleEvents]);

  const weekConfig = weekConfigs[selectedWeek];
  const activeSchedule = databaseSchedule;
  const weekStart = new Date(`${weekConfig.startDate}T00:00:00`);

  const dayName = days[selectedDay];
  const slots = activeSchedule[dayName] || [];
  const dayDate = new Date(weekStart);
  dayDate.setDate(weekStart.getDate() + selectedDay);

  const freeSlots = slots.filter((s) => s.type === "free");

  const selectedDateISO = `${dayDate.getFullYear()}-${pad2(
    dayDate.getMonth() + 1,
  )}-${pad2(dayDate.getDate())}`;

  const selectedDayEvents = useMemo(
    () =>
      scheduleEvents.filter(
        (event) => String(event.date || "").slice(0, 10) === selectedDateISO,
      ),
    [scheduleEvents, selectedDateISO],
  );

  const slotEventMap = useMemo(() => {
    const map = {};

    freeSlots.forEach((slot) => {
      const slotStart = databaseTimeToMinutes(slot.startTime);
      const slotEnd = databaseTimeToMinutes(slot.endTime);

      map[slot.id] = selectedDayEvents
        .filter((event) => {
          if (!event.time || !String(event.time).includes(" - ")) return false;

          try {
            const eventRange = parseRange(event.time);
            return eventRange.start >= slotStart && eventRange.end <= slotEnd;
          } catch {
            return false;
          }
        })
        .sort((a, b) => {
          const aModeMatch = a.category === focusMode ? 1 : 0;
          const bModeMatch = b.category === focusMode ? 1 : 0;
          if (aModeMatch !== bModeMatch) return bModeMatch - aModeMatch;

          const aScore = Number.parseInt(String(a.match_score || "0"), 10) || 0;
          const bScore = Number.parseInt(String(b.match_score || "0"), 10) || 0;
          return bScore - aScore;
        });
    });

    return map;
  }, [freeSlots, focusMode, selectedDayEvents]);

  const recommendedFreeSlots = freeSlots.filter(
    (slot) => (slotEventMap[slot.id] || []).length > 0,
  );

  const visibleSlots = slots.filter(
    (slot) => slot.type !== "free" || (slotEventMap[slot.id] || []).length > 0,
  );

  const totalMatchingEvents = recommendedFreeSlots.reduce(
    (sum, slot) => sum + (slotEventMap[slot.id] || []).length,
    0,
  );

  return (
    <div className="px-5 pt-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-outfit font-bold text-white">
            Schedule
          </h1>
          <p className="text-sm font-inter text-gray-500">
            Week {weekConfig.week} • {formatWeekRange(weekConfig.startDate)}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <span className="relative mr-2 flex h-2 w-2">
            <span
              className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
                timetableSyncLoading
                  ? "bg-gray-400"
                  : timetableSynced
                    ? "bg-balance-accent"
                    : "bg-yellow-400"
              }`}
            />

            <span
              className={`relative inline-flex h-2 w-2 rounded-full ${
                timetableSyncLoading
                  ? "bg-gray-400"
                  : timetableSynced
                    ? "bg-balance-accent"
                    : "bg-yellow-400"
              }`}
            />
          </span>

          <span
            className={`text-[10px] font-inter font-medium ${
              timetableSyncLoading
                ? "text-gray-400"
                : timetableSynced
                  ? "text-balance-accent"
                  : "text-yellow-400"
            }`}
          >
            {timetableSyncLoading
              ? "Checking Sync"
              : timetableSynced
                ? "CAMS Synced"
                : "Sync Off"}
          </span>
        </div>
      </div>

      <div className="glass mb-5 rounded-2xl p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-outfit font-semibold text-white">
              Your RSVP Events
            </h3>

            <p className="mt-0.5 text-[10px] font-inter text-gray-500">
              Events you registered for (upcoming and recent)
            </p>
          </div>

          <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-inter text-gray-400">
            {upcomingRSVP.length} saved
          </span>
        </div>

        {upcomingRSVPLoading ? (
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-7 text-center">
            <span className="mx-auto mb-2 block h-5 w-5 animate-spin rounded-full border-2 border-white/10 border-t-balance-accent" />

            <p className="text-[11px] font-inter text-gray-400">
              Loading your RSVP events…
            </p>
          </div>
        ) : upcomingRSVPError ? (
          <div className="rounded-xl border border-yellow-400/20 bg-yellow-400/5 px-4 py-5 text-center">
            <p className="text-[11px] font-inter text-yellow-300">
              {upcomingRSVPError}
            </p>
          </div>
        ) : upcomingRSVP.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-6 text-center">
            <p className="text-sm font-outfit font-semibold text-white">
              No RSVP events yet
            </p>
            <p className="mt-1 text-[11px] font-inter text-gray-500">
              Open an event and tap RSVP to save it here.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {(() => {
              const futureRSVPs = upcomingRSVP.filter((item) => !item.isPast);
              const pastRSVPs = upcomingRSVP.filter((item) => item.isPast);
              const list = futureRSVPs.length > 0 ? futureRSVPs : upcomingRSVP;

              return (
                <>
                  {futureRSVPs.length === 0 && pastRSVPs.length > 0 ? (
                    <p className="pb-1 text-[10px] font-inter text-amber-300/90">
                      No future RSVPs yet — showing past ones until you join an
                      upcoming event. Dates are being kept in sync with Home.
                    </p>
                  ) : (
                    <p className="pb-1 text-[10px] font-inter text-gray-500">
                      {futureRSVPs.length} upcoming RSVP
                      {futureRSVPs.length === 1 ? "" : "s"}
                      {pastRSVPs.length > 0
                        ? ` · ${pastRSVPs.length} past hidden`
                        : ""}
                    </p>
                  )}

                  {list.map((item) => (
                    <motion.button
                      key={
                        item.rsvpId || `${item.sourceTable}-${item.sourceId}`
                      }
                      type="button"
                      whileTap={{ scale: 0.98 }}
                      onClick={() => onEventClick?.(item)}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-left transition-colors hover:bg-white/10"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-outfit font-semibold text-white">
                            {item.title}
                          </p>

                          <p className="mt-1 truncate text-[10px] font-inter text-gray-500">
                            {item.host || "Campus Event"}
                          </p>

                          <p className="mt-1 truncate text-[10px] font-inter text-gray-400">
                            📍 {item.location || "Location TBC"}
                          </p>
                        </div>

                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[8px] font-inter font-semibold ${
                              item.eventType === "club"
                                ? "bg-purple-400/10 text-purple-300"
                                : "bg-taylor-red/10 text-red-300"
                            }`}
                          >
                            {item.eventType === "club" ? "Club" : "Campus"}
                          </span>

                          <span
                            className={`text-[9px] font-inter ${
                              item.isPast
                                ? "text-gray-500"
                                : "text-balance-accent"
                            }`}
                          >
                            {item.isPast ? "Past event" : "RSVP Confirmed"}
                          </span>

                          {item.match_score ? (
                            <span className="text-[9px] font-inter text-emerald-300">
                              {String(item.match_score).includes("%")
                                ? item.match_score
                                : `${item.match_score}%`}{" "}
                              match
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-white/5 pt-2">
                        <span className="text-[9px] font-inter text-gray-400">
                          📅 {item.date || "Date TBC"}
                        </span>

                        <span className="text-[9px] font-inter text-gray-400">
                          🕐 {item.time || "Time TBC"}
                        </span>
                      </div>
                    </motion.button>
                  ))}
                </>
              );
            })()}
          </div>
        )}
      </div>

      {/* Event calendar remains visible in both sync modes. */}
      <div className="glass rounded-xl p-2.5 mb-5 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setSelectedWeek((prev) => Math.max(0, prev - 1))}
          disabled={selectedWeek === 0}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Previous week"
        >
          <ChevronLeft size={16} className="text-gray-300" />
        </button>
        <div className="text-center">
          <p className="text-[10px] font-inter text-gray-500 uppercase tracking-wider">
            {timetableSynced ? "Academic Timeline" : "Event Calendar"}
          </p>
          <p className="text-sm font-outfit font-semibold text-white">
            Week {weekConfig.week}
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            setSelectedWeek((prev) =>
              Math.min(weekConfigs.length - 1, prev + 1),
            )
          }
          disabled={selectedWeek === weekConfigs.length - 1}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Next week"
        >
          <ChevronRight size={16} className="text-gray-300" />
        </button>
      </div>

      {/* Day Selector */}
      <div className="flex gap-2 mb-6">
        {days.map((day, index) => {
          const dayShort = day.slice(0, 3);
          const displayedDayDate = new Date(weekStart);
          displayedDayDate.setDate(weekStart.getDate() + index);
          const isActive = selectedDay === index;

          const today = getLocalDateOnly();
          const displayedDate = getLocalDateOnly(displayedDayDate);
          const isToday = displayedDate.getTime() === today.getTime();
          const dateISO = `${displayedDayDate.getFullYear()}-${pad2(
            displayedDayDate.getMonth() + 1,
          )}-${pad2(displayedDayDate.getDate())}`;
          const eventsForDate = scheduleEvents.filter(
            (event) => String(event.date || "").slice(0, 10) === dateISO,
          );

          const freeSlotsForDate = timetableSynced
            ? (activeSchedule[day] || []).filter((slot) => slot.type === "free")
            : [];

          const hasEvents = eventsForDate.length > 0;

          const hasRecommendedEvent =
            hasEvents &&
            freeSlotsForDate.some((freeSlot) =>
              eventsForDate.some((event) =>
                eventFitsInsideFreeSlot(event, freeSlot),
              ),
            );

          return (
            <motion.button
              key={day}
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedDay(index)}
              className={`flex-1 py-3 rounded-xl flex flex-col items-center gap-1 transition-all duration-300 relative ${
                isActive
                  ? "bg-gradient-to-b from-taylor-red to-taylor-red-dark text-white shadow-glow-red"
                  : "glass text-gray-500 hover:text-gray-300"
              }`}
            >
              <span className="text-[10px] font-inter font-medium uppercase">
                {dayShort}
              </span>
              <span
                className={`text-sm font-outfit font-bold ${
                  isActive ? "text-white" : "text-gray-300"
                }`}
              >
                {displayedDayDate.getDate()}
              </span>
              {isToday && (
                <span
                  className={`absolute -top-2 rounded-full px-1.5 py-0.5 text-[7px] font-inter font-bold uppercase tracking-wide ${
                    isActive
                      ? "bg-white text-taylor-red"
                      : "bg-taylor-red text-white"
                  }`}
                >
                  Today
                </span>
              )}
              {hasEvents && !isActive && (
                <span
                  className={`absolute -bottom-0.5 h-1.5 w-1.5 rounded-full ${
                    hasRecommendedEvent
                      ? "bg-balance-accent shadow-glow-green"
                      : "bg-taylor-red"
                  }`}
                  title={
                    hasRecommendedEvent
                      ? "Event recommendation available"
                      : "Events available, but none match a free slot"
                  }
                />
              )}
            </motion.button>
          );
        })}
      </div>

      {timetableSynced && slots.length === 0 && (
        <div className="mb-5 rounded-2xl border border-amber-400/20 bg-amber-400/5 px-4 py-4">
          <p className="text-sm font-outfit font-semibold text-white">
            No classes loaded for this programme
          </p>
          <p className="mt-1 text-[11px] font-inter text-gray-400">
            Academic Timeline stays empty until your programme has timetable
            rows. Use the week arrows — campus events still appear under Today
            Events when that day has any (try Week of Jul 20+).
          </p>
        </div>
      )}

      {timetableSynced && (
        <>
          {/* Timetable Timeline */}
          <div key={selectedDateISO} className="relative">
            <div className="absolute left-[22px] top-0 bottom-0 w-[2px] bg-white/5" />

            <div className="space-y-3">
              {slots.length === 0 && (
                <div className="ml-[60px] rounded-xl border border-white/10 bg-white/5 px-4 py-6 text-center">
                  <p className="text-sm font-outfit font-semibold text-white">
                    No timetable available
                  </p>
                  <p className="mt-1 text-[11px] font-inter text-gray-500">
                    No classes were found for {programme || "this programme"}.
                  </p>
                </div>
              )}

              {visibleSlots.map((slot, index) => {
                const isFree = slot.type === "free";
                const [startTime, endTime] = slot.time.split(" - ");

                return (
                  <motion.div
                    key={slot.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.08 }}
                    className="flex min-w-0 items-start gap-4"
                  >
                    <div className="flex w-[44px] flex-shrink-0 flex-col items-center">
                      <div
                        className={`z-10 h-3 w-3 rounded-full border-2 ${
                          isFree
                            ? "border-balance-accent bg-balance-accent shadow-glow-green"
                            : "border-white/20 bg-[#0a0a12]"
                        }`}
                      />
                      <span className="mt-1 text-[9px] font-inter text-gray-600">
                        {startTime}
                      </span>
                    </div>

                    <div
                      className={`min-w-0 flex-1 overflow-hidden rounded-xl p-4 transition-all duration-300 ${
                        isFree
                          ? "border border-balance-accent/20 bg-gradient-to-r from-balance-accent/10 to-balance-accent/5"
                          : "glass"
                      }`}
                    >
                      <div className="mb-1 flex items-center justify-between">
                        <h3
                          className={`text-sm font-outfit font-semibold ${
                            isFree ? "text-balance-accent" : "text-white"
                          }`}
                        >
                          {slot.subject}
                        </h3>
                        <span className="text-[10px] font-inter text-gray-500">
                          {startTime} – {endTime}
                        </span>
                      </div>

                      {slot.room && (
                        <p className="flex items-center gap-1 text-[11px] font-inter text-gray-500">
                          📍 {slot.room}
                        </p>
                      )}

                      {slot.zone && (
                        <span className="mt-1 inline-block rounded bg-white/5 px-2 py-0.5 text-[9px] font-inter text-gray-600">
                          Zone: {slot.zone}
                        </span>
                      )}

                      {isFree && (
                        <div className="mt-3 min-w-0 overflow-hidden border-t border-balance-accent/10 pt-3">
                          <div className="mb-2 flex min-w-0 items-center gap-1.5">
                            <span className="relative flex h-2 w-2 flex-shrink-0">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-balance-accent opacity-75" />
                              <span className="relative inline-flex h-2 w-2 rounded-full bg-balance-accent" />
                            </span>

                            <span className="min-w-0 text-[10px] font-inter font-medium text-balance-accent/80">
                              AI found {(slotEventMap[slot.id] || []).length}{" "}
                              event
                              {(slotEventMap[slot.id] || []).length === 1
                                ? ""
                                : "s"}{" "}
                              for this slot
                            </span>
                          </div>

                          <SwipeableEventRow>
                            {(slotEventMap[slot.id] || []).map((event) => (
                              <button
                                key={`${event.sourceTable}-${event.sourceId}`}
                                type="button"
                                onClick={() => onEventClick?.(event)}
                                className="w-[145px] min-w-[145px] flex-none snap-start overflow-hidden rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-left transition-colors hover:bg-white/10"
                              >
                                <p className="mb-0.5 truncate text-[9px] font-inter font-bold text-green-400">
                                  {event.match_score || "—"} Match
                                </p>

                                <p className="truncate text-[10px] font-outfit font-semibold text-white">
                                  {event.title}
                                </p>

                                <p className="truncate text-[9px] font-inter text-gray-500">
                                  {event.host || "Campus Event"}
                                </p>

                                <p className="truncate text-[8px] font-inter text-gray-500">
                                  {event.time || "TBD"}
                                </p>
                              </button>
                            ))}
                          </SwipeableEventRow>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-6 mb-5 glass rounded-2xl p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-outfit font-semibold text-white">
                  {recommendedFreeSlots.length} Free Slot
                  {recommendedFreeSlots.length === 1 ? "" : "s"} Today
                </h3>
                <p className="text-[11px] font-inter text-gray-500">
                  {totalMatchingEvents} matched event
                  {totalMatchingEvents === 1 ? "" : "s"} available
                </p>
              </div>

              <div
                className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[10px] font-inter font-bold ${
                  recommendedFreeSlots.length > 0
                    ? "border-balance-accent/20 bg-balance-accent/10 text-balance-accent"
                    : "border-yellow-400/20 bg-yellow-400/10 text-yellow-300"
                }`}
              >
                <span className="relative flex h-2 w-2">
                  <span
                    className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
                      recommendedFreeSlots.length > 0
                        ? "bg-balance-accent"
                        : "bg-yellow-400"
                    }`}
                  />
                  <span
                    className={`relative inline-flex h-2 w-2 rounded-full ${
                      recommendedFreeSlots.length > 0
                        ? "bg-balance-accent"
                        : "bg-yellow-400"
                    }`}
                  />
                </span>
                <span>
                  {recommendedFreeSlots.length > 0
                    ? "Free Slot Available"
                    : "No Event Recommendation"}
                </span>
              </div>
            </div>
          </motion.div>
        </>
      )}

      {/* <div className="glass mb-5 rounded-2xl p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-outfit font-semibold text-white">
            Upcoming RSVP Events
          </h3>

          <span className="shrink-0 text-[10px] font-inter text-gray-500">
            {upcomingRSVP.length} saved
          </span>
        </div>

        <div className="mt-3">
          <p className="mt-0.5 text-[10px] font-inter text-gray-500">
            {upcomingRSVP.length === 0 && !upcomingRSVPLoading
              ? "No upcoming signups yet. Open an event and tap RSVP."
              : ""}
          </p>
        </div> */}

      <div className="glass rounded-2xl p-4 mb-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-outfit font-semibold text-white">
            Today Events
          </h3>
          <span className="text-[10px] font-inter text-gray-500">
            {selectedDayEvents.length} event
            {selectedDayEvents.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="mt-3">
          <p className="mt-1 text-[11px] font-inter text-gray-500">
            {!eventsLoading && !eventsError && selectedDayEvents.length === 0
              ? "No events for this day — try next week (Jul 20+) with the arrows"
              : `${dayName}, ${dayDate.toLocaleDateString("en-MY", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}`}
          </p>
        </div>

        {eventsLoading ? (
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-8 text-center">
            <p className="text-sm font-outfit font-semibold text-white">
              Loading events…
            </p>
          </div>
        ) : eventsError ? (
          <div className="rounded-xl border border-yellow-400/20 bg-yellow-400/5 px-4 py-6 text-center">
            <p className="text-[11px] font-inter text-yellow-300">
              {eventsError}
            </p>
          </div>
        ) : selectedDayEvents.length === 0 ? null : (
          <div className="space-y-2">
            {selectedDayEvents.map((event) => (
              <button
                key={event.id}
                type="button"
                onClick={() => onEventClick?.(event)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-left transition-colors hover:bg-white/10"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-outfit font-semibold text-white">
                      {event.title}
                    </p>
                    <p className="mt-1 truncate text-[10px] font-inter text-gray-500">
                      {event.host || "Campus Event"} •{" "}
                      {event.location || "Location TBC"}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-[9px] font-inter text-gray-500">
                      {event.date || "Date TBC"}
                    </span>
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[8px] font-inter font-medium ${
                        event.eventType === "club"
                          ? "bg-purple-400/10 text-purple-300"
                          : "bg-taylor-red/10 text-red-300"
                      }`}
                    >
                      {event.eventType === "club" ? "Club" : "Campus"}
                    </span>
                  </div>
                </div>
                <p className="mt-1 text-[10px] font-inter text-gray-400">
                  {event.time || "Time TBC"}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
