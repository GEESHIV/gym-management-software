import type { Member, Membership, Payment } from '@/lib/types';

export type MembershipStatus = 'active' | 'expiring' | 'expired' | 'none';

const EXPIRING_WITHIN_DAYS = 7;

export function daysUntil(isoDate: string) {
  const [year, month, day] = isoDate.split('-').map(Number);
  const now = new Date();
  const target = Date.UTC(year, month - 1, day);
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target - today) / 86400000);
}

export function statusForEndDate(endDate: string | null): MembershipStatus {
  if (!endDate) return 'none';
  const days = daysUntil(endDate);
  if (days < 0) return 'expired';
  if (days <= EXPIRING_WITHIN_DAYS) return 'expiring';
  return 'active';
}

export function paidAmountFor(membership: Membership, payments: Payment[]) {
  return payments
    .filter((p) => p.membership_id === membership.id && p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0);
}

export function pendingAmountFor(membership: Membership, payments: Payment[]) {
  return Math.max(0, membership.amount - paidAmountFor(membership, payments));
}

export interface MemberSummary {
  status: MembershipStatus;
  latest: Membership | null;
  pendingFees: number;
}

export function summarizeMembers(
  members: Member[],
  memberships: Membership[],
  payments: Payment[],
): Map<string, MemberSummary> {
  const summaries = new Map<string, MemberSummary>();

  for (const member of members) {
    const own = memberships.filter((m) => m.member_id === member.id);
    const latest = own.reduce<Membership | null>(
      (best, m) => (!best || m.end_date > best.end_date ? m : best),
      null,
    );
    const pendingFees = own.reduce((sum, m) => sum + pendingAmountFor(m, payments), 0);
    summaries.set(member.id, { status: statusForEndDate(latest?.end_date ?? null), latest, pendingFees });
  }

  return summaries;
}
