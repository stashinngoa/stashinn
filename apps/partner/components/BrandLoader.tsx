// Loading indicator: a simple orange spinner with a short label.
// The same component exists in each app (customer, partner, admin) so they look alike.

export default function BrandLoader({ label = 'Loading…', fullscreen = false }: { label?: string; fullscreen?: boolean }) {
  return (
    <div role="status" aria-live="polite"
      className={fullscreen
        ? 'fixed inset-0 z-[9999] flex items-center justify-center bg-white/70 dark:bg-gray-950/70 backdrop-blur-[2px]'
        : 'flex min-h-[50vh] items-center justify-center'}>
      <div className="flex flex-col items-center gap-3">
        <span className="h-9 w-9 rounded-full border-[3px] border-gray-200 dark:border-gray-800 border-t-orange-600 dark:border-t-orange-500 animate-spin motion-reduce:animate-none" aria-hidden="true" />
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
      </div>
    </div>
  );
}
