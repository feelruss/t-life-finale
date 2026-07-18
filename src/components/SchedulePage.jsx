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
  timetableSyncLoading = false,
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
  }, [userId, programme, timetableSynced]);

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

  const selectedDateISO = `${dayDate.getFullYear()}-${pad2(dayDate.getMonth() + 1)}-${pad2(dayDate.getDate())}`;

  const selectedDayEvents = useMemo(() => {
    const exactDateMatches = events.filter(
      (event) => String(event.date || "").slice(0, 10) === selectedDateISO,
    );

    if (exactDateMatches.length > 0) {
      return exactDateMatches;
    }

    return events.filter((event) => {
      if (!event.date) return false;
      const eventDate = new Date(`${String(event.date).slice(0, 10)}T00:00:00`);
      return (
        !Number.isNaN(eventDate.getTime()) &&
        eventDate.getDay() === selectedDay + 1
      );
    });
  }, [selectedDateISO, selectedDay]);

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
          const hasFreeSlot =
            timetableSynced &&
            (activeSchedule[day] || []).some((slot) => slot.type === "free");

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
              {hasFreeSlot && !isActive && (
                <div className="absolute -bottom-0.5 h-1 w-1 rounded-full bg-balance-accent" />
              )}
            </motion.button>
          );
        })}
      </div>

      {!timetableSynced ? (
        <div className="glass rounded-2xl p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-outfit font-semibold text-white">
                Campus Events
              </h3>
              <p className="mt-1 text-[11px] font-inter text-gray-500">
                {dayName},{" "}
                {dayDate.toLocaleDateString("en-MY", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>
            <span className="text-[10px] font-inter text-gray-500">
              {selectedDayEvents.length} event
              {selectedDayEvents.length === 1 ? "" : "s"}
            </span>
          </div>

          {selectedDayEvents.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-8 text-center">
              <p className="text-sm font-outfit font-semibold text-white">
                No events for this day
              </p>
              <p className="mt-1 text-[11px] font-inter text-gray-500">
                Select another day in the event calendar.
              </p>
            </div>
          ) : (
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
                    <span className="shrink-0 text-[9px] font-inter text-gray-500">
                      {event.date || "Date TBC"}
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] font-inter text-gray-400">
                    {event.time || "Time TBC"}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Timetable Timeline */}
          <div className="relative">
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
                const [startTime, endTime] = slot.time.split(" - ");

                return (
                  <motion.div
                    key={slot.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.08 }}
                    className="flex items-start gap-4"
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
                      className={`flex-1 rounded-xl p-4 transition-all duration-300 ${
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
                        <div className="mt-3 border-t border-balance-accent/10 pt-3">
                          <div className="mb-2 flex items-center gap-1.5">
                            <span className="relative flex h-2 w-2">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-balance-accent opacity-75" />
                              <span className="relative inline-flex h-2 w-2 rounded-full bg-balance-accent" />
                            </span>
                            <span className="text-[10px] font-inter font-medium text-balance-accent/80">
                              AI found {(slotEventMap[slot.id] || []).length}{" "}
                              events for this slot
                            </span>
                          </div>
                          <SwipeableEventRow>
                            {(slotEventMap[slot.id] || []).map((event) => (
                              <button
                                key={event.id}
                                type="button"
                                onClick={() => onEventClick?.(event)}
                                className="min-w-[138px] max-w-[150px] flex-shrink-0 snap-start rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 transition-colors hover:bg-white/10"
                              >
                                <p className="mb-0.5 text-[9px] font-inter font-bold text-green-400">
                                  {event.match_score || "—"} Match
                                </p>
                                <p className="truncate text-[10px] font-outfit font-semibold text-white">
                                  {event.title}
                                </p>
                                <p className="text-[9px] font-inter text-gray-500">
                                  {event.host}
                                </p>
                                <p className="text-[8px] font-inter text-gray-500">
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
            className="mt-6 glass rounded-2xl p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-outfit font-semibold text-white">
                  {freeSlots.length} Free Slot
                  {freeSlots.length !== 1 ? "s" : ""} Today
                </h3>
                <p className="text-[11px] font-inter text-gray-500">
                  {freeSlots.length > 0
                    ? `${totalMatchingEvents} matched events available`
                    : "No free time detected — all slots booked"}
                </p>
              </div>
              <div
                className={`rounded-lg px-3 py-1.5 text-[10px] font-inter font-bold ${
                  freeSlots.length > 0
                    ? "border border-balance-accent/20 bg-balance-accent/10 text-balance-accent"
                    : "bg-white/5 text-gray-500"
                }`}
              >
                {freeSlots.length > 0 ? "🟢 Available" : "🔴 Full Day"}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
}
