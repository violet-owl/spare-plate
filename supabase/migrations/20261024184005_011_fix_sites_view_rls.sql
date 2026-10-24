/*
# Fix: sites view returns no rows for runners

The `sites` view has security_invoker = true, so RLS on the underlying
`profiles` table applies. The only SELECT policy on profiles is
`profile_owner_select` (auth.uid() = id), so a runner can only see their
own row — never any host rows. This made the drop-off site picker always
empty.

Fix: set the sites view to security_invoker = false so it runs with the
view owner's (postgres) privileges, bypassing profiles RLS. The view only
exposes public site info (name, address, hours, type, cold capability,
phone, contact) — not sensitive profile data. SELECT is already granted
to anon + authenticated.
*/

ALTER VIEW sites SET (security_invoker = false);
