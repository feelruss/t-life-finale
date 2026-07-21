import {
  getEventPreferences,
  setEventInterested as setLocalInterested,
  setEventHidden as setLocalHidden,
} from "../data/db";

function normalizePrefs(raw) {
  return {
    interested: Array.isArray(raw?.interested) ? raw.interested.map(String) : [],
    hidden: Array.isArray(raw?.hidden) ? raw.hidden.map(String) : [],
  };
}

// Event-card preferences remain local because normalized user_interests stores
// semantic interests, not per-event UI state.
export async function loadEventPreferences(userId) {
  return normalizePrefs(getEventPreferences(userId || "guest"));
}

export async function saveEventInterested(userId, eventId, interested) {
  setLocalInterested(eventId, interested, userId || "guest");
  return normalizePrefs(getEventPreferences(userId || "guest"));
}

export async function saveEventHidden(userId, eventId, hidden) {
  setLocalHidden(eventId, hidden, userId || "guest");
  return normalizePrefs(getEventPreferences(userId || "guest"));
}
