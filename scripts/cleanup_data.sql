-- ============================================================================
-- StashInn Data Cleanup Script
-- Safely removes all operational data and non-admin users.
-- Ensures that config tables and default values (if any) are NOT deleted.
-- ============================================================================

BEGIN;

-- 1. Temporarily drop the rule on audit_logs so we can truncate it.
-- TRUNCATE normally bypasses ON DELETE rules in Postgres, but this ensures no conflicts.
DO $$
BEGIN
  IF to_regclass('public.audit_logs') IS NOT NULL THEN
    EXECUTE 'DROP RULE IF EXISTS audit_logs_no_delete ON public.audit_logs';
  END IF;
END $$;

-- 2. Truncate all operational data tables to remove foreign key dependencies.
-- We use a DO block to dynamically truncate only tables that actually exist in your database,
-- preventing "relation does not exist" errors if some migrations aren't applied yet.
DO $$ 
DECLARE 
  table_names TEXT;
BEGIN
  SELECT string_agg('public.' || quote_ident(tablename), ', ')
  INTO table_names
  FROM pg_tables
  WHERE schemaname = 'public' 
    AND tablename IN (
      'support_tickets', 'vehicle_pricing', 'audit_logs', 'damage_reports',
      'notifications', 'reviews', 'partner_transactions', 'payments', 
      'bookings', 'partner_pocs', 'partner_locations', 'partners',
      'notification_preferences'
    );

  IF table_names IS NOT NULL THEN
    EXECUTE 'TRUNCATE TABLE ' || table_names || ' RESTART IDENTITY CASCADE';
  END IF;
END $$;

-- 3. Re-create the rule on audit_logs
DO $$
BEGIN
  IF to_regclass('public.audit_logs') IS NOT NULL THEN
    EXECUTE 'CREATE OR REPLACE RULE audit_logs_no_delete AS ON DELETE TO public.audit_logs DO INSTEAD NOTHING';
  END IF;
END $$;

-- 4. Delete all users from auth.users EXCEPT those marked as 'admin' in public.users.
-- Since public.users(id) references auth.users(id) ON DELETE CASCADE,
-- deleting from auth.users will automatically delete them from public.users as well.
DELETE FROM auth.users 
WHERE id NOT IN (
  SELECT id FROM public.users WHERE role = 'admin'
);

-- Note: auth.users deletion cascades to all auth-related tables (auth.identities, auth.sessions, etc)
-- and our public.users table. 
-- Because we truncated the dependent tables (bookings, partners, etc) in step 2, 
-- there are no foreign key constraint violations blocking this deletion.

COMMIT;

-- Done! Only the superuser/admin accounts and configuration data remain.
