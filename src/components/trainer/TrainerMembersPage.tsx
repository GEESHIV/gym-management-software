import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ClipboardList, Search, Users } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Field, inputClass } from '@/components/ui/Field';
import { Notice } from '@/components/ui/Notice';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState, LoadingState } from '@/components/ui/PageStates';
import { MembershipBadge } from '@/components/ui/StatusBadge';
import { StatCard } from '@/components/ui/StatCard';
import { errorMessage } from '@/lib/errors';
import { PlansModal } from '@/components/trainer/plans/PlansModal';
import { formatDate, formatDateTime, todayISO } from '@/lib/format';
import { summarizeMembers } from '@/lib/membership';
import { lastVisitByMember } from '@/lib/attendance';
import type { GymSnapshot } from '@/lib/gymSnapshot';
import { supabase } from '@/lib/supabase';
import type { Member, MemberProgress } from '@/lib/types';

interface ProgressModalProps {
  member: Member;
  onClose: () => void;
}

function MemberProgressModal({ member, onClose }: ProgressModalProps) {
  const [entries, setEntries] = useState<MemberProgress[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [weight, setWeight] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from('member_progress')
      .select('id, member_id, trainer_id, weight_kg, note, recorded_on, created_at')
      .eq('member_id', member.id)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) setLoadError(errorMessage(error));
        else setEntries((data ?? []) as MemberProgress[]);
      });
    return () => {
      cancelled = true;
    };
  }, [member.id, reloadKey]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = note.trim();
    if (!trimmed) {
      setSaveError('Add a short note about the session.');
      return;
    }
    const weightValue = weight.trim() === '' ? null : Number(weight);
    if (weightValue !== null && (!Number.isFinite(weightValue) || weightValue <= 0 || weightValue > 400)) {
      setSaveError('Enter a valid body weight in kilograms.');
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const { error } = await supabase.from('member_progress').insert({
        gym_id: member.gym_id,
        member_id: member.id,
        weight_kg: weightValue,
        note: trimmed,
        recorded_on: todayISO(),
      });
      if (error) throw error;
      setWeight('');
      setNote('');
      setReloadKey((k) => k + 1);
    } catch (err) {
      setSaveError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={`Progress: ${member.full_name}`} onClose={onClose} size="lg">
      <div className="grid gap-8 md:grid-cols-2">
        <form onSubmit={submit} className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-900">Log a session</h3>
          <Field label="Body weight (kg), optional" htmlFor="p-weight">
            <input id="p-weight" type="number" step="0.1" min="0" value={weight} onChange={(e) => setWeight(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Session note" htmlFor="p-note">
            <textarea
              id="p-note"
              rows={4}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Exercises done, progress, what to focus on next"
              className={inputClass}
            />
          </Field>
          {saveError && <Notice>{saveError}</Notice>}
          <Button type="submit" loading={saving} className="w-full">
            Save progress
          </Button>
        </form>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-900">Recent entries</h3>
          {loadError ? (
            <Notice>{loadError}</Notice>
          ) : entries === null ? (
            <LoadingState label="Loading progress..." />
          ) : entries.length === 0 ? (
            <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No progress notes yet.</p>
          ) : (
            <ul className="max-h-80 space-y-3 overflow-y-auto pr-1">
              {entries.map((entry) => (
                <li key={entry.id} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{formatDate(entry.recorded_on)}</span>
                    {entry.weight_kg !== null && <span className="font-medium text-slate-700">{entry.weight_kg} kg</span>}
                  </div>
                  <p className="mt-2 whitespace-pre-line text-sm text-slate-700">{entry.note}</p>
                  <p className="mt-2 text-[11px] text-slate-400">Logged {formatDateTime(entry.created_at)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}

interface TrainerMembersPageProps {
  snapshot: GymSnapshot;
}

export function TrainerMembersPage({ snapshot }: TrainerMembersPageProps) {
  const { members, memberships, payments, attendance } = snapshot;
  const [query, setQuery] = useState('');
  const [progressFor, setProgressFor] = useState<Member | null>(null);
  const [plansFor, setPlansFor] = useState<Member | null>(null);

  const summaries = useMemo(() => summarizeMembers(members, memberships, payments), [members, memberships, payments]);
  const lastVisit = useMemo(() => lastVisitByMember(attendance), [attendance]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members.filter((m) => !q || m.full_name.toLowerCase().includes(q) || m.phone.includes(q));
  }, [members, query]);

  const expiringCount = members.filter((m) => {
    const status = summaries.get(m.id)?.status;
    return status === 'expiring' || status === 'expired';
  }).length;

  return (
    <div className="space-y-8">
      <PageHeader title="My members" description="Members assigned to you. Log sessions and track their progress." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label="Assigned members" value={members.length} icon={Users} tone="emerald" />
        <StatCard label="Need a renewal" value={expiringCount} icon={ClipboardList} tone="amber" hint="Expiring or expired" />
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or phone"
          aria-label="Search my members"
          className={`${inputClass} pl-10`}
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        {members.length === 0 ? (
          <EmptyState icon={Users} title="No members assigned" description="Ask the owner to assign members to you from the Members page." />
        ) : rows.length === 0 ? (
          <EmptyState icon={Search} title="No matching members" description="Try a different search." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {rows.map((m) => {
              const summary = summaries.get(m.id);
              const visit = lastVisit.get(m.id);
              return (
                <li key={m.id} className="flex flex-col gap-3 px-5 py-4 transition hover:bg-slate-50/70 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">{m.full_name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {m.phone} · Last visit {visit ? formatDateTime(visit) : 'not yet'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <MembershipBadge status={summary?.status ?? 'none'} />
                    <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => setProgressFor(m)}>
                      Progress
                    </Button>
                    <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => setPlansFor(m)}>
                      Plans
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {progressFor && <MemberProgressModal member={progressFor} onClose={() => setProgressFor(null)} />}
      {plansFor && <PlansModal member={plansFor} onClose={() => setPlansFor(null)} />}
    </div>
  );
}
