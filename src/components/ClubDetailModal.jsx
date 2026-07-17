// This is the src/components/ClubDetailModal.jsx file
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Clock, MapPin, Repeat, Mail } from 'lucide-react';

export default function ClubDetailModal({ club, isOpen, onClose }) {
    if (!club || !isOpen) return null;

    const events = club.upcomingEvents || [];

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100]"
                    />

                    <motion.div
                        initial={{ opacity: 0, y: '100%' }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                        className="fixed bottom-0 left-0 right-0 z-[101] max-w-[430px] mx-auto"
                    >
                        <div className="bg-[#0a0a12] rounded-t-3xl border-t border-x border-white/10 max-h-[85vh] overflow-y-auto hide-scrollbar">
                            <div className="flex justify-center pt-3 pb-2 sticky top-0 bg-[#0a0a12] z-10">
                                <div className="w-10 h-1 rounded-full bg-white/20" />
                            </div>

                            <div className="px-5 pb-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-[11px] font-inter text-gray-500 px-2 py-1 rounded-lg bg-white/5">
                                                {club.category}
                                            </span>
                                            <span className="text-[11px] font-inter text-gray-500 px-2 py-1 rounded-lg bg-white/5">
                                                {club.members} Members
                                            </span>
                                        </div>
                                        <h2 className="text-xl font-outfit font-bold text-white leading-tight">
                                            {club.name}
                                        </h2>
                                        <p className="text-sm font-inter text-gray-400 mt-1">{club.description}</p>
                                    </div>

                                    <button
                                        onClick={onClose}
                                        className="p-2 rounded-xl glass hover:bg-white/10 transition-colors ml-3"
                                    >
                                        <X size={18} className="text-gray-400" />
                                    </button>
                                </div>

                                <div className="glass rounded-xl p-4 mb-4 space-y-2.5">
                                    <div className="flex items-center gap-2 text-[12px] font-inter text-gray-300">
                                        <Calendar size={14} className="text-gray-400" />
                                        <span>{club.meetingDay || 'TBA'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[12px] font-inter text-gray-300">
                                        <Clock size={14} className="text-gray-400" />
                                        <span>{club.meetingTime || 'TBA'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[12px] font-inter text-gray-300">
                                        <MapPin size={14} className="text-gray-400" />
                                        <span>{club.meetingLocation || 'TBA'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[12px] font-inter text-gray-300">
                                        <Repeat size={14} className="text-gray-400" />
                                        <span>{club.frequency || 'Weekly'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[12px] font-inter text-gray-300">
                                        <Mail size={14} className="text-gray-400" />
                                        <span>{club.contact || 'club@taylors.edu.my'}</span>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-sm font-outfit font-semibold text-white mb-3">Upcoming Club Events</h3>
                                    {events.length > 0 ? (
                                        <div className="space-y-2.5">
                                            {events.map((evt, index) => (
                                                <motion.div
                                                    key={`${club.id}-${index}`}
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: index * 0.06 }}
                                                    className="glass rounded-xl p-3"
                                                >
                                                    <div className="flex items-center justify-between mb-1">
                                                        <p className="text-sm font-outfit font-semibold text-white">{evt.title}</p>
                                                        <span className="text-[10px] font-inter text-gray-500">
                                                            {new Date(evt.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                        </span>
                                                    </div>
                                                    <p className="text-[11px] font-inter text-gray-400">🕒 {evt.time}</p>
                                                    <p className="text-[11px] font-inter text-gray-500">📍 {evt.place}</p>
                                                </motion.div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="glass rounded-xl p-4 text-center text-gray-500 text-sm">
                                            No upcoming events yet.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
