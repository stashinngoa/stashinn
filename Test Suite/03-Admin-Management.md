# Admin Management Test Cases

## 1. Partner Verification
### TC01: Approve Partner
- **Pre-condition:** Partner exists in `pending` status. KYC documents uploaded.
- **Action:** Admin navigates to Partners -> reviews documents -> clicks "Approve".
- **Expected Result:** Partner `status` updates to `approved`. Their `is_active` locations become visible to customers. Notification dispatched to partner.

### TC02: POC Verification
- **Pre-condition:** Partner added a new POC (`is_verified = false`).
- **Action:** Admin navigates to Partner's POCs tab and clicks "Verify".
- **Expected Result:** POC `is_verified` becomes `true`. Any location exclusively tied to this POC can now be marked active.

## 2. Location Oversight
### TC03: View Garage Details
- **Action:** Admin views a specific partner's locations.
- **Expected Result:** The UI displays `location_type`, security amenities (CCTV, Guards), and a detailed breakdown of Vehicle Capacity and Rates (Bike/Sedan/SUV).

### TC04: Update Coordinates
- **Action:** Admin corrects the latitude/longitude of a partner location.
- **Expected Result:** Database updates correctly. RPC search results reflect the new coordinate location.

## 3. Support Tickets & Disputes
### TC05: Resolve Support Ticket
- **Pre-condition:** Partner raised a ticket to edit a POC.
- **Action:** Admin reviews ticket, makes the requested edits to the POC via the Admin POC UI, and marks the ticket as `resolved`.
- **Expected Result:** POC updated. Ticket closed.

### TC06: Dispute Escalation
- **Pre-condition:** A customer raised a dispute regarding vehicle damage.
- **Action:** Admin views the Dispute details.
- **Expected Result:** Admin UI displays the `check_in_photos` uploaded by both customer and partner for visual comparison.

## 4. Analytics & Settlements
### TC07: View Revenue Metrics
- **Action:** Admin loads the main dashboard.
- **Expected Result:** "Active Vehicles Parked" and "Garage Revenue" metrics load correctly alongside luggage metrics.

### TC08: Generate Settlement PDF
- **Action:** Admin selects a time period and clicks "Generate Payout PDF".
- **Expected Result:** Puppeteer generates a PDF invoice containing all completed bookings for that partner. Total settlement amount calculates correctly minus platform fees.
