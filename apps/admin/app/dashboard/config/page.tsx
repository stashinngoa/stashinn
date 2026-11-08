import { effectiveRole } from '../../../lib/permissions';
import Link from 'next/link';
import { createClient } from '@stashinn/lib/supabase/server';
import ConfigForm from './ConfigForm';
import TemplateForm from './TemplateForm';
import AmenityManager from './AmenityManager';
import { getAmenities } from '@stashinn/lib/services/amenities';

// Which templates the platform actually sends. Templates are looked up by slug in code, so
// anything not listed here is stored but never emailed.
const TEMPLATE_USAGE: Record<string, { name: string; used: boolean; when: string }> = {
  partner_approved: { name: 'Partner approved', used: true, when: 'Sent to a partner when an admin approves their application.' },
  booking_requested: { name: 'Booking request (customer)', used: true, when: 'Sent to the customer as soon as they request a booking.' },
  partner_booking_request: { name: 'Booking request (partner)', used: true, when: 'Sent to the partner for each new booking request, if they get email notifications.' },
  booking_confirmed: { name: 'Booking confirmed', used: true, when: 'Sent to the customer when the partner accepts, with the exact address, directions, contact and check-in code.' },
  booking_cancelled: { name: 'Booking cancelled', used: false, when: 'Not sent yet: cancellation emails currently use built-in text.' },
  otp_checkin: { name: 'Check-in code', used: false, when: 'Not sent yet: check-in codes currently use built-in text.' },
  otp_checkout: { name: 'Pick-up code', used: false, when: 'Not sent yet: pick-up codes currently use built-in text.' },
};

export default async function ConfigPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: configRows }, { data: emailTemplates }, { data: me }, amenities] = await Promise.all([
    supabase.from('system_config').select('key, value'),
    supabase.from('email_templates').select('*').order('slug'),
    supabase.from('users').select('admin_role').eq('id', user?.id ?? '').single(),
    getAmenities(supabase),
  ]);
  const canEdit = effectiveRole(me?.admin_role) === 'superadmin'; // no role = superadmin, as everywhere else

  const configMap = Object.fromEntries((configRows || []).map((r: any) => [r.key, r.value]));
  const templates = [...(emailTemplates || [])].sort(
    (a: any, b: any) => Number(!!TEMPLATE_USAGE[b.slug]?.used) - Number(!!TEMPLATE_USAGE[a.slug]?.used) || a.slug.localeCompare(b.slug)
  );

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white">Configuration</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Platform-wide rules, amenities, legal documents and email templates.</p>
      </div>

      {!canEdit && (
        <div className="p-4 rounded-xl border bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50 text-sm text-amber-800 dark:text-amber-300">
          View only. Only superadmins can change these settings.
        </div>
      )}

      <section className="space-y-4">
        <ConfigForm initialConfig={configMap} canEdit={canEdit} />
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Commission is set per location on each partner&apos;s page (falling back to the partner&apos;s own rate).
        </p>
      </section>

      <AmenityManager amenities={amenities} canEdit={canEdit} />

      <Link
        href="/dashboard/config/legal"
        className="group flex items-center gap-4 p-5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm dark:shadow-none hover:border-orange-300 dark:hover:border-orange-600/60 transition-colors"
      >
        <span className="w-11 h-11 shrink-0 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-bold text-gray-900 dark:text-white">Legal documents</span>
          <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">Partner and customer terms and privacy policies, and the business details they use. Partners see theirs at sign-up and on the registration form.</span>
        </span>
        <svg className="w-5 h-5 text-gray-300 dark:text-gray-600 group-hover:text-orange-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
      </Link>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-extrabold text-gray-900 dark:text-white">Email templates</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Use <code className="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-xs">{'{{variable}}'}</code> placeholders; the variables each template supports are listed on it.
          </p>
        </div>

        {templates.length === 0 ? (
          <div className="p-6 text-center rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
            No email templates in the database yet. Apply the latest Supabase migrations (<code className="text-xs">npx supabase db push</code>) to add the defaults.
          </div>
        ) : (
          <div className="space-y-3">
            {templates.map((t: any) => {
              const usage = TEMPLATE_USAGE[t.slug] ?? { name: t.slug, used: false, when: 'Custom template: not sent by the platform.' };
              return (
                <details key={t.id} className="group bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm dark:shadow-none overflow-hidden">
                  <summary className="flex items-start gap-3 px-5 py-4 cursor-pointer list-none hover:bg-gray-50 dark:hover:bg-gray-800/40">
                    <span className="flex-1 min-w-0">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-gray-900 dark:text-white">{usage.name}</span>
                        <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${
                          usage.used
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-400'
                            : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400'
                        }`}>
                          {usage.used ? 'In use' : 'Not used yet'}
                        </span>
                        {!t.is_active && <span className="px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-400">Disabled</span>}
                      </span>
                      <span className="block text-xs text-gray-500 dark:text-gray-400 mt-1">{usage.when}</span>
                      <span className="block text-xs text-gray-700 dark:text-gray-300 mt-1.5 truncate"><span className="text-gray-400 dark:text-gray-500">Subject:</span> {t.subject}</span>
                    </span>
                    <svg className="w-5 h-5 mt-0.5 shrink-0 text-gray-400 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </summary>
                  <div className="px-5 pb-5">
                    <TemplateForm template={t} />
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
