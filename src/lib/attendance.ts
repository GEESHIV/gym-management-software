import { supabase } from '@/lib/supabase';
import type { Attendance } from '@/lib/types';

export type CheckInStatus = 'checked_in' | 'duplicate' | 'no_active_membership' | 'not_found';

export interface CheckInResult {
  status: CheckInStatus;
  member_name: string | null;
  end_date: string | null;
  checked_in_at: string | null;
}

const CHECK_IN_STATUSES: CheckInStatus[] = ['checked_in', 'duplicate', 'no_active_membership', 'not_found'];

function parseCheckIn(data: unknown): CheckInResult {
  if (typeof data !== 'object' || data === null) throw new Error('Unexpected response from the check-in service.');
  const row = data as Record<string, unknown>;
  const status = CHECK_IN_STATUSES.find((s) => s === row.status);
  if (!status) throw new Error('Unexpected response from the check-in service.');
  return {
    status,
    member_name: typeof row.member_name === 'string' ? row.member_name : null,
    end_date: typeof row.end_date === 'string' ? row.end_date : null,
    checked_in_at: typeof row.checked_in_at === 'string' ? row.checked_in_at : null,
  };
}

export async function recordCheckIn(qrToken: string): Promise<CheckInResult> {
  const { data, error } = await supabase.rpc('record_attendance', { p_qr_token: qrToken });
  if (error) throw error;
  return parseCheckIn(data);
}

const pad = (value: number) => String(value).padStart(2, '0');

export function localDayKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function summarizeAttendance(attendance: Attendance[], days: number) {
  const todayKey = localDayKey(new Date());
  const counts = new Map<string, number>();
  for (const row of attendance) {
    const key = localDayKey(new Date(row.checked_in_at));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const daily = Array.from({ length: days }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - index));
    const key = localDayKey(date);
    return { key, label: date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), count: counts.get(key) ?? 0 };
  });

  const windowStart = Date.now() - 7 * 86400000;
  return {
    today: counts.get(todayKey) ?? 0,
    last7Days: attendance.filter((row) => new Date(row.checked_in_at).getTime() >= windowStart).length,
    uniqueMembers: new Set(attendance.map((row) => row.member_id)).size,
    daily,
  };
}

const PEAK_FIRST_HOUR = 5;
const PEAK_LAST_HOUR = 22;

export function summarizeByHour(attendance: Attendance[]) {
  const counts = new Array<number>(24).fill(0);
  for (const row of attendance) counts[new Date(row.checked_in_at).getHours()] += 1;
  return Array.from({ length: PEAK_LAST_HOUR - PEAK_FIRST_HOUR + 1 }, (_, index) => {
    const hour = PEAK_FIRST_HOUR + index;
    return { hour, label: `${hour % 12 === 0 ? 12 : hour % 12}${hour < 12 ? 'am' : 'pm'}`, count: counts[hour] };
  });
}

export function lastVisitByMember(attendance: Attendance[]) {
  const latest = new Map<string, string>();
  for (const row of attendance) {
    const current = latest.get(row.member_id);
    if (!current || row.checked_in_at > current) latest.set(row.member_id, row.checked_in_at);
  }
  return latest;
}
