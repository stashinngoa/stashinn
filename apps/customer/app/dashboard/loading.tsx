/** Shown inside the dashboard while a page loads (the header and menu stay in place). */
export default function DashboardLoading() {
  const bar = 'bg-gray-200 dark:bg-gray-800 rounded';
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Loading">
      <div className={`w-56 h-8 ${bar}`} />
      <div className="flex gap-2">{[1, 2, 3, 4].map(i => <div key={i} className={`w-24 h-9 ${bar} rounded-full`} />)}</div>
      {[1, 2].map(i => (
        <div key={i} className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 space-y-4">
          <div className="flex gap-4">
            <div className="w-20 h-20 rounded-2xl bg-gray-200 dark:bg-gray-800" />
            <div className="flex-1 space-y-2 pt-1"><div className={`w-2/3 h-5 ${bar}`} /><div className={`w-1/3 h-4 ${bar}`} /></div>
          </div>
          <div className={`h-16 ${bar} rounded-2xl`} />
        </div>
      ))}
    </div>
  );
}
