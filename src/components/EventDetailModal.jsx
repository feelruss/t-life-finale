import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { X, MapPin, Clock, Users, Calendar } from 'lucide-react';

export default function EventDetailModal({ event, isOpen, onClose, onCheckIn, onRSVP }) {
    const [isRSVPd, setIsRSVPd] = useState(event?.isRSVPd || false);

    useEffect(() => {
        setIsRSVPd(event?.isRSVPd || false);
    }, [event?.id, event?.isRSVPd]);

    if (!event || !isOpen) return null;

    const matchBreakdown = event.match_breakdown || {};
    const interest = Number(matchBreakdown.interest || 0);
    const schedule = Number(matchBreakdown.schedule || 0);
    const proximity = Number(matchBreakdown.proximity || 0);
    const social = Number(matchBreakdown.social || 0);
    const weightedScore = (interest * 0.4) + (schedule * 0.3) + (proximity * 0.2) + (social * 0.1);
    const capacityPercent = event.capacity ? Math.round((event.registered / event.capacity) * 100) : 0;
    const isFull = capacityPercent >= 100;

    const handleRSVP = () => {
        setIsRSVPd(!isRSVPd);
        onRSVP?.(event);
    };

    const handleCheckIn = () => {
        onCheckIn?.(event);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100]"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, y: '100%' }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                        className="fixed bottom-0 left-0 right-0 z-[101] max-w-[430px] mx-auto"
                    >
                        <div className="bg-[#0a0a12] rounded-t-3xl border-t border-x border-white/10 max-h-[85vh] overflow-y-auto hide-scrollbar">
                            {/* Drag Handle */}
                            <div className="flex justify-center pt-3 pb-2 sticky top-0 bg-[#0a0a12] z-10">
                                <div className="w-10 h-1 rounded-full bg-white/20" />
                            </div>

                            {/* Header */}
                            <div className="px-5 pb-4">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1">
                                        {/* Match Score Badge */}
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-[11px] font-inter font-bold bg-green-500/10 text-green-400 px-2.5 py-1 rounded-lg border border-green-500/20">
                                                {event.match_score} Match
                                            </span>
                                            <span className="text-[11px] font-inter text-gray-500 px-2 py-1 rounded-lg bg-white/5">
                                                {event.tag}
                                            </span>
                                            {event.zone && (
                                                <span className="text-[11px] font-inter text-gray-500 px-2 py-1 rounded-lg bg-white/5 flex items-center gap-1">
                                                    <MapPin size={10} /> {event.zone}
                                                </span>
                                            )}
                                        </div>
                                        <h2 className="text-xl font-outfit font-bold text-white leading-tight">
                                            {event.title}
                                        </h2>
                                        <p className="text-sm font-inter text-gray-400 mt-1">
                                            by <span className="text-gray-300">{event.host}</span>
                                        </p>
                                    </div>
                                    <button
                                        onClick={onClose}
                                        className="p-2 rounded-xl glass hover:bg-white/10 transition-colors ml-3"
                                    >
                                        <X size={18} className="text-gray-400" />
                                    </button>
                                </div>

                                {/* Quick Info */}
                                <div className="grid grid-cols-3 gap-2 mb-4">
                                    <div className="glass rounded-xl p-3 text-center">
                                        <Clock size={14} className="text-gray-400 mx-auto mb-1" />
                                        <p className="text-[10px] font-inter text-gray-500">Time</p>
                                        <p className="text-xs font-outfit font-semibold text-white">{event.time}</p>
                                    </div>
                                    <div className="glass rounded-xl p-3 text-center">
                                        <Calendar size={14} className="text-gray-400 mx-auto mb-1" />
                                        <p className="text-[10px] font-inter text-gray-500">Date</p>
                                        <p className="text-xs font-outfit font-semibold text-white">
                                            {new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        </p>
                                    </div>
                                    <div className="glass rounded-xl p-3 text-center">
                                        <Users size={14} className="text-gray-400 mx-auto mb-1" />
                                        <p className="text-[10px] font-inter text-gray-500">Spots</p>
                                        <p className="text-xs font-outfit font-semibold text-white">
                                            {event.registered}/{event.capacity}
                                        </p>
                                    </div>
                                </div>

                                {/* Capacity Bar */}
                                <div className="mb-4">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[10px] font-inter text-gray-500">Capacity</span>
                                        <span className={`text-[10px] font-inter font-bold ${isFull ? 'text-red-400' : capacityPercent > 80 ? 'text-yellow-400' : 'text-green-400'}`}>
                                            {isFull ? 'FULL' : `${capacityPercent}% filled`}
                                        </span>
                                    </div>
                                    <div className="w-full h-1.5 bg-white/5 rounded-full">
                                        <motion.div
                                            className={`h-full rounded-full ${isFull ? 'bg-red-500' : capacityPercent > 80 ? 'bg-yellow-500' : 'bg-green-500'}`}
                                            initial={{ width: 0 }}
                                            animate={{ width: `${Math.min(capacityPercent, 100)}%` }}
                                            transition={{ duration: 0.8 }}
                                        />
                                    </div>
                                </div>

                                {/* Description */}
                                <div className="mb-4">
                                    <h3 className="text-xs font-outfit font-semibold text-gray-300 mb-2">About</h3>
                                    <p className="text-sm font-inter text-gray-400 leading-relaxed">{event.description}</p>
                                </div>

                                {/* Match Score Breakdown */}
                                <div className="mb-4">
                                    <h3 className="text-xs font-outfit font-semibold text-gray-300 mb-2">Why this event matches you</h3>
                                    <div className="glass rounded-xl p-3">
                                        <div className="flex items-center justify-between">
                                            <p className="text-[11px] font-inter text-gray-400">Overall Match Score</p>
                                            <p className="text-lg font-outfit font-bold text-emerald-300">{Math.round(weightedScore)}%</p>
                                        </div>
                                        <div className="mt-3 grid grid-cols-2 gap-2">
                                            <div className="rounded-lg bg-white/5 border border-white/10 px-2.5 py-2">
                                                <p className="text-[10px] text-gray-500">Interest Fit</p>
                                                <p className="text-sm font-semibold text-white">{interest}%</p>
                                            </div>
                                            <div className="rounded-lg bg-white/5 border border-white/10 px-2.5 py-2">
                                                <p className="text-[10px] text-gray-500">Schedule Fit</p>
                                                <p className="text-sm font-semibold text-white">{schedule}%</p>
                                            </div>
                                            <div className="rounded-lg bg-white/5 border border-white/10 px-2.5 py-2">
                                                <p className="text-[10px] text-gray-500">Location Fit</p>
                                                <p className="text-sm font-semibold text-white">{proximity}%</p>
                                            </div>
                                            <div className="rounded-lg bg-white/5 border border-white/10 px-2.5 py-2">
                                                <p className="text-[10px] text-gray-500">Social Fit</p>
                                                <p className="text-sm font-semibold text-white">{social}%</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Accessibility */}
                                {event.accessibility?.length > 0 && (
                                    <div className="mb-6">
                                        <h3 className="text-xs font-outfit font-semibold text-gray-300 mb-2">Accessibility</h3>
                                        <div className="flex gap-2">
                                            {event.accessibility.map((tag) => {
                                                const labels = {
                                                    wheelchair: { icon: '♿', label: 'Wheelchair Accessible' },
                                                    wifi: { icon: '📶', label: 'Free WiFi' },
                                                    'sign-language': { icon: '🤟', label: 'Sign Language' },
                                                };
                                                const info = labels[tag];
                                                return (
                                                    <span
                                                        key={tag}
                                                        className="text-[10px] font-inter text-gray-400 px-2 py-1 rounded-lg bg-white/5 flex items-center gap-1"
                                                    >
                                                        {info?.icon} {info?.label}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <div className="flex gap-3 pb-6">
                                    <motion.button
                                        whileTap={{ scale: 0.95 }}
                                        onClick={handleRSVP}
                                        className={`flex-1 py-3.5 rounded-xl font-outfit font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-300 ${isRSVPd
                                            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                            : isFull
                                                ? 'bg-gray-500/20 text-gray-400 border border-gray-500/30 cursor-not-allowed'
                                                : 'bg-gradient-to-r from-taylor-red to-taylor-red-light text-white shadow-glow-red'
                                            }`}
                                        disabled={isFull && !isRSVPd}
                                    >
                                        {isRSVPd ? '✅ RSVP Confirmed' : isFull ? 'Event Full' : '🚀 RSVP Now'}
                                    </motion.button>
                                    <motion.button
                                        whileTap={{ scale: 0.95 }}
                                        onClick={handleCheckIn}
                                        className="px-4 py-3.5 rounded-xl glass hover:bg-white/10 transition-colors flex items-center gap-2"
                                    >
                                        <span className="text-xs font-outfit font-semibold text-gray-300">Check-in</span>
                                    </motion.button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
