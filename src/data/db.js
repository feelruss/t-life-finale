import { students as initialStudents } from './students';
import { adminUsers as initialAdmins } from './admin';
import { timetable as defaultTimetable, weeklyTimetable as defaultWeeklyTimetable } from './events';

// Initialize the database if it doesn't exist
export const initializeDB = () => {
    const version = '1.2'; // Bump to ensure new passwords take effect
    if (localStorage.getItem('taylors_db_version') !== version) {
        localStorage.removeItem('taylors_students');
        localStorage.removeItem('taylors_admins');
        localStorage.setItem('taylors_db_version', version);
    }

    if (!localStorage.getItem('taylors_students')) {
        localStorage.setItem('taylors_students', JSON.stringify(initialStudents));
    }
    if (!localStorage.getItem('taylors_admins')) {
        localStorage.setItem('taylors_admins', JSON.stringify(initialAdmins));
    }
};

// Students DB Operations
export const getStudents = () => {
    const data = localStorage.getItem('taylors_students');
    return data ? JSON.parse(data) : [];
};

export const createStudent = (studentData) => {
    const students = getStudents();
    
    // Check if email already exists
    if (students.find(s => s.email === studentData.email)) {
        throw new Error('An account with this email already exists.');
    }

    const newStudent = {
        id: `STU-${String(students.length + 1).padStart(3, '0')}`,
        year: 1, // default
        programme: 'New Student', // default
        faculty: 'Unknown', // default
        avatar: studentData.name.charAt(0).toUpperCase(),
        avatarGradient: 'from-blue-500 to-indigo-600', // default
        points: 0,
        eventsAttended: 0,
        focusScore: 50,
        balanceScore: 50,
        streak: 0,
        joinedClubs: [],
        interests: [],
        campusZone: 'Main Campus',
        tgcProgress: { knowledge: 0, problemSolving: 0, communication: 0, teamwork: 0, ethics: 0, leadership: 0, lifelong: 0, entrepreneurial: 0 },
        privacySettings: { shareActivity: true, shareTimetable: false, allowTelemetry: true, showOnLeaderboard: false },
        ...studentData
    };

    students.push(newStudent);
    localStorage.setItem('taylors_students', JSON.stringify(students));
    return newStudent;
};

// Admins DB Operations
export const getAdmins = () => {
    const data = localStorage.getItem('taylors_admins');
    return data ? JSON.parse(data) : [];
};

export const createAdmin = (adminData, creatorRole) => {
    if (creatorRole !== 'Super Admin') {
        throw new Error('Only Super Admins can create new Admin accounts.');
    }

    const admins = getAdmins();

    // Check if email already exists
    if (admins.find(a => a.email === adminData.email)) {
        throw new Error('An admin account with this email already exists.');
    }

    const newAdmin = {
        id: `ADMIN-${String(admins.length + 1).padStart(3, '0')}`,
        avatar: adminData.name.charAt(0).toUpperCase(),
        lastLogin: new Date().toISOString(),
        ...adminData
    };

    admins.push(newAdmin);
    localStorage.setItem('taylors_admins', JSON.stringify(admins));
    return newAdmin;
};

// Auth operations
export const login = (email, password) => {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();
    
    const admins = getAdmins();
    const adminMatch = admins.find(a => a.email.toLowerCase() === trimmedEmail && a.password === trimmedPassword);
    
    if (adminMatch) {
        return { user: adminMatch, type: adminMatch.role === 'Super Admin' ? 'super_admin' : 'admin' };
    }

    const students = getStudents();
    const studentMatch = students.find(s => s.email.toLowerCase() === trimmedEmail && s.password === trimmedPassword);
    
    if (studentMatch) {
        return { user: studentMatch, type: 'student' };
    }

    return null; // Invalid credentials
};

const EVENT_PREFERENCES_KEY = 'taylors_event_preferences';
const EVENT_CHECKINS_KEY = 'taylors_event_checkins';
const NOTIFICATIONS_KEY = 'taylors_notifications';
const PRIVACY_SETTINGS_KEY = 'taylors_privacy_settings';
const RSVP_EVENTS_KEY = 'taylors_rsvp_events';
const CLUB_MEMBERSHIPS_KEY = 'taylors_club_memberships';
const AI_METER_STATE_KEY = 'taylors_ai_meter_state';
const USER_TIMETABLE_KEY = 'taylors_user_timetable';
const USER_POINTS_KEY = 'taylors_user_points';
const USER_ACTIVITY_KEY = 'taylors_user_activity';

const DEFAULT_AI_METER_STATE = {
    focusScore: 50,
    balanceScore: 50,
    recommendation: 'Check in to events to build a clearer focus and wellness trend.',
    updatedAt: null,
};

const clampScore = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 0;
    return Math.max(0, Math.min(100, Math.round(numeric)));
};

const normalizeMeterUserKey = (userKey) => {
    const normalized = String(userKey || 'guest').trim().toLowerCase();
    if (!normalized) return 'guest';
    return normalized.replace(/[^a-z0-9._-]/g, '_');
};

const getScopedStorageKey = (baseKey, userKey = 'guest') => `${baseKey}:${normalizeMeterUserKey(userKey)}`;

const getAIMeterStorageKey = (userKey = 'guest') => `${AI_METER_STATE_KEY}:${normalizeMeterUserKey(userKey)}`;

const hashString = (value = '') => {
    let hash = 0;
    const input = String(value);
    for (let i = 0; i < input.length; i += 1) {
        hash = ((hash << 5) - hash) + input.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash);
};

const classPool = [
    { subject: 'Data Structures', room: 'Block E, R302', zone: 'Block E' },
    { subject: 'Advanced Database', room: 'Block D, Lab 5', zone: 'Block D' },
    { subject: 'Software Engineering', room: 'Block C, R108', zone: 'Block C' },
    { subject: 'Computer Networks', room: 'Block D, R405', zone: 'Block D' },
    { subject: 'AI & Machine Learning', room: 'Block E, Lab 2', zone: 'Block E' },
    { subject: 'Capstone Project', room: 'Block B, R101', zone: 'Block B' },
    { subject: 'Human-Computer Interaction', room: 'Block C, R205', zone: 'Block C' },
    { subject: 'Cloud Computing', room: 'Block E, Lab 4', zone: 'Block E' },
    { subject: 'Cybersecurity Fundamentals', room: 'Block B, LT12', zone: 'Block B' },
    { subject: 'Tutorial: OS', room: 'Block A, R201', zone: 'Block A' },
    { subject: 'Tutorial: Database', room: 'Block D, Lab 5', zone: 'Block D' },
];

const cloneJSON = (value) => JSON.parse(JSON.stringify(value));

const buildUserTimetableProfile = (userKey = 'guest') => {
    const seed = hashString(userKey);
    const weekly = cloneJSON(defaultWeeklyTimetable);
    const dayNames = Object.keys(weekly);
    let classCursor = 0;

    dayNames.forEach((day, dayIndex) => {
        weekly[day] = (weekly[day] || []).map((slot, slotIndex) => {
            if (slot.type === 'free') return slot;

            const poolIndex = (seed + classCursor + dayIndex * 7 + slotIndex * 11) % classPool.length;
            classCursor += 1;
            const selected = classPool[poolIndex];

            return {
                ...slot,
                subject: selected.subject,
                room: selected.room,
                zone: selected.zone,
            };
        });
    });

    const todayBase = cloneJSON(defaultTimetable).map((slot, index) => {
        if (slot.type === 'free') return slot;
        const poolIndex = (seed + index * 13) % classPool.length;
        const selected = classPool[poolIndex];
        return {
            ...slot,
            subject: selected.subject,
            room: selected.room,
            zone: selected.zone,
        };
    });

    return {
        today: todayBase,
        weekly,
        generatedAt: new Date().toISOString(),
    };
};

export const getUserTimetableProfile = (userKey = 'guest') => {
    const storageKey = getScopedStorageKey(USER_TIMETABLE_KEY, userKey);
    const saved = readJSON(storageKey, null);
    if (saved?.today && saved?.weekly) return saved;

    const generated = buildUserTimetableProfile(userKey);
    writeJSON(storageKey, generated);
    return generated;
};

const getBand = (score) => {
    if (score >= 85) return 'high';
    if (score >= 60) return 'mid';
    return 'low';
};

export const buildRecommendationFromScores = ({ focusScore = 50, balanceScore = 50, mode = 'focus' } = {}) => {
    const focus = clampScore(focusScore);
    const balance = clampScore(balanceScore);
    const diff = focus - balance;
    const focusBand = getBand(focus);
    const balanceBand = getBand(balance);

    if (Math.abs(diff) <= 6) {
        if (focusBand === 'high' && balanceBand === 'high') {
            return 'You are in an excellent zone across both focus and wellness, which is exactly what sustainable high performance looks like. Protect this rhythm by alternating deep-work blocks with deliberate recovery breaks so you can stay sharp without burning out.';
        }
        if (focusBand === 'low' && balanceBand === 'low') {
            return 'Your focus and wellness are both running low right now, so this is a good moment to reset your pace instead of forcing intensity. Start with one small win and one short recharge activity to rebuild confidence and momentum step by step.';
        }
        return 'Your focus and wellness are currently balanced, which gives you a strong foundation for a productive day. Keep this steady trend by pairing one priority task with one intentional recovery block so your energy stays consistent.';
    }

    if (diff > 6) {
        if (focusBand === 'high' && balanceBand === 'low') {
            return 'Your focus is very strong, but your wellness score suggests your system is carrying strain beneath the surface. Keep your momentum, but schedule a meaningful recharge window now so your performance stays sustainable through the rest of the day.';
        }
        if (focusBand === 'mid' && balanceBand === 'low') {
            return 'You are leaning toward focus while wellness is slipping, which often leads to sudden energy crashes later. Continue your progress, but add a short recovery break before your next study block to preserve stamina and clarity.';
        }
        return 'Focus is currently ahead of wellness, so your discipline is working but your recovery needs more attention. Maintain your drive and add a small but intentional wellness habit to keep this progress sustainable over time.';
    }

    if (balanceBand === 'high' && focusBand === 'low') {
        return 'Your wellness is in a strong place, which means your mind and body are ready to support deeper concentration. Use this energy to begin one focused sprint on a high-impact task and build momentum from that early win.';
    }
    if (balanceBand === 'mid' && focusBand === 'low') {
        return 'You are recovering reasonably well, but your focus score suggests your attention is still fragmented. Try one distraction-free 25-minute deep-work block to re-engage your concentration and create a clean start.';
    }

    return mode === 'balance'
        ? 'Balance is currently stronger than focus, which is a great sign that your recovery habits are working. Keep that healthy rhythm and channel part of this energy into one concentrated work session to lift your focus score.'
        : 'Balance is currently stronger than focus, showing you have emotional and physical capacity available right now. Convert that stability into action by committing to your next priority task with a clear, distraction-free sprint.';
};

const readJSON = (key, fallback) => {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch {
        return fallback;
    }
};

const writeJSON = (key, value) => {
    localStorage.setItem(key, JSON.stringify(value));
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('taylors-db-updated', { detail: { key } }));
    }
};

export const getEventPreferences = (userKey = 'guest') => {
    const prefs = readJSON(getScopedStorageKey(EVENT_PREFERENCES_KEY, userKey), { interested: [], hidden: [] });
    return {
        interested: Array.isArray(prefs.interested) ? prefs.interested : [],
        hidden: Array.isArray(prefs.hidden) ? prefs.hidden : [],
    };
};

export const setEventInterested = (eventId, interested, userKey = 'guest') => {
    const prefs = getEventPreferences(userKey);
    const nextInterested = new Set(prefs.interested);
    const nextHidden = new Set(prefs.hidden);

    if (interested) {
        nextInterested.add(eventId);
        nextHidden.delete(eventId);
    } else {
        nextInterested.delete(eventId);
    }

    writeJSON(getScopedStorageKey(EVENT_PREFERENCES_KEY, userKey), {
        interested: [...nextInterested],
        hidden: [...nextHidden],
    });
};

export const setEventHidden = (eventId, hidden, userKey = 'guest') => {
    const prefs = getEventPreferences(userKey);
    const nextInterested = new Set(prefs.interested);
    const nextHidden = new Set(prefs.hidden);

    if (hidden) {
        nextHidden.add(eventId);
        nextInterested.delete(eventId);
    } else {
        nextHidden.delete(eventId);
    }

    writeJSON(getScopedStorageKey(EVENT_PREFERENCES_KEY, userKey), {
        interested: [...nextInterested],
        hidden: [...nextHidden],
    });
};

export const getEventCheckIns = (userKey = 'guest') => {
    if (userKey === 'all') {
        const scopedKeys = Object.keys(localStorage).filter((key) => key.startsWith(`${EVENT_CHECKINS_KEY}:`));
        const combined = scopedKeys.flatMap((key) => {
            const logs = readJSON(key, []);
            return Array.isArray(logs) ? logs : [];
        });

        const legacy = readJSON(EVENT_CHECKINS_KEY, []);
        if (Array.isArray(legacy) && legacy.length > 0) {
            combined.push(...legacy);
        }

        return combined.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    const logs = readJSON(getScopedStorageKey(EVENT_CHECKINS_KEY, userKey), []);
    return Array.isArray(logs) ? logs : [];
};

export const toggleEventCheckIn = ({ eventId, eventTitle, userName, userKey = 'guest' }) => {
    const current = getEventCheckIns(userKey);
    const alreadyCheckedIn = current.some((entry) => entry.eventId === eventId);
    if (alreadyCheckedIn) {
        const next = current.filter((entry) => entry.eventId !== eventId);
        writeJSON(getScopedStorageKey(EVENT_CHECKINS_KEY, userKey), next);
        return { status: 'unchecked', logs: next };
    }

    const next = [
        {
            id: `CHK-${Date.now()}`,
            eventId,
            eventTitle,
            userName,
            timestamp: new Date().toISOString(),
        },
        ...current,
    ];

    writeJSON(getScopedStorageKey(EVENT_CHECKINS_KEY, userKey), next);
    return { status: 'checked-in', logs: next };
};

export const getUserRSVPEvents = (userKey = 'guest') => {
    const records = readJSON(getScopedStorageKey(RSVP_EVENTS_KEY, userKey), []);
    return Array.isArray(records) ? records : [];
};

export const getUserRSVPEventIds = (userKey = 'guest') => {
    return getUserRSVPEvents(userKey)
        .map((item) => String(item.eventId || '').trim())
        .filter(Boolean);
};

export const isEventRSVPd = (eventId, userKey = 'guest') => {
    const normalized = String(eventId || '').trim();
    if (!normalized) return false;
    return getUserRSVPEventIds(userKey).includes(normalized);
};

export const toggleEventRSVP = ({ event, userKey = 'guest' }) => {
    const canonicalEventId = String(event?.sourceEventId || event?.id || '').trim();
    if (!canonicalEventId) return { status: 'error', events: getUserRSVPEvents(userKey) };

    const current = getUserRSVPEvents(userKey);
    const exists = current.some((item) => String(item.eventId) === canonicalEventId);

    if (exists) {
        const next = current.filter((item) => String(item.eventId) !== canonicalEventId);
        writeJSON(getScopedStorageKey(RSVP_EVENTS_KEY, userKey), next);
        return { status: 'removed', events: next, eventId: canonicalEventId };
    }

    const next = [
        {
            id: `RSVP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            eventId: canonicalEventId,
            title: event?.title || 'Event',
            host: event?.host || 'Campus Event',
            date: event?.date || null,
            time: event?.time || null,
            location: event?.location || null,
            category: event?.category || null,
            rsvpAt: new Date().toISOString(),
        },
        ...current,
    ];

    writeJSON(getScopedStorageKey(RSVP_EVENTS_KEY, userKey), next);
    return { status: 'added', events: next, eventId: canonicalEventId };
};

export const getNotifications = (userKey = 'guest') => {
    const records = readJSON(getScopedStorageKey(NOTIFICATIONS_KEY, userKey), []);
    return Array.isArray(records) ? records : [];
};

export const addNotification = ({ userKey = 'guest', type = 'general', title, body, priority = 'low', icon = '🔔', accentColor = '#FF3B5C', eventId = null }) => {
    const current = getNotifications(userKey);
    const next = [
        {
            id: `NOTIF-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            type,
            title,
            body,
            priority,
            icon,
            accentColor,
            eventId,
            isRead: false,
            timestamp: new Date().toISOString(),
        },
        ...current,
    ];

    writeJSON(getScopedStorageKey(NOTIFICATIONS_KEY, userKey), next);
    return next[0];
};

export const markNotificationRead = (notificationId, userKey = 'guest') => {
    const next = getNotifications(userKey).map((item) => (
        item.id === notificationId ? { ...item, isRead: true } : item
    ));
    writeJSON(getScopedStorageKey(NOTIFICATIONS_KEY, userKey), next);
    return next;
};

export const markAllNotificationsRead = (userKey = 'guest') => {
    const next = getNotifications(userKey).map((item) => ({ ...item, isRead: true }));
    writeJSON(getScopedStorageKey(NOTIFICATIONS_KEY, userKey), next);
    return next;
};

export const clearNotifications = (userKey = 'guest') => {
    writeJSON(getScopedStorageKey(NOTIFICATIONS_KEY, userKey), []);
    return [];
};

export const getUnreadNotificationCount = (userKey = 'guest') => {
    return getNotifications(userKey).filter((item) => !item.isRead).length;
};

export const getUserPoints = (userKey = 'guest', fallback = 0) => {
    const saved = readJSON(getScopedStorageKey(USER_POINTS_KEY, userKey), null);
    if (typeof saved === 'number' && Number.isFinite(saved)) return Math.max(0, Math.round(saved));
    writeJSON(getScopedStorageKey(USER_POINTS_KEY, userKey), Math.max(0, Math.round(fallback)));
    return Math.max(0, Math.round(fallback));
};

export const setUserPoints = (userKey = 'guest', points = 0) => {
    const normalized = Math.max(0, Math.round(Number(points) || 0));
    writeJSON(getScopedStorageKey(USER_POINTS_KEY, userKey), normalized);
    return normalized;
};

export const adjustUserPoints = (userKey = 'guest', delta = 0, fallback = 0) => {
    const current = getUserPoints(userKey, fallback);
    return setUserPoints(userKey, current + delta);
};

export const addUserActivity = ({ userKey = 'guest', type = 'general', title, detail = '' }) => {
    const key = getScopedStorageKey(USER_ACTIVITY_KEY, userKey);
    const current = readJSON(key, []);
    const next = [
        {
            id: `ACT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            type,
            title,
            detail,
            timestamp: new Date().toISOString(),
        },
        ...(Array.isArray(current) ? current : []),
    ].slice(0, 50);

    writeJSON(key, next);
    return next[0];
};

export const getUserActivity = (userKey = 'guest', limit = 10) => {
    const key = getScopedStorageKey(USER_ACTIVITY_KEY, userKey);
    const current = readJSON(key, []);
    if (!Array.isArray(current)) return [];
    return current.slice(0, Math.max(1, limit));
};

export const resetDemoData = () => {
    clearUserData();
    localStorage.removeItem('taylors_manual_logout');
    localStorage.removeItem('taylors_demo_safe_mode');
    localStorage.setItem('taylors_db_version', '1.2');
};

export const getAIMeterState = (userKey = 'guest') => {
    const storageKey = getAIMeterStorageKey(userKey);
    const saved = readJSON(storageKey, null);
    const merged = {
        ...DEFAULT_AI_METER_STATE,
        ...(saved || {}),
    };

    return {
        ...merged,
        focusScore: clampScore(merged.focusScore),
        balanceScore: clampScore(merged.balanceScore),
    };
};

export const setAIMeterState = (nextState, userKey = 'guest') => {
    const merged = {
        ...getAIMeterState(userKey),
        ...(nextState || {}),
    };

    const normalized = {
        ...merged,
        focusScore: clampScore(merged.focusScore),
        balanceScore: clampScore(merged.balanceScore),
        updatedAt: new Date().toISOString(),
    };

    writeJSON(getAIMeterStorageKey(userKey), normalized);
    return normalized;
};

export const applyEventToAIMeter = ({ category, userKey = 'guest', direction = 'in' }) => {
    const current = getAIMeterState(userKey);
    let nextFocus = current.focusScore;
    let nextBalance = current.balanceScore;
    const factor = direction === 'out' ? -1 : 1;

    if (category === 'focus') {
        nextFocus += 8 * factor;
        nextBalance -= 3 * factor;
    } else if (category === 'balance') {
        nextFocus -= 3 * factor;
        nextBalance += 8 * factor;
    }

    return setAIMeterState({
        ...current,
        focusScore: nextFocus,
        balanceScore: nextBalance,
        recommendation: buildRecommendationFromScores({
            focusScore: nextFocus,
            balanceScore: nextBalance,
            mode: category,
        }),
    }, userKey);
};

export const getPrivacySettings = (userKey = 'guest', defaults = {}) => {
    const saved = readJSON(getScopedStorageKey(PRIVACY_SETTINGS_KEY, userKey), null);
    return {
        ...defaults,
        ...(saved || {}),
    };
};

export const setPrivacySetting = (key, value, userKey = 'guest') => {
    const current = getPrivacySettings(userKey, {});
    current[key] = value;
    writeJSON(getScopedStorageKey(PRIVACY_SETTINGS_KEY, userKey), current);
    return current;
};

export const getClubMemberships = (fallbackIds = []) => {
    const saved = readJSON(CLUB_MEMBERSHIPS_KEY, null);
    if (Array.isArray(saved)) return saved;
    return Array.isArray(fallbackIds) ? fallbackIds : [];
};

export const setClubMembership = (clubId, joined, fallbackIds = []) => {
    const next = new Set(getClubMemberships(fallbackIds));
    if (joined) {
        next.add(clubId);
    } else {
        next.delete(clubId);
    }
    writeJSON(CLUB_MEMBERSHIPS_KEY, [...next]);
    return [...next];
};

export const clearUserData = () => {
    localStorage.removeItem(EVENT_PREFERENCES_KEY);
    localStorage.removeItem(EVENT_CHECKINS_KEY);
    localStorage.removeItem(NOTIFICATIONS_KEY);
    localStorage.removeItem(PRIVACY_SETTINGS_KEY);
    localStorage.removeItem(RSVP_EVENTS_KEY);
    localStorage.removeItem(CLUB_MEMBERSHIPS_KEY);
    localStorage.removeItem(AI_METER_STATE_KEY);
    localStorage.removeItem(USER_TIMETABLE_KEY);
    localStorage.removeItem(USER_POINTS_KEY);
    localStorage.removeItem(USER_ACTIVITY_KEY);
    Object.keys(localStorage)
        .filter((key) => key.startsWith(`${EVENT_PREFERENCES_KEY}:`) || key.startsWith(`${EVENT_CHECKINS_KEY}:`) || key.startsWith(`${NOTIFICATIONS_KEY}:`) || key.startsWith(`${PRIVACY_SETTINGS_KEY}:`) || key.startsWith(`${RSVP_EVENTS_KEY}:`) || key.startsWith(`${USER_TIMETABLE_KEY}:`) || key.startsWith(`${USER_POINTS_KEY}:`) || key.startsWith(`${USER_ACTIVITY_KEY}:`))
        .forEach((key) => localStorage.removeItem(key));
    Object.keys(localStorage)
        .filter((key) => key.startsWith(`${AI_METER_STATE_KEY}:`))
        .forEach((key) => localStorage.removeItem(key));
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('taylors-db-updated', { detail: { key: 'taylors_clear_all' } }));
    }
};
