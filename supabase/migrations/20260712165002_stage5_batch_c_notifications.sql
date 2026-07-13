-- Stage 5 Batch C: Notifications
-- Execute this manually in Supabase SQL Editor

-- Add notification preferences to partners
ALTER TABLE public.partners 
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"email": true, "whatsapp": false, "sms": false}'::jsonb;
