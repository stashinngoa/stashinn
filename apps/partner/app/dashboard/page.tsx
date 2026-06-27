import { createClient } from '@stashinn/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function DashboardOverview() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: partner } = await supabase
    .from('partners')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (!partner) {
    redirect('/onboarding');
  }

  // Fetch KPI Data
  const { data: bookings } = await supabase
    .from('bookings')
    .select('status, num_bags, total_amount')
    .eq('partner_id', partner.id);

  const activeBags = bookings?.filter(b => b.status === 'checked_in').reduce((sum, b) => sum + b.num_bags, 0) || 0;
  const totalBookings = bookings?.length || 0;
  const totalRevenue = bookings?.filter(b => b.status === 'checked_out').reduce((sum, b) => sum + Number(b.total_amount), 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b pb-4">
        <h1 className="text-3xl font-bold text-gray-900">Overview</h1>
        <div className={`px-3 py-1 rounded-full text-sm font-semibold uppercase tracking-wider ${partner.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
          {partner.status}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Total Bookings</div>
          <div className="text-4xl font-black text-gray-900">{totalBookings}</div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-purple-200 bg-purple-50">
          <div className="text-sm font-bold text-purple-600 uppercase tracking-wider mb-2">Active Bags (Checked In)</div>
          <div className="text-4xl font-black text-purple-900">{activeBags}</div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Total Revenue (Completed)</div>
          <div className="text-4xl font-black text-gray-900">₹{totalRevenue.toFixed(2)}</div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center mt-8">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Manage your Bookings</h2>
        <p className="text-gray-500 mb-6">Use the Bookings tab to verify customer OTPs and manage bag hand-offs.</p>
        <a href="/dashboard/bookings" className="px-6 py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-black transition-colors inline-block">
          Go to Bookings
        </a>
      </div>
    </div>
  );
}
