// This is the src/hooks/useClubs.js
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchActiveClubs,
  fetchCurrentStudentClubIds,
  joinClub,
  leaveClub,
} from "../services/clubService";

let cachedClubs = null;
let cachedJoinedClubIds = null;
let clubsRequest = null;

async function fetchClubData() {
  if (clubsRequest) {
    return clubsRequest;
  }

  clubsRequest = Promise.all([fetchActiveClubs(), fetchCurrentStudentClubIds()])
    .then(([clubRows, membershipIds]) => {
      cachedClubs = clubRows;
      cachedJoinedClubIds = membershipIds;

      return {
        clubs: clubRows,
        joinedClubIds: membershipIds,
      };
    })
    .finally(() => {
      clubsRequest = null;
    });

  return clubsRequest;
}

export default function useClubs(searchTerm = "") {
  const [clubs, setClubs] = useState(() => cachedClubs || []);
  const [joinedClubIds, setJoinedClubIds] = useState(
    () => cachedJoinedClubIds || [],
  );
  const [loading, setLoading] = useState(() => cachedClubs === null);
  const [error, setError] = useState("");

  const loadClubs = useCallback(async ({ force = false } = {}) => {
    if (!force && cachedClubs !== null) {
      setClubs(cachedClubs);
      setJoinedClubIds(cachedJoinedClubIds || []);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      if (force) {
        cachedClubs = null;
        cachedJoinedClubIds = null;
        clubsRequest = null;
      }

      const result = await fetchClubData();

      setClubs(result.clubs);
      setJoinedClubIds(result.joinedClubIds);
    } catch (loadError) {
      console.error("Failed to load clubs:", loadError);

      setError(loadError.message || "Unable to load clubs from Supabase.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isActive = true;

    const initializeClubs = async () => {
      if (cachedClubs !== null) {
        setClubs(cachedClubs);
        setJoinedClubIds(cachedJoinedClubIds || []);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const result = await fetchClubData();

        if (!isActive) return;

        setClubs(result.clubs);
        setJoinedClubIds(result.joinedClubIds);
      } catch (loadError) {
        if (!isActive) return;

        console.error("Failed to load clubs:", loadError);

        setError(loadError.message || "Unable to load clubs from Supabase.");
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    initializeClubs();

    return () => {
      isActive = false;
    };
  }, []);

  const toggleMembership = useCallback(async (clubId, shouldJoin) => {
    const numericClubId = Number(clubId);

    try {
      const result = shouldJoin
        ? await joinClub(numericClubId)
        : await leaveClub(numericClubId);

      setJoinedClubIds((currentIds) => {
        const normalizedIds = currentIds.map(Number);

        if (shouldJoin) {
          return normalizedIds.includes(numericClubId)
            ? normalizedIds
            : [...normalizedIds, numericClubId];
        }

        return normalizedIds.filter((id) => id !== numericClubId);
      });

      setClubs((currentClubs) =>
        currentClubs.map((club) =>
          Number(club.id) === numericClubId
            ? {
                ...club,
                members: result.memberCount,
                member_count: result.memberCount,
              }
            : club,
        ),
      );

      /*
       * Keep module-level cache synchronized when changing tabs.
       */
      if (Array.isArray(cachedClubs)) {
        cachedClubs = cachedClubs.map((club) =>
          Number(club.id) === numericClubId
            ? {
                ...club,
                members: result.memberCount,
                member_count: result.memberCount,
              }
            : club,
        );
      }

      if (Array.isArray(cachedJoinedClubIds)) {
        const normalizedCachedIds = cachedJoinedClubIds.map(Number);

        cachedJoinedClubIds = shouldJoin
          ? normalizedCachedIds.includes(numericClubId)
            ? normalizedCachedIds
            : [...normalizedCachedIds, numericClubId]
          : normalizedCachedIds.filter((id) => id !== numericClubId);
      }

      window.dispatchEvent(
        new CustomEvent("taylors-club-membership-updated", {
          detail: {
            clubId: numericClubId,
            joined: shouldJoin,
            memberCount: result.memberCount,
          },
        }),
      );

      return result;
    } catch (membershipError) {
      console.error("Unable to update club membership:", membershipError);
      throw membershipError;
    }
  }, []);

  const filteredClubs = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (!normalizedSearch) {
      return clubs;
    }

    return clubs.filter((club) => {
      const clubName = String(club.name || "").toLowerCase();
      const category = String(club.category || "").toLowerCase();
      const description = String(club.description || "").toLowerCase();

      return (
        clubName.includes(normalizedSearch) ||
        category.includes(normalizedSearch) ||
        description.includes(normalizedSearch)
      );
    });
  }, [clubs, searchTerm]);

  return {
    clubs: filteredClubs,
    joinedClubIds,
    loading,
    error,
    reload: () => loadClubs({ force: true }),
    toggleMembership,
  };
}
