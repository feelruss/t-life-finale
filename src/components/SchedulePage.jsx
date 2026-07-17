// This is the src/components/SchedulePage.jsx file
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { events } from "../data/events";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  addDetectedFreeSlots,
  getStudentSchedule,
  groupScheduleByDay,
} from "../services/scheduleService";
import { getUpcomingRSVPEvents } from "../services/rsvpService";

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
];

function getLocalDateOnly(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getInitialScheduleSelection() {
  const today = getLocalDateOnly();

  const matchingWeekIndex = weekConfigs.findIndex((config) => {
    const weekStart = new Date(`${config.startDate}T00:00:00`);
    const weekEnd = new Date(weekStart);

    // Include Saturday and Sunday as part of the same academic week.
    weekEnd.setDate(weekStart.getDate() + 6);

    return today >= weekStart && today <= weekEnd;
  });

  let selectedWeekIndex = matchingWeekIndex;

  // If today is before the available timeline, show the first week.
  if (selectedWeekIndex === -1) {
    const firstWeekStart = new Date(`${weekConfigs[0].startDate}T00:00:00`);

    selectedWeekIndex = today < firstWeekStart ? 0 : weekConfigs.length - 1;
  }

  const currentDay = today.getDay();

  let selectedDayIndex;

  if (currentDay >= 1 && currentDay <= 5) {
    // Monday = 0 through Friday = 4.
    selectedDayIndex = currentDay - 1;
  } else if (currentDay === 6) {
    // On Saturday, show Friday.
    selectedDayIndex = 4;
  } else {
    // On Sunday, show Monday.
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

function buildSlotSuggestionTime(slotTime, offsetMinutes) {
  const slot = parseRange(slotTime);
  const latestStart = Math.max(slot.start, slot.end - 60);
  const start = Math.min(slot.start + offsetMinutes, latestStart);
  const end = Math.min(start + 60, slot.end);
  return `${formatMinutes(start)} - ${formatMinutes(end)}`;
}

function SwipeableEventRow({ children }) {
  return (
    <div
      className="flex gap-2 overflow-x-auto hide-scrollbar snap-x snap-mandatory"
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      {children}
    </div>
  );
}

export default function SchedulePage({
  onEventClick,
  userId = null,
  programme = "",
  timetableSynced = true,
}) {
  const initialSelection = useMemo(() => getInitialScheduleSelection(), []);

  const [selectedWeek, setSelectedWeek] = useState(initialSelection.weekIndex);

  const [selectedDay, setSelectedDay] = useState(initialSelection.dayIndex);
  const [upcomingRSVP, setUpcomingRSVP] = useState([]);
  const [databaseSchedule, setDatabaseSchedule] = useState(() =>
    Object.fromEntries(days.map((day) => [day, []])),
  );

  useEffect(() => {
    let cancelled = false;

    const emptySchedule = Object.fromEntries(days.map((day) => [day, []]));

    const loadSchedule = async () => {
      if (!userId && !programme) {
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
  }, [userId, programme]);

  useEffect(() => {
    let cancelled = false;

    const loadUpcomingRSVPs = async () => {
      if (!userId) {
        setUpcomingRSVP([]);
        return;
      }

      try {
        const rows = await getUpcomingRSVPEvents(userId);

        if (!cancelled) {
          setUpcomingRSVP(rows);
        }
      } catch (error) {
        if (cancelled) return;

        console.error("Unable to load upcoming RSVP events:", error);
        setUpcomingRSVP([]);
      }
    };

    const handleRSVPUpdate = (event) => {
      const updatedStudentId = event?.detail?.studentId;

      // Ignore RSVP updates belonging to another student.
      if (updatedStudentId && String(updatedStudentId) !== String(userId)) {
        return;
      }

      loadUpcomingRSVPs();
    };

    loadUpcomingRSVPs();

    window.addEventListener("taylors-rsvp-updated", handleRSVPUpdate);

    return () => {
      cancelled = true;

      window.removeEventListener("taylors-rsvp-updated", handleRSVPUpdate);
    };
  }, [userId]);

  const weekConfig = weekConfigs[selectedWeek];
  const activeSchedule = databaseSchedule;
  const weekStart = new Date(`${weekConfig.startDate}T00:00:00`);

  const dayName = days[selectedDay];
  const slots = activeSchedule[dayName] || [];
  const dayDate = new Date(weekStart);
  dayDate.setDate(weekStart.getDate() + selectedDay);

  const freeSlots = slots.filter((s) => s.type === "free");

  const slotEventMap = useMemo(() => {
    const map = {};
    const seed = weekConfig.week * 101 + selectedDay * 17;

    const pool = events.filter(
      (evt) => evt.category === "focus" || evt.category === "balance",
    );
    freeSlots.forEach((slot, slotIndex) => {
      const count = 1 + ((seed + slotIndex) % 2);
      const slotSuggestions = [];

      for (let i = 0; i < count; i += 1) {
        const baseEvent = pool[(seed + slotIndex * 7 + i * 11) % pool.length];
        const offset = (i * 25 + slotIndex * 10) % 50;
        slotSuggestions.push({
          ...baseEvent,
          id: `${baseEvent.id}-W${weekConfig.week}-D${selectedDay}-S${slotIndex}-${i}`,
          sourceEventId: baseEvent.id,
          time: buildSlotSuggestionTime(slot.time, offset),
          match_score: `${82 + ((seed + slotIndex * 13 + i * 9) % 16)}%`,
        });
      }

      map[slot.id] = slotSuggestions;
    });

    return map;
  }, [freeSlots, selectedDay, weekConfig.week]);

  const totalMatchingEvents = Object.values(slotEventMap).reduce(
    (sum, list) => sum + list.length,
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
          <span className="relative flex h-2 w-2 mr-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-balance-accent opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-balance-accent"></span>
          </span>
          <span
            className={`text-[10px] font-inter font-medium ${timetableSynced ? "text-balance-accent" : "text-amber-300"}`}
          >
            {timetableSynced ? "CAMS Synced" : "Sync Off (Local Schedule)"}
          </span>
        </div>
      </div>

      <div className="glass rounded-2xl p-4 mb-5">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-outfit font-semibold text-white">
            Upcoming RSVP Events
          </h3>
          <span className="text-[10px] font-inter text-gray-500">
            {upcomingRSVP.length} saved
          </span>
        </div>
        {upcomingRSVP.length === 0 ? (
          <p className="text-[11px] font-inter text-gray-500">
            No upcoming signups yet. Open an event and tap RSVP.
          </p>
        ) : (
          <div className="space-y-2">
            {upcomingRSVP.slice(0, 6).map((item) => {
              return (
                <button
                  key={item.rsvpId || item.eventId || item.id}
                  type="button"
                  onClick={() => onEventClick?.(item)}
                  className="w-full text-left rounded-xl border border-white/10 bg-white/5 px-3 py-2 hover:bg-white/10 transition-colors"
                >
                  <p className="text-xs font-outfit font-semibold text-white truncate">
                    {item.title}
                  </p>
                  <p className="text-[10px] font-inter text-gray-500 truncate">
                    {item.host} • {item.date || "TBD"} • {item.time || "TBD"}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="glass rounded-xl p-2.5 mb-5 flex items-center justify-between">
        <button
          onClick={() => setSelectedWeek((prev) => Math.max(0, prev - 1))}
          disabled={selectedWeek === 0}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Previous week"
        >
          <ChevronLeft size={16} className="text-gray-300" />
        </button>
        <div className="text-center">
          <p className="text-[10px] font-inter text-gray-500 uppercase tracking-wider">
            Academic Timeline
          </p>
          <p className="text-sm font-outfit font-semibold text-white">
            Week {weekConfig.week}
          </p>
        </div>
        <button
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
          const dayDate = new Date(weekStart);
          dayDate.setDate(weekStart.getDate() + index);
          const isActive = selectedDay === index;

          const today = getLocalDateOnly();
          const displayedDate = getLocalDateOnly(dayDate);
          const isToday = displayedDate.getTime() === today.getTime();

          const hasFreeSlot = (activeSchedule[day] || []).some(
            (s) => s.type === "free",
          );

          return (
            <motion.button
              key={day}
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
                className={`text-sm font-outfit font-bold ${isActive ? "text-white" : "text-gray-300"}`}
              >
                {dayDate.getDate()}
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

              {hasFreeSlot && !isActive && (
                <div className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-balance-accent" />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical timeline line */}
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
          {slots.map((slot, index) => {
            const isFree = slot.type === "free";
            const startTime = slot.time.split(" - ")[0];
            const endTime = slot.time.split(" - ")[1];

            return (
              <motion.div
                key={slot.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.08 }}
                className="flex items-start gap-4"
              >
                {/* Time dot */}
                <div className="flex flex-col items-center flex-shrink-0 w-[44px]">
                  <div
                    className={`w-3 h-3 rounded-full border-2 z-10 ${
                      isFree
                        ? "bg-balance-accent border-balance-accent shadow-glow-green"
                        : "bg-[#0a0a12] border-white/20"
                    }`}
                  />
                  <span className="text-[9px] font-inter text-gray-600 mt-1">
                    {startTime}
                  </span>
                </div>

                {/* Slot card */}
                <div
                  className={`flex-1 rounded-xl p-4 transition-all duration-300 ${
                    isFree
                      ? "bg-gradient-to-r from-balance-accent/10 to-balance-accent/5 border border-balance-accent/20"
                      : "glass"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
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
                    <p className="text-[11px] font-inter text-gray-500 flex items-center gap-1">
                      📍 {slot.room}
                    </p>
                  )}

                  {slot.zone && (
                    <span className="inline-block text-[9px] font-inter text-gray-600 mt-1 px-2 py-0.5 rounded bg-white/5">
                      Zone: {slot.zone}
                    </span>
                  )}

                  {isFree && (
                    <div className="mt-3 pt-3 border-t border-balance-accent/10">
                      {(() => {
                        const matchingEvents = slotEventMap[slot.id] || [];
                        return (
                          <>
                            <div className="flex items-center gap-1.5 mb-2">
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-balance-accent opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-balance-accent"></span>
                              </span>
                              <span className="text-[10px] font-inter text-balance-accent/80 font-medium">
                                AI found {matchingEvents.length} events for this
                                slot
                              </span>
                            </div>
                            <SwipeableEventRow>
                              {matchingEvents.map((evt) => (
                                <button
                                  key={evt.id}
                                  type="button"
                                  onClick={() => onEventClick?.(evt)}
                                  className="flex-shrink-0 px-2.5 py-2 rounded-lg bg-white/5 border border-white/10 min-w-[138px] max-w-[150px] snap-start hover:bg-white/10 transition-colors"
                                >
                                  <p className="text-[9px] font-inter font-bold text-green-400 mb-0.5">
                                    {evt.match_score || "—"} Match
                                  </p>
                                  <p className="text-[10px] font-outfit font-semibold text-white truncate">
                                    {evt.title}
                                  </p>
                                  <p className="text-[9px] font-inter text-gray-500">
                                    {evt.host}
                                  </p>
                                  <p className="text-[8px] font-inter text-gray-500">
                                    {evt.time || "TBD"}
                                  </p>
                                  <p className="text-[8px] font-inter text-gray-600 truncate mt-0.5">
                                    {evt.description}
                                  </p>
                                </button>
                              ))}
                            </SwipeableEventRow>
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Free slots summary */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-6 glass rounded-2xl p-4"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-outfit font-semibold text-white">
              {freeSlots.length} Free Slot{freeSlots.length !== 1 ? "s" : ""}{" "}
              Today
            </h3>
            <p className="text-[11px] font-inter text-gray-500">
              {freeSlots.length > 0
                ? `${totalMatchingEvents} matched events available`
                : "No free time detected — all slots booked"}
            </p>
          </div>
          <div
            className={`px-3 py-1.5 rounded-lg text-[10px] font-inter font-bold ${
              freeSlots.length > 0
                ? "bg-balance-accent/10 text-balance-accent border border-balance-accent/20"
                : "bg-white/5 text-gray-500"
            }`}
          >
            {freeSlots.length > 0 ? "🟢 Available" : "🔴 Full Day"}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
