# Stage 3 — Batch A: Razorpay Integration & Commission Split

Batch A is officially live! We have successfully integrated the Razorpay payment gateway and established the core financial automation logic.

---

## 1. Razorpay Sandbox Integration
I have installed the official `razorpay` Node SDK.
- **Client Side Check-out:** The Customer Checkout page now natively injects `https://checkout.razorpay.com/v1/checkout.js`. 
- When the Customer selects **Pay Online Now** and clicks Request Booking, a secure Next.js Server Action calls the Razorpay API to generate a unique `order_id`. 
- The Customer is then immediately presented with the sleek, purple-themed Razorpay Checkout Modal where they can simulate card payments!

## 2. Commission Split Ledger
Whether the Customer pays via Razorpay or Cash at Location, the financial ledger is now strictly enforced on the server.
- Upon booking confirmation, the server instantly calculates the **15% Platform Commission**.
- A pending entry is written directly to the `public.partner_transactions` ledger. This ensures the admin knows exactly how much is owed to the Partner (or how much the Partner owes the platform for cash payments!).
- The Razorpay `payment_id`, `order_id`, and `signature` are permanently persisted to the `public.payments` table for future webhook auditing.

---

### Verification Checklist
Before we move on to Batch B, please test the flow locally:

1. **Environment Variables:** First, ensure you have added your API keys to the root `apps/customer/.env.local` file exactly like this:
   ```env
   RAZORPAY_KEY_ID=rzp_test_your_key_here
   RAZORPAY_KEY_SECRET=your_secret_here
   ```
2. **Restart Server:** Restart your Next.js Customer server so it picks up the environment variables.
3. **Test Payment:** 
   - Walk through the Customer booking flow.
   - Select **Pay Online Now**.
   - Watch the Razorpay Test Modal appear and process a test transaction!
