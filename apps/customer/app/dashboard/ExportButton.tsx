'use client';

export default function ExportButton() {
  const handleExport = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const confirmed = window.confirm('Are you sure you want to download your booking history as a CSV file?');
    if (confirmed) {
      window.location.href = '/api/export-history';
    }
  };

  return (
    <button
      onClick={handleExport}
      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-bold rounded-lg transition-colors flex items-center gap-2"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
      Export CSV
    </button>
  );
}
