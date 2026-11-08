'use client';

import { useEffect } from 'react';
import { LegalDocument } from '@repo/ui/legalDocument';

/** A legal document (already filled with business details) in a scrollable dialog. */
export default function LegalModal({ open, onClose, title, text }: { open: boolean; onClose: () => void; title: string; text: string }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${open ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}>
      <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={onClose}></div>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative z-10 w-full max-w-3xl h-[85vh] flex flex-col bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 transition-all duration-300 transform ${open ? 'scale-100 translate-y-0 opacity-100' : 'scale-95 translate-y-4 opacity-0'}`}
      >
        <div className="flex items-center justify-between gap-4 px-6 sm:px-8 py-5 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-xl font-black text-gray-900 dark:text-white">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-6">
          <LegalDocument text={text} hideTitle />
        </div>
        <div className="px-6 sm:px-8 py-4 border-t border-gray-100 dark:border-gray-800">
          <button type="button" onClick={onClose} className="w-full py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-bold uppercase tracking-wide hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors">I Understand</button>
        </div>
      </div>
    </div>
  );
}
