/*
# Add member logins and a signed-in member dashboard lookup

1. Changes
- `members.user_id` links a member row to the sign-in account created for that member. Empty for members who only use their QR link.
- `member_portal_payload(member_id)` builds the member dashboard data. The QR link lookup and the new signed-in lookup both use it, so the dashboard content is identical.
- `get_my_member_portal()` returns the dashboard data for the member linked to the signed-in account, or NULL.

2. Security
- Members can only read their dashboard through `get_my_member_portal()`, which uses the caller's own account to find their row.
- The internal payload function is not callable by anon or signed-in users directly.
- Staff can no longer write `members.user_id` through the API. Only the server function that creates logins sets it. Other member columns stay writable by staff, limited to the columns the member form saves.

3. Notes
- Existing QR token lookup (`get_member_portal`) keeps its signature and grants.
*/

ALTER TABLE members ADD COLUMN IF NOT EXISTS user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL;

REVOKE UPDATE ON members FROM authenticated;
GRANT UPDATE (full_name, phone, email, address, assigned_trainer_id, whatsapp_opt_out) ON members TO authenticated;

CREATE OR REPLACE FUNCTION public.member_portal_payload(p_member_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  m public.members%ROWTYPE;
  latest public.memberships%ROWTYPE;
  result jsonb;
BEGIN
  SELECT * INTO m FROM public.members WHERE id = p_member_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT * INTO latest FROM public.memberships
  WHERE member_id = m.id
  ORDER BY end_date DESC
  LIMIT 1;

  SELECT jsonb_build_object(
    'member', jsonb_build_object('full_name', m.full_name, 'phone', m.phone),
    'gym', (SELECT jsonb_build_object('name', g.name, 'mobile', g.mobile, 'address', g.address)
            FROM public.gyms g WHERE g.id = m.gym_id),
    'trainer', (SELECT p.full_name FROM public.user_profiles p WHERE p.id = m.assigned_trainer_id),
    'membership', CASE WHEN latest.id IS NULL THEN NULL ELSE jsonb_build_object(
      'plan_name', latest.plan_name,
      'start_date', latest.start_date,
      'end_date', latest.end_date,
      'amount', latest.amount,
      'pending_fee', GREATEST(0, latest.amount - COALESCE((
        SELECT SUM(p.amount) FROM public.payments p WHERE p.membership_id = latest.id AND p.status = 'paid'
      ), 0))
    ) END,
    'payments', COALESCE((
      SELECT jsonb_agg(x ORDER BY x.paid_on DESC) FROM (
        SELECT p.paid_on, p.amount, p.method, p.status FROM public.payments p
        WHERE p.member_id = m.id ORDER BY p.paid_on DESC, p.created_at DESC LIMIT 20
      ) x
    ), '[]'::jsonb),
    'attendance', COALESCE((
      SELECT jsonb_agg(a.checked_in_at ORDER BY a.checked_in_at DESC) FROM (
        SELECT checked_in_at FROM public.attendance WHERE member_id = m.id ORDER BY checked_in_at DESC LIMIT 20
      ) a
    ), '[]'::jsonb),
    'progress', COALESCE((
      SELECT jsonb_agg(x ORDER BY x.recorded_on DESC) FROM (
        SELECT mp.recorded_on, mp.weight_kg, mp.note FROM public.member_progress mp
        WHERE mp.member_id = m.id ORDER BY mp.recorded_on DESC, mp.created_at DESC LIMIT 10
      ) x
    ), '[]'::jsonb),
    'workouts', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'title', wp.title,
        'notes', wp.notes,
        'exercises', COALESCE((
          SELECT jsonb_agg(jsonb_build_object('day_label', e.day_label, 'exercise', e.exercise, 'sets', e.sets, 'reps', e.reps) ORDER BY e.day_label, e.sort_order)
          FROM public.workout_exercises e WHERE e.plan_id = wp.id
        ), '[]'::jsonb)
      ) ORDER BY wp.created_at DESC)
      FROM public.workout_plans wp WHERE wp.member_id = m.id
    ), '[]'::jsonb),
    'diets', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('title', d.title, 'body', d.body) ORDER BY d.created_at DESC)
      FROM public.diet_plans d WHERE d.member_id = m.id
    ), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.member_portal_payload(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_member_portal(p_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target uuid;
BEGIN
  SELECT id INTO target FROM public.members WHERE qr_token = p_token;
  IF target IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN public.member_portal_payload(target);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_member_portal()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target uuid;
BEGIN
  SELECT id INTO target FROM public.members WHERE user_id = auth.uid();
  IF target IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN public.member_portal_payload(target);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_my_member_portal() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_member_portal() TO authenticated;
