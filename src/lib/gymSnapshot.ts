import { supabase } from '@/lib/supabase';
import type {
  Attendance,
  FollowUp,
  Member,
  Membership,
  Payment,
  Plan,
  StaffMember,
  WhatsappTemplate,
} from '@/lib/types';

export interface GymSnapshot {
  members: Member[];
  memberships: Membership[];
  payments: Payment[];
  plans: Plan[];
  staff: StaffMember[];
  attendance: Attendance[];
  followUps: FollowUp[];
  templates: WhatsappTemplate[];
}

const HISTORY_DAYS = 60;

export async function fetchGymSnapshot(): Promise<GymSnapshot> {
  const since = new Date(Date.now() - HISTORY_DAYS * 86400000).toISOString();

  const [members, memberships, payments, plans, staff, attendance, followUps, templates] = await Promise.all([
    supabase.from('members').select('*').order('full_name'),
    supabase.from('memberships').select('*').order('end_date', { ascending: false }),
    supabase.from('payments').select('*').order('paid_on', { ascending: false }).order('created_at', { ascending: false }),
    supabase.from('membership_plans').select('*').order('price'),
    supabase.from('user_profiles').select('id, full_name, role, phone').in('role', ['receptionist', 'trainer']).order('full_name'),
    supabase.from('attendance').select('id, member_id, checked_in_at').gte('checked_in_at', since).order('checked_in_at', { ascending: false }),
    supabase.from('follow_ups').select('id, member_id, kind, created_at').gte('created_at', since).order('created_at', { ascending: false }),
    supabase.from('whatsapp_templates').select('kind, body'),
  ]);

  const results = [members, memberships, payments, plans, staff, attendance, followUps, templates];
  const failed = results.find((result) => result.error);
  if (failed?.error) throw failed.error;

  return {
    members: (members.data ?? []) as Member[],
    memberships: (memberships.data ?? []) as Membership[],
    payments: (payments.data ?? []) as Payment[],
    plans: (plans.data ?? []) as Plan[],
    staff: (staff.data ?? []) as StaffMember[],
    attendance: (attendance.data ?? []) as Attendance[],
    followUps: (followUps.data ?? []) as FollowUp[],
    templates: (templates.data ?? []) as WhatsappTemplate[],
  };
}
