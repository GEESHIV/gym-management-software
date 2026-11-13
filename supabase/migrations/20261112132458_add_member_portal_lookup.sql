/*
# Member self-service portal lookup

1. New Function
- `get_member_portal(p_token uuid)` returns one member's own portal data as JSON: name, phone, gym details, assigned trainer, latest membership with pending fee, the last 20 payments, the last 20 check-ins, the last 10 progress notes, workout plans with exercises, and diet plans.
- The QR token printed for a member is the only credential. An unknown token returns NULL.

2. Security
- Runs as SECURITY DEFINER so anonymous members can read their own data without an account. Every query is filtered to the single member matched by the token, so no other member or gym is reachable.
- Executable by anon and authenticated only. Member contact details beyond name and phone, and the WhatsApp opt-out flag, are not returned.
*/

CREATE OR REPLACE FUNCTION public.get_member_portal(p_token uuid)
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
  SELECT * INTO m FROM public.members WHERE qr_token = p_token;
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

REVOKE EXECUTE ON FUNCTION public.get_member_portal(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_member_portal(uuid) TO anon, authenticated;
