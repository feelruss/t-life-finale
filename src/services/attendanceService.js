import { supabase } from "../libs/supabase";

/**
 * Record a student check-in in Supabase `attendance`.
 * Powers Profile "Events Attended" and "Focus Hours".
 */
export async function recordEventAttendance({
  studentId,
  eventId,
  attendanceType = "check-in",
}) {
  if (!studentId || studentId === "guest" || !eventId) {
    return { saved: false, reason: "missing-ids" };
  }

  const { data, error } = await supabase
    .from("attendance")
    .insert({
      student_id: studentId,
      event_id: eventId,
      attendance_type: attendanceType === "check_in" ? "check-in" : attendanceType,
      attended_at: new Date().toISOString(),
    })
    .select("id")
    .maybeSingle();

  if (error) {
    // Ignore duplicate check-ins if a unique constraint exists.
    if (String(error.message || "").toLowerCase().includes("duplicate")) {
      return { saved: true, duplicate: true };
    }
    console.warn("Attendance save failed:", error.message);
    return { saved: false, reason: error.message };
  }

  try {
    window.dispatchEvent(
      new CustomEvent("taylors-attendance-updated", {
        detail: { studentId },
      }),
    );
  } catch {
    /* ignore */
  }

  return { saved: true, row: data };
}
