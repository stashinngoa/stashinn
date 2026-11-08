'use server';

import { createClient } from '@stashinn/lib/supabase/server';
import { createServiceClient } from '@stashinn/lib/supabase/service';
import { revalidatePath } from 'next/cache';

type Result = { success: true } | { error: string };

/**
 * Saves the customer's name and mobile. They're kept on the sign-in account and on the
 * users row, which checkout and booking emails read.
 */
export async function updateProfile(formData: FormData): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Your session has expired. Please sign in again.' };

  const fullName = String(formData.get('fullName') || '').trim().replace(/\s+/g, ' ');
  const phone = String(formData.get('phone') || '').replace(/[\s-]/g, '');
  if (fullName.length < 2) return { error: 'Please enter your full name.' };
  if (phone && !/^(\+91)?[6-9]\d{9}$/.test(phone)) return { error: 'Enter a valid 10-digit Indian mobile number.' };

  const { error } = await supabase.auth.updateUser({ data: { full_name: fullName, phone } });
  if (error) return { error: error.message };

  // Only these two columns, for this user (checked above)
  const { error: rowError } = await createServiceClient()
    .from('users')
    .update({ full_name: fullName, phone: phone || null, updated_at: new Date().toISOString() })
    .eq('id', user.id);
  if (rowError) return { error: rowError.message };

  revalidatePath('/dashboard', 'layout');
  return { success: true };
}

export async function updateNotificationPreferences(formData: FormData): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Your session has expired. Please sign in again.' };

  const { error } = await supabase.from('notification_preferences').upsert(
    {
      user_id: user.id,
      in_app: formData.get('in_app') === 'on',
      email: formData.get('email') === 'on',
      whatsapp: formData.get('whatsapp') === 'on',
      sms: formData.get('sms') === 'on',
    },
    { onConflict: 'user_id' },
  );
  if (error) return { error: error.message };

  revalidatePath('/dashboard/profile');
  return { success: true };
}
