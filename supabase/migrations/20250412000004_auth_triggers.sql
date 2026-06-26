-- ============================================================================
-- StashInn Portal — Auth Triggers
-- Migration: 20250412000004_auth_triggers
--
-- Creates the trigger to automatically sync new signups from auth.users
-- into the public.users table.
-- ============================================================================

-- Create a function to handle new user signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, phone, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'phone',
    COALESCE((new.raw_user_meta_data->>'role')::public.user_role, 'customer'::public.user_role)
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger the function every time a user is created in auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- ROLLBACK INSTRUCTIONS:
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- DROP FUNCTION IF EXISTS public.handle_new_user();
-- ============================================================================
