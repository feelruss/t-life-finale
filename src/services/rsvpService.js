import { supabase } from "../components/GoogleLogin";


/**
 * Notifies React components that RSVP information has changed.
 * SchedulePage listens for this event and reloads the RSVP list.
 */
function dispatchRSVPUpdate(detail = {}) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent("taylors-rsvp-updated", {
      detail,
    }),
  );
}

/**
 * Convert a Supabase RSVP row into the event shape used by the UI.
 */
function mapRSVPRow(row) {
  const event = Array.isArray(row.campus_events)
    ? row.campus_events[0]
    : row.campus_events;

  if (!event) return null;

  return {
    ...event,

    // Keep the RSVP row information separate from the event ID.
    rsvpId: row.id,
    eventId: row.event_id,
    rsvpStatus: row.status,
    registeredAt: row.registered_at,
    cancelledAt: row.cancelled_at,
    checkedInAt: row.checked_in_at,
  };
}

/**
 * Get the signed-in student's upcoming RSVP events.
 */
export async function getUpcomingRSVPEvents(studentId) {
  if (!studentId) return [];

  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("event_rsvps")
    .select(`
      id,
      student_id,
      event_id,
      status,
      registered_at,
      cancelled_at,
      checked_in_at,
      campus_events!event_rsvps_event_id_fkey (*)
    `)
    .eq("student_id", studentId)
    .in("status", ["registered", "waitlisted", "attended"])
    .order("registered_at", { ascending: false });

  if (error) {
    throw new Error(error.message || "Unable to load RSVP events.");
  }

  return (data || [])
    .map(mapRSVPRow)
    .filter(Boolean)
    .filter((event) => {
      // Keep events without dates rather than hiding them.
      if (!event.date) return true;

      return String(event.date).slice(0, 10) >= today;
    })
    .sort((a, b) => {
      const firstDate = String(a.date || "9999-12-31");
      const secondDate = String(b.date || "9999-12-31");

      return firstDate.localeCompare(secondDate);
    });
}

/**
 * Register the signed-in student for an event.
 *
 * Upsert allows a previously cancelled RSVP to become registered again.
 */
export async function registerForEvent({ studentId, eventId }) {
  if (!studentId) {
    throw new Error("You must be logged in before registering.");
  }

  if (!eventId) {
    throw new Error("The event ID is missing.");
  }

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("event_rsvps")
    .upsert(
      {
        student_id: studentId,
        event_id: String(eventId),
        status: "registered",
        registered_at: now,
        cancelled_at: null,
        updated_at: now,
      },
      {
        onConflict: "student_id,event_id",
      },
    )
    .select()
    .single();

  if (error) {
    throw new Error(error.message || "Unable to register for this event.");
  }

  dispatchRSVPUpdate({
    action: "registered",
    studentId,
    eventId: String(eventId),
  });

  return data;
}

/**
 * Cancel an RSVP without deleting its history.
 */
export async function cancelEventRSVP({ studentId, eventId }) {
  if (!studentId || !eventId) {
    throw new Error("Student ID and event ID are required.");
  }

  const { data, error } = await supabase
    .from("event_rsvps")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("student_id", studentId)
    .eq("event_id", String(eventId))
    .select()
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Unable to cancel this RSVP.");
  }

  dispatchRSVPUpdate({
    action: "cancelled",
    studentId,
    eventId: String(eventId),
  });

  return data;
}

/**
 * Check whether a student currently has an active RSVP for an event.
 */
export async function getEventRSVPStatus({ studentId, eventId }) {
  if (!studentId || !eventId) {
    return {
      isRSVPed: false,
      status: null,
      rsvp: null,
    };
  }

  const { data, error } = await supabase
    .from("event_rsvps")
    .select("*")
    .eq("student_id", studentId)
    .eq("event_id", String(eventId))
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Unable to check RSVP status.");
  }

  const activeStatuses = ["registered", "waitlisted", "attended"];

  return {
    isRSVPed: Boolean(data && activeStatuses.includes(data.status)),
    status: data?.status || null,
    rsvp: data || null,
  };
}

/**
 * Get the total number of active registrations for an event.
 */
export async function getEventRegistrationCount(eventId) {
  if (!eventId) return 0;

  const { count, error } = await supabase
    .from("event_rsvps")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("event_id", String(eventId))
    .in("status", ["registered", "waitlisted", "attended"]);

  if (error) {
    throw new Error(error.message || "Unable to count registrations.");
  }

  return count || 0;
}