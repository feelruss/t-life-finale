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

  clubsRequest = Promise.all([
    fetchActiveClubs(),
    fetchCurrentStudentClubIds(),
  ])
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

      setError(
        loadError.message || "Unable to load clubs from Supabase.",
      );
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

        setError(
          loadError.message || "Unable to load clubs from Supabase.",
        );
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
  if (shouldJoin) {
    await joinClub(clubId);

    setJoinedClubIds((current) => {
      const updatedIds = current.includes(clubId)
        ? current
        : [...current, clubId];

      cachedJoinedClubIds = updatedIds;
      return updatedIds;
    });
  } else {
    await leaveClub(clubId);

    setJoinedClubIds((current) => {
      const updatedIds = current.filter((id) => id !== clubId);

      cachedJoinedClubIds = updatedIds;
      return updatedIds;
    });
  }

  setClubs((current) => {
    const updatedClubs = current.map((club) =>
      club.id === clubId
        ? {
            ...club,
            members: shouldJoin
              ? (club.members || 0) + 1
              : Math.max((club.members || 0) - 1, 0),
          }
        : club,
    );

    cachedClubs = updatedClubs;
    return updatedClubs;
  });

  window.dispatchEvent(
    new CustomEvent("taylors-club-membership-updated", {
      detail: {
        clubId,
        joined: shouldJoin,
      },
    }),
  );
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