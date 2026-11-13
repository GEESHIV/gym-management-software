import { CalendarCheck, IndianRupee, Timer } from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import { MembershipBadge, PaymentBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/PageStates';
import { formatDate, formatDateTime, formatINR, monthKey, toISODate, todayISO } from '@/lib/format';
import { daysUntil, statusForEndDate } from '@/lib/membership';
import type { MemberPortalData } from '@/lib/memberPortal';

interface MemberOverviewProps {
  data: MemberPortalData;
}

function daysLeftLabel(days: number) {
  if (days < 0) return 'Ended';
  if (days === 0) return 'Ends today';
  return `${days} ${days === 1 ? 'day' : 'days'} left`;
}

export function MemberOverview({ data }: MemberOverviewProps) {
  const { membership, attendance, payments, member } = data;
  const firstName = member.full_name.split(' ')[0];
  const status = statusForEndDate(membership?.end_date ?? null);
  const days = membership ? daysUntil(membership.end_date) : null;
  const currentMonth = monthKey(todayISO());
  const visitsThisMonth = attendance.filter((ts) => monthKey(toISODate(new Date(ts))) === currentMonth).length;
  const pendingFee = membership?.pending_fee ?? 0;

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-slate-500">Welcome back</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">Hi {firstName}</h1>
        </div>
        <MembershipBadge status={status} />
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Membership" value={days === null ? 'None' : daysLeftLabel(days)} icon={Timer} tone="emerald" />
        <StatCard label="Visits this month" value={visitsThisMonth} icon={CalendarCheck} tone="sky" />
        <StatCard label="Balance due" value={formatINR(pendingFee)} icon={IndianRupee} tone={pendingFee > 0 ? 'amber' : 'emerald'} />
      </div>

      {membership ? (
        <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Current plan</h2>
          <p className="mt-2 text-xl font-semibold text-slate-900">{membership.plan_name}</p>
          <p className="mt-1 text-sm text-slate-500">
            Valid {formatDate(membership.start_date)} to {formatDate(membership.end_date)}
          </p>
          {pendingFee > 0 && (
            <p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
              {formatINR(pendingFee)} is still due on this plan. Please clear it at the front desk.
            </p>
          )}
        </section>
      ) : (
        <EmptyState icon={Timer} title="No membership yet" description="Ask the front desk to set up your plan." />
      )}

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Recent check-ins</h2>
          {attendance.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No visits recorded yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-slate-100">
              {attendance.slice(0, 6).map((ts) => (
                <li key={ts} className="py-3 text-sm text-slate-700">
                  {formatDateTime(ts)}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Payments</h2>
          {payments.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No payments recorded yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-slate-100">
              {payments.slice(0, 6).map((p, i) => (
                <li key={`${p.paid_on}-${i}`} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <span className="text-slate-700">
                    {formatDate(p.paid_on)} · {p.method === 'upi' ? 'UPI' : 'Cash'}
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="font-medium text-slate-900">{formatINR(p.amount)}</span>
                    <PaymentBadge status={p.status} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
