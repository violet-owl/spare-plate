/*
# Replace ready_from with good_until; set drop-off sites open 24/7

## Changes
1. Add `good_until timestamptz NOT NULL` to listings (backfilled from pickup_by).
2. Make `ready_from` nullable (kept for data safety, no longer used by app).
3. Grant UPDATE on good_until.
4. Drop and recreate feed_listings view with good_until instead of ready_from.
5. Set all host sites to 24/7: open_days all week, open_hour=0, close_hour=24,
   site_hours='Open 24/7'.
6. Drop and recreate available_food view (same columns, but sites are 24/7 now).
*/

-- 1. Add good_until column
ALTER TABLE listings ADD COLUMN IF NOT EXISTS good_until timestamptz;
UPDATE listings SET good_until = pickup_by WHERE good_until IS NULL;
ALTER TABLE listings ALTER COLUMN good_until SET NOT NULL;

-- 2. Make ready_from nullable (no longer used by app)
ALTER TABLE listings ALTER COLUMN ready_from DROP NOT NULL;
UPDATE listings SET ready_from = created_at WHERE ready_from IS NULL;

-- 3. Grant UPDATE on good_until
GRANT UPDATE (good_until) ON listings TO authenticated;

-- 4. Drop and recreate feed_listings view with good_until
DROP VIEW IF EXISTS feed_listings;
CREATE VIEW feed_listings AS
SELECT
  l.id,
  l.donor_id,
  l.area_id,
  l.food_text,
  l.food_type,
  l.quantity,
  l.unit,
  l.carry_size,
  l.good_until,
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

-- 5. Set all sites to 24/7
UPDATE profiles SET
  open_days = 'Mon,Tue,Wed,Thu,Fri,Sat,Sun',
  open_hour = 0,
  close_hour = 24,
  site_hours = 'Open 24/7'
WHERE role = 'host';

-- 6. Recreate available_food view (same shape, sites now 24/7)
DROP VIEW IF EXISTS available_food;
CREATE VIEW available_food AS
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
