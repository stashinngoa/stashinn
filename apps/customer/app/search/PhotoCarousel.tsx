'use client';

import { useState } from 'react';

/**
 * Location photos with previous / next arrows on the image edges and position dots.
 * Used inside links (result cards, map card), so the controls stop the click from
 * opening the location.
 */
export default function PhotoCarousel({ photos, alt, className = '', placeholder }: { photos?: string[] | null; alt: string; className?: string; placeholder?: React.ReactNode }) {
  const list = (photos || []).filter(Boolean);
  const [index, setIndex] = useState(0);
  const count = list.length;

  const go = (e: React.MouseEvent, step: number) => {
    e.preventDefault();
    e.stopPropagation();
    setIndex(i => (i + step + count) % count);
  };

  if (!count) {
    return (
      <div className={`relative overflow-hidden bg-gradient-to-br from-orange-50 to-amber-100 dark:from-gray-800 dark:to-gray-900 ${className}`}>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-orange-300 dark:text-gray-600">
          {placeholder ?? (
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          )}
          <span className="text-[10px] font-bold uppercase tracking-wider">No photos yet</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`group/photos relative overflow-hidden bg-gray-100 dark:bg-gray-800 ${className}`}>
      {/* All photos sit side by side; the strip slides to the current one */}
      <div className="flex h-full transition-transform duration-300 ease-out" style={{ transform: `translateX(-${index * 100}%)` }}>
        {list.map((src, i) => (
          <img
            key={src + i}
            src={src}
            alt={i === 0 ? alt : ''}
            loading={i === 0 ? 'eager' : 'lazy'}
            draggable={false}
            className="h-full w-full shrink-0 object-cover"
          />
        ))}
      </div>

      {count > 1 && (
        <>
          <ArrowButton side="left" onClick={e => go(e, -1)} />
          <ArrowButton side="right" onClick={e => go(e, 1)} />
          <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center gap-1" aria-hidden="true">
            {list.slice(0, 7).map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${i === Math.min(index, 6) ? 'w-4 bg-white' : 'w-1.5 bg-white/60'}`}
              />
            ))}
          </div>
          <span className="sr-only" aria-live="polite">Photo {index + 1} of {count}</span>
        </>
      )}
    </div>
  );
}

function ArrowButton({ side, onClick }: { side: 'left' | 'right'; onClick: (e: React.MouseEvent) => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === 'left' ? 'Previous photo' : 'Next photo'}
      // Always visible on touch screens; on a mouse they fade in when the card is hovered
      className={`absolute top-1/2 -translate-y-1/2 ${side === 'left' ? 'left-2' : 'right-2'} w-8 h-8 rounded-full bg-white/90 dark:bg-gray-900/90 text-gray-800 dark:text-gray-100 shadow-md flex items-center justify-center transition-all hover:scale-110 hover:bg-white dark:hover:bg-gray-900 [@media(hover:hover)]:opacity-0 group-hover/photos:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500`}
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d={side === 'left' ? 'M15 19l-7-7 7-7' : 'M9 5l7 7-7 7'} />
      </svg>
    </button>
  );
}
