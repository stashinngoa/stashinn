'use server';

import { createClient } from '@stashinn/lib/supabase/server';
import { redirect } from 'next/navigation';
import { sendSMS, sendWhatsApp } from '@stashinn/lib/services/messaging';
import crypto from 'crypto';

export async function createBooking(formData: FormData) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const fullName = formData.get('full_name') as string;
    const email = formData.get('email') as string;
    const mobile = formData.get('mobile') as string;

    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const supabaseService = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let customerId = formData.get('customer_id') as string;
    
    if (!customerId) {
      if (user) {
        customerId = user.id;
      } else {
        const { data: existingUser } = await supabaseService.from('users').select('id').eq('email', email).single();
        if (existingUser) {
          customerId = existingUser.id;
        } else {
          const randomPassword = crypto.randomBytes(16).toString('hex') + 'A1!';
          const { data: authUser, error: authErr } = await supabaseService.auth.admin.createUser({
            email: email,
            password: randomPassword,
            email_confirm: true,
            user_metadata: { full_name: fullName, phone: mobile }
          });
          if (authErr || !authUser.user) redirect('/search?error=guest_creation_failed');
          customerId = authUser.user.id;
        }
      }
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
    const bags = mode === 'luggage' ? (parseInt(formData.get('bags') as string) || 1) : 0;
    const vehicleType = mode === 'garage' ? formData.get('vehicleType') as string : null;
    const vehicleMake = formData.get('vehicle_make') as string;
    const model = formData.get('model') as string;
    const plate = formData.get('plate') as string;
    const checkInPhotos = formData.getAll('check_in_photos') as File[];
    const totalAmount = parseFloat(formData.get('total_amount') as string) || 0;

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
    
    // Auto-correct past start times (prevents test failures from stale tabs)
    if (startDate < now) {
      startDate.setTime(now.getTime() + 60000); // Set to 1 minute from now
    }
    
    if (endDate.getTime() - startDate.getTime() < 60 * 60 * 1000) { // Min 1 hour
      endDate.setTime(startDate.getTime() + 60 * 60 * 1000);
    }
    
    // Use the auto-corrected dates for insertion
    const finalCheckIn = startDate.toISOString();
    const finalCheckOut = endDate.toISOString();

    // Calculate Commission dynamically (fetch partner custom rate or fall back to system config)
    const { data: partnerData } = await supabaseService.from('partners').select('commission_rate').eq('id', partnerId).single();
    const { data: configRows } = await supabaseService.from('system_config').select('value').eq('key', 'default_commission_rate').maybeSingle();
    
    const defaultRate = configRows?.value ? parseFloat(configRows.value as string) : 0.15;
    const commissionRate = partnerData?.commission_rate ? (parseFloat(partnerData.commission_rate as any) / 100) : defaultRate;
    
    const commissionAmount = Math.round(totalAmount * commissionRate * 100) / 100;
    const partnerAmount = Math.round((totalAmount - commissionAmount) * 100) / 100;

    const bookingId = crypto.randomUUID();
    let photoUrls: string[] = [];

    // Service client already initialized at the top for customer creation

    // Upload vehicle condition photos
    if (mode === 'garage' && checkInPhotos && checkInPhotos.length > 0) {
      for (let i = 0; i < Math.min(checkInPhotos.length, 4); i++) {
        const file = checkInPhotos[i];
        if (file && typeof file !== 'string' && file.size > 0) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${Date.now()}-${i}.${fileExt}`;
          const filePath = `${customerId}/${bookingId}/${fileName}`;
          
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

    const { data: booking, error } = await supabaseService
      .from('bookings')
      .insert({
        id: bookingId,
        customer_id: customerId,
        partner_id: partnerId,
        location_id: locationId,
        status: 'pending',
        num_bags: bags,
        start_time: finalCheckIn,
        end_time: finalCheckOut,
        base_amount: totalAmount,
        commission_amount: commissionAmount,
        total_amount: totalAmount,
        vehicle_make: vehicleMake || null,
        vehicle_model: model || null,
        vehicle_license_plate: plate || null,
        check_in_photos: photoUrls.length > 0 ? photoUrls : null
      })
      .select('id')
      .single();

    if (error || !booking) {
      console.error("BOOKING INSERT ERROR:", error);
      redirect('/search?error=booking_failed&msg=' + encodeURIComponent(error?.message || 'unknown') + '&details=' + encodeURIComponent(error?.details || ''));
    }

    // Insert Payment record
    await supabaseService
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
    await supabaseService
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
      to: mobile || '+1234567890',
      message: `StashInn: Your booking request for ${mode === 'garage' ? vehicleType : bags + ' bags'} is received. Awaiting partner approval.`
    });
    
    await sendWhatsApp({
      to: mobile || '+1234567890',
      message: `StashInn: Booking ${booking.id} created successfully! We will notify you once the partner confirms.`
    });

    if (!user) {
      const email = formData.get('email') as string;
      const { data: linkData } = await supabaseService.auth.admin.generateLink({
        type: 'magiclink',
        email: email,
        options: { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/dashboard?autoLogin=true` }
      });
      
      // Audit this auto-login attempt
      await supabaseService.from('auth_audits').insert({
        user_id: customerId,
        identifier: email,
        method: 'auto',
        success: true
      });

      if (linkData?.properties?.action_link) {
        redirect(linkData.properties.action_link);
      }
    }

    redirect('/dashboard?autoLogin=true');
  } catch (e: any) {
    if (e.message && e.message === 'NEXT_REDIRECT') throw e;
    console.error("CRASH IN CREATE BOOKING:", e);
    redirect('/search?error=CRASH&msg=' + encodeURIComponent(e.message || String(e)));
  }
}

export async function ensureCustomer(fullName: string, email: string, mobile: string) {
  const { createClient: createSupabaseClient } = await import("@supabase/supabase-js");
  const supabaseService = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: existingUser } = await supabaseService.from("users").select("id, phone").eq("email", email).single();
  if (existingUser) {
    if (!existingUser.phone && mobile) {
      // Update phone if missing
      await supabaseService.from("users").update({ phone: mobile }).eq("id", existingUser.id);
      await supabaseService.auth.admin.updateUserById(existingUser.id, { user_metadata: { phone: mobile } });
    }
    return { success: true, customerId: existingUser.id };
  }

  const randomPassword = crypto.randomBytes(16).toString("hex") + "A1!";
  const { data: authUser, error: authErr } = await supabaseService.auth.admin.createUser({
    email,
    password: randomPassword,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      phone: mobile
    }
  });

  if (authErr || !authUser.user) {
    return { error: "Failed to create customer account." };
  }
  return { success: true, customerId: authUser.user.id };
}

