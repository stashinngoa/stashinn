export default function DashboardLoading() {
  return (
    <div className="fixed inset-0 z-[9999] bg-white/70 dark:bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center">
      <div className="w-12 h-12 border-4 border-purple-100 dark:border-purple-900 border-t-purple-600 dark:border-t-purple-400 rounded-full animate-spin mb-4"></div>
      <p className="text-gray-600 dark:text-gray-300 font-medium animate-pulse">Loading...</p>
    </div>
  );
}
