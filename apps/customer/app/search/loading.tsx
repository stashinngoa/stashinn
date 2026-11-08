/** Matches the search page layout (header, results grid, map) while results load. */
export default function LoadingSearch() {
  const bar = 'bg-gray-200 dark:bg-gray-800 rounded';
  return (
    <div className="h-screen flex flex-col font-inter bg-gray-50 dark:bg-gray-950 overflow-hidden" aria-busy="true" aria-label="Loading results">
      <header className="h-16 shrink-0 flex items-center gap-6 px-4 md:px-6 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800">
        <div className={`w-28 h-8 ${bar}`} />
        <div className="flex-1 flex justify-center">
          <div className="w-full max-w-md xl:max-w-[1080px] h-12 rounded-full bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 animate-pulse" />
        </div>
        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-800" />
      </header>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden animate-pulse">
        <div className="w-full lg:w-[56%] xl:w-[54%] px-4 sm:px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className={`w-64 h-6 ${bar}`} />
            <div className="flex gap-3"><div className={`w-32 h-9 ${bar} rounded-xl`} /><div className={`w-24 h-9 ${bar} rounded-xl`} /></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-5">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
                <div className="aspect-[4/3] bg-gray-200 dark:bg-gray-800" />
                <div className="p-4 space-y-2">
                  <div className={`w-3/4 h-4 ${bar}`} />
                  <div className={`w-1/2 h-3 ${bar}`} />
                  <div className={`w-20 h-6 ${bar} mt-4`} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="hidden lg:block flex-1 p-4 pl-0">
          <div className="w-full h-full rounded-2xl bg-gray-200 dark:bg-gray-800" />
        </div>
      </div>
    </div>
  );
}
