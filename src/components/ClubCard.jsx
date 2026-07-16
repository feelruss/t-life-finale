import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, Check, Loader2 } from "lucide-react";

export default function ClubCard({
  club,
  joined = false,
  onToggleMembership,
  onOpen,
}) {
  const [isJoined, setIsJoined] = useState(joined);
  const [membershipLoading, setMembershipLoading] = useState(false);
  const [membershipError, setMembershipError] = useState("");

  useEffect(() => {
    setIsJoined(joined);
  }, [joined]);

  const handleJoin = async (event) => {
    event.stopPropagation();

    if (membershipLoading) return;

    const nextJoined = !isJoined;
    setMembershipLoading(true);
    setMembershipError("");

    try {
      await onToggleMembership?.(club.id, nextJoined);
      setIsJoined(nextJoined);
    } catch (error) {
      console.error("Failed to update club membership:", error);
      setMembershipError(error.message || "Unable to update membership.");
    } finally {
      setMembershipLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => onOpen?.(club)}
      className="group relative overflow-hidden rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors cursor-pointer"
    >
      <div className={`h-20 bg-gradient-to-r ${club.bg} p-4 flex justify-between items-start`}>
        <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-2xl shadow-lg border border-white/20">
          {club.logo}
        </div>
        <span className="px-2 py-1 rounded-full bg-black/20 backdrop-blur-md text-[10px] font-bold text-white uppercase tracking-wider border border-white/10">
          {club.category}
        </span>
      </div>

      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-bold text-white leading-tight">{club.name}</h3>
        </div>

        <p className="text-xs text-gray-400 line-clamp-2 mb-4 h-8">
          {club.description}
        </p>

        <div className="flex items-center justify-between mt-auto">
          <div className="flex items-center gap-1.5 text-gray-500">
            <Users size={14} />
            <span className="text-xs font-medium">{club.members} Members</span>
          </div>

          <button
            type="button"
            onClick={handleJoin}
            disabled={membershipLoading}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 flex items-center gap-1.5 disabled:opacity-60 ${
              isJoined
                ? "bg-green-500/20 text-green-400 border border-green-500/50"
                : "bg-white text-black hover:bg-gray-200"
            }`}
          >
            {membershipLoading ? (
              <>
                <Loader2 size={12} className="animate-spin" />
                Saving
              </>
            ) : isJoined ? (
              <>
                <Check size={12} strokeWidth={3} />
                Joined
              </>
            ) : (
              "Join"
            )}
          </button>
        </div>

        {membershipError && (
          <p className="mt-2 text-[10px] text-red-400 text-right">
            {membershipError}
          </p>
        )}
      </div>

      <div className={`absolute inset-0 bg-gradient-to-r ${club.bg} opacity-0 group-hover:opacity-5 transition-opacity duration-300 pointer-events-none`} />
    </motion.div>
  );
}
