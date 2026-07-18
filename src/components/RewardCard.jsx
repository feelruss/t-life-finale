import { useState } from 'react';
import { motion } from 'framer-motion';

export default function RewardCard({ reward, userPoints, onRedeem }) {
    const [isRedeeming, setIsRedeeming] = useState(false);
    const [redeemed, setRedeemed] = useState(false);
    const canAfford = userPoints >= reward.cost;

    const handleClick = () => {
        if (!canAfford || redeemed) return;
        setIsRedeeming(true);

        // Simulate API call
        setTimeout(() => {
            onRedeem(reward.cost);
            setIsRedeeming(false);
            setRedeemed(true);
        }, 800);
    };

    return (
        <motion.div
            layout
            className={`relative overflow-hidden rounded-xl bg-white/5 border ${redeemed ? 'border-green-500/50' : 'border-white/5'
                } p-4 transition-colors`}
        >
            <div className="flex justify-between items-start mb-2">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${reward.bg} flex items-center justify-center text-xl shadow-lg`}>
                    {reward.image}
                </div>
                <div className={`px-2 py-1 rounded text-[10px] font-bold ${canAfford ? 'bg-white/10 text-white' : 'bg-red-500/20 text-red-400'
                    }`}>
                    💎 {reward.cost}
                </div>
            </div>

            <h3 className="text-sm font-bold text-white leading-tight mb-1">{reward.title}</h3>
            <p className="text-[10px] text-gray-400 mb-4">{reward.venue}</p>

            <button
                onClick={handleClick}
                disabled={!canAfford || redeemed || isRedeeming}
                className={`w-full py-2 rounded-lg text-xs font-bold transition-all ${redeemed
                        ? 'bg-green-500 text-white cursor-default'
                        : canAfford
                            ? 'bg-white text-black hover:bg-gray-200 active:scale-95'
                            : 'bg-white/5 text-gray-500 cursor-not-allowed'
                    }`}
            >
                {redeemed ? (
                    'Redeemed!'
                ) : isRedeeming ? (
                    <span className="animate-pulse">Processing...</span>
                ) : canAfford ? (
                    'Redeem'
                ) : (
                    'Not enough points'
                )}
            </button>
        </motion.div>
    );
}
