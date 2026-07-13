'use server';

import Razorpay from 'razorpay';

export async function createRazorpayOrder(amount: number) {
  try {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      throw new Error('Razorpay keys not configured on server.');
    }

    const instance = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    // Amount is in rupees, Razorpay expects paise (multiply by 100)
    const options = {
      amount: Math.round(amount * 100), 
      currency: "INR",
      receipt: `receipt_${Date.now()}`
    };

    const order = await instance.orders.create(options);
    return { orderId: order.id, amount: options.amount };
  } catch (error: any) {
    console.error('Razorpay Order Error:', error);
    return { error: 'Failed to create payment order.' };
  }
}
