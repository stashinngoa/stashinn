import { createClient } from '@stashinn/lib/supabase/server';
import { redirect } from 'next/navigation';
import { createBooking } from './actions';
import CheckoutClientForm from './CheckoutClientForm';

export default async function CheckoutPage({ searchParams }: { searchParams: { location_id?: string, in?: string, out?: string, bags?: string, price?: string } | Promise<{ location_id?: string, in?: string, out?: string, bags?: string, price?: string }> }) {
  const resolvedParams = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // If not logged in, force them to login, passing the current URL so they can come back
  if (!user) {
    const currentQuery = new URLSearchParams(resolvedParams as Record<string, string>).toString();
    redirect(`/login?next=/checkout?${currentQuery}`);
  }

  if (!resolvedParams.location_id) {
    redirect('/search');
  }

  // Fetch location details to confirm
  const { data: location } = await supabase
    .from('partner_locations')
    .select('*, partners(id, business_name)')
    .eq('id', resolvedParams.location_id)
    .single();

  if (!location) {
    redirect('/search');
  }

  return (
    <div className="min-h-screen bg-gray-100 font-inter">
      <header className="h-16 bg-white border-b border-gray-100 flex items-center px-6">
        <a href="/" className="text-xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-indigo-600">
          StashInn
        </a>
      </header>

      <main className="max-w-3xl mx-auto py-12 px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Review and Confirm</h1>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Location Summary */}
          <div className="p-6 border-b border-gray-100 flex items-start gap-4">
            <div className="w-24 h-24 bg-gray-100 rounded-xl overflow-hidden shrink-0">
              {location.photos && location.photos[0] && (
                <img src={location.photos[0]} alt="" className="w-full h-full object-cover" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{location.name}</h2>
              <p className="text-sm text-gray-500 mt-1">{location.address_line1}, {location.city}</p>
              <p className="text-sm font-medium text-purple-600 mt-2">Operated by {location.partners?.business_name}</p>
            </div>
          </div>

          {/* Booking Details */}
          <div className="p-6 bg-gray-50/50 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Booking Details</h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <span className="block text-xs text-gray-500 mb-1">Drop off</span>
                <span className="font-semibold text-gray-900">{new Date(resolvedParams.in || '').toLocaleString()}</span>
              </div>
              <div>
                <span className="block text-xs text-gray-500 mb-1">Pick up</span>
                <span className="font-semibold text-gray-900">{new Date(resolvedParams.out || '').toLocaleString()}</span>
              </div>
              <div>
                <span className="block text-xs text-gray-500 mb-1">Luggage</span>
                <span className="font-semibold text-gray-900">{resolvedParams.bags} Bags</span>
              </div>
            </div>
          </div>

          {/* Price Breakdown */}
          <div className="p-6">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Price Breakdown</h3>
            <div className="flex justify-between text-gray-600 mb-2">
              <span>Storage fee ({resolvedParams.bags} bags)</span>
              <span>₹{resolvedParams.price}</span>
            </div>
            <div className="flex justify-between text-gray-600 mb-4">
              <span>Taxes & Fees</span>
              <span>₹0</span>
            </div>
            <div className="flex justify-between text-xl font-black text-gray-900 pt-4 border-t border-gray-100">
              <span>Total to Pay</span>
              <span>₹{resolvedParams.price}</span>
            </div>
          </div>

          {/* Checkout Client Form */}
          <CheckoutClientForm 
            location={location} 
            resolvedParams={resolvedParams} 
            razorpayKey={process.env.RAZORPAY_KEY_ID || ''} 
          />
        </div>
      </main>
    </div>
  );
}
