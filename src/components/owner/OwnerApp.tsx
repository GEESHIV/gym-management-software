import { useState } from 'react';
import { BarChart3, CalendarCheck, IndianRupee, LayoutDashboard, MessageCircle, Settings, Tags, UserCog, Users } from 'lucide-react';
import { AppShell, type NavItem } from '@/components/layout/AppShell';
import { OwnerDashboard } from '@/components/owner/OwnerDashboard';
import { MembersPage } from '@/components/owner/members/MembersPage';
import { PlansPage } from '@/components/owner/plans/PlansPage';
import { PaymentsPage } from '@/components/owner/payments/PaymentsPage';
import { SettingsPage } from '@/components/owner/SettingsPage';
import { StaffPage } from '@/components/owner/staff/StaffPage';
import { AttendancePage } from '@/components/owner/attendance/AttendancePage';
import { FollowUpsPage } from '@/components/follow-ups/FollowUpsPage';
import { ReportsPage } from '@/components/owner/reports/ReportsPage';
import { ErrorState, LoadingState } from '@/components/ui/PageStates';
import { useAuth } from '@/context/AuthContext';
import { useGymSnapshot } from '@/hooks/useGymSnapshot';
import type { Gym } from '@/lib/types';

export type OwnerPage = 'dashboard' | 'members' | 'attendance' | 'follow-ups' | 'plans' | 'payments' | 'reports' | 'staff' | 'settings';

const ownerNav: NavItem<OwnerPage>[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'members', label: 'Members', icon: Users },
  { id: 'attendance', label: 'Attendance', icon: CalendarCheck },
  { id: 'follow-ups', label: 'Follow-ups', icon: MessageCircle },
  { id: 'plans', label: 'Plans & pricing', icon: Tags },
  { id: 'payments', label: 'Payments', icon: IndianRupee },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'staff', label: 'Staff', icon: UserCog },
  { id: 'settings', label: 'Gym settings', icon: Settings },
];

export function OwnerApp({ gym }: { gym: Gym }) {
  const [page, setPage] = useState<OwnerPage>('dashboard');
  const { refreshAccount } = useAuth();
  const { data, error, loading, reload } = useGymSnapshot();

  const renderPage = () => {
    if (page === 'settings') return <SettingsPage gym={gym} onSaved={refreshAccount} />;
    if (!data) return loading ? <LoadingState /> : <ErrorState message={error} onRetry={reload} />;

    switch (page) {
      case 'dashboard':
        return <OwnerDashboard gym={gym} snapshot={data} onNavigate={setPage} />;
      case 'members':
        return <MembersPage gym={gym} snapshot={data} onChanged={reload} />;
      case 'attendance':
        return <AttendancePage snapshot={data} />;
      case 'follow-ups':
        return <FollowUpsPage gym={gym} snapshot={data} canEditTemplates onChanged={reload} />;
      case 'plans':
        return <PlansPage gym={gym} snapshot={data} onChanged={reload} />;
      case 'payments':
        return <PaymentsPage gym={gym} snapshot={data} onChanged={reload} />;
      case 'reports':
        return <ReportsPage gym={gym} snapshot={data} />;
      case 'staff':
        return <StaffPage snapshot={data} onChanged={reload} />;
    }
  };

  return (
    <AppShell items={ownerNav} page={page} gymName={gym.name} onNavigate={setPage}>
      {renderPage()}
    </AppShell>
  );
}
