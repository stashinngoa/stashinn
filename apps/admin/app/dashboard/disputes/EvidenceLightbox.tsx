'use client';

import { useCallback, useEffect, useState } from 'react';

/** Full-screen photo viewer with arrows, keyboard navigation and an "open original" link. */
export default function EvidenceLightbox({ photos, start, onClose }: { photos: string[]; start: number; onClose: () => void }) {
  const [i, setI] = useState(start);
  const go = useCallback((d: number) => setI(x => (x + d + photos.length) % photos.length), [photos.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [go, onClose]);

  const btn = 'w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur transition-colors';
  return (
    <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col" role="dialog" aria-modal="true" aria-label="Photo viewer" onClick={onClose}>
      <div className="flex items-center justify-between px-4 py-3 text-white/80 text-sm" onClick={e => e.stopPropagation()}>
        <span className="tabular-nums">{i + 1} / {photos.length}</span>
        <div className="flex items-center gap-2">
          <a href={photos[i]} target="_blank" rel="noreferrer" className="rounded-full px-3 py-2 hover:bg-white/10 text-xs font-semibold">Open original ↗</a>
          <button type="button" onClick={onClose} className={btn} aria-label="Close">✕</button>
        </div>
      </div>
      <div className="flex-1 min-h-0 flex items-center justify-center gap-3 px-3 pb-6">
        {photos.length > 1 && <button type="button" onClick={e => { e.stopPropagation(); go(-1); }} className={`${btn} shrink-0`} aria-label="Previous photo">‹</button>}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photos[i]} alt={`Photo ${i + 1}`} onClick={e => e.stopPropagation()} className="max-h-full max-w-[calc(100%-7rem)] object-contain rounded-lg shadow-2xl" />
        {photos.length > 1 && <button type="button" onClick={e => { e.stopPropagation(); go(1); }} className={`${btn} shrink-0`} aria-label="Next photo">›</button>}
      </div>
    </div>
  );
}
