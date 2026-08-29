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
      is_primary: formData.get('is_primary') === 'true',
      is_verified: false
    });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/dashboard/pocs');
}

export async function editPoc(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  // Need to ensure the partner is NOT approved if they try to edit directly
  const { data: partner } = await supabase.from('partners').select('status').eq('user_id', user.id).single();
  if (partner?.status === 'approved') return { error: 'Cannot edit directly when approved' };

  const { error } = await supabase
    .from('partner_pocs')
    .update({
      location_id: (formData.get('location_id') as string) || null,
      name: formData.get('name') as string,
      phone: formData.get('phone') as string,
      email: (formData.get('email') as string) || null,
    })
    .eq('id', formData.get('poc_id') as string);

  if (error) return { error: error.message };
  revalidatePath('/dashboard/pocs');
}

export async function deletePoc(pocId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { data: partner } = await supabase.from('partners').select('status').eq('user_id', user.id).single();
  if (partner?.status === 'approved') return { error: 'Cannot delete directly when approved' };

  const { error } = await supabase
    .from('partner_pocs')
    .delete()
    .eq('id', pocId);

  if (error) return { error: error.message };
  revalidatePath('/dashboard/pocs');
}

export async function createSupportTicket(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { error } = await supabase
    .from('support_tickets')
    .insert({
      partner_id: formData.get('partner_id') as string,
      subject: formData.get('subject') as string,
      description: formData.get('description') as string,
      status: 'open'
    });

  if (error) return { error: error.message };
  revalidatePath('/dashboard/pocs');
}
