import { motion } from 'framer-motion';

export default function LeaderboardRow({ student, index }) {
    const isTop3 = index < 3;

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`flex items-center gap-4 p-3 rounded-xl border ${student.isUser
                    ? 'bg-taylor-red/10 border-taylor-red/30'
                    : 'bg-white/5 border-white/5'
                }`}
        >
            {/* Rank */}
            <div className={`w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm ${index === 0 ? 'bg-yellow-500 text-black shadow-glow-yellow' :
                    index === 1 ? 'bg-gray-300 text-black' :
                        index === 2 ? 'bg-orange-600 text-white' :
                            'text-gray-500'
                }`}>
                {student.rank}
            </div>

            {/* Avatar */}
            <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${student.color} flex items-center justify-center text-white font-bold shadow-md`}>
                {student.avatar}
            </div>

            {/* Info */}
            <div className="flex-1">
                <h4 className={`text-sm font-semibold ${student.isUser ? 'text-taylor-red' : 'text-white'}`}>
                    {student.name} {student.isUser && '(You)'}
                </h4>
                <p className="text-[10px] text-gray-400">
                    {student.trend === 'up' && <span className="text-green-400">▲ Rising</span>}
                    {student.trend === 'down' && <span className="text-red-400">▼ Falling</span>}
                    {student.trend === 'same' && <span className="text-gray-500">- Stable</span>}
                </p>
            </div>

            {/* Points */}
            <div className="text-right">
                <span className="block text-sm font-bold text-white">{student.points}</span>
                <span className="text-[10px] text-gray-500">pts</span>
            </div>
        </motion.div>
    );
}
