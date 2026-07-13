'use server';

import { createClient } from '@stashinn/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function verifyPoc(pocId: string, partnerId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { error } = await supabase
    .from('partner_pocs')
    .update({ is_verified: true })
    .eq('id', pocId);

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/partners/${partnerId}/pocs`);
  return { success: true };
}

export async function deletePoc(pocId: string, partnerId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { error } = await supabase
    .from('partner_pocs')
    .delete()
    .eq('id', pocId);

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/partners/${partnerId}/pocs`);
  return { success: true };
}

export async function editPoc(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const pocId = formData.get('poc_id') as string;
  const partnerId = formData.get('partner_id') as string;
  
  const { error } = await supabase
    .from('partner_pocs')
    .update({
      name: formData.get('name') as string,
      phone: formData.get('phone') as string,
      email: (formData.get('email') as string) || null,
      location_id: (formData.get('location_id') as string) || null,
      is_primary: formData.get('is_primary') === 'true'
    })
    .eq('id', pocId);

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/partners/${partnerId}/pocs`);
  return { success: true };
}
