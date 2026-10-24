/*
# Move delivery_code to a separate host-only table

## Problem
Migration 004 revoked table-level SELECT on listings and replaced it with a
column-level grant that excluded delivery_code. PostgREST (the Data API)
requires a table-level SELECT grant to access a table at all — column-level
grants alone cause every operation (including INSERT … RETURNING) to fail
with 42501 "permission denied for table listings".

## Fix
1. Create a `delivery_codes` table that holds the code per listing.
   RLS: only the host of the site (site_id on the listing) can SELECT it.
   SECURITY DEFINER functions write/read it (they bypass RLS).
2. Grant full table-level SELECT on listings back to authenticated.
   The delivery_code column on listings stays (not dropped, per data-safety
   rules) but is zeroed out and no longer used — the real code lives in
   delivery_codes now.
3. Update set_delivery_site, confirm_delivery, and get_incoming_deliveries
   to use the delivery_codes table instead of listings.delivery_code.

## Security
- delivery_codes: RLS enabled, SELECT only for the host of the site.
- listings: full table-level SELECT restored (the delivery_code column is
  now always NULL, so there is nothing sensitive to protect on it).
- Rule 2 still holds: the code is visible only to the host, served through
  get_incoming_deliveries (SECURITY DEFINER) or the delivery_codes RLS policy.
*/

-- 1. Create delivery_codes table
CREATE TABLE IF NOT EXISTS delivery_codes (
  listing_id uuid PRIMARY KEY REFERENCES listings(id) ON DELETE CASCADE,
  code text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE delivery_codes ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON delivery_codes TO authenticated;

-- Host can read the code for listings whose site is theirs
DROP POLICY IF EXISTS "delivery_codes_host_select" ON delivery_codes;
CREATE POLICY "delivery_codes_host_select" ON delivery_codes FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM listings
      WHERE listings.id = delivery_codes.listing_id
        AND listings.site_id = auth.uid()
    )
  );

-- 2. Restore full table-level SELECT on listings
REVOKE SELECT ON listings FROM authenticated, anon;
GRANT SELECT ON listings TO authenticated;

-- 3. Migrate existing codes into the new table, then null out the old column
INSERT INTO delivery_codes (listing_id, code)
SELECT id, delivery_code FROM listings
WHERE delivery_code IS NOT NULL
ON CONFLICT (listing_id) DO NOTHING;

UPDATE listings SET delivery_code = NULL WHERE delivery_code IS NOT NULL;

-- 4. Update set_delivery_site to write to delivery_codes
CREATE OR REPLACE FUNCTION set_delivery_site(p_runner uuid, p_listing uuid, p_host uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_temp text;
  v_host_cold boolean;
BEGIN
  PERFORM 1 FROM listings
   WHERE id = p_listing AND runner_id = p_runner AND status = 'claimed'
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'You have not claimed this listing';
  END IF;

  SELECT temp_needs INTO v_temp FROM listings WHERE id = p_listing;
  SELECT cold_capable INTO v_host_cold FROM profiles WHERE id = p_host AND role = 'host';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Site not found';
  END IF;
  IF v_temp = 'cold' AND v_host_cold = false THEN
    RAISE EXCEPTION 'This site cannot take cold food';
  END IF;

  UPDATE listings
  SET site_id = p_host
  WHERE id = p_listing AND runner_id = p_runner AND status = 'claimed';

  INSERT INTO delivery_codes (listing_id, code)
  VALUES (p_listing, lpad(floor(random() * 1000000)::text, 6, '0'))
  ON CONFLICT (listing_id) DO UPDATE SET code = EXCLUDED.code, created_at = now();
END;
$$;

REVOKE EXECUTE ON FUNCTION set_delivery_site(uuid, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION set_delivery_site(uuid, uuid, uuid) TO authenticated;

-- 5. Update confirm_delivery to read from delivery_codes
CREATE OR REPLACE FUNCTION confirm_delivery(p_runner uuid, p_listing uuid, p_code text)
RETURNS table(id uuid, status text, hours_credited numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_listing RECORD;
  v_hours numeric;
  v_host_id uuid;
  v_donor_id uuid;
  v_pounds numeric;
  v_meals numeric;
  v_actual_code text;
BEGIN
  SELECT * INTO v_listing FROM listings WHERE id = p_listing FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Listing not found';
  END IF;

  IF v_listing.runner_id <> p_runner THEN
    RAISE EXCEPTION 'Not your job';
  END IF;
  IF v_listing.status NOT IN ('claimed','picked_up') THEN
    RAISE EXCEPTION 'Job is not active';
  END IF;
  IF v_listing.site_id IS NULL THEN
    RAISE EXCEPTION 'No drop-off site selected';
  END IF;

  SELECT code INTO v_actual_code FROM delivery_codes WHERE listing_id = p_listing;
  IF v_actual_code IS NULL OR v_actual_code <> p_code THEN
    RAISE EXCEPTION 'Wrong code';
  END IF;

  v_hours := GREATEST(extract(epoch FROM (now() - v_listing.claimed_at)) / 3600.0, 0.25);
  v_hours := round(v_hours::numeric, 2);

  v_host_id := v_listing.site_id;
  v_donor_id := v_listing.donor_id;
  v_pounds := v_listing.pounds;
  v_meals := round((v_pounds / 1.2)::numeric, 0);

  UPDATE listings
  SET status = 'delivered',
      delivered_at = now(),
      expires_at = now() + (v_listing.shelf_life_hours || ' hours')::interval
  WHERE id = p_listing;

  UPDATE profiles SET
    total_pounds = total_pounds + v_pounds,
    total_donations = total_donations + 1
  WHERE id = v_donor_id;

  UPDATE profiles SET
    total_hours = total_hours + v_hours,
    total_deliveries = total_deliveries + 1
  WHERE id = p_runner;

  UPDATE profiles SET
    total_pounds = total_pounds + v_pounds,
    total_deliveries_received = total_deliveries_received + 1
  WHERE id = v_host_id;

  UPDATE community_totals SET
    total_pounds = total_pounds + v_pounds,
    total_meals = total_meals + v_meals,
    total_deliveries = total_deliveries + 1,
    updated_at = now()
  WHERE id = 1;

  -- Clean up the code (no longer needed after delivery)
  DELETE FROM delivery_codes WHERE listing_id = p_listing;

  RETURN QUERY SELECT p_listing, 'delivered'::text, v_hours;
END;
$$;

REVOKE EXECUTE ON FUNCTION confirm_delivery(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION confirm_delivery(uuid, uuid, text) TO authenticated;

-- 6. Update release_claim and release_abandoned to also clear delivery_codes
CREATE OR REPLACE FUNCTION release_claim(p_runner uuid, p_listing uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE listings
  SET status = 'posted',
      runner_id = NULL,
      claimed_at = NULL,
      site_id = NULL,
      picked_up_at = NULL
  WHERE id = p_listing
    AND runner_id = p_runner
    AND status IN ('claimed', 'picked_up');
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cannot release this listing';
  END IF;
  DELETE FROM delivery_codes WHERE listing_id = p_listing;
END;
$$;

REVOKE EXECUTE ON FUNCTION release_claim(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION release_claim(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION release_abandoned()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE listings
  SET status = 'posted',
      runner_id = NULL,
      claimed_at = NULL,
      site_id = NULL,
      picked_up_at = NULL
  WHERE status = 'claimed'
    AND now() > pickup_by;

  DELETE FROM delivery_codes
  WHERE listing_id IN (
    SELECT id FROM listings WHERE status = 'posted' AND claimed_at IS NULL
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION release_abandoned() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION release_abandoned() TO authenticated;

-- 7. Update get_incoming_deliveries to join delivery_codes
CREATE OR REPLACE FUNCTION get_incoming_deliveries(p_host uuid)
RETURNS table(
  id uuid,
  food_text text,
  food_type text,
  quantity numeric,
  unit text,
  carry_size text,
  status text,
  runner_name text,
  delivery_code text,
  claimed_at timestamptz,
  picked_up_at timestamptz,
  donor_name text,
  temp_needs text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_host IS NULL OR p_host <> auth.uid() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT l.id, l.food_text, l.food_type, l.quantity, l.unit, l.carry_size,
         l.status, p.display_name AS runner_name, dc.code AS delivery_code,
         l.claimed_at, l.picked_up_at, d.display_name AS donor_name, l.temp_needs
  FROM listings l
  JOIN profiles p ON p.id = l.runner_id
  JOIN profiles d ON d.id = l.donor_id
  LEFT JOIN delivery_codes dc ON dc.listing_id = l.id
  WHERE l.site_id = p_host
    AND l.status IN ('claimed','picked_up')
  ORDER BY l.claimed_at DESC;
END;
$$;

REVOKE EXECUTE ON FUNCTION get_incoming_deliveries(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_incoming_deliveries(uuid) TO authenticated;
