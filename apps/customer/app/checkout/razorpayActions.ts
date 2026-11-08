'use server';

import Razorpay from 'razorpay';
import { createServiceClient } from '@stashinn/lib/supabase/service';
import { checkAvailability, parseIndiaTime, type BookingMode } from '@stashinn/lib/services/bookingAvailability';

/** Creates a Razorpay order for a booking, priced on the server (never from the browser). */
export async function createRazorpayOrder(booking: {
  locationId: string;
  mode: BookingMode;
  vehicleType?: string | null;
  bags?: number;
  checkIn: string;
  checkOut: string;
}) {
  try {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      throw new Error('Razorpay keys not configured on server.');
    }

    const check = await checkAvailability(createServiceClient(), {
      locationId: booking.locationId,
      mode: booking.mode,
      vehicleType: booking.vehicleType,
      bags: booking.bags,
      start: parseIndiaTime(booking.checkIn),
      end: parseIndiaTime(booking.checkOut),
    });
    if (!check.ok) return { error: check.reason };

    const instance = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    // Amount is in rupees, Razorpay expects paise (multiply by 100)
    const options = {
      amount: Math.round(check.quote.total * 100),
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      notes: { location_id: booking.locationId },
    };

    const order = await instance.orders.create(options);
    return { orderId: order.id, amount: options.amount };
  } catch (error: any) {
    console.error('Razorpay Order Error:', error);
    return { error: 'Failed to create payment order.' };
  }
}
