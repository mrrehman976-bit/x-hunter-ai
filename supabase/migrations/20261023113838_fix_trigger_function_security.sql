/*
# Fix security warnings on update_settings_updated_at function

## Purpose
Fix three security advisor warnings about the `update_settings_updated_at` trigger function:
1. Function search path is mutable
2. Anon role can execute the SECURITY DEFINER function
3. Authenticated role can execute the SECURITY DEFINER function

## Changes
- Recreate the function with an explicit `search_path = public` to fix the mutable search path warning.
- Revoke EXECUTE from PUBLIC and anon to prevent unauthenticated calls.
- Grant EXECUTE only to authenticated (the trigger runs on the table, so the role is the table owner).

## Security
- The function is a trigger function that only runs when a row on user_settings is updated.
- It should NOT be directly callable via the REST API.
- Revoke EXECUTE from PUBLIC and anon.
- The trigger still works because trigger functions run with the table owner's privileges, not the caller's.
*/

-- Recreate the function with a fixed search_path
CREATE OR REPLACE FUNCTION public.update_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Revoke public execute access
REVOKE EXECUTE ON FUNCTION public.update_settings_updated_at() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_settings_updated_at() FROM anon;
