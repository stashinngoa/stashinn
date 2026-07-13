-- ============================================================================
-- StashInn Portal — Notification Archiving
-- This script adds the `is_archived` column to the notifications table.
-- ============================================================================

ALTER TABLE public.notifications 
ADD COLUMN is_archived BOOLEAN NOT NULL DEFAULT FALSE;

-- Add an index to speed up filtering by archived status
CREATE INDEX idx_notifications_archived ON public.notifications(user_id, is_archived);
