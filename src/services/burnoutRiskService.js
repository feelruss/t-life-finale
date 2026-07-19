import { supabase } from "../libs/supabase";

// Burnout risk is based only on the weekly imbalance between unique Focus
// and Balance events that a student RSVP'd to and/or attended.
//
// Excess Focus events = max(Focus events - Balance events, 0)
// Risk score          = excess Focus events * 20, capped at 100
//
// Examples:
// 1 Focus, 0 Balance = 20 (Low)
// 2 Focus, 0 Balance = 40 (Medium)
// 3 Focus, 0 Balance = 60 (High)
// 4 Focus, 2 Balance = 40 (Medium)
// 3 Focus, 3 Balance = 0  (Low)

const INCLUDED_RSVP_STATUSES = ["registered", "attended", "no_show"];

const clampScore = (value) =>
  Math.min(100, Math.max(0, Math.round(Number(value) || 0)));

const toDateOnly = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

export const getMondayDate = (date = new Date()) => {
  const monday = new Date(date);
  monday.setHours(0, 0, 0, 0);

  const daysSinceMonday = (monday.getDay() + 6) % 7;
  monday.setDate(monday.getDate() - daysSinceMonday);

  return toDateOnly(monday);
};

const getWeekRange = (selectedWeekStart = null) => {
  const weekStart = selectedWeekStart || getMondayDate();
  const weekStartDate = new Date(`${weekStart}T00:00:00`);

  if (Number.isNaN(weekStartDate.getTime())) {
    throw new Error(`Invalid week start date: ${selectedWeekStart}`);
  }

  // Normalize any supplied date to its Monday.
  const normalizedWeekStart = getMondayDate(weekStartDate);
  const normalizedStartDate = new Date(`${normalizedWeekStart}T00:00:00`);
  const weekEndDate = new Date(normalizedStartDate);
  weekEndDate.setDate(weekEndDate.getDate() + 7);

  return {
    weekStart: normalizedWeekStart,
    weekEnd: toDateOnly(weekEndDate),
    weekStartTimestamp: `${normalizedWeekStart}T00:00:00`,
    weekEndTimestamp: `${toDateOnly(weekEndDate)}T00:00:00`,
  };
};

const getRiskLevel = (riskScore) => {
  if (riskScore >= 60) return "High";
  if (riskScore >= 35) return "Medium";
  return "Low";
};

export const calculateStudentRiskScore = ({
  focusEvents = 0,
  balanceEvents = 0,
}) => {
  const normalizedFocusEvents = Math.max(0, Number(focusEvents) || 0);
  const normalizedBalanceEvents = Math.max(0, Number(balanceEvents) || 0);
  const excessFocusEvents = Math.max(
    0,
    normalizedFocusEvents - normalizedBalanceEvents,
  );
  const riskScore = clampScore(excessFocusEvents * 20);

  return {
    riskScore,
    riskLevel: getRiskLevel(riskScore),
    breakdown: {
      focusEvents: normalizedFocusEvents,
      balanceEvents: normalizedBalanceEvents,
      excessFocusEvents,
      scorePerExcessFocusEvent: 20,
      formula: "max(focusEvents - balanceEvents, 0) * 20",
    },
  };
};

const chunkArray = (items, chunkSize = 200) => {
  const chunks = [];

  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }

  return chunks;
};

const loadRowsForEventIds = async ({ table, select, eventIds }) => {
  if (eventIds.length === 0) return [];

  const results = [];

  for (const eventIdChunk of chunkArray(eventIds)) {
    let query = supabase.from(table).select(select).in("event_id", eventIdChunk);

    if (table === "event_rsvps") {
      query = query.in("status", INCLUDED_RSVP_STATUSES);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Unable to load ${table}: ${error.message}`);
    }

    results.push(...(data || []));
  }

  return results;
};

/**
 * Recalculates burnout scores for one week without writing to Supabase.
 *
 * Only students found in attendance and/or event_rsvps for Focus/Balance
 * events in the selected week are included. The returned rows match the
 * burnout_risk_scores shape so the dashboard can preview them in memory.
 *
 * @param {string|null} selectedWeekStart Monday in YYYY-MM-DD format.
 * @returns {Promise<Array>} Temporary calculated score rows.
 */
export const calculateBurnoutScores = async (selectedWeekStart = null) => {
  const { weekStart, weekEnd } = getWeekRange(selectedWeekStart);

  // Fetch the selected week's qualifying events first. Activity is then
  // filtered by event ID, so an RSVP is assigned to the event's week rather
  // than the date on which the RSVP was created.
  const { data: weeklyEvents, error: eventsError } = await supabase
    .from("campus_events")
    .select("id, category, event_date")
    .gte("event_date", weekStart)
    .lt("event_date", weekEnd)
    .in("category", ["focus", "balance"]);

  if (eventsError) {
    throw new Error(`Unable to load weekly events: ${eventsError.message}`);
  }

  const eventCategoryMap = new Map(
    (weeklyEvents || []).map((event) => [
      String(event.id),
      String(event.category || "").trim().toLowerCase(),
    ]),
  );
  const eventIds = Array.from(eventCategoryMap.keys());

  if (eventIds.length === 0) return [];

  const [attendanceRows, rsvpRows] = await Promise.all([
    loadRowsForEventIds({
      table: "attendance",
      select: "student_id, event_id, attended_at",
      eventIds,
    }),
    loadRowsForEventIds({
      table: "event_rsvps",
      select: "student_id, event_id, status, registered_at",
      eventIds,
    }),
  ]);

  const studentActivityMap = new Map();

  const addActivity = (studentIdValue, eventIdValue, source) => {
    const studentId = String(studentIdValue || "");
    const eventId = String(eventIdValue || "");
    const category = eventCategoryMap.get(eventId);

    if (!studentId || !eventId || !category) return;

    if (!studentActivityMap.has(studentId)) {
      studentActivityMap.set(studentId, {
        studentId,
        focusEventIds: new Set(),
        balanceEventIds: new Set(),
        rsvpEventIds: new Set(),
        attendanceEventIds: new Set(),
      });
    }

    const activity = studentActivityMap.get(studentId);

    if (category === "focus") activity.focusEventIds.add(eventId);
    if (category === "balance") activity.balanceEventIds.add(eventId);

    if (source === "rsvp") activity.rsvpEventIds.add(eventId);
    if (source === "attendance") activity.attendanceEventIds.add(eventId);
  };

  rsvpRows.forEach((row) => addActivity(row.student_id, row.event_id, "rsvp"));
  attendanceRows.forEach((row) =>
    addActivity(row.student_id, row.event_id, "attendance"),
  );

  const calculatedAt = new Date().toISOString();

  return Array.from(studentActivityMap.values()).map((activity) => {
    const focusEvents = activity.focusEventIds.size;
    const balanceEvents = activity.balanceEventIds.size;
    const result = calculateStudentRiskScore({ focusEvents, balanceEvents });

    return {
      student_id: activity.studentId,
      week_start: weekStart,
      risk_score: result.riskScore,
      risk_level: result.riskLevel,
      factors: {
        ...result.breakdown,
        rsvpEvents: activity.rsvpEventIds.size,
        attendedEvents: activity.attendanceEventIds.size,
        uniqueJoinedEvents: new Set([
          ...activity.rsvpEventIds,
          ...activity.attendanceEventIds,
        ]).size,
        weekStart,
        weekEndExclusive: weekEnd,
        calculatedFrom: ["event_rsvps", "attendance"],
        previewOnly: true,
      },
      updated_at: calculatedAt,
    };
  });
};

// Backward-compatible name used by the existing dashboard. Despite the old
// name, this function now calculates only and does not insert, update, or
// delete any burnout_risk_scores rows.
export const calculateAndSaveBurnoutScores = calculateBurnoutScores;
