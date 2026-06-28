-- ============================================================================
-- Add POC verification fields
-- ============================================================================

ALTER TABLE public.partner_pocs
ADD COLUMN id_document_url TEXT,
ADD COLUMN photo_url TEXT;
