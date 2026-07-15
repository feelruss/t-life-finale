import { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Check } from 'lucide-react';
import { getClubMemberships, setClubMembership } from '../data/db';
import { clubs } from '../data/clubs';

export default function ClubCard({ club, onOpen }) {
    const defaultJoinedIds = clubs.filter((item) => item.isJoined).map((item) => item.id);
    const [joined, setJoined] = useState(() => getClubMemberships(defaultJoinedIds).includes(club.id));

    const handleJoin = (e) => {
        e.stopPropagation();
        const nextJoined = !joined;
        setJoined(nextJoined);
        setClubMembership(club.id, nextJoined, defaultJoinedIds);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => onOpen?.(club)}
            className="group relative overflow-hidden rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors"
        >
            {/* Header / Banner */}
            <div className={`h-20 bg-gradient-to-r ${club.bg} p-4 flex justify-between items-start`}>
                <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-2xl shadow-lg border border-white/20">
                    {club.logo}
                </div>
                <span className="px-2 py-1 rounded-full bg-black/20 backdrop-blur-md text-[10px] font-bold text-white uppercase tracking-wider border border-white/10">
                    {club.category}
                </span>
            </div>

            {/* Content */}
            <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-bold text-white leading-tight">{club.name}</h3>
                </div>

                <p className="text-xs text-gray-400 line-clamp-2 mb-4 h-8">
                    {club.description}
                </p>

                {/* Footer Metrics & Action */}
                <div className="flex items-center justify-between mt-auto">
                    <div className="flex items-center gap-1.5 text-gray-500">
                        <Users size={14} />
                        <span className="text-xs font-medium">{club.members} Members</span>
                    </div>

                    <button
                        onClick={handleJoin}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 flex items-center gap-1.5 ${joined
                                ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                                : 'bg-white text-black hover:bg-gray-200'
                            }`}
                    >
                        {joined ? (
                            <>
                                <Check size={12} strokeWidth={3} />
                                Joined
                            </>
                        ) : (
                            'Join'
                        )}
                    </button>
                </div>
            </div>

            {/* Hover Glow */}
            <div className={`absolute inset-0 bg-gradient-to-r ${club.bg} opacity-0 group-hover:opacity-5 transition-opacity duration-300 pointer-events-none`} />
        </motion.div>
    );
}
