import { supabase } from '@/lib/supabase';

const TOKEN_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

export interface MemberPortalData {
  member: { full_name: string; phone: string };
  gym: { name: string; mobile: string; address: string } | null;
  trainer: string | null;
  membership: { plan_name: string; start_date: string; end_date: string; amount: number; pending_fee: number } | null;
  payments: { paid_on: string; amount: number; method: 'cash' | 'upi'; status: 'paid' | 'pending' }[];
  attendance: string[];
  progress: { recorded_on: string; weight_kg: number | null; note: string }[];
  workouts: {
    title: string;
    notes: string;
    exercises: { day_label: string; exercise: string; sets: number | null; reps: string }[];
  }[];
  diets: { title: string; body: string }[];
}

export function extractMemberToken(input: string): string | null {
  return input.match(TOKEN_PATTERN)?.[0].toLowerCase() ?? null;
}

export function memberPortalUrl(token: string) {
  return `${window.location.origin}/member?token=${token}`;
}

function parseMemberPortal(data: unknown): MemberPortalData | null {
  if (data === null) return null;
  const candidate = data as Partial<MemberPortalData>;
  if (typeof candidate.member?.full_name !== 'string' || !Array.isArray(candidate.payments)) {
    throw new Error('Your membership details could not be read. Please try again.');
  }
  return candidate as MemberPortalData;
}

export async function fetchMemberPortal(token: string): Promise<MemberPortalData | null> {
  const { data, error } = await supabase.rpc('get_member_portal', { p_token: token });
  if (error) throw error;
  return parseMemberPortal(data);
}

export async function fetchMyMemberPortal(): Promise<MemberPortalData | null> {
  const { data, error } = await supabase.rpc('get_my_member_portal');
  if (error) throw error;
  return parseMemberPortal(data);
}
