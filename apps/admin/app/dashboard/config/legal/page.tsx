import { createClient } from '@stashinn/lib/supabase/server';
import { createServiceClient } from '@stashinn/lib/supabase/service';
import ClientLegalSettings from './ClientLegalSettings';

export default async function LegalSettingsPage() {
  const supabase = await createClient();
  const serviceRole = createServiceClient();

  // Fetch or create T&C and Privacy Policy
  const fetchConfig = async (key: string, defaultValue: string) => {
    let { data } = await supabase.from('system_config').select('*').eq('key', key).single();
    if (!data) {
      await serviceRole.from('system_config').upsert({ key, value: defaultValue, description: `Platform ${key.replace(/_/g, ' ')}` });
      data = { key, value: defaultValue };
    }
    return data;
  };

  const [partnerTerms, customerTerms, partnerPrivacy, customerPrivacy] = await Promise.all([
    fetchConfig('partner_terms_and_conditions', 'Enter Partner Terms and Conditions here...'),
    fetchConfig('customer_terms_and_conditions', 'Enter Customer Terms and Conditions here...'),
    fetchConfig('partner_privacy_policy', 'Enter Partner Privacy Policy here...'),
    fetchConfig('customer_privacy_policy', 'Enter Customer Privacy Policy here...')
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">Legal Documents</h1>
        <p className="text-gray-500 mt-1">Manage platform Terms & Conditions and Privacy Policy for both Partners and Customers.</p>
      </div>
      
      <ClientLegalSettings 
        partnerTerms={partnerTerms.value} 
        customerTerms={customerTerms.value}
        partnerPrivacy={partnerPrivacy.value} 
        customerPrivacy={customerPrivacy.value}
      />
    </div>
  );
}
