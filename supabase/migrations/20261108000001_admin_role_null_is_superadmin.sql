-- An admin whose admin_role is empty is treated as a superadmin by the admin app
-- (apps/admin/lib/permissions.ts → effectiveRole). The database check required an explicit
-- role, so such an admin could open pages like Disputes but every row was hidden by RLS.
-- Make the database agree with the app.

CREATE OR REPLACE FUNCTION public.has_admin_role(required_roles admin_role[])
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
      AND role = 'admin'
      AND COALESCE(admin_role, 'superadmin'::admin_role) = ANY(required_roles)
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;
