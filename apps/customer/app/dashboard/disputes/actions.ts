'use server';

import { createClient } from '@stashinn/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { notifyAdmins } from '@stashinn/lib/services/notifications';

export async function submitCustomerDispute(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Not authenticated');

  const bookingId = formData.get('booking_id') as string;
  const description = formData.get('description') as string;
  
  // Need to get partner_id from booking
  const { data: booking } = await supabase
    .from('bookings')
    .select('partner_id, customer_id')
    .eq('id', bookingId)
    .single();

  if (!booking) throw new Error('Invalid booking ID');
  if (booking.customer_id !== user.id) throw new Error('Unauthorized');

  // Process photo uploads
  const photos: string[] = [];
  const files = formData.getAll('photos') as File[];
  
  for (const file of files) {
    if (file.size > 0 && file.name) {
      if (file.size > 5 * 1024 * 1024) throw new Error('Image size must be less than 5MB.');
      
      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!validTypes.includes(file.type)) throw new Error('Invalid file type.');

      const fileExt = file.name.split('.').pop();
      const fileName = `${bookingId}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `customer-${user.id}/${fileName}`;
      
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('damage_reports')
        .upload(filePath, file);

      if (!uploadError && uploadData) {
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
      partner_id: booking.partner_id,
      customer_id: user.id,
      booking_id: bookingId,
      description,
      photos,
      status: 'submitted'
    });

  if (error) {
    throw new Error(error.message);
  }

  // Notify support admin
  await notifyAdmins({
    title: 'New Dispute Claim Filed by Customer',
    message: `Customer has filed a new dispute claim for booking ID ${bookingId.split('-')[0]}.`,
    category: 'damage',
    targetRoles: ['support'],
    action_url: '/dashboard/disputes'
  });

  revalidatePath('/dashboard/disputes');
}
