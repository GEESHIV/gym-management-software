import { useMemo } from 'react';
import { Activity, AlertCircle, CalendarClock, IndianRupee, UserPlus, Users, Wallet } from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { MembershipBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/PageStates';
import type { GymSnapshot } from '@/lib/gymSnapshot';
import { formatDate, formatINR, monthKey, todayISO } from '@/lib/format';
import { summarizeMembers } from '@/lib/membership';
import type { Gym } from '@/lib/types';
import type { OwnerPage } from '@/components/owner/OwnerApp';

interface OwnerDashboardProps {
  gym: Gym;
  snapshot: GymSnapshot;
  onNavigate: (page: OwnerPage) => void;
}

const MONTHS_IN_CHART = 6;
const NEW_MEMBER_WINDOW_DAYS = 30;

export function OwnerDashboard({ gym, snapshot, onNavigate }: OwnerDashboardProps) {
  const { members, memberships, payments } = snapshot;

  const stats = useMemo(() => {
    const today = todayISO();
    const currentMonth = monthKey(today);
    const summaries = summarizeMembers(members, memberships, payments);
    const windowStart = Date.now() - NEW_MEMBER_WINDOW_DAYS * 86400000;

    let active = 0;
    let expired = 0;
    let pendingFees = 0;
    summaries.forEach((s) => {
      if (s.status === 'active' || s.status === 'expiring') active += 1;
      if (s.status === 'expired') expired += 1;
      pendingFees += s.pendingFees;
    });

    const paid = payments.filter((p) => p.status === 'paid');
    const sumWhere = (predicate: (iso: string) => boolean) =>
      paid.filter((p) => predicate(p.paid_on)).reduce((sum, p) => sum + p.amount, 0);

    const chart = Array.from({ length: MONTHS_IN_CHART }, (_, index) => {
      const date = new Date();
      date.setDate(1);
      date.setMonth(date.getMonth() - (MONTHS_IN_CHART - 1 - index));
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      return {
        key,
        label: date.toLocaleDateString('en-IN', { month: 'short' }),
        total: sumWhere((iso) => monthKey(iso) === key),
      };
    });

    const expiringSoon = members
      .map((m) => ({ member: m, summary: summaries.get(m.id) }))
      .filter((row) => row.summary?.status === 'expiring' && row.summary.latest)
      .sort((a, b) => (a.summary!.latest!.end_date > b.summary!.latest!.end_date ? 1 : -1))
      .slice(0, 5);

    return {
      totalMembers: members.length,
      active,
      newMembers: members.filter((m) => new Date(m.created_at).getTime() >= windowStart).length,
      expired,
      todayRevenue: sumWhere((iso) => iso === today),
      monthRevenue: sumWhere((iso) => monthKey(iso) === currentMonth),
      pendingFees,
      pendingUpi: payments.filter((p) => p.status === 'pending').length,
      chart,
      expiringSoon,
    };
  }, [members, memberships, payments]);

  const maxChart = Math.max(1, ...stats.chart.map((c) => c.total));

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Welcome back, ${gym.owner_name.split(' ')[0] ?? 'there'}`}
        description={`Here is how ${gym.name} is doing today.`}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total members" value={stats.totalMembers} icon={Users} tone="slate" />
        <StatCard label="Active members" value={stats.active} icon={Activity} tone="emerald" hint="Includes memberships expiring soon" />
        <StatCard label="New registrations" value={stats.newMembers} icon={UserPlus} tone="sky" hint="Last 30 days" />
        <StatCard label="Expired memberships" value={stats.expired} icon={CalendarClock} tone="rose" />
        <StatCard label="Today's revenue" value={formatINR(stats.todayRevenue)} icon={IndianRupee} tone="emerald" hint="Verified payments" />
        <StatCard label="This month's revenue" value={formatINR(stats.monthRevenue)} icon={Wallet} tone="emerald" />
        <StatCard label="Pending fees" value={formatINR(stats.pendingFees)} icon={AlertCircle} tone="amber" />
        <StatCard label="UPI awaiting verification" value={stats.pendingUpi} icon={AlertCircle} tone="amber" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6 xl:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">Revenue, last 6 months</h2>
              <p className="text-sm text-slate-500">Verified payments per month</p>
            </div>
          </div>
          <div className="mt-8 flex h-56 items-end gap-3 sm:gap-6">
            {stats.chart.map((bar) => {
              const height = Math.max(4, Math.round((bar.total / maxChart) * 100));
              return (
                <div key={bar.key} className="group flex h-full flex-1 flex-col items-center justify-end gap-2">
                  <span className="text-xs font-medium text-slate-500 opacity-0 transition group-hover:opacity-100">
                    {formatINR(bar.total)}
                  </span>
                  <div
                    className="w-full max-w-[3.5rem] rounded-t-xl bg-gradient-to-t from-emerald-600 to-emerald-400 transition-all duration-500 group-hover:from-emerald-700 group-hover:to-emerald-500"
                    style={{ height: `${height}%` }}
                    title={`${bar.label}: ${formatINR(bar.total)}`}
                  />
                  <span className="text-xs text-slate-500">{bar.label}</span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Expiring soon</h2>
            <button type="button" onClick={() => onNavigate('members')} className="text-sm font-medium text-emerald-700 hover:text-emerald-800">
              View all
            </button>
          </div>
          {stats.expiringSoon.length === 0 ? (
            <EmptyState icon={CalendarClock} title="Nothing expiring" description="No memberships end in the next 7 days." />
          ) : (
            <ul className="mt-4 divide-y divide-slate-100">
              {stats.expiringSoon.map(({ member, summary }) => (
                <li key={member.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">{member.full_name}</p>
                    <p className="text-xs text-slate-500">Ends {formatDate(summary!.latest!.end_date)}</p>
                  </div>
                  <MembershipBadge status={summary!.status} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
