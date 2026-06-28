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
