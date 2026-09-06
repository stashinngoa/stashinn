ALTER TABLE public.partner_locations 
ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5,2) DEFAULT 15.00;

-- Optionally backfill commission rates from the partners table
UPDATE public.partner_locations pl
SET commission_rate = p.commission_rate
FROM public.partners p
WHERE pl.partner_id = p.id;

ALTER TABLE public.partner_locations
ALTER COLUMN commission_rate SET NOT NULL;
