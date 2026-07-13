-- Stage 5 Batch A: Date-Range Indexes
-- Execute this manually in Supabase SQL Editor

-- Indexes to optimize date-range queries on bookings
CREATE INDEX IF NOT EXISTS idx_bookings_start_time ON public.bookings(start_time);
CREATE INDEX IF NOT EXISTS idx_bookings_end_time ON public.bookings(end_time);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON public.bookings(created_at);

-- Indexes to optimize date-range queries on partner_transactions (settlements)
CREATE INDEX IF NOT EXISTS idx_pt_created_at ON public.partner_transactions(created_at);
