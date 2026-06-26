-- ============================================================================
-- StashInn Portal — Storage Bucket Configuration
-- Migration: 20250411000003_storage_buckets
--
-- Creates Supabase Storage buckets for profile photos, location images,
-- KYC documents, damage evidence, and payment proofs.
-- ============================================================================

-- 1. Profile Avatars — public read, authenticated upload
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  TRUE,
  2097152,  -- 2 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
);

-- 2. Location Photos — public read (displayed in search results)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'location-photos',
  'location-photos',
  TRUE,
  5242880,  -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
);

-- 3. KYC Documents — private (admin + partner only)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'kyc-documents',
  'kyc-documents',
  FALSE,
  10485760,  -- 10 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
);

-- 4. Damage Evidence Photos — private (partner + admin only)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'damage-photos',
  'damage-photos',
  FALSE,
  5242880,  -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
);

-- 5. Payment Transfer Proofs — private (partner + admin only)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-proofs',
  'payment-proofs',
  FALSE,
  5242880,  -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
);

-- ============================================================================
-- Storage RLS Policies
-- ============================================================================

-- AVATARS: Users can upload/update their own avatar, anyone can view
CREATE POLICY avatars_select ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY avatars_insert ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::TEXT);

CREATE POLICY avatars_update ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::TEXT);

CREATE POLICY avatars_delete ON storage.objects FOR DELETE
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::TEXT);

-- LOCATION PHOTOS: Partners can manage their own, public can view
CREATE POLICY location_photos_select ON storage.objects FOR SELECT
  USING (bucket_id = 'location-photos');

CREATE POLICY location_photos_insert ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'location-photos'
    AND (storage.foldername(name))[1] = (SELECT id::TEXT FROM public.partners WHERE user_id = auth.uid())
  );

CREATE POLICY location_photos_update ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'location-photos'
    AND (storage.foldername(name))[1] = (SELECT id::TEXT FROM public.partners WHERE user_id = auth.uid())
  );

CREATE POLICY location_photos_delete ON storage.objects FOR DELETE
  USING (
    bucket_id = 'location-photos'
    AND (storage.foldername(name))[1] = (SELECT id::TEXT FROM public.partners WHERE user_id = auth.uid())
  );

-- KYC DOCUMENTS: Partners upload their own, admins can view all
CREATE POLICY kyc_partner_insert ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'kyc-documents'
    AND (storage.foldername(name))[1] = (SELECT id::TEXT FROM public.partners WHERE user_id = auth.uid())
  );

CREATE POLICY kyc_partner_select ON storage.objects FOR SELECT
  USING (
    bucket_id = 'kyc-documents'
    AND (
      (storage.foldername(name))[1] = (SELECT id::TEXT FROM public.partners WHERE user_id = auth.uid())
      OR public.is_admin()
    )
  );

-- DAMAGE PHOTOS: Partners upload, partners + admins can view
CREATE POLICY damage_photos_insert ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'damage-photos'
    AND (storage.foldername(name))[1] = (SELECT id::TEXT FROM public.partners WHERE user_id = auth.uid())
  );

CREATE POLICY damage_photos_select ON storage.objects FOR SELECT
  USING (
    bucket_id = 'damage-photos'
    AND (
      (storage.foldername(name))[1] = (SELECT id::TEXT FROM public.partners WHERE user_id = auth.uid())
      OR public.is_admin()
    )
  );

-- PAYMENT PROOFS: Partners upload, partners + admins can view
CREATE POLICY payment_proofs_insert ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'payment-proofs'
    AND (storage.foldername(name))[1] = (SELECT id::TEXT FROM public.partners WHERE user_id = auth.uid())
  );

CREATE POLICY payment_proofs_select ON storage.objects FOR SELECT
  USING (
    bucket_id = 'payment-proofs'
    AND (
      (storage.foldername(name))[1] = (SELECT id::TEXT FROM public.partners WHERE user_id = auth.uid())
      OR public.is_admin()
    )
  );
