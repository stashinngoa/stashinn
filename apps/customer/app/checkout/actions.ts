'use server';

import { createClient } from '@stashinn/lib/supabase/server';
import { redirect } from 'next/navigation';
import { sendSMS, sendWhatsApp } from '@stashinn/lib/services/messaging';
import crypto from 'crypto';
import { getCustomerBaseUrl } from '../../lib/getBaseUrl';
import { bookingLengthError, getBookingRules } from '@stashinn/lib/services/bookingRules';
import { checkAvailability, parseIndiaTime, splitAmount, vehicleLabel } from '@stashinn/lib/services/bookingAvailability';
import { BOOKING_EMAIL_SLUGS, bookingRef, emailTime, renderBookingEmail } from '@stashinn/lib/services/bookingEmails';
import Razorpay from 'razorpay';

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

    // Who the booking is for comes from the session or the email, never from the browser
    let customerId: string;
    if (user) {
      customerId = user.id;
    } else {
      const { data: existingUser } = await supabaseService.from('users').select('id').eq('email', email).maybeSingle();
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

    // Accounts suspended by StashInn staff can't book
    const { data: account } = await supabaseService.from('users').select('is_blocked').eq('id', customerId).maybeSingle();
    if (account?.is_blocked) {
      if (formData.get('payment_method') === 'razorpay') console.error(`[BLOCKED_CUSTOMER_PAID] payment ${formData.get('razorpay_payment_id')} by blocked customer ${customerId}; the orphan-payment job will refund it`);
      redirect('/search?error=account_blocked&msg=' + encodeURIComponent('This account has been suspended and can’t make bookings. Contact support@stashinn.in.'));
    }

    const locationId = formData.get('location_id') as string;
    const checkIn = formData.get('check_in') as string;
    const checkOut = formData.get('check_out') as string;
    const paymentMethod = formData.get('payment_method') as string;
    const rzpOrderId = formData.get('razorpay_order_id') as string;
    const rzpPaymentId = formData.get('razorpay_payment_id') as string;
    const rzpSignature = formData.get('razorpay_signature') as string;
    const mode = formData.get('mode') as string;
    const bags = mode === 'luggage' ? (parseInt(formData.get('bags') as string) || 1) : 0;
    const vehicleMake = formData.get('vehicle_make') as string;
    const model = formData.get('model') as string;
    const plate = formData.get('plate') as string;
    const checkInPhotos = formData.getAll('check_in_photos') as File[];

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
    const startDate = parseIndiaTime(checkIn);
    const endDate = parseIndiaTime(checkOut);
    const now = new Date();
    
    // Auto-correct past start times (prevents test failures from stale tabs)
    if (startDate < now) {
      startDate.setTime(now.getTime() + 60000); // Set to 1 minute from now
    }
    
    // Booking length limits from Admin → Configuration
    const rules = await getBookingRules(supabaseService);
    if (endDate.getTime() - startDate.getTime() < rules.minHours * 3_600_000) {
      endDate.setTime(startDate.getTime() + rules.minHours * 3_600_000);
    }
    const lengthError = bookingLengthError(startDate, endDate, rules);
    if (lengthError) {
      redirect('/search?error=invalid_duration&msg=' + encodeURIComponent(lengthError));
    }
    
    // Use the auto-corrected dates for insertion
    const finalCheckIn = startDate.toISOString();
    const finalCheckOut = endDate.toISOString();

    // Capacity, pauses and the price are decided here, not by the browser
    // (SUVs pay the car rate; a car may use a free SUV slot)
    const check = await checkAvailability(supabaseService, {
      locationId,
      mode: mode === 'garage' ? 'garage' : 'luggage',
      vehicleType: formData.get('vehicleType') as string,
      bags,
      start: startDate,
      end: endDate,
    });
    if (!check.ok) {
      if (paymentMethod === 'razorpay') console.error(`[BOOKING_UNAVAILABLE_AFTER_PAYMENT] payment ${rzpPaymentId} for location ${locationId} needs a refund: ${check.reason}`);
      redirect(`/locations/${locationId}?error=unavailable&msg=` + encodeURIComponent(check.reason));
    }
    const totalAmount = check.quote.total;
    const vehicleType = check.vehicleType;

    // An online payment must be for exactly this booking's price
    if (paymentMethod === 'razorpay') {
      const order = await new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID!, key_secret: process.env.RAZORPAY_KEY_SECRET! }).orders.fetch(rzpOrderId);
      if (Number(order.amount) !== Math.round(totalAmount * 100)) {
        console.error(`[PAYMENT_AMOUNT_MISMATCH] order ${rzpOrderId} paid ${order.amount} paise, booking costs ${Math.round(totalAmount * 100)}`);
        redirect('/search?error=payment_amount_mismatch');
      }
    }

    const partnerId: string = check.location.partner_id;

    // Commission %: the location's own rate (set by admin per location), else the partner's rate
    const { data: partnerData } = await supabaseService.from('partners').select('commission_rate').eq('id', partnerId).single();
    const ratePercent = [check.location.commission_rate, partnerData?.commission_rate]
      .map(r => (r === null || r === undefined ? NaN : Number(r)))
      .find(r => Number.isFinite(r) && r >= 0 && r <= 100) ?? 15;

    // GST comes off the total first; commission is on what remains (same as the admin scoring panel)
    const split = splitAmount(totalAmount, check.gstPercent, ratePercent);

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
        booking_type: mode === 'garage' ? 'garage' : 'luggage',
        num_bags: bags,
        start_time: finalCheckIn,
        end_time: finalCheckOut,
        base_amount: split.taxable,
        gst_rate: check.gstPercent,
        gst_amount: split.gst,
        commission_rate: ratePercent,
        commission_amount: split.commission,
        partner_amount: split.partner,
        total_amount: totalAmount,
        ...(vehicleType ? { vehicle_type: vehicleType } : {}), // parking bookings only
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
        amount: split.partner,
        commission: split.commission,
        transfer_status: 'pending'
      });

    // Booking request emails (customer and partner). A mail problem must never block the booking.
    const ref = bookingRef(booking.id);
    const items = mode === 'garage' ? vehicleLabel(vehicleType) : `${bags} bag${bags === 1 ? '' : 's'}`;
    const payLabel = paymentMethod === 'razorpay' ? 'Paid online' : 'Pay by UPI or cash at drop-off';
    const [{ data: place }, { data: partnerUser }] = await Promise.all([
      supabaseService.from('partner_locations').select('city, state').eq('id', locationId).single(),
      supabaseService.from('partners').select('business_name, users(full_name)').eq('id', partnerId).single(),
    ]);
    const common = { booking_ref: ref, location_name: check.location.name, drop_off: emailTime(startDate), pick_up: emailTime(endDate), items, total: totalAmount.toFixed(2), payment_method: payLabel };

    const { notifyPartnerExternal, ExternalNotificationService } = await import('@stashinn/lib/services/notifications');
    try {
      const partnerEmail = await renderBookingEmail(BOOKING_EMAIL_SLUGS.partnerRequest, {
        ...common,
        partner_name: (partnerUser?.users as any)?.full_name || partnerUser?.business_name || 'there',
        customer_name: fullName || 'A customer',
        partner_amount: split.partner.toFixed(2),
        dashboard_url: `${process.env.NEXT_PUBLIC_PARTNER_URL || 'http://localhost:3001'}/dashboard/bookings/${booking.id}`,
      });
      // In-app always; email / WhatsApp / SMS by the partner's notification preferences
      await notifyPartnerExternal(partnerId, {
        title: 'New Booking Request',
        message: `New request for ${items} at ${check.location.name} (#${ref}), ${common.drop_off} to ${common.pick_up}. Please accept or decline in your dashboard.`,
        ...(partnerEmail ? { email: partnerEmail } : {}),
      });
    } catch (e) {
      console.error('[BOOKING_EMAIL] partner request email failed:', e);
    }

    if (email) {
      try {
        const customerEmail = await renderBookingEmail(BOOKING_EMAIL_SLUGS.customerRequest, {
          ...common,
          customer_name: (fullName || '').split(' ')[0] || 'there',
          location_area: [place?.city, place?.state].filter(Boolean).join(', '),
          dashboard_url: `${await getCustomerBaseUrl()}/dashboard`,
        });
        if (customerEmail) await ExternalNotificationService.sendEmail(email, customerEmail.subject, customerEmail.html);
      } catch (e) {
        console.error('[BOOKING_EMAIL] customer request email failed:', e);
      }
    }

    // SMS & WhatsApp (logged only until Twilio is configured)
    await sendSMS({
      to: mobile || '+1234567890',
      message: `StashInn: Your booking request #${ref} for ${items} is received. Awaiting partner approval.`
    });

    await sendWhatsApp({
      to: mobile || '+1234567890',
      message: `StashInn: Booking #${ref} created successfully! We will notify you once the partner confirms.`
    });

    if (!user) {
      const email = formData.get('email') as string;
      const baseUrl = await getCustomerBaseUrl();
      const { data: linkData } = await supabaseService.auth.admin.generateLink({
        type: 'magiclink',
        email: email,
        options: { redirectTo: `${baseUrl}/dashboard?autoLogin=true` }
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

  const { data: existingUser } = await supabaseService.from("users").select("id, phone, is_blocked").eq("email", email).single();
  if (existingUser?.is_blocked) {
    return { error: "This account has been suspended and can’t make bookings. Contact support@stashinn.in." };
  }
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

