import { supabase } from "../libs/supabase";

const TIMETABLE_SYNC_EVENT = "taylors-timetable-sync-updated";

export async function fetchTimetableSyncSetting(userId) {
  if (!userId || userId === "guest") {
    return false;
  }

  const { data, error } = await supabase
    .from("users")
    .select("timetable_sync_enabled")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(
      error.message || "Unable to load timetable sync setting.",
    );
  }

  return data?.timetable_sync_enabled !== false;
}

export async function updateTimetableSyncSetting(userId, enabled) {
  if (!userId || userId === "guest") {
    throw new Error("You must be logged in to change timetable sync.");
  }

  const nextEnabled = Boolean(enabled);

  const { data, error } = await supabase
    .from("users")
    .update({
      timetable_sync_enabled: nextEnabled,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)
    .select("timetable_sync_enabled")
    .single();

  if (error) {
    throw new Error(
      error.message || "Unable to update timetable sync setting.",
    );
  }

  const savedEnabled = data?.timetable_sync_enabled === true;

  window.dispatchEvent(
    new CustomEvent(TIMETABLE_SYNC_EVENT, {
      detail: {
        studentId: userId,
        enabled: savedEnabled,
      },
    }),
  );

  return savedEnabled;
}

export const timetableSyncEventName = TIMETABLE_SYNC_EVENT;