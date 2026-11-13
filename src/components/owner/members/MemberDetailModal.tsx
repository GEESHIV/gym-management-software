import { useMemo, useState } from 'react';
import { CalendarPlus, Download, KeyRound, Mail, MapPin, Pencil, Phone, Plus, CheckCircle2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { MembershipBadge, PaymentBadge } from '@/components/ui/StatusBadge';
import { AddMembershipModal } from '@/components/owner/members/AddMembershipModal';
import { RecordPaymentModal } from '@/components/owner/members/RecordPaymentModal';
import { CreateMemberLoginModal } from '@/components/owner/members/CreateMemberLoginModal';
import { MemberQrCode } from '@/components/ui/MemberQrCode';
import type { GymSnapshot } from '@/lib/gymSnapshot';
import { supabase } from '@/lib/supabase';
import { errorMessage } from '@/lib/errors';
import { formatDate, formatINR } from '@/lib/format';
import { downloadReceipt } from '@/lib/receipt';
import { paidAmountFor, pendingAmountFor, summarizeMembers } from '@/lib/membership';
import type { Gym, Member, Payment } from '@/lib/types';

interface MemberDetailModalProps {
  gym: Gym;
  member: Member;
  snapshot: GymSnapshot;
  onEdit: () => void;
  onChanged: () => void;
  onClose: () => void;
}

type SubModal = 'membership' | 'payment' | 'login' | null;

export function MemberDetailModal({ gym, member, snapshot, onEdit, onChanged, onClose }: MemberDetailModalProps) {
  const [subModal, setSubModal] = useState<SubModal>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const memberships = useMemo(
    () => snapshot.memberships.filter((m) => m.member_id === member.id),
    [snapshot.memberships, member.id],
  );
  const payments = useMemo(
    () => snapshot.payments.filter((p) => p.member_id === member.id),
    [snapshot.payments, member.id],
  );
  const summary = summarizeMembers([member], snapshot.memberships, snapshot.payments).get(member.id);
  const planNameFor = (membershipId: string | null) =>
    memberships.find((m) => m.id === membershipId)?.plan_name ?? null;

  if (subModal === 'membership') {
    return (
      <AddMembershipModal
        gym={gym}
        member={member}
        plans={snapshot.plans}
        onClose={() => setSubModal(null)}
        onSaved={() => {
          setSubModal(null);
          onChanged();
        }}
      />
    );
  }

  if (subModal === 'payment') {
    return (
      <RecordPaymentModal
        gym={gym}
        member={member}
        memberships={memberships}
        payments={snapshot.payments}
        onClose={() => setSubModal(null)}
        onSaved={() => {
          setSubModal(null);
          onChanged();
        }}
      />
    );
  }

  if (subModal === 'login') {
    return (
      <CreateMemberLoginModal
        member={member}
        onClose={() => setSubModal(null)}
        onSaved={() => {
          setSubModal(null);
          onChanged();
        }}
      />
    );
  }

  const verifyPayment = async (payment: Payment) => {
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
    <Modal title="Member profile" onClose={onClose} size="lg">
      <div className="space-y-8">
        {actionError && <Notice>{actionError}</Notice>}

        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-lg font-semibold text-white">
              {member.full_name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase()).join('')}
            </span>
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold text-slate-900">{member.full_name}</p>
              <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                <span className="inline-flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{member.phone}</span>
                {member.email && <span className="inline-flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{member.email}</span>}
                {member.address && <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{member.address}</span>}
              </p>
            </div>
          </div>
          <Button variant="secondary" onClick={onEdit} className="shrink-0">
            <Pencil className="h-4 w-4" />
            Edit details
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Membership</p>
            <div className="mt-2"><MembershipBadge status={summary?.status ?? 'none'} /></div>
            <p className="mt-2 text-sm text-slate-600">{summary?.latest?.plan_name ?? 'No plan yet'}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Expires</p>
            <p className="mt-2 font-semibold text-slate-900">{summary?.latest ? formatDate(summary.latest.end_date) : '-'}</p>
            <p className="mt-1 text-xs text-slate-500">{summary?.latest ? `Started ${formatDate(summary.latest.start_date)}` : ''}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Pending fees</p>
            <p className="mt-2 font-semibold text-slate-900">{formatINR(summary?.pendingFees ?? 0)}</p>
            <p className="mt-1 text-xs text-slate-500">Across all memberships</p>
          </div>
        </div>

        <MemberQrCode memberName={member.full_name} token={member.qr_token} />

        <section className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
              <KeyRound className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-medium text-slate-900">Member login</p>
              <p className="text-xs text-slate-500">
                {member.user_id
                  ? 'Active. The member can sign in to see their own dashboard.'
                  : 'Not set up. Create a login so the member can sign in.'}
              </p>
            </div>
          </div>
          {!member.user_id && (
            <Button variant="secondary" onClick={() => setSubModal('login')} className="shrink-0">
              Create login
            </Button>
          )}
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="font-semibold text-slate-900">Memberships</h3>
            <Button variant="secondary" onClick={() => setSubModal('membership')}>
              <CalendarPlus className="h-4 w-4" />
              Add membership
            </Button>
          </div>
          {memberships.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
              No memberships yet. Add a plan to start tracking expiry.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
              {memberships.map((m) => {
                const pending = pendingAmountFor(m, snapshot.payments);
                return (
                  <li key={m.id} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{m.plan_name}</p>
                      <p className="text-xs text-slate-500">
                        {formatDate(m.start_date)} to {formatDate(m.end_date)}
                      </p>
                    </div>
                    <div className="text-sm text-slate-600 sm:text-right">
                      <p>
                        {formatINR(m.amount)}
                        {pending > 0 && <span className="ml-2 font-medium text-amber-700">{formatINR(pending)} due</span>}
                      </p>
                      <p className="text-xs text-slate-500">Paid {formatINR(paidAmountFor(m, snapshot.payments))}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="font-semibold text-slate-900">Payments</h3>
            <Button variant="secondary" onClick={() => setSubModal('payment')}>
              <Plus className="h-4 w-4" />
              Record payment
            </Button>
          </div>
          {payments.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
              No payments recorded for this member yet.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
              {payments.map((p) => (
                <li key={p.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900">
                      {formatINR(p.amount)} <span className="font-normal text-slate-500">via {p.method === 'upi' ? 'UPI' : 'cash'}</span>
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatDate(p.paid_on)}
                      {planNameFor(p.membership_id) && ` - ${planNameFor(p.membership_id)}`}
                      {p.transaction_ref && ` - Ref ${p.transaction_ref}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <PaymentBadge status={p.status} />
                    {p.status === 'pending' && (
                      <Button variant="secondary" className="px-3 py-1.5 text-xs" loading={verifyingId === p.id} onClick={() => verifyPayment(p)}>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Verify
                      </Button>
                    )}
                    {p.status === 'paid' && (
                      <Button
                        variant="ghost"
                        className="px-3 py-1.5 text-xs"
                        onClick={() => downloadReceipt(p, member, gym, planNameFor(p.membership_id))}
                        aria-label="Download receipt"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Receipt
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Modal>
  );
}
