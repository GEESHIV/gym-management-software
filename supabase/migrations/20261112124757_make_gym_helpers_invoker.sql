/*
# Run gym helper functions with caller rights

1. Modified Functions
- `current_gym_id()` and `current_gym_role()` now run as the signed-in caller instead of with elevated rights.

2. Security
- These helpers only read the caller's own profile row, which the profile policy already allows, so elevated rights are unnecessary.
- Removing elevated rights means the helpers can no longer be used to read other profiles through the API.

3. Notes
- No data is changed by this migration.
*/

ALTER FUNCTION public.current_gym_id() SECURITY INVOKER;
ALTER FUNCTION public.current_gym_role() SECURITY INVOKER;
