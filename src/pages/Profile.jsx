import { useEffect, useMemo, useRef, useState } from 'react';
import { LogOut } from 'lucide-react';
import PrivacyDashboard from '../components/PrivacyDashboard';
import { getEventCheckIns, getClubMemberships, getUserActivity } from '../data/db';
import { events } from '../data/events';
import { clubs } from '../data/clubs';

const parseDurationHours = (timeRange) => {
    if (!timeRange || !timeRange.includes(' - ')) return 0;
    const toMinutes = (token) => {
        const [clock, period] = token.trim().split(' ');
        const [h, m] = clock.split(':').map(Number);
        let hour24 = h % 12;
        if (period === 'PM') hour24 += 12;
        return hour24 * 60 + m;
    };
    const [start, end] = timeRange.split(' - ');
    const diff = toMinutes(end) - toMinutes(start);
    return diff > 0 ? diff / 60 : 0;
};

export default function Profile({ mode, onLogout, displayName = 'Student', userKey = 'guest' }) {
    const dataRef = useRef(null);
    const [stats, setStats] = useState({ eventsAttended: 0, focusHours: 0, clubsJoined: 0 });
    const [activity, setActivity] = useState(() => getUserActivity(userKey, 5));

    useEffect(() => {
        const defaultClubIds = clubs.filter((club) => club.isJoined).map((club) => club.id);
        const refreshStats = () => {
            const logs = getEventCheckIns(userKey);
            const attended = logs.length;
            const eventDurationMap = Object.fromEntries(events.map((evt) => [evt.id, parseDurationHours(evt.time)]));
            const hours = logs.reduce((sum, log) => sum + (eventDurationMap[log.eventId] || 1), 0);
            const joinedClubs = getClubMemberships(defaultClubIds).length;

            setStats({
                eventsAttended: attended,
                focusHours: Math.round(hours),
                clubsJoined: joinedClubs,
            });

            setActivity(getUserActivity(userKey, 5));
        };

        refreshStats();
        const onDataUpdate = () => refreshStats();
        window.addEventListener('taylors-db-updated', onDataUpdate);
        return () => window.removeEventListener('taylors-db-updated', onDataUpdate);
    }, [userKey]);

    const profileInitial = useMemo(() => (displayName?.[0] || 'S').toUpperCase(), [displayName]);

    const handleLogoutClick = () => {
        onLogout?.();
    };

    return (
        <div className="p-6 pb-24">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-white">Student Profile</h1>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => dataRef.current?.scrollIntoView({ behavior: 'smooth' })}
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
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-taylor-red to-[#8a1525] flex items-center justify-center text-3xl font-bold text-white">
                        {profileInitial}
                    </div>
                    <div className="flex-1">
                        <h2 className="text-lg font-bold text-white">{displayName}</h2>
                        <p className="text-sm text-gray-400 mb-2">Year 2 • Information Technology</p>
                        <div className="flex flex-wrap gap-2">
                            <span className="px-2 py-1 bg-white/10 rounded-full text-xs text-gray-300">Agents of Tech</span>
                            <span className="px-2 py-1 bg-white/10 rounded-full text-xs text-gray-300">Active Member</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <p className="text-xs text-gray-400 mb-1">Events Attended</p>
                    <p className="text-2xl font-bold text-white">{stats.eventsAttended}</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <p className="text-xs text-gray-400 mb-1">Focus Hours</p>
                    <p className="text-2xl font-bold text-white">{stats.focusHours}h</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <p className="text-xs text-gray-400 mb-1">Clubs</p>
                    <p className="text-2xl font-bold text-taylor-red-light">{stats.clubsJoined}</p>
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
                            <div key={entry.id} className="rounded-lg bg-white/5 border border-white/5 px-3 py-2">
                                <p className="text-xs text-white font-medium">{entry.title}</p>
                                <p className="text-[10px] text-gray-400">{entry.detail}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-xs text-gray-500">No activity yet. Try checking in to an event.</p>
                )}
            </div>

            {/* My Data Section */}
            <div
                ref={dataRef}
                className="rounded-2xl p-6 bg-[#0a0506]"
            >
                <PrivacyDashboard displayName={displayName} userKey={userKey} />
            </div>
        </div>
    );
}
