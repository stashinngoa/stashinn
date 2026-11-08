'use client';

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold rounded-lg shadow-sm transition-colors"
    >
      Print / Save as PDF
    </button>
  );
}
