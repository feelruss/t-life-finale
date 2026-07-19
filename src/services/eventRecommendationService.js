/**
 * Simple campus event recommendation engine.
 *
 * Uses Interested / Not interested feedback + event metadata to:
 * 1) Rank which events to show
 * 2) Compute personal Interest / Schedule / Proximity / Social % for the UI
 *
 * Formula (display match %):
 *   overall = 0.40*Interest + 0.30*Schedule + 0.20*Proximity + 0.10*Social
 */

const TAG_INTEREST_BASE = {
  Technology: 86,
  Career: 84,
  Wellness: 88,
  Social: 82,
  Creative: 83,
  Academic: 85,
};

const MAX_RECOMMENDED = 5;

const DIVERSITY_TAGS = [
  "Technology",
  "Career",
  "Wellness",
  "Social",
  "Creative",
  "Academic",
];

/**
 * Pick up to `limit` events preferring one distinct topic tag each,
 * so Home feels diverse (e.g. CS student still sees a cooking/wellness pick).
 */
function pickDiverseRecommendations(scored, limit, modeKey = "focus") {
  const picked = [];
  const usedTags = new Set();
  const usedIds = new Set();

  // Prefer current mode first so Balance isn't filled with Focus tech events.
  const ordered = [
    ...scored.filter(
      (e) => String(e.category || "").toLowerCase() === modeKey,
    ),
    ...scored.filter(
      (e) => String(e.category || "").toLowerCase() !== modeKey,
    ),
  ];

  // First pass: one per preferred topic (highest ranked for that tag)
  for (const tag of DIVERSITY_TAGS) {
    if (picked.length >= limit) break;
    const candidate = ordered.find(
      (event) =>
        !usedIds.has(String(event.id)) &&
        String(event.tag || "") === tag,
    );
    if (candidate) {
      picked.push(candidate);
      usedTags.add(tag);
      usedIds.add(String(candidate.id));
    }
  }

  // Second pass: any remaining unique tags
  for (const event of ordered) {
    if (picked.length >= limit) break;
    const id = String(event.id);
    if (usedIds.has(id)) continue;
    const tag = String(event.tag || "General");
    if (usedTags.has(tag)) continue;
    picked.push(event);
    usedTags.add(tag);
    usedIds.add(id);
  }

  // Fill remaining slots by rank (mode-first order)
  for (const event of ordered) {
    if (picked.length >= limit) break;
    const id = String(event.id);
    if (usedIds.has(id)) continue;
    picked.push(event);
    usedIds.add(id);
  }

  return picked;
}

function clamp(n, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(Number(n) || 0)));
}

function parseMatchNumber(value) {
  const n = Number(String(value ?? "0").replace("%", ""));
  return Number.isFinite(n) ? n : 0;
}

/**
 * Baseline match for newly created admin events (stored on campus_events).
 */
export function buildBaselineMatchScores(event = {}) {
  const tag = String(event.tag || "Technology");
  const category = String(event.category || "focus").toLowerCase();
  const hasZone = Boolean(String(event.zone || "").trim());
  const hasLocation = Boolean(String(event.location || "").trim());
  const capacity = Number(event.capacity) || 0;

  const interest = TAG_INTEREST_BASE[tag] ?? 80;
  const schedule = category === "balance" ? 88 : 84;
  const proximity = hasZone || hasLocation ? 82 : 68;
  const social =
    capacity >= 80 ? 90 : capacity >= 40 ? 78 : capacity > 0 ? 70 : 74;

  const overall = clamp(
    interest * 0.4 + schedule * 0.3 + proximity * 0.2 + social * 0.1,
  );

  return {
    match_score: `${overall}%`,
    match_breakdown: {
      interest: clamp(interest),
      schedule: clamp(schedule),
      proximity: clamp(proximity),
      social: clamp(social),
    },
  };
}

function collectAffinity(events, ids) {
  const idSet = new Set((ids || []).map(String));
  const seeds = (events || []).filter((e) => idSet.has(String(e.id)));
  const tags = {};
  const hosts = {};
  const categories = {};

  seeds.forEach((seed) => {
    if (seed.tag) tags[seed.tag] = (tags[seed.tag] || 0) + 1;
    if (seed.host) hosts[seed.host] = (hosts[seed.host] || 0) + 1;
    const cat = String(seed.category || "").toLowerCase();
    if (cat) categories[cat] = (categories[cat] || 0) + 1;
  });

  return { seeds, tags, hosts, categories };
}

/**
 * Personalize breakdown for one event from user feedback.
 */
export function computePersonalizedMatch(event, preferences = {}, allEvents = []) {
  const interestedIds = preferences.interested || [];
  const hiddenIds = preferences.hidden || [];
  const interested = collectAffinity(allEvents, interestedIds);
  const hidden = collectAffinity(allEvents, hiddenIds);

  const baseline = event.match_breakdown || {};
  const fallback = parseMatchNumber(event.match_score);

  let interest =
    Number(baseline.interest) ||
    TAG_INTEREST_BASE[event.tag] ||
    fallback ||
    70;
  let schedule = Number(baseline.schedule) || Math.max(0, fallback - 5) || 75;
  let proximity =
    Number(baseline.proximity) || Math.max(0, fallback - 10) || 70;
  let social = Number(baseline.social) || Math.max(0, fallback - 15) || 65;

  // Boost from Interested history
  if (event.tag && interested.tags[event.tag]) {
    interest += 8 * interested.tags[event.tag];
  }
  if (event.host && interested.hosts[event.host]) {
    social += 6 * interested.hosts[event.host];
  }
  const cat = String(event.category || "").toLowerCase();
  if (cat && interested.categories[cat]) {
    schedule += 5 * interested.categories[cat];
  }

  // Penalize from Not interested history (similar clutter removal)
  if (event.tag && hidden.tags[event.tag]) {
    interest -= 10 * hidden.tags[event.tag];
  }
  if (event.host && hidden.hosts[event.host]) {
    social -= 7 * hidden.hosts[event.host];
  }

  // Pin: already marked interested
  if (interestedIds.map(String).includes(String(event.id))) {
    interest = Math.max(interest, 92);
    social = Math.max(social, 88);
  }

  interest = clamp(interest);
  schedule = clamp(schedule);
  proximity = clamp(proximity);
  social = clamp(social);

  const score = clamp(
    interest * 0.4 + schedule * 0.3 + proximity * 0.2 + social * 0.1,
  );

  return {
    interest,
    schedule,
    proximity,
    social,
    score,
    match_score: `${score}%`,
    match_breakdown: { interest, schedule, proximity, social },
  };
}

/**
 * Rank + personalize events for the Home feed.
 * Returns top recommendations only (less clutter).
 */
export function recommendEvents({
  events = [],
  preferences = {},
  mode = "focus",
  limit = MAX_RECOMMENDED,
} = {}) {
  const interestedIds = new Set((preferences.interested || []).map(String));
  const hiddenIds = new Set((preferences.hidden || []).map(String));
  const modeKey = String(mode || "focus").toLowerCase();

  const candidates = (events || []).filter(
    (event) => !hiddenIds.has(String(event.id)),
  );

  const scored = candidates.map((event) => {
    const personal = computePersonalizedMatch(event, preferences, events);
    let rank = personal.score;

    if (interestedIds.has(String(event.id))) rank += 1000;
    if (String(event.category || "").toLowerCase() === modeKey) rank += 12;

    // Soft penalty for tags the student rejected often
    const hidden = collectAffinity(events, preferences.hidden || []);
    if (event.tag && hidden.tags[event.tag]) {
      rank -= 15 * hidden.tags[event.tag];
    }

    return {
      ...event,
      match_score: personal.match_score,
      match_breakdown: personal.match_breakdown,
      recommendationScore: rank,
      whyRecommended:
        interestedIds.has(String(event.id))
          ? "You marked this Interested"
          : event.tag && collectAffinity(events, preferences.interested || []).tags[event.tag]
            ? `you liked ${event.tag} events`
            : String(event.category || "").toLowerCase() === modeKey
              ? `it fits your ${modeKey === "balance" ? "Balance" : "Focus"} mode`
              : "it's a strong campus match",
    };
  });

  scored.sort((a, b) => b.recommendationScore - a.recommendationScore);

  const recommended = pickDiverseRecommendations(
    scored,
    Math.max(1, limit),
    modeKey,
  );

  return {
    recommended,
    totalAvailable: candidates.length,
  };
}

export const RECOMMENDATION_LIMIT = MAX_RECOMMENDED;
