'use server';

import { createClient } from '@stashinn/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { sendSMS, sendWhatsApp } from '@stashinn/lib/services/messaging';
import { checkRateLimit } from '@stashinn/lib/services/rateLimiter';

export async function acceptBooking(formData: FormData) {
  const bookingId = formData.get('booking_id') as string;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  // Generate simple 4-digit OTPs
  const generateOTP = () => Math.floor(1000 + Math.random() * 9000).toString();
  const checkinOtp = generateOTP();
  const checkoutOtp = generateOTP();

  const { data: booking } = await supabase.from('bookings').select('customer_id, partner_locations(name)').eq('id', bookingId).single();

  const { error } = await supabase.from('bookings').update({
    status: 'confirmed',
    checkin_otp: checkinOtp,
    checkout_otp: checkoutOtp
  }).eq('id', bookingId).eq('status', 'pending');

  if (error) return { error: error.message };

  if (booking?.customer_id) {
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const supabaseService = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    await supabaseService.from('notifications').insert({
      user_id: booking.customer_id,
      title: 'Booking Accepted',
      message: `${(booking.partner_locations as any)?.name || 'The partner'} has accepted your booking! View your OTP now.`,
      category: 'booking'
    });
    
    // Notify Customer via SMS and Email
    const { data: customerData } = await supabaseService.from('users').select('phone, email').eq('id', booking.customer_id).single();
    if (customerData) {
      await sendSMS({
        to: customerData.phone || '+1234567890',
        message: `StashInn: Your booking at ${(booking.partner_locations as any)?.name || 'the partner'} was accepted! Your Check-in OTP is ${checkinOtp}.`
      });
      const { ExternalNotificationService } = await import('@stashinn/lib/services/notifications');
      if (customerData.email) {
        await ExternalNotificationService.sendEmail(
          customerData.email,
          'Booking Accepted - StashInn',
          `Good news! Your booking at ${(booking.partner_locations as any)?.name} was accepted.\n\nYour Check-in OTP is: ${checkinOtp}\n\nPlease present this OTP at the location.`
        );
      }
    }
  }

  revalidatePath(`/dashboard/bookings/${bookingId}`);
  revalidatePath('/dashboard/bookings');
  return { success: true };
}

export async function declineBooking(formData: FormData) {
  const bookingId = formData.get('booking_id') as string;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { data: booking } = await supabase.from('bookings').select('customer_id, partner_locations(name)').eq('id', bookingId).single();

  const { error } = await supabase.from('bookings').update({
    status: 'cancelled',
    cancellation_reason: 'Declined by Partner due to capacity/availability',
    cancelled_by: 'partner'
  }).eq('id', bookingId).eq('status', 'pending');

  if (error) return { error: error.message };

  if (booking?.customer_id) {
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const supabaseService = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    await supabaseService.from('notifications').insert({
      user_id: booking.customer_id,
      title: 'Booking Declined',
      message: `${(booking.partner_locations as any)?.name || 'The partner'} could not accept your booking. Your payment has been voided.`,
      category: 'booking'
    });
    
    // Notify Customer via SMS and Email
    const { data: customerData } = await supabaseService.from('users').select('phone, email').eq('id', booking.customer_id).single();
    if (customerData) {
      await sendSMS({
        to: customerData.phone || '+1234567890',
        message: `StashInn: Unfortunately, your booking at ${(booking.partner_locations as any)?.name || 'the partner'} was declined. Any charges will be voided/refunded.`
      });
      const { ExternalNotificationService } = await import('@stashinn/lib/services/notifications');
      if (customerData.email) {
        await ExternalNotificationService.sendEmail(
          customerData.email,
          'Booking Declined - StashInn',
          `Unfortunately, your booking at ${(booking.partner_locations as any)?.name} was declined due to capacity issues. Any charges have been voided.`
        );
      }
    }
  }

  revalidatePath(`/dashboard/bookings/${bookingId}`);
  revalidatePath('/dashboard/bookings');
  return { success: true };
}

export async function verifyCheckInOTP(formData: FormData) {
  const bookingId = formData.get('booking_id') as string;
  const otpInput = formData.get('otp') as string;
  
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  // Fetch booking to verify
  const { data: booking } = await supabase.from('bookings').select('customer_id, checkin_otp, status').eq('id', bookingId).single();
  
  if (!booking) return { error: 'Booking not found.' };
  if (booking.status !== 'pending' && booking.status !== 'confirmed') return { error: 'Booking is not pending.' };
  // Rate limiting check (max 5 attempts, 15 min block)
  const rateLimit = await checkRateLimit(`otp_checkin_${bookingId}`, 5);
  
  if (booking.checkin_otp !== otpInput) {
    rateLimit.recordFailure();
    return { error: 'Invalid Check-in OTP.' };
  }
  
  rateLimit.reset();

  // Update status and timestamp
  const { error } = await supabase.from('bookings').update({
    status: 'checked_in',
    actual_checkin: new Date().toISOString()
  }).eq('id', bookingId);

  if (error) return { error: error.message };
  
  // Insert Audit Log for OTP
  await supabase.from('audit_logs').insert({
    user_id: user.id,
    action: 'booking.otp_verified',
    entity_type: 'bookings',
    entity_id: bookingId,
    new_values: { type: 'checkin', status: 'checked_in' }
  });

  // Notify customer of check-in
  if (booking?.customer_id) {
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const supabaseService = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data: customerData } = await supabaseService.from('users').select('email, phone').eq('id', booking.customer_id).single();
    if (customerData?.email) {
      const { ExternalNotificationService } = await import('@stashinn/lib/services/notifications');
      await ExternalNotificationService.sendEmail(
        customerData.email,
        'Bags Checked In - StashInn',
        `Your bags have been successfully checked in. We will keep them safe!`
      );
    }
  }

  revalidatePath(`/dashboard/bookings/${bookingId}`);
  revalidatePath('/dashboard/bookings');
  return { success: true };
}

export async function verifyCheckOutOTP(formData: FormData) {
  const bookingId = formData.get('booking_id') as string;
  const otpInput = formData.get('otp') as string;
  
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { data: booking } = await supabase.from('bookings').select('customer_id, checkout_otp, status, partner_locations(name)').eq('id', bookingId).single();
  
  if (!booking) return { error: 'Booking not found.' };
  if (booking.status !== 'checked_in') return { error: 'Bags are not checked in.' };
  // Rate limiting check
  const rateLimit = await checkRateLimit(`otp_checkout_${bookingId}`, 5);
  
  if (booking.checkout_otp !== otpInput) {
    rateLimit.recordFailure();
    return { error: 'Invalid Check-out OTP.' };
  }
  
  rateLimit.reset();

  const { error } = await supabase.from('bookings').update({
    status: 'checked_out',
    actual_checkout: new Date().toISOString()
  }).eq('id', bookingId);

  if (error) return { error: error.message };

  // Insert Audit Log for OTP
  await supabase.from('audit_logs').insert({
    user_id: user.id,
    action: 'booking.otp_verified',
    entity_type: 'bookings',
    entity_id: bookingId,
    new_values: { type: 'checkout', status: 'checked_out' }
  });


  if (booking?.customer_id) {
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const supabaseService = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 5. Reviews - Trigger notification to prompt customer for review
    await supabaseService.from('notifications').insert({
      user_id: booking.customer_id,
      title: 'How was your experience?',
      message: `Your stash at ${(booking.partner_locations as any)?.name || 'the partner'} is complete. Please leave a review to help others!`,
      category: 'system',
      action_url: `/dashboard/review?booking_id=${bookingId}`
    });
    
    // SMS reminder
    const { data: customerData } = await supabaseService.from('users').select('phone, email').eq('id', booking.customer_id).single();
    await sendSMS({
      to: customerData?.phone || '+1234567890',
      message: `StashInn: Thanks for using StashInn! Rate your experience at ${(booking.partner_locations as any)?.name || 'the partner'}.`
    });

    if (customerData?.email) {
      const { ExternalNotificationService } = await import('@stashinn/lib/services/notifications');
      await ExternalNotificationService.sendEmail(
        customerData.email,
        'Checkout Complete - StashInn',
        `Thank you for using StashInn! Your bags have been checked out from ${(booking.partner_locations as any)?.name}. Please leave a review!`
      );
    }
  }

  revalidatePath(`/dashboard/bookings/${bookingId}`);
  revalidatePath('/dashboard/bookings');
  return { success: true };
}
