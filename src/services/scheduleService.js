import { supabase } from "../components/GoogleLogin";

const DAY_ORDER = {
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
  Sunday: 7,
};

function formatTime(timeValue) {
  if (!timeValue) return "";

  const [hourValue, minuteValue] = timeValue.split(":");
  const hour = Number(hourValue);
  const minute = Number(minuteValue);

  const date = new Date();
  date.setHours(hour, minute, 0, 0);

  return date.toLocaleTimeString("en-MY", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function mapScheduleRow(row) {
  return {
    id: row.id,
    studentId: row.student_id,
    programme: row.programme,
    semester: row.semester,
    academicYear: row.academic_year,
    moduleCode: row.module_code,
    subject: row.subject,
    day: row.day_of_week,
    startTime: row.start_time,
    endTime: row.end_time,
    time: `${formatTime(row.start_time)} - ${formatTime(row.end_time)}`,
    type: "class",
    classType: row.class_type,
    room: row.room,
    zone: row.zone,
    lecturer: row.lecturer,
  };
}

function getProgrammeCandidates(programme) {
  const value = String(programme || "").trim();
  if (!value) return [];

  const candidates = new Set([value]);
  candidates.add(value.replace(/\(Hons\.\)/gi, "(Honours)"));
  candidates.add(value.replace(/\(Honours\)/gi, "(Hons.)"));
  return [...candidates].filter(Boolean);
}

export async function getStudentSchedule({ studentId = null, programme = "" } = {}) {
  // Prefer rows assigned directly to the logged-in student.
  if (studentId) {
    const { data: personalRows, error: personalError } = await supabase
      .from("student_schedule")
      .select("*")
      .eq("student_id", studentId)
      .order("start_time", { ascending: true });

    if (personalError) {
      console.error("Failed to load personal student schedule:", personalError);
      throw personalError;
    }

    if ((personalRows ?? []).length > 0) {
      return personalRows
        .map(mapScheduleRow)
        .sort((a, b) => {
          const dayDifference = DAY_ORDER[a.day] - DAY_ORDER[b.day];
          return dayDifference !== 0
            ? dayDifference
            : a.startTime.localeCompare(b.startTime);
        });
    }
  }

  const programmeCandidates = getProgrammeCandidates(programme);
  if (programmeCandidates.length === 0) return [];

  // Fall back to shared mock rows for the user's programme.
  const { data, error } = await supabase
    .from("student_schedule")
    .select("*")
    .is("student_id", null)
    .in("programme", programmeCandidates)
    .order("start_time", { ascending: true });

  if (error) {
    console.error("Failed to load programme schedule:", error);
    throw error;
  }

  return (data ?? [])
    .map(mapScheduleRow)
    .sort((a, b) => {
      const dayDifference = DAY_ORDER[a.day] - DAY_ORDER[b.day];

      if (dayDifference !== 0) {
        return dayDifference;
      }

      return a.startTime.localeCompare(b.startTime);
    });
}

export function groupScheduleByDay(scheduleRows) {
  const weeklySchedule = {
    Monday: [],
    Tuesday: [],
    Wednesday: [],
    Thursday: [],
    Friday: [],
    Saturday: [],
    Sunday: [],
  };

  scheduleRows.forEach((scheduleItem) => {
    if (weeklySchedule[scheduleItem.day]) {
      weeklySchedule[scheduleItem.day].push(scheduleItem);
    }
  });

  return weeklySchedule;
}

function toMinutes(timeValue) {
  const [hours, minutes] = String(timeValue || "00:00").split(":").map(Number);
  return hours * 60 + minutes;
}

function toDatabaseTime(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;
}

export function addDetectedFreeSlots(weeklySchedule, dayStart = "00:00", dayEnd = "23:59") {
  const startBoundary = toMinutes(dayStart);
  const endBoundary = toMinutes(dayEnd);
  const result = {};

  Object.entries(weeklySchedule).forEach(([day, items]) => {
    const classes = [...items].sort((a, b) => a.startTime.localeCompare(b.startTime));
    const slots = [];
    let cursor = startBoundary;

    classes.forEach((item, index) => {
      const classStart = toMinutes(item.startTime);
      const classEnd = toMinutes(item.endTime);

      if (classStart > cursor) {
        const startTime = toDatabaseTime(cursor);
        const endTime = toDatabaseTime(classStart);
        slots.push({
          id: `FREE-${day}-${index}-${startTime}`,
          subject: "Free Slot",
          type: "free",
          classType: "Free",
          startTime,
          endTime,
          time: `${formatTime(startTime)} - ${formatTime(endTime)}`,
          room: null,
          zone: null,
          lecturer: null,
        });
      }

      slots.push(item);
      cursor = Math.max(cursor, classEnd);
    });

    if (cursor < endBoundary) {
      const startTime = toDatabaseTime(cursor);
      const endTime = toDatabaseTime(endBoundary);
      slots.push({
        id: `FREE-${day}-END-${startTime}`,
        subject: "Free Slot",
        type: "free",
        classType: "Free",
        startTime,
        endTime,
        time: `${formatTime(startTime)} - ${formatTime(endTime)}`,
        room: null,
        zone: null,
        lecturer: null,
      });
    }

    result[day] = slots;
  });

  return result;
}
