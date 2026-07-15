// Notification data for context-aware push notifications
export const notifications = [
    {
        id: "NOTIF-001",
        type: "free-slot-match",
        title: "🎯 Perfect Match in Your Free Slot!",
        body: "\"Imagine Hack: 24-Hour Code Marathon\" starts at 2:00 PM — exactly when your free slot begins. 98% match score!",
        eventId: "EVT-001",
        timestamp: "2026-03-02T13:45:00",
        isRead: false,
        priority: "high",
        icon: "⚡",
        accentColor: "#FF3B5C",
    },
    {
        id: "NOTIF-002",
        type: "balance-reminder",
        title: "🌿 Time for a Break, Rayat",
        body: "You've attended 3 Focus events this week but 0 Balance events. \"Sunset Yoga\" is happening near your Block D location at 2 PM.",
        eventId: "EVT-004",
        timestamp: "2026-03-02T11:30:00",
        isRead: false,
        priority: "medium",
        icon: "🧘",
        accentColor: "#4EEAAF",
    },
    {
        id: "NOTIF-003",
        type: "friend-attending",
        title: "👥 3 Friends Just RSVP'd",
        body: "Aira, Kael, and Priya are going to \"BizPod Startup Networking Tea\" at 4 PM. Join them?",
        eventId: "EVT-005",
        timestamp: "2026-03-02T10:15:00",
        isRead: true,
        priority: "medium",
        icon: "🤝",
        accentColor: "#38BDF8",
    },
    {
        id: "NOTIF-004",
        type: "tgc-milestone",
        title: "🏆 TGC Milestone Unlocked!",
        body: "Your Ethics & Professionalism score reached 90%! You're in the top 5% of students. Keep it up!",
        eventId: null,
        timestamp: "2026-03-01T16:00:00",
        isRead: true,
        priority: "low",
        icon: "⚖️",
        accentColor: "#A78BFA",
    },
    {
        id: "NOTIF-005",
        type: "merchant-deal",
        title: "☕ Starbucks Deal During Your Gap!",
        body: "You have a 2-hour gap at 2 PM. Get 20% off a Grande at Starbucks Syopz Mall — only 5 min walk from Block D!",
        dealId: "DEAL-001",
        timestamp: "2026-03-01T13:30:00",
        isRead: true,
        priority: "low",
        icon: "🏷️",
        accentColor: "#FBBF24",
    },
    {
        id: "NOTIF-007",
        type: "event-reminder",
        title: "📅 Event Starting in 30 Minutes",
        body: "\"Cybersecurity Industry Panel\" begins at 3:00 PM in Lecture Theatre 12. Don't forget!",
        eventId: "EVT-002",
        timestamp: "2026-03-02T14:30:00",
        isRead: false,
        priority: "high",
        icon: "🔔",
        accentColor: "#FF6B4A",
    },
    {
        id: "NOTIF-008",
        type: "leaderboard",
        title: "📊 You Climbed the Leaderboard!",
        body: "You moved from #5 to #3 on the Campus Leaderboard this week. +50 points from yesterday's check-in!",
        eventId: null,
        timestamp: "2026-02-28T18:00:00",
        isRead: true,
        priority: "low",
        icon: "🏅",
        accentColor: "#FBBF24",
    },
];

// Get unread count
export function getUnreadCount(notifs = notifications) {
    return notifs.filter(n => !n.isRead).length;
}

// Get notifications grouped by date
export function getGroupedNotifications(notifs = notifications) {
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    const groups = {};
    notifs.forEach(n => {
        const date = new Date(n.timestamp).toDateString();
        let label = date;
        if (date === today) label = 'Today';
        else if (date === yesterday) label = 'Yesterday';
        else label = new Date(n.timestamp).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

        if (!groups[label]) groups[label] = [];
        groups[label].push(n);
    });

    return groups;
}
