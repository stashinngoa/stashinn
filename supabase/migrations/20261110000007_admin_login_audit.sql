-- Admin console sign-ins are recorded in auth_audits with method 'password'
-- (customers use email / whatsapp / sms / auto). See apps/admin/app/login/page.tsx.
ALTER TABLE public.auth_audits DROP CONSTRAINT IF EXISTS auth_audits_method_check;
ALTER TABLE public.auth_audits
  ADD CONSTRAINT auth_audits_method_check CHECK (method IN ('email', 'whatsapp', 'sms', 'auto', 'password'));
