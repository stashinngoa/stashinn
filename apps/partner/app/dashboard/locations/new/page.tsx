import LocationForm from '../LocationForm';
import Link from 'next/link';
import { createClient } from '@stashinn/lib/supabase/server';
import { redirect } from 'next/navigation';
import Icon from '../../../../components/Icon';
import { getAmenities } from '@stashinn/lib/services/amenities';

export default async function NewLocationPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/');

  const { data: partner } = await supabase.from('partners').select('id').eq('user_id', user.id).single();
  if (!partner) redirect('/onboarding');

  const { data: existingPocs } = await supabase
    .from('partner_pocs')
    .select('*, partner_locations(name)')
    .eq('partner_id', partner.id)
    .order('created_at', { ascending: false });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <Link href="/dashboard/locations" className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400">
          <Icon name="back" className="w-4 h-4" /> Locations
        </Link>
        <h1 className="mt-3 text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white">Add a location</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">StashInn reviews every new location before customers can book it.</p>
      </div>
      <LocationForm existingPocs={existingPocs || []} amenityCatalog={await getAmenities(supabase)} />
    </div>
  );
}
