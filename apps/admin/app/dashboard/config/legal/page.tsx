import { effectiveRole } from '../../../../lib/permissions';
import Link from 'next/link';
import { createClient } from '@stashinn/lib/supabase/server';
import { createServiceClient } from '@stashinn/lib/supabase/service';
import { loadLegal } from '@stashinn/lib/services/legal';
import ClientLegalSettings from './ClientLegalSettings';

export default async function LegalSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [{ data: me }, legal] = await Promise.all([
    supabase.from('users').select('admin_role').eq('id', user?.id ?? '').single(),
    loadLegal(createServiceClient()),
  ]);
  const canEdit = effectiveRole(me?.admin_role) === 'superadmin'; // no role = superadmin, as everywhere else

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <Link href="/dashboard/config" className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Configuration
        </Link>
        <h1 className="mt-1 text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white">Legal documents</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Terms and privacy policies for partners and customers, and the business details they use.</p>
      </div>

      <ClientLegalSettings
        docs={legal.docs}
        details={legal.details}
        live={legal.live}
        detailsUpdatedAt={legal.detailsUpdatedAt}
        canEdit={canEdit}
      />
    </div>
  );
}
