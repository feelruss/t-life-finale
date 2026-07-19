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
  normalizeMeterCategory,
} from "./data/db";
import LoginPage from "./pages/LoginPage";
import Profile from "./pages/Profile";
import CompleteProfilePage from "./pages/CompleteProfilePage";
import Chatbot from "./components/Chatbot";
import Toast from "./components/Toast";
import { supabase } from "./libs/supabase";
import { getCurrentSupabaseUser } from "./libs/auth";
import { createStudentActivity } from "./services/studentActivityService";
import {
  fetchTimetableSyncSetting,
  timetableSyncEventName,
} from "./services/timetableSyncService";
import { getTodayScheduleBlocks } from "./services/scheduleService";
import {
  generateAIRecommendation,
  saveAIMeterHistory,
  fetchLatestAIMeterHistory,
} from "./services/aiMeterService";
import { registerForEvent, cancelEventRSVP } from "./services/rsvpService";

const saveStudentActivity = (activity) => {
  createStudentActivity(activity).catch((error) => {
    console.error("Unable to save student activity to Supabase:", error);
  });
};

const VALID_APP_ROLES = new Set([
  "student",
  "admin",
  "analytics_viewer",
  "super_admin",
]);

const ADMIN_APP_ROLES = new Set(["admin", "analytics_viewer", "super_admin"]);

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
  const profileApplySequenceRef = useRef(0);
  const confirmedAuthUserRef = useRef({
    id: null,
    role: null,
    displayName: null,
  });

  /*
   * Prevent restoreSession(), SIGNED_IN and profile refresh from loading or creating the same public.users profile simultaneously.
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
  const [loadingRecommendation, setLoadingRecommendation] = useState(false);
  const [refreshStatus, setRefreshStatus] = useState("");
  const recommendationRequestIdRef = useRef(0);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showEventDetail, setShowEventDetail] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [privacySettings, setPrivacySettings] = useState(() =>
    getPrivacySettings("guest", { shareTimetable: true }),
  );
  const [timetableSyncEnabled, setTimetableSyncEnabled] = useState(false);
  const [timetableSyncLoading, setTimetableSyncLoading] = useState(true);
  const [homeTimetable, setHomeTimetable] = useState([]);
  const [homeTimetableLoading, setHomeTimetableLoading] = useState(false);
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const passwordRecoveryRef = useRef(false);
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  const showToast = useCallback((message, title = "") => {
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    setToast({ id: Date.now(), title, message });
    toastTimerRef.current = window.setTimeout(() => setToast(null), 3200);
  }, []);
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
    const {
      resetTab = false,
      allowAccountChange = false,
      requestSequence = null,
    } = options;

    if (!user?.id) {
      console.error(
        "Authenticated profile was ignored because it has no user ID.",
        user,
      );
      return false;
    }

    /*
     * Ignore an older asynchronous profile request when a newer
     * request has already started.
     */
    if (
      requestSequence !== null &&
      requestSequence !== profileApplySequenceRef.current
    ) {
      console.warn("Ignored a stale authenticated profile response.");
      return false;
    }

    const userId = String(user.id).trim();

    /*
     * Never use `|| "student"` here.
     * A missing role means the profile result is incomplete.
     */
    const role = String(user.role || "")
      .trim()
      .toLowerCase();

    if (!VALID_APP_ROLES.has(role)) {
      console.error(
        "Authenticated profile was ignored because it has an invalid role:",
        user.role,
      );
      return false;
    }

    const previousConfirmedUser = confirmedAuthUserRef.current;
    const isSameAuthenticatedUser =
      previousConfirmedUser.id && String(previousConfirmedUser.id) === userId;

    /*
     * Defensive protection:
     * A temporary refresh must not downgrade the same confirmed
     * administrator account to student.
     *
     * A real switch to another account is still allowed after
     * SIGNED_IN passes allowAccountChange: true.
     */
    if (
      isSameAuthenticatedUser &&
      ADMIN_APP_ROLES.has(previousConfirmedUser.role) &&
      role === "student" &&
      !allowAccountChange
    ) {
      console.error("Blocked an unexpected admin-to-student role downgrade.", {
        userId,
        previousRole: previousConfirmedUser.role,
        receivedRole: role,
      });

      return false;
    }

    const programme = String(user.programme || "").trim();
    const userKey = resolveUserKey(user);
    const resolvedName =
      String(user.full_name || "").trim() || resolveDisplayName(user);

    /*
     * Save the confirmed database-backed identity before updating
     * the visible React state.
     */
    confirmedAuthUserRef.current = {
      id: userId,
      role,
      displayName: resolvedName,
    };

    localStorage.removeItem(MANUAL_LOGOUT_KEY);

    setUserRole(role);
    setDisplayName(resolvedName);
    setCurrentEmail(String(user.email || "").trim());
    setCurrentProgramme(programme);
    setCurrentUserKey(userKey);
    setAiMeter(loadMeterForUser(userKey));

    // Rehydrate Focus/Wellness from Supabase history when available.
    if (userKey && userKey !== "guest") {
      fetchLatestAIMeterHistory(userKey)
        .then((row) => {
          if (!row) return;

          /*
           * Do not apply history from a previously logged-in account.
           */
          if (String(confirmedAuthUserRef.current.id || "") !== userId) {
            return;
          }

          const focusScore = Number(row.focus_score);
          const balanceScore = Number(row.balance_score);

          if (!Number.isFinite(focusScore) || !Number.isFinite(balanceScore)) {
            return;
          }

          const next = setAIMeterState(
            {
              focusScore,
              balanceScore,
              recommendation:
                row.ai_recommendation ||
                buildRecommendationFromScores({
                  focusScore,
                  balanceScore,
                  mode: row.mode || "focus",
                }),
              recommendationSource: row.ai_recommendation ? "history" : "rules",
            },
            userKey,
          );

          setAiMeter(next);
        })
        .catch((error) => {
          console.warn("Unable to restore AI meter history:", error);
        });
    }

    // Students must complete their programme first.
    if (role === "student" && programme.length === 0) {
      setPendingProfileUser(user);
      setCurrentScreen("complete-profile");
      return true;
    }

    setPendingProfileUser(null);

    if (resetTab) {
      setActiveTab("home");
    }

    setCurrentScreen("app");
    return true;
  }, []);

  useEffect(() => {
    currentScreenRef.current = currentScreen;
  }, [currentScreen]);

  useEffect(() => {
    initializeDB();
    let isMounted = true;

    const isPasswordRecoveryUrl = () => {
      if (typeof window === "undefined") return false;
      const hash = String(window.location.hash || "").toLowerCase();
      const search = String(window.location.search || "").toLowerCase();
      return (
        hash.includes("type=recovery") ||
        search.includes("type=recovery") ||
        hash.includes("type%3drecovery")
      );
    };

    const enterPasswordRecovery = () => {
      passwordRecoveryRef.current = true;
      setPasswordRecovery(true);
      setCurrentScreen("login");
      // Clear tokens from the URL after Supabase has consumed them.
      if (typeof window !== "undefined" && window.history?.replaceState) {
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname,
        );
      }
    };

    const restoreSession = async () => {
      try {
        // Recovery email links can hydrate a session before PASSWORD_RECOVERY fires.
        if (isPasswordRecoveryUrl()) {
          enterPasswordRecovery();
          return;
        }

        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        // No Supabase session: show the normal landing page.
        if (!session?.user) {
          if (isMounted) {
            setCurrentScreen("landing");
          }
          return;
        }

        if (passwordRecoveryRef.current) {
          setCurrentScreen("login");
          return;
        }

        // Keep displaying auth-loading while the public.users row is loaded.
        const requestSequence = ++profileApplySequenceRef.current;

        const userProfile = await loadAuthenticatedProfile(session.user);

        if (!isMounted) return;

        if (!userProfile) {
          console.error(
            "Supabase authentication exists, but the public.users profile could not be loaded.",
          );

          setCurrentScreen("login");
          return;
        }

        applyAuthenticatedUser(userProfile, {
          requestSequence,
          allowAccountChange: true,
        });
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

      // Email reset link lands here — show "set new password" before full app entry.
      if (event === "PASSWORD_RECOVERY" || isPasswordRecoveryUrl()) {
        enterPasswordRecovery();
        return;
      }

      /*
       * restoreSession() already handles the initial session.
       * Ignoring INITIAL_SESSION prevents competing screen changes
       * while the Supabase session is being restored.
       */
      if (event === "INITIAL_SESSION") {
        return;
      }

      if (event === "SIGNED_OUT" || !session?.user) {
        authProfileRequestRef.current = {
          userId: null,
          promise: null,
        };
        profileApplySequenceRef.current += 1;

        confirmedAuthUserRef.current = {
          id: null,
          role: null,
          displayName: null,
        };
        passwordRecoveryRef.current = false;
        setPasswordRecovery(false);
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
      if (
        event !== "SIGNED_IN" &&
        event !== "USER_UPDATED" &&
        event !== "TOKEN_REFRESHED"
      ) {
        return;
      }

      // Stay on reset form until the new password is saved.
      if (passwordRecoveryRef.current) {
        return;
      }

      const requestSequence = ++profileApplySequenceRef.current;

      window.setTimeout(async () => {
        try {
          const user = await loadAuthenticatedProfile(session.user);

          if (!isMounted || !user) {
            return;
          }

          applyAuthenticatedUser(user, {
            requestSequence,

            /*
             * A SIGNED_IN event may represent a real account change.
             * TOKEN_REFRESHED and USER_UPDATED must preserve the
             * currently confirmed account role.
             */
            allowAccountChange: event === "SIGNED_IN",
          });
        } catch (error) {
          console.error(
            `Failed to refresh authenticated user after ${event}:`,
            error,
          );

          /*
           * Keep the previous confirmed user.
           * Do not reset userRole or displayName here.
           */
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

        const requestSequence = ++profileApplySequenceRef.current;

        const user = await loadAuthenticatedProfile(session.user);

        if (isMounted && user) {
          applyAuthenticatedUser(user, {
            requestSequence,
            allowAccountChange: false,
          });
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

  // Keep Home ticker on the same Supabase timetable as Schedule → Academic Timeline.
  useEffect(() => {
    let cancelled = false;

    const loadHomeTimetable = async () => {
      if (
        !timetableSyncEnabled ||
        !currentUserKey ||
        currentUserKey === "guest"
      ) {
        if (!cancelled) {
          setHomeTimetable([]);
          setHomeTimetableLoading(false);
        }
        return;
      }

      setHomeTimetableLoading(true);

      try {
        const blocks = await getTodayScheduleBlocks({
          studentId: currentUserKey,
          programme: currentProgramme,
        });
        if (!cancelled) setHomeTimetable(Array.isArray(blocks) ? blocks : []);
      } catch (error) {
        console.error("Unable to load home timetable from Supabase:", error);
        if (!cancelled) setHomeTimetable([]);
      } finally {
        if (!cancelled) setHomeTimetableLoading(false);
      }
    };

    void loadHomeTimetable();

    return () => {
      cancelled = true;
    };
  }, [currentUserKey, currentProgramme, timetableSyncEnabled]);

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

    window.addEventListener(timetableSyncEventName, handleTimetableSyncUpdate);

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

  const refreshRecommendation = useCallback(
    async ({ useAI = true } = {}) => {
      const requestId = ++recommendationRequestIdRef.current;
      setLoadingRecommendation(true);
      if (useAI) setRefreshStatus("Updating…");

      try {
        // Pull latest scores from cloud history, then local meter.
        let current = getAIMeterState(currentUserKey);
        if (useAI && currentUserKey && currentUserKey !== "guest") {
          const history = await fetchLatestAIMeterHistory(currentUserKey);
          if (history && recommendationRequestIdRef.current === requestId) {
            const focusScore = Number(history.focus_score);
            const balanceScore = Number(history.balance_score);
            if (Number.isFinite(focusScore) && Number.isFinite(balanceScore)) {
              current = {
                ...current,
                focusScore,
                balanceScore,
              };
            }
          }
        }

        let recommendation = buildRecommendationFromScores({
          focusScore: current.focusScore,
          balanceScore: current.balanceScore,
          mode,
        });
        let source = "rules";

        if (useAI) {
          const aiResult = await generateAIRecommendation({
            mode,
            focusScore: current.focusScore,
            balanceScore: current.balanceScore,
            displayName,
            recentActivities: [
              `Mode: ${mode}`,
              `Focus ${current.focusScore}%`,
              `Wellness ${current.balanceScore}%`,
              `Refresh at ${new Date().toLocaleTimeString()}`,
            ],
          });
          recommendation = aiResult.recommendation;
          source = aiResult.source;
        }

        if (recommendationRequestIdRef.current !== requestId) return;

        const next = setAIMeterState(
          {
            ...current,
            recommendation,
            recommendationSource: source,
          },
          currentUserKey,
        );
        setAiMeter(next);
        if (useAI) {
          setRefreshStatus(
            source === "groq"
              ? `Updated ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
              : "Updated (offline rules)",
          );
        }

        if (useAI && currentUserKey && currentUserKey !== "guest") {
          saveAIMeterHistory({
            userId: currentUserKey,
            mode,
            focusScore: next.focusScore,
            balanceScore: next.balanceScore,
            recommendation: next.recommendation,
          }).catch(() => {});
        }
      } catch (error) {
        console.warn("Refresh recommendation failed:", error);
        if (useAI) setRefreshStatus("Refresh failed — try again");
      } finally {
        if (recommendationRequestIdRef.current === requestId) {
          setLoadingRecommendation(false);
        }
      }
    },
    [currentUserKey, displayName, mode],
  );

  useEffect(() => {
    // Mode switches use fast local rules; Refresh button uses full Groq AI.
    refreshRecommendation({ useAI: false });
  }, [mode, currentUserKey, refreshRecommendation]);

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
      if (currentUserKey && currentUserKey !== "guest") {
        saveAIMeterHistory({
          userId: currentUserKey,
          mode: event.category || mode,
          focusScore: nextMeter.focusScore,
          balanceScore: nextMeter.balanceScore,
          recommendation: nextMeter.recommendation,
        }).catch(() => {});
        // Refresh AI advice after engagement changes
        generateAIRecommendation({
          mode,
          focusScore: nextMeter.focusScore,
          balanceScore: nextMeter.balanceScore,
          displayName: actorName,
          recentActivities: [`Checked in: ${event.title}`],
        }).then((aiResult) => {
          const withAI = setAIMeterState(
            {
              ...nextMeter,
              recommendation: aiResult.recommendation,
              recommendationSource: aiResult.source,
            },
            currentUserKey,
          );
          setAiMeter(withAI);
          saveAIMeterHistory({
            userId: currentUserKey,
            mode,
            focusScore: withAI.focusScore,
            balanceScore: withAI.balanceScore,
            recommendation: withAI.recommendation,
          }).catch(() => {});
        });
      }
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
      showToast(
        `+50 points · Focus & Wellness updated.`,
        `Checked in: ${event.title}`,
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
      showToast(
        "Focus & Wellness scores adjusted.",
        `Check-in removed: ${event.title}`,
      );
    } else {
      showToast("Please try again.", "Check-in failed");
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
      showToast(`-${cost} points remaining: ${nextPoints}`, "Reward redeemed");
    } else {
      showToast("Earn more points from events first.", "Not enough points");
    }
  };

  const handleEventClick = (event) => {
    if (!event) return;

    const canonicalId = String(
      event.sourceEventId || event.sourceId || event.eventId || event.id || "",
    ).trim();

    setSelectedEvent({
      ...event,
      // The modal and Supabase RSVP should use the real campus_events ID.
      id: canonicalId,
      sourceEventId: canonicalId,
      isRSVPd:
        Boolean(event.isRSVPd) ||
        (canonicalId ? rsvpEventIds.map(String).includes(canonicalId) : false),
    });
    setShowEventDetail(true);
  };

  const handleLogout = async () => {
    authProfileRequestRef.current = {
      userId: null,
      promise: null,
    };

    /*
     * Invalidates every pending profile refresh and clears the
     * last confirmed administrator identity.
     */
    profileApplySequenceRef.current += 1;

    confirmedAuthUserRef.current = {
      id: null,
      role: null,
      displayName: null,
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
    if (!event?.id && !event?.sourceEventId && !event?.eventId) {
      return { isRSVPd: Boolean(event?.isRSVPd) };
    }

    const result = toggleEventRSVP({
      event,
      userKey: currentUserKey,
    });
    const canonicalId = String(
      result.eventId ||
        event.sourceEventId ||
        event.sourceId ||
        event.eventId ||
        event.id ||
        "",
    ).trim();
    const meterCategory = normalizeMeterCategory(event.category || mode);

    setRsvpEventIds(getUserRSVPEventIds(currentUserKey));
    setSelectedEvent((prev) => {
      if (!prev) return prev;
      const prevCanonical = String(
        prev.sourceEventId || prev.sourceId || prev.eventId || prev.id || "",
      ).trim();
      if (prevCanonical !== canonicalId) {
        return prev;
      }
      return {
        ...prev,
        isRSVPd: result.status === "added",
      };
    });

    // Joining / leaving an event must move Focus & Wellness (was check-in only).
    if (result.status === "added" || result.status === "removed") {
      const nextMeter = applyEventToAIMeter({
        category: meterCategory,
        userKey: currentUserKey,
        direction: result.status === "added" ? "in" : "out",
      });
      setAiMeter(nextMeter);

      if (currentUserKey && currentUserKey !== "guest") {
        saveAIMeterHistory({
          userId: currentUserKey,
          mode: meterCategory,
          focusScore: nextMeter.focusScore,
          balanceScore: nextMeter.balanceScore,
          recommendation: nextMeter.recommendation,
        }).catch(() => {});

        registerOrCancelCloudRSVP({
          status: result.status,
          studentId: currentUserKey,
          eventId: canonicalId,
          eventTitle: event.title,
          skipActivity: true,
        });
      }

      if (result.status === "added") {
        const activity = {
          userKey: currentUserKey,
          type: "rsvp",
          title: `RSVP confirmed: ${event.title}`,
          detail: `Focus ${nextMeter.focusScore}% • Wellness ${nextMeter.balanceScore}%`,
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
          body: `You joined ${event.title}. AI Status Meter updated.`,
          priority: "medium",
          icon: "🎟️",
          accentColor: "#60A5FA",
          eventId: canonicalId,
        });
        showToast(
          `Focus ${nextMeter.focusScore}% · Wellness ${nextMeter.balanceScore}%`,
          `Joined ${event.title}`,
        );
      } else {
        const activity = {
          userKey: currentUserKey,
          type: "rsvp-remove",
          title: `RSVP removed: ${event.title}`,
          detail: `Focus ${nextMeter.focusScore}% • Wellness ${nextMeter.balanceScore}%`,
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
          body: `${event.title} removed. Scores adjusted.`,
          priority: "low",
          icon: "🗑️",
          accentColor: "#9CA3AF",
          eventId: canonicalId,
        });
        showToast(
          `Focus ${nextMeter.focusScore}% · Wellness ${nextMeter.balanceScore}%`,
          `Left ${event.title}`,
        );
      }
    }

    return { isRSVPd: result.status === "added" };
  };

  const registerOrCancelCloudRSVP = ({
    status,
    studentId,
    eventId,
    eventTitle,
    skipActivity = true,
  }) => {
    if (!studentId || studentId === "guest" || !eventId) return;

    const action =
      status === "added"
        ? registerForEvent({ studentId, eventId, eventTitle, skipActivity })
        : cancelEventRSVP({ studentId, eventId, eventTitle, skipActivity });

    action.catch((error) => {
      console.warn("Cloud RSVP sync failed:", error?.message || error);
    });
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
  // Prefer live Supabase day schedule so Home matches Schedule tab.
  const activeDailyTimetable = timetableSyncEnabled ? homeTimetable : [];

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
                passwordRecovery={passwordRecovery}
                onPasswordUpdated={async () => {
                  passwordRecoveryRef.current = false;
                  setPasswordRecovery(false);
                  try {
                    const {
                      data: { user: authUser },
                    } = await supabase.auth.getUser();
                    if (!authUser) {
                      setCurrentScreen("login");
                      return;
                    }
                    const profile = await loadAuthenticatedProfile(authUser);
                    if (profile) {
                      const requestSequence = ++profileApplySequenceRef.current;

                      applyAuthenticatedUser(profile, {
                        resetTab: true,
                        allowAccountChange: true,
                        requestSequence,
                      });
                    }
                  } catch (error) {
                    console.error("Post-reset login failed:", error);
                    setCurrentScreen("login");
                  }
                }}
                onLogin={({ user }) => {
                  passwordRecoveryRef.current = false;
                  setPasswordRecovery(false);

                  const requestSequence = ++profileApplySequenceRef.current;

                  applyAuthenticatedUser(user, {
                    resetTab: true,
                    allowAccountChange: true,
                    requestSequence,
                  });
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
                  const requestSequence = ++profileApplySequenceRef.current;

                  applyAuthenticatedUser(completedUser, {
                    resetTab: true,
                    allowAccountChange: false,
                    requestSequence,
                  });
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
                        loading={homeTimetableLoading || timetableSyncLoading}
                        syncEnabled={timetableSyncEnabled}
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
                          recommendationSource={aiMeter.recommendationSource}
                          refreshStatus={refreshStatus}
                          loadingRecommendation={loadingRecommendation}
                          onRefreshRecommendation={() =>
                            refreshRecommendation({ useAI: true })
                          }
                        />
                      </div>

                      <ModeToggle mode={mode} onToggle={toggleMode} />

                      <EventFeed
                        mode={mode}
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
        !showEventDetail && <Chatbot mode={mode} displayName={displayName} />}

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
