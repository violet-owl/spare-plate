/*
# Fix view security + delivery_code column protection

1. Recreate all three views with SECURITY INVOKER so RLS of the querying
   user (not the view owner) applies.
2. Restrict column-level SELECT on listings so delivery_code is NOT
   directly readable. Served only via get_incoming_deliveries() (SECURITY DEFINER).
*/

DROP VIEW IF EXISTS available_food;
DROP VIEW IF EXISTS feed_listings;
DROP VIEW IF EXISTS sites;

CREATE VIEW sites WITH (security_invoker = true) AS
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

CREATE VIEW feed_listings WITH (security_invoker = true) AS
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

CREATE VIEW available_food WITH (security_invoker = true) AS
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

-- Column-level SELECT on listings: exclude delivery_code from direct reads.
REVOKE SELECT ON listings FROM authenticated, anon;
GRANT SELECT (
  id, donor_id, area_id, food_text, food_type, quantity, unit, carry_size,
  ready_from, pickup_by, temp_needs, address, pickup_instructions, allergens,
  photo_url, shelf_life_hours, pounds, safety_confirmed, created_at,
  status, runner_id, claimed_at, site_id, picked_up_at, delivered_at, expires_at
) ON listings TO authenticated;
