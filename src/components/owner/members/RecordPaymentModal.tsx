import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Field, inputClass } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { Notice } from '@/components/ui/Notice';
import { supabase } from '@/lib/supabase';
import { errorMessage } from '@/lib/errors';
import { formatDate, formatINR, todayISO } from '@/lib/format';
import { pendingAmountFor } from '@/lib/membership';
import type { Gym, Member, Membership, Payment, PaymentMethod } from '@/lib/types';

interface RecordPaymentModalProps {
  gym: Gym;
  member: Member;
  memberships: Membership[];
  payments: Payment[];
  onSaved: () => void;
  onClose: () => void;
}

export function RecordPaymentModal({ gym, member, memberships, payments, onSaved, onClose }: RecordPaymentModalProps) {
  const pendingOf = (id: string) => {
    const membership = memberships.find((m) => m.id === id);
    return membership ? pendingAmountFor(membership, payments) : 0;
  };
  const firstOpen = memberships.find((m) => pendingAmountFor(m, payments) > 0) ?? memberships[0];

  const [membershipId, setMembershipId] = useState(firstOpen?.id ?? '');
  const [amount, setAmount] = useState(firstOpen ? String(pendingOf(firstOpen.id) || firstOpen.amount) : '');
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [reference, setReference] = useState('');
  const [paidOn, setPaidOn] = useState(todayISO());
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const selected = memberships.find((m) => m.id === membershipId) ?? null;
  const pending = selected ? pendingAmountFor(selected, payments) : null;

  const chooseMembership = (id: string) => {
    setMembershipId(id);
    if (id) setAmount(String(pendingOf(id)));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return setError('Enter an amount greater than zero.');
    if (pending !== null && value > pending) {
      return setError(`The amount is more than the pending balance of ${formatINR(pending)}.`);
    }
    if (method === 'upi' && reference.trim().length < 4) {
      return setError('Enter the UPI transaction reference so it can be verified.');
    }
    if (!paidOn) return setError('Choose the payment date.');

    setSubmitting(true);
    try {
      const { error: insertError } = await supabase.from('payments').insert({
        gym_id: gym.id,
        member_id: member.id,
        membership_id: membershipId || null,
        amount: value,
        method,
        status: method === 'cash' ? 'paid' : 'pending',
        transaction_ref: method === 'upi' ? reference.trim() : null,
        paid_on: paidOn,
      });
      if (insertError) throw insertError;
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <Modal title={`Record payment for ${member.full_name}`} onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {error && <Notice>{error}</Notice>}

        <Field label="Against membership" htmlFor="rp-membership" hint={pending !== null ? `Pending: ${formatINR(pending)}` : 'No membership selected'}>
          <select id="rp-membership" value={membershipId} onChange={(e) => chooseMembership(e.target.value)} className={inputClass}>
            <option value="">General payment</option>
            {memberships.map((m) => (
              <option key={m.id} value={m.id}>
                {m.plan_name}, ends {formatDate(m.end_date)}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Amount (INR)" htmlFor="rp-amount">
            <input id="rp-amount" type="number" min="1" step="1" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Payment date" htmlFor="rp-date">
            <input id="rp-date" type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} className={inputClass} />
          </Field>
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-slate-700">Payment method</legend>
          <div className="grid grid-cols-2 gap-3">
            {(['cash', 'upi'] as const).map((option) => (
              <label
                key={option}
                className={`flex cursor-pointer items-center justify-center rounded-xl border px-4 py-3 text-sm font-medium transition ${
                  method === option
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-4 ring-emerald-500/10'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="method"
                  value={option}
                  checked={method === option}
                  onChange={() => setMethod(option)}
                  className="sr-only"
                />
                {option === 'cash' ? 'Cash' : 'UPI'}
              </label>
            ))}
          </div>
        </fieldset>

        {method === 'upi' && (
          <Field
            label="UPI transaction reference"
            htmlFor="rp-ref"
            hint="The payment is marked pending until you verify it against your bank or UPI app."
          >
            <input id="rp-ref" value={reference} onChange={(e) => setReference(e.target.value)} className={inputClass} placeholder="e.g. 412938475612" />
          </Field>
        )}

        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>
            {method === 'cash' ? 'Record cash payment' : 'Save UPI payment'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
