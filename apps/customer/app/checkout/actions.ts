'use server';

import { createClient } from '@stashinn/lib/supabase/server';
import { redirect } from 'next/navigation';
import { sendSMS, sendWhatsApp } from '@stashinn/lib/services/messaging';
import crypto from 'crypto';

export async function createBooking(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const locationId = formData.get('location_id') as string;
  const partnerId = formData.get('partner_id') as string;
  const checkIn = formData.get('check_in') as string;
  const checkOut = formData.get('check_out') as string;
  const paymentMethod = formData.get('payment_method') as string;
  const rzpOrderId = formData.get('razorpay_order_id') as string;
  const rzpPaymentId = formData.get('razorpay_payment_id') as string;
  const rzpSignature = formData.get('razorpay_signature') as string;
  const mode = formData.get('mode') as string;
  const bags = mode === 'luggage' ? parseInt(formData.get('bags') as string) : 0;
  const vehicleType = mode === 'garage' ? formData.get('vehicleType') as string : null;
  const vehicleMake = formData.get('vehicle_make') as string;
  const model = formData.get('model') as string;
  const plate = formData.get('plate') as string;
  const checkInPhotos = formData.getAll('check_in_photos') as File[];
  const totalAmount = parseFloat(formData.get('total_amount') as string);

  // Signature verification for Razorpay payments
  if (paymentMethod === 'razorpay') {
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      redirect('/search?error=payment_verification_failed');
    }
    const generatedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${rzpOrderId}|${rzpPaymentId}`)
      .digest('hex');

    if (generatedSignature !== rzpSignature) {
      redirect('/search?error=invalid_payment_signature');
    }
  }

  // 1. Validation: Booking Window
  const startDate = new Date(checkIn);
  const endDate = new Date(checkOut);
  const now = new Date();
  
  // Allow a 5-minute grace period for "past" bookings (since users take time to checkout)
  const gracePeriod = new Date(now.getTime() - 5 * 60000);
  if (startDate < gracePeriod) {
    redirect('/search?error=invalid_start_time');
  }
  
  if (endDate.getTime() - startDate.getTime() < 60 * 60 * 1000) { // Min 1 hour
    redirect('/search?error=min_duration_1h');
  }

  // Calculate Commission dynamically (fetch partner custom rate or fall back to system config)
  const { data: partnerData } = await supabase.from('partners').select('commission_rate').eq('id', partnerId).single();
  const { data: configRows } = await supabase.from('system_config').select('value').eq('key', 'default_commission_rate').single();
  
  const defaultRate = configRows?.value ? parseFloat(configRows.value as string) : 0.15;
  const commissionRate = partnerData?.commission_rate ? (parseFloat(partnerData.commission_rate as any) / 100) : defaultRate;
  
  const commissionAmount = Math.round(totalAmount * commissionRate * 100) / 100;
  const partnerAmount = Math.round((totalAmount - commissionAmount) * 100) / 100;

  const bookingId = crypto.randomUUID();
  let photoUrls: string[] = [];

  // Initialize service client for uploads
  const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
  const supabaseService = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Upload vehicle condition photos
  if (mode === 'garage' && checkInPhotos && checkInPhotos.length > 0) {
    for (let i = 0; i < Math.min(checkInPhotos.length, 4); i++) {
      const file = checkInPhotos[i];
      if (file && typeof file !== 'string' && file.size > 0) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${i}.${fileExt}`;
        const filePath = `${user.id}/${bookingId}/${fileName}`;
        
        const { error: uploadError } = await supabaseService.storage
          .from('vehicle-condition-photos')
          .upload(filePath, file);
          
        if (!uploadError) {
          const { data: { publicUrl } } = supabaseService.storage
            .from('vehicle-condition-photos')
            .getPublicUrl(filePath);
          photoUrls.push(publicUrl);
        } else {
          console.error("Upload error:", uploadError);
        }
      }
    }
  }

  const { data: booking, error } = await supabase
    .from('bookings')
    .insert({
      id: bookingId,
      customer_id: user.id,
      partner_id: partnerId,
      location_id: locationId,
      status: 'pending',
      num_bags: bags,
      start_time: checkIn,
      end_time: checkOut,
      base_amount: totalAmount,
      commission_amount: commissionAmount,
      total_amount: totalAmount,
      vehicle_make: vehicleMake || null,
      model: model || null,
      plate: plate || null,
      check_in_photos: photoUrls.length > 0 ? photoUrls : null
    })
    .select('id')
    .single();

  if (error || !booking) {
    redirect('/search?error=booking_failed');
  }

  // Insert Payment record
  await supabase
    .from('payments')
    .insert({
      booking_id: booking.id,
      amount: totalAmount,
      method: paymentMethod || 'pay_at_location',
      status: paymentMethod === 'razorpay' ? 'paid' : 'pending',
      razorpay_order_id: rzpOrderId || null,
      razorpay_payment_id: rzpPaymentId || null,
      razorpay_signature: rzpSignature || null
    });

  // Insert Partner Transaction Ledger Entry
  await supabase
    .from('partner_transactions')
    .insert({
      partner_id: partnerId,
      booking_id: booking.id,
      amount: partnerAmount,
      commission: commissionAmount,
      transfer_status: 'pending'
    });

  // Dispatch Partner Notifications based on Preferences
  const { notifyPartnerExternal } = await import('@stashinn/lib/services/notifications');
  await notifyPartnerExternal(partnerId, {
    title: 'New Booking Request',
    message: `You have a new request for ${mode === 'garage' ? vehicleType + ' parking' : bags + ' bags'} (Booking ${booking.id.split('-')[0]}). Please accept or decline in your dashboard.`
  });

  // Trigger Mock SMS & WhatsApp Confirmations
  await sendSMS({
    to: user.phone || '+1234567890',
    message: `StashInn: Your booking request for ${mode === 'garage' ? vehicleType : bags + ' bags'} is received. Awaiting partner approval.`
  });
  
  await sendWhatsApp({
    to: user.phone || '+1234567890',
    message: `StashInn: Booking ${booking.id} created successfully! We will notify you once the partner confirms.`
  });

  redirect('/dashboard');
}
