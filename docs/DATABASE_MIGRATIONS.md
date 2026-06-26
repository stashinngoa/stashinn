# Database Migrations Guide

This document covers how to work with Supabase database migrations in the StashInn Portal project.

## Directory Structure

```
supabase/
├── config.toml                 # Supabase local config
├── seed.sql                    # Development seed data
└── migrations/
    ├── 20250411000001_initial_schema.sql        # Core tables, enums, indexes, triggers
    ├── 20250411000002_rls_policies.sql          # Row Level Security policies
    └── 20250411000003_storage_buckets.sql       # Storage buckets + storage RLS
```

## Migration Naming Convention

```
YYYYMMDDHHMMSS_descriptive_name.sql
```

- Timestamp prefix ensures ordered execution.
- Use snake_case for descriptive names.
- One logical change per migration file.

## Common Commands

### Local Development

```bash
# Initialize local Supabase (first time only)
npx supabase init

# Start local Supabase stack (Postgres, Auth, Storage, etc.)
npx supabase start

# Stop local Supabase stack
npx supabase stop

# Reset DB — drops all data, re-runs all migrations + seed.sql
npx supabase db reset

# View current migration status
npx supabase migration list
```

### Creating New Migrations

```bash
# Create a new empty migration file
npx supabase migration new <descriptive_name>

# Example:
npx supabase migration new add_coupons_table

# This creates: supabase/migrations/20250412121500_add_coupons_table.sql
# Edit the file and add your SQL changes.
```

### Applying Migrations to Remote (Staging / Production)

```bash
# Link to your remote Supabase project (one-time setup)
npx supabase link --project-ref <your-project-ref>

# Push all pending migrations to the linked remote project
npx supabase db push

# Check which migrations have been applied remotely
npx supabase migration list --linked
```

### Diffing Schema Changes

If you make changes via the Supabase Dashboard (not recommended), you can capture them:

```bash
# Generate a migration from schema diff
npx supabase db diff --use-migra -f <migration_name>
```

## Migration Best Practices

### DO

- ✅ **One change per migration** — don't mix table creation with data changes.
- ✅ **Test locally first** — always run `npx supabase db reset` before pushing.
- ✅ **Include rollback comments** — document how to undo each migration (see below).
- ✅ **Use `IF NOT EXISTS`** / `IF EXISTS` — makes migrations re-runnable.
- ✅ **Add `COMMENT ON TABLE`** — self-documenting schema.

### DON'T

- ❌ **Never modify an already-pushed migration** — create a new one instead.
- ❌ **Never use the Dashboard for schema changes in staging/prod** — always use migration files.
- ❌ **Never delete migration files** — only add new ones.
- ❌ **Never put secrets in migrations** — use `system_config` table or env vars.

## RLS Policy Testing

After writing RLS policies, test them locally:

```sql
-- Test as a specific user
SET request.jwt.claims = '{"sub": "c0000000-0000-0000-0000-000000000001", "role": "authenticated"}';

-- Try accessing data
SELECT * FROM public.bookings;

-- Reset
RESET request.jwt.claims;
```

## Schema Overview

The initial migration creates **14 core tables**:

| Table | Purpose | Key Relationships |
|-------|---------|-------------------|
| `users` | User profiles (extends `auth.users`) | PK: `id` → `auth.users.id` |
| `partners` | Business entities | FK: `user_id` → `users.id` |
| `partner_locations` | Physical storage spots | FK: `partner_id` → `partners.id` |
| `partner_pocs` | Contact persons | FKs: `partner_id`, `location_id` |
| `bookings` | Storage reservations | FKs: `customer_id`, `partner_id`, `location_id` |
| `payments` | Razorpay transactions | FK: `booking_id` → `bookings.id` |
| `partner_transactions` | Settlement ledger | FKs: `partner_id`, `booking_id` |
| `reviews` | Post-checkout ratings | FKs: `booking_id`, `customer_id`, `partner_id` |
| `notifications` | In-app notifications | FK: `user_id` → `users.id` |
| `notification_preferences` | Channel opt-in/out | FK: `user_id` → `users.id` |
| `damage_reports` | Damage claims | FKs: `booking_id`, `partner_id`, `customer_id` |
| `audit_logs` | Immutable audit trail | FK: `user_id` (optional) |
| `system_config` | Platform settings | Key-value store |
| `email_templates` | Email layouts | Slug-based lookup |

## Storage Buckets

| Bucket | Access | Max Size | Types |
|--------|--------|----------|-------|
| `avatars` | Public read, user upload | 2 MB | JPEG, PNG, WebP |
| `location-photos` | Public read, partner upload | 5 MB | JPEG, PNG, WebP |
| `kyc-documents` | Partner + Admin only | 10 MB | JPEG, PNG, WebP, PDF |
| `damage-photos` | Partner + Admin only | 5 MB | JPEG, PNG, WebP |
| `payment-proofs` | Partner + Admin only | 5 MB | JPEG, PNG, WebP, PDF |
