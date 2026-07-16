// This is the src/App.jsx file
import { useState, useEffect, useCallback } from "react";
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
  timetable as defaultTimetable,
  weeklyTimetable as defaultWeeklyTimetable,
} from "./data/events";
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

export default function App() {
  const MANUAL_LOGOUT_KEY = "taylors_manual_logout";
  const [activeTab, setActiveTab] = useState("home"); // 'home' | 'schedule' | 'explore' | 'profile'
  const [currentScreen, setCurrentScreen] = useState("auth-loading"); // 'auth-loading' | 'landing' | 'login' | 'complete-profile' | 'app'
  const [userRole, setUserRole] = useState("student"); // 'student' | 'admin' | 'super_admin'
  const [currentUserKey, setCurrentUserKey] = useState("guest");
  const [displayName, setDisplayName] = useState("Student");
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

  const applyAuthenticatedUser = useCallback((user) => {
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
    setCurrentUserKey(userKey);
    setAiMeter(loadMeterForUser(userKey));

    // Students must complete their programme first.
    if (role === "student" && programme.length === 0) {
      setPendingProfileUser(user);
      setCurrentScreen("complete-profile");
      return;
    }

    // Programme exists, or this is an admin account.
    setPendingProfileUser(null);
    setActiveTab("home");
    setCurrentScreen("app");
  }, []);

  useEffect(() => {
    initializeDB();
    let isMounted = true;

    const restoreSession = async () => {
      const manuallyLoggedOut = localStorage.getItem(MANUAL_LOGOUT_KEY) === "1";

      if (manuallyLoggedOut) {
        if (isMounted) {
          setCurrentScreen("landing");
        }
        return;
      }

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
        const userProfile = await getCurrentSupabaseUser(session.user);

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
        setUserRole("student");
        setDisplayName("Student");
        setCurrentUserKey("guest");
        setAiMeter(loadMeterForUser("guest"));
        setCurrentScreen(
          localStorage.getItem(MANUAL_LOGOUT_KEY) === "1" ? "landing" : "login",
        );
        return;
      }

      window.setTimeout(async () => {
        try {
          const user = await getCurrentSupabaseUser(session.user);
          if (isMounted && user) applyAuthenticatedUser(user);
        } catch (error) {
          console.error("Failed to refresh authenticated user:", error);
        }
      }, 0);
    });

    const refreshProfile = async () => {
      if (document.visibilityState && document.visibilityState !== "visible")
        return;

      try {
        const user = await getCurrentSupabaseUser();
        if (isMounted && user) applyAuthenticatedUser(user);
      } catch (error) {
        console.error("Failed to refresh Supabase profile:", error);
      }
    };

    document.addEventListener("visibilitychange", refreshProfile);
    window.addEventListener("focus", refreshProfile);

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      document.removeEventListener("visibilitychange", refreshProfile);
      window.removeEventListener("focus", refreshProfile);
    };
  }, [applyAuthenticatedUser]);

  useEffect(() => {
    setTimetableProfile(getUserTimetableProfile(currentUserKey));
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
      addUserActivity({
        userKey: currentUserKey,
        type: "checkin",
        title: `Checked in: ${event.title}`,
        detail: `+50 points • Focus ${nextMeter.focusScore}% • Wellness ${nextMeter.balanceScore}%`,
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
      addUserActivity({
        userKey: currentUserKey,
        type: "uncheckin",
        title: `Unchecked: ${event.title}`,
        detail: `-50 points • Focus ${nextMeter.focusScore}% • Wellness ${nextMeter.balanceScore}%`,
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

  const handleLogout = () => {
    // Never block UI navigation on remote auth calls.
    localStorage.setItem(MANUAL_LOGOUT_KEY, "1");
    setCurrentScreen("landing");
    setUserRole("student");
    setDisplayName("Student");
    setCurrentUserKey("guest");
    setAiMeter(loadMeterForUser("guest"));
    setMode("focus");
    setShowAdmin(false);
    setActiveTab("home");
    setShowNotifications(false);
    setShowEventDetail(false);
    setSelectedEvent(null);

    Promise.race([
      supabase.auth.signOut(),
      new Promise((resolve) => setTimeout(resolve, 1500)),
    ]).catch((error) => {
      console.warn("Supabase signOut failed:", error);
    });

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
      addUserActivity({
        userKey: currentUserKey,
        type: "rsvp",
        title: `RSVP confirmed: ${event.title}`,
        detail: `${event.date || "Date TBC"} • ${event.time || "Time TBC"}`,
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
      addUserActivity({
        userKey: currentUserKey,
        type: "rsvp-remove",
        title: `RSVP removed: ${event.title}`,
        detail: "You removed this event from your upcoming list.",
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

  const navItems = [
    { id: "home", icon: Home, label: "Home" },
    { id: "schedule", icon: Calendar, label: "Schedule" },
    { id: "explore", icon: Compass, label: "Explore" },
    { id: "profile", icon: User, label: "Profile" },
  ];

  const isDarkTheme = true;
  const timetableSyncEnabled = privacySettings.shareTimetable !== false;
  const activeDailyTimetable = timetableSyncEnabled
    ? timetableProfile.today
    : defaultTimetable;
  const activeWeeklyTimetable = timetableSyncEnabled
    ? timetableProfile.weekly
    : defaultWeeklyTimetable;

  return (
    <div className="min-h-screen bg-mesh flex justify-center items-start font-sans theme-dark text-gray-100 bg-[#050508]">
      {/* Mobile Container */}
      <div className="w-full max-w-[430px] h-screen relative flex flex-col shadow-2xl overflow-hidden bg-[#050508] border-x border-white/5">
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
                Checking your account...
              </p>

              <p className="mt-2 text-xs text-gray-500">
                Loading your student profile
              </p>
            </motion.div>
          )}
          {currentScreen === "landing" && (
            <motion.div
              key="landing"
              className="h-full bg-[#050508]"
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <LandingPage onGetStarted={() => setCurrentScreen("login")} />
            </motion.div>
          )}

          {currentScreen === "login" && (
            <motion.div
              key="login"
              className="absolute inset-0 z-50 bg-[#050508]"
              initial={{ opacity: 0, x: "100%" }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
            >
              <LoginPage
                onLogin={({ user }) => {
                  applyAuthenticatedUser(user);
                }}
              />
            </motion.div>
          )}

          {currentScreen === "complete-profile" && (
            <motion.div
              key="complete-profile"
              className="absolute inset-0 z-50 bg-[#050508]"
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
            >
              <CompleteProfilePage
                user={pendingProfileUser}
                onCompleted={(completedUser) => {
                  applyAuthenticatedUser(completedUser);
                }}
              />
            </motion.div>
          )}

          {currentScreen === "app" && (
            <motion.div
              key="app"
              className={`flex flex-col h-full absolute inset-0 ${isDarkTheme ? "bg-[#050508]" : "bg-[#f9f7f3]"}`}
              initial={{ opacity: 0, x: "100%" }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
            >
              {/* Decorative Top Bar */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-taylor-red via-taylor-red-light to-taylor-red z-50 pointer-events-none" />

              {/* Header */}
              <div
                className={`flex-none z-40 backdrop-blur-md sticky top-0 ${isDarkTheme ? "bg-[#050508]/80" : "bg-[#f9f7f3]/90 border-b border-black/5"}`}
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

              {/* Main Content */}
              <main className="flex-1 overflow-y-auto overflow-x-hidden hide-scrollbar pb-24 relative">
                <AnimatePresence mode="wait">
                  {activeTab === "home" && (
                    <motion.div
                      key="home"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.2 }}
                      className={`transition-all duration-500 ${
                        mode === "focus"
                          ? "bg-[#3f000a]"
                          : "bg-gradient-to-br from-[#0f2a27] via-[#050508] to-[#0d1f1a]"
                      }`}
                    >
                      <div className="px-5 pt-6 pb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p
                            className={`text-sm uppercase tracking-[0.22em] ${mode === "focus" ? "text-red-200" : "text-teal-200"}`}
                          >
                            Current mode
                          </p>
                          <h2 className="text-2xl font-bold text-white">
                            {mode === "focus" ? "Focus Mode" : "Balance Mode"}
                          </h2>
                        </div>
                        <div
                          className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-[11px] font-semibold ${mode === "focus" ? "bg-taylor-red/15 text-red-200 border border-taylor-red/30" : "bg-teal-400/10 text-teal-300 border border-teal-300/20"}`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${mode === "focus" ? "bg-taylor-red-light" : "bg-teal-300"}`}
                          />
                          {mode === "focus" ? "Deep focus" : "Chill balance"}
                        </div>
                      </div>

                      <Timetable
                        mode={mode}
                        timetableData={activeDailyTimetable}
                      />
                      <div className="px-5 pb-2 mt-3">
                        <div className="mb-2">
                          <p
                            className={`text-[11px] font-inter font-medium uppercase tracking-widest ${mode === "focus" ? "text-red-100" : "text-teal-100"}`}
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
                    >
                      <SchedulePage
                        weeklyData={activeWeeklyTimetable}
                        userKey={currentUserKey}
                        timetableSynced={timetableSyncEnabled}
                        onEventClick={handleEventClick}
                      />
                    </motion.div>
                  )}
                  {activeTab === "explore" && (
                    <motion.div
                      key="explore"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <Explore />
                    </motion.div>
                  )}
                  {activeTab === "profile" && (
                    <motion.div
                      key="profile"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <Profile
                        mode={mode}
                        onLogout={handleLogout}
                        displayName={displayName}
                        userKey={currentUserKey}
                      />
                    </motion.div>
                  )}
                  {/* 'privacy' tab removed — PrivacyDashboard merged into Profile page */}
                </AnimatePresence>
              </main>

              {/* Bottom Navigation */}
              <nav
                className={`absolute bottom-0 left-0 right-0 backdrop-blur-xl px-4 py-3 flex justify-between items-center z-50 ${isDarkTheme ? "bg-[#050508]/90 border-t border-white/5" : "bg-[#f9f7f3]/95 border-t border-black/10"}`}
              >
                {navItems.map((item) => {
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`flex flex-col items-center gap-1 transition-colors duration-200 ${
                        isActive
                          ? "text-taylor-red"
                          : "text-gray-500 hover:text-gray-300"
                      }`}
                    >
                      <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                      <span className="text-[9px] font-medium font-inter tracking-wide">
                        {item.label}
                      </span>
                      {isActive && (
                        <motion.div
                          layoutId="nav-pill"
                          className="absolute -bottom-1 w-1 h-1 bg-taylor-red rounded-full"
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
      <Chatbot />
    </div>
  );
}
