'use client';

export default function PrintButton() {
  return (
    <button 
      onClick={() => window.print()} 
      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors"
    >
      Print / Save as PDF
    </button>
  );
}
