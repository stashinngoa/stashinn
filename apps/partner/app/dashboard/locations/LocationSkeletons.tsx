// Placeholder layouts shown while location pages load (used by the loading.tsx files)

const bar = 'rounded-lg bg-gray-200/80 dark:bg-gray-800 animate-pulse';
const card = 'rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900';

function Loading({ text }: { text: string }) {
  return (
    <p role="status" className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400">
      <span className="h-4 w-4 rounded-full border-2 border-orange-200 border-t-orange-600 dark:border-gray-700 dark:border-t-orange-500 animate-spin" />
      {text}
    </p>
  );
}

export function LocationListSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-2"><div className={`${bar} h-8 w-40`} /><div className={`${bar} h-4 w-72`} /></div>
        <div className={`${bar} h-10 w-36 rounded-xl`} />
      </div>
      <Loading text="Loading your locations…" />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {[0, 1, 2].map(i => (
          <div key={i} className={`${card} overflow-hidden`}>
            <div className={`${bar} h-40 rounded-none`} />
            <div className="p-4 space-y-2.5"><div className={`${bar} h-3 w-24`} /><div className={`${bar} h-5 w-3/4`} /><div className={`${bar} h-4 w-1/2`} /><div className={`${bar} h-4 w-full mt-4`} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LocationDetailsSkeleton() {
  return (
    <div className="space-y-6">
      <div className={`${bar} h-4 w-24`} />
      <div className={`${card} overflow-hidden`}>
        <div className={`${bar} h-56 md:h-72 rounded-none`} />
        <div className="px-5 py-3"><Loading text="Loading location…" /></div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map(i => <div key={i} className={`${card} p-4 space-y-2`}><div className={`${bar} h-3 w-20`} /><div className={`${bar} h-5 w-28`} /></div>)}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className={`${card} xl:col-span-2 h-80`} />
        <div className={`${card} h-80`} />
      </div>
    </div>
  );
}

export function LocationFormSkeleton({ text }: { text: string }) {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="space-y-3"><div className={`${bar} h-4 w-28`} /><div className={`${bar} h-8 w-56`} /><Loading text={text} /></div>
      {[0, 1, 2].map(i => (
        <div key={i} className={`${card} p-6 space-y-4`}>
          <div className={`${bar} h-5 w-40`} />
          <div className="grid grid-cols-2 gap-4"><div className={`${bar} h-11`} /><div className={`${bar} h-11`} /></div>
          <div className={`${bar} h-11`} />
        </div>
      ))}
    </div>
  );
}
