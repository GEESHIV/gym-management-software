/*
# Add gym registration function

1. New Functions
- `register_gym(p_gym_name, p_owner_name, p_email, p_mobile, p_address)` creates a new gym and links the currently signed-in account to it as the Gym Owner. It returns the new Gym ID.

2. Security
- The function runs with elevated rights so the new gym and profile can be created atomically before any gym-scoped policy applies.
- It refuses to run if the account is not signed in or is already linked to a gym.
- Execute permission is granted only to signed-in users; anonymous callers cannot run it.

3. Notes
- Inputs are trimmed and must not be empty.
*/

CREATE OR REPLACE FUNCTION public.register_gym(
  p_gym_name text,
  p_owner_name text,
  p_email text,
  p_mobile text,
  p_address text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_gym_id uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to register a gym';
  END IF;

  IF EXISTS (SELECT 1 FROM user_profiles WHERE id = v_user) THEN
    RAISE EXCEPTION 'This account is already linked to a gym';
  END IF;

  IF length(trim(coalesce(p_gym_name, ''))) = 0
     OR length(trim(coalesce(p_owner_name, ''))) = 0
     OR length(trim(coalesce(p_email, ''))) = 0
     OR length(trim(coalesce(p_mobile, ''))) = 0
     OR length(trim(coalesce(p_address, ''))) = 0 THEN
    RAISE EXCEPTION 'All gym registration fields are required';
  END IF;

  INSERT INTO gyms (name, owner_name, email, mobile, address)
  VALUES (trim(p_gym_name), trim(p_owner_name), trim(p_email), trim(p_mobile), trim(p_address))
  RETURNING id INTO v_gym_id;

  INSERT INTO user_profiles (id, gym_id, role, full_name, phone)
  VALUES (v_user, v_gym_id, 'owner', trim(p_owner_name), trim(p_mobile));

  RETURN v_gym_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.register_gym(text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_gym(text, text, text, text, text) TO authenticated;
