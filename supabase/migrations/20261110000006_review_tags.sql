-- ============================================================================
-- StashInn Portal — Quick tags on reviews
-- Migration: 20261110000006_review_tags
--
-- Customers can pick a few short tags when rating a location ("Easy to find", "Long wait"...),
-- so partners see what stood out even when no comment is written. The allowed tags live in
-- apps/customer/app/dashboard/review/[id]/reviewShared.ts; the database only limits how many.
-- ============================================================================

ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_tags_check;
ALTER TABLE public.reviews ADD CONSTRAINT reviews_tags_check CHECK (cardinality(tags) <= 6);

COMMENT ON COLUMN public.reviews.tags IS 'Quick tags the customer picked (see reviewShared.ts in the customer app)';

-- Rollback:
-- ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_tags_check, DROP COLUMN IF EXISTS tags;
