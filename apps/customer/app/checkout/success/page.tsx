import Link from 'next/link';

export default async function BookingSuccessPage({ searchParams }: { searchParams: { id?: string } | Promise<{ id?: string }> }) {
  const resolvedParams = await searchParams;
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center font-inter p-4">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center max-w-md w-full">
        <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Booking Confirmed!</h1>
        <p className="text-gray-500 mb-6">Your luggage storage space has been reserved successfully.</p>
        
        <div className="bg-gray-50 rounded-xl p-4 mb-8">
          <span className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Booking ID</span>
          <span className="font-mono text-gray-900 font-semibold">{resolvedParams.id}</span>
        </div>
        
        <Link href="/dashboard" className="block w-full py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition-colors shadow-sm mb-3">
          View My Bookings
        </Link>
        <Link href="/" className="block w-full py-3 bg-white text-gray-700 font-bold rounded-xl hover:bg-gray-50 border border-gray-200 transition-colors shadow-sm">
          Return Home
        </Link>
      </div>
    </div>
  );
}
