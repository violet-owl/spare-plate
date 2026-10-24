/*
# Spare Plate — core schema

## Overview
Spare Plate connects people with leftover food (donors) to people who need it,
via volunteer runners, dropping off at host sites (community fridges / pantries).
Receivers need no account. Launches in Fredericksburg, VA; areas are extensible.

## Tables
1. `areas` — a launch city/region (Fredericksburg, Charlottesville later).
   - id, name, slug, city, state, created_at.
2. `profiles` — one row per auth user. The `role` field decides which fields apply.
   A host profile IS the site (site name, address, hours, cold-capable all live here).
   Summary counters (pounds, donations/deliveries, hours) live here and are kept
   up to date by SECURITY DEFINER functions, never by the client.
   - id (= auth.users.id), role, area_id, display_name, phone, contact_person,
     # donor fields: donor_type, business_type, usual_close_time, address, pickup_instructions
     # runner fields: travel_mode, age_bracket, school_group
     # host/site fields: site_type, site_address, site_hours, cold_capable, open_days
     # summaries: total_pounds, total_donations, total_hours, total_deliveries, total_deliveries_received, summary_since
3. `listings` — a food donation moving through Posted -> Claimed -> Picked up -> Delivered.
   - donor_id, area_id, food_text, food_type, quantity, unit, carry_size,
     ready_from, pickup_by, temp_needs, address, pickup_instructions, allergens,
     photo_url, shelf_life_hours, pounds, safety_confirmed,
     status, runner_id, claimed_at, site_id (host_id), delivery_code,
     picked_up_at, delivered_at, expires_at, created_at.

## Views
- `sites` — public host/site info (name, type, address, hours, cold-capable, phone, area).
  Used by receiver page and runner site picker. Exposes only host profiles.
- `available_food` — Delivered, unexpired listings joined to site info, for the
  receiver page. No auth required.
- `feed_listings` — Posted listings (plus abandoned claims shown as available)
  joined to donor + area, for the runner feed.

## Functions (SECURITY DEFINER) — the only way to mutate listing status/summaries
- `claim_listing(runner uuid, listing uuid)` — exclusive atomic claim + eligibility
  (under-18 restriction). Returns the claimed row.
- `set_delivery_site(runner uuid, listing uuid, host uuid)` — sets drop-off site and
  generates the delivery code. Code is NOT returned to the runner.
- `mark_picked_up(runner uuid, listing uuid)` — Claimed -> Picked up.
- `release_claim(runner uuid, listing uuid)` — back to Posted (runner gave up).
- `release_abandoned()` — releases every Claimed listing past its pickup_by. Idempotent.
- `confirm_delivery(runner uuid, listing uuid, code text)` — all-or-nothing: verifies
  code, closes job, credits runner hours (min 15 min), updates donor/runner/host
  summaries + community total together.
- `get_incoming_deliveries(host uuid)` — returns food heading to this host's site,
  INCLUDING the delivery code. Only the host of that site can call it usefully
  (RLS-free inside, but the caller's uid filters rows).

## Security
- RLS enabled on `areas`, `profiles`, `listings`.
- `profiles`: owner can SELECT/UPDATE own row. INSERT via trigger on auth.users
  (signup). The `sites` view is public (anon + authenticated SELECT).
- `listings`: donors SELECT/INSERT/UPDATE their own (UPDATE only while Posted and
  only non-status columns). Runners SELECT feed + their own claimed rows but NOT
  the delivery_code column. Hosts SELECT incoming rows but the code is only served
  through `get_incoming_deliveries`. The status/runner_id/site_id/delivery_code/
  claimed_at/picked_up_at/delivered_at columns are NOT client-writable: updates go
  only through SECURITY DEFINER functions (column-level GRANT excludes them).
- `available_food`, `feed_listings`, `sites`: public SELECT (anon + authenticated).
- Community totals table `community_totals` (single row): public SELECT, no public
  write (updated only by confirm_delivery).
- All SECURITY DEFINER functions: REVOKE from PUBLIC/anon, GRANT EXECUTE to authenticated.

## Notes
1. Email/password auth (donors, runners, hosts). Receivers never sign in.
2. Location is never stored for receivers — sorting happens client-side from the
   browser geolocation against site coordinates stored on the host profile.
3. Photos stored in Supabase Storage `listing-photos` bucket (public read).
*/

-- ============================================================
-- areas
-- ============================================================
CREATE TABLE IF NOT EXISTS areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  lat double precision,
  lng double precision,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE areas ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON areas TO anon, authenticated;
DROP POLICY IF EXISTS "areas_read_all" ON areas;
CREATE POLICY "areas_read_all" ON areas FOR SELECT
  TO anon, authenticated USING (true);

-- ============================================================
-- profiles  (one row per auth user; host = site)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('donor','runner','host')),
  area_id uuid REFERENCES areas(id) ON DELETE SET NULL,
  display_name text NOT NULL,
  phone text,
  contact_person text,
  created_at timestamptz NOT NULL DEFAULT now(),

  -- donor-specific
  donor_type text CHECK (donor_type IN ('individual','business')),
  business_type text CHECK (business_type IN ('cafe','restaurant','grocery','bakery','other')),
  usual_close_time text,
  address text,
  pickup_instructions text,

  -- runner-specific
  travel_mode text CHECK (travel_mode IN ('walk','bike','car')),
  age_bracket text CHECK (age_bracket IN ('under_18','adult')),
  school_group text,

  -- host / site-specific (host profile IS the site)
  site_type text CHECK (site_type IN ('community_fridge','church_pantry','small_org','other')),
  site_address text,
  site_lat double precision,
  site_lng double precision,
  site_hours text,
  open_days text,
  cold_capable boolean NOT NULL DEFAULT false,
  open_hour int,
  close_hour int,

  -- running summaries (kept up to date by SECURITY DEFINER functions)
  total_pounds numeric NOT NULL DEFAULT 0,
  total_donations int NOT NULL DEFAULT 0,
  total_hours numeric NOT NULL DEFAULT 0,
  total_deliveries int NOT NULL DEFAULT 0,
  total_deliveries_received int NOT NULL DEFAULT 0,
  summary_since timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Owner can read + update own profile. INSERT is via trigger on signup.
GRANT SELECT, UPDATE ON profiles TO authenticated;
DROP POLICY IF EXISTS "profile_owner_select" ON profiles;
CREATE POLICY "profile_owner_select" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);
DROP POLICY IF EXISTS "profile_owner_update" ON profiles;
CREATE POLICY "profile_owner_update" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- sites view: public host/site info (no private contact beyond what a site must show)
CREATE OR REPLACE VIEW sites AS
SELECT
  p.id AS host_id,
  p.area_id,
  p.display_name AS site_name,
  p.site_type,
  p.site_address,
  p.site_lat,
  p.site_lng,
  p.site_hours,
  p.open_days,
  p.open_hour,
  p.close_hour,
  p.cold_capable,
  p.phone,
  p.contact_person
FROM profiles p
WHERE p.role = 'host';

GRANT SELECT ON sites TO anon, authenticated;

-- ============================================================
-- listings
-- ============================================================
CREATE TABLE IF NOT EXISTS listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  area_id uuid NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
  food_text text NOT NULL,
  food_type text NOT NULL CHECK (food_type IN ('prepared_meal','baked_goods','produce','packaged','drinks')),
  quantity numeric NOT NULL DEFAULT 0,
  unit text NOT NULL,
  carry_size text NOT NULL CHECK (carry_size IN ('one_bag','one_box','needs_car')),
  ready_from timestamptz NOT NULL,
  pickup_by timestamptz NOT NULL,
  temp_needs text NOT NULL CHECK (temp_needs IN ('cold','room_temp','hot')),
  address text NOT NULL,
  pickup_instructions text,
  allergens text,
  photo_url text,
  shelf_life_hours int NOT NULL DEFAULT 24,
  pounds numeric NOT NULL DEFAULT 0,
  safety_confirmed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),

  -- lifecycle (client cannot write these directly; functions do)
  status text NOT NULL DEFAULT 'posted' CHECK (status IN ('posted','claimed','picked_up','delivered','cancelled')),
  runner_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  claimed_at timestamptz,
  site_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  delivery_code text,
  picked_up_at timestamptz,
  delivered_at timestamptz,
  expires_at timestamptz
);

CREATE INDEX IF NOT EXISTS listings_status_idx ON listings(status);
CREATE INDEX IF NOT EXISTS listings_donor_idx ON listings(donor_id);
CREATE INDEX IF NOT EXISTS listings_area_status_idx ON listings(area_id, status);
CREATE INDEX IF NOT EXISTS listings_runner_idx ON listings(runner_id);
CREATE INDEX IF NOT EXISTS listings_site_idx ON listings(site_id);

ALTER TABLE listings ENABLE ROW LEVEL SECURITY;

-- Donors: full CRUD on their own listings, but UPDATE must NOT touch status columns.
-- We grant UPDATE on only the editable columns (a donor may edit only while Posted,
-- enforced by a WITH CHECK on status = 'posted').
GRANT SELECT, INSERT, DELETE ON listings TO authenticated;
-- Donors can update only the editable (non-lifecycle) columns, and only while posted.
GRANT UPDATE (food_text, food_type, quantity, unit, carry_size, ready_from, pickup_by,
  temp_needs, address, pickup_instructions, allergens, photo_url, shelf_life_hours,
  pounds, safety_confirmed) ON listings TO authenticated;

DROP POLICY IF EXISTS "listings_donor_select" ON listings;
CREATE POLICY "listings_donor_select" ON listings FOR SELECT
  TO authenticated USING (donor_id = auth.uid());

DROP POLICY IF EXISTS "listings_runner_select" ON listings;
-- Runners see the feed (posted + abandoned) and their own active jobs, but the
-- delivery_code column is excluded via column-level GRANT (not granted to them).
CREATE POLICY "listings_runner_select" ON listings FOR SELECT
  TO authenticated USING (
    donor_id = auth.uid()
    OR runner_id = auth.uid()
    OR status = 'posted'
    OR (status = 'claimed' AND now() > pickup_by)
  );

DROP POLICY IF EXISTS "listings_host_select" ON listings;
-- Hosts see listings whose site is theirs, but the delivery_code is served only
-- through get_incoming_deliveries (the column itself is not granted to them).
CREATE POLICY "listings_host_select" ON listings FOR SELECT
  TO authenticated USING (
    site_id = auth.uid()
  );

DROP POLICY IF EXISTS "listings_donor_insert" ON listings;
CREATE POLICY "listings_donor_insert" ON listings FOR INSERT
  TO authenticated WITH CHECK (donor_id = auth.uid());

DROP POLICY IF EXISTS "listings_donor_update" ON listings;
CREATE POLICY "listings_donor_update" ON listings FOR UPDATE
  TO authenticated USING (donor_id = auth.uid())
  WITH CHECK (donor_id = auth.uid() AND status = 'posted');

DROP POLICY IF EXISTS "listings_donor_delete" ON listings;
CREATE POLICY "listings_donor_delete" ON listings FOR DELETE
  TO authenticated USING (donor_id = auth.uid() AND status = 'posted');

-- ============================================================
-- community_totals (single row)
-- ============================================================
CREATE TABLE IF NOT EXISTS community_totals (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  total_pounds numeric NOT NULL DEFAULT 0,
  total_meals numeric NOT NULL DEFAULT 0,
  total_deliveries int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO community_totals (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE community_totals ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON community_totals TO anon, authenticated;
DROP POLICY IF EXISTS "community_totals_read" ON community_totals;
CREATE POLICY "community_totals_read" ON community_totals FOR SELECT
  TO anon, authenticated USING (true);

-- ============================================================
-- feed_listings view (runner feed: posted + abandoned-as-available)
-- ============================================================
CREATE OR REPLACE VIEW feed_listings AS
SELECT
  l.id,
  l.donor_id,
  l.area_id,
  l.food_text,
  l.food_type,
  l.quantity,
  l.unit,
  l.carry_size,
  l.ready_from,
  l.pickup_by,
  l.temp_needs,
  l.address,
  l.pickup_instructions,
  l.allergens,
  l.photo_url,
  l.shelf_life_hours,
  l.pounds,
  l.safety_confirmed,
  l.created_at,
  CASE WHEN l.status = 'claimed' AND now() > l.pickup_by THEN 'posted' ELSE l.status END AS effective_status
FROM listings l
WHERE l.status = 'posted'
   OR (l.status = 'claimed' AND now() > l.pickup_by)
ORDER BY l.created_at DESC;

GRANT SELECT ON feed_listings TO anon, authenticated;

-- ============================================================
-- available_food view (receiver page: delivered + unexpired)
-- ============================================================
CREATE OR REPLACE VIEW available_food AS
SELECT
  l.id,
  l.food_text,
  l.food_type,
  l.photo_url,
  l.delivered_at,
  l.expires_at,
  l.shelf_life_hours,
  l.temp_needs,
  l.area_id,
  s.site_name,
  s.site_address,
  s.site_lat,
  s.site_lng,
  s.phone,
  s.site_hours,
  s.open_hour,
  s.close_hour,
  s.cold_capable,
  s.host_id
FROM listings l
JOIN sites s ON s.host_id = l.site_id
WHERE l.status = 'delivered'
  AND l.expires_at IS NOT NULL
  AND l.expires_at > now();

GRANT SELECT ON available_food TO anon, authenticated;

-- ============================================================
-- Profile auto-create on signup
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, role, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'role', 'donor'),
          COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- release_abandoned() — releases every claimed listing past pickup_by
-- ============================================================
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
      delivery_code = NULL,
      picked_up_at = NULL
  WHERE status = 'claimed'
    AND now() > pickup_by;
END;
$$;

REVOKE EXECUTE ON FUNCTION release_abandoned() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION release_abandoned() TO authenticated;

-- ============================================================
-- claim_listing(runner, listing) — exclusive atomic claim + eligibility
-- ============================================================
CREATE OR REPLACE FUNCTION claim_listing(p_runner uuid, p_listing uuid)
RETURNS table(id uuid, food_text text, carry_size text, pickup_by timestamptz, status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_runner_age text;
  v_runner_travel text;
  v_carry text;
  v_pickup_by timestamptz;
BEGIN
  -- eligibility: under-18 can only take one_bag jobs.
  SELECT age_bracket, travel_mode INTO v_runner_age, v_runner_travel
  FROM profiles WHERE id = p_runner;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Runner profile not found';
  END IF;

  SELECT carry_size, pickup_by INTO v_carry, v_pickup_by
  FROM listings WHERE id = p_listing FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Listing not found';
  END IF;

  -- release any abandoned claims first (including this one if abandoned)
  PERFORM release_abandoned();

  -- re-lock the listing after the cleanup
  SELECT carry_size INTO v_carry FROM listings WHERE id = p_listing FOR UPDATE;

  -- under-18 restriction: only one_bag (walkable) jobs
  IF v_runner_age = 'under_18' AND v_carry <> 'one_bag' THEN
    RAISE EXCEPTION 'Under-18 runners can only claim one-bag listings';
  END IF;

  -- atomic exclusive claim: only succeeds if still posted
  UPDATE listings
  SET status = 'claimed',
      runner_id = p_runner,
      claimed_at = now()
  WHERE id = p_listing
    AND status = 'posted';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Listing is no longer available';
  END IF;

  RETURN QUERY SELECT id, food_text, carry_size, pickup_by, status FROM listings WHERE id = p_listing;
END;
$$;

REVOKE EXECUTE ON FUNCTION claim_listing(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION claim_listing(uuid, uuid) TO authenticated;

-- ============================================================
-- set_delivery_site(runner, listing, host) — sets site + generates code
-- ============================================================
CREATE OR REPLACE FUNCTION set_delivery_site(p_runner uuid, p_listing uuid, p_host uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cold boolean;
  v_temp text;
  v_host_cold boolean;
BEGIN
  -- verify ownership of the claim
  PERFORM 1 FROM listings
   WHERE id = p_listing AND runner_id = p_runner AND status = 'claimed'
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'You have not claimed this listing';
  END IF;

  -- cold-capable site check
  SELECT temp_needs INTO v_temp FROM listings WHERE id = p_listing;
  SELECT cold_capable INTO v_host_cold FROM profiles WHERE id = p_host AND role = 'host';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Site not found';
  END IF;
  IF v_temp = 'cold' AND v_host_cold = false THEN
    RAISE EXCEPTION 'This site cannot take cold food';
  END IF;

  UPDATE listings
  SET site_id = p_host,
      delivery_code = lpad(floor(random() * 1000000)::text, 6, '0')
  WHERE id = p_listing AND runner_id = p_runner AND status = 'claimed';
END;
$$;

REVOKE EXECUTE ON FUNCTION set_delivery_site(uuid, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION set_delivery_site(uuid, uuid, uuid) TO authenticated;

-- ============================================================
-- mark_picked_up(runner, listing)
-- ============================================================
CREATE OR REPLACE FUNCTION mark_picked_up(p_runner uuid, p_listing uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE listings
  SET status = 'picked_up', picked_up_at = now()
  WHERE id = p_listing
    AND runner_id = p_runner
    AND status = 'claimed';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cannot mark picked up';
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION mark_picked_up(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION mark_picked_up(uuid, uuid) TO authenticated;

-- ============================================================
-- release_claim(runner, listing) — runner gives up -> back to posted
-- ============================================================
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
      delivery_code = NULL,
      picked_up_at = NULL
  WHERE id = p_listing
    AND runner_id = p_runner
    AND status IN ('claimed', 'picked_up');
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cannot release this listing';
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION release_claim(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION release_claim(uuid, uuid) TO authenticated;

-- ============================================================
-- confirm_delivery(runner, listing, code) — all-or-nothing close + summaries
-- ============================================================
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
  IF v_listing.delivery_code IS NULL OR v_listing.delivery_code <> p_code THEN
    RAISE EXCEPTION 'Wrong code';
  END IF;
  IF v_listing.site_id IS NULL THEN
    RAISE EXCEPTION 'No drop-off site selected';
  END IF;

  -- hours: from claim until now, min 15 min
  v_hours := GREATEST(extract(epoch FROM (now() - v_listing.claimed_at)) / 3600.0, 0.25);
  v_hours := round(v_hours::numeric, 2);

  v_host_id := v_listing.site_id;
  v_donor_id := v_listing.donor_id;
  v_pounds := v_listing.pounds;
  v_meals := round((v_pounds / 1.2)::numeric, 0);

  -- close the job
  UPDATE listings
  SET status = 'delivered',
      delivered_at = now(),
      expires_at = now() + (v_listing.shelf_life_hours || ' hours')::interval
  WHERE id = p_listing;

  -- donor summary
  UPDATE profiles SET
    total_pounds = total_pounds + v_pounds,
    total_donations = total_donations + 1
  WHERE id = v_donor_id;

  -- runner summary
  UPDATE profiles SET
    total_hours = total_hours + v_hours,
    total_deliveries = total_deliveries + 1
  WHERE id = p_runner;

  -- host summary
  UPDATE profiles SET
    total_pounds = total_pounds + v_pounds,
    total_deliveries_received = total_deliveries_received + 1
  WHERE id = v_host_id;

  -- community total
  UPDATE community_totals SET
    total_pounds = total_pounds + v_pounds,
    total_meals = total_meals + v_meals,
    total_deliveries = total_deliveries + 1,
    updated_at = now()
  WHERE id = 1;

  RETURN QUERY SELECT p_listing, 'delivered'::text, v_hours;
END;
$$;

REVOKE EXECUTE ON FUNCTION confirm_delivery(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION confirm_delivery(uuid, uuid, text) TO authenticated;

-- ============================================================
-- get_incoming_deliveries(host) — returns incoming food + delivery code
-- Only the host of the site sees the code (caller uid filters).
-- ============================================================
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
         l.status, p.display_name AS runner_name, l.delivery_code,
         l.claimed_at, l.picked_up_at, d.display_name AS donor_name, l.temp_needs
  FROM listings l
  JOIN profiles p ON p.id = l.runner_id
  JOIN profiles d ON d.id = l.donor_id
  WHERE l.site_id = p_host
    AND l.status IN ('claimed','picked_up')
  ORDER BY l.claimed_at DESC;
END;
$$;

REVOKE EXECUTE ON FUNCTION get_incoming_deliveries(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_incoming_deliveries(uuid) TO authenticated;
