# StashInn Staff Onboarding

Welcome to the StashInn administrative team! This document outlines how to manage internal staff accounts and explains the granular permissions model.

## Admin Roles & Capabilities

StashInn utilizes a strict Role-Based Access Control (RBAC) model. 
Every staff member is assigned an `admin_role` which dictates what they can view and mutate in the admin dashboard:

### 1. Superadmin (Full Access)
- Can view and manage all aspects of the platform.
- **Exclusive Access**: System configuration, email templates, staff management, and inviting new admins.
- *Who gets this?* Founders and Lead Engineers.

### 2. Finance
- Focuses on the flow of money.
- **Access**: `partner_transactions`, `payments`.
- Can verify settlement proofs, issue Razorpay refunds for disputes, and reconcile the partner ledgers.
- *Who gets this?* Accountants and Finance Managers.

### 3. Operations (Ops)
- Focuses on supply and physical presence.
- **Access**: `partners`, `partner_locations`.
- Can review and approve/reject Partner KYC documents, onboard new storage locations, and manage business details.
- *Who gets this?* Operations Managers and Partner Success teams.

### 4. Support
- Focuses on the customer experience and dispute resolution.
- **Access**: `bookings`, `damage_reports`.
- Can view booking itineraries, adjudicate damage claims (read-only financial power unless combined with Finance), and respond to escalations.
- *Who gets this?* Customer Support Agents.

---

## How to Invite New Staff

1. Go to the **Staff Management** page (`/dashboard/staff`).
2. In the **Invite New Staff** card, enter the team member's email address.
3. Select their starting **Admin Role**.
4. Click **Send Invite**.

The new team member will receive an email from Supabase containing a magic link. They should click the link to log in, and their account will automatically be created with the specified role.

## Promoting Existing Users

If a user already has a customer or partner account (e.g. they registered on the public site), you can instantly promote them to an admin:
1. Go to **Staff Management**.
2. In the **Promote Existing User** card, enter their registered email.
3. Select their **Admin Role**.
4. Click **Promote to Admin**.

They can then log out and log back in to access the `/dashboard`.

## Auditing

Every action related to staff management is tracked in the immutable `audit_logs` table. This includes promotions, demotions, role changes, and invitations. Superadmins can query this table in the database to monitor internal access changes.
