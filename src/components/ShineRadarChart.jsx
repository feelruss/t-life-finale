import { motion } from 'framer-motion';
import { currentUser, tgcDefinitions, shineDefinitions } from '../data/students';
import { useState } from 'react';

// SVG Radar Chart for TGC Progress
function RadarChart({ data, definitions, size = 280 }) {
    const keys = Object.keys(data);
    const count = keys.length;
    const center = size / 2;
    const radius = size / 2 - 40;
    const angleStep = (2 * Math.PI) / count;

    const getPoint = (index, value) => {
        const angle = angleStep * index - Math.PI / 2;
        const r = (value / 100) * radius;
        return {
            x: center + r * Math.cos(angle),
            y: center + r * Math.sin(angle),
        };
    };

    // Background grid rings
    const rings = [25, 50, 75, 100];

    // Data polygon points
    const dataPoints = keys.map((key, i) => getPoint(i, data[key]));
    const dataPath = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto">
            {/* Background rings */}
            {rings.map((ring) => {
                const ringPoints = keys.map((_, i) => getPoint(i, ring));
                const ringPath = ringPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';
                return (
                    <path
                        key={ring}
                        d={ringPath}
                        fill="none"
                        stroke="rgba(255,255,255,0.06)"
                        strokeWidth="1"
                    />
                );
            })}

            {/* Axis lines */}
            {keys.map((_, i) => {
                const endpoint = getPoint(i, 100);
                return (
                    <line
                        key={i}
                        x1={center}
                        y1={center}
                        x2={endpoint.x}
                        y2={endpoint.y}
                        stroke="rgba(255,255,255,0.06)"
                        strokeWidth="1"
                    />
                );
            })}

            {/* Data polygon */}
            <motion.path
                d={dataPath}
                fill="rgba(226, 24, 54, 0.15)"
                stroke="#E31837"
                strokeWidth="2"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                style={{ transformOrigin: `${center}px ${center}px` }}
            />

            {/* Data points */}
            {dataPoints.map((p, i) => (
                <motion.circle
                    key={i}
                    cx={p.x}
                    cy={p.y}
                    r="4"
                    fill={definitions[keys[i]]?.color || '#E31837'}
                    stroke="#050508"
                    strokeWidth="2"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3 + i * 0.08 }}
                />
            ))}

            {/* Labels */}
            {keys.map((key, i) => {
                const labelPoint = getPoint(i, 120);
                const def = definitions[key];
                return (
                    <text
                        key={key}
                        x={labelPoint.x}
                        y={labelPoint.y}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="fill-gray-400 text-[9px] font-inter"
                    >
                        {def?.icon} {def?.label?.split(' ')[0]}
                    </text>
                );
            })}
        </svg>
    );
}

// SHINE Progress Ring
function ShineRing({ label, icon, current, required, color }) {
    const percentage = (current / required) * 100;
    const circumference = 2 * Math.PI * 18;
    const dashOffset = circumference - (percentage / 100) * circumference;
    const isComplete = current >= required;

    return (
        <div className="flex flex-col items-center gap-1.5">
            <div className="relative">
                <svg width="48" height="48" viewBox="0 0 48 48">
                    <circle cx="24" cy="24" r="18" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
                    <motion.circle
                        cx="24" cy="24" r="18"
                        fill="none"
                        stroke={isComplete ? color : color + '99'}
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        initial={{ strokeDashoffset: circumference }}
                        animate={{ strokeDashoffset: dashOffset }}
                        transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
                        transform="rotate(-90 24 24)"
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm">{isComplete ? '✅' : icon}</span>
                </div>
            </div>
            <span className="text-[9px] font-inter text-gray-400 font-medium text-center leading-tight">{label}</span>
            <span className="text-[10px] font-inter font-bold" style={{ color }}>
                {current}/{required}
            </span>
        </div>
    );
}

export default function ShineRadarChart() {
    const [activeTab, setActiveTab] = useState('tgc'); // 'tgc' | 'shine'
    const user = currentUser;

    return (
        <div className="px-5 py-4">
            {/* Section Header */}
            <div className="flex items-center gap-2 mb-3">
                <div className="w-1.5 h-1.5 rounded-full bg-yellow-500"></div>
                <p className="text-[11px] font-inter font-medium text-gray-400 uppercase tracking-widest">
                    Growth & Achievements
                </p>
            </div>

            {/* Tab Toggle */}
            <div className="flex gap-2 mb-4">
                <button
                    onClick={() => setActiveTab('tgc')}
                    className={`flex-1 py-2 rounded-xl text-xs font-outfit font-semibold transition-all duration-300 ${activeTab === 'tgc'
                            ? 'bg-taylor-red/20 text-taylor-red border border-taylor-red/30'
                            : 'glass text-gray-500 hover:text-gray-300'
                        }`}
                >
                    📊 TGC Progress
                </button>
                <button
                    onClick={() => setActiveTab('shine')}
                    className={`flex-1 py-2 rounded-xl text-xs font-outfit font-semibold transition-all duration-300 ${activeTab === 'shine'
                            ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30'
                            : 'glass text-gray-500 hover:text-gray-300'
                        }`}
                >
                    ⭐ SHINE Award
                </button>
            </div>

            {/* TGC Radar */}
            {activeTab === 'tgc' && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <div className="glass rounded-2xl p-4">
                        <RadarChart data={user.tgcProgress} definitions={tgcDefinitions} />
                        {/* TGC Detail Grid */}
                        <div className="grid grid-cols-2 gap-2 mt-4">
                            {Object.entries(tgcDefinitions).map(([key, def]) => (
                                <div key={key} className="flex items-center gap-2 p-2 rounded-lg bg-white/3">
                                    <span className="text-sm">{def.icon}</span>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-inter text-gray-400 truncate">{def.label}</span>
                                            <span className="text-[10px] font-inter font-bold" style={{ color: def.color }}>
                                                {user.tgcProgress[key]}%
                                            </span>
                                        </div>
                                        <div className="w-full h-1 bg-white/5 rounded-full mt-1">
                                            <motion.div
                                                className="h-full rounded-full"
                                                style={{ backgroundColor: def.color }}
                                                initial={{ width: 0 }}
                                                animate={{ width: `${user.tgcProgress[key]}%` }}
                                                transition={{ duration: 0.8, delay: 0.2 }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>
            )}

            {/* SHINE Award */}
            {activeTab === 'shine' && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <div className="glass rounded-2xl p-5">
                        {/* Overall Progress */}
                        <div className="text-center mb-5">
                            <h3 className="text-lg font-outfit font-bold text-white mb-1">SHINE Award Progress</h3>
                            <p className="text-[11px] font-inter text-gray-500">
                                Complete all 5 categories to earn your SHINE Award badge
                            </p>
                            {(() => {
                                const completed = Object.entries(user.shineProgress).filter(
                                    ([key]) => user.shineProgress[key] >= shineDefinitions[key].required
                                ).length;
                                return (
                                    <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20">
                                        <span className="text-[11px] font-bold text-yellow-500">
                                            {completed}/5 Categories Complete
                                        </span>
                                    </div>
                                );
                            })()}
                        </div>

                        {/* SHINE Rings */}
                        <div className="flex justify-between px-2">
                            {Object.entries(shineDefinitions).map(([key, def]) => (
                                <ShineRing
                                    key={key}
                                    label={def.label}
                                    icon={def.icon}
                                    current={user.shineProgress[key]}
                                    required={def.required}
                                    color={def.color}
                                />
                            ))}
                        </div>

                        {/* SHINE Detail List */}
                        <div className="mt-5 space-y-2">
                            {Object.entries(shineDefinitions).map(([key, def]) => {
                                const current = user.shineProgress[key];
                                const isComplete = current >= def.required;
                                return (
                                    <div
                                        key={key}
                                        className={`flex items-center justify-between p-3 rounded-xl ${isComplete ? 'bg-green-500/5 border border-green-500/20' : 'bg-white/3'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-lg">{def.icon}</span>
                                            <div>
                                                <p className="text-xs font-outfit font-semibold text-white">{def.label}</p>
                                                <p className="text-[10px] font-inter text-gray-500">{def.description}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            {isComplete ? (
                                                <span className="text-[10px] font-bold text-green-400">✅ Done</span>
                                            ) : (
                                                <span className="text-[10px] font-bold text-gray-400">
                                                    {def.required - current} more
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </motion.div>
            )}
        </div>
    );
}
