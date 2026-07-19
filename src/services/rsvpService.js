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

  const match = firstTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);

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

  date.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);

  return date.getTime();
}

/** Strip CLUB- prefix so RSVP IDs match club_events / campus_events rows. */
export function normalizeRSVPEventId(eventId) {
  const raw = String(eventId || "").trim();
  if (!raw) return "";
  return raw.replace(/^CLUB-/i, "");
}

function isInactiveEventStatus(status) {
  return [
    "cancelled",
    "canceled",
    "deleted",
    "rejected",
    "draft",
  ].includes(String(status || "").trim().toLowerCase());
}

function mapCampusRSVPEvent(event, rsvp) {
  return {
    ...event,
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
      event.location || event.venue || event.room || "Location TBC",
    registered: Number(event.registered || 0),
    // capacity 0 / null means "Available" in the UI — still a valid RSVP
    capacity: Number(event.capacity || 0),
    match_score: event.match_score || null,
    match_breakdown: event.match_breakdown || null,
  };
}

function mapClubRSVPEvent(event, rsvp) {
  const club = Array.isArray(event.clubs) ? event.clubs[0] : event.clubs;

  return {
    ...event,
    id: event.id,
    eventId: event.id,
    sourceId: event.id,
    sourceTable: "club_events",
    eventType: "club",
    rsvpId: rsvp.id,
    rsvpStatus: rsvp.status,
    registeredAt: rsvp.registered_at,
    isRSVPd: true,
    title: event.title || "Club Event",
    host: club?.name || event.host || "Taylor's Club",
    date: getCampusEventDate(event),
    time: getCampusEventTime(event),
    location:
      event.location ||
      club?.meeting_location ||
      event.venue ||
      "Location TBC",
    registered: Number(event.registered || 0),
    capacity: Number(event.capacity || 0),
    match_score: event.match_score || null,
    match_breakdown: event.match_breakdown || null,
    description: event.description || club?.description || "",
  };
}

function finalizeRSVPList(mapped) {
  const todayISO = getTodayISO();

  return mapped
    .filter(Boolean)
    .map((item) => {
      const eventDate = getCampusEventDate(item);
      return {
        ...item,
        isPast: Boolean(eventDate && eventDate < todayISO),
        isUndated: !eventDate,
      };
    })
    .sort((eventA, eventB) => {
      const aPast = eventA.isPast ? 1 : 0;
      const bPast = eventB.isPast ? 1 : 0;
      if (aPast !== bPast) return aPast - bPast;
      return getEventTimestamp(eventA) - getEventTimestamp(eventB);
    });
}

export async function getStudentRSVP(studentId, eventId) {
  if (!studentId || !eventId) {
    return null;
  }

  const { data, error } = await supabase
    .from("event_rsvps")
    .select("*")
    .eq("student_id", studentId)
    .eq("event_id", normalizeRSVPEventId(eventId))
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

  const normalizedEventId = normalizeRSVPEventId(eventId);

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
        event_id: normalizedEventId,
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
          eventId: normalizedEventId,
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

  const normalizedEventId = normalizeRSVPEventId(eventId);
  const cancelledAt = new Date().toISOString();

  const { data, error } = await supabase
    .from("event_rsvps")
    .update({
      status: "cancelled",
      cancelled_at: cancelledAt,
      updated_at: cancelledAt,
    })
    .eq("student_id", studentId)
    .eq("event_id", normalizedEventId)
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
          eventId: normalizedEventId,
          eventTitle: _eventTitle || null,
        },
      }),
    );
  }

  return data;
}

/**
 * Load RSVPs and hydrate from campus_events AND club_events.
 * Capacity is irrelevant — events with capacity 0 ("Available") still appear.
 */
export async function getUpcomingRSVPEvents(studentId) {
  if (!studentId) {
    return [];
  }

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
        updated_at
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

  const rsvps = data || [];
  if (rsvps.length === 0) {
    return [];
  }

  const eventIds = [
    ...new Set(
      rsvps
        .map((row) => normalizeRSVPEventId(row.event_id))
        .filter(Boolean),
    ),
  ];

  const [campusResult, clubResult] = await Promise.allSettled([
    supabase.from("campus_events").select("*").in("id", eventIds),
    supabase
      .from("club_events")
      .select("*, clubs(name, category, description, logo, meeting_location)")
      .in("id", eventIds),
  ]);

  const campusById = new Map();
  const clubById = new Map();

  if (campusResult.status === "fulfilled" && !campusResult.value.error) {
    for (const row of campusResult.value.data || []) {
      campusById.set(String(row.id), row);
    }
  } else if (campusResult.status === "fulfilled" && campusResult.value.error) {
    console.warn(
      "campus_events hydrate for RSVPs failed:",
      campusResult.value.error.message,
    );
  }

  if (clubResult.status === "fulfilled" && !clubResult.value.error) {
    for (const row of clubResult.value.data || []) {
      clubById.set(String(row.id), row);
    }
  } else if (clubResult.status === "fulfilled" && clubResult.value.error) {
    console.warn(
      "club_events hydrate for RSVPs failed:",
      clubResult.value.error.message,
    );
  }

  const mapped = rsvps.map((rsvp) => {
    const eventId = normalizeRSVPEventId(rsvp.event_id);
    const campusEvent = campusById.get(eventId);
    if (campusEvent) {
      if (isInactiveEventStatus(campusEvent.status)) return null;
      return mapCampusRSVPEvent(campusEvent, rsvp);
    }

    const clubEvent = clubById.get(eventId);
    if (clubEvent) {
      if (isInactiveEventStatus(clubEvent.status)) return null;
      return mapClubRSVPEvent(clubEvent, rsvp);
    }

    // Keep a minimal card so RSVPs never disappear when the join misses.
    // Leave sourceTable empty so local/schedule merge can fill club vs campus.
    return {
      id: eventId,
      eventId,
      sourceId: eventId,
      sourceTable: "",
      eventType: "campus",
      rsvpId: rsvp.id,
      rsvpStatus: rsvp.status,
      registeredAt: rsvp.registered_at,
      isRSVPd: true,
      title: "Registered event",
      host: "Campus Event",
      date: "",
      time: "",
      location: "Location TBC",
      capacity: 0,
      registered: 0,
    };
  });

  return finalizeRSVPList(mapped);
}
