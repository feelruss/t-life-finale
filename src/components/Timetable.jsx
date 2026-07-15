import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { timetable } from '../data/events';

export default function Timetable({ mode = 'focus', timetableData = timetable }) {
    const isFocus = mode === 'focus';
    const currentDateLabel = useMemo(() => (
        new Date().toLocaleDateString('en-US', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
        })
    ), []);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className={`sticky top-0 z-30 backdrop-blur-xl px-5 py-3 ${isFocus ? 'bg-[#2a090f]/90 border-b border-taylor-red/20' : 'bg-[#081916]/90 border-b border-balance-accent/20'}`}
        >
            {/* Section Label */}
            <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${isFocus ? 'bg-taylor-red' : 'bg-balance-accent'}`}></div>
                    <p className={`text-[11px] font-inter font-medium uppercase tracking-widest ${isFocus ? 'text-red-100' : 'text-teal-100'}`}>
                        Today's Schedule
                    </p>
                </div>
                <p className={isFocus ? 'text-[11px] font-inter text-red-200' : 'text-[11px] font-inter text-teal-200'}>
                    {currentDateLabel}
                </p>
            </div>

            {/* Scrollable Timeline */}
            <div className="flex gap-2.5 overflow-x-auto hide-scrollbar pb-1">
                {timetableData.map((block, index) => (
                    <motion.div
                        key={block.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, delay: 0.1 * index }}
                        className={`flex-shrink-0 rounded-xl px-4 py-3 min-w-[170px] transition-all duration-300 ${block.type === 'free'
                            ? 'bg-gradient-to-br from-balance-accent/15 to-balance-accent/5 border border-balance-accent/25 shadow-glow-green'
                                    : 'glass hover:bg-white/5'
                            }`}
                    >
                        <p className={`text-[10px] font-inter font-semibold uppercase tracking-wider mb-1 ${block.type === 'free' ? 'text-balance-accent' : 'text-gray-500'
                            }`}>
                            {block.time.split(' - ')[0]} – {block.time.split(' - ')[1]}
                        </p>
                        <p className={`text-sm font-outfit font-semibold leading-tight ${block.type === 'free' ? 'text-balance-accent' : isFocus ? 'text-red-50' : 'text-teal-50'
                            }`}>
                            {block.subject}
                        </p>
                        {block.room && (
                            <p className={isFocus ? 'text-[10px] font-inter text-red-200 mt-1' : 'text-[10px] font-inter text-teal-200 mt-1'}>{block.room}</p>
                        )}
                        {block.type === 'free' && (
                            <div className="flex items-center gap-1.5 mt-1.5">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-balance-accent opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-balance-accent"></span>
                                </span>
                                <p className="text-[10px] font-inter text-balance-accent/90">Searching...</p>
                            </div>
                        )}
                    </motion.div>
                ))}
            </div>
        </motion.div>
    );
}
