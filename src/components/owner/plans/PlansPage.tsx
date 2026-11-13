import { useState } from 'react';
import { Pencil, Plus, Tags } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/PageStates';
import { PlanFormModal } from '@/components/owner/plans/PlanFormModal';
import type { GymSnapshot } from '@/lib/gymSnapshot';
import { formatINR } from '@/lib/format';
import type { Gym, Plan } from '@/lib/types';

interface PlansPageProps {
  gym: Gym;
  snapshot: GymSnapshot;
  onChanged: () => void;
}

export function PlansPage({ gym, snapshot, onChanged }: PlansPageProps) {
  const [form, setForm] = useState<{ plan: Plan | null } | null>(null);

  return (
    <div>
      <PageHeader
        title="Plans & pricing"
        description="Membership plans members can buy. Changing a price only affects new memberships."
        action={
          <Button onClick={() => setForm({ plan: null })}>
            <Plus className="h-4 w-4" />
            New plan
          </Button>
        }
      />

      {snapshot.plans.length === 0 ? (
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <EmptyState
            icon={Tags}
            title="No plans yet"
            description="Create your 1, 3 and 12 month plans so you can sell memberships."
            action={
              <Button onClick={() => setForm({ plan: null })}>
                <Plus className="h-4 w-4" />
                Create a plan
              </Button>
            }
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {snapshot.plans.map((plan) => (
            <article
              key={plan.id}
              className="group flex flex-col rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-slate-900">{plan.name}</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {plan.duration_months} {plan.duration_months === 1 ? 'month' : 'months'}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
                    plan.is_active
                      ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                      : 'bg-slate-100 text-slate-600 ring-slate-500/20'
                  }`}
                >
                  {plan.is_active ? 'Available' : 'Hidden'}
                </span>
              </div>

              <p className="mt-6 text-3xl font-semibold tracking-tight text-slate-900">{formatINR(plan.price)}</p>
              <p className="mt-1 text-sm text-slate-500">
                {formatINR(plan.price / plan.duration_months)} per month
              </p>

              <Button variant="secondary" className="mt-6 w-full" onClick={() => setForm({ plan })}>
                <Pencil className="h-4 w-4" />
                Edit plan
              </Button>
            </article>
          ))}
        </div>
      )}

      {form && (
        <PlanFormModal
          gymId={gym.id}
          plan={form.plan}
          onClose={() => setForm(null)}
          onSaved={() => {
            setForm(null);
            onChanged();
          }}
        />
      )}
    </div>
  );
}
