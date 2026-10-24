/*
# Sample data for Spare Plate demo

Creates demo auth users + profiles for donors, runners, and the six
Fredericksburg host sites, plus listings at different statuses.

All demo users share password: demo1234
Marked as SAMPLE where appropriate (site hours, etc.).
*/

-- Areas
INSERT INTO areas (id, name, slug, city, state, lat, lng)
SELECT '11111111-1111-1111-1111-111111111111', 'Fredericksburg', 'fredericksburg', 'Fredericksburg', 'VA', 38.3032, -77.4605
WHERE NOT EXISTS (SELECT 1 FROM areas WHERE slug = 'fredericksburg');

-- Donors
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, raw_user_meta_data, aud, role)
SELECT 'a1000000-0000-0000-0000-000000000001', 'donor1@spareplate.app',
   crypt('demo1234', gen_salt('bf')), now(), now(),
   jsonb_build_object('role','donor','display_name','Amy Clark'), 'authenticated', 'authenticated'
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'donor1@spareplate.app');

INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, raw_user_meta_data, aud, role)
SELECT 'a1000000-0000-0000-0000-000000000002', 'donor2@spareplate.app',
   crypt('demo1234', gen_salt('bf')), now(), now(),
   jsonb_build_object('role','donor','display_name','Fredericksburg Bakery'), 'authenticated', 'authenticated'
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'donor2@spareplate.app');

INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, raw_user_meta_data, aud, role)
SELECT 'a1000000-0000-0000-0000-000000000003', 'donor3@spareplate.app',
   crypt('demo1234', gen_salt('bf')), now(), now(),
   jsonb_build_object('role','donor','display_name','Maple Cafe'), 'authenticated', 'authenticated'
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'donor3@spareplate.app');

-- Runners
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, raw_user_meta_data, aud, role)
SELECT 'b2000000-0000-0000-0000-000000000001', 'runner1@spareplate.app',
   crypt('demo1234', gen_salt('bf')), now(), now(),
   jsonb_build_object('role','runner','display_name','Jordan Lee'), 'authenticated', 'authenticated'
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'runner1@spareplate.app');

INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, raw_user_meta_data, aud, role)
SELECT 'b2000000-0000-0000-0000-000000000002', 'runner2@spareplate.app',
   crypt('demo1234', gen_salt('bf')), now(), now(),
   jsonb_build_object('role','runner','display_name','Sam Rivera'), 'authenticated', 'authenticated'
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'runner2@spareplate.app');

-- Hosts (the six Fredericksburg sites)
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, raw_user_meta_data, aud, role)
SELECT 'c3000000-0000-0000-0000-000000000001', 'host1@spareplate.app',
   crypt('demo1234', gen_salt('bf')), now(), now(),
   jsonb_build_object('role','host','display_name','Downtown Greens Free Fridge'), 'authenticated', 'authenticated'
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'host1@spareplate.app');

INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, raw_user_meta_data, aud, role)
SELECT 'c3000000-0000-0000-0000-000000000002', 'host2@spareplate.app',
   crypt('demo1234', gen_salt('bf')), now(), now(),
   jsonb_build_object('role','host','display_name','UMW Gwen Hale Resource Center'), 'authenticated', 'authenticated'
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'host2@spareplate.app');

INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, raw_user_meta_data, aud, role)
SELECT 'c3000000-0000-0000-0000-000000000003', 'host3@spareplate.app',
   crypt('demo1234', gen_salt('bf')), now(), now(),
   jsonb_build_object('role','host','display_name','Trinity Episcopal Church'), 'authenticated', 'authenticated'
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'host3@spareplate.app');

INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, raw_user_meta_data, aud, role)
SELECT 'c3000000-0000-0000-0000-000000000004', 'host4@spareplate.app',
   crypt('demo1234', gen_salt('bf')), now(), now(),
   jsonb_build_object('role','host','display_name','Fairview Baptist Church'), 'authenticated', 'authenticated'
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'host4@spareplate.app');

INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, raw_user_meta_data, aud, role)
SELECT 'c3000000-0000-0000-0000-000000000005', 'host5@spareplate.app',
   crypt('demo1234', gen_salt('bf')), now(), now(),
   jsonb_build_object('role','host','display_name','Emmanuel AME Church'), 'authenticated', 'authenticated'
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'host5@spareplate.app');

INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, raw_user_meta_data, aud, role)
SELECT 'c3000000-0000-0000-0000-000000000006', 'host6@spareplate.app',
   crypt('demo1234', gen_salt('bf')), now(), now(),
   jsonb_build_object('role','host','display_name','Eastland United Methodist Church'), 'authenticated', 'authenticated'
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'host6@spareplate.app');

-- Update donor profiles with full details
UPDATE profiles SET
  area_id = '11111111-1111-1111-1111-111111111111',
  phone = '540-555-0101', contact_person = 'Amy Clark',
  donor_type = 'individual',
  address = '1204 Caroline St, Fredericksburg, VA 22401',
  total_pounds = 42, total_donations = 6, summary_since = '2026-09-01'
WHERE id = 'a1000000-0000-0000-0000-000000000001';

UPDATE profiles SET
  area_id = '11111111-1111-1111-1111-111111111111',
  phone = '540-555-0102', contact_person = 'Pat Dough',
  donor_type = 'business', business_type = 'bakery', usual_close_time = '18:00',
  address = '810 William St, Fredericksburg, VA 22401',
  pickup_instructions = 'Back door, ask for Pat.',
  total_pounds = 118, total_donations = 14, summary_since = '2026-08-15'
WHERE id = 'a1000000-0000-0000-0000-000000000002';

UPDATE profiles SET
  area_id = '11111111-1111-1111-1111-111111111111',
  phone = '540-555-0103', contact_person = 'Maria Oaks',
  donor_type = 'business', business_type = 'cafe', usual_close_time = '19:00',
  address = '1015 Caroline St, Fredericksburg, VA 22401',
  pickup_instructions = 'Counter, ask for Maria.',
  total_pounds = 67, total_donations = 9, summary_since = '2026-08-20'
WHERE id = 'a1000000-0000-0000-0000-000000000003';

-- Runner profiles
UPDATE profiles SET
  area_id = '11111111-1111-1111-1111-111111111111',
  phone = '540-555-0201', travel_mode = 'bike', age_bracket = 'adult',
  school_group = 'UMW Volunteer Corps',
  total_hours = 18.5, total_deliveries = 11, summary_since = '2026-09-01'
WHERE id = 'b2000000-0000-0000-0000-000000000001';

UPDATE profiles SET
  area_id = '11111111-1111-1111-1111-111111111111',
  phone = '540-555-0202', travel_mode = 'walk', age_bracket = 'under_18',
  school_group = 'Scout Troop 117',
  total_hours = 6.0, total_deliveries = 4, summary_since = '2026-09-10'
WHERE id = 'b2000000-0000-0000-0000-000000000002';

-- Host / site profiles (SAMPLE evening hours 4pm-8pm)
UPDATE profiles SET
  area_id = '11111111-1111-1111-1111-111111111111',
  phone = '540-555-0301', contact_person = 'Lee Park',
  site_type = 'community_fridge',
  site_address = 'Dixon St & Caroline St, Fredericksburg, VA 22401',
  site_lat = 38.3035, site_lng = -77.4607,
  site_hours = 'Mon-Sun 4pm-8pm (SAMPLE)', open_days = 'Mon,Tue,Wed,Thu,Fri,Sat,Sun',
  open_hour = 16, close_hour = 20, cold_capable = true,
  total_pounds = 95, total_deliveries_received = 12, summary_since = '2026-08-01'
WHERE id = 'c3000000-0000-0000-0000-000000000001';

UPDATE profiles SET
  area_id = '11111111-1111-1111-1111-111111111111',
  phone = '540-555-0302', contact_person = 'Dr. Hale',
  site_type = 'small_org',
  site_address = '1301 College Ave, Fredericksburg, VA 22401',
  site_lat = 38.3040, site_lng = -77.4645,
  site_hours = 'Mon-Fri 4pm-8pm (SAMPLE)', open_days = 'Mon,Tue,Wed,Thu,Fri',
  open_hour = 16, close_hour = 20, cold_capable = true,
  total_pounds = 60, total_deliveries_received = 8, summary_since = '2026-08-10'
WHERE id = 'c3000000-0000-0000-0000-000000000002';

UPDATE profiles SET
  area_id = '11111111-1111-1111-1111-111111111111',
  phone = '540-555-0303', contact_person = 'Rev. Smith',
  site_type = 'church_pantry',
  site_address = '825 College Ave, Fredericksburg, VA 22401',
  site_lat = 38.3028, site_lng = -77.4638,
  site_hours = 'Tue,Thu 4pm-8pm (SAMPLE)', open_days = 'Tue,Thu',
  open_hour = 16, close_hour = 20, cold_capable = false,
  total_pounds = 40, total_deliveries_received = 6, summary_since = '2026-08-15'
WHERE id = 'c3000000-0000-0000-0000-000000000003';

UPDATE profiles SET
  area_id = '11111111-1111-1111-1111-111111111111',
  phone = '540-555-0304', contact_person = 'Pastor Jones',
  site_type = 'church_pantry',
  site_address = '900 Charlotte St, Fredericksburg, VA 22401',
  site_lat = 38.2985, site_lng = -77.4590,
  site_hours = 'Wed,Sat 4pm-8pm (SAMPLE)', open_days = 'Wed,Sat',
  open_hour = 16, close_hour = 20, cold_capable = false,
  total_pounds = 30, total_deliveries_received = 4, summary_since = '2026-09-01'
WHERE id = 'c3000000-0000-0000-0000-000000000004';

UPDATE profiles SET
  area_id = '11111111-1111-1111-1111-111111111111',
  phone = '540-555-0305', contact_person = 'Deacon Cole',
  site_type = 'church_pantry',
  site_address = '240 Chatham Heights Rd, Fredericksburg, VA 22405',
  site_lat = 38.3120, site_lng = -77.4500,
  site_hours = 'Mon,Wed 4pm-8pm (SAMPLE)', open_days = 'Mon,Wed',
  open_hour = 16, close_hour = 20, cold_capable = true,
  total_pounds = 25, total_deliveries_received = 3, summary_since = '2026-09-05'
WHERE id = 'c3000000-0000-0000-0000-000000000005';

UPDATE profiles SET
  area_id = '11111111-1111-1111-1111-111111111111',
  phone = '540-555-0306', contact_person = 'Minister Bell',
  site_type = 'church_pantry',
  site_address = '10718 Courthouse Rd, Fredericksburg, VA 22408',
  site_lat = 38.2820, site_lng = -77.4200,
  site_hours = 'Thu,Sun 4pm-8pm (SAMPLE)', open_days = 'Thu,Sun',
  open_hour = 16, close_hour = 20, cold_capable = false,
  total_pounds = 20, total_deliveries_received = 3, summary_since = '2026-09-12'
WHERE id = 'c3000000-0000-0000-0000-000000000006';

-- Listings at various statuses (SAMPLE)
INSERT INTO listings (id, donor_id, area_id, food_text, food_type, quantity, unit, carry_size,
  ready_from, pickup_by, temp_needs, address, pickup_instructions, allergens, shelf_life_hours,
  pounds, safety_confirmed, status)
SELECT 'd4000000-0000-0000-0000-000000000001',
   'a1000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111',
   'Tomato soup and bread rolls', 'prepared_meal', 12, 'servings', 'one_bag',
   now() - interval '30 minutes', now() + interval '3 hours',
   'hot', '1015 Caroline St, Fredericksburg, VA 22401', 'Counter, ask for Maria.',
   'Contains wheat', 12, 8, true, 'posted'
WHERE NOT EXISTS (SELECT 1 FROM listings WHERE id = 'd4000000-0000-0000-0000-000000000001');

INSERT INTO listings (id, donor_id, area_id, food_text, food_type, quantity, unit, carry_size,
  ready_from, pickup_by, temp_needs, address, pickup_instructions, allergens, shelf_life_hours,
  pounds, safety_confirmed, status)
SELECT 'd4000000-0000-0000-0000-000000000002',
   'a1000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111',
   'Assorted bagels and muffins', 'baked_goods', 30, 'items', 'one_box',
   now() - interval '1 hour', now() + interval '4 hours',
   'room_temp', '810 William St, Fredericksburg, VA 22401', 'Back door, ask for Pat.',
   'Contains wheat, eggs', 24, 15, true, 'posted'
WHERE NOT EXISTS (SELECT 1 FROM listings WHERE id = 'd4000000-0000-0000-0000-000000000002');

INSERT INTO listings (id, donor_id, area_id, food_text, food_type, quantity, unit, carry_size,
  ready_from, pickup_by, temp_needs, address, pickup_instructions, allergens, shelf_life_hours,
  pounds, safety_confirmed, status)
SELECT 'd4000000-0000-0000-0000-000000000003',
   'a1000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
   'Fresh garden vegetables', 'produce', 10, 'lbs', 'one_bag',
   now() - interval '20 minutes', now() + interval '2 hours',
   'room_temp', '1204 Caroline St, Fredericksburg, VA 22401', NULL,
   NULL, 48, 10, true, 'posted'
WHERE NOT EXISTS (SELECT 1 FROM listings WHERE id = 'd4000000-0000-0000-0000-000000000003');

-- Claimed
INSERT INTO listings (id, donor_id, area_id, food_text, food_type, quantity, unit, carry_size,
  ready_from, pickup_by, temp_needs, address, pickup_instructions, allergens, shelf_life_hours,
  pounds, safety_confirmed, status, runner_id, claimed_at, site_id, delivery_code)
SELECT 'd4000000-0000-0000-0000-000000000010',
   'a1000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111',
   'Pasta with marinara sauce', 'prepared_meal', 20, 'servings', 'one_box',
   now() - interval '45 minutes', now() + interval '5 hours',
   'hot', '1015 Caroline St, Fredericksburg, VA 22401', 'Counter, ask for Maria.',
   'Contains wheat', 10, 14, true, 'claimed',
   'b2000000-0000-0000-0000-000000000001', now() - interval '20 minutes',
   'c3000000-0000-0000-0000-000000000001', '482910'
WHERE NOT EXISTS (SELECT 1 FROM listings WHERE id = 'd4000000-0000-0000-0000-000000000010');

-- Picked up
INSERT INTO listings (id, donor_id, area_id, food_text, food_type, quantity, unit, carry_size,
  ready_from, pickup_by, temp_needs, address, pickup_instructions, allergens, shelf_life_hours,
  pounds, safety_confirmed, status, runner_id, claimed_at, site_id, delivery_code, picked_up_at)
SELECT 'd4000000-0000-0000-0000-000000000020',
   'a1000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111',
   'Day-old bread loaves', 'baked_goods', 18, 'loaves', 'one_box',
   now() - interval '1 hour', now() + interval '6 hours',
   'room_temp', '810 William St, Fredericksburg, VA 22401', 'Back door, ask for Pat.',
   'Contains wheat', 36, 20, true, 'picked_up',
   'b2000000-0000-0000-0000-000000000001', now() - interval '50 minutes',
   'c3000000-0000-0000-0000-000000000002', '719304', now() - interval '15 minutes'
WHERE NOT EXISTS (SELECT 1 FROM listings WHERE id = 'd4000000-0000-0000-0000-000000000020');

-- Delivered (unexpired)
INSERT INTO listings (id, donor_id, area_id, food_text, food_type, quantity, unit, carry_size,
  ready_from, pickup_by, temp_needs, address, pickup_instructions, allergens, shelf_life_hours,
  pounds, safety_confirmed, status, runner_id, claimed_at, site_id, delivery_code,
  picked_up_at, delivered_at, expires_at)
SELECT 'd4000000-0000-0000-0000-000000000030',
   'a1000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111',
   'Chicken rice casserole', 'prepared_meal', 15, 'servings', 'one_box',
   now() - interval '4 hours', now() - interval '2 hours',
   'cold', '1015 Caroline St, Fredericksburg, VA 22401', 'Counter, ask for Maria.',
   'Contains dairy, eggs', 12, 12, true, 'delivered',
   'b2000000-0000-0000-0000-000000000001', now() - interval '3 hours',
   'c3000000-0000-0000-0000-000000000001', '215678',
   now() - interval '2.5 hours', now() - interval '2 hours',
   now() + interval '10 hours'
WHERE NOT EXISTS (SELECT 1 FROM listings WHERE id = 'd4000000-0000-0000-0000-000000000030');

INSERT INTO listings (id, donor_id, area_id, food_text, food_type, quantity, unit, carry_size,
  ready_from, pickup_by, temp_needs, address, pickup_instructions, allergens, shelf_life_hours,
  pounds, safety_confirmed, status, runner_id, claimed_at, site_id, delivery_code,
  picked_up_at, delivered_at, expires_at)
SELECT 'd4000000-0000-0000-0000-000000000031',
   'a1000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111',
   'Fresh apples and pears', 'produce', 8, 'lbs', 'one_bag',
   now() - interval '5 hours', now() - interval '3 hours',
   'room_temp', '810 William St, Fredericksburg, VA 22401', 'Back door, ask for Pat.',
   NULL, 48, 8, true, 'delivered',
   'b2000000-0000-0000-0000-000000000002', now() - interval '4 hours',
   'c3000000-0000-0000-0000-000000000003', '938201',
   now() - interval '3.5 hours', now() - interval '3 hours',
   now() + interval '45 hours'
WHERE NOT EXISTS (SELECT 1 FROM listings WHERE id = 'd4000000-0000-0000-0000-000000000031');

-- Seed community totals
UPDATE community_totals SET
  total_pounds = (SELECT COALESCE(SUM(total_pounds),0) FROM profiles WHERE role = 'donor'),
  total_meals = (SELECT COALESCE(SUM(total_pounds),0) FROM profiles WHERE role = 'donor') / 1.2,
  total_deliveries = 33,
  updated_at = now()
WHERE id = 1;
