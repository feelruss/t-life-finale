import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import {
    BarChart3, Users, Calendar, TrendingUp, AlertTriangle, Plus,
    Edit3, Trash2, Eye, Shield, Activity, ChevronRight, X,
    ArrowUpRight, ArrowDownRight, Clock, Star, Zap
} from 'lucide-react';
import { adminAnalytics, roles } from '../data/admin';
import { events } from '../data/events';
import { getAdmins, createAdmin, getEventCheckIns, resetDemoData } from '../data/db';

// Simple bar chart component
function MiniBarChart({ data, dataKeyA, dataKeyB, labelKey, height = 120 }) {
    const maxVal = Math.max(...data.map(d => Math.max(d[dataKeyA], d[dataKeyB])));
    return (
        <div className="flex items-end justify-between gap-1" style={{ height }}>
            {data.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                    <div className="flex items-end gap-px w-full justify-center" style={{ height: height - 20 }}>
                        <motion.div
                            className="flex-1 max-w-[12px] rounded-t bg-taylor-red/80"
                            initial={{ height: 0 }}
                            animate={{ height: `${(d[dataKeyA] / maxVal) * 100}%` }}
                            transition={{ duration: 0.5, delay: i * 0.05 }}
                        />
                        <motion.div
                            className="flex-1 max-w-[12px] rounded-t bg-balance-accent/80"
                            initial={{ height: 0 }}
                            animate={{ height: `${(d[dataKeyB] / maxVal) * 100}%` }}
                            transition={{ duration: 0.5, delay: i * 0.05 + 0.1 }}
                        />
                    </div>
                    <span className="text-[8px] font-inter text-gray-500">{d[labelKey]}</span>
                </div>
            ))}
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
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center`} style={{ backgroundColor: color + '20' }}>
                    <Icon size={16} style={{ color }} />
                </div>
                {change && (
                    <span className={`text-[10px] font-inter font-bold flex items-center gap-0.5 ${changeType === 'up' ? 'text-green-400' : 'text-red-400'}`}>
                        {changeType === 'up' ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                        {change}
                    </span>
                )}
            </div>
            <p className="text-xl font-outfit font-bold text-white">{value}</p>
            <p className="text-[10px] font-inter text-gray-500 mt-0.5">{label}</p>
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
                    <p className="text-xs font-outfit font-semibold text-white truncate">{event.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[9px] font-inter text-gray-500">{event.host}</span>
                        <span className={`text-[9px] font-inter font-bold px-1.5 py-0.5 rounded ${event.category === 'focus' ? 'bg-taylor-red/10 text-taylor-red' : 'bg-balance-accent/10 text-balance-accent'}`}>
                            {event.category}
                        </span>
                        <span className={`text-[9px] font-inter ${capacityPercent > 80 ? 'text-yellow-400' : 'text-gray-500'}`}>
                            {event.registered}/{event.capacity}
                        </span>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-1 ml-2">
                <button onClick={() => onEdit(event)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                    <Edit3 size={13} className="text-gray-400" />
                </button>
                {canDelete && (
                    <button onClick={() => onDelete(event.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors">
                        <Trash2 size={13} className="text-red-400" />
                    </button>
                )}
            </div>
        </div>
    );
}

export default function AdminDashboard({ onBack, userRole }) {
    // If they logged in as super_admin, default to Danish (index 0). Otherwise Faisal (index 1).
    const initialIndex = userRole === 'super_admin' ? 0 : 1;
    const [adminUserIndex, setAdminUserIndex] = useState(initialIndex);
    const [activeSection, setActiveSection] = useState('overview'); // overview | events | burnout | access
    const [showCreateModal, setShowCreateModal] = useState(false);
    
    // User Management State
    const [showCreateUserModal, setShowCreateUserModal] = useState(false);
    const [localAdminUsers, setLocalAdminUsers] = useState(getAdmins());
    const [newUser, setNewUser] = useState({
        name: '', email: '', password: '', role: 'Event Manager', faculty: 'Computing'
    });

    const [editingEvent, setEditingEvent] = useState(null);
    const [adminEvents, setAdminEvents] = useState(events);
    const [newEvent, setNewEvent] = useState({
        title: '', host: '', date: '', time: '', location: '',
        category: 'focus', capacity: 50, description: '', zone: 'Block D',
    });

    const currentAdmin = localAdminUsers[adminUserIndex]; // Dynamically selected admin
    const permissions = roles[currentAdmin?.role || 'Event Manager'];
    const analytics = adminAnalytics;
    const recentCheckIns = getEventCheckIns('all').slice(0, 8);

    const handleDelete = (id) => {
        if (confirm('Delete this event?')) {
            setAdminEvents(prev => prev.filter(e => e.id !== id));
        }
    };

    const handleCreate = () => {
        const evt = {
            ...newEvent,
            id: `EVT-${String(adminEvents.length + 1).padStart(3, '0')}`,
            match_score: '—',
            match_breakdown: { interest: 0, schedule: 0, proximity: 0, social: 0 },
            friends_attending: 0,
            friendNames: [],
            emoji: newEvent.category === 'focus' ? '📚' : '🌿',
            icon: 'CodeBracketIcon',
            accent: '#E31837',
            tag: 'General',
            tgcTags: [],
            registered: 0,
            isRSVPd: false,
            accessibility: [],
        };
        setAdminEvents(prev => [evt, ...prev]);
        setShowCreateModal(false);
        setNewEvent({ title: '', host: '', date: '', time: '', location: '', category: 'focus', capacity: 50, description: '', zone: 'Block D' });
    };

    const handleCreateUser = () => {
        try {
            const currentAdminRole = currentAdmin?.role || 'Event Manager';
            const adminObj = createAdmin({
                name: newUser.name,
                email: newUser.email,
                password: newUser.password,
                role: newUser.role,
                faculty: newUser.faculty
            }, currentAdminRole);

            // Refetch admins
            setLocalAdminUsers(getAdmins());

            alert(`Account successfully created for ${newUser.name}!`);
            setShowCreateUserModal(false);
            setNewUser({ name: '', email: '', password: '', role: 'Event Manager', faculty: 'Computing' });
        } catch (err) {
            alert(err.message);
        }
    };

    const sections = [
        { id: 'overview', icon: BarChart3, label: 'Overview' },
        { id: 'events', icon: Calendar, label: 'Events' },
        ...(permissions.canViewBurnout ? [{ id: 'burnout', icon: Activity, label: 'Burnout' }] : []),
        ...(permissions.canManageUsers ? [{ id: 'access', icon: Shield, label: 'Access' }] : []),
    ];

    return (
        <div className="min-h-screen bg-[#050508] text-white">
            {/* Admin Header */}
            <div className="sticky top-0 z-50 bg-[#050508]/90 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-[900px] mx-auto px-5 pt-4 pb-2">
                    {/* Top row: close button + title + avatar */}
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                            <button onClick={onBack} className="p-2 rounded-xl glass hover:bg-white/10 transition-colors">
                                <X size={16} className="text-gray-400" />
                            </button>
                            <div>
                                <h1 className="text-base font-outfit font-bold text-white">
                                    Admin Dashboard
                                </h1>
                                <p className="text-[10px] font-inter text-gray-500">Welcome, {currentAdmin.name}</p>
                            </div>
                        </div>
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-taylor-red to-taylor-red-dark flex items-center justify-center text-sm font-bold shadow-glow-red">
                            {currentAdmin.avatar}
                        </div>
                    </div>

                    <div className="flex justify-end mb-2">
                        <button
                            onClick={() => {
                                if (!confirm('Reset demo data for all users? This will clear check-ins, notifications, meter, and timetables.')) return;
                                resetDemoData();
                                window.location.reload();
                            }}
                            className="text-[10px] font-inter font-semibold px-3 py-1.5 rounded-lg bg-red-500/10 text-red-300 border border-red-500/30 hover:bg-red-500/20"
                        >
                            Reset Demo Data
                        </button>
                    </div>

                    {/* Admin Switcher Row */}
                    <div className="flex items-center gap-2 ml-11">
                        <span className="text-[9px] font-inter font-medium bg-taylor-red/20 text-taylor-red px-2 py-0.5 rounded-full border border-taylor-red/30 whitespace-nowrap">
                            {currentAdmin.role}
                        </span>
                        <select 
                            value={adminUserIndex}
                            onChange={(e) => {
                                setAdminUserIndex(Number(e.target.value));
                                setActiveSection('overview');
                            }}
                            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-[11px] font-inter text-gray-300 focus:outline-none focus:border-taylor-red/50 cursor-pointer"
                            style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
                        >
                            {localAdminUsers.map((u, i) => (
                                <option key={u.id} value={i} className="bg-[#12121a] text-white">
                                    {u.name} — {u.role}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Section Tabs */}
                <div className="max-w-[900px] mx-auto px-5 pb-3 flex gap-2">
                    {sections.map((sec) => (
                        <button
                            key={sec.id}
                            onClick={() => setActiveSection(sec.id)}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-outfit font-semibold transition-all duration-300 ${activeSection === sec.id
                                ? 'bg-taylor-red/20 text-taylor-red border border-taylor-red/30'
                                : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                                }`}
                        >
                            <sec.icon size={14} />
                            {sec.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="max-w-[900px] mx-auto px-5 py-6">
                <AnimatePresence mode="wait">
                    {/* OVERVIEW SECTION */}
                    {activeSection === 'overview' && (
                        <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            {/* Stat Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                                <StatCard icon={Users} label="Total Students" value={analytics.overview.totalStudents.toLocaleString()} change="+12%" changeType="up" color="#3B82F6" />
                                <StatCard icon={Zap} label="Active Today" value={analytics.overview.activeToday} change="+8%" changeType="up" color="#10B981" />
                                <StatCard icon={Calendar} label="Total Events" value={analytics.overview.totalEvents} change="+3" changeType="up" color="#F59E0B" />
                                <StatCard icon={TrendingUp} label="Avg Match Score" value={`${analytics.overview.avgMatchScore}%`} change="+2.3%" changeType="up" color="#8B5CF6" />
                                <StatCard icon={Star} label="Total RSVPs" value={analytics.overview.totalRSVPs.toLocaleString()} change="+15%" changeType="up" color="#EC4899" />
                                <StatCard icon={Activity} label="Attendance Rate" value={`${analytics.overview.avgAttendanceRate}%`} change="-1.2%" changeType="down" color="#EF4444" />
                            </div>

                            {/* Weekly Engagement Chart */}
                            <div className="glass rounded-2xl p-5 mb-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-outfit font-semibold text-white">Weekly Engagement</h3>
                                    <div className="flex items-center gap-3">
                                        <span className="flex items-center gap-1 text-[9px] font-inter text-gray-400">
                                            <span className="w-2 h-2 rounded-sm bg-taylor-red/80"></span> Focus
                                        </span>
                                        <span className="flex items-center gap-1 text-[9px] font-inter text-gray-400">
                                            <span className="w-2 h-2 rounded-sm bg-balance-accent/80"></span> Balance
                                        </span>
                                    </div>
                                </div>
                                <MiniBarChart data={analytics.weeklyEngagement} dataKeyA="focus" dataKeyB="balance" labelKey="day" height={140} />
                            </div>

                            {/* Top Events + Category Split */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                {/* Top Events */}
                                <div className="glass rounded-2xl p-5">
                                    <h3 className="text-sm font-outfit font-semibold text-white mb-3">Top Events This Month</h3>
                                    <div className="space-y-2">
                                        {analytics.topEvents.map((evt, i) => (
                                            <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02]">
                                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                                    <span className="text-[10px] font-bold text-gray-600 w-4">#{i + 1}</span>
                                                    <p className="text-[11px] font-inter text-white truncate">{evt.title}</p>
                                                </div>
                                                <div className="flex items-center gap-2 ml-2">
                                                    <span className="text-[10px] font-inter text-yellow-400">★ {evt.rating}</span>
                                                    <span className="text-[10px] font-inter text-gray-500">{evt.attendance}/{evt.rsvps}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Category Breakdown */}
                                <div className="glass rounded-2xl p-5">
                                    <h3 className="text-sm font-outfit font-semibold text-white mb-3">Event Categories</h3>
                                    <div className="space-y-2.5">
                                        {analytics.categoryBreakdown.map((cat) => (
                                            <div key={cat.name}>
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-[11px] font-inter text-gray-400">{cat.name}</span>
                                                    <span className="text-[11px] font-inter font-bold" style={{ color: cat.color }}>{cat.count}</span>
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
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Recent Activity */}
                            <div className="glass rounded-2xl p-5">
                                <h3 className="text-sm font-outfit font-semibold text-white mb-3">Recent Activity</h3>
                                <div className="space-y-2">
                                    {analytics.recentActivity.map((act, i) => (
                                        <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.02]">
                                            <span className="text-lg">{act.icon}</span>
                                            <div className="flex-1">
                                                <p className="text-xs font-outfit font-semibold text-white">{act.action}</p>
                                                <p className="text-[10px] font-inter text-gray-500">{act.detail}</p>
                                            </div>
                                            <span className="text-[9px] font-inter text-gray-600">{act.time}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* EVENTS CRUD SECTION */}
                    {activeSection === 'events' && (
                        <motion.div key="events" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-outfit font-bold text-white">
                                    Event Management <span className="text-sm font-normal text-gray-500">({adminEvents.length})</span>
                                </h2>
                                {permissions.canCreate && (
                                    <motion.button
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => setShowCreateModal(true)}
                                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-taylor-red to-taylor-red-light text-white text-xs font-outfit font-semibold shadow-glow-red"
                                    >
                                        <Plus size={14} /> New Event
                                    </motion.button>
                                )}
                            </div>

                            {/* Filter tabs */}
                            <div className="flex gap-2 mb-4">
                                {['All', 'Focus', 'Balance'].map((filter) => (
                                    <button
                                        key={filter}
                                        className="px-3 py-1.5 rounded-lg text-[10px] font-outfit font-semibold text-gray-400 glass hover:text-white transition-colors"
                                    >
                                        {filter}
                                    </button>
                                ))}
                            </div>

                            <div className="glass rounded-2xl p-4 mb-4">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-sm font-outfit font-semibold text-white">Recent Check-ins</h3>
                                    <span className="text-[10px] font-inter text-gray-500">Live from student check-ins</span>
                                </div>
                                {recentCheckIns.length > 0 ? (
                                    <div className="space-y-2">
                                        {recentCheckIns.map((entry) => (
                                            <div key={entry.id} className="flex items-center justify-between rounded-lg bg-white/[0.02] p-2.5">
                                                <div>
                                                    <p className="text-[11px] font-inter text-white">{entry.userName}</p>
                                                    <p className="text-[10px] font-inter text-gray-500">{entry.eventTitle}</p>
                                                </div>
                                                <span className="text-[9px] font-inter text-emerald-400">
                                                    {new Date(entry.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-[11px] font-inter text-gray-500">No check-ins yet.</p>
                                )}
                            </div>

                            {/* Events List */}
                            <div>
                                {adminEvents.map((event) => (
                                    <EventRow
                                        key={event.id}
                                        event={event}
                                        onEdit={(evt) => setEditingEvent(evt)}
                                        onDelete={handleDelete}
                                        canDelete={permissions.canDelete}
                                    />
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* BURNOUT TELEMETRY SECTION */}
                    {activeSection === 'burnout' && (
                        <motion.div key="burnout" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <div className="flex items-center gap-2 mb-6">
                                <AlertTriangle size={20} className="text-yellow-400" />
                                <div>
                                    <h2 className="text-lg font-outfit font-bold text-white">Predictive Burnout Telemetry</h2>
                                    <p className="text-[10px] font-inter text-gray-500">Anonymized, aggregated wellness data — opt-in only</p>
                                </div>
                            </div>

                            {/* Risk Overview */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                                <div className="glass rounded-xl p-4 text-center">
                                    <p className="text-2xl font-outfit font-bold text-yellow-400">{analytics.burnoutTelemetry.riskScore}%</p>
                                    <p className="text-[10px] font-inter text-gray-500">Campus Risk Score</p>
                                    <p className={`text-[9px] font-inter font-bold mt-1 px-2 py-0.5 rounded-full inline-block ${analytics.burnoutTelemetry.riskScore > 50 ? 'bg-red-500/10 text-red-400' : 'bg-yellow-500/10 text-yellow-400'
                                        }`}>
                                        {analytics.burnoutTelemetry.overallRiskLevel}
                                    </p>
                                </div>
                                <div className="glass rounded-xl p-4 text-center">
                                    <p className="text-2xl font-outfit font-bold text-orange-400">{analytics.burnoutTelemetry.studentsAtRisk}</p>
                                    <p className="text-[10px] font-inter text-gray-500">At-Risk Students</p>
                                </div>
                                <div className="glass rounded-xl p-4 text-center">
                                    <p className="text-2xl font-outfit font-bold text-red-400">{analytics.burnoutTelemetry.studentsHighRisk}</p>
                                    <p className="text-[10px] font-inter text-gray-500">High-Risk Students</p>
                                </div>
                                <div className="glass rounded-xl p-4 text-center">
                                    <p className="text-2xl font-outfit font-bold text-blue-400">{analytics.burnoutTelemetry.avgFocusBalanceRatio}:1</p>
                                    <p className="text-[10px] font-inter text-gray-500">Focus:Balance Ratio</p>
                                </div>
                            </div>

                            {/* Weekly Trend */}
                            <div className="glass rounded-2xl p-5 mb-6">
                                <h3 className="text-sm font-outfit font-semibold text-white mb-4">Risk Trend (4 Weeks)</h3>
                                <div className="flex items-end justify-between gap-4 h-24">
                                    {analytics.burnoutTelemetry.weeklyTrend.map((w, i) => (
                                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                            <span className="text-[10px] font-inter font-bold text-yellow-400">{w.risk}%</span>
                                            <motion.div
                                                className={`w-full rounded-t ${w.risk > 40 ? 'bg-gradient-to-t from-yellow-500 to-orange-500' : 'bg-gradient-to-t from-green-500 to-emerald-500'}`}
                                                initial={{ height: 0 }}
                                                animate={{ height: `${w.risk}%` }}
                                                transition={{ duration: 0.5, delay: i * 0.1 }}
                                            />
                                            <span className="text-[9px] font-inter text-gray-500">{w.week}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Faculty Breakdown */}
                            <div className="glass rounded-2xl p-5 mb-6">
                                <h3 className="text-sm font-outfit font-semibold text-white mb-3">Faculty Risk Breakdown</h3>
                                <div className="space-y-3">
                                    {analytics.burnoutTelemetry.facultyBreakdown
                                        .sort((a, b) => b.risk - a.risk)
                                        .map((fac) => (
                                            <div key={fac.faculty}>
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-[11px] font-inter text-gray-400">{fac.faculty}</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-inter text-gray-600">{fac.students} students</span>
                                                        <span className={`text-[10px] font-inter font-bold ${fac.risk > 50 ? 'text-red-400' : fac.risk > 35 ? 'text-yellow-400' : 'text-green-400'}`}>
                                                            {fac.risk}%
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="w-full h-2 bg-white/5 rounded-full">
                                                    <motion.div
                                                        className={`h-full rounded-full ${fac.risk > 50 ? 'bg-gradient-to-r from-orange-500 to-red-500' : fac.risk > 35 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' : 'bg-gradient-to-r from-green-500 to-emerald-500'}`}
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${fac.risk}%` }}
                                                        transition={{ duration: 0.6 }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </div>

                            {/* AI Recommendations */}
                            <div className="glass rounded-2xl p-5">
                                <h3 className="text-sm font-outfit font-semibold text-white mb-3 flex items-center gap-2">
                                    🤖 AI Wellness Recommendations
                                </h3>
                                <div className="space-y-2">
                                    {analytics.burnoutTelemetry.recommendations.map((rec, i) => (
                                        <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-white/[0.02]">
                                            <span className="text-balance-accent text-sm mt-0.5">💡</span>
                                            <p className="text-xs font-inter text-gray-400 leading-relaxed">{rec}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* ACCESS CONTROL SECTION */}
                    {activeSection === 'access' && (
                        <motion.div key="access" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <h2 className="text-lg font-outfit font-bold text-white mb-4 flex items-center gap-2">
                                <Shield size={18} /> Role-Based Access Control
                            </h2>

                            {/* Admin Users */}
                            <div className="mb-6">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-sm font-outfit font-semibold text-gray-300">Admin Users</h3>
                                    {currentAdmin?.role === 'Super Admin' && (
                                        <button 
                                            onClick={() => setShowCreateUserModal(true)}
                                            className="text-[10px] font-inter font-bold bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                                        >
                                            <span className="text-taylor-red">+</span> Add Account
                                        </button>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    {localAdminUsers.map((admin) => (
                                        <div key={admin.id} className="glass rounded-xl p-4 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-taylor-red to-taylor-red-dark flex items-center justify-center text-sm font-bold text-white">
                                                    {admin.avatar}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-outfit font-semibold text-white">{admin.name}</p>
                                                    <p className="text-[10px] font-inter text-gray-500">{admin.faculty}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className={`text-[10px] font-inter font-bold px-2 py-0.5 rounded-full ${admin.role === 'Super Admin' ? 'bg-taylor-red/10 text-taylor-red border border-taylor-red/20' :
                                                    admin.role === 'Event Manager' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                                        'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                                                    }`}>
                                                    {admin.role}
                                                </span>
                                                <p className="text-[9px] font-inter text-gray-600 mt-1">
                                                    Last: {new Date(admin.lastLogin).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Role Permissions Matrix */}
                            <div>
                                <h3 className="text-sm font-outfit font-semibold text-gray-300 mb-3">Permissions Matrix</h3>
                                <div className="glass rounded-2xl overflow-hidden">
                                    <div className="grid grid-cols-4 gap-0 text-center">
                                        <div className="p-2.5 bg-white/[0.02] border-b border-r border-white/5">
                                            <span className="text-[9px] font-inter font-bold text-gray-500 uppercase">Permission</span>
                                        </div>
                                        {Object.keys(roles).map((role) => (
                                            <div key={role} className="p-2.5 bg-white/[0.02] border-b border-r border-white/5 last:border-r-0">
                                                <span className="text-[9px] font-inter font-bold text-gray-400">{role}</span>
                                            </div>
                                        ))}
                                        {['canCreate', 'canEdit', 'canDelete', 'canViewAnalytics', 'canManageUsers', 'canViewBurnout'].map((perm) => (
                                            <div key={perm} className="contents">
                                                <div className="p-2.5 border-b border-r border-white/5 text-left">
                                                    <span className="text-[10px] font-inter text-gray-400">
                                                        {perm.replace('can', '').replace(/([A-Z])/g, ' $1').trim()}
                                                    </span>
                                                </div>
                                                {Object.values(roles).map((rolePerms, i) => (
                                                    <div key={i} className="p-2.5 border-b border-r border-white/5 last:border-r-0 flex items-center justify-center">
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

            {/* Create Event Modal — Bottom Sheet Style */}
            <AnimatePresence>
                {showCreateModal && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowCreateModal(false)}
                            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[300]"
                        />
                        <motion.div
                            initial={{ opacity: 0, y: '100%' }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: '100%' }}
                            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                            className="fixed bottom-0 left-0 right-0 bg-[#12121a] rounded-t-3xl z-[301] border-t border-white/10"
                            style={{ maxHeight: '85vh' }}
                        >
                            {/* Drag Handle */}
                            <div className="flex justify-center pt-3 pb-1">
                                <div className="w-10 h-1 rounded-full bg-white/20" />
                            </div>

                            {/* Header */}
                            <div className="flex items-center justify-between px-6 pb-3">
                                <h3 className="text-lg font-outfit font-bold text-white">Create Event</h3>
                                <button onClick={() => setShowCreateModal(false)} className="p-1.5 rounded-lg glass">
                                    <X size={16} className="text-gray-400" />
                                </button>
                            </div>

                            {/* Scrollable Form — everything including button is scrollable */}
                            <div className="overflow-y-auto px-6 pb-8" style={{ maxHeight: 'calc(85vh - 80px)' }}>
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-[10px] font-inter font-medium text-gray-400 uppercase tracking-wider mb-1 block">Event Title *</label>
                                        <input
                                            type="text"
                                            value={newEvent.title}
                                            onChange={(e) => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
                                            placeholder="e.g. AI Workshop"
                                            className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-inter font-medium text-gray-400 uppercase tracking-wider mb-1 block">Host / Club *</label>
                                        <input
                                            type="text"
                                            value={newEvent.host}
                                            onChange={(e) => setNewEvent(prev => ({ ...prev, host: e.target.value }))}
                                            placeholder="e.g. Agents of Tech"
                                            className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 text-sm"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[10px] font-inter font-medium text-gray-400 uppercase tracking-wider mb-1 block">Date</label>
                                            <input
                                                type="date"
                                                value={newEvent.date}
                                                onChange={(e) => setNewEvent(prev => ({ ...prev, date: e.target.value }))}
                                                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-inter font-medium text-gray-400 uppercase tracking-wider mb-1 block">Time</label>
                                            <input
                                                type="time"
                                                value={newEvent.time}
                                                onChange={(e) => setNewEvent(prev => ({ ...prev, time: e.target.value }))}
                                                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-inter font-medium text-gray-400 uppercase tracking-wider mb-1 block">Location</label>
                                        <input
                                            type="text"
                                            value={newEvent.location}
                                            onChange={(e) => setNewEvent(prev => ({ ...prev, location: e.target.value }))}
                                            placeholder="e.g. Block D, Lab 3"
                                            className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 text-sm"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[10px] font-inter font-medium text-gray-400 uppercase tracking-wider mb-1 block">Category</label>
                                            <select
                                                value={newEvent.category}
                                                onChange={(e) => setNewEvent(prev => ({ ...prev, category: e.target.value }))}
                                                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
                                            >
                                                <option value="focus">Focus</option>
                                                <option value="balance">Balance</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-inter font-medium text-gray-400 uppercase tracking-wider mb-1 block">Capacity</label>
                                            <input
                                                type="number"
                                                value={newEvent.capacity}
                                                onChange={(e) => setNewEvent(prev => ({ ...prev, capacity: parseInt(e.target.value) || 0 }))}
                                                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-inter font-medium text-gray-400 uppercase tracking-wider mb-1 block">Description</label>
                                        <textarea
                                            value={newEvent.description}
                                            onChange={(e) => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
                                            placeholder="Event details..."
                                            rows={2}
                                            className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 text-sm resize-none"
                                        />
                                    </div>

                                    {/* Create Button — inside scroll area so always reachable */}
                                    <div className="pt-3">
                                        <motion.button
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => {
                                                if (!newEvent.title.trim() || !newEvent.host.trim()) {
                                                    alert('Please fill in the Event Title and Host fields.');
                                                    return;
                                                }
                                                handleCreate();
                                                alert('Event created successfully!');
                                            }}
                                            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-taylor-red to-taylor-red-light text-white text-sm font-outfit font-semibold shadow-glow-red hover:opacity-90 transition-opacity"
                                        >
                                            Create Event
                                        </motion.button>
                                        <p className="text-[9px] font-inter text-gray-600 text-center mt-2">* Required fields</p>
                                    </div>
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
                            onClick={() => setShowCreateUserModal(false)}
                            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[300]"
                        />
                        <motion.div
                            initial={{ opacity: 0, y: '100%' }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: '100%' }}
                            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                            className="fixed bottom-0 left-0 right-0 bg-[#12121a] rounded-t-3xl z-[301] border-t border-white/10"
                            style={{ maxHeight: '85vh' }}
                        >
                            <div className="flex justify-center pt-3 pb-1">
                                <div className="w-10 h-1 rounded-full bg-white/20" />
                            </div>

                            <div className="flex items-center justify-between px-6 pb-3">
                                <h3 className="text-lg font-outfit font-bold text-white">Create Admin Account</h3>
                                <button onClick={() => setShowCreateUserModal(false)} className="p-1.5 rounded-lg glass">
                                    <X size={16} className="text-gray-400" />
                                </button>
                            </div>

                            <div className="overflow-y-auto px-6 pb-8" style={{ maxHeight: 'calc(85vh - 80px)' }}>
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-[10px] font-inter font-medium text-gray-400 uppercase tracking-wider mb-1 block">Full Name *</label>
                                        <input
                                            type="text"
                                            value={newUser.name}
                                            onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))}
                                            placeholder="e.g. Ms. Sarah"
                                            className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-taylor-red"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-inter font-medium text-gray-400 uppercase tracking-wider mb-1 block">Campus Email *</label>
                                        <input
                                            type="email"
                                            value={newUser.email}
                                            onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                                            placeholder="e.g. sarah.admin@taylors.edu.my"
                                            className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-taylor-red"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-inter font-medium text-gray-400 uppercase tracking-wider mb-1 block">Temporary Password *</label>
                                        <input
                                            type="text"
                                            value={newUser.password}
                                            onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                                            placeholder="e.g. tempPass123"
                                            className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-taylor-red"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[10px] font-inter font-medium text-gray-400 uppercase tracking-wider mb-1 block">Role</label>
                                            <select
                                                value={newUser.role}
                                                onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value }))}
                                                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-taylor-red"
                                            >
                                                <option value="Event Manager">Event Manager</option>
                                                <option value="Analytics Viewer">Analytics Viewer</option>
                                                <option value="Super Admin">Super Admin</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-inter font-medium text-gray-400 uppercase tracking-wider mb-1 block">Faculty/Dept</label>
                                            <input
                                                type="text"
                                                value={newUser.faculty}
                                                onChange={(e) => setNewUser(prev => ({ ...prev, faculty: e.target.value }))}
                                                placeholder="e.g. Computing"
                                                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-taylor-red"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={handleCreateUser}
                                    className="w-full mt-6 bg-taylor-red hover:bg-taylor-red-light text-white font-bold py-3.5 rounded-xl transition-colors shadow-glow-red"
                                >
                                    Create Account
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
