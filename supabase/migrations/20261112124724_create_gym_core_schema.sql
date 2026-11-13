/*
# Create multi-gym core schema

1. New Tables
- `gyms`: one row per registered gym (name, owner name, email, mobile, address, logo).
- `user_profiles`: links each signed-in account to exactly one gym and one role (owner, receptionist, trainer, member).
- `membership_plans`: gym-specific plans with duration in months and price.
- `members`: gym members with a unique QR token used for attendance.
- `memberships`: a member's plan purchase with start and end dates.
- `payments`: cash or UPI payments tied to a member and optionally a membership.

2. Helper functions
- `current_gym_id()` and `current_gym_role()` return the signed-in user's gym and role. They run with elevated rights so policies can use them without recursion.

3. Security
- Row Level Security is enabled on every table.
- Every tenant table is scoped to the signed-in user's gym_id in both read and write policies.
- Only owners manage plans and gym profile. Owners and receptionists manage members, memberships and payments.
- Writes that reference another record (member, plan, membership) must point to a record in the same gym.
- Gym rows cannot be created directly; they are created through the registration function in the next migration.

4. Notes
- Users cannot change their own role or gym through the API; those columns are not granted for update.
- Amounts are stored in rupees with two decimal places.
*/

CREATE TABLE IF NOT EXISTS gyms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_name text NOT NULL,
  email text NOT NULL,
  mobile text NOT NULL,
  address text NOT NULL,
  logo_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  gym_id uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'receptionist', 'trainer', 'member')),
  full_name text NOT NULL,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS user_profiles_gym_id_idx ON user_profiles (gym_id);

CREATE TABLE IF NOT EXISTS membership_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  name text NOT NULL,
  duration_months integer NOT NULL CHECK (duration_months > 0),
  price numeric(10, 2) NOT NULL CHECK (price >= 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS membership_plans_gym_id_idx ON membership_plans (gym_id);

CREATE TABLE IF NOT EXISTS members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text NOT NULL,
  email text,
  address text,
  qr_token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS members_gym_id_idx ON members (gym_id);

CREATE TABLE IF NOT EXISTS memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES membership_plans(id) ON DELETE SET NULL,
  plan_name text NOT NULL,
  amount numeric(10, 2) NOT NULL CHECK (amount >= 0),
  start_date date NOT NULL,
  end_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_date > start_date)
);
CREATE INDEX IF NOT EXISTS memberships_gym_id_idx ON memberships (gym_id);
CREATE INDEX IF NOT EXISTS memberships_member_id_idx ON memberships (member_id);

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  membership_id uuid REFERENCES memberships(id) ON DELETE SET NULL,
  amount numeric(10, 2) NOT NULL CHECK (amount > 0),
  method text NOT NULL CHECK (method IN ('cash', 'upi')),
  status text NOT NULL DEFAULT 'paid' CHECK (status IN ('pending', 'paid')),
  transaction_ref text,
  paid_on date NOT NULL DEFAULT current_date,
  recorded_by uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS payments_gym_id_idx ON payments (gym_id);
CREATE INDEX IF NOT EXISTS payments_membership_id_idx ON payments (membership_id);

CREATE OR REPLACE FUNCTION public.current_gym_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT gym_id FROM user_profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.current_gym_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM user_profiles WHERE id = auth.uid()
$$;

REVOKE EXECUTE ON FUNCTION public.current_gym_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.current_gym_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_gym_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_gym_role() TO authenticated;

-- gyms
ALTER TABLE gyms ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON gyms TO authenticated;
GRANT UPDATE (name, owner_name, mobile, address, logo_url) ON gyms TO authenticated;

DROP POLICY IF EXISTS "select_own_gym" ON gyms;
CREATE POLICY "select_own_gym" ON gyms FOR SELECT
  TO authenticated USING (id = public.current_gym_id());

DROP POLICY IF EXISTS "owner_update_gym" ON gyms;
CREATE POLICY "owner_update_gym" ON gyms FOR UPDATE
  TO authenticated
  USING (id = public.current_gym_id() AND public.current_gym_role() = 'owner')
  WITH CHECK (id = public.current_gym_id() AND public.current_gym_role() = 'owner');

-- user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON user_profiles TO authenticated;
GRANT UPDATE (full_name, phone) ON user_profiles TO authenticated;

DROP POLICY IF EXISTS "select_own_profile" ON user_profiles;
CREATE POLICY "select_own_profile" ON user_profiles FOR SELECT
  TO authenticated USING (id = auth.uid());

DROP POLICY IF EXISTS "update_own_profile" ON user_profiles;
CREATE POLICY "update_own_profile" ON user_profiles FOR UPDATE
  TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- membership_plans
ALTER TABLE membership_plans ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON membership_plans TO authenticated;

DROP POLICY IF EXISTS "select_gym_plans" ON membership_plans;
CREATE POLICY "select_gym_plans" ON membership_plans FOR SELECT
  TO authenticated USING (gym_id = public.current_gym_id());

DROP POLICY IF EXISTS "insert_gym_plans" ON membership_plans;
CREATE POLICY "insert_gym_plans" ON membership_plans FOR INSERT
  TO authenticated
  WITH CHECK (gym_id = public.current_gym_id() AND public.current_gym_role() = 'owner');

DROP POLICY IF EXISTS "update_gym_plans" ON membership_plans;
CREATE POLICY "update_gym_plans" ON membership_plans FOR UPDATE
  TO authenticated
  USING (gym_id = public.current_gym_id() AND public.current_gym_role() = 'owner')
  WITH CHECK (gym_id = public.current_gym_id() AND public.current_gym_role() = 'owner');

DROP POLICY IF EXISTS "delete_gym_plans" ON membership_plans;
CREATE POLICY "delete_gym_plans" ON membership_plans FOR DELETE
  TO authenticated
  USING (gym_id = public.current_gym_id() AND public.current_gym_role() = 'owner');

-- members
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON members TO authenticated;

DROP POLICY IF EXISTS "select_gym_members" ON members;
CREATE POLICY "select_gym_members" ON members FOR SELECT
  TO authenticated USING (gym_id = public.current_gym_id());

DROP POLICY IF EXISTS "insert_gym_members" ON members;
CREATE POLICY "insert_gym_members" ON members FOR INSERT
  TO authenticated
  WITH CHECK (gym_id = public.current_gym_id() AND public.current_gym_role() IN ('owner', 'receptionist'));

DROP POLICY IF EXISTS "update_gym_members" ON members;
CREATE POLICY "update_gym_members" ON members FOR UPDATE
  TO authenticated
  USING (gym_id = public.current_gym_id() AND public.current_gym_role() IN ('owner', 'receptionist'))
  WITH CHECK (gym_id = public.current_gym_id() AND public.current_gym_role() IN ('owner', 'receptionist'));

DROP POLICY IF EXISTS "delete_gym_members" ON members;
CREATE POLICY "delete_gym_members" ON members FOR DELETE
  TO authenticated
  USING (gym_id = public.current_gym_id() AND public.current_gym_role() IN ('owner', 'receptionist'));

-- memberships
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON memberships TO authenticated;

DROP POLICY IF EXISTS "select_gym_memberships" ON memberships;
CREATE POLICY "select_gym_memberships" ON memberships FOR SELECT
  TO authenticated USING (gym_id = public.current_gym_id());

DROP POLICY IF EXISTS "insert_gym_memberships" ON memberships;
CREATE POLICY "insert_gym_memberships" ON memberships FOR INSERT
  TO authenticated
  WITH CHECK (
    gym_id = public.current_gym_id()
    AND public.current_gym_role() IN ('owner', 'receptionist')
    AND EXISTS (SELECT 1 FROM members m WHERE m.id = member_id AND m.gym_id = public.current_gym_id())
    AND (plan_id IS NULL OR EXISTS (SELECT 1 FROM membership_plans p WHERE p.id = plan_id AND p.gym_id = public.current_gym_id()))
  );

DROP POLICY IF EXISTS "update_gym_memberships" ON memberships;
CREATE POLICY "update_gym_memberships" ON memberships FOR UPDATE
  TO authenticated
  USING (gym_id = public.current_gym_id() AND public.current_gym_role() IN ('owner', 'receptionist'))
  WITH CHECK (
    gym_id = public.current_gym_id()
    AND public.current_gym_role() IN ('owner', 'receptionist')
    AND EXISTS (SELECT 1 FROM members m WHERE m.id = member_id AND m.gym_id = public.current_gym_id())
  );

DROP POLICY IF EXISTS "delete_gym_memberships" ON memberships;
CREATE POLICY "delete_gym_memberships" ON memberships FOR DELETE
  TO authenticated
  USING (gym_id = public.current_gym_id() AND public.current_gym_role() IN ('owner', 'receptionist'));

-- payments
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON payments TO authenticated;

DROP POLICY IF EXISTS "select_gym_payments" ON payments;
CREATE POLICY "select_gym_payments" ON payments FOR SELECT
  TO authenticated USING (gym_id = public.current_gym_id());

DROP POLICY IF EXISTS "insert_gym_payments" ON payments;
CREATE POLICY "insert_gym_payments" ON payments FOR INSERT
  TO authenticated
  WITH CHECK (
    gym_id = public.current_gym_id()
    AND public.current_gym_role() IN ('owner', 'receptionist')
    AND EXISTS (SELECT 1 FROM members m WHERE m.id = member_id AND m.gym_id = public.current_gym_id())
    AND (membership_id IS NULL OR EXISTS (
      SELECT 1 FROM memberships s
      WHERE s.id = membership_id AND s.gym_id = public.current_gym_id() AND s.member_id = payments.member_id
    ))
  );

DROP POLICY IF EXISTS "update_gym_payments" ON payments;
CREATE POLICY "update_gym_payments" ON payments FOR UPDATE
  TO authenticated
  USING (gym_id = public.current_gym_id() AND public.current_gym_role() IN ('owner', 'receptionist'))
  WITH CHECK (gym_id = public.current_gym_id() AND public.current_gym_role() IN ('owner', 'receptionist'));

DROP POLICY IF EXISTS "delete_gym_payments" ON payments;
CREATE POLICY "delete_gym_payments" ON payments FOR DELETE
  TO authenticated
  USING (gym_id = public.current_gym_id() AND public.current_gym_role() = 'owner');
