// This is the src/pages/Profile.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { LogOut } from "lucide-react";
import PrivacyDashboard from "../components/PrivacyDashboard";
import {
  getEventCheckIns,
  getClubMemberships,
  getUserActivity,
} from "../data/db";
import { events } from "../data/events";
import { clubs } from "../data/clubs";
import { supabase } from "../libs/supabase";
import { fetchStudentActivity } from "../services/studentActivityService";

const parseDurationHours = (timeRange) => {
  if (!timeRange || !timeRange.includes(" - ")) return 0;
  const toMinutes = (token) => {
    const [clock, period] = token.trim().split(" ");
    const [h, m] = clock.split(":").map(Number);
    let hour24 = h % 12;
    if (period === "PM") hour24 += 12;
    return hour24 * 60 + m;
  };
  const [start, end] = timeRange.split(" - ");
  const diff = toMinutes(end) - toMinutes(start);
  return diff > 0 ? diff / 60 : 0;
};

const getCampusEventDurationHours = (event) => {
  if (!event) return 1;

  // Use a stored numeric duration when available.
  const storedDuration = Number(
    event.duration_hours ?? event.duration ?? event.focus_hours,
  );

  if (Number.isFinite(storedDuration) && storedDuration > 0) {
    return storedDuration;
  }

  // Supports a value such as "10:00 AM - 12:00 PM".
  if (event.time) {
    const parsedDuration = parseDurationHours(event.time);

    if (parsedDuration > 0) {
      return parsedDuration;
    }
  }

  // Supports separate start/end timestamp or time columns.
  const startValue =
    event.start_time ??
    event.starts_at ??
    event.start_at ??
    event.start_datetime;

  const endValue =
    event.end_time ?? event.ends_at ?? event.end_at ?? event.end_datetime;

  if (startValue && endValue) {
    const start = new Date(startValue);
    const end = new Date(endValue);

    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
      const duration = (end.getTime() - start.getTime()) / 3_600_000;

      if (duration > 0) {
        return duration;
      }
    }
  }

  // Default duration when an event has no usable duration information.
  return 1;
};

const ACTIVITY_ICONS = {
  checkin: "✅",
  uncheckin: "↩️",
  rsvp: "🎟️",
  "rsvp-remove": "🗑️",
  "club-join": "🤝",
  "club-leave": "👋",
};

const formatActivityTime = (timestamp) => {
  if (!timestamp) return "";

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en-MY", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

export default function Profile({
  mode,
  onLogout,
  displayName = "Student",
  email = "",
  userKey = "guest",
  programme = "",
}) {
  const dataRef = useRef(null);
  const [stats, setStats] = useState({
    eventsAttended: 0,
    focusHours: 0,
    clubsJoined: 0,
  });

  const [statsLoading, setStatsLoading] = useState(true);

  const [activity, setActivity] = useState([]);
  const [timetableSyncEnabled, setTimetableSyncEnabled] = useState(false);
  const [timetableSyncLoading, setTimetableSyncLoading] = useState(true);
  const [timetableSyncSaving, setTimetableSyncSaving] = useState(false);
  const [timetableSyncError, setTimetableSyncError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const refreshStats = async () => {
      setStatsLoading(true);

      try {
        if (!userKey || userKey === "guest") {
          if (!cancelled) {
            setStats({
              eventsAttended: 0,
              focusHours: 0,
              clubsJoined: 0,
            });
            setActivity([]);
          }
          return;
        }

        const [attendanceResult, clubsResult] = await Promise.all([
          supabase
            .from("attendance")
            .select(`
              id,
              event_id,
              student_id,
              attended_at,
              attendance_type,
              campus_events!attendance_event_id_fkey (*)
            `)
            .eq("student_id", userKey),

          supabase
            .from("club_members")
            .select("id", {
              count: "exact",
              head: true,
            })
            .eq("student_id", userKey),
        ]);

        if (attendanceResult.error) throw attendanceResult.error;
        if (clubsResult.error) throw clubsResult.error;

        const attendanceRows = attendanceResult.data || [];
        const eventsAttended = attendanceRows.length;

        const totalFocusHours = attendanceRows.reduce(
          (total, attendanceRow) => {
            const relatedEvent = Array.isArray(attendanceRow.campus_events)
              ? attendanceRow.campus_events[0]
              : attendanceRow.campus_events;

            return total + getCampusEventDurationHours(relatedEvent);
          },
          0,
        );

        if (cancelled) return;

        const supabaseActivity = await fetchStudentActivity(userKey, 5);

        if (cancelled) return;

        setStats({
          eventsAttended,
          focusHours: Math.round(totalFocusHours * 10) / 10,
          clubsJoined: clubsResult.count || 0,
        });
        setActivity(supabaseActivity);
      } catch (error) {
        if (cancelled) return;

        console.error("Unable to load profile statistics from Supabase:", error);

        const localLogs = getEventCheckIns(userKey);
        const eventDurationMap = Object.fromEntries(
          events.map((event) => [
            String(event.id),
            parseDurationHours(event.time) || 1,
          ]),
        );
        const localFocusHours = localLogs.reduce((total, log) => {
          const eventId = String(log.eventId || "");
          return total + (eventDurationMap[eventId] || 1);
        }, 0);
        const defaultClubIds = clubs
          .filter((club) => club.isJoined)
          .map((club) => club.id);

        setStats({
          eventsAttended: localLogs.length,
          focusHours: Math.round(localFocusHours * 10) / 10,
          clubsJoined: getClubMemberships(defaultClubIds).length,
        });
        setActivity(getUserActivity(userKey, 5));
      } finally {
        if (!cancelled) setStatsLoading(false);
      }
    };

    const refreshActivityOnly = async () => {
      if (!userKey || userKey === "guest") {
        if (!cancelled) setActivity([]);
        return;
      }

      try {
        const supabaseActivity = await fetchStudentActivity(userKey, 5);
        if (!cancelled) setActivity(supabaseActivity);
      } catch (activityError) {
        console.error("Unable to load recent activity from Supabase:", activityError);
        if (!cancelled) setActivity(getUserActivity(userKey, 5));
      }
    };

    const handleDataUpdate = () => {
      void refreshActivityOnly();
    };

    const handleAttendanceUpdate = (event) => {
      const updatedStudentId = event?.detail?.studentId;
      if (updatedStudentId && String(updatedStudentId) !== String(userKey)) return;
      void refreshStats();
    };

    const handleClubMembershipUpdate = (event) => {
      const updatedStudentId = event?.detail?.studentId;
      if (updatedStudentId && String(updatedStudentId) !== String(userKey)) return;
      void refreshStats();
    };

    const handleRSVPUpdate = (event) => {
      const updatedStudentId = event?.detail?.studentId;
      if (updatedStudentId && String(updatedStudentId) !== String(userKey)) return;
      void refreshActivityOnly();
    };

    void refreshStats();

    window.addEventListener("taylors-db-updated", handleDataUpdate);
    window.addEventListener("taylors-attendance-updated", handleAttendanceUpdate);
    window.addEventListener(
      "taylors-club-membership-updated",
      handleClubMembershipUpdate,
    );
    window.addEventListener("taylors-rsvp-updated", handleRSVPUpdate);

    return () => {
      cancelled = true;
      window.removeEventListener("taylors-db-updated", handleDataUpdate);
      window.removeEventListener(
        "taylors-attendance-updated",
        handleAttendanceUpdate,
      );
      window.removeEventListener(
        "taylors-club-membership-updated",
        handleClubMembershipUpdate,
      );
      window.removeEventListener("taylors-rsvp-updated", handleRSVPUpdate);
    };
  }, [userKey]);


  const profileInitial = useMemo(
    () => (displayName?.[0] || "S").toUpperCase(),
    [displayName],
  );


  const handleLogoutClick = () => {
    onLogout?.();
  };

  return (
    <div className="p-6 pb-24">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Student Profile</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              dataRef.current?.scrollIntoView({ behavior: "smooth" })
            }
            className="px-4 py-2 bg-taylor-red hover:bg-taylor-red-light text-white text-sm font-medium rounded-lg transition-colors"
          >
            My Data
          </button>
          <button
            type="button"
            onClick={handleLogoutClick}
            className="flex items-center gap-1.5 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 text-sm font-medium rounded-lg transition-all duration-200 border border-red-500/20"
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Profile Card */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-taylor-red to-[#8a1525] flex items-center justify-center text-3xl font-bold text-white flex-shrink-0">
            {profileInitial}
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-white truncate">
              {displayName}
            </h2>

            <p className="mt-1 text-xs text-gray-500 break-all">
              {email || "Email not available"}
            </p>

            <p className="mt-1 text-sm text-gray-400">
              {programme || "Programme not available"}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {/* Events Attended */}
        <div className="min-w-0 bg-white/5 border border-white/10 rounded-xl p-3">
          <p className="min-h-8 text-[11px] leading-4 text-gray-400">
            Events Attended
          </p>

          <div className="mt-1 min-h-8 flex items-center">
            {statsLoading ? (
              <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white/10 border-t-taylor-red" />
            ) : (
              <p className="text-2xl font-bold text-white">
                {stats.eventsAttended}
              </p>
            )}
          </div>
        </div>

        {/* Focus Hours */}
        <div className="min-w-0 bg-white/5 border border-white/10 rounded-xl p-3">
          <p className="min-h-8 text-[11px] leading-4 text-gray-400">
            Focus Hours
          </p>

          <div className="mt-1 min-h-8 flex items-center">
            {statsLoading ? (
              <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white/10 border-t-taylor-red" />
            ) : (
              <p className="text-2xl font-bold text-white">
                {stats.focusHours}
                <span className="ml-0.5 text-sm font-medium text-gray-400">
                  h
                </span>
              </p>
            )}
          </div>
        </div>

        {/* Clubs Joined */}
        <div className="min-w-0 bg-white/5 border border-white/10 rounded-xl p-3">
          <p className="min-h-8 text-[11px] leading-4 text-gray-400">
            Clubs Joined
          </p>

          <div className="mt-1 min-h-8 flex items-center">
            {statsLoading ? (
              <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white/10 border-t-taylor-red" />
            ) : (
              <p className="text-2xl font-bold text-taylor-red-light">
                {stats.clubsJoined}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white">Recent Changes</h3>
          <span className="text-[10px] text-gray-500">Last 5 actions</span>
        </div>
        {activity.length > 0 ? (
          <div className="space-y-2">
            {activity.map((entry) => (
              <div
                key={entry.id}
                className="rounded-lg bg-white/5 border border-white/5 px-3 py-2.5"
              >
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 text-sm" aria-hidden="true">
                    {ACTIVITY_ICONS[entry.type] || "•"}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-xs text-white font-medium">
                        {entry.title}
                      </p>
                      <span className="shrink-0 text-[9px] text-gray-600">
                        {formatActivityTime(entry.timestamp)}
                      </span>
                    </div>
                    {entry.detail && (
                      <p className="mt-0.5 text-[10px] text-gray-400">
                        {entry.detail}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-500">
            No activity yet. Try checking in to an event.
          </p>
        )}
      </div>


      {/* My Data Section */}
      <div ref={dataRef} className="rounded-2xl p-6 bg-[#0a0506]">
        <PrivacyDashboard displayName={displayName} userKey={userKey} />
      </div>
    </div>
  );
}
