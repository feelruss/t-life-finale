import { supabase } from "../components/GoogleLogin";

function normalizeCategory(value, fallback = "balance") {
  const category = String(value || "").trim().toLowerCase();
  return category === "focus" || category === "balance" ? category : fallback;
}

function normalizeCampusEvent(row) {
  return {
    ...row,
    id: row.id,
    sourceId: row.id,
    sourceTable: "campus_events",
    eventType: "campus",
    title: row.title || "Campus Event",
    host: row.host || "Taylor's University",
    date: row.event_date,
    time: row.event_time,
    location: row.location || "Location TBC",
    zone: row.zone || null,
    category: normalizeCategory(row.category),
    match_score: row.match_score || null,
    match_breakdown: row.match_breakdown || null,
    friends_attending: Number(row.friends_attending || 0),
    friendNames: row.friend_names || [],
    description: row.description || "",
    icon: row.icon || "CalendarIcon",
    accent: row.accent || "#E21836",
    tag: row.tag || "Campus",
    emoji: row.emoji || "📅",
    tgcTags: row.tgc_tags || [],
    shineTags: row.shine_tags || [],
    capacity: Number(row.capacity || 0),
    registered: Number(row.registered || 0),
    isRSVPd: Boolean(row.is_rsvpd),
    accessibility: row.accessibility || [],
  };
}

function normalizeClubEvent(row) {
  const club = Array.isArray(row.clubs) ? row.clubs[0] : row.clubs;
  return {
    ...row,
    id: `CLUB-${row.id}`,
    sourceId: row.id,
    sourceTable: "club_events",
    eventType: "club",
    clubId: row.club_id,
    title: row.title || "Club Event",
    host: club?.name || row.host || "Taylor's Club",
    date: row.event_date,
    time: row.event_time,
    location: row.location || club?.meeting_location || "Location TBC",
    zone: row.zone || null,
    category: normalizeCategory(row.category, "balance"),
    match_score: row.match_score || null,
    match_breakdown: row.match_breakdown || null,
    friends_attending: Number(row.friends_attending || 0),
    friendNames: row.friend_names || [],
    description: row.description || club?.description || "Club-organised campus event.",
    icon: row.icon || "UserGroupIcon",
    accent: row.accent || "#A78BFA",
    tag: row.tag || club?.category || "Club",
    emoji: row.emoji || club?.logo || "🎓",
    tgcTags: row.tgc_tags || [],
    shineTags: row.shine_tags || [],
    capacity: Number(row.capacity || 0),
    registered: Number(row.registered || 0),
    isRSVPd: Boolean(row.is_rsvpd),
    accessibility: row.accessibility || [],
  };
}

export async function getScheduleEvents({ startDate, endDate } = {}) {
  let campusQuery = supabase
    .from("campus_events")
    .select("*")
    .order("event_date", { ascending: true })
    .order("event_time", { ascending: true });

  let clubQuery = supabase
    .from("club_events")
    .select("*, clubs(name, category, description, logo, meeting_location)")
    .order("event_date", { ascending: true })
    .order("event_time", { ascending: true });

  if (startDate) {
    campusQuery = campusQuery.gte("event_date", startDate);
    clubQuery = clubQuery.gte("event_date", startDate);
  }

  if (endDate) {
    campusQuery = campusQuery.lte("event_date", endDate);
    clubQuery = clubQuery.lte("event_date", endDate);
  }

  const [campusResult, clubResult] = await Promise.allSettled([
    campusQuery,
    clubQuery,
  ]);

  const errors = [];
  let campusRows = [];
  let clubRows = [];

  if (campusResult.status === "fulfilled") {
    if (campusResult.value.error) errors.push(campusResult.value.error);
    else campusRows = campusResult.value.data || [];
  } else {
    errors.push(campusResult.reason);
  }

  if (clubResult.status === "fulfilled") {
    if (clubResult.value.error) errors.push(clubResult.value.error);
    else clubRows = clubResult.value.data || [];
  } else {
    errors.push(clubResult.reason);
  }

  if (errors.length === 2) {
    throw errors[0];
  }

  if (errors.length > 0) {
    console.warn("One schedule event source could not be loaded:", errors[0]);
  }

  return [
    ...campusRows.map(normalizeCampusEvent),
    ...clubRows.map(normalizeClubEvent),
  ].sort((a, b) => {
    const dateCompare = String(a.date || "").localeCompare(String(b.date || ""));
    return dateCompare !== 0
      ? dateCompare
      : String(a.time || "").localeCompare(String(b.time || ""));
  });
}
