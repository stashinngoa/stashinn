-- Add admin status to partner locations
ALTER TABLE public.partner_locations
  ADD COLUMN IF NOT EXISTS admin_status VARCHAR(50) NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS status_reason TEXT;

-- Update existing locations based on is_active
UPDATE public.partner_locations 
SET admin_status = 'approved' 
WHERE is_active = true;

UPDATE public.partner_locations 
SET admin_status = 'pending' 
WHERE is_active = false;
