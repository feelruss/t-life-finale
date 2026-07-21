import { supabase } from "../libs/supabase";
import {
  mapNormalizedCampusEvent,
  NORMALIZED_EVENT_SELECT,
} from "./normalizedSchemaService";

export async function getScheduleEvents({ startDate, endDate } = {}) {
  let query = supabase
    .from("campus_events")
    .select(NORMALIZED_EVENT_SELECT)
    .order("event_date", { ascending: true })
    .order("event_time", { ascending: true });

  if (startDate) query = query.gte("event_date", startDate);
  if (endDate) query = query.lte("event_date", endDate);

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((row) => {
    const event = mapNormalizedCampusEvent(row);
    return {
      ...event,
      sourceId: row.id,
      sourceTable: "campus_events",
      eventType: row.club_id ? "club" : "campus",
    };
  });
}
