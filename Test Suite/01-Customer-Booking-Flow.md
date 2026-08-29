# Customer Booking Flow Test Cases

## 1. Search & Discovery
### TC01: Luggage Search
- **Pre-condition:** Locations exist with `location_type = 'luggage'` and `is_active = true`.
- **Action:** User enters an address/city on the homepage, selects "Bags/Luggage", and clicks Search.
- **Expected Result:** RPC returns nearby luggage locations. Map updates with markers. Cards display daily rate, distance, and max bags.

### TC02: Garage Search
- **Pre-condition:** Locations exist with `location_type = 'garage'`, `is_active = true`, and vehicle pricing defined.
- **Action:** User toggles segmented control to "Garage/Vehicles" and selects vehicle type (Bike/Sedan/SUV).
- **Expected Result:** RPC returns nearby garage locations. UI displays security amenities (CCTV, Guards) and correct vehicle-specific hourly/daily rates.

### TC03: Filter by Amenities
- **Action:** In Garage mode, user clicks the "CCTV" and "Security Guard" filters.
- **Expected Result:** Results re-fetch and strictly display only locations satisfying `has_cctv = true` and `has_security_guard = true`.

## 2. Checkout & Booking Creation
### TC04: Luggage Checkout
- **Action:** User selects a luggage location, chooses check-in/out times, selects 3 bags, and completes checkout.
- **Expected Result:** Booking created with status `pending`. User receives a 4-digit Drop-off OTP via SMS/WhatsApp. Total price matches `bags * duration * rate`.

### TC05: Garage Checkout (Condition Photos)
- **Action:** User selects a garage location, enters Vehicle Make/Model/License, uploads 2 condition photos, and completes checkout.
- **Expected Result:** Booking created. Photos securely uploaded to `vehicle-condition-photos` bucket under `[customer_id]/[booking_id]/...`. Drop-off OTP generated.

## 3. Post-Booking & Dashboard
### TC06: View Active Bookings
- **Action:** User navigates to `/dashboard`.
- **Expected Result:** Displays active bookings with dynamic QR codes encoding the booking ID. Countdown to check-in/check-out is visible.

### TC07: Cancellation (Before Check-in)
- **Action:** User clicks "Cancel" on a pending booking.
- **Expected Result:** Booking status changes to `cancelled`. Partner is notified. No penalties if cancelled X hours prior (based on policy).

## 4. Post-Checkout & Reviews
### TC08: Leave a Review
- **Pre-condition:** Booking is `completed`.
- **Action:** User clicks "Leave Review", assigns 4 stars, and adds text.
- **Expected Result:** Review saved in `reviews` table. Location's aggregate rating updates. Review text visible on the location's public page.
