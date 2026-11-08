import { createClient } from '@stashinn/lib/supabase/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import LocationCard from './LocationCard';
import Icon from '../../../components/Icon';
import { LOCATION_STATUS } from './locationUi';

export default async function LocationsList() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/');

  const { data: partner } = await supabase.from('partners').select('id, status').eq('user_id', user.id).single();
  if (!partner) redirect('/onboarding');

  const now = new Date().toISOString();
  const [{ data: locations }, { data: primaryPocs }, { data: pauses }] = await Promise.all([
    supabase.from('partner_locations').select('*, vehicle_pricing(*)').eq('partner_id', partner.id).order('created_at', { ascending: true }),
    supabase.from('partner_pocs').select('location_id').eq('partner_id', partner.id).eq('is_primary', true),
    supabase.from('location_pauses').select('location_id, ends_at').eq('partner_id', partner.id).is('cancelled_at', null).lte('starts_at', now).gt('ends_at', now),
  ]);
  const pausedUntil = new Map((pauses || []).map(p => [p.location_id, p.ends_at]));

  // The location(s) created at onboarding carry the primary contact; fall back to the oldest one
  const primaryIds = new Set((primaryPocs || []).map(p => p.location_id));
  if (primaryIds.size === 0 && locations?.length) primaryIds.add(locations[0].id);
  const sorted = [...(locations || [])].sort((a, b) => Number(primaryIds.has(b.id)) - Number(primaryIds.has(a.id)));

  const counts = (locations || []).reduce<Record<string, number>>((acc, l) => {
    acc[l.admin_status || 'pending'] = (acc[l.admin_status || 'pending'] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white">Locations</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Your storage spaces, and where each one stands with StashInn.</p>
        </div>
        <Link href="/dashboard/locations/new" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold shadow-sm transition-colors">
          <Icon name="plus" className="w-4 h-4" /> Add location
        </Link>
      </div>

      {(locations?.length ?? 0) > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(LOCATION_STATUS).filter(([k]) => counts[k]).map(([k, s]) => (
            <span key={k} className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold ${s.cls}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />{s.label} <span className="tabular-nums opacity-70">{counts[k]}</span>
            </span>
          ))}
        </div>
      )}

      {sorted.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700 p-12 text-center">
          <Icon name="pin" className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600" />
          <p className="mt-3 font-bold text-gray-900 dark:text-white">No locations yet</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Add a storage space so customers can find you.</p>
          <Link href="/dashboard/locations/new" className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold">
            <Icon name="plus" className="w-4 h-4" /> Add location
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {sorted.map(loc => <LocationCard key={loc.id} location={loc} isPrimary={primaryIds.has(loc.id)} pausedUntil={pausedUntil.get(loc.id)} />)}
        </div>
      )}
    </div>
  );
}
