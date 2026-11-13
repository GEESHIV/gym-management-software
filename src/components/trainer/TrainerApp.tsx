import { ClipboardList } from 'lucide-react';
import { AppShell, type NavItem } from '@/components/layout/AppShell';
import { TrainerMembersPage } from '@/components/trainer/TrainerMembersPage';
import { ErrorState, LoadingState } from '@/components/ui/PageStates';
import { useGymSnapshot } from '@/hooks/useGymSnapshot';
import type { Gym } from '@/lib/types';

type TrainerPage = 'members';

const trainerNav: NavItem<TrainerPage>[] = [{ id: 'members', label: 'My members', icon: ClipboardList }];

export function TrainerApp({ gym }: { gym: Gym }) {
  const { data, error, loading, reload } = useGymSnapshot();

  const content = !data ? (
    loading ? <LoadingState /> : <ErrorState message={error} onRetry={reload} />
  ) : (
    <TrainerMembersPage snapshot={data} />
  );

  return (
    <AppShell items={trainerNav} page="members" gymName={gym.name} onNavigate={() => undefined}>
      {content}
    </AppShell>
  );
}
