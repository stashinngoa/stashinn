import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@stashinn/lib/supabase/server';
import Icon, { type IconName } from '../../../components/Icon';
import ProfileEditForm from './ProfileEditForm';
import ProfileForm, { AccountForm } from './ProfileForm';

const card = 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm dark:shadow-none';
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });

const STATUS: Record<string, { label: string; text: string; cls: string }> = {
  approved: { label: 'Live', text: 'Customers can book your verified locations.', cls: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60' },
  pending: { label: 'Under review', text: 'StashInn is checking your details. Customers can book you once you’re approved.', cls: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/60' },
  suspended: { label: 'Suspended', text: 'Your locations aren’t taking new bookings. Contact support@stashinn.in.', cls: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/60' },
  rejected: { label: 'Not approved', text: 'Your application wasn’t approved. Contact support@stashinn.in for details.', cls: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/60' },
};

function Fact({ icon, label, value, sub, tone = 'gray' }: { icon: IconName; label: string; value: string; sub?: string; tone?: 'gray' | 'green' | 'amber' }) {
  const toneCls = tone === 'green' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : tone === 'amber' ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400';
  return (
    <div className="flex items-start gap-3 min-w-0">
      <span className={`h-9 w-9 shrink-0 rounded-xl flex items-center justify-center ${toneCls}`}><Icon name={icon} className="w-4 h-4" /></span>
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-sm font-bold text-gray-900 dark:text-white">{value}</p>
        {sub && <p className="text-xs text-gray-500 dark:text-gray-400">{sub}</p>}
      </div>
    </div>
  );
}

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/');
  const { data: partner } = await supabase.from('partners').select('*').eq('user_id', user.id).single();
  if (!partner) redirect('/onboarding');

  const [{ data: prefs }, { data: me }, { count: liveLocations }, { count: allLocations }] = await Promise.all([
    supabase.from('notification_preferences').select('*').eq('user_id', user.id).maybeSingle(),
    supabase.from('users').select('full_name, phone').eq('id', user.id).maybeSingle(),
    supabase.from('partner_locations').select('id', { count: 'exact', head: true }).eq('partner_id', partner.id).eq('admin_status', 'approved').eq('is_active', true),
    supabase.from('partner_locations').select('id', { count: 'exact', head: true }).eq('partner_id', partner.id),
  ]);
  const st = STATUS[partner.status] ?? STATUS.pending!;
  const commission = partner.commission_rate != null ? `${Number(partner.commission_rate)}%` : '15%';

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white">Business profile</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Your business and tax details, your own account, and how we reach you.</p>
      </div>

      <section className={`${card} p-5`}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 pb-4 border-b border-gray-100 dark:border-gray-800">
          <span className="h-12 w-12 shrink-0 rounded-2xl bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 flex items-center justify-center"><Icon name="building" className="w-6 h-6" /></span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-extrabold text-gray-900 dark:text-white truncate">{partner.business_name}</h2>
              <span className={`px-2.5 py-0.5 rounded-full border text-xs font-bold ${st.cls}`}>{st.label}</span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{st.text}</p>
          </div>
        </div>
        <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Fact icon="lock" label="Identity (KYC)" value={partner.kyc_verified ? 'Verified' : 'Not verified yet'} tone={partner.kyc_verified ? 'green' : 'amber'} sub={partner.kyc_verified ? undefined : 'StashInn checks your PAN and documents.'} />
          <Fact icon="wallet" label="GST on your bookings"
            value={partner.gst_applicable === true ? 'Added to bookings' : partner.gst_applicable === false ? 'Not added' : 'Not decided yet'}
            sub={partner.gst_applicable == null ? 'StashInn decides this during review.' : 'Set by StashInn from your registration.'}
            tone={partner.gst_applicable == null ? 'amber' : 'gray'} />
          <Fact icon="chart" label="StashInn commission" value={commission} sub="Per booking, before GST. Some locations may have their own rate." />
          <Fact icon="check" label="Partner agreement" value={partner.signed_registration_doc_url ? 'Signed' : 'Not signed yet'} tone={partner.signed_registration_doc_url ? 'green' : 'amber'} sub={partner.signed_registration_doc_url ? undefined : 'We’ll send it to you to sign.'} />
          <Link href="/dashboard/locations" className="rounded-xl -m-1.5 p-1.5 hover:bg-gray-50 dark:hover:bg-gray-800/40"><Fact icon="pin" label="Locations" value={`${liveLocations || 0} live of ${allLocations || 0}`} sub="Manage locations →" tone={liveLocations ? 'green' : 'gray'} /></Link>
          <Fact icon="star" label="Rating" value={partner.total_reviews > 0 ? `★ ${Number(partner.avg_rating).toFixed(1)} from ${partner.total_reviews}` : 'No reviews yet'} sub={`Partner since ${fmtDate(partner.created_at)}`} />
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <section className={`${card} p-5`}>
            <h2 className="font-extrabold text-gray-900 dark:text-white">Business &amp; tax details</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 mb-4">Used for your invoices, payouts and tax. Keep them matching your PAN and GST registration.</p>
            <ProfileEditForm initialData={{ business_name: partner.business_name, business_type: partner.business_type, pan: partner.pan, gstin: partner.gstin, status: partner.status }} />
          </section>
          <section className={`${card} p-5`}>
            <h2 className="font-extrabold text-gray-900 dark:text-white">Your account</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 mb-4">You, the person who signs in. For staff at your locations, see <Link href="/dashboard/pocs" className="font-bold text-orange-700 dark:text-orange-400 hover:underline">Staff &amp; contacts</Link>.</p>
            <AccountForm email={user.email || ''} fullName={me?.full_name || ''} phone={(me?.phone || '').replace(/^\+91/, '')} />
          </section>
        </div>
        <section className={`${card} p-5`}>
          <h2 className="font-extrabold text-gray-900 dark:text-white">Notifications</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">How we tell you about bookings and payouts.</p>
          <ProfileForm initialPrefs={prefs || { in_app: true, email: true, whatsapp: false, sms: false, daily_plan: false }} hasPhone={!!me?.phone} />
        </section>
      </div>
    </div>
  );
}
