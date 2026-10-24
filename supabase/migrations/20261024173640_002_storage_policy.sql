/*
# Storage policy for listing-photos bucket
Public read, authenticated upload (donors upload their own listing photos).
*/
CREATE POLICY "listing_photos_public_read" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'listing-photos');

CREATE POLICY "listing_photos_auth_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'listing-photos');

CREATE POLICY "listing_photos_owner_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'listing-photos' AND owner = auth.uid());