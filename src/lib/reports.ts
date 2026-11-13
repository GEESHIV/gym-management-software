import type { GymSnapshot } from '@/lib/gymSnapshot';
import { toISODate } from '@/lib/format';
import { summarizeMembers, type MembershipStatus } from '@/lib/membership';

type CsvCell = string | number | null;

const STATUS_LABEL: Record<MembershipStatus, string> = {
  active: 'Active',
  expiring: 'Expiring soon',
  expired: 'Expired',
  none: 'No membership',
};

function escapeCell(value: CsvCell) {
  if (value === null) return '';
  let text = String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(headers: string[], rows: CsvCell[][]) {
  return [headers, ...rows].map((row) => row.map(escapeCell).join(',')).join('\r\n');
}

export function downloadCsv(fileName: string, csv: string) {
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

const inRange = (isoDate: string, from: string, to: string) => isoDate >= from && isoDate <= to;

export const memberRosterHeaders = [
  'Member',
  'Phone',
  'Membership status',
  'Plan',
  'Start date',
  'End date',
  'Pending fees (INR)',
  'Trainer',
  'Promotions',
];

export function memberRosterRows(snapshot: GymSnapshot): CsvCell[][] {
  const { members, memberships, payments, staff } = snapshot;
  const summaries = summarizeMembers(members, memberships, payments);
  const trainerName = new Map(staff.map((s) => [s.id, s.full_name]));
  return members.map((m) => {
    const summary = summaries.get(m.id);
    const latest = summary?.latest ?? null;
    return [
      m.full_name,
      m.phone,
      STATUS_LABEL[summary?.status ?? 'none'],
      latest?.plan_name ?? null,
      latest?.start_date ?? null,
      latest?.end_date ?? null,
      summary?.pendingFees ?? 0,
      m.assigned_trainer_id ? trainerName.get(m.assigned_trainer_id) ?? null : null,
      m.whatsapp_opt_out ? 'Opted out' : 'Opted in',
    ];
  });
}

export const paymentHeaders = ['Date', 'Member', 'Plan', 'Method', 'Status', 'Reference', 'Amount (INR)'];

export function paymentRows(snapshot: GymSnapshot, from: string, to: string): CsvCell[][] {
  const names = new Map(snapshot.members.map((m) => [m.id, m.full_name]));
  const plans = new Map(snapshot.memberships.map((m) => [m.id, m.plan_name]));
  return snapshot.payments
    .filter((p) => inRange(p.paid_on, from, to))
    .map((p) => [
      p.paid_on,
      names.get(p.member_id) ?? 'Unknown member',
      p.membership_id ? plans.get(p.membership_id) ?? null : null,
      p.method === 'upi' ? 'UPI' : 'Cash',
      p.status === 'paid' ? 'Paid' : 'Pending',
      p.transaction_ref,
      p.amount,
    ]);
}

export const attendanceHeaders = ['Date', 'Time', 'Member'];

export function attendanceRows(snapshot: GymSnapshot, from: string, to: string): CsvCell[][] {
  const names = new Map(snapshot.members.map((m) => [m.id, m.full_name]));
  return snapshot.attendance
    .map((a) => ({ date: new Date(a.checked_in_at), memberId: a.member_id }))
    .filter(({ date }) => inRange(toISODate(date), from, to))
    .map(({ date, memberId }) => [
      toISODate(date),
      date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      names.get(memberId) ?? 'Unknown member',
    ]);
}
