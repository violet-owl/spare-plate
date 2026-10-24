-- Fix ambiguous column reference in confirm_delivery
-- The bare `id` in WHERE clause conflicts with PL/pgSQL variable names
CREATE OR REPLACE FUNCTION public.confirm_delivery(p_runner uuid, p_listing uuid, p_code text)
RETURNS TABLE(id uuid, status text, hours_credited numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_listing RECORD;
  v_hours numeric;
  v_host_id uuid;
  v_donor_id uuid;
  v_pounds numeric;
  v_meals numeric;
  v_actual_code text;
BEGIN
  SELECT * INTO v_listing FROM listings l WHERE l.id = p_listing FOR UPDATE;
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

  DELETE FROM delivery_codes WHERE listing_id = p_listing;

  RETURN QUERY SELECT p_listing, 'delivered'::text, v_hours;
END;
$function$;
