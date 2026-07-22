import { supabase } from "../libs/supabase";

/**
 * Hybrid campus-event recommendation engine.
 *
 * Hybrid components:
 * 1. Content-based filtering: compares the current student's interests,
 *    programme, faculty and mode with event metadata.
 * 2. Collaborative filtering: scores events from attendance and RSVP behaviour
 *    of students who have similar interests and interaction histories.
 * 3. Constraint filtering: penalises timetable clashes.
 *
 * Final score:
 *   established user = 60% content + 40% collaborative
 *   cold-start user  = 100% content
 */

const MAX_RECOMMENDED = 6;
const ATTENDANCE_WEIGHT = 5;
const RSVP_WEIGHT = 3;
const VIEW_WEIGHT = 1;

function clamp(n, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(Number(n) || 0)));
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function tokenize(value) {
  return new Set(
    normalizeText(value)
      .split(/[^a-z0-9]+/i)
      .map((token) => token.trim())
      .filter((token) => token.length >= 2),
  );
}

function eventTokens(event = {}) {
  return tokenize(
    [
      event.title,
      event.description,
      event.category,
      event.tag,
      ...(event.tgcTags || []),
      ...(event.shineTags || []),
      event.host,
    ].join(" "),
  );
}

function overlapRatio(left = new Set(), right = new Set()) {
  if (!left.size || !right.size) return 0;
  let overlap = 0;
  left.forEach((value) => {
    if (right.has(value)) overlap += 1;
  });
  return overlap / Math.max(1, left.size);
}

function jaccard(left = new Set(), right = new Set()) {
  if (!left.size && !right.size) return 0;
  let intersection = 0;
  const union = new Set([...left, ...right]);
  left.forEach((value) => {
    if (right.has(value)) intersection += 1;
  });
  return intersection / Math.max(1, union.size);
}

function firstRelation(value) {
  return (Array.isArray(value) ? value[0] : value) || null;
}

function relationName(value) {
  return firstRelation(value)?.name || "";
}

function getRowUserId(row = {}) {
  return String(row.student_id || "");
}

function getRowEventId(row = {}) {
  return String(row.event_id || row.entity_id || "");
}

function normalizeTimeToMinutes(value) {
  const text = String(value || "").trim();
  const match = text.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const period = String(match[3] || "").toUpperCase();
  if (period === "PM" && hour !== 12) hour += 12;
  if (period === "AM" && hour === 12) hour = 0;
  return hour * 60 + minute;
}

function parseEventRange(event = {}) {
  const text = String(event.time || event.event_time || "");
  const parts = text.split(/\s*(?:-|–|to)\s*/i);
  const start = normalizeTimeToMinutes(parts[0]);
  const end = normalizeTimeToMinutes(parts[1]);
  return { start, end: end ?? (start == null ? null : start + 60) };
}

function eventDayName(event = {}) {
  const rawDate = event.date || event.event_date;
  if (!rawDate) return "";
  const date = new Date(`${String(rawDate).slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
}

function hasTimetableConflict(event, scheduleRows = []) {
  const day = eventDayName(event);
  const range = parseEventRange(event);
  if (!day || range.start == null || range.end == null) return false;

  return scheduleRows.some((row) => {
    if (normalizeText(row.day_of_week) !== day) return false;
    const classStart = normalizeTimeToMinutes(row.start_time);
    const classEnd = normalizeTimeToMinutes(row.end_time);
    if (classStart == null || classEnd == null) return false;
    return range.start < classEnd && range.end > classStart;
  });
}

function buildInteractionMap(rows = [], weight = 1) {
  const map = new Map();
  rows.forEach((row) => {
    const userId = getRowUserId(row);
    const eventId = getRowEventId(row);
    if (!userId || !eventId) return;
    if (!map.has(userId)) map.set(userId, new Map());
    const userEvents = map.get(userId);
    userEvents.set(eventId, (userEvents.get(eventId) || 0) + weight);
  });
  return map;
}

function mergeInteractionMaps(...maps) {
  const merged = new Map();
  maps.forEach((source) => {
    source.forEach((eventMap, userId) => {
      if (!merged.has(userId)) merged.set(userId, new Map());
      const target = merged.get(userId);
      eventMap.forEach((weight, eventId) => {
        target.set(eventId, (target.get(eventId) || 0) + weight);
      });
    });
  });
  return merged;
}

function interactionSimilarity(left = new Map(), right = new Map()) {
  if (!left.size || !right.size) return 0;
  const leftEvents = new Set(left.keys());
  const rightEvents = new Set(right.keys());
  return jaccard(leftEvents, rightEvents);
}

function buildCollaborativeScores({
  currentUserId,
  users = [],
  interactionMap = new Map(),
}) {
  const currentUser = users.find((user) => String(user.id) === String(currentUserId));
  const currentInterests = new Set(currentUser?.interests || []);
  const currentInteractions = interactionMap.get(String(currentUserId)) || new Map();
  const rawScores = new Map();
  let neighbourCount = 0;

  users.forEach((other) => {
    const otherId = String(other.id || "");
    if (!otherId || otherId === String(currentUserId)) return;
    const otherInteractions = interactionMap.get(otherId) || new Map();
    if (!otherInteractions.size) return;

    const interestSimilarity = jaccard(
      currentInterests,
      new Set(other.interests || []),
    );
    const behaviourSimilarity = interactionSimilarity(
      currentInteractions,
      otherInteractions,
    );

    // Interest similarity supports new or low-activity users; behaviour becomes
    // more important once interaction history exists.
    const similarity = currentInteractions.size
      ? interestSimilarity * 0.45 + behaviourSimilarity * 0.55
      : interestSimilarity;

    if (similarity <= 0) return;
    neighbourCount += 1;

    otherInteractions.forEach((weight, eventId) => {
      if (currentInteractions.has(eventId)) return;
      rawScores.set(eventId, (rawScores.get(eventId) || 0) + similarity * weight);
    });
  });

  const maximum = Math.max(0, ...rawScores.values());
  const scores = new Map();
  rawScores.forEach((value, eventId) => {
    scores.set(eventId, maximum > 0 ? clamp((value / maximum) * 100) : 0);
  });

  return { scores, neighbourCount, currentInteractionCount: currentInteractions.size };
}

function mapUser(row) {
  return {
    id: row.id,
    programme: relationName(row.programmes),
    faculty: relationName(row.faculties),
    interests: (row.user_interests || [])
      .map((link) => relationName(link.interests))
      .filter(Boolean)
      .map(normalizeText),
  };
}

async function safeQuery(query, fallback = []) {
  const { data, error } = await query;
  if (error) {
    console.warn("Hybrid recommendation data query failed:", error.message);
    return fallback;
  }
  return data || fallback;
}

/**
 * Loads the Supabase data required by the hybrid recommender.
 * It gracefully falls back to content-based ranking when collaborative tables
 * are unavailable or blocked by RLS.
 */
export async function loadHybridRecommendationContext(userId) {
  if (!userId || userId === "guest") {
    return {
      userId: "guest",
      currentUser: null,
      collaborativeScores: new Map(),
      scheduleRows: [],
      collaborativeAvailable: false,
      currentInteractionCount: 0,
      neighbourCount: 0,
    };
  }

  const [userRows, attendanceRows, rsvpRows, activityRows, scheduleRows] =
    await Promise.all([
      safeQuery(
        supabase.from("users").select(`
          id,
          faculty_id,
          programme_id,
          faculties(name),
          programmes(name),
          user_interests(interests(name))
        `),
      ),
      safeQuery(
        supabase
          .from("attendance")
          .select("student_id, event_id, attended_at"),
      ),
      safeQuery(
        supabase
          .from("event_rsvps")
          .select("student_id, event_id, status")
          .in("status", ["registered", "waitlisted", "attended"]),
      ),
      safeQuery(
        supabase
          .from("user_activity_logs")
          .select("student_id, entity_id, entity_type, activity_type")
          .eq("entity_type", "event")
          .in("activity_type", ["view", "save", "interested"]),
      ),
      safeQuery(
        supabase
          .from("student_schedule")
          .select("student_id, day_of_week, start_time, end_time")
          .eq("student_id", userId),
      ),
    ]);

  const users = userRows.map(mapUser);
  const currentUser = users.find((user) => String(user.id) === String(userId)) || null;
  const interactions = mergeInteractionMaps(
    buildInteractionMap(attendanceRows, ATTENDANCE_WEIGHT),
    buildInteractionMap(rsvpRows, RSVP_WEIGHT),
    buildInteractionMap(activityRows, VIEW_WEIGHT),
  );
  const collaborative = buildCollaborativeScores({
    currentUserId: userId,
    users,
    interactionMap: interactions,
  });

  return {
    userId: String(userId),
    currentUser,
    collaborativeScores: collaborative.scores,
    scheduleRows,
    collaborativeAvailable: collaborative.scores.size > 0,
    currentInteractionCount: collaborative.currentInteractionCount,
    neighbourCount: collaborative.neighbourCount,
  };
}

export function computeContentScore(event, currentUser, mode = "focus") {
  const tokens = eventTokens(event);
  const interests = new Set((currentUser?.interests || []).map(normalizeText));
  const interestTokens = new Set();
  interests.forEach((interest) => {
    tokenize(interest).forEach((token) => interestTokens.add(token));
  });

  const interestMatch = overlapRatio(interestTokens, tokens);
  const programmeTokens = tokenize(currentUser?.programme);
  const facultyTokens = tokenize(currentUser?.faculty);
  const programmeMatch = overlapRatio(programmeTokens, tokens);
  const facultyMatch = overlapRatio(facultyTokens, tokens);
  const modeMatch = normalizeText(event.category) === normalizeText(mode) ? 1 : 0;

  // Interests dominate; profile and mode provide useful cold-start signals.
  const score = clamp(
    interestMatch * 60 + programmeMatch * 15 + facultyMatch * 10 + modeMatch * 15,
  );

  return {
    score: score || (modeMatch ? 55 : 35),
    interestMatch: clamp(interestMatch * 100),
    programmeMatch: clamp(programmeMatch * 100),
    facultyMatch: clamp(facultyMatch * 100),
    modeMatch: clamp(modeMatch * 100),
  };
}

/**
 * Rank events using content-based + collaborative filtering.
 */
export function recommendEvents({
  events = [],
  preferences = {},
  mode = "focus",
  limit = MAX_RECOMMENDED,
  hybridContext = null,
} = {}) {
  const interestedIds = new Set((preferences.interested || []).map(String));
  const hiddenIds = new Set((preferences.hidden || []).map(String));
  const currentUser = hybridContext?.currentUser || null;
  const collaborativeScores = hybridContext?.collaborativeScores || new Map();
  const scheduleRows = hybridContext?.scheduleRows || [];
  const hasCollaborativeData = Boolean(hybridContext?.collaborativeAvailable);

  const candidates = (events || []).filter(
    (event) => !hiddenIds.has(String(event.id)),
  );

  const scored = candidates.map((event) => {
    const content = computeContentScore(event, currentUser, mode);
    let collaborative = collaborativeScores.get(String(event.id)) || 0;

    // The student's explicit card feedback is a strong personal signal.
    if (interestedIds.has(String(event.id))) {
      collaborative = Math.max(collaborative, 90);
    }

    const contentWeight = hasCollaborativeData ? 0.6 : 1;
    const collaborativeWeight = hasCollaborativeData ? 0.4 : 0;
    let hybridScore = clamp(
      content.score * contentWeight + collaborative * collaborativeWeight,
    );

    const timetableConflict = hasTimetableConflict(event, scheduleRows);
    if (timetableConflict) hybridScore = clamp(hybridScore - 70);

    const reasons = [];
    if (content.interestMatch > 0) reasons.push("it matches your interests");
    if (collaborative >= 60)
      reasons.push("similar students engaged with this event");
    if (content.modeMatch === 100)
      reasons.push(`it fits your ${normalizeText(mode) === "balance" ? "Balance" : "Focus"} mode`);
    if (!timetableConflict && scheduleRows.length)
      reasons.push("it does not clash with your timetable");
    if (interestedIds.has(String(event.id)))
      reasons.unshift("you marked it as Interested");

    return {
      ...event,
      match_score: `${hybridScore}%`,
      recommendationScore: hybridScore + (interestedIds.has(String(event.id)) ? 1000 : 0),
      recommendation_source: hasCollaborativeData ? "hybrid" : "content",
      content_score: content.score,
      collaborative_score: collaborative,
      hybrid_score: hybridScore,
      timetable_conflict: timetableConflict,
      match_breakdown: {
        content: content.score,
        collaborative,
        interest: content.interestMatch,
        programme: content.programmeMatch,
        mode: content.modeMatch,
        schedule: timetableConflict ? 0 : 100,
      },
      whyRecommended:
        reasons.slice(0, 3).join(", ") || "it is a relevant campus event",
    };
  });

  scored.sort((a, b) => b.recommendationScore - a.recommendationScore);

  return {
    recommended: scored.slice(0, Math.max(1, limit)),
    totalAvailable: candidates.length,
    recommendationMode: hasCollaborativeData ? "hybrid" : "content-based cold start",
  };
}

/**
 * Baseline scores used when admins create an event before personalised data is
 * available. This remains content-oriented and is later replaced by the hybrid
 * score on the student's feed.
 */
export function buildBaselineMatchScores(event = {}) {
  const completeness = [event.tag, event.category, event.location, event.zone].filter(
    (value) => String(value || "").trim(),
  ).length;
  const content = clamp(45 + completeness * 10);
  return {
    match_score: `${content}%`,
    match_breakdown: {
      content,
      collaborative: 0,
      interest: content,
      schedule: 100,
    },
  };
}


/**
 * Persists the generated recommendations so the same scores can be loaded on
 * refresh and inspected in Supabase. One row is stored per student and event.
 */
export async function saveEventRecommendations({
  studentId,
  recommendations = [],
} = {}) {
  if (!studentId || studentId === "guest") {
    return { success: true, saved: 0, error: null };
  }

  if (!Array.isArray(recommendations) || recommendations.length === 0) {
    return { success: true, saved: 0, error: null };
  }

  const rows = recommendations
    .filter((event) => event?.id)
    .map((event) => {
      const rawMatchScore =
        event.hybrid_score ?? event.match_score ?? 0;
      const matchScore = clamp(
        Number.parseFloat(String(rawMatchScore).replace("%", "")) || 0,
      );

      return {
        student_id: studentId,
        event_id: String(event.id),
        match_score: matchScore,
        match_breakdown: event.match_breakdown || {},
        recommendation_reason:
          event.whyRecommended || event.recommendation_reason || null,
        generated_at: new Date().toISOString(),
        content_score: clamp(
          event.content_score ?? event.match_breakdown?.content ?? 0,
        ),
        collaborative_score: clamp(
          event.collaborative_score ??
            event.match_breakdown?.collaborative ??
            0,
        ),
        hybrid_score: clamp(event.hybrid_score ?? matchScore),
        recommendation_source: ["content", "collaborative", "hybrid"].includes(
          event.recommendation_source,
        )
          ? event.recommendation_source
          : "content",
        timetable_conflict: Boolean(event.timetable_conflict),
      };
    });

  if (!rows.length) {
    return { success: true, saved: 0, error: null };
  }

  const { error } = await supabase
    .from("event_recommendations")
    .upsert(rows, { onConflict: "student_id,event_id" });

  if (error) {
    console.error("Failed to save event recommendations:", error);
    return { success: false, saved: 0, error: error.message };
  }

  return { success: true, saved: rows.length, error: null };
}

export const RECOMMENDATION_LIMIT = MAX_RECOMMENDED;
