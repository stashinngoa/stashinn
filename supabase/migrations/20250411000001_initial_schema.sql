-- ============================================================================
-- StashInn Portal — Initial Database Schema
-- Migration: 20250411000001_initial_schema
--
-- Creates the foundational tables for users, partners, locations,
-- bookings, payments, reviews, notifications, damage reports,
-- audit logs, and system configuration.
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";   -- Geo-based partner search

-- ============================================================================
-- 1. USER PROFILES
-- Extends Supabase auth.users with application-specific data
-- ============================================================================

CREATE TYPE user_role AS ENUM ('customer', 'partner', 'admin');

CREATE TABLE public.users (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL UNIQUE,
  full_name     TEXT NOT NULL DEFAULT '',
  phone         TEXT,
  role          user_role NOT NULL DEFAULT 'customer',
  avatar_url    TEXT,
  is_blocked    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.users IS 'Application user profiles — synced with auth.users on signup';

-- ============================================================================
-- 2. PARTNERS
-- Business entity information for storage partners
-- ============================================================================

CREATE TYPE partner_status AS ENUM ('pending', 'approved', 'rejected', 'suspended');

CREATE TABLE public.partners (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  business_name   TEXT NOT NULL,
  business_type   TEXT,                            -- e.g. hotel, cafe, shop
  gstin           TEXT,                            -- GST Identification Number
  pan             TEXT,                            -- PAN card number
  status          partner_status NOT NULL DEFAULT 'pending',
  kyc_verified    BOOLEAN NOT NULL DEFAULT FALSE,
  commission_rate DECIMAL(5,2) NOT NULL DEFAULT 15.00, -- platform commission %
  avg_rating      DECIMAL(3,2) DEFAULT 0.00,
  total_reviews   INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.partners IS 'Storage partner business profiles linked to user accounts';

-- ============================================================================
-- 3. PARTNER LOCATIONS
-- Physical storage locations managed by partners
-- ============================================================================

CREATE TABLE public.partner_locations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id      UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,                   -- e.g. "Hotel Mandovi — Panaji"
  address_line1   TEXT NOT NULL,
  address_line2   TEXT,
  city            TEXT NOT NULL,
  state           TEXT NOT NULL,
  pincode         TEXT NOT NULL,
  country         TEXT NOT NULL DEFAULT 'India',
  latitude        DOUBLE PRECISION NOT NULL,
  longitude       DOUBLE PRECISION NOT NULL,
  geo_point       GEOGRAPHY(Point, 4326),          -- PostGIS geo point for radius search
  price_per_hour  DECIMAL(10,2) NOT NULL DEFAULT 50.00,
  price_per_day   DECIMAL(10,2) NOT NULL DEFAULT 200.00,
  max_bags        INTEGER NOT NULL DEFAULT 20,
  available_bags  INTEGER NOT NULL DEFAULT 20,
  operating_hours JSONB DEFAULT '{"open": "08:00", "close": "22:00"}'::JSONB,
  amenities       TEXT[] DEFAULT '{}',             -- e.g. {"cctv", "locker", "ac"}
  photos          TEXT[] DEFAULT '{}',             -- storage bucket URLs
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.partner_locations IS 'Physical storage spots with geo-coordinates for proximity search';

-- Auto-populate the geo_point from lat/lng
CREATE OR REPLACE FUNCTION update_geo_point()
RETURNS TRIGGER AS $$
BEGIN
  NEW.geo_point := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::GEOGRAPHY;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_geo_point
  BEFORE INSERT OR UPDATE OF latitude, longitude ON public.partner_locations
  FOR EACH ROW EXECUTE FUNCTION update_geo_point();

-- ============================================================================
-- 4. PARTNER POINTS OF CONTACT (POC)
-- ============================================================================

CREATE TABLE public.partner_pocs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id    UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  location_id   UUID REFERENCES public.partner_locations(id) ON DELETE SET NULL,
  name          TEXT NOT NULL,
  phone         TEXT NOT NULL,
  email         TEXT,
  is_primary    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.partner_pocs IS 'Contact persons at partner locations for operational coordination';

-- ============================================================================
-- 5. BOOKINGS
-- Core booking records linking customers to partner locations
-- ============================================================================

CREATE TYPE booking_status AS ENUM (
  'pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'disputed'
);

CREATE TABLE public.bookings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id       UUID NOT NULL REFERENCES public.users(id),
  partner_id        UUID NOT NULL REFERENCES public.partners(id),
  location_id       UUID NOT NULL REFERENCES public.partner_locations(id),
  status            booking_status NOT NULL DEFAULT 'pending',
  num_bags          INTEGER NOT NULL DEFAULT 1,
  start_time        TIMESTAMPTZ NOT NULL,
  end_time          TIMESTAMPTZ NOT NULL,
  actual_checkin    TIMESTAMPTZ,
  actual_checkout   TIMESTAMPTZ,
  checkin_otp       TEXT,
  checkout_otp      TEXT,
  otp_expires_at    TIMESTAMPTZ,
  base_amount       DECIMAL(10,2) NOT NULL,        -- price before commission
  commission_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_amount      DECIMAL(10,2) NOT NULL,        -- customer pays this
  coupon_id         UUID,                          -- FK added in Stage 8
  discount_amount   DECIMAL(10,2) DEFAULT 0,
  cancellation_reason TEXT,
  cancelled_by      TEXT,                          -- 'customer' or 'partner'
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.bookings IS 'Luggage storage booking records with OTP verification lifecycle';

-- ============================================================================
-- 6. PAYMENTS
-- Razorpay payment records linked to bookings
-- ============================================================================

CREATE TYPE payment_status AS ENUM (
  'pending', 'paid', 'refunded', 'partially_refunded', 'failed'
);

CREATE TYPE payment_method AS ENUM (
  'razorpay', 'upi', 'pay_at_location'
);

CREATE TABLE public.payments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id            UUID NOT NULL REFERENCES public.bookings(id),
  razorpay_order_id     TEXT,
  razorpay_payment_id   TEXT,
  razorpay_signature    TEXT,
  amount                DECIMAL(10,2) NOT NULL,
  currency              TEXT NOT NULL DEFAULT 'INR',
  status                payment_status NOT NULL DEFAULT 'pending',
  method                payment_method NOT NULL DEFAULT 'razorpay',
  refund_amount         DECIMAL(10,2) DEFAULT 0,
  refund_reason         TEXT,
  webhook_payload       JSONB,                     -- raw Razorpay webhook data
  idempotency_key       TEXT UNIQUE,               -- prevent duplicate processing
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.payments IS 'Payment transaction records with Razorpay integration data';

-- ============================================================================
-- 7. PARTNER TRANSACTIONS (Settlements)
-- Tracks payouts/commissions owed to partners
-- ============================================================================

CREATE TYPE transfer_status AS ENUM ('pending', 'processing', 'completed', 'failed');

CREATE TABLE public.partner_transactions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id        UUID NOT NULL REFERENCES public.partners(id),
  booking_id        UUID REFERENCES public.bookings(id),
  amount            DECIMAL(10,2) NOT NULL,        -- partner's share
  commission        DECIMAL(10,2) NOT NULL,        -- platform's share
  transfer_status   transfer_status NOT NULL DEFAULT 'pending',
  transfer_proof    TEXT,                          -- URL to uploaded proof
  settlement_month  TEXT,                          -- e.g. "2025-04"
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.partner_transactions IS 'Partner settlement ledger tracking earnings and platform commission';

-- ============================================================================
-- 8. REVIEWS
-- Post-checkout customer reviews for partner locations
-- ============================================================================

CREATE TABLE public.reviews (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id    UUID NOT NULL UNIQUE REFERENCES public.bookings(id),
  customer_id   UUID NOT NULL REFERENCES public.users(id),
  partner_id    UUID NOT NULL REFERENCES public.partners(id),
  location_id   UUID NOT NULL REFERENCES public.partner_locations(id),
  rating        INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.reviews IS 'Customer ratings and reviews per completed booking';

-- ============================================================================
-- 9. NOTIFICATIONS
-- In-app notification records
-- ============================================================================

CREATE TYPE notification_category AS ENUM (
  'booking', 'payment', 'review', 'damage', 'system', 'promotion'
);

CREATE TABLE public.notifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  message       TEXT NOT NULL,
  category      notification_category NOT NULL DEFAULT 'system',
  is_read       BOOLEAN NOT NULL DEFAULT FALSE,
  action_url    TEXT,                              -- deep-link within the app
  metadata      JSONB DEFAULT '{}'::JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.notifications IS 'In-app notification inbox per user';

-- ============================================================================
-- 10. NOTIFICATION PREFERENCES
-- Per-user channel opt-in/out settings
-- ============================================================================

CREATE TABLE public.notification_preferences (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  in_app        BOOLEAN NOT NULL DEFAULT TRUE,
  email         BOOLEAN NOT NULL DEFAULT TRUE,
  whatsapp      BOOLEAN NOT NULL DEFAULT FALSE,
  sms           BOOLEAN NOT NULL DEFAULT FALSE,
  push          BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.notification_preferences IS 'User notification delivery channel preferences';

-- ============================================================================
-- 11. DAMAGE REPORTS
-- Damage/dispute records submitted by partners
-- ============================================================================

CREATE TYPE damage_status AS ENUM (
  'submitted', 'under_review', 'resolved_refund', 'resolved_no_action', 'escalated'
);

CREATE TABLE public.damage_reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id      UUID NOT NULL REFERENCES public.bookings(id),
  partner_id      UUID NOT NULL REFERENCES public.partners(id),
  customer_id     UUID NOT NULL REFERENCES public.users(id),
  description     TEXT NOT NULL,
  photos          TEXT[] DEFAULT '{}',             -- storage bucket URLs
  status          damage_status NOT NULL DEFAULT 'submitted',
  admin_notes     TEXT,
  refund_amount   DECIMAL(10,2) DEFAULT 0,
  resolved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.damage_reports IS 'Partner-submitted damage claims with admin review workflow';

-- ============================================================================
-- 12. AUDIT LOGS
-- Immutable record of important system events
-- ============================================================================

CREATE TABLE public.audit_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES public.users(id),
  action        TEXT NOT NULL,                     -- e.g. 'partner.approved', 'booking.cancelled'
  entity_type   TEXT NOT NULL,                     -- e.g. 'partner', 'booking', 'payment'
  entity_id     UUID,
  old_values    JSONB,
  new_values    JSONB,
  ip_address    TEXT,
  user_agent    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.audit_logs IS 'Immutable audit trail for compliance and debugging';

-- Make audit_logs append-only (no updates or deletes)
CREATE RULE audit_logs_no_update AS ON UPDATE TO public.audit_logs DO INSTEAD NOTHING;
CREATE RULE audit_logs_no_delete AS ON DELETE TO public.audit_logs DO INSTEAD NOTHING;

-- ============================================================================
-- 13. SYSTEM CONFIGURATION
-- Platform-wide configurable variables (admin-managed)
-- ============================================================================

CREATE TABLE public.system_config (
  key           TEXT PRIMARY KEY,
  value         JSONB NOT NULL,
  description   TEXT,
  updated_by    UUID REFERENCES public.users(id),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.system_config IS 'Key-value config store for platform-wide settings';

-- Seed default config values
INSERT INTO public.system_config (key, value, description) VALUES
  ('default_commission_rate', '15.00', 'Default platform commission percentage for new partners'),
  ('booking_min_hours', '1', 'Minimum booking duration in hours'),
  ('booking_max_days', '5', 'Maximum booking duration in days'),
  ('cancellation_window_hours', '12', 'Hours before start_time within which cancellation is free'),
  ('otp_expiry_minutes', '10', 'OTP validity period in minutes'),
  ('otp_length', '6', 'Number of digits in generated OTPs'),
  ('platform_name', '"StashInn"', 'Platform display name'),
  ('support_email', '"support@stashinn.com"', 'Platform support email address');

-- ============================================================================
-- 14. EMAIL TEMPLATES (Admin-managed)
-- ============================================================================

CREATE TABLE public.email_templates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT NOT NULL UNIQUE,              -- e.g. 'booking_confirmed', 'otp_checkin'
  subject       TEXT NOT NULL,
  body_html     TEXT NOT NULL,
  variables     TEXT[] DEFAULT '{}',               -- e.g. {"customer_name", "booking_id"}
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.email_templates IS 'Admin-editable email templates with variable placeholders';

-- ============================================================================
-- 15. INDEXES for performance
-- ============================================================================

-- User lookups
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_role ON public.users(role);

-- Partner lookups
CREATE INDEX idx_partners_user_id ON public.partners(user_id);
CREATE INDEX idx_partners_status ON public.partners(status);

-- Location geo-search (PostGIS spatial index)
CREATE INDEX idx_locations_geo ON public.partner_locations USING GIST(geo_point);
CREATE INDEX idx_locations_partner ON public.partner_locations(partner_id);
CREATE INDEX idx_locations_city ON public.partner_locations(city);
CREATE INDEX idx_locations_active ON public.partner_locations(is_active);

-- Booking lookups
CREATE INDEX idx_bookings_customer ON public.bookings(customer_id);
CREATE INDEX idx_bookings_partner ON public.bookings(partner_id);
CREATE INDEX idx_bookings_location ON public.bookings(location_id);
CREATE INDEX idx_bookings_status ON public.bookings(status);
CREATE INDEX idx_bookings_dates ON public.bookings(start_time, end_time);

-- Payment lookups
CREATE INDEX idx_payments_booking ON public.payments(booking_id);
CREATE INDEX idx_payments_status ON public.payments(status);
CREATE INDEX idx_payments_razorpay_order ON public.payments(razorpay_order_id);

-- Transaction lookups
CREATE INDEX idx_transactions_partner ON public.partner_transactions(partner_id);
CREATE INDEX idx_transactions_month ON public.partner_transactions(settlement_month);

-- Notification lookups
CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_notifications_unread ON public.notifications(user_id, is_read) WHERE is_read = FALSE;

-- Audit log lookups
CREATE INDEX idx_audit_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_user ON public.audit_logs(user_id);
CREATE INDEX idx_audit_created ON public.audit_logs(created_at);

-- Damage report lookups
CREATE INDEX idx_damage_booking ON public.damage_reports(booking_id);
CREATE INDEX idx_damage_partner ON public.damage_reports(partner_id);

-- ============================================================================
-- 16. UPDATED_AT TRIGGER (auto-update timestamps)
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_partners_updated_at BEFORE UPDATE ON public.partners
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_locations_updated_at BEFORE UPDATE ON public.partner_locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_bookings_updated_at BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_payments_updated_at BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_transactions_updated_at BEFORE UPDATE ON public.partner_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_damage_updated_at BEFORE UPDATE ON public.damage_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_notif_prefs_updated_at BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_email_templates_updated_at BEFORE UPDATE ON public.email_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
