'use client';

import { useState, useEffect } from 'react';
import { createRazorpayOrder } from './razorpayActions';
import { createBooking, ensureCustomer } from './actions';

// Feature flag: set to true or configure NEXT_PUBLIC_ENABLE_RAZORPAY=true once Razorpay account is activated
const SHOW_RAZORPAY = process.env.NEXT_PUBLIC_ENABLE_RAZORPAY === 'true';

export default function CheckoutClientForm({ location, resolvedParams, quotedTotal, vehicleType, razorpayKey, userProfile }: { location: any, resolvedParams: any, quotedTotal: number, vehicleType: string | null, razorpayKey: string, userProfile?: any }) {
  const [paymentMethod, setPaymentMethod] = useState('pay_at_location');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  const [fullName, setFullName] = useState(userProfile?.full_name || '');
  const [email, setEmail] = useState(userProfile?.email || '');
  const [mobile, setMobile] = useState(userProfile?.phone || '');

  const totalAmount = quotedTotal; // priced on the server (checkout page)

  // Load Razorpay SDK (only if online payment is enabled)
  useEffect(() => {
    if (!SHOW_RAZORPAY) return;
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    return () => { 
      if (document.body.contains(script)) {
        document.body.removeChild(script); 
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Capture form data synchronously before any awaits
    const formData = new FormData(e.currentTarget);
    
    setIsProcessing(true);
    setError('');

    let finalCustomerId = userProfile?.id;
    // Ensure customer account is created BEFORE razorpay or booking
    if (!userProfile) {
      const accRes = await ensureCustomer(fullName, email, mobile);
      if (accRes.error) {
        setError(accRes.error);
        setIsProcessing(false);
        return;
      }
      finalCustomerId = accRes.customerId;
    }

    formData.append('customer_id', finalCustomerId || '');
    formData.append('full_name', fullName);
    formData.append('email', email);
    formData.append('mobile', mobile);

    formData.append('location_id', location?.id || '');
    formData.append('partner_id', location?.partner_id || location?.partners?.id || '');
    formData.append('check_in', resolvedParams?.in || '');
    formData.append('check_out', resolvedParams?.out || '');
    formData.append('mode', resolvedParams.mode || 'luggage');


    if (resolvedParams.mode === 'garage') {
      formData.append('vehicleType', vehicleType || 'car');
    } else {
      formData.append('bags', resolvedParams.bags || '1');
    }

    formData.append('payment_method', paymentMethod);

    if (paymentMethod === 'pay_at_location') {
      // Proceed directly
      await createBooking(formData);
      return;
    }

    if (paymentMethod === 'razorpay') {
      // 1. Create Server Order
      const res = await createRazorpayOrder({
        locationId: location?.id,
        mode: resolvedParams.mode === 'garage' ? 'garage' : 'luggage',
        vehicleType,
        bags: parseInt(resolvedParams.bags || '1') || 1,
        checkIn: resolvedParams?.in || '',
        checkOut: resolvedParams?.out || '',
      });
      if (res.error || !res.orderId) {
        setError(res.error || 'Failed to initialize payment gateway.');
        setIsProcessing(false);
        return;
      }

      // 2. Open Modal
      const options = {
        key: razorpayKey, 
        amount: res.amount,
        currency: "INR",
        name: "StashInn",
        description: `Storage at ${location.name}`,
        order_id: res.orderId,
        handler: async function (response: any) {
          // 3. Success Callback: Append Razorpay IDs and submit booking
          formData.append('razorpay_order_id', response.razorpay_order_id);
          formData.append('razorpay_payment_id', response.razorpay_payment_id);
          formData.append('razorpay_signature', response.razorpay_signature);
          
          await createBooking(formData);
        },
        prefill: {
          name: fullName || "Customer",
          email: email || "customer@stashinn.com",
          contact: mobile || ""
        },
        theme: {
          color: "#E8722A" // brand-orange
        },
        modal: {
          ondismiss: function() {
            setError('Payment was cancelled. You have not been charged.');
            setIsProcessing(false);
          }
        }
      };

      const rzp1 = new (window as any).Razorpay(options);
      rzp1.on('payment.failed', function (response: any) {
        setError(`Payment Failed: ${response.error.description}`);
        setIsProcessing(false);
      });
      rzp1.open();
    }
  };

  const isGarage = resolvedParams.mode === 'garage';
  const card = 'rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 sm:p-6';
  const label = 'block text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5';
  const input = (locked = false) =>
    `w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition ${locked
      ? 'bg-gray-50 dark:bg-gray-950/60 border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed'
      : 'bg-white dark:bg-gray-950 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20'}`;
  const methods = [
    { value: 'pay_at_location', title: 'Pay at drop-off', text: 'Pay by UPI or cash at the counter when you drop off.' },
    ...(SHOW_RAZORPAY ? [{ value: 'razorpay', title: 'Pay online now', text: 'UPI, cards or net banking through Razorpay.' }] : []),
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div role="alert" className="rounded-2xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm font-semibold text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <section className={card}>
        <StepTitle n={1} title="Your details" sub={userProfile ? 'From your StashInn account' : 'We’ll send your booking here and create your account'} />
        <div className="mt-4 space-y-4">
          <div>
            <label htmlFor="co-name" className={label}>Full name</label>
            <input id="co-name" type="text" value={fullName} onChange={e => setFullName(e.target.value)} readOnly={!!userProfile} required autoComplete="name" className={input(!!userProfile)} placeholder="e.g. Rahul Sharma" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="co-email" className={label}>Email</label>
              <input id="co-email" type="email" value={email} onChange={e => setEmail(e.target.value)} readOnly={!!userProfile} required autoComplete="email" className={input(!!userProfile)} placeholder="e.g. rahul@example.com" />
            </div>
            <div>
              <label htmlFor="co-mobile" className={label}>Mobile</label>
              <input id="co-mobile" type="tel" inputMode="numeric" value={mobile} onChange={e => setMobile(e.target.value)} readOnly={!!userProfile} required autoComplete="tel" className={input(!!userProfile)} placeholder="e.g. 9876543210" />
            </div>
          </div>
        </div>
      </section>

      {isGarage && (
        <section className={card}>
          <StepTitle n={2} title="Your vehicle" sub="So the partner can check your vehicle in and out" />
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="co-make" className={label}>Make</label>
                <input id="co-make" type="text" name="vehicle_make" required className={input()} placeholder="e.g. Honda" />
              </div>
              <div>
                <label htmlFor="co-model" className={label}>Model</label>
                <input id="co-model" type="text" name="model" required className={input()} placeholder="e.g. City" />
              </div>
              <div>
                <label htmlFor="co-plate" className={label}>Number plate</label>
                <input id="co-plate" type="text" name="plate" required className={`${input()} uppercase`} placeholder="e.g. GA 07 AB 1234" />
              </div>
            </div>
            <div>
              <label htmlFor="co-photos" className={label}>Condition photos (up to 4)</label>
              <input
                id="co-photos"
                type="file"
                name="check_in_photos"
                accept="image/*"
                multiple
                required
                className="w-full rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-950/60 p-3 text-sm text-gray-500 dark:text-gray-400 file:mr-3 file:rounded-lg file:border-0 file:bg-orange-100 dark:file:bg-orange-950/60 file:px-3 file:py-2 file:text-sm file:font-bold file:text-orange-700 dark:file:text-orange-300 hover:file:bg-orange-200"
              />
              <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">Photograph all four sides before you drop it off.</p>
            </div>
          </div>
        </section>
      )}

      <section className={card}>
        <StepTitle n={isGarage ? 3 : 2} title="How you'll pay" />
        <div role="radiogroup" className="mt-4 space-y-3">
          {methods.map(m => (
            <label
              key={m.value}
              className={`flex items-start gap-3 rounded-2xl border p-4 cursor-pointer transition-colors ${paymentMethod === m.value
                ? 'border-orange-400 dark:border-orange-500/70 bg-orange-50 dark:bg-orange-950/30 ring-1 ring-orange-400/40'
                : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'}`}
            >
              <input
                type="radio"
                name="payment_method_ui"
                value={m.value}
                checked={paymentMethod === m.value}
                onChange={e => setPaymentMethod(e.target.value)}
                className="mt-0.5 w-5 h-5 accent-orange-600"
              />
              <span>
                <span className="block font-bold text-gray-900 dark:text-white">{m.title}</span>
                <span className="block text-sm text-gray-500 dark:text-gray-400">{m.text}</span>
              </span>
            </label>
          ))}
        </div>
      </section>

      <div className={card}>
        <div className="flex items-center justify-between gap-4">
          <span className="font-bold text-gray-900 dark:text-white">Total</span>
          <span className="text-2xl font-black text-gray-900 dark:text-white tabular-nums">₹{totalAmount.toFixed(2)}</span>
        </div>
        <button
          type="submit"
          disabled={isProcessing}
          className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 hover:bg-orange-500 py-3.5 text-base font-bold text-white transition-colors disabled:opacity-60 disabled:cursor-wait"
        >
          {isProcessing && (
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
          )}
          {isProcessing ? 'Booking…' : paymentMethod === 'razorpay' ? `Pay ₹${totalAmount.toFixed(2)} and book` : 'Request booking'}
        </button>
        <p className="mt-3 text-center text-xs text-gray-500 dark:text-gray-400">
          By booking, you agree to StashInn&apos;s{' '}
          <a href="/terms" target="_blank" rel="noopener noreferrer" className="font-semibold text-orange-700 dark:text-orange-400 underline underline-offset-2 hover:text-orange-600">Terms &amp; Conditions</a>{' '}
          and{' '}
          <a href="/privacy" target="_blank" rel="noopener noreferrer" className="font-semibold text-orange-700 dark:text-orange-400 underline underline-offset-2 hover:text-orange-600">Privacy Policy</a>. The exact address and the partner&apos;s contact details appear under My bookings once you book.
        </p>
      </div>
    </form>
  );
}

function StepTitle({ n, title, sub }: { n: number; title: string; sub?: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="w-7 h-7 shrink-0 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-black flex items-center justify-center">{n}</span>
      <div>
        <h2 className="text-lg font-extrabold leading-7 text-gray-900 dark:text-white">{title}</h2>
        {sub && <p className="text-sm text-gray-500 dark:text-gray-400">{sub}</p>}
      </div>
    </div>
  );
}
