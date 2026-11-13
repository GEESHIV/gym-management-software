/*
# Add staff roles, attendance, progress notes, follow-ups and WhatsApp templates

Plain-English summary
- Gym staff (receptionists and trainers) can now see only what their role allows.
- Each member can be assigned to one trainer. Trainers see only their assigned members.
- Members get a WhatsApp promotional opt-out flag.
- Gym check-ins are recorded through a single safe function that checks the QR token, the gym, the membership and a duplicate window.
- Owners can edit WhatsApp message templates. Follow-up messages sent by staff are logged.

1. Modified tables
- `members`: adds `assigned_trainer_id` (the trainer for this member) and `whatsapp_opt_out` (true if the member does not want promotional messages).
- `user_profiles`: staff in the same gym can read each other's names and roles.
- `memberships`: trainers can read the memberships of their assigned members.

2. New tables
- `attendance`: one row per gym check-in (member, time, who recorded it). Rows cannot be edited or deleted from the app.
- `member_progress`: trainer and staff notes with optional weight, per member.
- `follow_ups`: a log of follow-up messages staff sent to a member (kind and note).
- `whatsapp_templates`: one editable message per kind for each gym.

3. Functions
- `record_attendance(p_qr_token)`: validates the gym, the member, an active membership and a duplicate window (2 hours), then records a check-in. Returns a status for the scanner screen.

4. Security
- Row Level Security is enabled on every new table.
- Every policy is scoped to the signed-in user's gym.
- Trainers cannot see members, payments or attendance outside their assignments.
- Only owners can edit WhatsApp templates.
- The trainer assigned to a member must belong to the same gym and have the trainer role.

5. Notes
- Attendance and progress rows are append-only from the app.
*/

ALTER TABLE members ADD COLUMN IF NOT EXISTS assigned_trainer_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL;
ALTER TABLE members ADD COLUMN IF NOT EXISTS whatsapp_opt_out boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS members_assigned_trainer_id_idx ON members (assigned_trainer_id);

DROP POLICY IF EXISTS "select_gym_staff" ON user_profiles;
CREATE POLICY "select_gym_staff" ON user_profiles FOR SELECT
  TO authenticated USING (gym_id = public.current_gym_id());

DROP POLICY IF EXISTS "select_gym_members" ON members;
CREATE POLICY "select_gym_members" ON members FOR SELECT
  TO authenticated
  USING (
    gym_id = public.current_gym_id()
    AND (
      public.current_gym_role() IN ('owner', 'receptionist')
      OR (public.current_gym_role() = 'trainer' AND assigned_trainer_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "insert_gym_members" ON members;
CREATE POLICY "insert_gym_members" ON members FOR INSERT
  TO authenticated
  WITH CHECK (
    gym_id = public.current_gym_id()
    AND public.current_gym_role() IN ('owner', 'receptionist')
    AND (assigned_trainer_id IS NULL OR EXISTS (
      SELECT 1 FROM user_profiles t
      WHERE t.id = assigned_trainer_id AND t.gym_id = public.current_gym_id() AND t.role = 'trainer'
    ))
  );

DROP POLICY IF EXISTS "update_gym_members" ON members;
CREATE POLICY "update_gym_members" ON members FOR UPDATE
  TO authenticated
  USING (gym_id = public.current_gym_id() AND public.current_gym_role() IN ('owner', 'receptionist'))
  WITH CHECK (
    gym_id = public.current_gym_id()
    AND public.current_gym_role() IN ('owner', 'receptionist')
    AND (assigned_trainer_id IS NULL OR EXISTS (
      SELECT 1 FROM user_profiles t
      WHERE t.id = assigned_trainer_id AND t.gym_id = public.current_gym_id() AND t.role = 'trainer'
    ))
  );

DROP POLICY IF EXISTS "select_assigned_memberships" ON memberships;
CREATE POLICY "select_assigned_memberships" ON memberships FOR SELECT
  TO authenticated
  USING (
    gym_id = public.current_gym_id()
    AND public.current_gym_role() = 'trainer'
    AND EXISTS (SELECT 1 FROM members m WHERE m.id = member_id AND m.assigned_trainer_id = auth.uid())
  );

CREATE TABLE IF NOT EXISTS attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  checked_in_at timestamptz NOT NULL DEFAULT now(),
  recorded_by uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS attendance_gym_time_idx ON attendance (gym_id, checked_in_at);
CREATE INDEX IF NOT EXISTS attendance_member_time_idx ON attendance (member_id, checked_in_at);

ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON attendance TO authenticated;

DROP POLICY IF EXISTS "select_gym_attendance" ON attendance;
CREATE POLICY "select_gym_attendance" ON attendance FOR SELECT
  TO authenticated
  USING (
    gym_id = public.current_gym_id()
    AND (
      public.current_gym_role() IN ('owner', 'receptionist')
      OR (public.current_gym_role() = 'trainer' AND EXISTS (
        SELECT 1 FROM members m WHERE m.id = member_id AND m.assigned_trainer_id = auth.uid()
      ))
    )
  );

DROP POLICY IF EXISTS "insert_gym_attendance" ON attendance;
CREATE POLICY "insert_gym_attendance" ON attendance FOR INSERT
  TO authenticated
  WITH CHECK (
    gym_id = public.current_gym_id()
    AND public.current_gym_role() IN ('owner', 'receptionist')
    AND EXISTS (SELECT 1 FROM members m WHERE m.id = member_id AND m.gym_id = public.current_gym_id())
  );

CREATE TABLE IF NOT EXISTS member_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  trainer_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  weight_kg numeric(5, 2) CHECK (weight_kg IS NULL OR weight_kg > 0),
  note text NOT NULL CHECK (char_length(note) BETWEEN 1 AND 2000),
  recorded_on date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS member_progress_member_idx ON member_progress (member_id, recorded_on);

ALTER TABLE member_progress ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON member_progress TO authenticated;

DROP POLICY IF EXISTS "select_member_progress" ON member_progress;
CREATE POLICY "select_member_progress" ON member_progress FOR SELECT
  TO authenticated
  USING (
    gym_id = public.current_gym_id()
    AND (
      public.current_gym_role() IN ('owner', 'receptionist')
      OR (public.current_gym_role() = 'trainer' AND EXISTS (
        SELECT 1 FROM members m WHERE m.id = member_id AND m.assigned_trainer_id = auth.uid()
      ))
    )
  );

DROP POLICY IF EXISTS "insert_member_progress" ON member_progress;
CREATE POLICY "insert_member_progress" ON member_progress FOR INSERT
  TO authenticated
  WITH CHECK (
    gym_id = public.current_gym_id()
    AND trainer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM members m
      WHERE m.id = member_id
        AND m.gym_id = public.current_gym_id()
        AND (
          public.current_gym_role() IN ('owner', 'receptionist')
          OR (public.current_gym_role() = 'trainer' AND m.assigned_trainer_id = auth.uid())
        )
    )
  );

CREATE TABLE IF NOT EXISTS follow_ups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('renewal', 'expired', 'pending_fee', 'inactive', 'new_member', 'promotional')),
  channel text NOT NULL DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp')),
  note text CHECK (note IS NULL OR char_length(note) <= 500),
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS follow_ups_gym_member_idx ON follow_ups (gym_id, member_id);

ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON follow_ups TO authenticated;

DROP POLICY IF EXISTS "select_gym_follow_ups" ON follow_ups;
CREATE POLICY "select_gym_follow_ups" ON follow_ups FOR SELECT
  TO authenticated
  USING (gym_id = public.current_gym_id() AND public.current_gym_role() IN ('owner', 'receptionist'));

DROP POLICY IF EXISTS "insert_gym_follow_ups" ON follow_ups;
CREATE POLICY "insert_gym_follow_ups" ON follow_ups FOR INSERT
  TO authenticated
  WITH CHECK (
    gym_id = public.current_gym_id()
    AND public.current_gym_role() IN ('owner', 'receptionist')
    AND created_by = auth.uid()
    AND EXISTS (SELECT 1 FROM members m WHERE m.id = member_id AND m.gym_id = public.current_gym_id())
  );

CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('renewal', 'expired', 'pending_fee', 'inactive', 'new_member', 'promotional')),
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1000),
  updated_by uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (gym_id, kind)
);

ALTER TABLE whatsapp_templates ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON whatsapp_templates TO authenticated;

DROP POLICY IF EXISTS "select_gym_templates" ON whatsapp_templates;
CREATE POLICY "select_gym_templates" ON whatsapp_templates FOR SELECT
  TO authenticated
  USING (gym_id = public.current_gym_id() AND public.current_gym_role() IN ('owner', 'receptionist'));

DROP POLICY IF EXISTS "insert_gym_templates" ON whatsapp_templates;
CREATE POLICY "insert_gym_templates" ON whatsapp_templates FOR INSERT
  TO authenticated
  WITH CHECK (gym_id = public.current_gym_id() AND public.current_gym_role() = 'owner' AND updated_by = auth.uid());

DROP POLICY IF EXISTS "update_gym_templates" ON whatsapp_templates;
CREATE POLICY "update_gym_templates" ON whatsapp_templates FOR UPDATE
  TO authenticated
  USING (gym_id = public.current_gym_id() AND public.current_gym_role() = 'owner')
  WITH CHECK (gym_id = public.current_gym_id() AND public.current_gym_role() = 'owner' AND updated_by = auth.uid());

CREATE OR REPLACE FUNCTION public.record_attendance(p_qr_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_member members%ROWTYPE;
  v_last timestamptz;
  v_end date;
BEGIN
  IF public.current_gym_role() NOT IN ('owner', 'receptionist') THEN
    RAISE EXCEPTION 'Only gym staff can record attendance';
  END IF;

  SELECT * INTO v_member FROM members
  WHERE qr_token = p_qr_token AND gym_id = public.current_gym_id();
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'not_found');
  END IF;

  SELECT max(checked_in_at) INTO v_last FROM attendance
  WHERE member_id = v_member.id AND checked_in_at > now() - interval '2 hours';
  IF v_last IS NOT NULL THEN
    RETURN jsonb_build_object('status', 'duplicate', 'member_name', v_member.full_name, 'checked_in_at', v_last);
  END IF;

  SELECT max(end_date) INTO v_end FROM memberships WHERE member_id = v_member.id;
  IF v_end IS NULL OR v_end < current_date THEN
    RETURN jsonb_build_object('status', 'no_active_membership', 'member_name', v_member.full_name, 'end_date', v_end);
  END IF;

  INSERT INTO attendance (gym_id, member_id) VALUES (v_member.gym_id, v_member.id);

  RETURN jsonb_build_object('status', 'checked_in', 'member_name', v_member.full_name, 'end_date', v_end);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.record_attendance(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_attendance(uuid) TO authenticated;
