'use server';

import { createClient } from '@stashinn/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { notifyAdmins } from '@stashinn/lib/services/notifications';

export async function submitDamageReport(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Not authenticated');

  // Get partner profile
  const { data: partner } = await supabase
    .from('partners')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!partner) throw new Error('Not a partner');

  const bookingId = formData.get('booking_id') as string;
  const description = formData.get('description') as string;
  
  // Need to get customer_id from booking
  const { data: booking } = await supabase
    .from('bookings')
    .select('customer_id')
    .eq('id', bookingId)
    .single();

  if (!booking) throw new Error('Invalid booking ID');

  // Process photo uploads
  const photos: string[] = [];
  const files = formData.getAll('photos') as File[];
  
  // Ensure the bucket exists (this might fail if RLS prevents it, but usually service role can do it)
  // For safety, we will just try to upload. If the bucket doesn't exist, we must create it in Supabase dashboard.
  
  for (const file of files) {
    if (file.size > 0 && file.name) {
      // 1. Validate Image size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('Image size must be less than 5MB.');
      }
      
      // 2. Validate Image mime type
      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!validTypes.includes(file.type)) {
        throw new Error('Invalid file type. Only JPEG, PNG, WEBP, and GIF images are allowed.');
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${bookingId}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${partner.id}/${fileName}`;
      
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('damage_reports')
        .upload(filePath, file);

      if (!uploadError && uploadData) {
        // Get public URL
        const { data: { publicUrl } } = supabase
          .storage
          .from('damage_reports')
          .getPublicUrl(filePath);
        
        photos.push(publicUrl);
      } else {
        console.error('File upload failed:', uploadError);
        throw new Error(`Upload failed for ${file.name}`);
      }
    }
  }

  // Insert report
  const { error } = await supabase
    .from('damage_reports')
    .insert({
      partner_id: partner.id,
      booking_id: bookingId,
      customer_id: booking.customer_id,
      description,
      photos,
      status: 'submitted'
    });

  if (error) {
    throw new Error(error.message);
  }

  // Notify support admin
  await notifyAdmins({
    title: 'New Dispute Claim Filed',
    message: `Partner has filed a new dispute claim for booking ID ${bookingId.split('-')[0]}.`,
    category: 'damage',
    targetRoles: ['support'],
    action_url: '/dashboard/disputes'
  });

  revalidatePath('/dashboard/damage');
}
