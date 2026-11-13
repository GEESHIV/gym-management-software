import { useEffect, useState, type FormEvent } from 'react';
import { Plus, Salad, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Field, inputClass } from '@/components/ui/Field';
import { Notice } from '@/components/ui/Notice';
import { EmptyState, LoadingState } from '@/components/ui/PageStates';
import { errorMessage } from '@/lib/errors';
import { formatDate } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { DietPlan } from '@/lib/types';

interface DietPlansPanelProps {
  gymId: string;
  memberId: string;
}

export function DietPlansPanel({ gymId, memberId }: DietPlansPanelProps) {
  const [plans, setPlans] = useState<DietPlan[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from('diet_plans')
      .select('id, member_id, title, body, created_at')
      .eq('member_id', memberId)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) setLoadError(errorMessage(error));
        else {
          setLoadError(null);
          setPlans((data ?? []) as DietPlan[]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [memberId, reloadKey]);

  const resetForm = () => {
    setCreating(false);
    setTitle('');
    setBody('');
    setSaveError(null);
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();
    if (!trimmedTitle || !trimmedBody) {
      setSaveError('Add a title and the diet details.');
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const { error } = await supabase.from('diet_plans').insert({
        gym_id: gymId,
        member_id: memberId,
        title: trimmedTitle,
        body: trimmedBody,
      });
      if (error) throw error;
      resetForm();
      setReloadKey((k) => k + 1);
    } catch (err) {
      setSaveError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const removePlan = async (plan: DietPlan) => {
    setDeletingId(plan.id);
    setLoadError(null);
    try {
      const { error } = await supabase.from('diet_plans').delete().eq('id', plan.id);
      if (error) throw error;
      setConfirmId(null);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setLoadError(errorMessage(err));
    } finally {
      setDeletingId(null);
    }
  };

  if (creating) {
    return (
      <form onSubmit={save} className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">New diet plan</h3>
          <button type="button" onClick={resetForm} aria-label="Cancel" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        <Field label="Plan title" htmlFor="d-title">
          <input id="d-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Lean bulk, 2,400 kcal" className={inputClass} />
        </Field>
        <Field label="Meals and guidance" htmlFor="d-body" hint="Write one meal per line, for example: Breakfast - oats, banana, milk.">
          <textarea id="d-body" rows={8} value={body} onChange={(e) => setBody(e.target.value)} className={inputClass} />
        </Field>
        {saveError && <Notice>{saveError}</Notice>}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={resetForm} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            Save plan
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-900">Diet plans</h3>
        <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => setCreating(true)}>
          <Plus className="h-3.5 w-3.5" />
          New plan
        </Button>
      </div>

      {loadError && <Notice>{loadError}</Notice>}

      {plans === null && !loadError ? (
        <LoadingState label="Loading plans..." />
      ) : plans && plans.length === 0 ? (
        <EmptyState icon={Salad} title="No diet plans yet" description="Write a meal plan the member can follow alongside training." />
      ) : (
        <ul className="space-y-4">
          {plans?.map((plan) => (
            <li key={plan.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900">{plan.title}</p>
                  <p className="text-xs text-slate-500">Created {formatDate(plan.created_at.slice(0, 10))}</p>
                </div>
                {confirmId === plan.id ? (
                  <div className="flex shrink-0 items-center gap-2">
                    <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => setConfirmId(null)}>
                      Keep
                    </Button>
                    <Button variant="danger" className="px-3 py-1.5 text-xs" loading={deletingId === plan.id} onClick={() => removePlan(plan)}>
                      Delete
                    </Button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmId(plan.id)}
                    aria-label="Delete plan"
                    className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-700">{plan.body}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
