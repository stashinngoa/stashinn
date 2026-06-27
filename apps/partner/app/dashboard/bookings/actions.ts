'use server';

import { createClient } from '@stashinn/lib/supabase/server';
import { revalidatePath } from 'next/cache';
export async function acceptBooking(formData: FormData) {
  const bookingId = formData.get('booking_id') as string;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  // Generate simple 4-digit OTPs
  const generateOTP = () => Math.floor(1000 + Math.random() * 9000).toString();
  const checkinOtp = generateOTP();
  const checkoutOtp = generateOTP();

  const { error } = await supabase.from('bookings').update({
    status: 'confirmed',
    checkin_otp: checkinOtp,
    checkout_otp: checkoutOtp
  }).eq('id', bookingId).eq('status', 'pending');

  if (error) return { error: error.message };
  revalidatePath(`/dashboard/bookings/${bookingId}`);
  revalidatePath('/dashboard/bookings');
  return { success: true };
}

export async function declineBooking(formData: FormData) {
  const bookingId = formData.get('booking_id') as string;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { error } = await supabase.from('bookings').update({
    status: 'cancelled',
    cancellation_reason: 'Declined by Partner due to capacity/availability',
    cancelled_by: 'partner'
  }).eq('id', bookingId).eq('status', 'pending');

  if (error) return { error: error.message };
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
  const { data: booking } = await supabase.from('bookings').select('checkin_otp, status').eq('id', bookingId).single();
  
  if (!booking) return { error: 'Booking not found.' };
  if (booking.status !== 'pending' && booking.status !== 'confirmed') return { error: 'Booking is not pending.' };
  if (booking.checkin_otp !== otpInput) return { error: 'Invalid Check-in OTP.' };

  // Update status and timestamp
  const { error } = await supabase.from('bookings').update({
    status: 'checked_in',
    actual_checkin: new Date().toISOString()
  }).eq('id', bookingId);

  if (error) return { error: error.message };
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

  const { data: booking } = await supabase.from('bookings').select('checkout_otp, status').eq('id', bookingId).single();
  
  if (!booking) return { error: 'Booking not found.' };
  if (booking.status !== 'checked_in') return { error: 'Bags are not checked in.' };
  if (booking.checkout_otp !== otpInput) return { error: 'Invalid Check-out OTP.' };

  const { error } = await supabase.from('bookings').update({
    status: 'checked_out',
    actual_checkout: new Date().toISOString()
  }).eq('id', bookingId);

  if (error) return { error: error.message };
  revalidatePath(`/dashboard/bookings/${bookingId}`);
  revalidatePath('/dashboard/bookings');
  return { success: true };
}
