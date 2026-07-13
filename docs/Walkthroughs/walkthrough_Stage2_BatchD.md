# Stage 2 — Batch D: Partner Acceptance & Reviews

The final batch of the core StashInn platform flow is fully implemented! The architecture has been successfully pivoted to ensure Partners explicitly accept bookings before Customers can check in, optimizing the "Pay at Location" physical cash model.

---

## 1. The Partner Acceptance Flow
- **Customer Checkout:** When a Customer completes a booking, it now defaults to a strict `pending` state. **No OTP is generated.** The Customer Dashboard displays a yellow "Awaiting Confirmation" badge.
- **Partner Dashboard:** The Partner sees the incoming request. When they click **Manage**, the OTP Terminal has been dynamically swapped out for an **"Incoming Booking Request"** panel.
- **Acceptance:** When the Partner clicks **Accept**, the status flips to `confirmed`. The Check-in and Check-out OTPs are generated on the server, and the Customer can finally view their Drop-off OTP.

## 2. Cash at Location (Check-in)
Because the booking is only `confirmed`, no money has changed hands digitally. The Customer is instructed to physically arrive at the location, hand the cash to the Partner, and give them the Drop-off OTP.
- The Partner enters this into the terminal to move the status to `checked_in`.

## 3. Post-Checkout Review System (CB-07)
When the Partner logs the Pick-up OTP, the transaction is marked as `checked_out`.
- **Customer Dashboard:** The OTP badge morphs into a **"Leave a Review"** button.
- **Review Page:** The Customer is taken to a dedicated dynamic route (`/dashboard/review/[id]`) featuring an interactive 5-Star rating component and a comment field.
- **Database Trigger:** Submitting a review securely writes the record to `public.reviews`. The server then actively recalculates the total average rating for that specific Partner and updates the `partners` table so future search results reflect the new score!

---

### Verification Checklist
I highly encourage you to test this end-to-end loop:
1. Log into the Customer app and create a new Booking.
2. Observe the "Awaiting Confirmation" state on the Customer Dashboard.
3. Switch to the Partner Dashboard, click "Manage", and click **Accept**.
4. Refresh the Customer Dashboard to reveal the OTP.
5. Use the Partner Terminal to Check-in, then Check-out.
6. Return to the Customer Dashboard and click **Leave a Review**. Select a star rating and hit Submit!
