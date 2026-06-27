'use server';

import { createClient } from '@stashinn/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function addPoc(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'Unauthorized' };

  const { error } = await supabase
    .from('partner_pocs')
    .insert({
      partner_id: formData.get('partner_id') as string,
      location_id: (formData.get('location_id') as string) || null,
      name: formData.get('name') as string,
      phone: formData.get('phone') as string,
      email: (formData.get('email') as string) || null,
      is_primary: formData.get('is_primary') === 'true'
    });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/dashboard/pocs');
}

export async function deletePoc(pocId: string) {
  const supabase = await createClient();
  
  await supabase
    .from('partner_pocs')
    .delete()
    .eq('id', pocId);
    
  revalidatePath('/dashboard/pocs');
}
