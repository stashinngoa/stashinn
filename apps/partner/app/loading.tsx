export default function GlobalLoading() {
  return (
    <div className="fixed inset-0 z-[9999] bg-white/70 backdrop-blur-sm flex flex-col items-center justify-center">
      <div className="w-12 h-12 border-4 border-purple-100 border-t-purple-600 rounded-full animate-spin mb-4"></div>
      <p className="text-gray-600 font-medium animate-pulse">Loading...</p>
    </div>
  );
}
