import { createClient } from '@stashinn/lib/supabase/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function PartnerBookingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: partner } = await supabase.from('partners').select('id').eq('user_id', user.id).single();
  if (!partner) redirect('/onboarding');

  // Fetch all bookings for this partner
  const { data: bookings } = await supabase
    .from('bookings')
    .select('*, partner_locations(name, city), users(email, full_name)')
    .eq('partner_id', partner.id)
    .order('created_at', { ascending: false });

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'checked_in': return 'bg-purple-100 text-purple-800 border-purple-200 border';
      case 'checked_out': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b pb-4">
        <h1 className="text-3xl font-bold text-gray-900">Bookings Management</h1>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 uppercase tracking-wider text-xs font-bold">
              <tr>
                <th className="px-6 py-4">ID / Customer</th>
                <th className="px-6 py-4">Location</th>
                <th className="px-6 py-4">Dates</th>
                <th className="px-6 py-4">Bags</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(!bookings || bookings.length === 0) ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No bookings found.
                  </td>
                </tr>
              ) : (
                bookings.map(b => (
                  <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-mono text-xs text-gray-400 mb-1">{b.id.split('-')[0]}</div>
                      <div className="font-semibold text-gray-900">{b.users?.full_name || 'Customer'}</div>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {b.partner_locations?.name}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      <div>{new Date(b.start_time).toLocaleDateString()}</div>
                      <div className="text-xs text-gray-400">to {new Date(b.end_time).toLocaleDateString()}</div>
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-900">{b.num_bags}</td>
                    <td className="px-6 py-4 font-mono font-medium">₹{b.total_amount}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${getStatusColor(b.status)}`}>
                        {b.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Link href={`/dashboard/bookings/${b.id}`} className="text-purple-600 hover:text-purple-900 font-bold hover:underline">
                        Manage
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
