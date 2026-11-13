import { useMemo, useState } from 'react';
import { CheckCircle2, Download, IndianRupee, Search, Wallet } from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { PaymentBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { EmptyState } from '@/components/ui/PageStates';
import { inputClass } from '@/components/ui/Field';
import type { GymSnapshot } from '@/lib/gymSnapshot';
import { errorMessage } from '@/lib/errors';
import { formatDate, formatINR, monthKey, todayISO } from '@/lib/format';
import { downloadReceipt } from '@/lib/receipt';
import { summarizeMembers } from '@/lib/membership';
import { supabase } from '@/lib/supabase';
import type { Gym, Payment } from '@/lib/types';

interface PaymentsPageProps {
  gym: Gym;
  snapshot: GymSnapshot;
  onChanged: () => void;
}

export function PaymentsPage({ gym, snapshot, onChanged }: PaymentsPageProps) {
  const { members, memberships, payments } = snapshot;
  const [query, setQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState<'all' | 'cash' | 'upi'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending'>('all');
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const memberById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
  const planById = useMemo(() => new Map(memberships.map((m) => [m.id, m.plan_name])), [memberships]);

  const totals = useMemo(() => {
    const month = monthKey(todayISO());
    const paidThisMonth = payments.filter((p) => p.status === 'paid' && monthKey(p.paid_on) === month);
    const sum = (list: Payment[]) => list.reduce((total, p) => total + p.amount, 0);
    const pending = payments.filter((p) => p.status === 'pending');
    const memberSummaries = summarizeMembers(members, memberships, payments);
    let outstanding = 0;
    memberSummaries.forEach((s) => (outstanding += s.pendingFees));
    return {
      cash: sum(paidThisMonth.filter((p) => p.method === 'cash')),
      upi: sum(paidThisMonth.filter((p) => p.method === 'upi')),
      awaiting: pending.length,
      awaitingAmount: sum(pending),
      outstanding,
    };
  }, [payments, members, memberships]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return payments.filter((p) => {
      if (methodFilter !== 'all' && p.method !== methodFilter) return false;
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (!q) return true;
      return (memberById.get(p.member_id)?.full_name ?? '').toLowerCase().includes(q);
    });
  }, [payments, query, methodFilter, statusFilter, memberById]);

  const verify = async (payment: Payment) => {
    setActionError(null);
    setVerifyingId(payment.id);
    try {
      const { data, error } = await supabase
        .from('payments')
        .update({ status: 'paid' })
        .eq('id', payment.id)
        .select('id')
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('This payment could not be verified. Please refresh and try again.');
      onChanged();
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setVerifyingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader title="Payments" description="Every collection recorded for your gym." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Cash this month" value={formatINR(totals.cash)} icon={Wallet} tone="emerald" />
        <StatCard label="UPI this month" value={formatINR(totals.upi)} icon={IndianRupee} tone="sky" hint="Verified only" />
        <StatCard label="Awaiting UPI verification" value={totals.awaiting} icon={CheckCircle2} tone="amber" hint={formatINR(totals.awaitingAmount)} />
        <StatCard label="Outstanding fees" value={formatINR(totals.outstanding)} icon={Wallet} tone="rose" />
      </div>

      {actionError && <Notice>{actionError}</Notice>}

      <div className="flex flex-col gap-3 lg:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by member name"
            aria-label="Search payments"
            className={`${inputClass} pl-10`}
          />
        </div>
        <select value={methodFilter} onChange={(e) => setMethodFilter(e.target.value as 'all' | 'cash' | 'upi')} aria-label="Filter by method" className={`${inputClass} lg:w-44`}>
          <option value="all">All methods</option>
          <option value="cash">Cash</option>
          <option value="upi">UPI</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'all' | 'paid' | 'pending')} aria-label="Filter by status" className={`${inputClass} lg:w-44`}>
          <option value="all">All statuses</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        {payments.length === 0 ? (
          <EmptyState icon={Wallet} title="No payments yet" description="Record a payment from a member's profile and it will appear here." />
        ) : rows.length === 0 ? (
          <EmptyState icon={Search} title="No matching payments" description="Try a different search or filter." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/70 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium">Member</th>
                  <th className="px-5 py-3 font-medium">Membership</th>
                  <th className="px-5 py-3 font-medium">Method</th>
                  <th className="px-5 py-3 font-medium">Reference</th>
                  <th className="px-5 py-3 text-right font-medium">Amount</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((p) => {
                  const member = memberById.get(p.member_id);
                  const planName = p.membership_id ? planById.get(p.membership_id) ?? null : null;
                  return (
                    <tr key={p.id} className="transition hover:bg-slate-50/70">
                      <td className="px-5 py-3.5 text-slate-600">{formatDate(p.paid_on)}</td>
                      <td className="px-5 py-3.5 font-medium text-slate-900">{member?.full_name ?? 'Unknown member'}</td>
                      <td className="px-5 py-3.5 text-slate-600">{planName ?? 'General'}</td>
                      <td className="px-5 py-3.5 text-slate-600">{p.method === 'upi' ? 'UPI' : 'Cash'}</td>
                      <td className="px-5 py-3.5 text-slate-500">{p.transaction_ref ?? '-'}</td>
                      <td className="px-5 py-3.5 text-right font-semibold text-slate-900">{formatINR(p.amount)}</td>
                      <td className="px-5 py-3.5"><PaymentBadge status={p.status} /></td>
                      <td className="px-5 py-3.5">
                        <div className="flex justify-end gap-2">
                          {p.status === 'pending' && (
                            <Button variant="secondary" className="px-3 py-1.5 text-xs" loading={verifyingId === p.id} onClick={() => verify(p)}>
                              Verify
                            </Button>
                          )}
                          {p.status === 'paid' && member && (
                            <Button
                              variant="ghost"
                              className="px-3 py-1.5 text-xs"
                              onClick={() => downloadReceipt(p, member, gym, planName)}
                            >
                              <Download className="h-3.5 w-3.5" />
                              Receipt
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
