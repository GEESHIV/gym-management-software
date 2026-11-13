import { ClipboardList, Dumbbell, Salad, TrendingUp } from 'lucide-react';
import { EmptyState } from '@/components/ui/PageStates';
import { formatDate } from '@/lib/format';
import type { MemberPortalData } from '@/lib/memberPortal';

interface MemberTrainingProps {
  data: MemberPortalData;
}

type Exercise = MemberPortalData['workouts'][number]['exercises'][number];

function groupByDay(exercises: Exercise[]) {
  const groups = new Map<string, Exercise[]>();
  for (const e of exercises) {
    groups.set(e.day_label, [...(groups.get(e.day_label) ?? []), e]);
  }
  return [...groups.entries()];
}

export function MemberTraining({ data }: MemberTrainingProps) {
  const { workouts, diets, progress, trainer } = data;

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Dumbbell className="h-4 w-4 text-emerald-600" />
          <h2 className="text-base font-semibold text-slate-900">Workout plan</h2>
        </div>
        {workouts.length === 0 ? (
          <EmptyState icon={ClipboardList} title="No workout plan yet" description={trainer ? `${trainer} will share your plan here.` : 'Your trainer will share your plan here.'} />
        ) : (
          workouts.map((plan) => (
            <article key={plan.title} className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
              <h3 className="font-semibold text-slate-900">{plan.title}</h3>
              {plan.notes && <p className="mt-1 text-sm text-slate-500">{plan.notes}</p>}
              <div className="mt-5 space-y-5">
                {groupByDay(plan.exercises).map(([day, exercises]) => (
                  <div key={day}>
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{day}</p>
                    <ul className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-100">
                      {exercises.map((e, i) => (
                        <li key={`${e.exercise}-${i}`} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                          <span className="font-medium text-slate-900">{e.exercise}</span>
                          <span className="shrink-0 text-slate-500">
                            {e.sets ? `${e.sets} sets` : ''}
                            {e.sets && e.reps ? ' · ' : ''}
                            {e.reps ? `${e.reps} reps` : ''}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </article>
          ))
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Salad className="h-4 w-4 text-emerald-600" />
          <h2 className="text-base font-semibold text-slate-900">Diet plan</h2>
        </div>
        {diets.length === 0 ? (
          <EmptyState icon={Salad} title="No diet plan yet" description="Your trainer can add a diet plan for you." />
        ) : (
          diets.map((diet) => (
            <article key={diet.title} className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
              <h3 className="font-semibold text-slate-900">{diet.title}</h3>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-700">{diet.body}</p>
            </article>
          ))
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-emerald-600" />
          <h2 className="text-base font-semibold text-slate-900">Progress notes</h2>
        </div>
        {progress.length === 0 ? (
          <EmptyState icon={TrendingUp} title="No progress notes yet" description="Notes from your sessions will appear here." />
        ) : (
          <ul className="space-y-3">
            {progress.map((entry, i) => (
              <li key={`${entry.recorded_on}-${i}`} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{formatDate(entry.recorded_on)}</span>
                  {entry.weight_kg !== null && <span className="font-medium text-slate-700">{entry.weight_kg} kg</span>}
                </div>
                <p className="mt-2 whitespace-pre-line text-sm text-slate-700">{entry.note}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
