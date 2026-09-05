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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm animate-in fade-in" onClick={handleClose}></div>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8 relative z-10 animate-in zoom-in-95 duration-300">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
            <span className="text-3xl">🎉</span>
          </div>
        </div>
        
        <h2 className="text-2xl font-black text-gray-900 text-center mb-2">Welcome to StashInn!</h2>
        <p className="text-center text-gray-500 font-medium mb-6">
          Your partner application has been successfully submitted.
        </p>
        
        <div className="bg-yellow-50 border border-yellow-100 rounded-2xl p-5 mb-8">
          <h3 className="font-bold text-yellow-800 flex items-center mb-2">
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Status: Pending Review
          </h3>
          <p className="text-sm text-yellow-700 leading-relaxed">
            Our team is currently reviewing your application. While you are in <strong>Pending</strong> status, your locations will not be visible to customers. You can view your submitted details in the Profile tab.
          </p>
        </div>
        
        <button 
          onClick={handleClose}
          className="w-full py-3.5 bg-gray-900 text-white rounded-xl font-bold uppercase tracking-wide hover:bg-gray-800 transition-colors shadow-md"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}
