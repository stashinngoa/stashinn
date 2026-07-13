-- Stage 6 POC Verification
-- Execute this manually in Supabase SQL Editor

ALTER TABLE public.partner_pocs 
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;

-- Backfill existing POCs so we don't break current assignments
UPDATE public.partner_pocs SET is_verified = true WHERE is_verified = false;
