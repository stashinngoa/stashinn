import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@stashinn/lib/supabase/server';
import Icon from '../../../components/Icon';
import { AddContactButton, ContactCard } from './ContactsClient';
import { phoneKey, type LocationLite, type Person } from './contactShared';

const card = 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm dark:shadow-none';

export default async function ContactsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/');
  const { data: partner } = await supabase.from('partners').select('id, status').eq('user_id', user.id).single();
  if (!partner) redirect('/onboarding');
  const approved = partner.status === 'approved';

  const [{ data: rows }, { data: locs }, { data: tickets }] = await Promise.all([
    supabase.from('partner_pocs').select('*').eq('partner_id', partner.id).order('created_at', { ascending: true }),
    supabase.from('partner_locations').select('id, name, location_type, is_active, admin_status').eq('partner_id', partner.id).order('created_at'),
    supabase.from('support_tickets').select('subject, status, created_at').eq('partner_id', partner.id).in('status', ['open', 'in_progress']).like('subject', 'Contact %'),
  ]);

  const locations: LocationLite[] = (locs || []).map(l => ({ id: l.id, name: l.name, type: l.location_type, live: l.is_active && l.admin_status === 'approved' }));

  // One person per phone number (they're stored once per location)
  const byKey = new Map<string, any[]>();
  (rows || []).forEach(r => { const k = phoneKey(r.phone) || r.id; byKey.set(k, [...(byKey.get(k) || []), r]); });

  // Signed links to the private ID documents and photos, in one call
  const paths = [...new Set((rows || []).flatMap(r => [r.id_document_url, r.photo_url]).filter(Boolean) as string[])];
  const signed = new Map<string, string>();
  if (paths.length) {
    const { data } = await supabase.storage.from('kyc-documents').createSignedUrls(paths, 3600);
    (data || []).forEach(s => { if (s.path && s.signedUrl) signed.set(s.path, s.signedUrl); });
  }

  const people: Person[] = [...byKey.entries()].map(([key, rs]) => {
    const latest = rs[rs.length - 1];
    const ticket = (tickets || []).find(t => t.subject.endsWith(`: ${latest.name}`));
    return {
      key,
      ids: rs.map(r => r.id),
      name: latest.name,
      phone: latest.phone,
      email: latest.email,
      isPrimary: rs.some(r => r.is_primary),
      verified: rs.every(r => r.is_verified),
      locationIds: [...new Set(rs.map(r => r.location_id).filter(Boolean))] as string[],
      idDocUrl: latest.id_document_url ? signed.get(latest.id_document_url) ?? null : null,
      idDocIsPdf: /\.pdf$/i.test(latest.id_document_url || ''),
      photoUrl: latest.photo_url ? signed.get(latest.photo_url) ?? null : null,
      addedAt: rs[0].created_at,
      openRequest: ticket ? (ticket.subject.startsWith('Contact removal') ? 'Removal requested' : 'Change requested') : null,
    };
  }).sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.name.localeCompare(b.name));

  // Does each location have someone verified (and nobody unverified)? That's what search requires.
  const coverage = locations.map(l => {
    const assigned = (rows || []).filter(r => r.location_id === l.id);
    const state = !assigned.length ? 'none' : assigned.every(r => r.is_verified) ? 'ready' : 'waiting';
    return { ...l, count: new Set(assigned.map(r => phoneKey(r.phone))).size, state };
  });
  const verifiedCount = people.filter(p => p.verified).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white">Staff &amp; contacts</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">The people customers and StashInn can reach at each location.</p>
        </div>
        <AddContactButton locations={locations} approved={approved} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <section className={`${card} p-5 lg:col-span-2`}>
          <h2 className="font-extrabold text-gray-900 dark:text-white">Location coverage</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">A location shows in search only when it has a contact and every contact there is verified.</p>
          {coverage.length === 0 ? (
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">No locations yet. <Link href="/dashboard/locations" className="font-bold text-orange-700 dark:text-orange-400 hover:underline">Add a location</Link></p>
          ) : (
            <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {coverage.map(l => (
                <li key={l.id} className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${
                  l.state === 'ready' ? 'border-gray-200 dark:border-gray-800' : l.state === 'waiting' ? 'border-amber-200 dark:border-amber-800/60 bg-amber-50/50 dark:bg-amber-950/20' : 'border-red-200 dark:border-red-800/60 bg-red-50/50 dark:bg-red-950/20'}`}>
                  <span className={`h-8 w-8 shrink-0 rounded-lg flex items-center justify-center ${
                    l.state === 'ready' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : l.state === 'waiting' ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400' : 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400'}`}>
                    <Icon name={l.state === 'ready' ? 'check' : l.state === 'waiting' ? 'clock' : 'alert'} className="w-4 h-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-gray-900 dark:text-white truncate">{l.name}</span>
                    <span className="block text-xs text-gray-500 dark:text-gray-400">
                      {l.state === 'none' ? 'No contact assigned' : `${l.count} contact${l.count === 1 ? '' : 's'} · ${l.state === 'ready' ? 'all verified' : 'waiting for verification'}`}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={`${card} p-5 text-sm`}>
          <h2 className="font-extrabold text-gray-900 dark:text-white">How verification works</h2>
          <ol className="mt-2 space-y-2 text-gray-600 dark:text-gray-300">
            <li className="flex gap-2"><span className="h-5 w-5 shrink-0 rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 text-[11px] font-black flex items-center justify-center">1</span>Add the person with an ID proof and a clear photo.</li>
            <li className="flex gap-2"><span className="h-5 w-5 shrink-0 rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 text-[11px] font-black flex items-center justify-center">2</span>StashInn checks them, usually within a working day.</li>
            <li className="flex gap-2"><span className="h-5 w-5 shrink-0 rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 text-[11px] font-black flex items-center justify-center">3</span>Customers get their name and number once a booking is confirmed.</li>
          </ol>
          {approved && <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">Your account is live: changing a verified person’s name, phone or ID goes through StashInn, so your locations stay bookable.</p>}
        </section>
      </div>

      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="font-extrabold text-gray-900 dark:text-white">People <span className="text-gray-400 font-bold tabular-nums">({people.length})</span></h2>
          {people.length > 0 && <p className="text-xs text-gray-500 dark:text-gray-400">{verifiedCount} of {people.length} verified</p>}
        </div>
        {people.length === 0 ? (
          <div className={`${card} border-dashed p-10 text-center`}>
            <span className="mx-auto mb-3 h-12 w-12 rounded-2xl bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 flex items-center justify-center"><Icon name="users" className="w-6 h-6" /></span>
            <p className="text-sm font-bold text-gray-900 dark:text-white">No contacts yet</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Add the person who will hand over and receive items at your location.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {people.map(p => <ContactCard key={p.key} person={p} locations={locations} approved={approved} />)}
          </div>
        )}
      </section>
    </div>
  );
}
