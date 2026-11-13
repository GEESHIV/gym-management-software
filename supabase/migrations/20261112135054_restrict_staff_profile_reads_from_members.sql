/*
# Hide staff profiles from member accounts and remove unused anon grants

1. Changes
- The gym staff profile read policy now applies only to owners, receptionists, and trainers. Member accounts can no longer read staff names and phone numbers.
- Members still see their own profile through the existing own-profile policy.

2. Security
- Anonymous visitors lose table privileges on workout and diet plans. Those tables have no anonymous policy, so the change only removes unused access.
*/

DROP POLICY IF EXISTS "select_gym_staff" ON user_profiles;
CREATE POLICY "select_gym_staff" ON user_profiles FOR SELECT
  TO authenticated
  USING (gym_id = public.current_gym_id() AND public.current_gym_role() IN ('owner', 'receptionist', 'trainer'));

REVOKE ALL ON diet_plans, workout_plans, workout_exercises FROM anon;
