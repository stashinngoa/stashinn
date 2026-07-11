# Stage 2 — Batch C: Booking Lifecycle & OTP Security Complete

The gap between the Customer App and the Partner App is now fully bridged. The physical security of luggage drop-off and pick-up is operational through a highly secure, OTP-driven state machine.

---

## 1. Customer "My Bookings" Dashboard (CB-05)
Customers can now track their reservations natively via the `localhost:3000/dashboard` route.
- Any newly created Booking will automatically generate two distinct 4-digit codes (`checkin_otp` and `checkout_otp`).
- Customers will see the Check-in OTP dynamically displayed if their booking is `pending`. Once they check-in, the UI seamlessly replaces it with the Check-out OTP.
- **Cancellation Flow:** Customers can proactively cancel `pending` bookings, which flips the status to `cancelled` and writes the audit trail to the database.

## 2. Partner Dashboard KPIs (PM-07)
The Partner's root Dashboard (`localhost:3001/dashboard`) now reads from the live `bookings` table to generate real-time KPIs:
- **Total Bookings:** Aggregates all reservations.
- **Active Bags:** Calculates the sum of `num_bags` specifically for bookings in the `checked_in` state (showing how much luggage is currently sitting in their facility).
- **Total Revenue:** Sums the `total_amount` for successfully `checked_out` bookings.

## 3. Partner Bookings Table (PM-04)
Partners can navigate to the new **Bookings** tab to see a comprehensive data table of every customer reservation.
- It natively joins the Customer's Full Name from the Supabase `auth.users` metadata and the specific Location Name where the bags are destined.
- Live status tags (Pending, Checked In, Checked Out, Cancelled) map to color-coded badges.

## 4. OTP Verification Terminal (CB-06)
When a Partner clicks "Manage" on a specific booking, they enter the **OTP Terminal**.
- **State Machine UI:** The terminal intelligently knows what phase the booking is in. If it's `pending`, it requests the Drop-off OTP. If it's `checked_in`, it morphs to request the Pick-up OTP.
- **Server-Side Security:** The Next.js Server Action (`verifyCheckInOTP` / `verifyCheckOutOTP`) compares the input code directly against the database record. If valid, it strictly stamps the `actual_checkin` (or `actual_checkout`) timestamp into the database and permanently locks in the state change!

---

### Verification Checklist
I highly recommend spinning up both servers side-by-side to witness the real-time handoff:
1. Ensure your Customer is logged into `localhost:3000` and create a mock booking.
2. Go to the Customer Dashboard (`localhost:3000/dashboard`) and locate your 4-digit **Check-in OTP**.
3. Open a separate browser for the Partner App (`localhost:3001/dashboard/bookings`).
4. Find the Booking, click **Manage**, and type in the 4-digit Customer OTP.
5. Watch the Partner UI morph to the Check-out state, and refresh your Customer app to see the UI securely transition to generating the Check-out OTP!
