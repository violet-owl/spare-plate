/*
# Fix all ambiguous column references in claim_listing

The RETURN TABLE type creates implicit PL/pgSQL variables named id,
food_text, carry_size, pickup_by, status. These clash with bare column
references in every SELECT/UPDATE WHERE clause inside the function.
Qualify ALL column references with table aliases (profiles.pr, listings.l)
to resolve the 42702 error completely.
*/

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
BEGIN
  SELECT pr.age_bracket, pr.travel_mode INTO v_runner_age, v_runner_travel
  FROM profiles pr WHERE pr.id = p_runner;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Runner profile not found';
  END IF;

  SELECT l.carry_size INTO v_carry
  FROM listings l WHERE l.id = p_listing FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Listing not found';
  END IF;

  PERFORM release_abandoned();

  SELECT l.carry_size INTO v_carry FROM listings l WHERE l.id = p_listing FOR UPDATE;

  IF v_runner_age = 'under_18' AND v_carry <> 'one_bag' THEN
    RAISE EXCEPTION 'Under-18 runners can only claim one-bag listings';
  END IF;

  UPDATE listings
  SET status = 'claimed',
      runner_id = p_runner,
      claimed_at = now()
  WHERE listings.id = p_listing
    AND listings.status = 'posted';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Listing is no longer available';
  END IF;

  RETURN QUERY SELECT l.id, l.food_text, l.carry_size, l.pickup_by, l.status
  FROM listings l WHERE l.id = p_listing;
END;
$$;

REVOKE EXECUTE ON FUNCTION claim_listing(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION claim_listing(uuid, uuid) TO authenticated;
