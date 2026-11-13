import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Dumbbell, Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Field, inputClass } from '@/components/ui/Field';
import { Notice } from '@/components/ui/Notice';
import { EmptyState, LoadingState } from '@/components/ui/PageStates';
import { errorMessage } from '@/lib/errors';
import { formatDate } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { WorkoutPlan } from '@/lib/types';

interface WorkoutPlansPanelProps {
  gymId: string;
  memberId: string;
}

interface ExerciseDraft {
  day: string;
  exercise: string;
  sets: string;
  reps: string;
}

const emptyDraft = (): ExerciseDraft => ({ day: 'Day 1', exercise: '', sets: '3', reps: '10' });

const EXERCISE_LIMIT = 40;

export function WorkoutPlansPanel({ gymId, memberId }: WorkoutPlansPanelProps) {
  const [plans, setPlans] = useState<WorkoutPlan[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [drafts, setDrafts] = useState<ExerciseDraft[]>([emptyDraft()]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from('workout_plans')
      .select('id, member_id, title, notes, created_at, workout_exercises(id, day_label, exercise, sets, reps, sort_order)')
      .eq('member_id', memberId)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) setLoadError(errorMessage(error));
        else {
          setLoadError(null);
          setPlans(
            (data ?? []).map((row) => ({
              ...(row as Omit<WorkoutPlan, 'workout_exercises'>),
              workout_exercises: [...((row as { workout_exercises: WorkoutPlan['workout_exercises'] }).workout_exercises ?? [])].sort(
                (a, b) => a.sort_order - b.sort_order,
              ),
            })),
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [memberId, reloadKey]);

  const updateDraft = (index: number, key: keyof ExerciseDraft, value: string) =>
    setDrafts((prev) => prev.map((row, i) => (i === index ? { ...row, [key]: value } : row)));

  const resetForm = () => {
    setCreating(false);
    setTitle('');
    setNotes('');
    setDrafts([emptyDraft()]);
    setSaveError(null);
  };

  const validDrafts = useMemo(() => drafts.filter((d) => d.exercise.trim()), [drafts]);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setSaveError('Give the plan a title.');
      return;
    }
    if (validDrafts.length === 0) {
      setSaveError('Add at least one exercise.');
      return;
    }
    if (validDrafts.length > EXERCISE_LIMIT) {
      setSaveError(`A plan can have up to ${EXERCISE_LIMIT} exercises.`);
      return;
    }
    const badSets = validDrafts.find((d) => {
      if (d.sets.trim() === '') return false;
      const sets = Number(d.sets);
      return !Number.isInteger(sets) || sets < 1 || sets > 20;
    });
    if (badSets) {
      setSaveError('Sets must be a whole number from 1 to 20.');
      return;
    }

    const rows = validDrafts.map((d, index) => ({
      gym_id: gymId,
      day_label: d.day.trim() || 'Day 1',
      exercise: d.exercise.trim(),
      sets: d.sets.trim() === '' ? null : Number(d.sets),
      reps: d.reps.trim(),
      sort_order: index,
    }));

    setSaving(true);
    setSaveError(null);
    let planId: string | null = null;
    try {
      const { data: plan, error: planError } = await supabase
        .from('workout_plans')
        .insert({ gym_id: gymId, member_id: memberId, title: trimmedTitle, notes: notes.trim() })
        .select('id')
        .single();
      if (planError) throw planError;
      planId = plan.id as string;

      const { error: exerciseError } = await supabase
        .from('workout_exercises')
        .insert(rows.map((row) => ({ ...row, plan_id: planId })));
      if (exerciseError) throw exerciseError;

      resetForm();
      setReloadKey((k) => k + 1);
    } catch (err) {
      if (planId) await supabase.from('workout_plans').delete().eq('id', planId);
      setSaveError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };


  const removePlan = async (plan: WorkoutPlan) => {
    setDeletingId(plan.id);
    setLoadError(null);
    try {
      const { error } = await supabase.from('workout_plans').delete().eq('id', plan.id);
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
          <h3 className="text-sm font-semibold text-slate-900">New workout plan</h3>
          <button type="button" onClick={resetForm} aria-label="Cancel" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        <Field label="Plan title" htmlFor="w-title">
          <input id="w-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Strength base, phase 1" className={inputClass} />
        </Field>
        <Field label="Notes for the member (optional)" htmlFor="w-notes">
          <textarea id="w-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} />
        </Field>

        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">Exercises</p>
          {drafts.map((row, index) => (
            <div key={index} className="grid grid-cols-[1fr_1.6fr_4rem_4.5rem_auto] items-center gap-2">
              <input aria-label="Day" value={row.day} onChange={(e) => updateDraft(index, 'day', e.target.value)} className={inputClass} />
              <input aria-label="Exercise" value={row.exercise} onChange={(e) => updateDraft(index, 'exercise', e.target.value)} placeholder="Squat" className={inputClass} />
              <input aria-label="Sets" type="number" min="1" max="20" value={row.sets} onChange={(e) => updateDraft(index, 'sets', e.target.value)} className={inputClass} />
              <input aria-label="Reps" value={row.reps} onChange={(e) => updateDraft(index, 'reps', e.target.value)} placeholder="10-12" className={inputClass} />
              <button
                type="button"
                aria-label="Remove exercise"
                disabled={drafts.length === 1}
                onClick={() => setDrafts((prev) => prev.filter((_, i) => i !== index))}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setDrafts((prev) => [...prev, { ...emptyDraft(), day: prev[prev.length - 1]?.day ?? 'Day 1' }])}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 hover:text-emerald-800"
          >
            <Plus className="h-4 w-4" />
            Add exercise
          </button>
        </div>

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
        <h3 className="text-sm font-semibold text-slate-900">Workout plans</h3>
        <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => setCreating(true)}>
          <Plus className="h-3.5 w-3.5" />
          New plan
        </Button>
      </div>

      {loadError && <Notice>{loadError}</Notice>}

      {plans === null && !loadError ? (
        <LoadingState label="Loading plans..." />
      ) : plans && plans.length === 0 ? (
        <EmptyState icon={Dumbbell} title="No workout plans yet" description="Create a plan with the exercises for each training day." />
      ) : (
        <ul className="space-y-4">
          {plans?.map((plan) => {
            const days = new Map<string, WorkoutPlan['workout_exercises']>();
            for (const ex of plan.workout_exercises) days.set(ex.day_label, [...(days.get(ex.day_label) ?? []), ex]);
            return (
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
                {plan.notes && <p className="mt-2 text-sm text-slate-600">{plan.notes}</p>}
                <div className="mt-3 space-y-3">
                  {[...days.entries()].map(([day, exercises]) => (
                    <div key={day}>
                      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{day}</p>
                      <ul className="mt-1 divide-y divide-slate-100 text-sm">
                        {exercises.map((ex) => (
                          <li key={ex.id} className="flex justify-between gap-3 py-1.5">
                            <span className="text-slate-800">{ex.exercise}</span>
                            <span className="shrink-0 text-slate-500">
                              {ex.sets ? `${ex.sets} x ` : ''}
                              {ex.reps || '-'}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
