// This is the src/pages/Explore.jsx file
import { useState } from "react";
import ClubCard from "../components/ClubCard";
import ClubDetailModal from "../components/ClubDetailModal";
import useClubs from "../hooks/useClubs";

export default function Explore() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClub, setSelectedClub] = useState(null);
  const {
    clubs,
    joinedClubIds,
    loading,
    error,
    reload,
    toggleMembership,
  } = useClubs(searchTerm);

  const openClub = (club) => setSelectedClub(club);
  const closeClub = () => setSelectedClub(null);

  return (
    <>
      <div className="px-5 pt-8 pb-24">
        <h1 className="text-2xl font-bold text-white mb-2">Explore Campus</h1>
        <p className="text-gray-400 text-sm mb-6">Find your community.</p>

        <div className="mb-4 w-full flex items-center justify-center rounded-xl px-3 py-2.5 bg-taylor-red/10 border border-taylor-red/20">
          <span className="text-[10px] font-inter font-semibold text-taylor-red uppercase tracking-wider">
            Clubs & Societies
          </span>
        </div>

        <div className="relative mb-6">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <span className="text-gray-500 text-lg">🔍</span>
          </div>
          <input
            type="search"
            placeholder="Search clubs, societies..."
            className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-taylor-red transition-colors text-sm"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>

        {loading && (
          <div className="text-center py-10 text-gray-500 text-sm">
            Loading clubs...
          </div>
        )}

        {!loading && error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-4 text-center text-sm text-red-300">
            <p>{error}</p>
            <button
              type="button"
              onClick={reload}
              className="mt-3 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/15"
            >
              Try Again
            </button>
          </div>
        )}

        {!loading && !error && clubs.length > 0 && (
          <div className="space-y-4">
            {clubs.map((club) => (
              <ClubCard
                key={club.id}
                club={club}
                joined={joinedClubIds.includes(club.id)}
                onToggleMembership={toggleMembership}
                onOpen={openClub}
              />
            ))}
          </div>
        )}

        {!loading && !error && clubs.length === 0 && (
          <div className="text-center py-10 text-gray-500 text-sm">
            {searchTerm
              ? `No clubs found matching "${searchTerm}"`
              : "No active clubs are available yet."}
          </div>
        )}
      </div>

      <ClubDetailModal
        club={selectedClub}
        isOpen={Boolean(selectedClub)}
        onClose={closeClub}
      />
    </>
  );
}
