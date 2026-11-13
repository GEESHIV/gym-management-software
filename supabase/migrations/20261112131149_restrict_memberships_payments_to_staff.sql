/*
# Restrict membership and payment reads to owner and receptionist

1. Why
- The gym-wide SELECT policies on memberships and payments applied to every gym role.
- Because policies combine with OR, trainers could read all memberships and payments in their gym,
  bypassing the rule that trainers only see their assigned members.

2. Security changes
- Drop the gym-wide SELECT policies on memberships and payments.
- Recreate SELECT for owner and receptionist only, scoped to the caller's gym.
- Trainers keep their existing SELECT policy on memberships, limited to assigned members.
- Revoke table privileges from the anon role on all public tables. No anon policies exist,
  so anon already had no row access; this removes the unused grants.
*/

DROP POLICY IF EXISTS "select_gym_memberships" ON memberships;
DROP POLICY IF EXISTS "select_gym_payments" ON payments;

DROP POLICY IF EXISTS "select_staff_memberships" ON memberships;
CREATE POLICY "select_staff_memberships" ON memberships FOR SELECT
TO authenticated
USING (gym_id = current_gym_id() AND current_gym_role() IN ('owner', 'receptionist'));

DROP POLICY IF EXISTS "select_staff_payments" ON payments;
CREATE POLICY "select_staff_payments" ON payments FOR SELECT
TO authenticated
USING (gym_id = current_gym_id() AND current_gym_role() IN ('owner', 'receptionist'));

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
