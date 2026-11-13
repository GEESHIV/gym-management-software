import { useState } from 'react';
import { CalendarCheck, IndianRupee, MessageCircle, Users } from 'lucide-react';
import { AppShell, type NavItem } from '@/components/layout/AppShell';
import { CheckInDesk } from '@/components/receptionist/CheckInDesk';
import { MembersPage } from '@/components/owner/members/MembersPage';
import { PaymentsPage } from '@/components/owner/payments/PaymentsPage';
import { FollowUpsPage } from '@/components/follow-ups/FollowUpsPage';
import { ErrorState, LoadingState } from '@/components/ui/PageStates';
import { useGymSnapshot } from '@/hooks/useGymSnapshot';
import type { Gym } from '@/lib/types';

export type ReceptionistPage = 'desk' | 'members' | 'payments' | 'follow-ups';

const receptionistNav: NavItem<ReceptionistPage>[] = [
  { id: 'desk', label: 'Front desk', icon: CalendarCheck },
  { id: 'members', label: 'Members', icon: Users },
  { id: 'payments', label: 'Payments', icon: IndianRupee },
  { id: 'follow-ups', label: 'Follow-ups', icon: MessageCircle },
];

export function ReceptionistApp({ gym }: { gym: Gym }) {
  const [page, setPage] = useState<ReceptionistPage>('desk');
  const { data, error, loading, reload } = useGymSnapshot();

  const renderPage = () => {
    if (!data) return loading ? <LoadingState /> : <ErrorState message={error} onRetry={reload} />;

    switch (page) {
      case 'desk':
        return <CheckInDesk snapshot={data} onChanged={reload} />;
      case 'members':
        return <MembersPage gym={gym} snapshot={data} onChanged={reload} />;
      case 'payments':
        return <PaymentsPage gym={gym} snapshot={data} onChanged={reload} />;
      case 'follow-ups':
        return <FollowUpsPage gym={gym} snapshot={data} canEditTemplates={false} onChanged={reload} />;
    }
  };

  return (
    <AppShell items={receptionistNav} page={page} gymName={gym.name} onNavigate={setPage}>
      {renderPage()}
    </AppShell>
  );
}
