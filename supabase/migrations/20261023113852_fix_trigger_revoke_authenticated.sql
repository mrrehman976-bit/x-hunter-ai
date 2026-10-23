/*
# Revoke EXECUTE on trigger function from authenticated role

The update_settings_updated_at function is a trigger function and should
not be directly callable by any role via the REST API. Revoke EXECUTE
from authenticated as well.
*/

REVOKE EXECUTE ON FUNCTION public.update_settings_updated_at() FROM authenticated;
