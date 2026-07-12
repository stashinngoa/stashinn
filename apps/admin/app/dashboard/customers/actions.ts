'use server';

import { createClient } from '@stashinn/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function getCustomers(search?: string) {
  const supabase = await createClient();

  let query = supabase
    .from('users')
    .select('*')
    .eq('role', 'customer')
    .order('created_at', { ascending: false });

  if (search) {
    query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
  }

  const { data, error } = await query.limit(100);

  if (error) {
    return { error: error.message, customers: [] };
  }

  return { customers: data || [] };
}

export async function toggleBlockUser(formData: FormData) {
  const userId = formData.get('user_id') as string;
  const currentlyBlocked = formData.get('is_blocked') === 'true';
  const supabase = await createClient();

  await supabase
    .from('users')
    .update({ is_blocked: !currentlyBlocked })
    .eq('id', userId);

  revalidatePath('/dashboard/customers');
}
