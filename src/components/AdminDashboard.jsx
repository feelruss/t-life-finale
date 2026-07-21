// This is the src/components/AdminDashboard.jsx file
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { supabase } from "../libs/supabase";
import {
  BarChart3,
  Users,
  Calendar,
  TrendingUp,
  AlertTriangle,
  Plus,
  Edit3,
  Trash2,
  Eye,
  Shield,
  Activity,
  ChevronRight,
  X,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Star,
  Zap,
} from "lucide-react";
import { adminAnalytics, roles } from "../data/admin";
import { getAdmins, createAdmin } from "../data/db";
import { buildBaselineMatchScores } from "../services/eventRecommendationService";
import { createAdminAccount, getAdminUsers } from "../services/adminService";
import AdminAIWellnessWidget from "./AdminAIWellnessWidget";
import {
  calculateBurnoutScores,
  getMondayDate,
} from "../services/burnoutRiskService";

const EVENT_TAGS = [
  "Technology",
  "Career",
  "Wellness",
  "Social",
  "Creative",
  "Academic",
];

const TAG_CHIP_STYLES = {
  Technology: {
    idle: "border-sky-400/40 bg-sky-500/15 text-sky-100",
    active:
      "border-sky-300 bg-sky-500/35 text-white shadow-[0_0_0_1px_rgba(56,189,248,0.35)]",
  },
  Career: {
    idle: "border-amber-400/40 bg-amber-500/15 text-amber-100",
    active:
      "border-amber-300 bg-amber-500/35 text-white shadow-[0_0_0_1px_rgba(251,191,36,0.35)]",
  },
  Wellness: {
    idle: "border-teal-400/40 bg-teal-500/15 text-teal-100",
    active:
      "border-teal-300 bg-teal-500/35 text-white shadow-[0_0_0_1px_rgba(45,212,191,0.35)]",
  },
  Social: {
    idle: "border-pink-400/40 bg-pink-500/15 text-pink-100",
    active:
      "border-pink-300 bg-pink-500/35 text-white shadow-[0_0_0_1px_rgba(244,114,182,0.35)]",
  },
  Creative: {
    idle: "border-violet-400/40 bg-violet-500/15 text-violet-100",
    active:
      "border-violet-300 bg-violet-500/35 text-white shadow-[0_0_0_1px_rgba(167,139,250,0.35)]",
  },
  Academic: {
    idle: "border-rose-400/40 bg-rose-500/15 text-rose-100",
    active:
      "border-rose-300 bg-rose-500/35 text-white shadow-[0_0_0_1px_rgba(251,113,133,0.35)]",
  },
};

const FieldLabel = ({ children, hint }) => (
  <div className="mb-1.5 flex items-center justify-between gap-2">
    <label className="text-[10px] font-inter font-semibold uppercase tracking-wider text-gray-400">
      {children}
    </label>
    {hint ? (
      <span className="text-[9px] font-inter text-gray-500">{hint}</span>
    ) : null}
  </div>
);

const emptyEvent = {
  title: "",
  host: "",
  date: "",
  time: "",
  location: "",
  category: "focus",
  capacity: 50,
  description: "",
  zone: "Block D",
  tag: "Technology",
  emoji: "📚",
  registered: 0,
};

const hasSupabaseConfig = Boolean(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY,
);

const MOCK_TOTAL_STUDENTS = 0; // Fake baseline students
const MOCK_ACTIVE_TODAY = 250; // Fake baseline active today

// Fake baseline students for Faculty Risk Breakdown
const MOCK_FACULTY_STUDENTS = {
  Business: 0,
  Communication: 0,
  Computing: 0,
  "General Studies": 0,
  Hospitality: 0,
};

const toSupabaseRow = (event, creator = null) => {
  const baseline = buildBaselineMatchScores(event);

  return {
    title: event.title,
    host: event.host,
    event_date: event.date || null,
    event_time: event.time || null,
    location: event.location || null,
    zone: event.zone || null,
    category: event.category || "focus",
    capacity: Number(event.capacity) || 0,
    registered: Number(event.registered) || 0,
    description: event.description || null,
    tag: event.tag || "Technology",
    emoji: event.emoji || "📚",
    // Always recalculate so retagging Topic/Mode updates student %s.
    match_score: baseline.match_score,
    match_breakdown: baseline.match_breakdown,
    ...(creator && {
      created_by_id: creator.id,
      created_by_name: creator.name,
      created_by_role: creator.role,
    }),
  };
};

const fromSupabaseEvent = (row) => ({
  id: row.id,
  title: row.title,
  host: row.host,
  time: row.event_time || "",
  date: row.event_date || "",
  location: row.location || "",
  zone: row.zone || "",
  category: row.category || "focus",
  match_score: row.match_score || "—",
  match_breakdown: row.match_breakdown || {},
  friends_attending: row.friends_attending || 0,
  friendNames: row.friend_names || [],
  description: row.description || "",
  icon: row.icon || "CalendarIcon",
  accent: row.accent || "#E31837",
  tag: row.tag || "General",
  emoji: row.emoji || "📚",
  tgcTags: row.tgc_tags || [],
  shineTags: row.shine_tags || [],
  capacity: row.capacity || 0,
  registered: row.registered || 0,
  isRSVPd: row.is_rsvpd || false,
  accessibility: row.accessibility || [],
  createdById: row.created_by_id || "",
  createdByName: row.created_by_name || "",
  createdByRole: row.created_by_role || "",
  createdAt: row.created_at || "",
  updatedAt: row.updated_at || row.created_at || "",
});

const sortNewestFirst = (list) =>
  [...list].sort(
    (a, b) =>
      new Date(b.updatedAt || b.createdAt || 0) -
      new Date(a.updatedAt || a.createdAt || 0),
  );

// Simple bar chart component
function MiniBarChart({ data, dataKeyA, dataKeyB, labelKey, height = 120 }) {
  const maxVal = Math.max(
    0,
    ...data.map((d) =>
      Math.max(Number(d[dataKeyA] || 0), Number(d[dataKeyB] || 0)),
    ),
  );

  return (
    // New: Added gap between Y-axis and bars, and adjusted height to account for X-axis labels
    <div className="flex gap-2" style={{ height }}>
      <div
        className="flex flex-col justify-between items-end pr-1 text-[8px] font-inter text-gray-500"
        style={{ height: height - 20, minWidth: 24 }}
      >
        {[
          maxVal,
          Math.round(maxVal * 0.75),
          Math.round(maxVal * 0.5),
          Math.round(maxVal * 0.25),
          0,
        ].map((tick, index) => (
          <span key={`y-tick-${tick}-${index}`}>{tick}</span>
        ))}
      </div>

      <div className="flex-1 flex items-end justify-between gap-1">
        {data.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
            <div
              className="flex items-end gap-px w-full justify-center"
              style={{ height: height - 20 }}
            >
              <motion.div
                className="flex-1 max-w-[12px] rounded-t bg-taylor-red/80"
                initial={{ height: 0 }}
                animate={{
                  height: `${maxVal ? (d[dataKeyA] / maxVal) * 100 : 0}%`,
                }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
              />
              <motion.div
                className="flex-1 max-w-[12px] rounded-t bg-balance-accent/80"
                initial={{ height: 0 }}
                animate={{
                  height: `${maxVal ? (d[dataKeyB] / maxVal) * 100 : 0}%`,
                }}
                transition={{ duration: 0.5, delay: i * 0.05 + 0.1 }}
              />
            </div>

            <span className="text-[8px] font-inter text-gray-500">
              {d[labelKey]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Stat card component
function StatCard({ icon: Icon, label, value, change, changeType, color }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-xl p-4"
    >
      <div className="flex items-center justify-between mb-2">
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center`}
          style={{ backgroundColor: color + "20" }}
        >
          <Icon size={16} style={{ color }} />
        </div>
        {change && (
          <span
            className={`text-[10px] font-inter font-bold flex items-center gap-0.5 ${changeType === "up" ? "text-green-400" : "text-red-400"}`}
          >
            {changeType === "up" ? (
              <ArrowUpRight size={10} />
            ) : (
              <ArrowDownRight size={10} />
            )}
            {change}
          </span>
        )}
      </div>
      <p className="text-xl font-outfit font-bold text-white">{value}</p>
      <p className="text-[10px] font-inter text-gray-400 mt-0.5 font-medium">
        {label}
      </p>
    </motion.div>
  );
}

// Event CRUD row
function EventRow({ event, onEdit, onDelete, canDelete }) {
  const capacityPercent = Math.round((event.registered / event.capacity) * 100);
  return (
    <div className="flex items-center justify-between p-3 rounded-xl glass mb-2">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <span className="text-lg">{event.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-outfit font-semibold text-white truncate">
            {event.title}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[9px] font-inter text-gray-500">
              {event.host}
            </span>
            <span
              className={`text-[9px] font-inter font-bold px-1.5 py-0.5 rounded ${event.category === "focus" ? "bg-taylor-red/10 text-taylor-red" : "bg-balance-accent/10 text-balance-accent"}`}
            >
              {event.category}
            </span>
            <span
              className={`text-[9px] font-inter ${capacityPercent > 80 ? "text-yellow-400" : "text-gray-500"}`}
            >
              {event.registered}/{event.capacity}
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1 ml-2">
        <button
          onClick={() => onEdit(event)}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
        >
          <Edit3 size={13} className="text-gray-400" />
        </button>
        {canDelete && (
          <button
            onClick={() => onDelete(event.id)}
            className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
          >
            <Trash2 size={13} className="text-red-400" />
          </button>
        )}
      </div>
    </div>
  );
}

export default function AdminDashboard({
  onBack,
  userRole,
  displayName,
  userId,
}) {
  // If they logged in as super_admin, default to Danish (index 0). Otherwise Faisal (index 1).
  const [activeSection, setActiveSection] = useState("overview"); // overview | events | burnout | access

  // User Management State
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [localAdminUsers] = useState(getAdmins());
  const [supabaseAdminUsers, setSupabaseAdminUsers] = useState([]);
  const [adminUsersLoading, setAdminUsersLoading] = useState(false);
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "",
    role: "Event Manager",
    faculty: "Computing",
  });

  const [showEventModal, setShowEventModal] = useState(false);
  const [eventModalMode, setEventModalMode] = useState("create");
  const [eventDraft, setEventDraft] = useState(emptyEvent);
  const [adminEvents, setAdminEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState("");
  const [isSupabaseOnline, setIsSupabaseOnline] = useState(false);
  const [eventFilter, setEventFilter] = useState("all");
  const roleDisplayNames = {
    super_admin: "Super Admin",
    admin: "Event Manager",
    analytics_viewer: "Analytics Viewer",
  };

  const normalizedUserRole = String(userRole || "admin")
    .trim()
    .toLowerCase();

  const permissionRole =
    normalizedUserRole === "super_admin"
      ? "Super Admin"
      : normalizedUserRole === "analytics_viewer"
        ? "Analytics Viewer"
        : "Event Manager";

  const currentAdmin =
    localAdminUsers.find((admin) => {
      const adminRole = String(admin.role || "")
        .trim()
        .toLowerCase();

      if (normalizedUserRole === "super_admin") {
        return adminRole === "super admin" || adminRole === "super_admin";
      }

      if (normalizedUserRole === "analytics_viewer") {
        return (
          adminRole === "analytics viewer" || adminRole === "analytics_viewer"
        );
      }

      return adminRole === "event manager" || adminRole === "admin";
    }) || null;

  const loggedInAdmin = {
    id: userId || currentAdmin?.id || null,
    name:
      displayName ||
      currentAdmin?.full_name ||
      currentAdmin?.name ||
      "Administrator",
    role: roleDisplayNames[normalizedUserRole] || "Event Manager",
    dbRole: normalizedUserRole,
    faculty: currentAdmin?.faculty || "",
    avatar:
      displayName?.charAt(0)?.toUpperCase() || currentAdmin?.avatar || "A",
  };

  const permissions = roles[permissionRole] || {
    canCreate: false,
    canEdit: false,
    canDelete: false,
    canViewAnalytics: false,
    canManageUsers: false,
    canViewBurnout: false,
  };
  // New: State for recent activities
  const [recentActivities, setRecentActivities] = useState(
    adminAnalytics.recentActivity,
  );
  const [attendance, setAttendance] = useState([]);
  const [weeklyEngagementLoading, setWeeklyEngagementLoading] = useState(false);
  const [weeklyEngagementError, setWeeklyEngagementError] = useState("");

  // New: State for total students count
  const [totalStudents, setTotalStudents] = useState(MOCK_TOTAL_STUDENTS);

  // New: State for active students today
  const [activeToday, setActiveToday] = useState(MOCK_ACTIVE_TODAY);

  // New: State for burnout analytics
  const [burnoutAnalytics, setBurnoutAnalytics] = useState({
    ...adminAnalytics.burnoutTelemetry,
    weeklyTrend: [],
  });

  // Icons for audit log actions displayed in Recent Activity.
  const activityEmojis = {
    EVENT: {
      CREATE_EVENT: "📅",
      UPDATE_EVENT: "📝",
      DELETE_EVENT: "🗑️",
      APPROVE_EVENT: "✅",
      REJECT_EVENT: "❌",
    },
    USER: {
      CREATE_ADMIN: "👤",
      UPDATE_ADMIN: "🛡️",
      DELETE_ADMIN: "🚫",
      CHANGE_ROLE: "🔐",
    },
    SYSTEM: {
      LOGIN: "🔓",
      LOGOUT: "🔒",
      GENERATE_REPORT: "📊",
      RUN_AI_ANALYSIS: "🤖",
    },
  };

  const analytics = adminAnalytics;

  // New: Calculate weekly engagement using attendance rows loaded from Supabase
  const calculateWeeklyEngagement = (attendanceRecords) => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    const result = days.map((day) => ({
      day,
      focus: 0,
      balance: 0,
    }));

    attendanceRecords.forEach((record) => {
      if (!record.attended_at) return;

      const attendedDate = new Date(record.attended_at);

      if (Number.isNaN(attendedDate.getTime())) {
        console.warn("Invalid attended_at value:", record.attended_at);
        return;
      }

      const eventRelation = Array.isArray(record.campus_events)
        ? record.campus_events[0]
        : record.campus_events;

      const category = String(eventRelation?.category || "")
        .trim()
        .toLowerCase();

      const dayIndex = attendedDate.getDay();

      if (category === "focus") {
        result[dayIndex].focus += 1;
      } else if (category === "balance") {
        result[dayIndex].balance += 1;
      } else {
        console.warn("Attendance row has no valid event category:", record);
      }
    });

    console.log("Calculated weekly engagement:", result);

    return result;
  };

  const weeklyEngagement = calculateWeeklyEngagement(attendance);

  // New: current week's attendance and event categories from Supabase
  const loadAttendance = async () => {
    setWeeklyEngagementLoading(true);
    setWeeklyEngagementError("");

    if (!hasSupabaseConfig) {
      setAttendance([]);
      setWeeklyEngagementError(
        "Supabase is not configured. Weekly engagement cannot be loaded.",
      );
      setWeeklyEngagementLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("attendance")
        .select(
          `
          id,
          event_id,
          student_id,
          attended_at,
          attendance_type,
          campus_events!attendance_event_id_fkey (
            id,
            category
          )
        `,
        )
        .order("attended_at", { ascending: true });

      if (error) throw error;

      console.log("Attendance rows loaded:", data);
      console.log("Attendance row count:", data?.length || 0);

      setAttendance(data || []);
    } catch (err) {
      console.error("Failed to load weekly engagement:", err);

      setAttendance([]);
      setWeeklyEngagementError(
        err.message || "Unable to load weekly engagement from Supabase.",
      );
    } finally {
      setWeeklyEngagementLoading(false);
    }
  };

  // New: Load total students count from Supabase
  const loadTotalStudents = async () => {
    if (!hasSupabaseConfig) {
      setTotalStudents(MOCK_TOTAL_STUDENTS);
      return;
    }

    const { count, error } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("role", "student");

    if (error) {
      console.error("Failed to load total students:", error.message);
      setTotalStudents(MOCK_TOTAL_STUDENTS);
      return;
    }

    setTotalStudents(MOCK_TOTAL_STUDENTS + (count ?? 0));
  };

  // New: Load active students today from Supabase and add fake baseline
  const loadActiveToday = async () => {
    if (!hasSupabaseConfig) {
      setActiveToday(MOCK_ACTIVE_TODAY);
      return;
    }

    const now = new Date();

    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0,
      0,
    ).toISOString();

    const startOfTomorrow = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
      0,
      0,
      0,
      0,
    ).toISOString();

    const { count, error } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("role", "student")
      .gte("last_active_at", startOfToday)
      .lt("last_active_at", startOfTomorrow);

    if (error) {
      console.error("Failed to load active students today:", error.message);
      setActiveToday(MOCK_ACTIVE_TODAY);
      return;
    }

    setActiveToday(MOCK_ACTIVE_TODAY + (count ?? 0));
  };

  const refreshBurnoutRiskScores = async () => {
    try {
      const previewWeekStart = getMondayDate();
      const previewScores = await calculateBurnoutScores(previewWeekStart);

      await loadBurnoutAnalytics(previewScores, previewWeekStart);
    } catch (error) {
      console.error("Failed to calculate burnout scores:", error);
    }
  };

  // New: Load burnout analytics and Faculty Risk Breakdown from Supabase
  const loadBurnoutAnalytics = async (
    previewScores = null,
    requestedPreviewWeekStart = null,
  ) => {
    if (!hasSupabaseConfig) {
      setBurnoutAnalytics({
        ...analytics.burnoutTelemetry,
        focusBalanceRatio: String(
          analytics.burnoutTelemetry.avgFocusBalanceRatio ?? "0.0",
        ),
        weeklyTrend: analytics.burnoutTelemetry.weeklyTrend || [],
        facultyBreakdown: [],
      });

      return;
    }

    try {
      // 1. Load every student from public.users
      const { data: studentRows, error: studentsError } = await supabase
        .from("users")
        .select("id, faculty, focus_mode")
        .eq("role", "student");

      if (studentsError) {
        throw new Error(`Unable to load students: ${studentsError.message}`);
      }

      const students = studentRows || [];

      // 2. Calculate Focus : Balance ratio
      const focusCount = students.filter(
        (student) =>
          String(student.focus_mode || "")
            .trim()
            .toLowerCase() === "focus",
      ).length;

      const balanceCount = students.filter(
        (student) =>
          String(student.focus_mode || "")
            .trim()
            .toLowerCase() === "balance",
      ).length;

      const focusBalanceRatio =
        balanceCount > 0
          ? (focusCount / balanceCount).toFixed(1)
          : focusCount > 0
            ? `${focusCount}.0`
            : "0.0";

      // 3. Create student and faculty lookup maps
      const studentMap = new Map(
        students.map((student) => {
          const faculty = String(student.faculty || "").trim() || "Unassigned";

          return [
            String(student.id),
            {
              ...student,
              faculty,
            },
          ];
        }),
      );

      // 4. Load burnout risk scores
      const { data: scores, error: scoresError } = await supabase
        .from("burnout_risk_scores")
        .select("student_id, risk_score, risk_level, week_start")
        .order("week_start", { ascending: false });

      if (scoresError) {
        throw new Error(
          `Unable to load burnout scores: ${scoresError.message}`,
        );
      }

      const savedScores = (scores || []).filter((score) =>
        studentMap.has(String(score.student_id)),
      );

      // A recalculation is preview-only. Replace the matching week's saved
      // rows in memory without inserting, updating, or deleting Supabase data.
      const validPreviewScores = Array.isArray(previewScores)
        ? previewScores.filter((score) =>
            studentMap.has(String(score.student_id)),
          )
        : [];

      const previewWeekStart =
        requestedPreviewWeekStart || validPreviewScores[0]?.week_start || null;

      const allScores = previewWeekStart
        ? [
            ...savedScores.filter(
              (score) => score.week_start !== previewWeekStart,
            ),
            ...validPreviewScores,
          ]
        : savedScores;

      // Find the newest available week in burnout_risk_scores.
      const latestWeekStart = allScores.reduce((latest, item) => {
        if (!item.week_start) return latest;

        if (!latest || item.week_start > latest) {
          return item.week_start;
        }

        return latest;
      }, null);

      // Only use records from the latest available week.
      const latestScores = latestWeekStart
        ? allScores.filter((item) => item.week_start === latestWeekStart)
        : [];

      // 5. Add latest scores to each faculty
      const facultyMap = new Map();

      // Prevent the same student from being counted more than once if duplicate score rows exist for the same week.
      const latestScoreByStudent = new Map();

      latestScores.forEach((score) => {
        const studentId = String(score.student_id || "");

        if (!studentId || !studentMap.has(studentId)) {
          return;
        }

        latestScoreByStudent.set(studentId, score);
      });

      latestScoreByStudent.forEach((score, studentId) => {
        const student = studentMap.get(studentId);

        if (!student) {
          return;
        }

        const faculty = student.faculty || "Unassigned";

        // Only show the five supported faculty groups.
        if (
          !Object.prototype.hasOwnProperty.call(MOCK_FACULTY_STUDENTS, faculty)
        ) {
          return;
        }

        if (!facultyMap.has(faculty)) {
          facultyMap.set(faculty, {
            faculty,
            studentIds: new Set(),
            totalRisk: 0,
          });
        }

        const facultyData = facultyMap.get(faculty);

        facultyData.studentIds.add(studentId);
        facultyData.totalRisk += Number(score.risk_score || 0);
      });

      // 6. Risk percentage calculation formula = total latest risk score / total faculty students
      const facultyBreakdown = Object.keys(MOCK_FACULTY_STUDENTS)
        .map((faculty) => {
          const facultyData = facultyMap.get(faculty);

          const scoredStudents = facultyData?.studentIds.size || 0;

          const averageRisk =
            scoredStudents > 0
              ? Math.round(facultyData.totalRisk / scoredStudents)
              : 0;

          return {
            faculty,

            // This count now includes only users found in burnout_risk_scores for the latest available week.
            students: scoredStudents,
            scoredStudents,

            risk: Math.min(100, Math.max(0, averageRisk)),
          };
        })
        .sort((a, b) => {
          if (b.risk !== a.risk) {
            return b.risk - a.risk;
          }

          return b.students - a.students;
        });

      // 7. Campus-wide current risk score
      const totalCampusRisk = latestScores.reduce(
        (sum, item) => sum + Number(item.risk_score || 0),
        0,
      );

      const latestScoredStudentIds = new Set(
        latestScores.map((item) => String(item.student_id || "")).filter(Boolean),
      );

      const campusRiskScore =
        latestScoredStudentIds.size > 0
          ? Math.round(totalCampusRisk / latestScoredStudentIds.size)
          : 0;

      // 8. Count medium-risk and high-risk students
      const atRiskStudentIds = new Set(
        latestScores
          .filter((item) => {
            const level = String(item.risk_level || "")
              .trim()
              .toLowerCase();

            return level === "medium" || level === "high";
          })
          .map((item) => item.student_id),
      );

      const highRiskStudentIds = new Set(
        latestScores
          .filter(
            (item) =>
              String(item.risk_level || "")
                .trim()
                .toLowerCase() === "high",
          )
          .map((item) => item.student_id),
      );

      // 9. Build the four-week campus risk trend
      const weekMap = {};

      allScores.forEach((item) => {
        const weekStart = item.week_start;

        if (!weekStart) return;

        if (!weekMap[weekStart]) {
          weekMap[weekStart] = {
            weekStart,
            totalRisk: 0,
            scoredStudentIds: new Set(),
          };
        }

        weekMap[weekStart].totalRisk += Number(item.risk_score || 0);
        weekMap[weekStart].scoredStudentIds.add(String(item.student_id));
      });

      // Use today's local date.
      const today = new Date();

      // Remove the current time so date comparisons remain consistent.
      today.setHours(0, 0, 0, 0);

      const daysSinceMonday = (today.getDay() + 6) % 7;

      // Find the Monday of the current week.
      const currentWeekStart = new Date(today);
      currentWeekStart.setDate(today.getDate() - daysSinceMonday);

      // The four-week period begins three Mondays before the current week.
      const fourWeekWindowStart = new Date(currentWeekStart);
      fourWeekWindowStart.setDate(currentWeekStart.getDate() - 21);

      const weeklyTrend = Object.values(weekMap)
        .sort((a, b) => new Date(a.weekStart) - new Date(b.weekStart))
        .slice(-4)
        .map((item, index) => ({
          week: `W${index + 1}`,

          date: new Date(`${item.weekStart}T00:00:00`).toLocaleDateString(
            "en-US",
            {
              month: "short",
              day: "numeric",
            },
          ),

          // Average only the students scored during this specific week.
          risk:
            item.scoredStudentIds.size > 0
              ? Math.round(item.totalRisk / item.scoredStudentIds.size)
              : 0,
        }));

      // 10. Load wellness recommendations
      let recommendationList = analytics.burnoutTelemetry.recommendations || [];

      const { data: recommendations, error: recommendationsError } =
        await supabase
          .from("wellness_recommendations")
          .select("recommendation")
          .order("created_at", { ascending: false })
          .limit(5);

      if (recommendationsError) {
        console.error(
          "Failed to load wellness recommendations:",
          recommendationsError.message,
        );
      } else if (recommendations?.length > 0) {
        recommendationList = recommendations.map((item) => item.recommendation);
      }

      // 11. Update dashboard state
      setBurnoutAnalytics({
        ...analytics.burnoutTelemetry,

        riskScore: campusRiskScore,

        overallRiskLevel:
          campusRiskScore >= 60
            ? "High"
            : campusRiskScore >= 35
              ? "Medium"
              : "Low",

        studentsAtRisk: atRiskStudentIds.size,
        studentsHighRisk: highRiskStudentIds.size,

        focusBalanceRatio,

        latestWeekStart,

        weeklyTrend,

        facultyBreakdown,

        recommendations: recommendationList,
      });
    } catch (error) {
      console.error("Failed to load burnout analytics:", error);

      setBurnoutAnalytics({
        ...analytics.burnoutTelemetry,
        riskScore: 0,
        overallRiskLevel: "Low",
        studentsAtRisk: 0,
        studentsHighRisk: 0,
        focusBalanceRatio: "0.0",
        weeklyTrend: [],
        facultyBreakdown: [],
      });
    }
  };

  // New: Calculate total RSVPs and attendance rate
  const totalRSVPs = adminEvents.reduce(
    (sum, event) => sum + Number(event.registered || 0),
    0,
  );

  // New: Calculate total capacity and attendance rate
  const totalCapacity = adminEvents.reduce(
    (sum, event) => sum + Number(event.capacity || 0),
    0,
  );

  // New: Calculate attendance rate as a percentage
  const attendanceRate =
    totalCapacity > 0 ? Math.round((totalRSVPs / totalCapacity) * 100) : 0;

  // Live average match score from campus_events (falls back to mock only if none)
  const matchScoreValues = adminEvents
    .map((event) => Number(String(event.match_score ?? "").replace("%", "")))
    .filter((score) => Number.isFinite(score) && score > 0);
  const avgMatchScore =
    matchScoreValues.length > 0
      ? Math.round(
          (matchScoreValues.reduce((sum, score) => sum + score, 0) /
            matchScoreValues.length) *
            10,
        ) / 10
      : analytics.overview.avgMatchScore;

  // New: Sort events by registered count to get top events
  const topEvents = [...adminEvents]
    .sort(
      (a, b) =>
        Number(b.registered || b.rsvps || 0) -
        Number(a.registered || a.rsvps || 0),
    )
    .slice(0, 5);

  // Fetch admin users from Supabase
  const fetchSupabaseAdminUsers = async () => {
    setAdminUsersLoading(true);

    try {
      const { data, error } = await supabase
        .from("users")
        .select(
          "id, full_name, email, role, faculty, avatar, last_login, created_at",
        )
        .in("role", ["admin", "super_admin", "analytics_viewer"])
        .order("created_at", { ascending: true });

      if (error) throw error;

      setSupabaseAdminUsers(data || []);
    } catch (err) {
      console.error("Failed to fetch admin users:", err.message);
      setSupabaseAdminUsers([]);
    } finally {
      setAdminUsersLoading(false);
    }
  };

  const loadSupabaseEvents = async () => {
    setEventsLoading(true);
    setEventsError("");

    if (!hasSupabaseConfig) {
      setAdminEvents([]);
      setIsSupabaseOnline(false);
      setEventsError(
        "Supabase is not configured. Please check your environment variables.",
      );
      setEventsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("campus_events")
        .select("*")
        .order("updated_at", { ascending: false });

      if (error) throw error;

      const loadedEvents = (data || []).map(fromSupabaseEvent);

      setAdminEvents(sortNewestFirst(loadedEvents));
      setIsSupabaseOnline(true);

      if (loadedEvents.length === 0) {
        setEventsError("No events found in the campus_events table.");
      }
    } catch (err) {
      console.error("Failed to load Supabase events:", err);

      setAdminEvents([]);
      setIsSupabaseOnline(false);
      setEventsError(err.message || "Unable to load events from Supabase.");
    } finally {
      setEventsLoading(false);
    }
  };

  // Fetch the latest administrative audit records for Recent Activity.
  const fetchRecentActivity = async () => {
    if (!hasSupabaseConfig) {
      setRecentActivities([]);
      return;
    }

    if (!loggedInAdmin.id) {
      console.error("Cannot load audit logs: logged-in admin ID is missing.");
      setRecentActivities([]);
      return;
    }

    try {
      let query = supabase
        .from("audit_logs")
        .select(
          "id, user_id, action, entity_type, entity_id, old_values, new_values, created_at",
        );

      const isSuperAdmin = loggedInAdmin.dbRole === "super_admin";

      // Event Managers and Analytics Viewers only see their own audit records.
      if (!isSuperAdmin) {
        query = query.eq("user_id", loggedInAdmin.id);
      }

      const { data, error } = await query
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;

      const actionLabels = {
        CREATE_EVENT: "Event Created",
        UPDATE_EVENT: "Event Updated",
        DELETE_EVENT: "Event Deleted",
        APPROVE_EVENT: "Event Approved",
        REJECT_EVENT: "Event Rejected",
        CREATE_ADMIN: "Admin Account Created",
        UPDATE_ADMIN: "Admin Account Updated",
        DELETE_ADMIN: "Admin Account Deleted",
        CHANGE_ROLE: "Admin Role Changed",
        GENERATE_REPORT: "Report Generated",
        RUN_AI_ANALYSIS: "AI Analysis Run",
        LOGIN: "Administrator Signed In",
        LOGOUT: "Administrator Signed Out",
      };

      const formattedActivities = (data || []).map((log) => {
        const values = log.new_values || log.old_values || {};
        const entityType = String(log.entity_type || "SYSTEM").toUpperCase();
        const action = String(log.action || "UNKNOWN").toUpperCase();

        const fallbackAction = action
          .toLowerCase()
          .replaceAll("_", " ")
          .replace(/\b\w/g, (letter) => letter.toUpperCase());

        let detail = `Record ${log.entity_id || "not available"}`;

        if (entityType === "EVENT") {
          detail = `${values.title || "Unknown event"} • ${
            values.host || "Unknown host"
          }`;
        } else if (entityType === "USER") {
          detail = `${values.full_name || values.name || "Unknown admin"} • ${
            values.email || "No email"
          }`;
        } else if (values.description) {
          detail = values.description;
        }

        return {
          id: log.id,
          actionCode: action,
          entityType,
          action: actionLabels[action] || fallbackAction,
          detail,
          time: log.created_at
            ? new Date(log.created_at).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "Unknown time",
        };
      });

      setRecentActivities(formattedActivities);
    } catch (err) {
      console.error("Failed to fetch audit logs:", err);
      setRecentActivities([]);
    }
  };

  useEffect(() => {
    fetchRecentActivity();
    fetchSupabaseAdminUsers();
    loadSupabaseEvents();
    loadAttendance();
    loadBurnoutAnalytics();
    loadTotalStudents();
    loadActiveToday();
  }, [userRole, displayName, userId]);

  // Load events or users based on the active section
  useEffect(() => {
    if (activeSection === "overview" || activeSection === "events") {
      loadSupabaseEvents();
    }

    if (activeSection === "overview") {
      fetchRecentActivity();
      loadAttendance();
      loadTotalStudents();
      loadActiveToday();
    }

    if (activeSection === "access") {
      fetchSupabaseAdminUsers();
    }

    if (activeSection === "burnout") {
      loadBurnoutAnalytics();
    }
  }, [activeSection]);

  const filteredEvents = adminEvents.filter((event) => {
    if (eventFilter === "all") return true;
    return event.category === eventFilter;
  });

  const updateEventDraft = (patch) => {
    setEventDraft((prev) => ({ ...prev, ...patch }));
  };

  const openCreateEvent = () => {
    setEventModalMode("create");
    setEventDraft({ ...emptyEvent });
    setEventsError("");
    setShowEventModal(true);
  };

  const openEditEvent = (event) => {
    setEventModalMode("edit");
    setEventDraft({ ...event });
    setEventsError("");
    setShowEventModal(true);
  };

  const handleSaveEvent = async () => {
    if (!loggedInAdmin.id) {
      alert(
        "Your authenticated user ID could not be loaded. Please sign in again.",
      );
      return;
    }

    if (!eventDraft.title.trim() || !eventDraft.host.trim()) {
      alert("Please fill in Event Title and Host.");
      return;
    }

    setEventsLoading(true);
    setEventsError("");

    const eventToSave = {
      ...eventDraft,
      id: eventDraft.id || `EVT-${Date.now()}`,
    };

    const supabasePayload = {
      id: eventToSave.id,
      ...toSupabaseRow(
        eventToSave,
        eventModalMode === "create" ? loggedInAdmin : null,
      ),
    };

    // New: Add createdAt and updatedAt timestamps

    const now = new Date().toISOString();

    const { data, error } =
      eventModalMode === "edit"
        ? await supabase
            .from("campus_events")
            .update({
              ...toSupabaseRow(eventToSave),
              updated_at: now,
            })
            .eq("id", eventToSave.id)
            .select()
            .single()
        : await supabase
            .from("campus_events")
            .insert({
              id: `EVT-${Date.now()}`,
              ...toSupabaseRow(eventDraft, loggedInAdmin),
              created_at: now,
              updated_at: now,
            })
            .select()
            .single();

    if (error) {
      setEventsError(error.message);
      setEventsLoading(false);
      return;
    }

    const savedEvent = fromSupabaseEvent(data);

    // New: Update the adminEvents state with the saved event, ensuring it's sorted by newest first
    setAdminEvents((prev) =>
      sortNewestFirst(
        eventModalMode === "edit"
          ? prev.map((e) => (e.id === savedEvent.id ? savedEvent : e))
          : [savedEvent, ...prev],
      ),
    );

    // New: After saving, reload events to ensure the list is up-to-date and sorted
    const previousEvent =
      eventModalMode === "edit"
        ? adminEvents.find((event) => event.id === savedEvent.id)
        : null;

    const { error: activityError } = await supabase
      .from("audit_logs")
      .insert({
        user_id: loggedInAdmin.id,
        action: eventModalMode === "create" ? "CREATE_EVENT" : "UPDATE_EVENT",
        entity_type: "EVENT",
        entity_id: savedEvent.id,
        old_values: previousEvent
          ? {
              title: previousEvent.title,
              host: previousEvent.host,
              date: previousEvent.date,
              time: previousEvent.time,
              location: previousEvent.location,
              category: previousEvent.category,
              capacity: previousEvent.capacity,
            }
          : null,
        new_values: {
          title: savedEvent.title,
          host: savedEvent.host,
          date: savedEvent.date,
          time: savedEvent.time,
          location: savedEvent.location,
          category: savedEvent.category,
          capacity: savedEvent.capacity,
        },
      });

    if (activityError) {
      console.error("Failed to insert activity log:", activityError.message);
    }

    await loadSupabaseEvents();
    await fetchRecentActivity();

    setEventsLoading(false);
    setShowEventModal(false);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this event?")) return;

    setEventsLoading(true);
    setEventsError("");

    try {
      // 1. Save the event details before deleting it
      const eventToDelete = adminEvents.find((event) => event.id === id);

      if (!eventToDelete) {
        throw new Error("The selected event could not be found.");
      }

      // 2. Insert the activity log while the event still exists
      const { error: activityError } = await supabase
        .from("audit_logs")
        .insert({
          user_id: loggedInAdmin.id,
          action: "DELETE_EVENT",
          entity_type: "EVENT",
          entity_id: eventToDelete.id,
          old_values: {
            title: eventToDelete.title,
            host: eventToDelete.host,
            date: eventToDelete.date,
            time: eventToDelete.time,
            location: eventToDelete.location,
            category: eventToDelete.category,
            capacity: eventToDelete.capacity,
          },
          new_values: null,
        });

      if (activityError) {
        throw new Error(
          `Unable to save delete activity: ${activityError.message}`,
        );
      }

      // 3. Delete the event only after the activity log is saved
      const { error: deleteError } = await supabase
        .from("campus_events")
        .delete()
        .eq("id", id);

      if (deleteError) {
        throw deleteError;
      }

      setAdminEvents((prev) =>
        sortNewestFirst(prev.filter((event) => event.id !== id)),
      );
    } catch (err) {
      console.error("Failed to delete event:", err);

      setEventsError(
        err.message || "Unable to delete the event from Supabase.",
      );
    } finally {
      setEventsLoading(false);
    }
  };

  // Creates an Auth user through the server-side Admin API.
  // The currently logged-in administrator remains signed in.
  const handleCreateUser = async () => {
    if (isCreatingAdmin) {
      return;
    }

    const fullName = newUser.name.trim();
    const email = newUser.email.trim().toLowerCase();
    const password = newUser.password.trim();
    const faculty = newUser.faculty;

    if (!fullName || !email || !password) {
      alert("Please fill in Full Name, Email, and Password.");
      return;
    }

    if (!email.endsWith("@taylors.edu.my")) {
      alert("Please use a valid Taylor's staff email.");
      return;
    }

    if (password.length < 8) {
      alert("Password must contain at least 8 characters.");
      return;
    }

    if (!hasSupabaseConfig) {
      alert("Supabase is not configured.");
      return;
    }

    if (!loggedInAdmin.id) {
      alert(
        "Your authenticated administrator ID could not be loaded. Please sign in again.",
      );
      return;
    }

    setIsCreatingAdmin(true);

    try {
      // This calls /api/create-admin. It does not call supabase.auth.signUp() in the browser.
      // Create the Auth account and public.users profile through the server-side /api/create-admin endpoint.
      const createdAdmin = await createAdminAccount({
        fullName,
        email,
        password,
        role: newUser.role,
        faculty,
      });

      // Record the account creation in audit_logs for the Recent Activity section.
      const createdAdminId = createdAdmin?.id || createdAdmin?.user?.id || null;
      const createdAdminEmail =
        createdAdmin?.email || createdAdmin?.user?.email || email;
      const createdAdminName =
        createdAdmin?.full_name ||
        createdAdmin?.fullName ||
        createdAdmin?.user?.user_metadata?.full_name ||
        fullName;

      const { error: activityError } = await supabase
        .from("audit_logs")
        .insert({
          user_id: loggedInAdmin.id,
          action: "CREATE_ADMIN",
          entity_type: "USER",
          entity_id: createdAdminId,
          old_values: null,
          new_values: {
            full_name: createdAdminName,
            email: createdAdminEmail,
            role: newUser.role,
            faculty,
          },
        });

      if (activityError) {
        console.error(
          "Admin account was created, but the activity log could not be saved:",
          activityError,
        );
      }

      // Refresh both sections after the account has been created.
      await Promise.all([fetchSupabaseAdminUsers(), fetchRecentActivity()]);

      alert(
        `${newUser.role} account created successfully for ${
          createdAdmin?.email || createdAdmin?.user?.email || email
        }.`,
      );

      setShowCreateUserModal(false);

      setNewUser({
        name: "",
        email: "",
        password: "",
        role: "Event Manager",
        faculty: "Computing",
      });
    } catch (error) {
      console.error("Failed to create admin account:", error);

      alert(error.message || "Failed to create admin account.");
    } finally {
      setIsCreatingAdmin(false);
    }
  };

  const sections = [
    { id: "overview", icon: BarChart3, label: "Overview" },
    { id: "events", icon: Calendar, label: "Events" },
    ...(permissions.canViewBurnout
      ? [{ id: "burnout", icon: Activity, label: "Burnout" }]
      : []),
    ...(permissions.canManageUsers
      ? [{ id: "access", icon: Shield, label: "Access" }]
      : []),
  ];

  const eventCategoryCounts = [
    "Technology",
    "Career",
    "Wellness",
    "Social",
    "Creative",
    "Academic",
  ].map((name) => ({
    name,
    count: adminEvents.filter((event) => event.tag === name).length,
    color:
      analytics.categoryBreakdown.find((cat) => cat.name === name)?.color ||
      "#6B7280",
  }));

  return (
    <div className="min-h-screen bg-[#050508] text-white">
      {/* Admin Header */}
      <div
        className="
    sticky top-0 z-50
    w-full
    border-b border-white/5
    bg-[#050508]/95
    backdrop-blur-xl
    supports-[backdrop-filter]:bg-[#050508]/85
  "
      >
        <div className="max-w-[900px] mx-auto px-5 pt-4 pb-2">
          {/* Top row: close button + title + avatar */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <button
                onClick={onBack}
                className="p-2 rounded-xl glass hover:bg-white/10 transition-colors"
              >
                <X size={16} className="text-gray-400" />
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                  <h1 className="truncate font-outfit text-sm font-bold text-white sm:text-base">
                    Admin Dashboard
                  </h1>

                  <span
                    className="
        flex-none whitespace-nowrap
        rounded-full border border-taylor-red/30
        bg-taylor-red/20
        px-2 py-0.5
        font-inter text-[8px] font-medium
        text-taylor-red
        sm:text-[9px]
      "
                  >
                    {loggedInAdmin.role}
                  </span>
                </div>

                <p className="mt-0.5 truncate font-inter text-[10px] text-gray-500">
                  Welcome, {loggedInAdmin.name}
                </p>
              </div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-taylor-red to-taylor-red-dark flex items-center justify-center text-sm font-bold shadow-glow-red">
              {loggedInAdmin.avatar}
            </div>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="max-w-[900px] mx-auto pb-3">
          <div
            className="
      flex w-full gap-2
      overflow-x-auto overflow-y-hidden
      px-4
      scroll-smooth
      snap-x snap-mandatory
      overscroll-x-contain
      touch-pan-x
      hide-scrollbar
      sm:px-5
      md:grid md:grid-cols-4 md:overflow-visible
    "
          >
            {sections.map((sec) => {
              const isActive = activeSection === sec.id;

              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => setActiveSection(sec.id)}
                  className={`
            relative
            flex min-h-11 min-w-[108px]
            flex-none snap-start
            items-center justify-center gap-1.5
            whitespace-nowrap rounded-xl
            border px-3 py-2.5
            font-outfit text-xs font-semibold
            transition-colors duration-200
            md:min-w-0 md:w-full
            ${
              isActive
                ? "border-taylor-red/30 bg-taylor-red/20 text-taylor-red"
                : "border-transparent text-gray-500 hover:bg-white/5 hover:text-gray-300"
            }
          `}
                >
                  <sec.icon
                    size={15}
                    strokeWidth={isActive ? 2.5 : 2}
                    className="flex-none"
                  />

                  <span>{sec.label}</span>

                  {isActive && (
                    <motion.span
                      layoutId="admin-section-indicator"
                      className="absolute inset-x-3 -bottom-[1px] h-0.5 rounded-full bg-taylor-red"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[900px] mx-auto px-5 py-6">
        <AnimatePresence mode="wait">
          {/* OVERVIEW SECTION */}
          {activeSection === "overview" && (
            <motion.div
              key="overview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Stat Cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                <StatCard
                  icon={Users}
                  label="Total Students"
                  value={totalStudents.toLocaleString()} // New: Display total students count
                  color="#3B82F6"
                />
                <StatCard
                  icon={Zap}
                  label="Active Today"
                  value={activeToday.toLocaleString()}
                  color="#10B981"
                />
                <StatCard
                  icon={Calendar}
                  label="Total Events"
                  value={adminEvents.length}
                  color="#F59E0B"
                />
                <StatCard
                  icon={TrendingUp}
                  label="Avg Match Score"
                  value={`${avgMatchScore}%`}
                  color="#8B5CF6"
                />
                <StatCard
                  icon={Star}
                  label="Total RSVPs"
                  value={totalRSVPs.toLocaleString()}
                  color="#EC4899"
                />
                <StatCard
                  icon={Activity}
                  label="Attendance Rate"
                  value={`${attendanceRate}%`}
                  color="#EF4444"
                />
              </div>

              {/* Weekly Engagement Chart */}
              <div className="glass rounded-2xl p-5 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-outfit font-semibold text-white">
                      Weekly Engagement
                    </h3>
                    <p className="mt-0.5 text-[10px] font-inter text-gray-500">
                      Bar height = number of students engaged that day
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-[9px] font-inter text-gray-400">
                      <span className="w-2 h-2 rounded-sm bg-taylor-red/80"></span>{" "}
                      Focus students
                    </span>
                    <span className="flex items-center gap-1 text-[9px] font-inter text-gray-400">
                      <span className="w-2 h-2 rounded-sm bg-balance-accent/80"></span>{" "}
                      Balance students
                    </span>
                  </div>
                </div>
                {weeklyEngagementLoading ? (
                  <div className="h-[140px] flex items-center justify-center">
                    <p className="text-xs font-inter text-gray-500">
                      Loading weekly engagement from Supabase...
                    </p>
                  </div>
                ) : weeklyEngagementError ? (
                  <div className="h-[140px] flex items-center justify-center">
                    <p className="text-xs font-inter text-red-400 text-center">
                      {weeklyEngagementError}
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center">
                    {/* Y Axis */}
                    <div
                      className="text-[10px] font-inter text-gray-500 mr-3"
                      style={{
                        writingMode: "vertical-rl",
                        transform: "rotate(180deg)",
                      }}
                    >
                      Students
                    </div>

                    <div className="flex-1">
                      <MiniBarChart
                        data={weeklyEngagement}
                        dataKeyA="focus"
                        dataKeyB="balance"
                        labelKey="day"
                        height={140}
                      />

                      {/* X Axis */}
                      <div className="text-center mt-2 text-[10px] font-inter text-gray-500">
                        Day of week · numbers above bars = Focus / Balance
                        student counts
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Top Events + Category Split */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {/* Top Events */}
                <div className="glass rounded-2xl p-5">
                  <h3 className="text-sm font-outfit font-semibold text-white mb-1">
                    Top Events This Month
                  </h3>
                  <p className="mb-3 text-[10px] font-inter text-gray-500">
                    Fill % · RSVPs / capacity (seats taken)
                  </p>
                  <div className="space-y-2">
                    {topEvents.map((evt, i) => {
                      const fillRate =
                        Number(evt.capacity || 0) > 0
                          ? Math.round(
                              (Number(evt.registered || 0) /
                                Number(evt.capacity || 0)) *
                                100,
                            )
                          : 0;

                      return (
                        <div
                          key={evt.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02]"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="text-[10px] font-bold text-gray-600 w-4">
                              #{i + 1}
                            </span>
                            <p className="text-[11px] font-inter text-white truncate">
                              {evt.title}
                            </p>
                          </div>
                          <div className="flex flex-col items-end ml-2 shrink-0">
                            <span className="text-[10px] font-inter text-yellow-400">
                              {fillRate}% filled
                            </span>
                            <span className="text-[9px] font-inter text-gray-500">
                              {evt.registered} RSVPs / {evt.capacity} seats
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Category Breakdown */}
                <div className="glass rounded-2xl p-5">
                  <h3 className="text-sm font-outfit font-semibold text-white mb-1">
                    Event Categories
                  </h3>
                  <p className="mb-3 text-[10px] font-inter text-gray-500">
                    How many published events sit in each topic
                  </p>
                  <div className="space-y-2.5">
                    {eventCategoryCounts.map(
                      (
                        cat, // change to eventCategoryCounts
                      ) => (
                        <div key={cat.name}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] font-inter text-gray-400">
                              {cat.name}
                            </span>
                            <span
                              className="text-[11px] font-inter font-bold"
                              style={{ color: cat.color }}
                            >
                              {cat.count} events
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-white/5 rounded-full">
                            <motion.div
                              className="h-full rounded-full"
                              style={{ backgroundColor: cat.color }}
                              initial={{ width: 0 }}
                              animate={{ width: `${(cat.count / 50) * 100}%` }}
                              transition={{ duration: 0.6 }}
                            />
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="glass rounded-2xl p-5">
                <h3 className="text-sm font-outfit font-semibold text-white mb-3">
                  Recent Activity
                </h3>
                <div className="space-y-2">
                  {/* New: Render recent activities dynamically */}
                  {recentActivities.length === 0 ? (
                    <p className="text-xs font-inter text-gray-500">
                      No recent activity yet.
                    </p>
                  ) : (
                    recentActivities.map((act) => {
                      const emoji =
                        activityEmojis[act.entityType]?.[act.actionCode] || "📌";

                      return (
                        <div
                          key={act.id}
                          className="flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.02]"
                        >
                          <div className="flex h-10 w-10 flex-none items-center justify-center text-2xl">
                            {emoji}
                          </div>

                          <div className="flex-1">
                            <p className="text-xs font-outfit font-semibold text-white">
                              {act.action}
                            </p>
                            <p className="text-[10px] font-inter text-gray-500">
                              {act.detail}
                            </p>
                          </div>

                          <span className="text-[9px] font-inter text-gray-600">
                            {act.time}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* EVENTS CRUD SECTION */}
          {activeSection === "events" && (
            <motion.div
              key="events"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-outfit font-bold text-white">
                  Event Management{" "}
                  <span className="text-sm font-normal text-gray-500">
                    ({adminEvents.length})
                  </span>
                </h2>
                {permissions.canCreate && (
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={openCreateEvent}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-taylor-red to-taylor-red-light text-white text-xs font-outfit font-semibold shadow-glow-red"
                  >
                    <Plus size={14} /> New Event
                  </motion.button>
                )}
              </div>

              {/* Filter tabs */}
              <div className="flex gap-2 mb-4">
                {[
                  { label: "All", value: "all" },
                  { label: "Focus", value: "focus" },
                  { label: "Balance", value: "balance" },
                ].map((filter) => (
                  <button
                    key={filter.value}
                    onClick={() => setEventFilter(filter.value)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-outfit font-semibold transition-colors ${
                      eventFilter === filter.value
                        ? "bg-taylor-red/20 text-taylor-red border border-taylor-red/30"
                        : "text-gray-400 glass hover:text-white"
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>

              {eventsError && (
                <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2">
                  <p className="text-xs font-inter text-red-300">
                    {eventsError}
                  </p>
                </div>
              )}

              {/* Events List */}
              <div>
                {eventsLoading ? (
                  <div className="glass rounded-xl p-6 text-center">
                    <p className="text-xs font-inter text-gray-500">
                      Loading events from Supabase...
                    </p>
                  </div>
                ) : filteredEvents.length === 0 ? (
                  <div className="glass rounded-xl p-6 text-center">
                    <p className="text-xs font-inter text-gray-500">
                      No events found in Supabase.
                    </p>
                  </div>
                ) : (
                  filteredEvents.map((event) => (
                    <EventRow
                      key={event.id}
                      event={event}
                      onEdit={openEditEvent}
                      onDelete={handleDelete}
                      canDelete={permissions.canDelete}
                    />
                  ))
                )}
              </div>
            </motion.div>
          )}

          {/* BURNOUT TELEMETRY SECTION */}
          {activeSection === "burnout" && (
            <motion.div
              key="burnout"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="flex items-center gap-2 mb-6">
                <AlertTriangle size={20} className="text-yellow-400" />
                <div>
                  <h2 className="text-lg font-outfit font-bold text-white">
                    Predictive Burnout Telemetry
                  </h2>
                  <p className="text-[10px] font-inter text-gray-500">
                    Anonymized, aggregated campus wellness analytics
                  </p>
                </div>
                <button
                  type="button"
                  onClick={refreshBurnoutRiskScores}
                  title="Recalculate a temporary preview without saving to Supabase"
                  className="rounded-lg bg-yellow-500/10 px-3 py-2 text-[10px] font-inter font-semibold text-yellow-400 transition-colors hover:bg-yellow-500/20"
                >
                  Recalculate Scores
                </button>
              </div>

              {/* Risk Overview */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <div className="glass rounded-xl p-4 text-center">
                  <p className="text-2xl font-outfit font-bold text-yellow-400">
                    {burnoutAnalytics.riskScore}%
                  </p>
                  <p className="text-[10px] font-inter text-gray-500">
                    Campus Risk Score
                  </p>
                  <p
                    className={`text-[9px] font-inter font-bold mt-1 px-2 py-0.5 rounded-full inline-block ${
                      burnoutAnalytics.riskScore > 50
                        ? "bg-red-500/10 text-red-400"
                        : "bg-yellow-500/10 text-yellow-400"
                    }`}
                  >
                    {burnoutAnalytics.overallRiskLevel}
                  </p>
                </div>
                <div className="glass rounded-xl p-4 text-center">
                  <p className="text-2xl font-outfit font-bold text-orange-400">
                    {burnoutAnalytics.studentsAtRisk}
                  </p>
                  <p className="text-[10px] font-inter text-gray-500">
                    At-Risk Students
                  </p>
                </div>
                <div className="glass rounded-xl p-4 text-center">
                  <p className="text-2xl font-outfit font-bold text-red-400">
                    {burnoutAnalytics.studentsHighRisk}
                  </p>
                  <p className="text-[10px] font-inter text-gray-500">
                    High-Risk Students
                  </p>
                </div>
                <div className="glass rounded-xl p-4 text-center">
                  <p className="text-2xl font-outfit font-bold text-blue-400">
                    {burnoutAnalytics.focusBalanceRatio ?? "0.0"}:1
                  </p>
                  <p className="text-[10px] font-inter text-gray-500">
                    Focus : Balance Ratio
                  </p>
                </div>
              </div>

              {/* New: Weekly Trend Line Chart */}
              <div className="glass rounded-2xl p-5 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-outfit font-semibold text-white">
                      Weekly Risk Trend
                    </h3>
                    <p className="text-[9px] font-inter text-gray-500 mt-0.5">
                      Weekly campus burnout risk score
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-yellow-400" />
                    <span className="text-[9px] font-inter text-gray-400">
                      Risk Score
                    </span>
                  </div>
                </div>

                {(() => {
                  const trend = burnoutAnalytics.weeklyTrend || [];

                  if (trend.length === 0) {
                    return (
                      <div className="h-40 flex items-center justify-center">
                        <p className="text-xs font-inter text-gray-500">
                          No risk trend data available.
                        </p>
                      </div>
                    );
                  }

                  const chartWidth = 600;
                  const chartHeight = 180;

                  const paddingLeft = 42;
                  const paddingRight = 18;
                  const paddingTop = 20;
                  const paddingBottom = 32;

                  const plotWidth = chartWidth - paddingLeft - paddingRight;

                  const plotHeight = chartHeight - paddingTop - paddingBottom;

                  // Fixed 0-100% risk scale
                  const minRisk = 0;
                  const maxRisk = 100;

                  const points = trend.map((item, index) => {
                    const x =
                      trend.length === 1
                        ? paddingLeft + plotWidth / 2
                        : paddingLeft +
                          (index / (trend.length - 1)) * plotWidth;

                    const risk = Number(item.risk || 0);

                    const y =
                      paddingTop +
                      ((maxRisk - risk) / (maxRisk - minRisk)) * plotHeight;

                    return {
                      ...item,
                      risk,
                      x,
                      y,
                    };
                  });

                  const linePath = points
                    .map(
                      (point, index) =>
                        `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`,
                    )
                    .join(" ");

                  const areaPath =
                    points.length > 0
                      ? `${linePath}
           L ${points[points.length - 1].x} ${paddingTop + plotHeight}
           L ${points[0].x} ${paddingTop + plotHeight}
           Z`
                      : "";

                  const yTicks = [100, 75, 50, 25, 0];

                  return (
                    <div className="w-full overflow-hidden">
                      <svg
                        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                        className="w-full h-auto"
                        role="img"
                        aria-label="Four week burnout risk trend line chart"
                      >
                        <defs>
                          <linearGradient
                            id="riskAreaGradient"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor="#FACC15"
                              stopOpacity="0.28"
                            />
                            <stop
                              offset="100%"
                              stopColor="#FACC15"
                              stopOpacity="0.02"
                            />
                          </linearGradient>

                          <filter
                            id="riskLineGlow"
                            x="-20%"
                            y="-20%"
                            width="140%"
                            height="140%"
                          >
                            <feGaussianBlur stdDeviation="3" result="blur" />
                            <feMerge>
                              <feMergeNode in="blur" />
                              <feMergeNode in="SourceGraphic" />
                            </feMerge>
                          </filter>
                        </defs>

                        {/* Horizontal grid lines + Y-axis labels */}
                        {yTicks.map((tick) => {
                          const y =
                            paddingTop +
                            ((maxRisk - tick) / (maxRisk - minRisk)) *
                              plotHeight;

                          return (
                            <g key={tick}>
                              <line
                                x1={paddingLeft}
                                y1={y}
                                x2={chartWidth - paddingRight}
                                y2={y}
                                stroke="rgba(255,255,255,0.07)"
                                strokeWidth="1"
                                strokeDasharray="4 4"
                              />

                              <text
                                x={paddingLeft - 10}
                                y={y + 3}
                                textAnchor="end"
                                fill="#6B7280"
                                fontSize="9"
                                fontFamily="Inter, sans-serif"
                              >
                                {tick}%
                              </text>
                            </g>
                          );
                        })}

                        {/* Area below line */}
                        <motion.path
                          d={areaPath}
                          fill="url(#riskAreaGradient)"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.7 }}
                        />

                        {/* Main trend line */}
                        <motion.path
                          d={linePath}
                          fill="none"
                          stroke="#FACC15"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          filter="url(#riskLineGlow)"
                          initial={{
                            pathLength: 0,
                            opacity: 0,
                          }}
                          animate={{
                            pathLength: 1,
                            opacity: 1,
                          }}
                          transition={{
                            duration: 1,
                            ease: "easeInOut",
                          }}
                        />

                        {/* Data points */}
                        {points.map((point, index) => (
                          <g key={`${point.week}-${index}`}>
                            {/* Percentage directly above each dot */}
                            <motion.text
                              x={point.x}
                              y={point.y - 16}
                              textAnchor="middle"
                              fill="#FACC15"
                              fontSize="11"
                              fontWeight="700"
                              fontFamily="Inter, sans-serif"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{
                                duration: 0.4,
                                delay: 0.5 + index * 0.12,
                              }}
                            >
                              {point.risk}%
                            </motion.text>

                            {/* Outer point */}
                            <motion.circle
                              cx={point.x}
                              cy={point.y}
                              r="7"
                              fill="rgba(250, 204, 21, 0.18)"
                              initial={{ r: 0 }}
                              animate={{ r: 7 }}
                              transition={{
                                duration: 0.3,
                                delay: 0.45 + index * 0.12,
                              }}
                            />

                            {/* Inner point */}
                            <motion.circle
                              cx={point.x}
                              cy={point.y}
                              r="4"
                              fill="#FACC15"
                              stroke="#12121a"
                              strokeWidth="2"
                              initial={{ r: 0 }}
                              animate={{ r: 4 }}
                              transition={{
                                duration: 0.3,
                                delay: 0.55 + index * 0.12,
                              }}
                            />

                            {/* Week label */}
                            <text
                              x={point.x}
                              y={chartHeight - 8}
                              textAnchor="middle"
                              fill="#6B7280"
                              fontSize="9"
                              fontFamily="Inter, sans-serif"
                            >
                              {point.week}
                            </text>
                          </g>
                        ))}
                      </svg>
                    </div>
                  );
                })()}
              </div>

              {/* Faculty Risk Breakdown */}
              <div className="glass rounded-2xl p-5 mb-6">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-outfit font-semibold text-white">
                      Faculty Risk Breakdown
                    </h3>

                    <p className="mt-0.5 text-[10px] font-inter text-gray-500">
                      Average risk among students scored in the latest week
                    </p>
                  </div>

                  {burnoutAnalytics.latestWeekStart && (
                    <span className="shrink-0 text-[9px] font-inter text-gray-600">
                      Week of{" "}
                      {new Date(
                        `${burnoutAnalytics.latestWeekStart}T00:00:00`,
                      ).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  )}
                </div>

                {!burnoutAnalytics.facultyBreakdown ||
                burnoutAnalytics.facultyBreakdown.length === 0 ? (
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-8 text-center">
                    <p className="text-xs font-inter text-gray-500">
                      No student faculty data is available.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {[...burnoutAnalytics.facultyBreakdown]
                      .sort((a, b) => {
                        if (b.risk !== a.risk) {
                          return b.risk - a.risk;
                        }

                        return b.students - a.students;
                      })
                      .map((fac) => {
                        const riskLevel =
                          fac.risk >= 60
                            ? "High"
                            : fac.risk >= 35
                              ? "Medium"
                              : "Low";

                        return (
                          <div key={fac.faculty}>
                            <div className="mb-1.5 flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-[11px] font-inter font-medium text-gray-300">
                                  {fac.faculty}
                                </p>

                                <p className="mt-0.5 text-[9px] font-inter text-gray-600">
                                  {fac.students} scored student
                                  {fac.students === 1 ? "" : "s"}
                                </p>
                              </div>

                              <div className="flex shrink-0 items-center gap-2">
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[8px] font-inter font-semibold ${
                                    riskLevel === "High"
                                      ? "bg-red-500/10 text-red-400"
                                      : riskLevel === "Medium"
                                        ? "bg-yellow-500/10 text-yellow-400"
                                        : "bg-green-500/10 text-green-400"
                                  }`}
                                >
                                  {riskLevel}
                                </span>

                                <span
                                  className={`min-w-[34px] text-right text-[11px] font-inter font-bold ${
                                    fac.risk >= 60
                                      ? "text-red-400"
                                      : fac.risk >= 35
                                        ? "text-yellow-400"
                                        : "text-green-400"
                                  }`}
                                >
                                  {fac.risk}%
                                </span>
                              </div>
                            </div>

                            <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
                              <motion.div
                                className={`h-full rounded-full ${
                                  fac.risk >= 60
                                    ? "bg-gradient-to-r from-orange-500 to-red-500"
                                    : fac.risk >= 35
                                      ? "bg-gradient-to-r from-yellow-500 to-orange-500"
                                      : "bg-gradient-to-r from-green-500 to-emerald-500"
                                }`}
                                initial={{ width: 0 }}
                                animate={{
                                  width: `${Math.min(
                                    100,
                                    Math.max(0, fac.risk),
                                  )}%`,
                                }}
                                transition={{
                                  duration: 0.6,
                                  ease: "easeOut",
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}

                <p className="mt-4 border-t border-white/5 pt-3 text-[9px] font-inter text-gray-600">
                  Faculty risk percentage = total latest risk scores ÷ students
                  from that faculty with a burnout score in the latest week.
                  Students without a burnout score are excluded.
                </p>
              </div>

              {/* AI Recommendations */}
              <AdminAIWellnessWidget
                burnoutAnalytics={burnoutAnalytics}
                fallbackRecommendations={
                  analytics.burnoutTelemetry.recommendations
                }
              />
            </motion.div>
          )}

          {/* ACCESS CONTROL SECTION */}
          {activeSection === "access" && (
            <motion.div
              key="access"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <h2 className="text-lg font-outfit font-bold text-white mb-4 flex items-center gap-2">
                <Shield size={18} /> Role-Based Access Control
              </h2>

              {/* Admin Users */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-outfit font-semibold text-gray-300">
                    Admin Users
                  </h3>
                  {normalizedUserRole === "super_admin" && (
                    <button
                      onClick={() => setShowCreateUserModal(true)}
                      className="text-[10px] font-inter font-bold bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      <span className="text-taylor-red">+</span> Add Account
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  {adminUsersLoading ? (
                    <p className="text-xs text-gray-500">
                      Loading admin users...
                    </p>
                  ) : supabaseAdminUsers.length === 0 ? (
                    <p className="text-xs text-gray-500">
                      No admin users found.
                    </p>
                  ) : (
                    supabaseAdminUsers.map((admin) => (
                      <div
                        key={admin.id}
                        className="glass rounded-xl p-4 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-taylor-red to-taylor-red-dark flex items-center justify-center text-sm font-bold text-white">
                            {admin.avatar ||
                              admin.full_name?.charAt(0)?.toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-outfit font-semibold text-white">
                              {admin.full_name || admin.name}
                            </p>
                            <p className="text-[10px] font-inter text-gray-500">
                              {admin.faculty || "Taylor's University"}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span
                            className={`text-[10px] font-inter font-bold px-2 py-0.5 rounded-full ${
                              admin.role === "super_admin" ||
                              admin.role === "Super Admin"
                                ? "bg-taylor-red/10 text-taylor-red border border-taylor-red/20"
                                : admin.role === "admin" ||
                                    admin.role === "Event Manager"
                                  ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                  : "bg-gray-500/10 text-gray-400 border border-gray-500/20"
                            }`}
                          >
                            {admin.role === "super_admin"
                              ? "Super Admin"
                              : admin.role === "admin"
                                ? "Event Manager"
                                : admin.role === "analytics_viewer"
                                  ? "Analytics Viewer"
                                  : admin.role}
                          </span>
                          <p className="text-[9px] font-inter text-gray-600 mt-1">
                            {admin.last_login
                              ? new Date(admin.last_login).toLocaleString(
                                  "en-US",
                                  {
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  },
                                )
                              : "Never logged in"}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Role Permissions Matrix */}
              <div>
                <h3 className="text-sm font-outfit font-semibold text-gray-300 mb-3">
                  Permissions Matrix
                </h3>
                <div className="glass rounded-2xl overflow-hidden">
                  <div className="grid grid-cols-4 gap-0 text-center">
                    <div className="p-2.5 bg-white/[0.02] border-b border-r border-white/5">
                      <span className="text-[9px] font-inter font-bold text-gray-500 uppercase">
                        Permission
                      </span>
                    </div>
                    {Object.keys(roles).map((role) => (
                      <div
                        key={role}
                        className="p-2.5 bg-white/[0.02] border-b border-r border-white/5 last:border-r-0"
                      >
                        <span className="text-[9px] font-inter font-bold text-gray-400">
                          {role}
                        </span>
                      </div>
                    ))}
                    {[
                      "canCreate",
                      "canEdit",
                      "canDelete",
                      "canViewAnalytics",
                      "canManageUsers",
                      "canViewBurnout",
                    ].map((perm) => (
                      <div key={perm} className="contents">
                        <div className="p-2.5 border-b border-r border-white/5 text-left">
                          <span className="text-[10px] font-inter text-gray-400">
                            {perm
                              .replace("can", "")
                              .replace(/([A-Z])/g, " $1")
                              .trim()}
                          </span>
                        </div>
                        {Object.values(roles).map((rolePerms, i) => (
                          <div
                            key={i}
                            className="p-2.5 border-b border-r border-white/5 last:border-r-0 flex items-center justify-center"
                          >
                            {rolePerms[perm] ? (
                              <span className="text-green-400 text-xs">✅</span>
                            ) : (
                              <span className="text-red-400 text-xs">❌</span>
                            )}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Create / Edit Event Modal */}
      <AnimatePresence>
        {showEventModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEventModal(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[300]"
            />

            <motion.div
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 bg-[#12121a] rounded-t-3xl z-[301] border-t border-white/10"
              style={{ maxHeight: "85vh" }}
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-white/20" />
              </div>

              <div className="flex items-center justify-between px-6 pb-3">
                <div>
                  <h3 className="text-lg font-outfit font-bold text-white">
                    {eventModalMode === "edit" ? "Edit Event" : "Create Event"}
                  </h3>
                </div>

                <button
                  onClick={() => setShowEventModal(false)}
                  className="p-1.5 rounded-lg glass"
                >
                  <X size={16} className="text-gray-400" />
                </button>
              </div>

              <div
                className="overflow-y-auto px-6 pb-8"
                style={{ maxHeight: "calc(85vh - 80px)" }}
              >
                {eventsError && (
                  <div className="mb-3 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                    {eventsError}
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <FieldLabel>Event title</FieldLabel>
                    <input
                      value={eventDraft.title}
                      onChange={(e) =>
                        updateEventDraft({ title: e.target.value })
                      }
                      placeholder="e.g. Imagine Hack"
                      className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm"
                    />
                  </div>

                  <div>
                    <FieldLabel hint="Who is organising">
                      Host / Club
                    </FieldLabel>
                    <input
                      value={eventDraft.host}
                      onChange={(e) =>
                        updateEventDraft({ host: e.target.value })
                      }
                      placeholder="e.g. Taylor's Agents of Tech"
                      className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <FieldLabel>Event date</FieldLabel>
                      <input
                        type="date"
                        value={eventDraft.date}
                        onChange={(e) =>
                          updateEventDraft({ date: e.target.value })
                        }
                        className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm [color-scheme:dark]"
                      />
                    </div>
                    <div>
                      <FieldLabel>Start time</FieldLabel>
                      <input
                        type="time"
                        value={eventDraft.time}
                        onChange={(e) =>
                          updateEventDraft({ time: e.target.value })
                        }
                        className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm [color-scheme:dark]"
                      />
                    </div>
                  </div>

                  <div>
                    <FieldLabel hint="Room / venue name">Location</FieldLabel>
                    <input
                      value={eventDraft.location}
                      onChange={(e) =>
                        updateEventDraft({ location: e.target.value })
                      }
                      placeholder="e.g. Block D, Lab 2"
                      className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm"
                    />
                  </div>

                  <div>
                    <FieldLabel hint="Used for Focus / Balance feed">
                      Mode category
                    </FieldLabel>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        {
                          value: "focus",
                          label: "Focus",
                          desc: "Academic / skills",
                        },
                        {
                          value: "balance",
                          label: "Balance",
                          desc: "Wellness / social",
                        },
                      ].map((option) => {
                        const active = eventDraft.category === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() =>
                              updateEventDraft({
                                category: option.value,
                                emoji: option.value === "focus" ? "📚" : "🌿",
                              })
                            }
                            className={`rounded-xl border px-3 py-2.5 text-left transition-colors ${
                              active
                                ? option.value === "focus"
                                  ? "border-taylor-red/50 bg-taylor-red/25 text-white"
                                  : "border-teal-400/50 bg-teal-400/20 text-white"
                                : option.value === "focus"
                                  ? "border-rose-400/35 bg-rose-500/10 text-rose-50 hover:bg-rose-500/20"
                                  : "border-teal-400/35 bg-teal-500/10 text-teal-50 hover:bg-teal-500/20"
                            }`}
                          >
                            <p className="text-sm font-outfit font-semibold">
                              {option.label}
                            </p>
                            <p className="mt-0.5 text-[10px] font-inter text-gray-300">
                              {option.desc}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <FieldLabel hint="Max seats / people">
                        Capacity
                      </FieldLabel>
                      <input
                        type="number"
                        min={1}
                        value={eventDraft.capacity}
                        onChange={(e) =>
                          updateEventDraft({
                            capacity: Number(e.target.value),
                          })
                        }
                        placeholder="e.g. 50"
                        className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm"
                      />
                    </div>
                    <div>
                      <FieldLabel hint="Campus area">Zone</FieldLabel>
                      <input
                        value={eventDraft.zone}
                        onChange={(e) =>
                          updateEventDraft({ zone: e.target.value })
                        }
                        placeholder="e.g. Block D"
                        className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <FieldLabel hint="Drives Interest % for student matching">
                      Topic tag
                    </FieldLabel>
                    <p className="mb-2 text-[10px] font-inter text-gray-500">
                      Tap a coloured chip — each topic is used in the Interest
                      score formula on the student Home feed.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {EVENT_TAGS.map((tag) => {
                        const active = eventDraft.tag === tag;
                        const styles =
                          TAG_CHIP_STYLES[tag] || TAG_CHIP_STYLES.Technology;
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => updateEventDraft({ tag })}
                            className={`rounded-full border px-3.5 py-2 text-[11px] font-inter font-semibold transition-all ${
                              active ? styles.active : styles.idle
                            }`}
                          >
                            {tag}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <FieldLabel>Description</FieldLabel>
                    <textarea
                      value={eventDraft.description}
                      onChange={(e) =>
                        updateEventDraft({ description: e.target.value })
                      }
                      placeholder="What students will do / learn"
                      rows={3}
                      className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm resize-none"
                    />
                  </div>

                  <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
                    <p className="text-[10px] font-inter text-gray-400">
                      Match preview (saved onto the event for student feed)
                    </p>
                    {(() => {
                      const preview = buildBaselineMatchScores(eventDraft);
                      const b = preview.match_breakdown;
                      return (
                        <>
                          <p className="mt-1 text-sm font-outfit font-semibold text-white">
                            {preview.match_score} overall match
                          </p>
                          <div className="mt-2 grid grid-cols-2 gap-1.5">
                            <p className="text-[10px] font-inter text-emerald-300">
                              Interest {b.interest}%{" "}
                              <span className="text-gray-500">· topic tag</span>
                            </p>
                            <p className="text-[10px] font-inter text-blue-300">
                              Schedule {b.schedule}%{" "}
                              <span className="text-gray-500">
                                · Focus/Balance
                              </span>
                            </p>
                            <p className="text-[10px] font-inter text-amber-300">
                              Proximity {b.proximity}%{" "}
                              <span className="text-gray-500">
                                · zone/location
                              </span>
                            </p>
                            <p className="text-[10px] font-inter text-purple-300">
                              Social {b.social}%{" "}
                              <span className="text-gray-500">
                                · capacity size
                              </span>
                            </p>
                          </div>
                          <p className="mt-2 text-[10px] font-inter text-gray-500">
                            Formula: 40% Interest + 30% Schedule + 20% Proximity
                            + 10% Social. On Home, Interested / Not interested
                            further personalises these % for each student.
                          </p>
                        </>
                      );
                    })()}
                  </div>

                  <button
                    disabled={eventsLoading}
                    onClick={handleSaveEvent}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-taylor-red to-taylor-red-light text-white text-sm font-outfit font-semibold shadow-glow-red disabled:opacity-50"
                  >
                    {eventsLoading
                      ? "Saving..."
                      : eventModalMode === "edit"
                        ? "Save Changes"
                        : "Create Event"}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Create User Modal */}
      <AnimatePresence>
        {showCreateUserModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!isCreatingAdmin) {
                  setShowCreateUserModal(false);
                }
              }}
              className={`fixed inset-0 z-[300] bg-black/70 backdrop-blur-sm ${
                isCreatingAdmin ? "cursor-wait" : ""
              }`}
            />
            <motion.div
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 bg-[#12121a] rounded-t-3xl z-[301] border-t border-white/10"
              style={{ maxHeight: "85vh" }}
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-white/20" />
              </div>

              <div className="flex items-center justify-between px-6 pb-3">
                <h3 className="text-lg font-outfit font-bold text-white">
                  Create Admin Account
                </h3>
                <button
                  type="button"
                  disabled={isCreatingAdmin}
                  onClick={() => setShowCreateUserModal(false)}
                  className="
    rounded-lg p-1.5 glass
    disabled:cursor-not-allowed
    disabled:opacity-40
  "
                >
                  <X size={16} className="text-gray-400" />
                </button>
              </div>

              <div
                className="overflow-y-auto px-6 pb-8"
                style={{ maxHeight: "calc(85vh - 80px)" }}
              >
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-inter font-medium text-gray-400 uppercase tracking-wider mb-1 block">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={newUser.name}
                      onChange={(e) =>
                        setNewUser((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      placeholder="e.g. Ms. Sarah"
                      className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-taylor-red"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-inter font-medium text-gray-400 uppercase tracking-wider mb-1 block">
                      Campus Email *
                    </label>
                    <input
                      type="email"
                      value={newUser.email}
                      onChange={(e) =>
                        setNewUser((prev) => ({
                          ...prev,
                          email: e.target.value,
                        }))
                      }
                      placeholder="e.g. sarah.admin@taylors.edu.my"
                      className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-taylor-red"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-inter font-medium text-gray-400 uppercase tracking-wider mb-1 block">
                      Temporary Password *
                    </label>
                    <input
                      type="password"
                      value={newUser.password}
                      onChange={(e) =>
                        setNewUser((prev) => ({
                          ...prev,
                          password: e.target.value,
                        }))
                      }
                      placeholder="e.g. tempPass123"
                      className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-taylor-red"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-inter font-medium text-gray-400 uppercase tracking-wider mb-1 block">
                        Role
                      </label>
                      <select
                        value={newUser.role}
                        onChange={(e) =>
                          setNewUser((prev) => ({
                            ...prev,
                            role: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-taylor-red"
                      >
                        <option
                          value="Event Manager"
                          className="bg-[#12121a] text-white"
                        >
                          Event Manager
                        </option>
                        <option
                          value="Analytics Viewer"
                          className="bg-[#12121a] text-white"
                        >
                          Analytics Viewer
                        </option>
                        <option
                          value="Super Admin"
                          className="bg-[#12121a] text-white"
                        >
                          Super Admin
                        </option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-inter font-medium text-gray-400 uppercase tracking-wider mb-1 block">
                        Faculty/Dept
                      </label>
                      <select
                        value={newUser.faculty}
                        onChange={(e) =>
                          setNewUser((prev) => ({
                            ...prev,
                            faculty: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-taylor-red"
                      >
                        {[
                          "Business",
                          "Communication",
                          "Computing",
                          "General Studies",
                          "Hospitality",
                        ].map((faculty) => (
                          <option
                            key={faculty}
                            value={faculty}
                            className="bg-[#12121a] text-white"
                          >
                            {faculty}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCreateUser}
                  disabled={isCreatingAdmin}
                  className="
    mt-6 flex w-full items-center justify-center gap-2
    rounded-xl bg-taylor-red py-3.5
    font-bold text-white
    shadow-glow-red transition-colors
    hover:bg-taylor-red-light
    disabled:cursor-not-allowed
    disabled:opacity-60
  "
                >
                  {isCreatingAdmin ? (
                    <>
                      <span
                        className="
          h-4 w-4
          animate-spin
          rounded-full
          border-2 border-white/30
          border-t-white
        "
                      />

                      <span>Creating Account...</span>
                    </>
                  ) : (
                    "Create Account"
                  )}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
