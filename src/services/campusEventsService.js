import { supabase } from "../libs/supabase";
import { events as localEvents } from "../data/events";

export function mapCampusEvent(row) {
  if (!row) return null;

  const matchScoreRaw = row.match_score ?? row.matchScore ?? null;
  const matchScoreLabel =
    matchScoreRaw == null || matchScoreRaw === ""
      ? null
      : String(matchScoreRaw).includes("%")
        ? String(matchScoreRaw)
        : `${matchScoreRaw}%`;

  const numericMatch = Number(String(matchScoreRaw ?? "0").replace("%", ""));
  const breakdown = row.match_breakdown || row.matchBreakdown || {};

  return {
    id: row.id,
    title: row.title || "Campus Event",
    host: row.host || "Taylor's University",
    time: row.event_time || row.time || "",
    date: row.event_date || row.date || "",
    location: row.location || "",
    zone: row.zone || "",
    category: String(row.category || "focus").toLowerCase() === "balance"
      ? "balance"
      : "focus",
    match_score: matchScoreLabel || `${Number.isFinite(numericMatch) ? numericMatch : 0}%`,
    match_breakdown: {
      interest: Number(breakdown.interest ?? breakdown.Interest ?? numericMatch) || 0,
      schedule: Number(breakdown.schedule ?? breakdown.Schedule ?? Math.max(0, numericMatch - 5)) || 0,
      proximity: Number(breakdown.proximity ?? breakdown.Proximity ?? Math.max(0, numericMatch - 10)) || 0,
      social: Number(breakdown.social ?? breakdown.Social ?? Math.max(0, numericMatch - 15)) || 0,
    },
    friends_attending: row.friends_attending || 0,
    friendNames: row.friend_names || [],
    description: row.description || "Campus event at Taylor's University.",
    icon: row.icon || null,
    accent: row.accent || "#E31837",
    tag: row.tag || "General",
    emoji: row.emoji || "📅",
    tgcTags: row.tgc_tags || [],
    shineTags: row.shine_tags || [],
    capacity: Number(row.capacity) || 0,
    registered: Number(row.registered) || 0,
  };
}

/**
 * Loads campus events from Supabase. Falls back to local mock events if
 * offline / RLS / empty so the homepage never looks broken in a demo.
 */
export async function fetchCampusEvents({ category } = {}) {
  try {
    let query = supabase
      .from("campus_events")
      .select("*")
      .order("event_date", { ascending: true });

    if (category) {
      query = query.eq("category", category);
    }

    const { data, error } = await query;

    if (error) throw error;

    const mapped = (data || []).map(mapCampusEvent).filter(Boolean);

    if (mapped.length > 0) {
      return { events: mapped, source: "supabase" };
    }
  } catch (error) {
    console.warn("campus_events fetch failed, using local fallback:", error);
  }

  const fallback = category
    ? localEvents.filter((event) => event.category === category)
    : localEvents;

  return { events: fallback, source: "local" };
}
