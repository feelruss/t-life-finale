import { motion } from 'framer-motion';
import { Shield, Bell } from 'lucide-react';

export default function Header({ points, onOpenAdmin, onNotificationClick, userRole, displayName = 'Student', unreadCount = 0 }) {
    const compactName = displayName.length > 18 ? displayName.split(' ')[0] : displayName;

    return (
        <motion.header
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="flex items-center justify-between px-5 pt-6 pb-4"
        >
            {/* Profile Section */}
            <div className="flex items-center gap-3">
                <div className="relative">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#E31837] to-[#8a1525] flex items-center justify-center text-white font-serif font-bold text-2xl shadow-glow-red border border-white/10">
                        T
                    </div>
                </div>
                <div>
                    <p className="text-xs font-inter tracking-wide uppercase text-gray-500">Taylor's University</p>
                    <div className="flex items-center gap-2">
                        <h1 className="text-base font-outfit font-semibold leading-tight text-white">
                            {compactName || 'Student'}
                        </h1>
                        <div className="px-2 py-0.5 rounded-full bg-yellow-500/20 border border-yellow-500/30 flex items-center gap-1">
                            <span className="text-[10px] font-bold text-yellow-500">💎 {points}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-2">
                {/* Admin Access Button (Hidden for Students) */}
                {userRole !== 'student' && (
                    <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={onOpenAdmin}
                        className="relative p-2.5 rounded-xl glass hover:bg-white/5 transition-colors bg-purple-500/10 border border-purple-500/20"
                    >
                        <Shield size={20} className="text-purple-400" />
                    </motion.button>
                )}

                <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={onNotificationClick}
                    className="relative p-2.5 rounded-xl transition-colors glass hover:bg-white/5"
                >
                    <Bell size={20} className="text-gray-300" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-taylor-red rounded-full flex items-center justify-center text-[9px] font-bold text-white border-2 border-[#050508]">
                            {unreadCount}
                        </span>
                    )}
                </motion.button>
            </div>
        </motion.header>
    );
}
