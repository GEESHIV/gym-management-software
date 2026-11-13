/*
# Add workout and diet plans for trainers

1. New Tables
- `workout_plans`: a titled training plan a trainer writes for one member.
  Columns: id, gym_id, member_id, trainer_id (defaults to the signed-in trainer), title, notes, created_at.
- `workout_exercises`: the exercises inside a workout plan, grouped by day.
  Columns: id, gym_id, plan_id, day_label, exercise, sets, reps, sort_order, created_at.
- `diet_plans`: a written diet plan for one member.
  Columns: id, gym_id, member_id, trainer_id (defaults to the signed-in trainer), title, body, created_at.

2. Security
- Row level security is enabled on all three tables.
- Trainers can create, change and delete plans only for members assigned to them.
- Owners and receptionists can read plans in their gym. Nobody else can see them.
- Every table is granted only to the authenticated role. No anon access.

3. Notes
- Child exercises are checked through their parent plan, so an exercise can only be written
  when its plan belongs to the trainer and that member is assigned to them.
- Member self-service access to plans is not included yet.
*/

CREATE TABLE IF NOT EXISTS workout_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  trainer_id uuid NOT NULL DEFAULT auth.uid() REFERENCES user_profiles(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS workout_plans_member_idx ON workout_plans (member_id, created_at DESC);

CREATE TABLE IF NOT EXISTS workout_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES workout_plans(id) ON DELETE CASCADE,
  day_label text NOT NULL CHECK (char_length(day_label) BETWEEN 1 AND 40),
  exercise text NOT NULL CHECK (char_length(exercise) BETWEEN 1 AND 120),
  sets integer CHECK (sets IS NULL OR sets BETWEEN 1 AND 20),
  reps text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS workout_exercises_plan_idx ON workout_exercises (plan_id, sort_order);

CREATE TABLE IF NOT EXISTS diet_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  trainer_id uuid NOT NULL DEFAULT auth.uid() REFERENCES user_profiles(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 4000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS diet_plans_member_idx ON diet_plans (member_id, created_at DESC);

ALTER TABLE workout_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE diet_plans ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON workout_plans TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON workout_exercises TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON diet_plans TO authenticated;

DROP POLICY IF EXISTS "select_workout_plans" ON workout_plans;
CREATE POLICY "select_workout_plans" ON workout_plans FOR SELECT
TO authenticated
USING (
  gym_id = public.current_gym_id()
  AND (
    public.current_gym_role() IN ('owner', 'receptionist')
    OR (public.current_gym_role() = 'trainer' AND EXISTS (
      SELECT 1 FROM members m WHERE m.id = workout_plans.member_id AND m.assigned_trainer_id = auth.uid()
    ))
  )
);

DROP POLICY IF EXISTS "insert_workout_plans" ON workout_plans;
CREATE POLICY "insert_workout_plans" ON workout_plans FOR INSERT
TO authenticated
WITH CHECK (
  gym_id = public.current_gym_id()
  AND public.current_gym_role() = 'trainer'
  AND trainer_id = auth.uid()
  AND EXISTS (SELECT 1 FROM members m WHERE m.id = member_id AND m.gym_id = public.current_gym_id() AND m.assigned_trainer_id = auth.uid())
);

DROP POLICY IF EXISTS "update_workout_plans" ON workout_plans;
CREATE POLICY "update_workout_plans" ON workout_plans FOR UPDATE
TO authenticated
USING (gym_id = public.current_gym_id() AND public.current_gym_role() = 'trainer' AND trainer_id = auth.uid())
WITH CHECK (
  gym_id = public.current_gym_id()
  AND trainer_id = auth.uid()
  AND EXISTS (SELECT 1 FROM members m WHERE m.id = member_id AND m.gym_id = public.current_gym_id() AND m.assigned_trainer_id = auth.uid())
);

DROP POLICY IF EXISTS "delete_workout_plans" ON workout_plans;
CREATE POLICY "delete_workout_plans" ON workout_plans FOR DELETE
TO authenticated
USING (gym_id = public.current_gym_id() AND public.current_gym_role() = 'trainer' AND trainer_id = auth.uid());

DROP POLICY IF EXISTS "select_workout_exercises" ON workout_exercises;
CREATE POLICY "select_workout_exercises" ON workout_exercises FOR SELECT
TO authenticated
USING (
  gym_id = public.current_gym_id()
  AND (
    public.current_gym_role() IN ('owner', 'receptionist')
    OR (public.current_gym_role() = 'trainer' AND EXISTS (
      SELECT 1 FROM workout_plans p JOIN members m ON m.id = p.member_id
      WHERE p.id = workout_exercises.plan_id AND m.assigned_trainer_id = auth.uid()
    ))
  )
);

DROP POLICY IF EXISTS "insert_workout_exercises" ON workout_exercises;
CREATE POLICY "insert_workout_exercises" ON workout_exercises FOR INSERT
TO authenticated
WITH CHECK (
  gym_id = public.current_gym_id()
  AND public.current_gym_role() = 'trainer'
  AND EXISTS (
    SELECT 1 FROM workout_plans p JOIN members m ON m.id = p.member_id
    WHERE p.id = plan_id AND p.trainer_id = auth.uid() AND m.assigned_trainer_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "update_workout_exercises" ON workout_exercises;
CREATE POLICY "update_workout_exercises" ON workout_exercises FOR UPDATE
TO authenticated
USING (
  gym_id = public.current_gym_id() AND public.current_gym_role() = 'trainer'
  AND EXISTS (SELECT 1 FROM workout_plans p WHERE p.id = plan_id AND p.trainer_id = auth.uid())
)
WITH CHECK (
  gym_id = public.current_gym_id()
  AND EXISTS (SELECT 1 FROM workout_plans p WHERE p.id = plan_id AND p.trainer_id = auth.uid())
);

DROP POLICY IF EXISTS "delete_workout_exercises" ON workout_exercises;
CREATE POLICY "delete_workout_exercises" ON workout_exercises FOR DELETE
TO authenticated
USING (
  gym_id = public.current_gym_id() AND public.current_gym_role() = 'trainer'
  AND EXISTS (SELECT 1 FROM workout_plans p WHERE p.id = plan_id AND p.trainer_id = auth.uid())
);

DROP POLICY IF EXISTS "select_diet_plans" ON diet_plans;
CREATE POLICY "select_diet_plans" ON diet_plans FOR SELECT
TO authenticated
USING (
  gym_id = public.current_gym_id()
  AND (
    public.current_gym_role() IN ('owner', 'receptionist')
    OR (public.current_gym_role() = 'trainer' AND EXISTS (
      SELECT 1 FROM members m WHERE m.id = diet_plans.member_id AND m.assigned_trainer_id = auth.uid()
    ))
  )
);

DROP POLICY IF EXISTS "insert_diet_plans" ON diet_plans;
CREATE POLICY "insert_diet_plans" ON diet_plans FOR INSERT
TO authenticated
WITH CHECK (
  gym_id = public.current_gym_id()
  AND public.current_gym_role() = 'trainer'
  AND trainer_id = auth.uid()
  AND EXISTS (SELECT 1 FROM members m WHERE m.id = member_id AND m.gym_id = public.current_gym_id() AND m.assigned_trainer_id = auth.uid())
);

DROP POLICY IF EXISTS "update_diet_plans" ON diet_plans;
CREATE POLICY "update_diet_plans" ON diet_plans FOR UPDATE
TO authenticated
USING (gym_id = public.current_gym_id() AND public.current_gym_role() = 'trainer' AND trainer_id = auth.uid())
WITH CHECK (
  gym_id = public.current_gym_id()
  AND trainer_id = auth.uid()
  AND EXISTS (SELECT 1 FROM members m WHERE m.id = member_id AND m.gym_id = public.current_gym_id() AND m.assigned_trainer_id = auth.uid())
);

DROP POLICY IF EXISTS "delete_diet_plans" ON diet_plans;
CREATE POLICY "delete_diet_plans" ON diet_plans FOR DELETE
TO authenticated
USING (gym_id = public.current_gym_id() AND public.current_gym_role() = 'trainer' AND trainer_id = auth.uid());
