# Security & Edge Case Test Cases

## 1. Storage Buckets (RLS Policies)
### TC01: Unauthorized Customer Photo Upload
- **Action:** Malicious user attempts to upload to `vehicle-condition-photos` via a generic API call.
- **Expected Result:** RLS policy blocks upload. Only authenticated uploads matching `[customer_id]/...` or Service Role actions (server-side) are permitted.

### TC02: KYC Document Privacy
- **Action:** Customer attempts to access a URL corresponding to a Partner's KYC document in the `kyc-documents` bucket.
- **Expected Result:** Access Denied. Bucket policies strictly restrict read access to the owning Partner and Admin roles.

## 2. Booking State Machine
### TC03: Double Check-in Attempt
- **Pre-condition:** Booking is already `checked_in`.
- **Action:** Partner re-submits the check-in OTP via the form.
- **Expected Result:** Backend validation fails: "Booking is not pending".

### TC04: Invalid OTP Check-out
- **Action:** Partner submits check-in OTP into the Check-out terminal.
- **Expected Result:** Validation fails. Terminal specifies incorrect OTP type. Rate limiter records failure.

## 3. Database Constraints
### TC05: Location Activation without POC
- **Action:** Admin manually sets `is_active = true` via SQL query on a location with no verified POCs.
- **Expected Result:** Query should ideally be caught by UI or app logic. (Future improvement: DB Trigger to prevent). Currently handled strictly at the application server action layer.

## 4. Search Edge Cases
### TC06: High Radius Search (Empty Results)
- **Action:** User searches in an area with 0 locations.
- **Expected Result:** RPC returns empty array. UI degrades gracefully with a "No locations found" empty state graphic rather than crashing.
