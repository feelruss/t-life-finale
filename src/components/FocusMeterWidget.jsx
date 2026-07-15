import React from 'react';
import { motion } from 'framer-motion';
import { Activity, Brain, Zap } from 'lucide-react';

export default function FocusMeterWidget({
    currentMode,
    focusScore = 0,
    balanceScore = 0,
    recommendation = 'Keep checking in to events to improve your meter trends.',
    loadingRecommendation = false,
    onRefreshRecommendation,
}) {

    return (
        <div className="glass rounded-2xl p-5 w-full mt-4 border border-white/10">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-white font-bold font-outfit">
                    <Brain className={currentMode === 'focus' ? 'text-red-200' : 'text-teal-200'} size={20} />
                    <span>AI Status Meter</span>
                </div>
                <button 
                    onClick={onRefreshRecommendation}
                    disabled={loadingRecommendation}
                    className={currentMode === 'focus' ? 'text-xs text-red-200 hover:text-white transition-colors disabled:opacity-50' : 'text-xs text-teal-200 hover:text-white transition-colors disabled:opacity-50'}
                >
                    {loadingRecommendation ? 'Analyzing...' : 'Refresh'}
                </button>
            </div>

                <div className="space-y-4">
                    {/* Focus Bar */}
                    <div>
                        <div className="flex justify-between text-xs font-inter mb-1">
                            <span className={currentMode === 'focus' ? 'text-red-100 flex items-center gap-1' : 'text-teal-100 flex items-center gap-1'}><Zap size={12}/> Focus</span>
                            <span className="text-taylor-red font-bold">{focusScore}%</span>
                        </div>
                        <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${focusScore}%` }}
                                transition={{ duration: 1 }}
                                className="bg-gradient-to-r from-red-600 to-red-500 h-full"
                            />
                        </div>
                    </div>

                    {/* Balance Bar */}
                    <div>
                        <div className="flex justify-between text-xs font-inter mb-1">
                            <span className={currentMode === 'focus' ? 'text-red-100 flex items-center gap-1' : 'text-teal-100 flex items-center gap-1'}><Activity size={12}/> Wellness</span>
                            <span className="text-teal-400 font-bold">{balanceScore}%</span>
                        </div>
                        <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${balanceScore}%` }}
                                transition={{ duration: 1, delay: 0.2 }}
                                className="bg-gradient-to-r from-teal-500 to-emerald-400 h-full"
                            />
                        </div>
                    </div>

                    {/* AI Recommendation */}
                    <div className={currentMode === 'focus' ? 'bg-white/5 border border-red-500/20 rounded-xl p-3 text-xs text-red-50 font-inter mt-4 leading-relaxed' : 'bg-white/5 border border-teal-500/20 rounded-xl p-3 text-xs text-teal-50 font-inter mt-4 leading-relaxed'}>
                        <span className="text-white font-semibold">AI Recommendation: </span>
                        {recommendation}
                    </div>
                </div>
        </div>
    );
}
