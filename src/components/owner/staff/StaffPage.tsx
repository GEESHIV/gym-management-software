import { useMemo, useState } from 'react';
import { Dumbbell, Trash2, UserPlus, Users } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/PageStates';
import { AddStaffModal } from '@/components/owner/staff/AddStaffModal';
import { errorMessage } from '@/lib/errors';
import { manageStaff } from '@/lib/staffApi';
import type { GymSnapshot } from '@/lib/gymSnapshot';
import type { StaffMember } from '@/lib/types';

interface StaffPageProps {
  snapshot: GymSnapshot;
  onChanged: () => void;
}

const ROLE_LABEL: Record<StaffMember['role'], string> = {
  owner: 'Owner',
  receptionist: 'Receptionist',
  trainer: 'Trainer',
  member: 'Member',
};

export function StaffPage({ snapshot, onChanged }: StaffPageProps) {
  const [adding, setAdding] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const assignedCount = useMemo(() => {
    const counts = new Map<string, number>();
    for (const member of snapshot.members) {
      if (member.assigned_trainer_id) counts.set(member.assigned_trainer_id, (counts.get(member.assigned_trainer_id) ?? 0) + 1);
    }
    return counts;
  }, [snapshot.members]);

  const remove = async (staff: StaffMember) => {
    setRemovingId(staff.id);
    setActionError(null);
    try {
      await manageStaff({ action: 'remove', user_id: staff.id });
      setConfirmId(null);
      onChanged();
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Staff"
        description="Receptionists check members in and take payments. Trainers coach their assigned members."
        action={
          <Button onClick={() => setAdding(true)}>
            <UserPlus className="h-4 w-4" />
            Add staff
          </Button>
        }
      />

      {actionError && (
        <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {actionError}
        </p>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        {snapshot.staff.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No staff yet"
            description="Add a receptionist or trainer so they can sign in to their own dashboard."
            action={
              <Button onClick={() => setAdding(true)}>
                <UserPlus className="h-4 w-4" />
                Add staff
              </Button>
            }
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {snapshot.staff.map((staff) => (
              <li key={staff.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <Dumbbell className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">{staff.full_name}</p>
                    <p className="text-xs text-slate-500">
                      {ROLE_LABEL[staff.role]}
                      {staff.phone ? ` · ${staff.phone}` : ''}
                      {staff.role === 'trainer' ? ` · ${assignedCount.get(staff.id) ?? 0} assigned members` : ''}
                    </p>
                  </div>
                </div>

                {confirmId === staff.id ? (
                  <div className="flex items-center gap-2">
                    <Button variant="secondary" onClick={() => setConfirmId(null)} disabled={removingId === staff.id}>
                      Keep
                    </Button>
                    <Button variant="danger" loading={removingId === staff.id} onClick={() => remove(staff)}>
                      Remove access
                    </Button>
                  </div>
                ) : (
                  <Button variant="ghost" onClick={() => setConfirmId(staff.id)} className="self-start text-rose-600 hover:bg-rose-50 sm:self-auto">
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {adding && (
        <AddStaffModal
          onClose={() => setAdding(false)}
          onSaved={() => {
            setAdding(false);
            onChanged();
          }}
        />
      )}
    </div>
  );
}
