import { supabase } from "../libs/supabase";
import {
  getEventPreferences,
  setEventInterested as setLocalInterested,
  setEventHidden as setLocalHidden,
} from "../data/db";

function normalizePrefs(raw) {
  return {
    interested: Array.isArray(raw?.interested)
      ? raw.interested.map(String)
      : [],
    hidden: Array.isArray(raw?.hidden) ? raw.hidden.map(String) : [],
  };
}

function scopedPrefsKey(userKey) {
  return `taylors_event_preferences:${String(userKey || "guest")
    .trim()
    .toLowerCase()}`;
}

function mirrorLocal(userId, prefs) {
  try {
    const key = scopedPrefsKey(userId);
    localStorage.setItem(key, JSON.stringify(normalizePrefs(prefs)));
    window.dispatchEvent(
      new CustomEvent("taylors-db-updated", { detail: { key } }),
    );
  } catch {
    /* ignore */
  }
}

function extractPrefsFromInterests(interests) {
  if (!interests || Array.isArray(interests)) return null;
  if (typeof interests === "object" && interests.eventPreferences) {
    return normalizePrefs(interests.eventPreferences);
  }
  return null;
}

function mergeInterestsPayload(existing, prefs) {
  if (Array.isArray(existing)) {
    return {
      profileTags: existing,
      eventPreferences: normalizePrefs(prefs),
    };
  }
  if (existing && typeof existing === "object") {
    return {
      ...existing,
      eventPreferences: normalizePrefs(prefs),
    };
  }
  return { eventPreferences: normalizePrefs(prefs) };
}

/**
 * Load prefs: merge cloud (users.interests.eventPreferences) with localStorage.
 */
export async function loadEventPreferences(userId) {
  const local = normalizePrefs(getEventPreferences(userId || "guest"));
  if (!userId || userId === "guest") return local;

  try {
    const { data, error } = await supabase
      .from("users")
      .select("interests")
      .eq("id", userId)
      .maybeSingle();

    if (error) throw error;

    const cloud = extractPrefsFromInterests(data?.interests);
    if (!cloud) return local;

    const merged = {
      interested: [
        ...new Set([...(cloud.interested || []), ...(local.interested || [])]),
      ],
      hidden: [
        ...new Set([...(cloud.hidden || []), ...(local.hidden || [])]),
      ],
    };

    mirrorLocal(userId, merged);
    return merged;
  } catch (error) {
    console.warn("Cloud event prefs load failed:", error?.message || error);
    return local;
  }
}

async function persistCloud(userId, prefs) {
  if (!userId || userId === "guest") return { saved: false };

  const { data, error } = await supabase
    .from("users")
    .select("interests")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;

  const payload = mergeInterestsPayload(data?.interests, prefs);

  const { error: updateError } = await supabase
    .from("users")
    .update({
      interests: payload,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (updateError) throw updateError;
  return { saved: true };
}

export async function saveEventInterested(userId, eventId, interested) {
  setLocalInterested(eventId, interested, userId || "guest");
  const prefs = normalizePrefs(getEventPreferences(userId || "guest"));
  try {
    await persistCloud(userId, prefs);
  } catch (error) {
    console.warn("Cloud interested sync failed:", error?.message || error);
  }
  return prefs;
}

export async function saveEventHidden(userId, eventId, hidden) {
  setLocalHidden(eventId, hidden, userId || "guest");
  const prefs = normalizePrefs(getEventPreferences(userId || "guest"));
  try {
    await persistCloud(userId, prefs);
  } catch (error) {
    console.warn("Cloud hidden sync failed:", error?.message || error);
  }
  return prefs;
}
