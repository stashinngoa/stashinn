import { createClient } from '@stashinn/lib/supabase/server';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import LocationForm from '../../LocationForm';
import Icon from '../../../../../components/Icon';
import { getAmenities } from '@stashinn/lib/services/amenities';

export default async function EditLocationPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/');

  const { data: partner } = await supabase.from('partners').select('id').eq('user_id', user.id).single();
  if (!partner) redirect('/onboarding');

  const { data: location } = await supabase
    .from('partner_locations')
    .select('*, vehicle_pricing(*)')
    .eq('id', id)
    .eq('partner_id', partner.id)
    .maybeSingle();
  if (!location) notFound();

  const { data: existingPocs } = await supabase
    .from('partner_pocs')
    .select('*, partner_locations(name)')
    .eq('partner_id', partner.id)
    .order('created_at', { ascending: false });
  const isPrimary = (existingPocs || []).some(p => p.location_id === location.id && p.is_primary);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <Link href={`/dashboard/locations/${location.id}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400">
          <Icon name="back" className="w-4 h-4" /> {location.name}
        </Link>
        <h1 className="mt-3 text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white">Edit location</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Update details, hours, photos and the contact for this space.</p>
      </div>
      <LocationForm initialData={location} existingPocs={existingPocs || []} isPrimary={isPrimary} amenityCatalog={await getAmenities(supabase)} />
    </div>
  );
}
