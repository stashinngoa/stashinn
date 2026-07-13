# Stage 2 — Batch A: Supply Side Complete

Batch A focuses on building the foundational tools that Partners need to manage their businesses on StashInn. All tasks inside this batch have been fully built, strictly adhering to the `public.partners`, `public.partner_locations`, and `public.partner_pocs` DB schemas, while injecting premium Next.js UI aesthetics.

---

## 1. Partner Onboarding (PM-01)
When a new partner registers via Supabase Auth, they are automatically caught by the Layout Router and pushed into the Onboarding flow.

- **Multi-step UI:** A sleek, animated 3-step form.
- **Data Preservation:** We solved the Next.js component unmounting issue by utilizing CSS `hidden` to guarantee the `FormData` persists correctly on submit.
- **File Upload Integration:** Step 3 accepts a business KYC document (PDF/JPG, up to 10MB) which is directly streamed into your secure `kyc-documents` Supabase Storage bucket.
- **Pending Lockout:** Once submitted, the partner is locked out of the dashboard via the "Application Pending" screen. 

> [!TIP] 
> To bypass the pending screen locally during testing, open Supabase Studio (`http://127.0.0.1:54323`), edit the `partners` table, and change your `status` from `pending` to `approved`.

## 2. Protected Dashboard & Profile (PM-09)
Once approved, the Partner gains access to the true Dashboard Layout.

- **Global Navigation:** The sidebar natively tracks active routes and features a persistent **Log Out** button.
- **Profile Editor:** Navigate to [Business Profile](http://localhost:3001/dashboard/profile) to update your PAN and GST.
- **Validation:** Both the Client UI and the Server Actions strictly enforce Indian PAN formatting (e.g. `ABCDE1234F`).

## 3. Location Management (PM-02)
A partner can manage multiple physical storage spots.

- Navigate to the **[Locations Tab](http://localhost:3001/dashboard/locations)** to view a grid of Location Cards.
- Click **Add Location** to access the Location Builder. You can define maximum bag capacity, pricing structures (Per Hour/Per Day), operating hours, and standard amenities.
- These records are directly pushed into the `partner_locations` DB table, ready to be queried by customers in Batch B.

## 4. POC Management (PM-03)
Partners need to designate specific staff members to handle physical check-ins.

- Navigate to the **[Staff & POCs Tab](http://localhost:3001/dashboard/pocs)**.
- You can add staff and optionally assign them to a specific physical location or keep them as global HQ staff.

> [!IMPORTANT]
> Because we increased the internal Next.js `bodySizeLimit` configuration to 10MB to accept the KYC documents, please ensure your local dev server has been restarted for the file upload to work.

---

### Verification Checklist
You can test this entire flow end-to-end on `localhost:3001`:
1. Register a new partner email.
2. Complete the Onboarding flow with a dummy PDF file.
3. Use Supabase Studio to approve the partner.
4. Add a new Location.
5. Add a Staff POC to that new location.
