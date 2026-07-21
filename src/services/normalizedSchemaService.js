import { supabase } from "../libs/supabase";
import { buildBaselineMatchScores } from "./eventRecommendationService";

const firstRelation = (value) => (Array.isArray(value) ? value[0] : value) || null;

export function relationName(value) {
  return firstRelation(value)?.name || "";
}

export function mapNormalizedUser(row) {
  if (!row) return null;
  const faculty = relationName(row.faculties);
  const programme = relationName(row.programmes);
  const interests = (row.user_interests || [])
    .map((entry) => relationName(entry.interests))
    .filter(Boolean);

  return { ...row, faculty, programme, interests };
}

export async function findFacultyId(name) {
  const normalized = String(name || "").trim();
  if (!normalized) return null;
  const { data, error } = await supabase
    .from("faculties")
    .select("id")
    .eq("name", normalized)
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

export async function findProgrammeId(name) {
  const normalized = String(name || "")
    .trim()
    .replace("(Honours)", "(Hons.)");
  if (!normalized) return null;
  const { data, error } = await supabase
    .from("programmes")
    .select("id")
    .eq("name", normalized)
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

export function getEventTagRows(row, tagType = null) {
  return (row?.campus_event_tags || [])
    .map((link) => firstRelation(link.event_tags))
    .filter((tag) => tag && (!tagType || tag.tag_type === tagType));
}

export function countActiveRSVPs(row) {
  return (row?.event_rsvps || []).filter((rsvp) =>
    ["registered", "waitlisted"].includes(String(rsvp.status || "").toLowerCase()),
  ).length;
}

export function mapNormalizedCampusEvent(row, recommendation = null) {
  if (!row) return null;
  const club = firstRelation(row.clubs);
  const topicTag = getEventTagRows(row, "topic")[0]?.name || "General";
  const tgcTags = getEventTagRows(row, "tgc").map((tag) => tag.name);
  const shineTags = getEventTagRows(row, "shine").map((tag) => tag.name);
  const accessibility = (row.campus_event_accessibility || [])
    .map((link) => relationName(link.accessibility_features))
    .filter(Boolean);
  const baseline = buildBaselineMatchScores({
    tag: topicTag,
    category: row.category,
    zone: row.zone,
    location: row.location,
    capacity: row.capacity,
  });
  const rec = recommendation || firstRelation(row.event_recommendations);
  const rawScore = rec?.match_score ?? baseline.match_score;
  const matchScore = String(rawScore || "0").includes("%")
    ? String(rawScore)
    : `${rawScore}%`;

  return {
    ...row,
    id: row.id,
    title: row.title || "Campus Event",
    host: row.host_name || row.host || club?.name || "Taylor's University",
    date: row.event_date || "",
    time: row.event_time || "",
    category: row.category || "focus",
    match_score: matchScore,
    match_breakdown: rec?.match_breakdown || baseline.match_breakdown,
    friends_attending: 0,
    friendNames: [],
    tag: topicTag,
    tgcTags,
    shineTags,
    accessibility,
    registered: countActiveRSVPs(row),
    isRSVPd: false,
    clubId: row.club_id || null,
    capacity: Number(row.capacity || 0),
  };
}

export const NORMALIZED_EVENT_SELECT = `
  *,
  clubs(id, name, category, description, logo, meeting_location),
  event_rsvps(status),
  campus_event_tags(event_tags(id, name, tag_type)),
  campus_event_accessibility(accessibility_features(id, name))
`;

export async function syncEventTopicTag(eventId, tagName) {
  const name = String(tagName || "General").trim() || "General";
  const { data: tag, error: tagError } = await supabase
    .from("event_tags")
    .upsert({ name, tag_type: "topic" }, { onConflict: "name,tag_type" })
    .select("id")
    .single();
  if (tagError) throw tagError;

  const { data: oldLinks, error: oldError } = await supabase
    .from("campus_event_tags")
    .select("tag_id, event_tags!inner(tag_type)")
    .eq("event_id", eventId)
    .eq("event_tags.tag_type", "topic");
  if (oldError) throw oldError;

  if (oldLinks?.length) {
    const { error: deleteError } = await supabase
      .from("campus_event_tags")
      .delete()
      .eq("event_id", eventId)
      .in("tag_id", oldLinks.map((link) => link.tag_id));
    if (deleteError) throw deleteError;
  }

  const { error: linkError } = await supabase
    .from("campus_event_tags")
    .upsert({ event_id: eventId, tag_id: tag.id }, { onConflict: "event_id,tag_id" });
  if (linkError) throw linkError;
}
