export default function Loading() {
  return (
    <div className="flex h-[50vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-indigo-600 dark:border-gray-800 dark:border-t-indigo-500"></div>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Loading details...</p>
      </div>
    </div>
  );
}
