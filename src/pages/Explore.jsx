export default function Explore({ darkMode = false }) {
    return (
        <div className="p-6 md:p-10 flex flex-col items-center justify-center min-h-[50vh] text-center">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${darkMode ? 'bg-gray-800' : 'bg-gray-200'}`}>
                <span className="text-3xl">🔍</span>
            </div>
            <h1 className={`text-2xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Explore Campus</h1>
            <p className={`max-w-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Discover new clubs, events, and hidden gems around Taylor's Lakeside Campus.
            </p>
            <div className="mt-6 w-full max-w-md">
                <input
                    type="text"
                    placeholder="Search for clubs, events..."
                    className={`w-full px-4 py-3 rounded-xl focus:outline-none focus:border-taylor-red transition-colors ${darkMode ? 'bg-white/5 border border-white/10 text-white placeholder-gray-500' : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-500'}`}
                />
            </div>
        </div>
    );
}
