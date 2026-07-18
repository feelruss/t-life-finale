// Campus zone definitions for geo-routing
export const campusZones = {
    'Block A': { lat: 3.0640, lng: 101.6168, label: 'Block A', color: '#FF3B5C' },
    'Block B': { lat: 3.0642, lng: 101.6172, label: 'Block B', color: '#FF6B4A' },
    'Block C': { lat: 3.0644, lng: 101.6165, label: 'Block C', color: '#4EEAAF' },
    'Block D': { lat: 3.0638, lng: 101.6178, label: 'Block D', color: '#38BDF8' },
    'Block E': { lat: 3.0636, lng: 101.6182, label: 'Block E', color: '#A78BFA' },
    'Lakeside': { lat: 3.0648, lng: 101.6160, label: 'Lakeside', color: '#34D399' },
    'Syopz Mall': { lat: 3.0650, lng: 101.6185, label: 'Syopz Mall', color: '#FBBF24' },
    'BizPod': { lat: 3.0646, lng: 101.6175, label: 'BizPod', color: '#F472B6' },
    'UniGym': { lat: 3.0652, lng: 101.6170, label: 'UniGym', color: '#06B6D4' },
};

// Proximity matrix (walking minutes between zones)
export const proximityMatrix = {
    'Block A': { 'Block B': 2, 'Block C': 3, 'Block D': 5, 'Block E': 8, 'Lakeside': 4, 'Syopz Mall': 10, 'BizPod': 6, 'UniGym': 7 },
    'Block B': { 'Block A': 2, 'Block C': 3, 'Block D': 4, 'Block E': 6, 'Lakeside': 5, 'Syopz Mall': 8, 'BizPod': 5, 'UniGym': 6 },
    'Block C': { 'Block A': 3, 'Block B': 3, 'Block D': 4, 'Block E': 7, 'Lakeside': 2, 'Syopz Mall': 9, 'BizPod': 5, 'UniGym': 5 },
    'Block D': { 'Block A': 5, 'Block B': 4, 'Block C': 4, 'Block E': 3, 'Lakeside': 6, 'Syopz Mall': 5, 'BizPod': 3, 'UniGym': 4 },
    'Block E': { 'Block A': 8, 'Block B': 6, 'Block C': 7, 'Block D': 3, 'Lakeside': 9, 'Syopz Mall': 3, 'BizPod': 4, 'UniGym': 5 },
    'Lakeside': { 'Block A': 4, 'Block B': 5, 'Block C': 2, 'Block D': 6, 'Block E': 9, 'Syopz Mall': 11, 'BizPod': 7, 'UniGym': 3 },
    'Syopz Mall': { 'Block A': 10, 'Block B': 8, 'Block C': 9, 'Block D': 5, 'Block E': 3, 'Lakeside': 11, 'BizPod': 6, 'UniGym': 8 },
    'BizPod': { 'Block A': 6, 'Block B': 5, 'Block C': 5, 'Block D': 3, 'Block E': 4, 'Lakeside': 7, 'Syopz Mall': 6, 'UniGym': 4 },
    'UniGym': { 'Block A': 7, 'Block B': 6, 'Block C': 5, 'Block D': 4, 'Block E': 5, 'Lakeside': 3, 'Syopz Mall': 8, 'BizPod': 4 },
};

// Get proximity label based on walking time
export function getProximityLabel(fromZone, toZone) {
    if (fromZone === toZone) return { label: 'You are here', minutes: 0, color: '#4EEAAF' };
    const minutes = proximityMatrix[fromZone]?.[toZone];
    if (!minutes) return { label: 'Unknown', minutes: null, color: '#6B7280' };
    if (minutes <= 3) return { label: `${minutes} min walk`, minutes, color: '#4EEAAF' };
    if (minutes <= 6) return { label: `${minutes} min walk`, minutes, color: '#FBBF24' };
    return { label: `${minutes} min walk`, minutes, color: '#FF3B5C' };
}

// Merchant discounts for Syopz Mall integration
export const merchantDeals = [
    {
        id: "DEAL-001",
        merchant: "Starbucks",
        location: "Syopz Mall, Level 1",
        zone: "Syopz Mall",
        logo: "☕",
        bgGradient: "from-green-700 to-green-900",
        title: "20% Off Any Grande",
        description: "Flash this during your free slot for 20% off any Grande beverage",
        validTime: "2:00 PM – 5:00 PM",
        validDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
        expiresAt: "2026-04-30",
        minFreeSlotMinutes: 30,
        isActive: true,
    },
    {
        id: "DEAL-002",
        merchant: "FamilyMart",
        location: "Syopz Mall, Ground Floor",
        zone: "Syopz Mall",
        logo: "🏪",
        bgGradient: "from-blue-600 to-cyan-500",
        title: "Buy 1 Free 1 Onigiri",
        description: "Student exclusive! Buy 1 get 1 free on any onigiri during off-peak hours",
        validTime: "3:00 PM – 6:00 PM",
        validDays: ["Mon", "Wed", "Fri"],
        expiresAt: "2026-03-31",
        minFreeSlotMinutes: 15,
        isActive: true,
    },
    {
        id: "DEAL-003",
        merchant: "The Soup Spoon",
        location: "Syopz Mall, Level 2",
        zone: "Syopz Mall",
        logo: "🍜",
        bgGradient: "from-orange-500 to-red-600",
        title: "RM5 Off Set Meal",
        description: "RM5 discount on any set meal when you show your Taylor's student card",
        validTime: "12:00 PM – 2:00 PM",
        validDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
        expiresAt: "2026-05-15",
        minFreeSlotMinutes: 45,
        isActive: true,
    },
    {
        id: "DEAL-004",
        merchant: "Campus Bookshop",
        location: "Block A, Ground Floor",
        zone: "Block A",
        logo: "📚",
        bgGradient: "from-indigo-600 to-purple-700",
        title: "15% Off Stationery",
        description: "Flash your EventMind app for 15% off all stationery items",
        validTime: "10:00 AM – 6:00 PM",
        validDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
        expiresAt: "2026-06-30",
        minFreeSlotMinutes: 15,
        isActive: true,
    },
    {
        id: "DEAL-005",
        merchant: "UniGym",
        location: "UniGym, Level 1",
        zone: "UniGym",
        logo: "💪",
        bgGradient: "from-violet-600 to-fuchsia-600",
        title: "Free Day Pass",
        description: "Redeem a free gym day pass during your 2+ hour free slot",
        validTime: "8:00 AM – 9:00 PM",
        validDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
        expiresAt: "2026-04-15",
        minFreeSlotMinutes: 120,
        isActive: true,
    }
];
