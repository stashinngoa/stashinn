import { createClient } from '@stashinn/lib/supabase/server';

export default async function AdminBookingsPage(props: { searchParams: Promise<{ type?: string }> }) {
  const search = await props.searchParams;
  const typeFilter = search?.type || 'all';
  const supabase = await createClient();

  let query = supabase
    .from('bookings')
    .select(`
      id, status, num_bags, total_amount, base_amount, commission_amount,
      start_time, end_time, created_at, cancellation_reason, cancelled_by,
      booking_type, vehicle_make, model, plate, check_in_photos,
      users!bookings_customer_id_fkey(full_name, email),
      partners(business_name),
      partner_locations(name, city)
    `)
    .order('created_at', { ascending: false });

  if (typeFilter === 'luggage') {
    query = query.eq('booking_type', 'luggage');
  } else if (typeFilter === 'vehicle') {
    query = query.eq('booking_type', 'garage');
  }

  const { data: bookings } = await query.limit(100);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-900/40 text-yellow-400 border-yellow-700/50',
      confirmed: 'bg-blue-900/40 text-blue-400 border-blue-700/50',
      checked_in: 'bg-green-900/40 text-green-400 border-green-700/50',
      checked_out: 'bg-gray-700/40 text-gray-300 border-gray-600/50',
      cancelled: 'bg-red-900/40 text-red-400 border-red-700/50',
      disputed: 'bg-orange-900/40 text-orange-400 border-orange-700/50',
    };
    return styles[status] || 'bg-gray-700/40 text-gray-400 border-gray-600/50';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-white">All Bookings</h1>
        <p className="text-gray-500 mt-1">Full ledger of all bookings across the platform.</p>
      </div>

      <div className="flex gap-2 pb-4 border-b border-gray-800">
        {[
          { label: 'ALL BOOKINGS', value: 'all' },
          { label: 'LUGGAGE STORAGE', value: 'luggage' },
          { label: 'VEHICLE PARKING', value: 'vehicle' }
        ].map(t => (
          <a
            key={t.value}
            href={`/dashboard/bookings?type=${t.value}`}
            className={`px-4 py-2 text-xs font-bold rounded-lg border transition-colors ${
              typeFilter === t.value
                ? 'bg-purple-900/30 text-purple-400 border-purple-700/50'
                : 'bg-gray-900 text-gray-400 border-gray-700 hover:bg-gray-800 hover:text-gray-200'
            }`}
          >
            {t.label}
          </a>
        ))}
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Partner / Location</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Type & Details</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Total</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Commission</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {(!bookings || bookings.length === 0) ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-600 text-sm">No bookings found.</td>
                </tr>
              ) : (
                bookings.map((b: any) => (
                  <tr key={b.id} className="hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-gray-200 block">{(b.users as any)?.full_name || '—'}</span>
                      <span className="text-xs text-gray-500">{(b.users as any)?.email}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-300 block">{(b.partners as any)?.business_name || '—'}</span>
                      <span className="text-xs text-gray-500">{(b.partner_locations as any)?.name} — {(b.partner_locations as any)?.city}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {b.booking_type === 'garage' ? (
                        <span className="font-semibold text-purple-400">
                          🚗 {b.vehicle_make} {b.model} ({b.plate})
                        </span>
                      ) : (
                        <span>👜 {b.num_bags} Bags</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm font-mono text-gray-300">₹{Number(b.total_amount).toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm font-mono text-orange-400">₹{Number(b.commission_amount).toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-0.5 text-xs font-bold rounded-full border ${getStatusBadge(b.status)}`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(b.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
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
