export default function Schedule() {
    return (
        <div className="p-6 md:p-10 flex flex-col items-center justify-center min-h-[50vh] text-center">
            <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4">
                <span className="text-3xl">📅</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Full Schedule</h1>
            <p className="text-gray-400 max-w-sm">
                View your complete academic calendar, upcoming deadlines, and club activities here.
            </p>
            <button className="mt-6 px-6 py-2 bg-taylor-red text-white rounded-lg font-medium hover:bg-taylor-red-dark transition-colors">
                Sync Calendar
            </button>
        </div>
    );
}
