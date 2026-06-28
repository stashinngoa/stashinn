import LocationForm from '../LocationForm';
import Link from 'next/link';
import { createClient } from '@stashinn/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function NewLocationPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: partner } = await supabase
    .from('partners')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!partner) redirect('/onboarding');

  const { data: existingPocs } = await supabase
    .from('partner_pocs')
    .select('*')
    .eq('partner_id', partner.id)
    .order('created_at', { ascending: false });

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="mb-6">
        <Link href="/dashboard/locations" className="text-purple-600 hover:text-purple-700 text-sm font-medium flex items-center mb-4">
          <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Locations
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Add New Location</h1>
        <p className="text-gray-500 mt-1">Configure a new physical storage spot for customers to discover.</p>
      </div>

      <LocationForm existingPocs={existingPocs || []} />
    </div>
  );
}
