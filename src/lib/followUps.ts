import { lastVisitByMember } from '@/lib/attendance';
import { formatDate, formatINR } from '@/lib/format';
import type { GymSnapshot } from '@/lib/gymSnapshot';
import { daysUntil, summarizeMembers } from '@/lib/membership';
import type { FollowUpKind, Member } from '@/lib/types';

const INACTIVE_AFTER_DAYS = 7;
const NEW_MEMBER_WINDOW_DAYS = 7;

export interface FollowUpItem {
  key: string;
  member: Member;
  kind: FollowUpKind;
  detail: string;
  vars: Record<string, string>;
  lastContacted: string | null;
}

export function buildFollowUpItems(snapshot: GymSnapshot, gymName: string): FollowUpItem[] {
  const { members, memberships, payments, attendance, followUps } = snapshot;
  const summaries = summarizeMembers(members, memberships, payments);
  const lastVisit = lastVisitByMember(attendance);
  const now = Date.now();
  const items: FollowUpItem[] = [];

  const lastContactedFor = (memberId: string, kind: FollowUpKind) =>
    followUps.find((f) => f.member_id === memberId && f.kind === kind)?.created_at ?? null;

  for (const member of members) {
    const summary = summaries.get(member.id);
    const latest = summary?.latest ?? null;
    const base = {
      member,
      vars: {
        member_name: member.full_name,
        gym_name: gymName,
        plan_name: latest?.plan_name ?? '',
        end_date: latest ? formatDate(latest.end_date) : '',
        days_left: latest ? String(Math.max(0, daysUntil(latest.end_date))) : '',
        amount_due: formatINR(summary?.pendingFees ?? 0),
      },
    };
    const push = (kind: FollowUpKind, detail: string) =>
      items.push({ ...base, key: `${kind}-${member.id}`, kind, detail, lastContacted: lastContactedFor(member.id, kind) });

    if (summary?.status === 'expiring' && latest) {
      const days = daysUntil(latest.end_date);
      push('renewal', days === 0 ? 'Ends today' : `Ends in ${days} day${days === 1 ? '' : 's'}`);
    }
    if (summary?.status === 'expired' && latest) push('expired', `Ended ${formatDate(latest.end_date)}`);
    if (summary && summary.pendingFees > 0) push('pending_fee', `${formatINR(summary.pendingFees)} unpaid`);

    const isActive = summary?.status === 'active' || summary?.status === 'expiring';
    const last = lastVisit.get(member.id);
    const absentDays = last ? Math.floor((now - new Date(last).getTime()) / 86400000) : null;
    if (isActive && (absentDays === null || absentDays >= INACTIVE_AFTER_DAYS)) {
      push('inactive', absentDays === null ? 'No visits in the last 60 days' : `Last visit ${absentDays} days ago`);
    }

    if (now - new Date(member.created_at).getTime() <= NEW_MEMBER_WINDOW_DAYS * 86400000) {
      push('new_member', `Joined ${formatDate(member.created_at.slice(0, 10))}`);
    }

    if (!member.whatsapp_opt_out) push('promotional', 'Opted in to offers');
  }

  return items;
}
