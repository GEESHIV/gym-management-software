import { useState, type FormEvent } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Field, inputClass } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { Notice } from '@/components/ui/Notice';
import { supabase } from '@/lib/supabase';
import { errorMessage } from '@/lib/errors';
import type { Plan } from '@/lib/types';

const durationPresets = [1, 3, 6, 12];

interface PlanFormModalProps {
  gymId: string;
  plan: Plan | null;
  onSaved: () => void;
  onClose: () => void;
}

export function PlanFormModal({ gymId, plan, onSaved, onClose }: PlanFormModalProps) {
  const [name, setName] = useState(plan?.name ?? '');
  const [months, setMonths] = useState(String(plan?.duration_months ?? 1));
  const [price, setPrice] = useState(plan ? String(plan.price) : '');
  const [isActive, setIsActive] = useState(plan?.is_active ?? true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    const duration = Number(months);
    const amount = Number(price);
    if (name.trim().length < 2) return setError('Enter a plan name.');
    if (!Number.isInteger(duration) || duration < 1 || duration > 120) return setError('Duration must be between 1 and 120 months.');
    if (!Number.isFinite(amount) || amount < 0) return setError('Enter a valid price.');

    const payload = { name: name.trim(), duration_months: duration, price: amount, is_active: isActive };

    setSubmitting(true);
    try {
      if (plan) {
        const { data, error: updateError } = await supabase
          .from('membership_plans')
          .update(payload)
          .eq('id', plan.id)
          .select('id')
          .maybeSingle();
        if (updateError) throw updateError;
        if (!data) throw new Error('This plan could not be updated. Please refresh and try again.');
      } else {
        const { error: insertError } = await supabase.from('membership_plans').insert({ ...payload, gym_id: gymId });
        if (insertError) throw insertError;
      }
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!plan) return;
    setError(null);
    setSubmitting(true);
    try {
      const { error: deleteError } = await supabase.from('membership_plans').delete().eq('id', plan.id);
      if (deleteError) throw deleteError;
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <Modal title={plan ? 'Edit plan' : 'New membership plan'} onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {error && <Notice>{error}</Notice>}

        <Field label="Plan name" htmlFor="plan-name">
          <input id="plan-name" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="Monthly, Quarterly, Annual" />
        </Field>

        <Field label="Duration (months)" htmlFor="plan-months">
          <div className="flex flex-wrap gap-2">
            {durationPresets.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setMonths(String(preset))}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  months === String(preset)
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {preset} {preset === 1 ? 'month' : 'months'}
              </button>
            ))}
          </div>
          <input
            id="plan-months"
            type="number"
            min="1"
            max="120"
            value={months}
            onChange={(e) => setMonths(e.target.value)}
            className={`${inputClass} mt-3`}
          />
        </Field>

        <Field label="Price (INR)" htmlFor="plan-price">
          <input id="plan-price" type="number" min="0" step="1" value={price} onChange={(e) => setPrice(e.target.value)} className={inputClass} />
        </Field>

        <label className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
          />
          Available for new memberships
        </label>

        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
          {plan ? (
            confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600">Delete this plan?</span>
                <Button variant="danger" className="px-3 py-1.5 text-xs" onClick={handleDelete} loading={submitting}>
                  Yes, delete
                </Button>
                <Button variant="ghost" className="px-3 py-1.5 text-xs" onClick={() => setConfirmDelete(false)}>
                  Keep
                </Button>
              </div>
            ) : (
              <Button variant="ghost" className="text-rose-600 hover:bg-rose-50" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="h-4 w-4" />
                Delete plan
              </Button>
            )
          ) : (
            <span />
          )}
          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {plan ? 'Save plan' : 'Create plan'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
