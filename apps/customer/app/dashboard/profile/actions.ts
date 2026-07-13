'use server';

import { createClient } from '@stashinn/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  
  const fullName = formData.get('fullName') as string;
  const phone = formData.get('phone') as string;

  const { error } = await supabase.auth.updateUser({
    data: { 
      full_name: fullName,
      phone: phone
    }
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/dashboard/profile');
  return { success: true };
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient();
  
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  if (password !== confirmPassword) {
    return { error: 'Passwords do not match.' };
  }
  if (password.length < 6) {
    return { error: 'Password should be at least 6 characters.' };
  }

  const { error } = await supabase.auth.updateUser({
    password: password
  });

  if (error) {
    return { error: error.message };
  }

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
