# Stage 1: Infrastructure & Authentication (Test Scenarios)

These test scenarios validate the work completed in **Stage 1 (Batch A, B, C)**. They focus on Next.js setup, Supabase connection, Authentication, and strict Role-Based Middleware Routing.

## Environments to test
- **Customer App**: `http://localhost:3000`
- **Partner App**: `http://localhost:3001`
- **Admin App**: `http://localhost:3002`

---

### TC-01: Customer Registration & Dashboard Access
**Objective**: Verify a new customer can sign up and reach their specific dashboard.
1. Navigate to `http://localhost:3000/login`.
2. Under "Don't have an account?", enter a Full Name, Email (e.g., `test.cust1@example.com`), and Password.
3. Click "Register as Customer".
4. **Expected Result**: You should be automatically redirected to `http://localhost:3000/dashboard` and see "Customer Dashboard" along with your authenticated email.

### TC-02: Partner Registration & Dashboard Access
**Objective**: Verify a new partner can sign up and reach the partner portal.
1. Navigate to `http://localhost:3001/login`.
2. Under "New Partner?", enter Name, Email (e.g., `test.partner1@example.com`), and Password.
3. Click "Apply as Partner".
4. **Expected Result**: You should be redirected to `http://localhost:3001/dashboard` and see "Partner Dashboard".

### TC-03: Session Protection (Unauthenticated Access)
**Objective**: Ensure anonymous users cannot access restricted dashboards.
1. Open an Incognito/Private window.
2. Navigate directly to `http://localhost:3000/dashboard`.
3. **Expected Result**: You are immediately intercepted and redirected to `http://localhost:3000/login?next=/dashboard`.

### TC-04: Role-Based Access Control (Cross-App Routing Prevention)
**Objective**: Ensure users assigned one role cannot access applications meant for another role.
1. While logged in as the **Customer** from TC-01 (on `localhost:3000`), open a new tab in the same browser.
2. Navigate to the Partner app dashboard: `http://localhost:3001/dashboard`.
3. **Expected Result**: Because you share the Supabase session token globally but your database role is `customer`, Next.js middleware should detect this and display the Red/Purple **403 Access Denied** page on the Partner app.

### TC-05: Logout Flow
**Objective**: Verify cookies/tokens are cleared.
1. On any active dashboard, click the "Log Out" / "Terminate Session" button.
2. **Expected Result**: You are redirected back to `/login`. Trying to use the browser's "Back" button to return to `/dashboard` should forcefully redirect you back to `/login`.

### TC-06: Database Trigger Validation
**Objective**: Ensure the newly added `on_auth_user_created` trigger successfully copied data to `public.users`.
1. Open your Supabase Dashboard UI in the browser.
2. Go to the **Table Editor**.
3. Select the `users` table (in the `public` schema).
4. **Expected Result**: You should clearly see the rows for `test.cust1@example.com` and `test.partner1@example.com` populated automatically with their correct `role` ("customer" and "partner" respectively) and their names.
