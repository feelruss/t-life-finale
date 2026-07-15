import { motion } from 'framer-motion';

export default function ModeToggle({ mode, onToggle }) {
    const isFocus = mode === 'focus';

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="px-5 py-5"
        >
            {/* Toggle Label */}
            <div className="text-center mb-3">
                <p className={`text-[11px] font-inter font-medium uppercase tracking-widest ${isFocus ? 'text-red-200' : 'text-teal-200'}`}>
                    Algorithm Mode
                </p>
            </div>

            {/* Toggle Container */}
            <div
                className="relative w-full max-w-[320px] mx-auto h-14 rounded-2xl glass-strong cursor-pointer overflow-hidden"
                onClick={onToggle}
            >
                {/* Animated Background Slider */}
                <motion.div
                    className="absolute top-1.5 bottom-1.5 rounded-xl w-[calc(50%-6px)]"
                    animate={{
                        x: isFocus ? 6 : 'calc(100% + 6px)',
                        background: isFocus
                            ? 'linear-gradient(135deg, #7a1020, #e21836)'
                            : 'linear-gradient(135deg, #2ED8A3, #4EEAAF)',
                        boxShadow: isFocus
                            ? '0 4px 20px rgba(226, 24, 54, 0.35)'
                            : '0 4px 20px rgba(78, 234, 175, 0.4)',
                    }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />

                {/* Labels */}
                <div className="relative z-10 flex items-center h-full">
                    <motion.button
                        className="flex-1 flex items-center justify-center gap-2 h-full text-sm font-outfit font-semibold transition-colors duration-300"
                        animate={{ color: isFocus ? '#FFFFFF' : '#6B7280' }}
                    >
                        <motion.span
                            animate={{ scale: isFocus ? 1.1 : 1 }}
                            transition={{ type: 'spring', stiffness: 400 }}
                        >
                            ⚡
                        </motion.span>
                        Focus
                    </motion.button>
                    <motion.button
                        className="flex-1 flex items-center justify-center gap-2 h-full text-sm font-outfit font-semibold transition-colors duration-300"
                        animate={{ color: !isFocus ? '#FFFFFF' : '#6B7280' }}
                    >
                        <motion.span
                            animate={{ scale: !isFocus ? 1.1 : 1 }}
                            transition={{ type: 'spring', stiffness: 400 }}
                        >
                            🌿
                        </motion.span>
                        Balance
                    </motion.button>
                </div>
            </div>

            {/* Mode Description */}
            <motion.p
                key={mode}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`text-center text-xs font-inter mt-3 ${isFocus ? 'text-red-100/90' : 'text-teal-100/90'}`}
            >
                {isFocus
                    ? 'Showing high-intensity events & competitions'
                    : 'Showing wellness & social events for your free slot'}
            </motion.p>
        </motion.div>
    );
}
