'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function WelcomeModal() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // A small delay to make the transition from loader to dashboard feel smoother
    const timer = setTimeout(() => setIsOpen(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    // Remove the query param silently without reloading
    router.replace('/dashboard', { scroll: false });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="welcome-title">
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xl p-8">
        <div className="flex justify-center mb-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg">
            <span className="text-3xl">🎉</span>
          </div>
        </div>

        <h2 id="welcome-title" className="text-2xl font-black text-gray-900 dark:text-white text-center">Welcome to StashInn!</h2>
        <p className="text-center text-gray-500 dark:text-gray-400 mt-1 mb-6">Your partner application has been submitted.</p>

        <div className="rounded-2xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/30 p-5 mb-7">
          <h3 className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            What happens next
          </h3>
          <p className="text-sm text-amber-800 dark:text-amber-300 mt-1.5 leading-relaxed">
            Our team will verify your contact and locations. Until then your locations aren&apos;t visible to customers. You can follow each step on your Overview page.
          </p>
        </div>

        <button
          onClick={handleClose}
          className="w-full py-3.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold shadow-sm transition-colors"
        >
          Go to dashboard
        </button>
      </div>
    </div>
  );
}
