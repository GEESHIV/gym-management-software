import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/cn';
import { DietPlansPanel } from '@/components/trainer/plans/DietPlansPanel';
import { WorkoutPlansPanel } from '@/components/trainer/plans/WorkoutPlansPanel';
import type { Member } from '@/lib/types';

type PlanTab = 'workout' | 'diet';

const TABS: { id: PlanTab; label: string }[] = [
  { id: 'workout', label: 'Workout' },
  { id: 'diet', label: 'Diet' },
];

interface PlansModalProps {
  member: Member;
  onClose: () => void;
}

export function PlansModal({ member, onClose }: PlansModalProps) {
  const [tab, setTab] = useState<PlanTab>('workout');

  return (
    <Modal title={`Plans: ${member.full_name}`} onClose={onClose} size="lg">
      <div role="tablist" aria-label="Plan type" className="mb-6 inline-flex rounded-xl bg-slate-100 p-1">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
            className={cn(
              'rounded-lg px-4 py-1.5 text-sm font-medium transition duration-150',
              tab === item.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'workout' ? (
        <WorkoutPlansPanel gymId={member.gym_id} memberId={member.id} />
      ) : (
        <DietPlansPanel gymId={member.gym_id} memberId={member.id} />
      )}
    </Modal>
  );
}
