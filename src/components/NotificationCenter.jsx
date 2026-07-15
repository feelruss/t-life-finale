import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { X, Bell, Check } from 'lucide-react';
import { getNotifications, getUnreadNotificationCount, markAllNotificationsRead, markNotificationRead, clearNotifications } from '../data/db';

export default function NotificationCenter({ isOpen, onClose, userKey = 'guest' }) {
    const [notifs, setNotifs] = useState(() => getNotifications(userKey));
    const unreadCount = getUnreadNotificationCount(userKey);

    useEffect(() => {
        setNotifs(getNotifications(userKey));
    }, [userKey]);

    useEffect(() => {
        const onDataUpdate = (evt) => {
            const updatedKey = evt?.detail?.key || '';
            if (String(updatedKey).startsWith('taylors_notifications')) {
                setNotifs(getNotifications(userKey));
            }
        };

        window.addEventListener('taylors-db-updated', onDataUpdate);
        return () => window.removeEventListener('taylors-db-updated', onDataUpdate);
    }, [userKey]);

    const markAsRead = (id) => {
        markNotificationRead(id, userKey);
        setNotifs(getNotifications(userKey));
    };

    const markAllRead = () => {
        markAllNotificationsRead(userKey);
        setNotifs(getNotifications(userKey));
    };

    const clearAll = () => {
        clearNotifications(userKey);
        setNotifs([]);
    };

    const getTimeAgo = (timestamp) => {
        const diff = Date.now() - new Date(timestamp).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        const days = Math.floor(hrs / 24);
        return `${days}d ago`;
    };

    const priorityStyles = {
        high: 'border-l-red-500',
        medium: 'border-l-yellow-500',
        low: 'border-l-gray-600',
    };

    const typeLabel = (type) => {
        if (type === 'event-checkin') return 'Check-in';
        if (type === 'event-uncheckin') return 'Uncheck-in';
        if (type === 'reminder') return 'Reminder';
        return 'Update';
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90]"
                    />
                    <motion.div
                        initial={{ opacity: 0, x: '100%' }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                        className="fixed top-0 right-0 bottom-0 w-full max-w-[430px] bg-[#0a0a12] z-[91] flex flex-col border-l border-white/5"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 pt-6 pb-4 border-b border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-taylor-red/20 flex items-center justify-center">
                                    <Bell size={18} className="text-taylor-red" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-outfit font-bold text-white">Notifications</h2>
                                    <p className="text-[11px] font-inter text-gray-500">
                                        {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {notifs.length > 0 && (
                                    <button
                                        onClick={clearAll}
                                        className="px-3 py-1.5 rounded-lg text-[10px] font-inter font-semibold text-gray-200 bg-white/10 hover:bg-white/20 transition-colors"
                                    >
                                        Clear
                                    </button>
                                )}
                                {unreadCount > 0 && (
                                    <button
                                        onClick={markAllRead}
                                        className="px-3 py-1.5 rounded-lg text-[10px] font-inter font-semibold text-taylor-red bg-taylor-red/10 hover:bg-taylor-red/20 transition-colors"
                                    >
                                        <Check size={12} className="inline mr-1" />
                                        Read All
                                    </button>
                                )}
                                <button
                                    onClick={onClose}
                                    className="p-2 rounded-xl glass hover:bg-white/10 transition-colors"
                                >
                                    <X size={18} className="text-gray-400" />
                                </button>
                            </div>
                        </div>

                        {/* Notifications List */}
                        <div className="flex-1 overflow-y-auto hide-scrollbar px-4 py-3 space-y-2">
                            {notifs.length === 0 && (
                                <div className="rounded-xl p-4 bg-white/[0.03] border border-white/5 text-center text-sm text-gray-500">
                                    No notifications yet. Check in to an event and updates will appear here.
                                </div>
                            )}

                            {notifs
                                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                                .map((notif, index) => (
                                    <motion.div
                                        key={notif.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        onClick={() => markAsRead(notif.id)}
                                        className={`relative rounded-xl p-4 cursor-pointer transition-all duration-300 border-l-2 ${priorityStyles[notif.priority]} ${notif.isRead
                                                ? 'bg-white/[0.02] hover:bg-white/[0.04]'
                                                : 'bg-white/[0.05] hover:bg-white/[0.08]'
                                            }`}
                                    >
                                        {/* Unread indicator */}
                                        {!notif.isRead && (
                                            <div className="absolute top-4 right-4">
                                                <span className="relative flex h-2 w-2">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-taylor-red opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-taylor-red"></span>
                                                </span>
                                            </div>
                                        )}

                                        <div className="flex items-start gap-3">
                                            <div
                                                className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                                                style={{ backgroundColor: notif.accentColor + '15' }}
                                            >
                                                {notif.icon}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="mb-1">
                                                    <span className="text-[9px] font-inter uppercase tracking-wide px-1.5 py-0.5 rounded bg-white/10 text-gray-300 border border-white/10">
                                                        {typeLabel(notif.type)}
                                                    </span>
                                                </div>
                                                <h4 className={`text-sm font-outfit leading-tight mb-1 ${notif.isRead ? 'text-gray-400 font-medium' : 'text-white font-semibold'
                                                    }`}>
                                                    {notif.title}
                                                </h4>
                                                <p className="text-[11px] font-inter text-gray-500 leading-relaxed line-clamp-2">
                                                    {notif.body}
                                                </p>
                                                <p className="text-[10px] font-inter text-gray-600 mt-1.5">
                                                    {getTimeAgo(notif.timestamp)}
                                                </p>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
