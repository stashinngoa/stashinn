-- ============================================================================
-- StashInn Portal — Default email templates
-- Migration: 20261031000001_default_email_templates
--
-- The templates used to live only in seed.sql, which never runs on the hosted project,
-- so Admin → Configuration showed no templates and partner approval emails fell back to
-- plain text. Existing templates (matched by slug) are left untouched.
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
   ARRAY['partner_name', 'business_name', 'partner_url'])
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- ROLLBACK INSTRUCTIONS:
-- DELETE FROM public.email_templates WHERE slug IN
--   ('booking_confirmed', 'otp_checkin', 'otp_checkout', 'booking_cancelled', 'partner_approved');
-- ============================================================================
