/*
# Default new profiles to the first area

New users created via signup had area_id = NULL because the trigger only
set role + display_name. That caused listing inserts to fail with a
not-null violation on area_id. This updates the trigger to assign the
first available area (the launch area, Fredericksburg) to every new
profile. Existing profiles with NULL area_id are backfilled too.

This is the simplest fix for a single-area launch. When more areas are
added, users can pick their area in their profile form.
*/

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_area uuid;
BEGIN
  SELECT id INTO v_area FROM public.areas ORDER BY created_at LIMIT 1;
  INSERT INTO public.profiles (id, role, display_name, area_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'donor'),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    v_area
  )
  ON CONFLICT (id) DO UPDATE SET area_id = COALESCE(public.profiles.area_id, v_area);
  RETURN NEW;
END;
$$;

-- Backfill any existing profiles that have a null area_id
UPDATE profiles
SET area_id = (SELECT id FROM areas ORDER BY created_at LIMIT 1)
WHERE area_id IS NULL;
