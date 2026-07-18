# Partner Operations Test Cases

## 1. Onboarding & Profile Management
### TC01: Partner Registration
- **Action:** User signs up as a partner, submits business details (GST, PAN, business name).
- **Expected Result:** Partner record created with `status = 'pending'`. Cannot accept bookings yet.

### TC02: Point of Contact (POC) Addition
- **Pre-condition:** Partner is approved.
- **Action:** Partner adds a new POC from the Dashboard.
- **Expected Result:** POC is saved with `is_verified = false`. POC is marked as "Pending Verification" in the UI.

### TC03: Restricting POC Edits
- **Pre-condition:** Partner is approved.
- **Action:** Partner clicks "Edit" or "Delete" on an existing POC.
- **Expected Result:** A Support Ticket modal opens instead of allowing direct edits. Submitting the modal creates a `support_tickets` entry.

## 2. Location Management
### TC04: Add Luggage Location
- **Action:** Partner fills out location form with Luggage pricing and operating hours. Assigns a Verified POC.
- **Expected Result:** Location created with `is_active = true`. Appears in customer search.

### TC05: Add Garage Location with Unverified POC
- **Action:** Partner creates a Garage location, specifies vehicle capacity/rates, and adds a *new* (unverified) POC inline.
- **Expected Result:** Location created but forced to `is_active = false`. Warning displayed to the partner.

## 3. Terminal & Check-in / Check-out
### TC06: Luggage Check-in via OTP
- **Pre-condition:** Customer has a pending luggage booking.
- **Action:** Partner goes to `/dashboard/bookings/[id]`, enters the 4-digit Drop-off OTP.
- **Expected Result:** Booking status changes to `checked_in`. `actual_checkin` timestamp recorded.

### TC07: Garage Check-in (Condition Photos)
- **Pre-condition:** Customer has a pending garage booking.
- **Action:** Partner enters OTP terminal. UI recognizes it's a garage booking and provides a link to the dedicated Check-in Flow. Partner uploads condition photos and enters OTP.
- **Expected Result:** Photos uploaded securely. Booking status changes to `checked_in`.

### TC08: Rate Limiting on OTP
- **Action:** Partner enters incorrect OTP 6 times in a row.
- **Expected Result:** 6th attempt blocked by `checkRateLimit` helper. Error: "Too many attempts, try again later."

### TC09: Check-out Flow
- **Pre-condition:** Booking is `checked_in`.
- **Action:** Partner enters the Check-out OTP.
- **Expected Result:** Booking status changes to `completed`. `actual_checkout` timestamp recorded. Customer receives a "Thank you" notification requesting a review.
