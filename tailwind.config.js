/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'taylor-red': '#C8102E',
                'taylor-red-dark': '#9B0D23',
                'taylor-red-light': '#E8344E',
                'taylor-white': '#FFFFFF',
                'nexus-dark': '#0A0A0F',
                'nexus-surface': '#12121A',
                'nexus-card': '#1A1A26',
                'nexus-border': '#2A2A3A',
                'focus-accent': '#FF3B5C',
                'balance-accent': '#4EEAAF',
            },
            fontFamily: {
                'outfit': ['Outfit', 'sans-serif'],
                'inter': ['Inter', 'sans-serif'],
            },
            boxShadow: {
                'glow-red': '0 0 30px rgba(200, 16, 46, 0.3)',
                'glow-green': '0 0 30px rgba(78, 234, 175, 0.3)',
            },
        },
    },
    plugins: [],
}
