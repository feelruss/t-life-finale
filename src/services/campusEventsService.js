import { supabase } from "../libs/supabase";
import { events as localEvents } from "../data/events";
import {
  mapNormalizedCampusEvent,
  NORMALIZED_EVENT_SELECT,
} from "./normalizedSchemaService";

export const mapCampusEvent = mapNormalizedCampusEvent;

export async function fetchCampusEvents({ category, studentId = null } = {}) {
  try {
    let query = supabase
      .from("campus_events")
      .select(NORMALIZED_EVENT_SELECT)
      .order("event_date", { ascending: true });

    if (category) query = query.eq("category", category);

    const { data, error } = await query;
    if (error) throw error;

    let recommendationMap = new Map();
    if (studentId && data?.length) {
      const { data: recs, error: recError } = await supabase
        .from("event_recommendations")
        .select(`
          event_id,
          match_score,
          match_breakdown,
          recommendation_reason,
          content_score,
          collaborative_score,
          hybrid_score,
          recommendation_source,
          timetable_conflict
        `)
        .eq("student_id", studentId)
        .in("event_id", data.map((event) => event.id));
      if (recError) throw recError;
      recommendationMap = new Map((recs || []).map((rec) => [String(rec.event_id), rec]));
    }

    const mapped = (data || [])
      .map((row) => mapNormalizedCampusEvent(row, recommendationMap.get(String(row.id))))
      .filter(Boolean);

    if (mapped.length > 0) return { events: mapped, source: "supabase" };
  } catch (error) {
    console.warn("campus_events fetch failed, using local fallback:", error);
  }

  const fallback = category
    ? localEvents.filter((event) => event.category === category)
    : localEvents;
  return { events: fallback, source: "local" };
}
