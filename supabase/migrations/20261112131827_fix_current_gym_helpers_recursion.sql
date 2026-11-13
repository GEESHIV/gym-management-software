/*
# Fix infinite recursion in tenant helper functions

1. Problem
- The policy "select_gym_staff" on user_profiles calls current_gym_id().
- current_gym_id() and current_gym_role() read user_profiles, which applies the same policy again, causing infinite recursion.

2. Change
- current_gym_id() and current_gym_role() are now SECURITY DEFINER with a fixed search_path.
- They still only return the row whose id = auth.uid(), so they expose nothing beyond the caller's own profile.

3. Security
- EXECUTE is revoked from PUBLIC and anon; only authenticated may call them, since every tenant policy runs as authenticated.
*/

CREATE OR REPLACE FUNCTION public.current_gym_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT gym_id FROM public.user_profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.current_gym_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_profiles WHERE id = auth.uid()
$$;

REVOKE EXECUTE ON FUNCTION public.current_gym_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.current_gym_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_gym_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_gym_role() TO authenticated;
