/*
# Revoke EXECUTE on handle_new_user from anon/public
The trigger function handle_new_user() is only fired by the auth.users
INSERT trigger, never via the REST API. Revoke public/anon execute to
silence the advisor and close the surface.
*/
REVOKE EXECUTE ON FUNCTION handle_new_user() FROM PUBLIC, anon;
