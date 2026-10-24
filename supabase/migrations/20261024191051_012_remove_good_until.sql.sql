-- Remove good_until from feed_listings view
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
