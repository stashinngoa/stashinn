'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Location photos: a large photo with up to four smaller ones beside it (a swipeable strip
 * on phones). Any photo opens a full-screen viewer that shows the whole image, with
 * previous / next arrows, a counter, thumbnails, keyboard arrows and swiping.
 */
export default function PhotoGallery({ photos, name }: { photos: string[]; name: string }) {
  const [viewing, setViewing] = useState<number | null>(null);
  const list = photos.filter(Boolean);

  if (!list.length) {
    return (
      <div className="h-56 sm:h-72 rounded-3xl border border-dashed border-gray-300 dark:border-gray-700 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-900 dark:to-gray-900 flex flex-col items-center justify-center gap-2 text-orange-300 dark:text-gray-600">
        <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
        <span className="text-xs font-bold uppercase tracking-wider">No photos yet</span>
      </div>
    );
  }

  const side = list.slice(1, 5);
  const tile = 'group relative overflow-hidden bg-gray-100 dark:bg-gray-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-500/60';
  const img = 'h-full w-full object-cover transition duration-500 group-hover:scale-[1.03] group-hover:brightness-95';

  return (
    <>
      {/* Phones: swipe through photos; tap to view full screen */}
      <div className="sm:hidden -mx-4 flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none]">
        {list.map((src, i) => (
          <button key={src + i} type="button" onClick={() => setViewing(i)} className="relative w-full shrink-0 snap-center aspect-[4/3]" aria-label={`View photo ${i + 1} of ${list.length}`}>
            <img src={src} alt={i === 0 ? name : ''} className="h-full w-full object-cover" loading={i === 0 ? 'eager' : 'lazy'} />
            <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-bold text-white">{i + 1} / {list.length}</span>
          </button>
        ))}
      </div>

      {/* Larger screens: one large photo and up to four small ones */}
      <div className={`hidden sm:grid h-[340px] md:h-[420px] gap-2 overflow-hidden rounded-3xl ${side.length ? 'grid-cols-4 grid-rows-2' : 'grid-cols-1'}`}>
        <button type="button" onClick={() => setViewing(0)} className={`${tile} ${side.length ? 'col-span-2 row-span-2' : ''}`} aria-label={`View photo 1 of ${list.length}`}>
          <img src={list[0]} alt={name} className={img} />
        </button>
        {side.map((src, i) => (
          <button
            key={src + i}
            type="button"
            onClick={() => setViewing(i + 1)}
            aria-label={`View photo ${i + 2} of ${list.length}`}
            // Fewer than four extra photos: stretch them to fill the right half
            className={`${tile} ${side.length === 1 ? 'col-span-2 row-span-2' : side.length === 2 ? 'col-span-2' : side.length === 3 && i === 0 ? 'row-span-2' : ''}`}
          >
            <img src={src} alt="" className={img} loading="lazy" />
          </button>
        ))}
      </div>
      <div className="hidden sm:flex justify-end -mt-14 mr-4 relative z-10 pointer-events-none">
        <button
          type="button"
          onClick={() => setViewing(0)}
          className="pointer-events-auto inline-flex items-center gap-2 rounded-xl border border-gray-900/10 bg-white/95 dark:bg-gray-900/95 px-3.5 py-2 text-sm font-bold text-gray-900 dark:text-white shadow-md hover:bg-white dark:hover:bg-gray-900"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
          Show all {list.length} photo{list.length === 1 ? '' : 's'}
        </button>
      </div>

      {viewing !== null && <Lightbox photos={list} start={viewing} name={name} onClose={() => setViewing(null)} />}
    </>
  );
}

function Lightbox({ photos, start, name, onClose }: { photos: string[]; start: number; name: string; onClose: () => void }) {
  const [index, setIndex] = useState(start);
  const count = photos.length;
  const go = useCallback((step: number) => setIndex(i => (i + step + count) % count), [count]);
  const touchX = useRef<number | null>(null);
  const thumbs = useRef<HTMLDivElement>(null);

  // Keyboard: arrows to move, Esc to close; stop the page scrolling behind
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'ArrowRight') go(1);
    };
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = overflow; };
  }, [go, onClose]);

  // Keep the current thumbnail in view
  useEffect(() => {
    thumbs.current?.children[index]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [index]);

  return (
    <div role="dialog" aria-modal="true" aria-label={`${name} photos`} className="fixed inset-0 z-[100] flex flex-col bg-neutral-950 text-white animate-[fadeIn_.15s_ease-out]">
      <style>{`@keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }`}</style>

      <div className="flex items-center justify-between gap-4 px-4 sm:px-6 h-16 shrink-0">
        <p className="min-w-0 truncate text-sm font-semibold text-white/90">{name}</p>
        <div className="flex items-center gap-4">
          <span className="text-sm font-semibold tabular-nums text-white/80" aria-live="polite">{index + 1} / {count}</span>
          <button type="button" onClick={onClose} aria-label="Close photos" autoFocus className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </div>

      {/* The whole photo, scaled to fit (never cropped) */}
      <div
        className="relative flex-1 min-h-0 flex items-center justify-center px-2 sm:px-20"
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
        onTouchStart={e => { touchX.current = e.touches[0]!.clientX; }}
        onTouchEnd={e => {
          if (touchX.current === null) return;
          const dx = e.changedTouches[0]!.clientX - touchX.current;
          if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
          touchX.current = null;
        }}
      >
        <img key={index} src={photos[index]} alt={`${name}, photo ${index + 1} of ${count}`} className="max-h-full max-w-full object-contain select-none animate-[fadeIn_.2s_ease-out]" draggable={false} />

        {count > 1 && (
          <>
            <EdgeArrow side="left" onClick={() => go(-1)} />
            <EdgeArrow side="right" onClick={() => go(1)} />
          </>
        )}
      </div>

      {count > 1 && (
        <div ref={thumbs} className="shrink-0 flex justify-start sm:justify-center gap-2 overflow-x-auto px-4 py-4 [scrollbar-width:none]">
          {photos.map((src, i) => (
            <button
              key={src + i}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Photo ${i + 1}`}
              aria-current={i === index}
              className={`h-14 w-20 shrink-0 overflow-hidden rounded-lg transition ${i === index ? 'ring-2 ring-white opacity-100' : 'opacity-50 hover:opacity-80'}`}
            >
              <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function EdgeArrow({ side, onClick }: { side: 'left' | 'right'; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === 'left' ? 'Previous photo' : 'Next photo'}
      className={`absolute top-1/2 -translate-y-1/2 ${side === 'left' ? 'left-2 sm:left-5' : 'right-2 sm:right-5'} w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur flex items-center justify-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70`}
    >
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d={side === 'left' ? 'M15 19l-7-7 7-7' : 'M9 5l7 7-7 7'} />
      </svg>
    </button>
  );
}
