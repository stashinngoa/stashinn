'use server';

import { createClient } from '@stashinn/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized.' };
  }

  // Server-side PAN validation
  const pan = formData.get('pan') as string;
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  if (pan && !panRegex.test(pan.toUpperCase())) {
    return { error: 'Invalid PAN format.' };
  }

  const { error } = await supabase
    .from('partners')
    .update({
      business_name: formData.get('business_name') as string,
      business_type: formData.get('business_type') as string,
      gstin: (formData.get('gstin') as string)?.toUpperCase() || null,
      pan: pan.toUpperCase(),
    })
    .eq('user_id', user.id);

  if (error) {
    console.error('Update Profile Error:', error);
    return { error: error.message };
  }

  revalidatePath('/dashboard/profile');
  return { success: true };
}

export async function updateNotificationPreferences(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized' };
  }

  const in_app = formData.get('in_app') === 'on';
  const email = formData.get('email') === 'on';
  const whatsapp = formData.get('whatsapp') === 'on';
  const sms = formData.get('sms') === 'on';
  const push = formData.get('push') === 'on';

  const { error } = await supabase
    .from('notification_preferences')
    .upsert(
      {
        user_id: user.id,
        in_app,
        email,
        whatsapp,
        sms,
        push
      },
      { onConflict: 'user_id' }
    );

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/dashboard/profile');
  return { success: true };
}
