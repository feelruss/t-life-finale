import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { events } from '../data/events';
import {
    CodeBracketIcon,
    ShieldCheckIcon,
    BeakerIcon,
    HeartIcon,
    UserGroupIcon
} from '@heroicons/react/24/outline';
import { getEventPreferences, setEventHidden, setEventInterested, getEventCheckIns } from '../data/db';

const iconMap = {
    CodeBracketIcon: CodeBracketIcon,
    ShieldCheckIcon: ShieldCheckIcon,
    BeakerIcon: BeakerIcon,
    HeartIcon: HeartIcon,
    UserGroupIcon: UserGroupIcon,
};

export default function EventFeed({ mode, onCheckIn, onEventClick, userKey = 'guest' }) {
    const category = mode || 'focus';
    const filteredEvents = useMemo(() => events.filter((e) => e.category === category), [category]);
    const [preferences, setPreferences] = useState(() => getEventPreferences(userKey));
    const [checkIns, setCheckIns] = useState(() => getEventCheckIns(userKey));
    const [lastHidden, setLastHidden] = useState(null);
    const [undoTimer, setUndoTimer] = useState(null);
    const isFocus = category === 'focus';
    const hiddenEvents = preferences.hidden || [];
    const interestedEvents = preferences.interested || [];
    const checkedEventIds = new Set(checkIns.map((entry) => String(entry.eventId)));

    useEffect(() => {
        setPreferences(getEventPreferences(userKey));
        setCheckIns(getEventCheckIns(userKey));
    }, [userKey]);

    useEffect(() => {
        const onDataUpdate = (evt) => {
            const updatedKey = String(evt?.detail?.key || '');
            if (updatedKey.startsWith('taylors_event_preferences') || updatedKey.startsWith('taylors_event_checkins')) {
                setPreferences(getEventPreferences(userKey));
                setCheckIns(getEventCheckIns(userKey));
            }
        };

        window.addEventListener('taylors-db-updated', onDataUpdate);
        return () => window.removeEventListener('taylors-db-updated', onDataUpdate);
    }, [userKey]);

    const visibleEvents = useMemo(() => {
        const interestedSet = new Set(interestedEvents.map((id) => String(id)));
        const hiddenSet = new Set(hiddenEvents.map((id) => String(id)));
        const source = filteredEvents.filter((event) => !hiddenSet.has(String(event.id)));
        const interestedSource = filteredEvents.filter((event) => interestedSet.has(String(event.id)));

        const scoreEvent = (candidate) => {
            if (interestedSet.has(String(candidate.id))) return 1000;
            let score = 0;

            interestedSource.forEach((seed) => {
                if (String(seed.id) === String(candidate.id)) return;
                if (seed.tag && candidate.tag && seed.tag === candidate.tag) score += 3;
                if (seed.host && candidate.host && seed.host === candidate.host) score += 2;

                const seedTags = seed.tgcTags || [];
                const candidateTags = candidate.tgcTags || [];
                const shared = seedTags.filter((tag) => candidateTags.includes(tag)).length;
                score += shared * 2;
            });

            const matchValue = Number(String(candidate.match_score || '0').replace('%', '')) || 0;
            return score + matchValue / 100;
        };

        return [...source].sort((a, b) => scoreEvent(b) - scoreEvent(a));
    }, [filteredEvents, hiddenEvents, interestedEvents]);

    useEffect(() => {
        return () => {
            if (undoTimer) clearTimeout(undoTimer);
        };
    }, [undoTimer]);

    const handleToggleInterested = (eventId) => {
        const normalizedId = String(eventId);
        const isInterested = interestedEvents.some((id) => String(id) === normalizedId);
        setEventInterested(eventId, !isInterested, userKey);
        setPreferences(getEventPreferences(userKey));
    };

    const handleNotInterested = (eventId) => {
        setEventHidden(String(eventId), true, userKey);
        setPreferences(getEventPreferences(userKey));
        setLastHidden(eventId);
        if (undoTimer) clearTimeout(undoTimer);
        const t = setTimeout(() => setLastHidden(null), 5000);
        setUndoTimer(t);
    };

    const matchMath = (event) => {
        const b = event.match_breakdown || {};
        const i = Number(b.interest || 0);
        const s = Number(b.schedule || 0);
        const p = Number(b.proximity || 0);
        const so = Number(b.social || 0);
        const weighted = (i * 0.4) + (s * 0.3) + (p * 0.2) + (so * 0.1);
        return {
            interest: i,
            schedule: s,
            social: so,
            score: Math.round(weighted),
        };
    };

    return (
        <div className="px-5 pb-8">
            {/* Section Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <motion.div
                        animate={{
                            backgroundColor: isFocus ? '#FF3B5C' : '#4EEAAF',
                        }}
                        className="w-1.5 h-1.5 rounded-full"
                    />
                    <p className={`text-[11px] font-inter font-medium uppercase tracking-widest ${isFocus ? 'text-red-100' : 'text-teal-100'}`}>
                        {isFocus ? 'High-Intensity Matches' : 'Holistic Suggestions'}
                    </p>
                </div>
                <p className={isFocus ? 'text-[11px] font-inter text-red-200' : 'text-[11px] font-inter text-teal-200'}>
                    {visibleEvents.length} events
                </p>
            </div>

            {/* Event Cards */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={mode}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.35, ease: 'easeInOut' }}
                    className="flex flex-col gap-3"
                >
                    {visibleEvents.length > 0 ? (
                        visibleEvents.map((event, index) => {
                            const IconComponent = iconMap[event.icon];
                            const math = matchMath(event);

                            return (
                                <motion.div
                                    key={event.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.4, delay: index * 0.08 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => onEventClick?.(event)}
                                    className="group relative rounded-2xl glass overflow-hidden cursor-pointer transition-all duration-300 hover:border-white/10"
                                >
                                    {/* Accent Left Border */}
                                    <div
                                        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
                                        style={{ backgroundColor: isFocus ? '#E21836' : '#10B981' }}
                                    />

                                    <div className="p-4 pl-5">
                                        {/* Top Metadata Row */}
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className={`text-[10px] font-inter font-bold px-2 py-0.5 rounded border ${checkedEventIds.has(String(event.id)) ? 'bg-amber-500/15 text-amber-300 border-amber-400/30' : 'bg-white/5 text-gray-400 border-white/10'}`}>
                                                    {checkedEventIds.has(String(event.id)) ? 'Checked In' : 'Not Checked In'}
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

                                        {/* Title & Host */}
                                        <div className="mb-2">
                                            <h3 className={`text-[15px] font-outfit font-semibold leading-tight mb-0.5 transition-colors ${isFocus ? 'text-red-50 group-hover:text-white' : 'text-teal-50 group-hover:text-white'}`}>
                                                {event.title}
                                            </h3>
                                            <p className={isFocus ? 'text-[11px] font-inter text-red-200' : 'text-[11px] font-inter text-teal-200'}>
                                                by <span className={isFocus ? 'text-red-50' : 'text-teal-50'}>{event.host}</span>
                                            </p>
                                        </div>

                                        {/* Description */}
                                        <p className={isFocus ? 'text-xs font-inter text-red-100 leading-relaxed mb-3 line-clamp-2' : 'text-xs font-inter text-teal-100 leading-relaxed mb-3 line-clamp-2'}>
                                            {event.description}
                                        </p>

                                        <div className="mb-3 rounded-lg bg-white/5 border border-white/10 px-3 py-2">
                                            <p className="text-[10px] font-inter text-gray-400">Why this matches you</p>
                                            <div className="mt-1 flex flex-wrap gap-2">
                                                <span className="text-[10px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded px-2 py-0.5">Interest {math.interest}%</span>
                                                <span className="text-[10px] text-blue-300 bg-blue-500/10 border border-blue-500/20 rounded px-2 py-0.5">Schedule {math.schedule}%</span>
                                                <span className="text-[10px] text-purple-300 bg-purple-500/10 border border-purple-500/20 rounded px-2 py-0.5">Social {math.social}%</span>
                                            </div>
                                        </div>

                                        {/* Bottom Meta Row */}
                                        <div className="flex items-stretch justify-between border-t border-white/5 pt-3 mt-1 gap-3">
                                            {/* Check-in Button - Left */}
                                            <button
                                                className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-colors flex items-center gap-1.5 border active:scale-95 ${checkedEventIds.has(String(event.id))
                                                    ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border-amber-400/30'
                                                    : 'bg-white/10 hover:bg-white/20 text-white border-white/5'
                                                    }`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                        onCheckIn?.(event);
                                                }}
                                            >
                                                <span className={`w-1.5 h-1.5 rounded-full ${checkedEventIds.has(String(event.id)) ? 'bg-amber-300' : 'bg-green-400 animate-pulse'}`}></span>
                                                {checkedEventIds.has(String(event.id)) ? 'Uncheck-in' : 'Check-in'}
                                            </button>

                                            {/* Right Side Stack */}
                                            <div className="flex flex-col items-end gap-1">
                                                <button
                                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-colors border active:scale-95 ${interestedEvents.some((id) => String(id) === String(event.id))
                                                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
                                                        : 'bg-white/10 hover:bg-white/20 text-gray-200 border-white/5'
                                                        }`}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleToggleInterested(event.id);
                                                    }}
                                                >
                                                    {interestedEvents.some((id) => String(id) === String(event.id)) ? 'Interested ✓' : 'Interested'}
                                                </button>

                                                {/* Not Interested Button - Below */}
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
                                    </div>

                                    {/* Shimmer */}
                                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 shimmer pointer-events-none" />
                                </motion.div>
                            );
                        })
                    ) : (
                        <div className="rounded-2xl glass p-6 text-center text-gray-400">
                            <p className="text-sm font-semibold text-white mb-2">Nothing here yet</p>
                            <p className="text-xs">Try switching to the other mode or refresh your recommendations.</p>
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
                            onClick={() => {
                                setEventHidden(String(lastHidden), false, userKey);
                                setPreferences(getEventPreferences(userKey));
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
