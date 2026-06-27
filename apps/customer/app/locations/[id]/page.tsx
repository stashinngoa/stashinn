import { createClient } from '@stashinn/lib/supabase/server';
import { notFound } from 'next/navigation';
import BookingSidebar from './BookingSidebar';

export default async function LocationDetailsPage({ 
  params, 
  searchParams 
}: { 
  params: { id: string } | Promise<{ id: string }>,
  searchParams: { in?: string, out?: string, bags?: string } | Promise<{ in?: string, out?: string, bags?: string }>
}) {
  const resolvedParams = await params;
  const resolvedSearch = await searchParams;
  const supabase = await createClient();

  const { data: location } = await supabase
    .from('partner_locations')
    .select('*, partners(business_name)')
    .eq('id', resolvedParams.id)
    .single();

  if (!location) notFound();

  return (
    <div className="min-h-screen bg-white font-inter">
      {/* Navbar Minimal */}
      <header className="h-16 border-b border-gray-100 flex items-center px-6">
        <a href="/" className="text-xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-indigo-600">
          StashInn
        </a>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{location.name}</h1>
        <div className="flex items-center text-sm text-gray-600 mb-6">
          <span className="font-semibold text-gray-900 mr-2">📍 {location.address_line1}, {location.city}</span>
          <span>• Operated by {location.partners?.business_name}</span>
        </div>

        {/* Photo Gallery */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[400px] mb-12 rounded-2xl overflow-hidden">
          <div className="bg-gray-100 h-full relative">
            {location.photos && location.photos[0] ? (
              <img src={location.photos[0]} alt={location.name} className="w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-gray-300">No Photo</div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4 h-full hidden md:grid">
            {/* Secondary Photos placeholder */}
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-gray-100 relative">
                 {location.photos && location.photos[i] ? (
                  <img src={location.photos[i]} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 bg-gray-50 border border-dashed border-gray-200"></div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Main Details */}
          <div className="lg:col-span-2 space-y-8">
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4">About this location</h2>
              <p className="text-gray-600 leading-relaxed">
                Secure your luggage at {location.name}. Centrally located in {location.city}, this facility offers premium luggage storage with verified security. Drop your bags and enjoy your day hands-free.
              </p>
            </section>

            <hr className="border-gray-100" />

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Amenities & Security</h2>
              <div className="grid grid-cols-2 gap-4">
                {(location.amenities || []).map((amenity: string) => (
                  <div key={amenity} className="flex items-center text-gray-700">
                    <svg className="w-5 h-5 mr-3 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {amenity}
                  </div>
                ))}
              </div>
            </section>

            <hr className="border-gray-100" />

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Operating Hours</h2>
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex justify-between items-center max-w-sm">
                <span className="font-medium text-gray-700">Everyday</span>
                <span className="font-bold text-gray-900">{location.operating_hours?.open || '08:00'} - {location.operating_hours?.close || '22:00'}</span>
              </div>
            </section>
          </div>

          {/* Sticky Booking Sidebar */}
          <div className="lg:col-span-1">
            <BookingSidebar 
              location={location} 
              initialSearch={resolvedSearch} 
            />
          </div>
        </div>
      </main>
    </div>
  );
}
