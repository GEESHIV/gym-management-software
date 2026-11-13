import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Field, inputClass } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { Notice } from '@/components/ui/Notice';
import { supabase } from '@/lib/supabase';
import { errorMessage } from '@/lib/errors';
import { addMonthsISO, formatDate, formatINR, todayISO } from '@/lib/format';
import type { Gym, Member, Plan } from '@/lib/types';

interface AddMembershipModalProps {
  gym: Gym;
  member: Member;
  plans: Plan[];
  onSaved: () => void;
  onClose: () => void;
}

export function AddMembershipModal({ gym, member, plans, onSaved, onClose }: AddMembershipModalProps) {
  const activePlans = plans.filter((p) => p.is_active);
  const [planId, setPlanId] = useState(activePlans[0]?.id ?? '');
  const [startDate, setStartDate] = useState(todayISO());
  const [amount, setAmount] = useState(String(activePlans[0]?.price ?? ''));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const plan = activePlans.find((p) => p.id === planId) ?? null;
  const endDate = plan && startDate ? addMonthsISO(startDate, plan.duration_months) : null;

  const choosePlan = (id: string) => {
    setPlanId(id);
    const next = activePlans.find((p) => p.id === id);
    if (next) setAmount(String(next.price));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    const price = Number(amount);
    if (!plan) return setError('Choose a membership plan.');
    if (!startDate) return setError('Choose a start date.');
    if (!Number.isFinite(price) || price < 0) return setError('Enter a valid amount.');

    setSubmitting(true);
    try {
      const { error: insertError } = await supabase.from('memberships').insert({
        gym_id: gym.id,
        member_id: member.id,
        plan_id: plan.id,
        plan_name: plan.name,
        amount: price,
        start_date: startDate,
        end_date: addMonthsISO(startDate, plan.duration_months),
      });
      if (insertError) throw insertError;
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <Modal title={`New membership for ${member.full_name}`} onClose={onClose}>
      {activePlans.length === 0 ? (
        <Notice>Create an active membership plan in Plans & pricing first.</Notice>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          {error && <Notice>{error}</Notice>}

          <Field label="Plan" htmlFor="ms-plan">
            <select id="ms-plan" value={planId} onChange={(e) => choosePlan(e.target.value)} className={inputClass}>
              {activePlans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.duration_months} {p.duration_months === 1 ? 'month' : 'months'}) - {formatINR(p.price)}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Start date" htmlFor="ms-start">
              <input id="ms-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Plan price (INR)" htmlFor="ms-amount">
              <input id="ms-amount" type="number" min="0" step="1" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputClass} />
            </Field>
          </div>

          <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Membership runs until <span className="font-semibold text-slate-900">{endDate ? formatDate(endDate) : '-'}</span>
          </div>

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Create membership
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
