import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { Shield, Eye, Trash2, Download, ChevronRight } from 'lucide-react';
import { currentUser } from '../data/students';
import { clearUserData, getClubMemberships, getEventCheckIns, getEventPreferences, getPrivacySettings, setPrivacySetting } from '../data/db';
import { clubs } from '../data/clubs';

export default function PrivacyDashboard({ displayName = 'Student', userKey = 'guest' }) {
    const defaultClubIds = clubs.filter((club) => club.isJoined).map((club) => club.id);
    const [settings, setSettings] = useState(() => getPrivacySettings(userKey, { shareTimetable: true }));
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [activeCategory, setActiveCategory] = useState(null);

    const toggleSetting = (key) => {
        const nextValue = !settings[key];
        setSettings(prev => ({ ...prev, [key]: nextValue }));
        setPrivacySetting(key, nextValue, userKey);
    };

    const settingsConfig = [
        {
            key: 'shareTimetable',
            label: 'Timetable Sync',
            description: 'Use your synced timetable for free-slot detection and matching. Turn off to use local default schedule only.',
            icon: '📅',
        },
    ];

    const dataCategories = useMemo(() => {
        const checkIns = getEventCheckIns(userKey);
        const prefs = getEventPreferences(userKey);
        const joinedClubs = getClubMemberships(defaultClubIds);
        return [
            { label: 'Event Attendance', count: checkIns.length, size: `${Math.max(1, checkIns.length)}.0 KB`, icon: '🎫', detail: 'Check-ins and attendance confirmations' },
            { label: 'Timetable Data', count: settings.shareTimetable ? 25 : 0, size: settings.shareTimetable ? '1.1 KB' : '0 KB', icon: '📅', detail: 'CAMS-linked class schedule blocks' },
            { label: 'Interest Profile', count: (prefs.interested || []).length + joinedClubs.length, size: '0.6 KB', icon: '🎯', detail: 'Interested events + joined clubs preferences' },
            { label: 'Sync Status', count: settings.shareTimetable ? 1 : 0, size: settings.shareTimetable ? 'enabled' : 'disabled', icon: '🔄', detail: settings.shareTimetable ? 'Timetable sync is enabled for this account.' : 'Timetable sync is disabled for this account.' },
        ];
    }, [defaultClubIds, settings, userKey]);

    return (
        <div className="px-5 pt-6 pb-24">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/20 flex items-center justify-center">
                    <Shield size={22} className="text-purple-400" />
                </div>
                <div>
                    <h1 className="text-2xl font-outfit font-bold text-white">My Data</h1>
                    <p className="text-sm font-inter text-gray-500">Control your privacy & data</p>
                </div>
            </div>

            {/* PDPA Compliance Badge */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass rounded-2xl p-4 mb-6 flex items-center gap-3"
            >
                <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-lg">🛡️</span>
                </div>
                <div className="flex-1">
                    <h3 className="text-sm font-outfit font-semibold text-green-400">PDPA Compliant</h3>
                    <p className="text-[10px] font-inter text-gray-500">
                        Your data is protected under Malaysia's Personal Data Protection Act 2010. We never share your data with third parties without consent.
                    </p>
                </div>
            </motion.div>

            {/* Privacy Controls */}
            <div className="mb-6">
                <h2 className="text-sm font-outfit font-semibold text-gray-300 mb-3 flex items-center gap-2">
                    <Eye size={14} /> Privacy Controls
                </h2>
                <div className="space-y-2">
                    {settingsConfig.map((item, index) => (
                        <motion.div
                            key={item.key}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.08 }}
                            className="glass rounded-xl p-4 flex items-center justify-between"
                        >
                            <div className="flex items-center gap-3 flex-1">
                                <span className="text-lg">{item.icon}</span>
                                <div>
                                    <h3 className="text-sm font-outfit font-semibold text-white">{item.label}</h3>
                                    <p className="text-[10px] font-inter text-gray-500 leading-relaxed">{item.description}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => toggleSetting(item.key)}
                                className={`relative w-11 h-6 rounded-full transition-colors duration-300 flex-shrink-0 ml-3 ${settings[item.key] ? 'bg-taylor-red' : 'bg-white/10'
                                    }`}
                            >
                                <motion.div
                                    className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm"
                                    animate={{ left: settings[item.key] ? '24px' : '4px' }}
                                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                />
                            </button>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Data Inventory */}
            <div className="mb-6">
                <h2 className="text-sm font-outfit font-semibold text-gray-300 mb-3 flex items-center gap-2">
                    📦 Your Data Inventory
                </h2>
                <div className="glass rounded-2xl overflow-hidden">
                    {dataCategories.map((cat, index) => (
                        <button
                            key={cat.label}
                            onClick={() => setActiveCategory((prev) => (prev === cat.label ? null : cat.label))}
                            className={`flex items-center justify-between p-3.5 ${index < dataCategories.length - 1 ? 'border-b border-white/5' : ''
                                } w-full text-left`}
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-sm">{cat.icon}</span>
                                <div>
                                    <p className="text-xs font-outfit font-semibold text-white">{cat.label}</p>
                                    <p className="text-[10px] font-inter text-gray-600">{cat.count} records • {cat.size}</p>
                                </div>
                            </div>
                            <ChevronRight size={14} className="text-gray-600" />
                        </button>
                    ))}
                </div>

                {activeCategory && (
                    <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3">
                        <p className="text-xs font-outfit font-semibold text-white mb-1">{activeCategory}</p>
                        <p className="text-[11px] font-inter text-gray-400">{dataCategories.find((cat) => cat.label === activeCategory)?.detail}</p>
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="space-y-3">
                <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                        // Generate CSV content
                        const csvRows = [
                            ['Taylor\'s EventMind - Personal Data Export'],
                            ['Generated', new Date().toLocaleString()],
                            ['Student', displayName],
                            ['Student ID', currentUser.id],
                            [],
                            ['== PROFILE =='],
                            ['Name', displayName],
                            ['Email', currentUser.email],
                            ['Year', currentUser.year],
                            ['Programme', currentUser.programme],
                            ['Faculty', currentUser.faculty],
                            ['Campus Zone', currentUser.campusZone],
                            [],
                            ['== PRIVACY SETTINGS =='],
                            ['Setting', 'Enabled'],
                            ...Object.entries(settings).map(([k, v]) => [k, v ? 'Yes' : 'No']),
                            [],
                            ['== DATA INVENTORY =='],
                            ['Category', 'Records', 'Size'],
                            ...dataCategories.map(c => [c.label, c.count, c.size]),
                        ];
                        const csvContent = csvRows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
                        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `EventMind_MyData_${displayName}_${new Date().toISOString().split('T')[0]}.csv`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                    }}
                    className="w-full py-3.5 rounded-xl glass flex items-center justify-center gap-2 text-sm font-outfit font-semibold text-blue-400 hover:bg-blue-500/10 transition-colors"
                >
                    <Download size={16} />
                    Download My Data (.csv)
                </motion.button>

                <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowDeleteModal(true)}
                    className="w-full py-3.5 rounded-xl flex items-center justify-center gap-2 text-sm font-outfit font-semibold text-red-400 bg-red-500/5 border border-red-500/10 hover:bg-red-500/10 transition-colors"
                >
                    <Trash2 size={16} />
                    Delete All My Data
                </motion.button>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
                        onClick={() => setShowDeleteModal(false)}
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-[350px] bg-[#12121a] rounded-2xl p-6 z-[101] border border-white/10"
                    >
                        <div className="text-center">
                            <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                                <Trash2 size={24} className="text-red-400" />
                            </div>
                            <h3 className="text-lg font-outfit font-bold text-white mb-2">Delete All Data?</h3>
                            <p className="text-sm font-inter text-gray-400 mb-6">
                                This will permanently erase all your activity data and preferences. This action cannot be undone.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowDeleteModal(false)}
                                    className="flex-1 py-3 rounded-xl glass text-sm font-outfit font-semibold text-gray-300 hover:bg-white/10 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        clearUserData();
                                        setSettings(getPrivacySettings(userKey, { shareTimetable: true }));
                                        setActiveCategory(null);
                                        setShowDeleteModal(false);
                                        alert('✅ All data has been deleted.');
                                    }}
                                    className="flex-1 py-3 rounded-xl bg-red-500/20 text-sm font-outfit font-semibold text-red-400 border border-red-500/20 hover:bg-red-500/30 transition-colors"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </div>
    );
}
