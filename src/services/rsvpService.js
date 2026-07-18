// This is the src/services/rsvpService.js file
import { supabase } from "../libs/supabase";

function getTodayISO() {
  const now = new Date();

  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}

function normalizeDate(value) {
  if (!value) return "";

  return String(value).slice(0, 10);
}

function getCampusEventDate(event) {
  return normalizeDate(
    event?.date ||
      event?.event_date ||
      event?.start_date ||
      event?.start_at,
  );
}

function getCampusEventTime(event) {
  return (
    event?.time ||
    event?.event_time ||
    event?.time_range ||
    event?.start_time ||
    ""
  );
}

function getStartMinutes(value) {
  if (!value) return 0;

  const firstTime = String(value)
    .split(" - ")[0]
    .trim();

  if (/^\d{1,2}:\d{2}/.test(firstTime) && !/[AP]M/i.test(firstTime)) {
    const [hours, minutes] = firstTime.split(":").map(Number);

    return (hours || 0) * 60 + (minutes || 0);
  }

  const match = firstTime.match(
    /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i,
  );

  if (!match) return 0;

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const period = match[3].toUpperCase();

  hours %= 12;

  if (period === "PM") {
    hours += 12;
  }

  return hours * 60 + minutes;
}

function getEventTimestamp(event) {
  const eventDate = getCampusEventDate(event);

  if (!eventDate) {
    return Number.MAX_SAFE_INTEGER;
  }

  const date = new Date(`${eventDate}T00:00:00`);
  const minutes = getStartMinutes(getCampusEventTime(event));

  date.setHours(
    Math.floor(minutes / 60),
    minutes % 60,
    0,
    0,
  );

  return date.getTime();
}

function mapRSVPEvent(event, rsvp) {
  return {
    ...event,

    // Keep the real campus_events ID.
    id: event.id,
    eventId: event.id,
    sourceId: event.id,
    sourceTable: "campus_events",
    eventType: "campus",

    rsvpId: rsvp.id,
    rsvpStatus: rsvp.status,
    registeredAt: rsvp.registered_at,
    isRSVPd: true,

    title: event.title || "Campus Event",

    host:
      event.host ||
      event.organizer ||
      event.organizer_name ||
      "Campus Event",

    date: getCampusEventDate(event),
    time: getCampusEventTime(event),

    location:
      event.location ||
      event.venue ||
      event.room ||
      "Location TBC",

    registered: Number(event.registered || 0),
    capacity: Number(event.capacity || 0),
  };
}

export async function getStudentRSVP(studentId, eventId) {
  if (!studentId || !eventId) {
    return null;
  }

  const { data, error } = await supabase
    .from("event_rsvps")
    .select("*")
    .eq("student_id", studentId)
    .eq("event_id", String(eventId))
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function registerForEvent({
  studentId,
  eventId,
  eventTitle: _eventTitle,
  skipActivity: _skipActivity = false,
}) {
  if (!studentId) {
    throw new Error("Student ID is required.");
  }

  if (!eventId) {
    throw new Error("Event ID is required.");
  }

  /*
   * Your table has a unique constraint on student_id + event_id.
   *
   * Upsert allows a previously cancelled RSVP to become registered again.
   */
  const { data, error } = await supabase
    .from("event_rsvps")
    .upsert(
      {
        student_id: studentId,
        event_id: String(eventId),
        status: "registered",
        registered_at: new Date().toISOString(),
        cancelled_at: null,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "student_id,event_id",
      },
    )
    .select()
    .single();

  if (error) {
    console.error("Unable to register for event:", error);
    throw error;
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("taylors-rsvp-updated", {
        detail: {
          action: "registered",
          studentId,
          eventId: String(eventId),
          eventTitle: _eventTitle || null,
        },
      }),
    );
  }

  return data;
}

export async function cancelEventRSVP({
  studentId,
  eventId,
  eventTitle: _eventTitle,
  skipActivity: _skipActivity = false,
}) {
  if (!studentId || !eventId) {
    throw new Error("Student ID and event ID are required.");
  }

  const cancelledAt = new Date().toISOString();

  const { data, error } = await supabase
    .from("event_rsvps")
    .update({
      status: "cancelled",
      cancelled_at: cancelledAt,
      updated_at: cancelledAt,
    })
    .eq("student_id", studentId)
    .eq("event_id", String(eventId))
    .select()
    .single();

  if (error) {
    console.error("Unable to cancel RSVP:", error);
    throw error;
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("taylors-rsvp-updated", {
        detail: {
          action: "cancelled",
          studentId,
          eventId: String(eventId),
          eventTitle: _eventTitle || null,
        },
      }),
    );
  }

  return data;
}

export async function getUpcomingRSVPEvents(studentId) {
  if (!studentId) {
    return [];
  }

  const todayISO = getTodayISO();

  /*
   * Use the foreign-key relationship to fetch campus_events directly.
   *
   * event_rsvps_event_id_fkey is the relationship name created by
   * your Supabase schema.
   */
  const { data, error } = await supabase
    .from("event_rsvps")
    .select(
      `
        id,
        student_id,
        event_id,
        status,
        registered_at,
        cancelled_at,
        created_at,
        updated_at,
        campus_events!event_rsvps_event_id_fkey (*)
      `,
    )
    .eq("student_id", studentId)
    .in("status", ["registered", "waitlisted"])
    .is("cancelled_at", null)
    .order("registered_at", {
      ascending: false,
    });

  if (error) {
    console.error("Unable to load upcoming RSVP events:", error);
    throw error;
  }

  const upcomingEvents = (data || [])
    .map((rsvp) => {
      /*
       * Depending on the generated Supabase relationship, this can
       * be returned as an object or an array.
       */
      const relatedEvent = Array.isArray(rsvp.campus_events)
        ? rsvp.campus_events[0]
        : rsvp.campus_events;

      if (!relatedEvent) {
        return null;
      }

      const eventDate = getCampusEventDate(relatedEvent);

      const eventStatus = String(
        relatedEvent.status || "",
      )
        .trim()
        .toLowerCase();

      if (
        [
          "cancelled",
          "canceled",
          "deleted",
          "rejected",
          "draft",
        ].includes(eventStatus)
      ) {
        return null;
      }

      const mapped = mapRSVPEvent(relatedEvent, rsvp);
      if (!mapped) return null;

      // Keep dated-past events visible so demo RSVPs still show up.
      mapped.isPast = Boolean(eventDate && eventDate < todayISO);
      mapped.isUndated = !eventDate;
      return mapped;
    })
    .filter(Boolean)
    .sort((eventA, eventB) => {
      // Upcoming / undated first, then past.
      const aPast = eventA.isPast ? 1 : 0;
      const bPast = eventB.isPast ? 1 : 0;
      if (aPast !== bPast) return aPast - bPast;
      return getEventTimestamp(eventA) - getEventTimestamp(eventB);
    });

  return upcomingEvents;
}