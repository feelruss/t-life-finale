// Mock admin analytics data
export const adminAnalytics = {
    overview: {
        totalStudents: 2847,
        activeToday: 892,
        totalEvents: 156,
        avgMatchScore: 84.7,
        totalRSVPs: 12450,
        avgAttendanceRate: 73,
    },
    weeklyEngagement: [
        { day: 'Mon', focus: 245, balance: 180 },
        { day: 'Tue', focus: 312, balance: 220 },
        { day: 'Wed', focus: 278, balance: 195 },
        { day: 'Thu', focus: 290, balance: 265 },
        { day: 'Fri', focus: 198, balance: 340 },
        { day: 'Sat', focus: 95, balance: 180 },
        { day: 'Sun', focus: 67, balance: 145 },
    ],
    topEvents: [
        { title: 'Imagine Hack: 24-Hour Code Marathon', rsvps: 89, attendance: 76, rating: 4.8, category: 'focus' },
        { title: 'Python for Data Science Bootcamp', rsvps: 42, attendance: 38, rating: 4.9, category: 'focus' },
        { title: 'Lakeside Campus Run 5K', rsvps: 145, attendance: 132, rating: 4.6, category: 'balance' },
        { title: 'Sunset Yoga & Mindfulness', rsvps: 22, attendance: 20, rating: 4.7, category: 'balance' },
        { title: 'BizPod Startup Networking Tea', rsvps: 35, attendance: 31, rating: 4.5, category: 'balance' },
    ],
    categoryBreakdown: [
        { name: 'Technology', count: 42, color: '#3B82F6' },
        { name: 'Career', count: 28, color: '#F59E0B' },
        { name: 'Wellness', count: 35, color: '#10B981' },
        { name: 'Social', count: 22, color: '#8B5CF6' },
        { name: 'Creative', count: 18, color: '#EC4899' },
        { name: 'Academic', count: 11, color: '#6366F1' },
    ],
    burnoutTelemetry: {
        overallRiskLevel: 'Moderate',
        riskScore: 42, // 0-100
        studentsAtRisk: 234,
        studentsHighRisk: 47,
        focusOnlyStudents: 312, // students who only attend focus events
        avgFocusBalanceRatio: 2.1, // 2.1 focus events per 1 balance
        weeklyTrend: [
            { week: 'W1', risk: 35 },
            { week: 'W2', risk: 38 },
            { week: 'W3', risk: 42 },
            { week: 'W4', risk: 40 },
        ],
        facultyBreakdown: [
            { faculty: 'Computing', risk: 58, students: 420 },
            { faculty: 'Engineering', risk: 52, students: 380 },
            { faculty: 'Business', risk: 35, students: 510 },
            { faculty: 'Design', risk: 28, students: 290 },
            { faculty: 'Hospitality', risk: 22, students: 350 },
        ],
        recommendations: [
            'Schedule more Balance events during midterm weeks (W3-W4)',
            'Computing faculty shows highest burnout risk — target with wellness events',
            'Friday afternoon has 340 Balance event attendees — peak wellness slot',
            'Consider adding break reminders for students with 5+ consecutive Focus events',
        ],
    },
    recentActivity: [
        { action: 'New Event Created', detail: 'AWS Cloud Workshop by Cloud Club', time: '2 hours ago', icon: '➕' },
        { action: 'High RSVP Alert', detail: 'Hackathon at 89/120 capacity', time: '3 hours ago', icon: '📊' },
        { action: 'Burnout Alert', detail: '47 students flagged high-risk this week', time: '5 hours ago', icon: '⚠️' },
        { action: 'Event Completed', detail: 'UI/UX Workshop — 4.9★ avg rating', time: '1 day ago', icon: '✅' },
        { action: 'New Merchant', detail: 'Starbucks added 15% student deal', time: '2 days ago', icon: '🏪' },
    ],
};

// Mock admin users for RBAC
export const adminUsers = [
    { id: 'ADMIN-001', name: 'Mr. Danish Irfan', email: 'danish.admin@taylors.edu.my', password: 'danish123', role: 'Super Admin', faculty: 'Computing', avatar: 'D', lastLogin: '2026-03-02T01:30:00' },
    { id: 'ADMIN-002', name: 'Mr. Faisal', email: 'faisal.admin@taylors.edu.my', password: 'admin123', role: 'Event Manager', faculty: 'Student Affairs', avatar: 'F', lastLogin: '2026-03-01T18:45:00' },
    { id: 'ADMIN-003', name: 'Ms. Felzha', email: 'felzha.admin@taylors.edu.my', password: 'admin123', role: 'Event Manager', faculty: 'Computing', avatar: 'F', lastLogin: '2026-03-01T14:20:00' },
];

// RBAC role definitions
export const roles = {
    'Super Admin': { canCreate: true, canEdit: true, canDelete: true, canViewAnalytics: true, canManageUsers: true, canViewBurnout: true },
    'Event Manager': { canCreate: true, canEdit: true, canDelete: false, canViewAnalytics: true, canManageUsers: false, canViewBurnout: false },
    'Analytics Viewer': { canCreate: false, canEdit: false, canDelete: false, canViewAnalytics: true, canManageUsers: false, canViewBurnout: true },
};
