-- ============================================================================
-- StashInn Portal — Seed Data
--
-- Populates development database with realistic test data for Goa pilot.
-- Run with: npx supabase db reset (applies migrations + seed)
--
-- NOTE: Auth users must be created first via Supabase Auth API or dashboard.
-- The UUIDs below are placeholders that will be replaced when actual
-- auth users are created. In development, use `supabase db reset` which
-- runs this seed after migrations.
-- ============================================================================

-- ============================================================================
-- SEED USERS (linked to auth.users — use fixed UUIDs for dev consistency)
-- In a real scenario, these are created via the signup flow.
-- For local dev, supabase db reset will create matching auth users.
-- ============================================================================

-- Admin user
INSERT INTO public.users (id, email, full_name, phone, role) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'admin@stashinn.com', 'StashInn Admin', '+919876543210', 'admin');

-- Partner users
INSERT INTO public.users (id, email, full_name, phone, role) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'partner.mandovi@test.com', 'Rajesh Kumar', '+919876500001', 'partner'),
  ('b0000000-0000-0000-0000-000000000002', 'partner.calangute@test.com', 'Priya Naik', '+919876500002', 'partner'),
  ('b0000000-0000-0000-0000-000000000003', 'partner.panjim@test.com', 'Suresh Dessai', '+919876500003', 'partner');

-- Customer users
INSERT INTO public.users (id, email, full_name, phone, role) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'customer.rahul@test.com', 'Rahul Sharma', '+919876600001', 'customer'),
  ('c0000000-0000-0000-0000-000000000002', 'customer.anita@test.com', 'Anita Patel', '+919876600002', 'customer'),
  ('c0000000-0000-0000-0000-000000000003', 'customer.james@test.com', 'James Wilson', '+919876600003', 'customer');

-- ============================================================================
-- SEED PARTNERS (Goa pilot — 3 partners)
-- ============================================================================

INSERT INTO public.partners (id, user_id, business_name, business_type, gstin, pan, status, kyc_verified, commission_rate, avg_rating, total_reviews) VALUES
  ('p0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Hotel Mandovi', 'hotel', '30AABCU9603R1ZM', 'AABCU9603R', 'approved', TRUE, 15.00, 4.5, 23),
  ('p0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'Calangute Beach Cafe', 'cafe', '30BBDPN4567Q1ZA', 'BBDPN4567Q', 'approved', TRUE, 12.00, 4.2, 15),
  ('p0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000003', 'Panjim Luggage Hub', 'storage_facility', NULL, NULL, 'pending', FALSE, 15.00, 0.00, 0);

-- ============================================================================
-- SEED PARTNER LOCATIONS (Goa locations with real coordinates)
-- ============================================================================

INSERT INTO public.partner_locations (id, partner_id, name, address_line1, address_line2, city, state, pincode, latitude, longitude, price_per_hour, price_per_day, max_bags, available_bags, operating_hours, amenities, is_active) VALUES
  (
    'l0000000-0000-0000-0000-000000000001',
    'p0000000-0000-0000-0000-000000000001',
    'Hotel Mandovi — Panaji Lobby',
    'D.B. Bandodkar Marg',
    'Near Mandovi Bridge',
    'Panaji', 'Goa', '403001',
    15.4989, 73.8278,
    40.00, 180.00, 30, 28,
    '{"open": "07:00", "close": "23:00"}',
    ARRAY['cctv', 'locker', 'ac', 'insurance'],
    TRUE
  ),
  (
    'l0000000-0000-0000-0000-000000000002',
    'p0000000-0000-0000-0000-000000000001',
    'Hotel Mandovi — Miramar Annex',
    'Miramar Beach Road',
    NULL,
    'Panaji', 'Goa', '403001',
    15.4780, 73.8126,
    35.00, 150.00, 15, 15,
    '{"open": "08:00", "close": "20:00"}',
    ARRAY['cctv', 'locker'],
    TRUE
  ),
  (
    'l0000000-0000-0000-0000-000000000003',
    'p0000000-0000-0000-0000-000000000002',
    'Calangute Beach Cafe — Main Counter',
    'Calangute-Baga Road',
    'Near St. Alex Church',
    'Calangute', 'Goa', '403516',
    15.5438, 73.7553,
    50.00, 200.00, 20, 18,
    '{"open": "09:00", "close": "22:00"}',
    ARRAY['cctv', 'ac', 'cafe'],
    TRUE
  ),
  (
    'l0000000-0000-0000-0000-000000000004',
    'p0000000-0000-0000-0000-000000000003',
    'Panjim Luggage Hub — Bus Stand',
    'Kadamba Bus Terminal',
    'Ground Floor, Counter 5',
    'Panaji', 'Goa', '403001',
    15.4956, 73.8249,
    30.00, 120.00, 50, 50,
    '{"open": "06:00", "close": "00:00"}',
    ARRAY['cctv', 'large_bags', '24x7_staff'],
    FALSE -- pending partner approval
  );

-- ============================================================================
-- SEED PARTNER POCs
-- ============================================================================

INSERT INTO public.partner_pocs (partner_id, location_id, name, phone, email, is_primary) VALUES
  ('p0000000-0000-0000-0000-000000000001', 'l0000000-0000-0000-0000-000000000001', 'Rajesh Kumar', '+919876500001', 'rajesh@hotelmandovi.com', TRUE),
  ('p0000000-0000-0000-0000-000000000001', 'l0000000-0000-0000-0000-000000000002', 'Amit Verma', '+919876500011', 'amit@hotelmandovi.com', FALSE),
  ('p0000000-0000-0000-0000-000000000002', 'l0000000-0000-0000-0000-000000000003', 'Priya Naik', '+919876500002', 'priya@calangutecafe.com', TRUE),
  ('p0000000-0000-0000-0000-000000000003', 'l0000000-0000-0000-0000-000000000004', 'Suresh Dessai', '+919876500003', NULL, TRUE);

-- ============================================================================
-- SEED BOOKINGS (sample lifecycle)
-- ============================================================================

INSERT INTO public.bookings (id, customer_id, partner_id, location_id, status, num_bags, start_time, end_time, actual_checkin, actual_checkout, base_amount, commission_amount, total_amount) VALUES
  -- Completed booking
  (
    'd0000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000001',
    'p0000000-0000-0000-0000-000000000001',
    'l0000000-0000-0000-0000-000000000001',
    'checked_out', 2,
    '2025-04-10 09:00:00+05:30', '2025-04-10 17:00:00+05:30',
    '2025-04-10 09:15:00+05:30', '2025-04-10 16:45:00+05:30',
    544.00, 96.00, 640.00
  ),
  -- Active booking (checked in)
  (
    'd0000000-0000-0000-0000-000000000002',
    'c0000000-0000-0000-0000-000000000002',
    'p0000000-0000-0000-0000-000000000002',
    'l0000000-0000-0000-0000-000000000003',
    'checked_in', 1,
    '2025-04-11 10:00:00+05:30', '2025-04-11 18:00:00+05:30',
    '2025-04-11 10:05:00+05:30', NULL,
    340.00, 60.00, 400.00
  ),
  -- Upcoming confirmed booking
  (
    'd0000000-0000-0000-0000-000000000003',
    'c0000000-0000-0000-0000-000000000003',
    'p0000000-0000-0000-0000-000000000001',
    'l0000000-0000-0000-0000-000000000001',
    'confirmed', 3,
    '2025-04-12 08:00:00+05:30', '2025-04-12 20:00:00+05:30',
    NULL, NULL,
    816.00, 144.00, 960.00
  ),
  -- Cancelled booking
  (
    'd0000000-0000-0000-0000-000000000004',
    'c0000000-0000-0000-0000-000000000001',
    'p0000000-0000-0000-0000-000000000002',
    'l0000000-0000-0000-0000-000000000003',
    'cancelled', 1,
    '2025-04-09 14:00:00+05:30', '2025-04-09 20:00:00+05:30',
    NULL, NULL,
    255.00, 45.00, 300.00
  );

-- ============================================================================
-- SEED PAYMENTS
-- ============================================================================

INSERT INTO public.payments (booking_id, razorpay_order_id, razorpay_payment_id, amount, status, method) VALUES
  ('d0000000-0000-0000-0000-000000000001', 'order_test_001', 'pay_test_001', 640.00, 'paid', 'razorpay'),
  ('d0000000-0000-0000-0000-000000000002', 'order_test_002', 'pay_test_002', 400.00, 'paid', 'razorpay'),
  ('d0000000-0000-0000-0000-000000000003', 'order_test_003', 'pay_test_003', 960.00, 'paid', 'razorpay'),
  ('d0000000-0000-0000-0000-000000000004', 'order_test_004', NULL, 300.00, 'refunded', 'razorpay');

-- ============================================================================
-- SEED REVIEWS
-- ============================================================================

INSERT INTO public.reviews (booking_id, customer_id, partner_id, location_id, rating, comment) VALUES
  ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'p0000000-0000-0000-0000-000000000001', 'l0000000-0000-0000-0000-000000000001', 5, 'Very secure location. Staff was helpful and luggage was returned in perfect condition.');

-- ============================================================================
-- SEED NOTIFICATION PREFERENCES
-- ============================================================================

INSERT INTO public.notification_preferences (user_id, in_app, email, whatsapp, sms, push) VALUES
  ('c0000000-0000-0000-0000-000000000001', TRUE, TRUE, FALSE, FALSE, FALSE),
  ('c0000000-0000-0000-0000-000000000002', TRUE, TRUE, TRUE, FALSE, FALSE),
  ('b0000000-0000-0000-0000-000000000001', TRUE, TRUE, TRUE, FALSE, FALSE),
  ('b0000000-0000-0000-0000-000000000002', TRUE, TRUE, FALSE, FALSE, FALSE),
  ('a0000000-0000-0000-0000-000000000001', TRUE, TRUE, TRUE, TRUE, FALSE);

-- ============================================================================
-- SEED EMAIL TEMPLATES
-- ============================================================================

INSERT INTO public.email_templates (slug, subject, body_html, variables) VALUES
  ('booking_confirmed', 'Your StashInn Booking is Confirmed! 🎒',
   '<h2>Hi {{customer_name}},</h2><p>Your booking <strong>#{{booking_id}}</strong> at <strong>{{location_name}}</strong> has been confirmed.</p><p><strong>Drop-off:</strong> {{start_time}}<br/><strong>Pick-up:</strong> {{end_time}}<br/><strong>Bags:</strong> {{num_bags}}</p><p>Your check-in OTP will be sent closer to your drop-off time.</p>',
   ARRAY['customer_name', 'booking_id', 'location_name', 'start_time', 'end_time', 'num_bags']),

  ('otp_checkin', 'Your StashInn Check-in OTP: {{otp}}',
   '<h2>Hi {{customer_name}},</h2><p>Your check-in OTP for booking <strong>#{{booking_id}}</strong> is:</p><h1 style="text-align:center; color:#0066ff;">{{otp}}</h1><p>Share this OTP with the partner staff at <strong>{{location_name}}</strong> to drop off your luggage.</p><p>This OTP expires in {{expiry_minutes}} minutes.</p>',
   ARRAY['customer_name', 'booking_id', 'otp', 'location_name', 'expiry_minutes']),

  ('otp_checkout', 'Your StashInn Pick-up OTP: {{otp}}',
   '<h2>Hi {{customer_name}},</h2><p>Your pick-up OTP for booking <strong>#{{booking_id}}</strong> is:</p><h1 style="text-align:center; color:#0066ff;">{{otp}}</h1><p>Share this with the partner staff at <strong>{{location_name}}</strong> to collect your luggage.</p>',
   ARRAY['customer_name', 'booking_id', 'otp', 'location_name']),

  ('booking_cancelled', 'Booking #{{booking_id}} Cancelled',
   '<h2>Hi {{customer_name}},</h2><p>Your booking <strong>#{{booking_id}}</strong> at <strong>{{location_name}}</strong> has been cancelled.</p><p><strong>Reason:</strong> {{cancellation_reason}}</p><p>If a refund is applicable, it will be processed within 5-7 business days.</p>',
   ARRAY['customer_name', 'booking_id', 'location_name', 'cancellation_reason']),

  ('partner_approved', 'Welcome to StashInn, {{partner_name}}! 🎉',
   '<h2>Congratulations, {{partner_name}}!</h2><p>Your StashInn partner application for <strong>{{business_name}}</strong> has been approved.</p><p>You can now log into the <a href="{{partner_url}}">Partner Dashboard</a> to set up your storage locations and start receiving bookings.</p>',
   ARRAY['partner_name', 'business_name', 'partner_url']);
