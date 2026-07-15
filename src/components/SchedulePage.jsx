import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { weeklyTimetable, events } from '../data/events';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getUserRSVPEvents } from '../data/db';

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const weekConfigs = [
    {
        week: 8,
        startDate: '2026-03-02',
        shifts: {},
        overrides: {},
    },
    {
        week: 9,
        startDate: '2026-03-09',
        shifts: {
            'TUE-3': 30,
            'THU-4': 30,
        },
        overrides: {
            'WED-4': { subject: 'Capstone Project Sprint', room: 'Block B, Innovation Hub' },
        },
    },
    {
        week: 10,
        startDate: '2026-03-16',
        shifts: {
            'MON-5': 60,
            'FRI-1': -60,
        },
        overrides: {
            'THU-3': { subject: 'Faculty Consultation Slot', type: 'free' },
        },
    },
    {
        week: 11,
        startDate: '2026-03-23',
        shifts: {
            'TUE-1': -30,
            'TUE-3': -30,
        },
        overrides: {
            'FRI-2': { subject: 'Independent Study Block', type: 'free' },
        },
    },
];

function pad2(n) {
    return String(n).padStart(2, '0');
}

function shiftSingleTime(time, minutes) {
    const [clock, period] = time.trim().split(' ');
    const [h, m] = clock.split(':').map(Number);
    let hour24 = h % 12;
    if (period === 'PM') hour24 += 12;

    const totalMinutes = hour24 * 60 + m + minutes;
    const normalized = ((totalMinutes % (24 * 60)) + (24 * 60)) % (24 * 60);
    const newHour24 = Math.floor(normalized / 60);
    const newMinute = normalized % 60;
    const newPeriod = newHour24 >= 12 ? 'PM' : 'AM';
    const newHour12 = newHour24 % 12 || 12;

    return `${newHour12}:${pad2(newMinute)} ${newPeriod}`;
}

function shiftTimeRange(range, minutes) {
    const [start, end] = range.split(' - ');
    return `${shiftSingleTime(start, minutes)} - ${shiftSingleTime(end, minutes)}`;
}

function buildWeekSchedule(config, weeklySource = weeklyTimetable) {
    const next = {};
    days.forEach((day) => {
        next[day] = (weeklySource[day] || []).map((slot) => {
            const shiftedMinutes = config.shifts[slot.id] || 0;
            const override = config.overrides[slot.id] || {};
            return {
                ...slot,
                ...override,
                time: shiftedMinutes ? shiftTimeRange(slot.time, shiftedMinutes) : slot.time,
            };
        });
    });
    return next;
}

function formatWeekRange(startDateISO) {
    const start = new Date(`${startDateISO}T00:00:00`);
    const end = new Date(start);
    end.setDate(start.getDate() + 4);
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

function toMinutes(clockToken) {
    const [clock, period] = clockToken.trim().split(' ');
    const [h, m] = clock.split(':').map(Number);
    let hour24 = h % 12;
    if (period === 'PM') hour24 += 12;
    return hour24 * 60 + m;
}

function formatMinutes(totalMinutes) {
    const normalized = ((totalMinutes % (24 * 60)) + (24 * 60)) % (24 * 60);
    const hour24 = Math.floor(normalized / 60);
    const minute = normalized % 60;
    const period = hour24 >= 12 ? 'PM' : 'AM';
    const hour12 = hour24 % 12 || 12;
    return `${hour12}:${pad2(minute)} ${period}`;
}

function parseRange(range) {
    const [start, end] = range.split(' - ');
    return { start: toMinutes(start), end: toMinutes(end) };
}

function isEventWithinSlot(eventRange, slotRange) {
    const event = parseRange(eventRange);
    const slot = parseRange(slotRange);
    return event.start >= slot.start && event.end <= slot.end;
}

function getDateISO(dateObj) {
    return `${dateObj.getFullYear()}-${pad2(dateObj.getMonth() + 1)}-${pad2(dateObj.getDate())}`;
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
            style={{ WebkitOverflowScrolling: 'touch' }}
        >
            {children}
        </div>
    );
}

export default function SchedulePage({ weeklyData = weeklyTimetable, onEventClick, userKey = 'guest', timetableSynced = true }) {
    const [selectedWeek, setSelectedWeek] = useState(0);
    const [selectedDay, setSelectedDay] = useState(() => {
        const today = new Date().getDay();
        // 0=Sun, 1=Mon...5=Fri, 6=Sat → map to our day index
        return today >= 1 && today <= 5 ? today - 1 : 0;
    });
    const [upcomingRSVP, setUpcomingRSVP] = useState(() => getUserRSVPEvents(userKey));

    useEffect(() => {
        setUpcomingRSVP(getUserRSVPEvents(userKey));

        const onDataUpdate = (evt) => {
            const updatedKey = String(evt?.detail?.key || '');
            if (updatedKey.startsWith('taylors_rsvp_events')) {
                setUpcomingRSVP(getUserRSVPEvents(userKey));
            }
        };

        window.addEventListener('taylors-db-updated', onDataUpdate);
        return () => window.removeEventListener('taylors-db-updated', onDataUpdate);
    }, [userKey]);

    const weekConfig = weekConfigs[selectedWeek];
    const activeSchedule = useMemo(() => buildWeekSchedule(weekConfig, weeklyData), [weekConfig, weeklyData]);
    const weekStart = new Date(`${weekConfig.startDate}T00:00:00`);

    const dayName = days[selectedDay];
    const slots = activeSchedule[dayName] || [];
    const dayDate = new Date(weekStart);
    dayDate.setDate(weekStart.getDate() + selectedDay);
    const dayDateISO = getDateISO(dayDate);

    const freeSlots = slots.filter(s => s.type === 'free');

    const slotEventMap = useMemo(() => {
        const map = {};
        const seed = weekConfig.week * 101 + selectedDay * 17;

        if (weekConfig.week === 8) {
            freeSlots.forEach((slot) => {
                map[slot.id] = events.filter((evt) => evt.date === dayDateISO && isEventWithinSlot(evt.time, slot.time));
            });
            return map;
        }

        const pool = events.filter((evt) => evt.category === 'focus' || evt.category === 'balance');
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
    }, [dayDateISO, freeSlots, selectedDay, weekConfig.week]);

    const totalMatchingEvents = Object.values(slotEventMap).reduce((sum, list) => sum + list.length, 0);

    return (
        <div className="px-5 pt-6 pb-24">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <div>
                    <h1 className="text-2xl font-outfit font-bold text-white">Schedule</h1>
                    <p className="text-sm font-inter text-gray-500">Week {weekConfig.week} • {formatWeekRange(weekConfig.startDate)}</p>
                </div>
                <div className="flex items-center gap-1">
                    <span className="relative flex h-2 w-2 mr-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-balance-accent opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-balance-accent"></span>
                    </span>
                    <span className={`text-[10px] font-inter font-medium ${timetableSynced ? 'text-balance-accent' : 'text-amber-300'}`}>
                        {timetableSynced ? 'CAMS Synced' : 'Sync Off (Local Schedule)'}
                    </span>
                </div>
            </div>

            <div className="glass rounded-2xl p-4 mb-5">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-outfit font-semibold text-white">Upcoming RSVP Events</h3>
                    <span className="text-[10px] font-inter text-gray-500">{upcomingRSVP.length} saved</span>
                </div>
                {upcomingRSVP.length === 0 ? (
                    <p className="text-[11px] font-inter text-gray-500">No upcoming signups yet. Open an event and tap RSVP.</p>
                ) : (
                    <div className="space-y-2">
                        {upcomingRSVP.slice(0, 6).map((item) => {
                            const linkedEvent = events.find((evt) => String(evt.id) === String(item.eventId));
                            const clickEvent = linkedEvent || item;
                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => onEventClick?.(clickEvent)}
                                    className="w-full text-left rounded-xl border border-white/10 bg-white/5 px-3 py-2 hover:bg-white/10 transition-colors"
                                >
                                    <p className="text-xs font-outfit font-semibold text-white truncate">{item.title}</p>
                                    <p className="text-[10px] font-inter text-gray-500 truncate">{item.host} • {item.date || 'TBD'} • {item.time || 'TBD'}</p>
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
                    <p className="text-[10px] font-inter text-gray-500 uppercase tracking-wider">Academic Timeline</p>
                    <p className="text-sm font-outfit font-semibold text-white">Week {weekConfig.week}</p>
                </div>
                <button
                    onClick={() => setSelectedWeek((prev) => Math.min(weekConfigs.length - 1, prev + 1))}
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
                    const hasFreeSlot = (activeSchedule[day] || []).some(s => s.type === 'free');

                    return (
                        <motion.button
                            key={day}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setSelectedDay(index)}
                            className={`flex-1 py-3 rounded-xl flex flex-col items-center gap-1 transition-all duration-300 relative ${isActive
                                    ? 'bg-gradient-to-b from-taylor-red to-taylor-red-dark text-white shadow-glow-red'
                                    : 'glass text-gray-500 hover:text-gray-300'
                                }`}
                        >
                            <span className="text-[10px] font-inter font-medium uppercase">{dayShort}</span>
                            <span className={`text-sm font-outfit font-bold ${isActive ? 'text-white' : 'text-gray-300'}`}>
                                {dayDate.getDate()}
                            </span>
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
                    {slots.map((slot, index) => {
                        const isFree = slot.type === 'free';
                        const startTime = slot.time.split(' - ')[0];
                        const endTime = slot.time.split(' - ')[1];

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
                                    <div className={`w-3 h-3 rounded-full border-2 z-10 ${isFree
                                            ? 'bg-balance-accent border-balance-accent shadow-glow-green'
                                            : 'bg-[#0a0a12] border-white/20'
                                        }`} />
                                    <span className="text-[9px] font-inter text-gray-600 mt-1">{startTime}</span>
                                </div>

                                {/* Slot card */}
                                <div className={`flex-1 rounded-xl p-4 transition-all duration-300 ${isFree
                                        ? 'bg-gradient-to-r from-balance-accent/10 to-balance-accent/5 border border-balance-accent/20'
                                        : 'glass'
                                    }`}>
                                    <div className="flex items-center justify-between mb-1">
                                        <h3 className={`text-sm font-outfit font-semibold ${isFree ? 'text-balance-accent' : 'text-white'
                                            }`}>
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
                                                    AI found {matchingEvents.length} events for this slot
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
                                                            {evt.match_score || '—'} Match
                                                        </p>
                                                        <p className="text-[10px] font-outfit font-semibold text-white truncate">
                                                            {evt.title}
                                                        </p>
                                                        <p className="text-[9px] font-inter text-gray-500">{evt.host}</p>
                                                        <p className="text-[8px] font-inter text-gray-500">{evt.time || 'TBD'}</p>
                                                        <p className="text-[8px] font-inter text-gray-600 truncate mt-0.5">{evt.description}</p>
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
                            {freeSlots.length} Free Slot{freeSlots.length !== 1 ? 's' : ''} Today
                        </h3>
                        <p className="text-[11px] font-inter text-gray-500">
                            {freeSlots.length > 0
                                ? `${totalMatchingEvents} matched events available`
                                : 'No free time detected — all slots booked'}
                        </p>
                    </div>
                    <div className={`px-3 py-1.5 rounded-lg text-[10px] font-inter font-bold ${freeSlots.length > 0
                            ? 'bg-balance-accent/10 text-balance-accent border border-balance-accent/20'
                            : 'bg-white/5 text-gray-500'
                        }`}>
                        {freeSlots.length > 0 ? '🟢 Available' : '🔴 Full Day'}
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
