import { createClient } from '@stashinn/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';

export default async function CustomerProfilePage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const supabase = await createClient();

  const { data: customer } = await supabase
    .from('users')
    .select('*, bookings(*, partner_locations(name)), reviews(*)')
    .eq('id', id)
    .single();

  if (!customer) notFound();

  const totalBookings = customer.bookings?.length || 0;
  const totalSpent = customer.bookings?.reduce((acc: number, b: any) => acc + (Number(b.total_amount) || 0), 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <Link href="/dashboard/customers" className="text-purple-400 hover:text-purple-300 text-sm font-bold flex items-center mb-2">
            &larr; Back to Customers
          </Link>
          <h1 className="text-3xl font-extrabold text-white">{customer.full_name || 'Unnamed Customer'}</h1>
          <p className="text-gray-400 font-mono mt-1">{customer.email} • {customer.phone || 'No Phone'}</p>
        </div>
        <div>
          <span className={`px-3 py-1 rounded-full text-xs font-bold border uppercase ${
            customer.is_blocked ? 'bg-red-900/40 text-red-400 border-red-700/50' : 'bg-green-900/40 text-green-400 border-green-700/50'
          }`}>
            {customer.is_blocked ? 'Blocked' : 'Active'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Total Bookings</h3>
          <p className="text-3xl font-black text-white">{totalBookings}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Lifetime Spend</h3>
          <p className="text-3xl font-black text-white">₹{totalSpent.toFixed(2)}</p>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-800">
          <h2 className="text-lg font-bold text-white">Booking History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-950/50 border-b border-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">ID</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Location</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {(!customer.bookings || customer.bookings.length === 0) ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No bookings found.</td></tr>
              ) : (
                customer.bookings.map((b: any) => (
                  <tr key={b.id} className="hover:bg-gray-800/30">
                    <td className="px-6 py-4 font-mono text-xs text-gray-400">{b.id.split('-')[0]}</td>
                    <td className="px-6 py-4 text-sm text-gray-300">{b.partner_locations?.name || 'Unknown'}</td>
                    <td className="px-6 py-4 text-sm text-gray-400">{new Date(b.start_time).toLocaleDateString()}</td>
                    <td className="px-6 py-4 font-mono text-sm text-gray-300">₹{b.total_amount}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded text-xs font-bold bg-gray-800 text-gray-300">{b.status}</span>
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
