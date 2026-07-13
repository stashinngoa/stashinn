# Stage 1 — Walkthrough

## Batch A: Project Scaffold ✅

See previous walkthrough. All 16 sub-tasks across INF-01, INF-05, INF-03 completed.

---

## Batch B: Database Foundation ✅

### INF-02: Supabase Project Config (5/5 sub-tasks)

#### Sub-task 1: Setup Supabase CLI ✅
- Ran `npx supabase init` in the monorepo root
- Created [config.toml](file:///d:/stashinn/stashinn-portal/supabase/config.toml) with default local settings

#### Sub-task 2: Add migration scripts for schema ✅

Created **3 sequential migration files**:

| # | File | Purpose | Key Contents |
|---|------|---------|-------------|
| 1 | [20250411000001_initial_schema.sql](file:///d:/stashinn/stashinn-portal/supabase/migrations/20250411000001_initial_schema.sql) | Core tables | 14 tables, 6 enums, PostGIS extension, triggers, indexes |
| 2 | [20250411000002_rls_policies.sql](file:///d:/stashinn/stashinn-portal/supabase/migrations/20250411000002_rls_policies.sql) | Row Level Security | 40+ RLS policies, 3 helper functions |
| 3 | [20250411000003_storage_buckets.sql](file:///d:/stashinn/stashinn-portal/supabase/migrations/20250411000003_storage_buckets.sql) | Storage buckets | 5 buckets, storage RLS policies |

**Tables created:**

| Table | Records | Purpose |
|-------|---------|---------|
| `users` | Extends auth.users | User profiles with roles |
| `partners` | Business entities | Partner onboarding data, KYC |
| `partner_locations` | Storage spots | PostGIS geo-indexed locations |
| `partner_pocs` | Contact persons | Points of contact per location |
| `bookings` | Reservations | Full lifecycle with OTP fields |
| `payments` | Transactions | Razorpay integration data |
| `partner_transactions` | Settlements | Commission splits, transfer proofs |
| `reviews` | Ratings | Post-checkout customer reviews |
| `notifications` | In-app alerts | Per-user notification inbox |
| `notification_preferences` | Channel settings | Email/WhatsApp/SMS opt-in/out |
| `damage_reports` | Dispute claims | Photo evidence, admin workflow |
| `audit_logs` | System trail | Immutable (no update/delete rules) |
| `system_config` | Platform settings | Key-value store, 8 defaults seeded |
| `email_templates` | Email layouts | Variable-based templates |

**Key database features:**
- **PostGIS** enabled for radius-based partner search
- **Auto geo-point trigger**: Automatically computes `geography` column from lat/lng
- **Auto updated_at trigger**: All tables with `updated_at` get auto-timestamped
- **Append-only audit_logs**: Protected by PostgreSQL rules against UPDATE/DELETE

**RLS architecture:**
- 3 helper functions: `get_user_role()`, `is_admin()`, `get_partner_id()`
- Customers see only their own bookings/payments/notifications
- Partners see only their own locations/bookings/transactions
- Admins have full read/write access
- Public search: active locations and approved partners are visible to everyone

#### Sub-task 3: Seed sample data ✅

[seed.sql](file:///d:/stashinn/stashinn-portal/supabase/seed.sql) creates realistic Goa pilot data:
- 1 admin, 3 partners, 3 customers
- 4 locations across Panaji and Calangute (real GPS coordinates)
- 4 bookings (completed, active, upcoming, cancelled)
- 4 payment records, 1 review
- 5 notification preference records
- 5 email templates (booking confirmed, OTP check-in/out, cancellation, partner approved)

#### Sub-task 4: Configure storage buckets ✅

5 storage buckets created in [migration 003](file:///d:/stashinn/stashinn-portal/supabase/migrations/20250411000003_storage_buckets.sql):
- `avatars` — Public, 2MB, images only
- `location-photos` — Public, 5MB, images only
- `kyc-documents` — Private, 10MB, images + PDF
- `damage-photos` — Private, 5MB, images only
- `payment-proofs` — Private, 5MB, images + PDF

Each bucket has folder-based RLS: files stored as `{user_id_or_partner_id}/filename.ext`.

#### Sub-task 5: Document DB migrations process ✅

[DATABASE_MIGRATIONS.md](file:///d:/stashinn/stashinn-portal/docs/DATABASE_MIGRATIONS.md) covers:
- Directory structure and naming conventions
- All CLI commands (create, push, reset, diff)
- Best practices (do/don't lists)
- RLS testing instructions
- Complete schema reference table
- Storage bucket reference table

---

### INF-06: DB Backup & Rollback Plan (6/6 sub-tasks)

All documented in [BACKUP_ROLLBACK.md](file:///d:/stashinn/stashinn-portal/docs/BACKUP_ROLLBACK.md):

| Sub-task | Deliverable |
|----------|-------------|
| Backup frequency & retention | §1 — Daily/weekly/monthly matrix across environments |
| Automated exports | §2 + [db-backup.yml](file:///d:/stashinn/stashinn-portal/.github/workflows/db-backup.yml) — Cron-scheduled GitHub Action |
| Test restore procedure | §3-4 — Monthly restore drill checklist with validation queries |
| Rollback steps | §5 — Decision framework table with authorization matrix |
| Alerting for failed backups | §6 + notify-failure job in db-backup.yml — Slack + email alerts |
| Migration versioning & rollback | §7 — Fix-forward strategy, rollback SQL conventions, pre-deploy checklist |

---

## Verification Results

| Check | Result |
|-------|--------|
| `npx turbo run build` | ✅ All 3 apps built successfully (9.3s) |
| Migration syntax | ✅ Valid SQL (3 files, ~400 lines total) |
| Seed data consistency | ✅ All FKs reference valid parent IDs |
| Documentation | ✅ 3 new docs created |

---

## Files Created in Batch B

| File | Type |
|------|------|
| `supabase/config.toml` | NEW — Supabase local config |
| `supabase/migrations/20250411000001_initial_schema.sql` | NEW — 14 tables, enums, indexes |
| `supabase/migrations/20250411000002_rls_policies.sql` | NEW — 40+ RLS policies |
| `supabase/migrations/20250411000003_storage_buckets.sql` | NEW — 5 buckets + storage RLS |
| `supabase/seed.sql` | NEW — Goa pilot seed data |
| `.github/workflows/db-backup.yml` | NEW — Automated backup job |
| `docs/DATABASE_MIGRATIONS.md` | NEW — Migrations guide |
| `docs/BACKUP_ROLLBACK.md` | NEW — Backup & rollback plan |
