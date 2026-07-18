// This is the src/App.jsx file
import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Home, Calendar, Compass, User } from "lucide-react";
import Header from "./components/Header";
import Timetable from "./components/Timetable";
import ModeToggle from "./components/ModeToggle";
import EventFeed from "./components/EventFeed";
import EventDetailModal from "./components/EventDetailModal";
import NotificationCenter from "./components/NotificationCenter";
import SchedulePage from "./components/SchedulePage";
import AdminDashboard from "./components/AdminDashboard";
import FocusMeterWidget from "./components/FocusMeterWidget";
import Explore from "./pages/Explore";
import { leaderboardData } from "./data/leaderboard";
import LeaderboardRow from "./components/LeaderboardRow";
import LandingPage from "./pages/LandingPage";
import {
  initializeDB,
  toggleEventCheckIn,
  getAIMeterState,
  applyEventToAIMeter,
  setAIMeterState,
  buildRecommendationFromScores,
  getUserTimetableProfile,
  getUserPoints,
  adjustUserPoints,
  addUserActivity,
  addNotification,
  getUnreadNotificationCount,
  getPrivacySettings,
  toggleEventRSVP,
  getUserRSVPEventIds,
} from "./data/db";
import LoginPage from "./pages/LoginPage";
import Profile from "./pages/Profile";
import CompleteProfilePage from "./pages/CompleteProfilePage";
import Chatbot from "./components/Chatbot";
import { supabase } from "./components/GoogleLogin";
import { getCurrentSupabaseUser } from "./libs/auth";
import { createStudentActivity } from "./services/studentActivityService";
import {
  fetchTimetableSyncSetting,
  timetableSyncEventName,
} from "./services/timetableSyncService";

const saveStudentActivity = (activity) => {
  createStudentActivity(activity).catch((error) => {
    console.error("Unable to save student activity to Supabase:", error);
  });
};

export default function App() {
  const MANUAL_LOGOUT_KEY = "taylors_manual_logout";
  const [activeTab, setActiveTab] = useState(() => {
    const savedTab = sessionStorage.getItem("taylors_active_tab");

    return ["home", "schedule", "explore", "profile"].includes(savedTab)
      ? savedTab
      : "home";
  });

  useEffect(() => {
    sessionStorage.setItem("taylors_active_tab", activeTab);
  }, [activeTab]);

  const [currentScreen, setCurrentScreen] = useState("auth-loading"); // 'auth-loading' | 'landing' | 'login' | 'complete-profile' | 'app'
  const [userRole, setUserRole] = useState("student"); // 'student' | 'admin' | 'super_admin'
  const currentScreenRef = useRef("auth-loading");

  /*
   * Prevent restoreSession(), SIGNED_IN and profile refresh from
   * loading or creating the same public.users profile simultaneously.
   */
  const authProfileRequestRef = useRef({
    userId: null,
    promise: null,
  });

  const [currentUserKey, setCurrentUserKey] = useState("guest");
  const [displayName, setDisplayName] = useState("Student");
  const [currentEmail, setCurrentEmail] = useState("");
  const [currentProgramme, setCurrentProgramme] = useState("");
  const [pendingProfileUser, setPendingProfileUser] = useState(null);
  const [mode, setMode] = useState("focus"); // 'focus' | 'balance'
  const [points, setPoints] = useState(() => getUserPoints("guest", 1240));
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [timetableProfile, setTimetableProfile] = useState(() =>
    getUserTimetableProfile("guest"),
  );
  const [aiMeter, setAiMeter] = useState(() => {
    const current = getAIMeterState("guest");
    return {
      ...current,
      recommendation:
        current.recommendation ||
        buildRecommendationFromScores({
          focusScore: current.focusScore,
          balanceScore: current.balanceScore,
          mode: "focus",
        }),
    };
  });
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showEventDetail, setShowEventDetail] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [privacySettings, setPrivacySettings] = useState(() =>
    getPrivacySettings("guest", { shareTimetable: true }),
  );
  const [timetableSyncEnabled, setTimetableSyncEnabled] = useState(false);
  const [timetableSyncLoading, setTimetableSyncLoading] = useState(true);
  const [rsvpEventIds, setRsvpEventIds] = useState(() =>
    getUserRSVPEventIds("guest"),
  );

  const resolveDisplayName = (user) => {
    if (!user) return "Student";
    const metadataName =
      user.user_metadata?.full_name || user.user_metadata?.name;
    const source = metadataName || user.name || user.email || "";
    const cleaned = String(source).trim();
    if (!cleaned) return "Student";
    return cleaned.includes("@") ? cleaned.split("@")[0] : cleaned;
  };

  const resolveUserKey = (user, fallback = "guest") => {
    if (!user) return fallback;
    const candidate =
      user.id ||
      user.email ||
      user.user_metadata?.email ||
      user.name ||
      fallback;
    const cleaned = String(candidate).trim().toLowerCase();
    return cleaned || fallback;
  };

  const loadMeterForUser = (userKey, modeForRecommendation = mode) => {
    const current = getAIMeterState(userKey);
    const recommendation =
      current.recommendation ||
      buildRecommendationFromScores({
        focusScore: current.focusScore,
        balanceScore: current.balanceScore,
        mode: modeForRecommendation,
      });
    return {
      ...current,
      recommendation,
    };
  };

  const loadAuthenticatedProfile = useCallback(async (authUser) => {
    const userId = String(authUser?.id || "").trim();

    if (!userId) {
      return null;
    }

    const activeRequest = authProfileRequestRef.current;

    /*
     * A profile request for this user is already running.
     * Reuse it instead of starting another SELECT/INSERT sequence.
     */
    if (activeRequest.userId === userId && activeRequest.promise) {
      return activeRequest.promise;
    }

    const profilePromise = getCurrentSupabaseUser(authUser);

    authProfileRequestRef.current = {
      userId,
      promise: profilePromise,
    };

    try {
      return await profilePromise;
    } finally {
      /*
       * Only clear the ref if it still belongs to this exact request.
       * A newer request must not be accidentally cleared.
       */
      if (authProfileRequestRef.current.promise === profilePromise) {
        authProfileRequestRef.current = {
          userId: null,
          promise: null,
        };
      }
    }
  }, []);

  const applyAuthenticatedUser = useCallback((user, options = {}) => {
    const { resetTab = false } = options;

    if (!user) {
      setCurrentScreen("login");
      return;
    }

    const role = String(user.role || "student")
      .trim()
      .toLowerCase();

    const programme = String(user.programme || "").trim();
    const userKey = resolveUserKey(user);

    localStorage.removeItem(MANUAL_LOGOUT_KEY);

    setUserRole(role);
    setDisplayName(user.full_name || resolveDisplayName(user));
    setCurrentEmail(String(user.email || "").trim());
    setCurrentProgramme(programme);
    setCurrentUserKey(userKey);
    setAiMeter(loadMeterForUser(userKey));

    // Students must complete their programme first.
    if (role === "student" && programme.length === 0) {
      setPendingProfileUser(user);
      setCurrentScreen("complete-profile");
      return;
    }

    setPendingProfileUser(null);

    // Only reset to Home immediately after a real login.
    if (resetTab) {
      setActiveTab("home");
    }

    setCurrentScreen("app");
  }, []);

  useEffect(() => {
    currentScreenRef.current = currentScreen;
  }, [currentScreen]);

  useEffect(() => {
    initializeDB();
    let isMounted = true;

    const restoreSession = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        // No Google/Supabase session: show the normal landing page.
        if (!session?.user) {
          if (isMounted) {
            setCurrentScreen("landing");
          }
          return;
        }

        // Keep displaying auth-loading while the public.users row is loaded.
        const userProfile = await loadAuthenticatedProfile(session.user);

        if (!isMounted) return;

        if (!userProfile) {
          console.error(
            "Supabase authentication exists, but the public.users profile could not be loaded.",
          );
          setCurrentScreen("login");
          return;
        }

        applyAuthenticatedUser(userProfile);
      } catch (error) {
        console.error("Failed to restore Supabase session:", error);

        if (isMounted) {
          setCurrentScreen("login");
        }
      }
    };

    restoreSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;

      /*
       * restoreSession() already handles the initial session.
       * Ignoring INITIAL_SESSION prevents competing screen changes
       * while Google OAuth is being restored.
       */
      if (event === "INITIAL_SESSION") {
        return;
      }

      if (event === "SIGNED_OUT" || !session?.user) {
        authProfileRequestRef.current = {
          userId: null,
          promise: null,
        };
        setUserRole("student");
        setDisplayName("Student");
        setCurrentEmail("");
        setCurrentProgramme("");
        setCurrentUserKey("guest");
        setTimetableSyncEnabled(false);
        setTimetableSyncLoading(false);
        setAiMeter(loadMeterForUser("guest"));
        setCurrentScreen("landing");
        return;
      }
      if (event !== "SIGNED_IN" && event !== "USER_UPDATED") {
        return;
      }

      window.setTimeout(async () => {
        try {
          const user = await loadAuthenticatedProfile(session.user);

          if (isMounted && user) {
            applyAuthenticatedUser(user);
          }
        } catch (error) {
          console.error("Failed to refresh authenticated user:", error);
        }
      }, 0);
    });

    const refreshProfile = async () => {
      if (!isMounted) return;

      if (currentScreenRef.current !== "app") {
        return;
      }

      if (document.visibilityState && document.visibilityState !== "visible") {
        return;
      }

      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          console.warn(
            "Unable to check Supabase session while refreshing profile:",
            sessionError,
          );
          return;
        }

        if (!session?.user) {
          return;
        }

        const user = await loadAuthenticatedProfile(session.user);

        if (isMounted && user) {
          applyAuthenticatedUser(user);
        }
      } catch (error) {
        if (
          error?.name === "AuthSessionMissingError" ||
          String(error?.message || "")
            .toLowerCase()
            .includes("auth session missing")
        ) {
          return;
        }

        console.error("Failed to refresh Supabase profile:", error);
      }
    };

    document.addEventListener("visibilitychange", refreshProfile);

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      document.removeEventListener("visibilitychange", refreshProfile);
    };
  }, [applyAuthenticatedUser, loadAuthenticatedProfile]);

  useEffect(() => {
    setTimetableProfile(getUserTimetableProfile(currentUserKey));
  }, [currentUserKey]);

  useEffect(() => {
    let cancelled = false;

    const loadTimetableSync = async () => {
      if (!currentUserKey || currentUserKey === "guest") {
        if (!cancelled) {
          setTimetableSyncEnabled(false);
          setTimetableSyncLoading(false);
        }
        return;
      }

      setTimetableSyncLoading(true);

      try {
        const enabled = await fetchTimetableSyncSetting(currentUserKey);
        if (!cancelled) setTimetableSyncEnabled(enabled);
      } catch (error) {
        console.error("Unable to load timetable sync setting:", error);
        if (!cancelled) setTimetableSyncEnabled(false);
      } finally {
        if (!cancelled) setTimetableSyncLoading(false);
      }
    };

    void loadTimetableSync();

    return () => {
      cancelled = true;
    };
  }, [currentUserKey]);

  useEffect(() => {
    const handleTimetableSyncUpdate = (event) => {
      const updatedStudentId = event?.detail?.studentId;
      const enabled = event?.detail?.enabled;

      if (
        updatedStudentId &&
        String(updatedStudentId) !== String(currentUserKey)
      ) {
        return;
      }

      if (typeof enabled === "boolean") {
        setTimetableSyncEnabled(enabled);
        setTimetableSyncLoading(false);
      }
    };

    window.addEventListener(
      timetableSyncEventName,
      handleTimetableSyncUpdate,
    );

    return () => {
      window.removeEventListener(
        timetableSyncEventName,
        handleTimetableSyncUpdate,
      );
    };
  }, [currentUserKey]);

  useEffect(() => {
    setPrivacySettings(
      getPrivacySettings(currentUserKey, { shareTimetable: true }),
    );
    setRsvpEventIds(getUserRSVPEventIds(currentUserKey));

    const onDataUpdate = (evt) => {
      const updatedKey = String(evt?.detail?.key || "");
      if (updatedKey.startsWith("taylors_privacy_settings")) {
        setPrivacySettings(
          getPrivacySettings(currentUserKey, { shareTimetable: true }),
        );
      }
      if (updatedKey.startsWith("taylors_rsvp_events")) {
        setRsvpEventIds(getUserRSVPEventIds(currentUserKey));
      }
    };

    window.addEventListener("taylors-db-updated", onDataUpdate);
    return () => window.removeEventListener("taylors-db-updated", onDataUpdate);
  }, [currentUserKey]);

  useEffect(() => {
    const refreshUnread = () =>
      setUnreadNotifications(getUnreadNotificationCount(currentUserKey));
    refreshUnread();
    const onDataUpdate = () => refreshUnread();
    window.addEventListener("taylors-db-updated", onDataUpdate);
    return () => window.removeEventListener("taylors-db-updated", onDataUpdate);
  }, [currentUserKey]);

  useEffect(() => {
    const fallback = userRole === "student" ? 1240 : 0;
    setPoints(getUserPoints(currentUserKey, fallback));
  }, [currentUserKey, userRole]);

  const toggleMode = () => {
    setMode((prev) => (prev === "focus" ? "balance" : "focus"));
  };

  const refreshRecommendation = () => {
    setAiMeter((prev) => {
      const next = setAIMeterState(
        {
          ...prev,
          recommendation: buildRecommendationFromScores({
            focusScore: prev.focusScore,
            balanceScore: prev.balanceScore,
            mode,
          }),
        },
        currentUserKey,
      );
      return next;
    });
  };

  useEffect(() => {
    refreshRecommendation();
  }, [mode, currentUserKey]);

  // Mode toggle removed from global scope; it's now scoped to Profile page only.

  const handleCheckIn = (event) => {
    if (!event?.id) return;

    const actorName = displayName || "Student";
    const result = toggleEventCheckIn({
      eventId: event.id,
      eventTitle: event.title,
      userName: actorName,
      userKey: currentUserKey,
    });

    if (result.status === "checked-in") {
      const nextPoints = adjustUserPoints(
        currentUserKey,
        50,
        userRole === "student" ? 1240 : 0,
      );
      setPoints(nextPoints);
      const nextMeter = applyEventToAIMeter({
        category: event.category,
        userKey: currentUserKey,
        direction: "in",
      });
      setAiMeter(nextMeter);
      const activity = {
        userKey: currentUserKey,
        type: "checkin",
        title: `Checked in: ${event.title}`,
        detail: `+50 points • Focus ${nextMeter.focusScore}% • Wellness ${nextMeter.balanceScore}%`,
      };
      addUserActivity(activity);
      saveStudentActivity({
        studentId: currentUserKey,
        type: activity.type,
        title: activity.title,
        detail: activity.detail,
        entityType: "event",
        entityId: event.id,
        metadata: { eventTitle: event.title },
      });
      addNotification({
        userKey: currentUserKey,
        type: "event-checkin",
        title: "Check-in confirmed",
        body: `${event.title} has been checked in successfully.`,
        priority: "medium",
        icon: "✅",
        accentColor: "#4EEAAF",
        eventId: event.id,
      });
      alert(
        `✅ Checked in to ${event.title}. Admin attendance log has been updated.`,
      );
    } else if (result.status === "unchecked") {
      const nextPoints = adjustUserPoints(
        currentUserKey,
        -50,
        userRole === "student" ? 1240 : 0,
      );
      setPoints(nextPoints);
      const nextMeter = applyEventToAIMeter({
        category: event.category,
        userKey: currentUserKey,
        direction: "out",
      });
      setAiMeter(nextMeter);
      const activity = {
        userKey: currentUserKey,
        type: "uncheckin",
        title: `Unchecked: ${event.title}`,
        detail: `-50 points • Focus ${nextMeter.focusScore}% • Wellness ${nextMeter.balanceScore}%`,
      };
      addUserActivity(activity);
      saveStudentActivity({
        studentId: currentUserKey,
        type: activity.type,
        title: activity.title,
        detail: activity.detail,
        entityType: "event",
        entityId: event.id,
        metadata: { eventTitle: event.title },
      });
      addNotification({
        userKey: currentUserKey,
        type: "event-uncheckin",
        title: "Check-in removed",
        body: `${event.title} has been removed from your check-ins.`,
        priority: "low",
        icon: "↩️",
        accentColor: "#9CA3AF",
        eventId: event.id,
      });
      alert(
        `↩️ Check-in removed for ${event.title}. Scores have been adjusted.`,
      );
    } else {
      alert(
        `ℹ️ Unable to update check-in for ${event.title}. Please try again.`,
      );
    }
  };

  const handleRedeem = (cost) => {
    if (points >= cost) {
      const nextPoints = adjustUserPoints(
        currentUserKey,
        -cost,
        userRole === "student" ? 1240 : 0,
      );
      setPoints(nextPoints);
      addUserActivity({
        userKey: currentUserKey,
        type: "redeem",
        title: `Reward redeemed (${cost} points)`,
        detail: `Remaining points: ${nextPoints}`,
      });
      alert(`🎁 Redeemed! -${cost} points.`);
    } else {
      alert("❌ Not enough points!");
    }
  };

  const handleEventClick = (event) => {
    if (!event) return;
    const canonicalId = String(event.sourceEventId || event.id || "");
    setSelectedEvent({
      ...event,
      id: event.id,
      sourceEventId: canonicalId || event.sourceEventId,
      isRSVPd: canonicalId ? rsvpEventIds.includes(canonicalId) : false,
    });
    setShowEventDetail(true);
  };

  const handleLogout = async () => {
    authProfileRequestRef.current = {
      userId: null,
      promise: null,
    };

    setShowAdmin(false);
    setShowNotifications(false);
    setShowEventDetail(false);
    setSelectedEvent(null);

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.warn("Supabase sign-out failed:", error);
      }
    } catch (error) {
      console.warn("Supabase sign-out failed:", error);
    } finally {
      localStorage.removeItem(MANUAL_LOGOUT_KEY);
      sessionStorage.setItem("taylors_active_tab", "home");

      setUserRole("student");
      setDisplayName("Student");
      setCurrentProgramme("");
      setCurrentUserKey("guest");
      setTimetableSyncEnabled(false);
      setTimetableSyncLoading(false);
      setAiMeter(loadMeterForUser("guest"));
      setMode("focus");
      setActiveTab("home");
      setCurrentScreen("landing");
    }

    // Hard reset fallback for sticky auth/render states.
    setTimeout(() => {
      window.location.reload();
    }, 0);
  };

  const handleRSVP = (event) => {
    if (!event?.id && !event?.sourceEventId) return;
    const result = toggleEventRSVP({ event, userKey: currentUserKey });
    const canonicalId =
      result.eventId || String(event.sourceEventId || event.id || "");

    setRsvpEventIds(getUserRSVPEventIds(currentUserKey));
    setSelectedEvent((prev) => {
      if (!prev) return prev;
      const prevCanonical = String(prev.sourceEventId || prev.id || "");
      if (prevCanonical !== canonicalId) return prev;
      return {
        ...prev,
        isRSVPd: result.status === "added",
      };
    });

    if (result.status === "added") {
      const activity = {
        userKey: currentUserKey,
        type: "rsvp",
        title: `RSVP confirmed: ${event.title}`,
        detail: `${event.date || "Date TBC"} • ${event.time || "Time TBC"}`,
      };
      addUserActivity(activity);
      saveStudentActivity({
        studentId: currentUserKey,
        type: activity.type,
        title: activity.title,
        detail: activity.detail,
        entityType: "event",
        entityId: canonicalId,
        metadata: { eventTitle: event.title },
      });
      addNotification({
        userKey: currentUserKey,
        type: "event-rsvp",
        title: "RSVP confirmed",
        body: `You signed up for ${event.title}.`,
        priority: "medium",
        icon: "🎟️",
        accentColor: "#60A5FA",
        eventId: canonicalId,
      });
    } else if (result.status === "removed") {
      const activity = {
        userKey: currentUserKey,
        type: "rsvp-remove",
        title: `RSVP removed: ${event.title}`,
        detail: "You removed this event from your upcoming list.",
      };
      addUserActivity(activity);
      saveStudentActivity({
        studentId: currentUserKey,
        type: activity.type,
        title: activity.title,
        detail: activity.detail,
        entityType: "event",
        entityId: canonicalId,
        metadata: { eventTitle: event.title },
      });
      addNotification({
        userKey: currentUserKey,
        type: "event-rsvp-removed",
        title: "RSVP removed",
        body: `${event.title} was removed from your signups.`,
        priority: "low",
        icon: "🗑️",
        accentColor: "#9CA3AF",
        eventId: canonicalId,
      });
    }
  };

  const handleTabChange = useCallback((nextTab) => {
    setActiveTab((currentTab) => {
      // Prevent unnecessary state updates when tapping the active tab again.
      if (currentTab === nextTab) {
        return currentTab;
      }

      return nextTab;
    });
  }, []);

  const navItems = [
    { id: "home", icon: Home, label: "Home" },
    { id: "schedule", icon: Calendar, label: "Schedule" },
    { id: "explore", icon: Compass, label: "Explore" },
    { id: "profile", icon: User, label: "Profile" },
  ];

  const isDarkTheme = true;
  const activeDailyTimetable = timetableSyncEnabled
    ? timetableProfile.today
    : [];

  return (
    <div
      className="
    flex min-h-[100dvh] w-full
    items-start justify-center
    overflow-hidden
    bg-[#050508] bg-mesh
    font-sans text-gray-100
    theme-dark
  "
    >
      {/* Mobile Container */}
      <div
        className="
    relative flex
    h-[100dvh] min-h-[100dvh]
    w-full max-w-[430px]
    flex-col overflow-hidden
    border-x border-white/5
    bg-[#050508]
    shadow-2xl
  "
      >
        <AnimatePresence mode="wait">
          {currentScreen === "auth-loading" && (
            <motion.div
              key="auth-loading"
              className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-[#050508]"
              initial={{ opacity: 1 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="h-10 w-10 rounded-full border-2 border-white/10 border-t-taylor-red animate-spin" />

              <p className="mt-5 text-sm font-medium text-white">
                Working on it
              </p>

              <p className="mt-2 text-xs text-gray-500">
                Checking your account...
              </p>
            </motion.div>
          )}
          {currentScreen === "landing" && (
            <motion.div
              key="landing"
              className="
      absolute inset-0
      z-40
      overflow-x-hidden overflow-y-auto
      overscroll-y-auto
      bg-[#050508]
      touch-pan-y
      [-webkit-overflow-scrolling:touch]
    "
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <LandingPage onGetStarted={() => setCurrentScreen("login")} />
            </motion.div>
          )}

          {currentScreen === "login" && (
            <motion.div
              key="login"
              className="
      absolute inset-0 z-50
      overflow-x-hidden overflow-y-auto
      overscroll-y-auto
      bg-[#050508]
      touch-pan-y
      [-webkit-overflow-scrolling:touch]
    "
              initial={{ opacity: 0, x: "100%" }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
            >
              <LoginPage
                onLogin={({ user }) => {
                  applyAuthenticatedUser(user, { resetTab: true });
                }}
              />
            </motion.div>
          )}

          {currentScreen === "complete-profile" && (
            <motion.div
              key="complete-profile"
              className="
  absolute inset-0 z-50
  overflow-x-hidden overflow-y-auto
  overscroll-y-auto
  bg-[#050508]
  touch-pan-y
  [-webkit-overflow-scrolling:touch]
"
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
            >
              <CompleteProfilePage
                user={pendingProfileUser}
                onCompleted={(completedUser) => {
                  applyAuthenticatedUser(completedUser, { resetTab: true });
                }}
              />
            </motion.div>
          )}

          {currentScreen === "app" && (
            <motion.div
              key="app"
              className={`absolute inset-0 flex min-h-0 flex-col ${
                isDarkTheme ? "bg-[#050508]" : "bg-[#f9f7f3]"
              }`}
              initial={{ opacity: 0, x: "100%" }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
            >
              <div className="pointer-events-none absolute left-0 right-0 top-0 z-50 h-1 bg-gradient-to-r from-taylor-red via-taylor-red-light to-taylor-red" />

              <div
                className={`z-40 flex-none backdrop-blur-md ${
                  isDarkTheme
                    ? "bg-[#050508]/80"
                    : "border-b border-black/5 bg-[#f9f7f3]/90"
                }`}
              >
                <Header
                  points={points}
                  onNotificationClick={() => setShowNotifications(true)}
                  onOpenAdmin={() => setShowAdmin(true)}
                  userRole={userRole}
                  displayName={displayName}
                  unreadCount={unreadNotifications}
                />
              </div>

              <main
                className="
    relative min-h-0 flex-1
    overflow-x-hidden overflow-y-auto
    overscroll-y-contain
    hide-scrollbar
    touch-pan-y
    [-webkit-overflow-scrolling:touch]
  "
              >
                <AnimatePresence mode="wait">
                  {activeTab === "home" && (
                    <motion.div
                      key="home"
                      initial={false}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.12 }}
                      className={`min-h-full transition-colors duration-500 ${
                        mode === "focus"
                          ? "bg-[#3f000a]"
                          : "bg-gradient-to-br from-[#0f2a27] via-[#050508] to-[#0d1f1a]"
                      }`}
                    >
                      <div className="flex flex-col gap-3 px-5 pb-4 pt-6 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p
                            className={`text-sm uppercase tracking-[0.22em] ${
                              mode === "focus"
                                ? "text-red-200"
                                : "text-teal-200"
                            }`}
                          >
                            Current mode
                          </p>

                          <h2 className="text-2xl font-bold text-white">
                            {mode === "focus" ? "Focus Mode" : "Balance Mode"}
                          </h2>
                        </div>

                        <div
                          className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-[11px] font-semibold ${
                            mode === "focus"
                              ? "border border-taylor-red/30 bg-taylor-red/15 text-red-200"
                              : "border border-teal-300/20 bg-teal-400/10 text-teal-300"
                          }`}
                        >
                          <span
                            className={`h-2 w-2 rounded-full ${
                              mode === "focus"
                                ? "bg-taylor-red-light"
                                : "bg-teal-300"
                            }`}
                          />

                          {mode === "focus" ? "Deep focus" : "Chill balance"}
                        </div>
                      </div>

                      <Timetable
                        mode={mode}
                        timetableData={activeDailyTimetable}
                      />

                      <div className="mt-3 px-5 pb-2">
                        <div className="mb-2">
                          <p
                            className={`font-inter text-[11px] font-medium uppercase tracking-widest ${
                              mode === "focus"
                                ? "text-red-100"
                                : "text-teal-100"
                            }`}
                          >
                            Your progress right now
                          </p>
                        </div>

                        <FocusMeterWidget
                          currentMode={mode}
                          focusScore={aiMeter.focusScore}
                          balanceScore={aiMeter.balanceScore}
                          recommendation={aiMeter.recommendation}
                          loadingRecommendation={false}
                          onRefreshRecommendation={refreshRecommendation}
                        />
                      </div>

                      <ModeToggle mode={mode} onToggle={toggleMode} />

                      <EventFeed
                        mode={mode}
                        onCheckIn={handleCheckIn}
                        onEventClick={handleEventClick}
                        userKey={currentUserKey}
                      />
                    </motion.div>
                  )}

                  {activeTab === "schedule" && (
                    <motion.div
                      key="schedule"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="min-h-full"
                    >
                      <SchedulePage
                        userKey={currentUserKey}
                        userId={
                          currentUserKey !== "guest" ? currentUserKey : null
                        }
                        programme={currentProgramme}
                        timetableSynced={timetableSyncEnabled}
                        timetableSyncLoading={timetableSyncLoading}
                        focusMode={currentUserKey.focus_mode || mode || "balance"}
                        onEventClick={handleEventClick}
                      />
                    </motion.div>
                  )}

                  {activeTab === "explore" && (
                    <motion.div
                      key="explore"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="min-h-full bg-[#050508]"
                    >
                      <Explore />
                    </motion.div>
                  )}

                  {activeTab === "profile" && (
                    <motion.div
                      key="profile"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="min-h-full bg-[#050508]"
                    >
                      <Profile
                        mode={mode}
                        onLogout={handleLogout}
                        displayName={displayName}
                        email={currentEmail}
                        programme={currentProgramme}
                        userKey={currentUserKey}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </main>

              <nav
                className={`
        relative z-50
        flex flex-none items-center justify-between
        px-4 pt-3
        pb-[calc(0.75rem+env(safe-area-inset-bottom))]
        backdrop-blur-xl
        ${
          isDarkTheme
            ? "border-t border-white/5 bg-[#050508]/95"
            : "border-t border-black/10 bg-[#f9f7f3]/95"
        }
      `}
              >
                {navItems.map((item) => {
                  const isActive = activeTab === item.id;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveTab(item.id)}
                      className={`relative flex min-w-14 flex-col items-center gap-1 transition-colors duration-200 ${
                        isActive
                          ? "text-taylor-red"
                          : "text-gray-500 hover:text-gray-300"
                      }`}
                    >
                      <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />

                      <span className="font-inter text-[9px] font-medium tracking-wide">
                        {item.label}
                      </span>

                      {isActive && (
                        <motion.div
                          layoutId="nav-pill"
                          className="absolute -bottom-1 h-1 w-1 rounded-full bg-taylor-red"
                        />
                      )}
                    </button>
                  );
                })}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Event Detail Modal */}
        <EventDetailModal
          event={selectedEvent}
          isOpen={showEventDetail}
          onClose={() => setShowEventDetail(false)}
          onCheckIn={handleCheckIn}
          onRSVP={handleRSVP}
        />

        <NotificationCenter
          isOpen={showNotifications}
          onClose={() => setShowNotifications(false)}
          userKey={currentUserKey}
        />
      </div>

      {/* Admin Dashboard Full-Screen Overlay */}
      <AnimatePresence>
        {showAdmin && (
          <motion.div
            key="admin-overlay"
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className={`fixed inset-0 z-[200] overflow-y-auto ${isDarkTheme ? "bg-[#050508]" : "bg-[#f9f7f3]"}`}
          >
            <AdminDashboard
              onBack={() => setShowAdmin(false)}
              userRole={userRole}
              displayName={displayName}
              userId={currentUserKey !== "guest" ? currentUserKey : null}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Chatbot */}
      {currentScreen === "app" &&
        !showAdmin &&
        !showNotifications &&
        !showEventDetail && <Chatbot />}
    </div>
  );
}
