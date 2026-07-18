import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { Home, Calendar, Compass, User } from 'lucide-react';
import Header from './Header';

export default function Layout() {
    const location = useLocation();

    const navItems = [
        { icon: Home, label: 'Home', path: '/' },
        { icon: Calendar, label: 'Schedule', path: '/schedule' },
        { icon: Compass, label: 'Explore', path: '/explore' },
        { icon: User, label: 'Profile', path: '/profile' },
    ];

    return (
        <div className="min-h-screen bg-mesh flex justify-center items-start overflow-hidden font-sans text-gray-900">
            <div className="fixed top-0 left-0 bg-green-500 z-[9999] text-white p-2">DEBUG: LAYOUT V2 MOUNTED</div>

            {/* Mobile Container - Centered Phone View */}
            <div className="w-full max-w-[430px] h-screen bg-[#050508] relative flex flex-col shadow-2xl overflow-hidden">

                {/* Decorative top gradient bar (Original Design) */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-taylor-red via-taylor-red-light to-taylor-red z-50 pointer-events-none" />

                {/* Header - Always Visible */}
                <div className="flex-none z-40 bg-[#050508]/80 backdrop-blur-md sticky top-0">
                    <Header />
                </div>

                {/* Main Content Area - Scrollable */}
                <main className="flex-1 overflow-y-auto overflow-x-hidden hide-scrollbar pb-24 relative">
                    <Outlet />
                </main>

                {/* Bottom Navigation - Fixed at bottom of container */}
                <nav className="absolute bottom-0 left-0 right-0 bg-[#050508]/90 backdrop-blur-xl border-t border-white/5 px-6 py-3 flex justify-between items-center z-50">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) =>
                                `flex flex-col items-center gap-1 transition-colors duration-200 ${isActive ? 'text-taylor-red' : 'text-gray-500 hover:text-gray-300'
                                }`
                            }
                        >
                            <item.icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                            <span className="text-[10px] font-medium font-inter tracking-wide">{item.label}</span>
                            {isActive && (
                                <div className="absolute -bottom-1 w-1 h-1 bg-taylor-red rounded-full" />
                            )}
                        </NavLink>
                    ))}
                </nav>
            </div>
        </div>
    );
}
