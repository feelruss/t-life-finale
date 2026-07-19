import { supabase } from "../libs/supabase";
import { events as localEvents } from "../data/events";
import { buildBaselineMatchScores } from "./eventRecommendationService";

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
  const hasBreakdown =
    Number(breakdown.interest) > 0 ||
    Number(breakdown.schedule) > 0 ||
    Number(breakdown.proximity) > 0 ||
    Number(breakdown.social) > 0;

  // Old rows sometimes only have a blank score — rebuild so student cards never show 0%.
  const baseline = buildBaselineMatchScores({
    tag: row.tag,
    category: row.category,
    zone: row.zone,
    location: row.location,
    capacity: row.capacity,
  });

  const match_breakdown = hasBreakdown
    ? {
        interest: Number(breakdown.interest ?? breakdown.Interest) || 0,
        schedule: Number(breakdown.schedule ?? breakdown.Schedule) || 0,
        proximity: Number(breakdown.proximity ?? breakdown.Proximity) || 0,
        social: Number(breakdown.social ?? breakdown.Social) || 0,
      }
    : Number.isFinite(numericMatch) && numericMatch > 0
      ? {
          interest: numericMatch,
          schedule: Math.max(0, numericMatch - 5),
          proximity: Math.max(0, numericMatch - 10),
          social: Math.max(0, numericMatch - 15),
        }
      : baseline.match_breakdown;

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
    match_score:
      matchScoreLabel ||
      baseline.match_score ||
      `${Number.isFinite(numericMatch) ? numericMatch : 0}%`,
    match_breakdown,
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

function todayISODate() {
  // Local calendar day (not UTC) so MY evening doesn't drop "today" events.
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isUpcomingOrUndated(event) {
  const date = String(event?.date || "").slice(0, 10);
  if (!date) return true;
  return date >= todayISODate();
}

/**
 * Loads campus events from Supabase. Falls back to local mock events if
 * offline / RLS / empty so the homepage never looks broken in a demo.
 * Prefers upcoming dates so Home recommendations match Schedule.
 */
export async function fetchCampusEvents({ category, upcomingOnly = true } = {}) {
  try {
    let query = supabase
      .from("campus_events")
      .select("*")
      .order("event_date", { ascending: true });

    if (upcomingOnly) {
      query = query.gte("event_date", todayISODate());
    }

    if (category) {
      query = query.eq("category", category);
    }

    const { data, error } = await query;

    if (error) throw error;

    let mapped = (data || []).map(mapCampusEvent).filter(Boolean);

    // If the DB still has only past rows, fall through without filter once.
    if (mapped.length === 0 && upcomingOnly) {
      const { data: allRows, error: allError } = await supabase
        .from("campus_events")
        .select("*")
        .order("event_date", { ascending: true });
      if (!allError) {
        mapped = (allRows || []).map(mapCampusEvent).filter(Boolean);
      }
    }

    if (mapped.length > 0) {
      const events = upcomingOnly
        ? mapped.filter(isUpcomingOrUndated)
        : mapped;
      return {
        events: events.length > 0 ? events : mapped,
        source: "supabase",
      };
    }
  } catch (error) {
    console.warn("campus_events fetch failed, using local fallback:", error);
  }

  const fallback = category
    ? localEvents.filter((event) => event.category === category)
    : localEvents;

  const upcoming = upcomingOnly
    ? fallback.filter(isUpcomingOrUndated)
    : fallback;

  return {
    events: upcoming.length > 0 ? upcoming : fallback,
    source: "local",
  };
}
