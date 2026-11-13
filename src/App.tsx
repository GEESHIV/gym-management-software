import { Dumbbell, LogOut } from 'lucide-react';
import { MemberPortal } from '@/components/member/MemberPortal';
import { MemberApp } from '@/components/member/MemberApp';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { AuthScreen } from '@/components/auth/AuthScreen';
import { GymSetupForm } from '@/components/auth/GymSetupForm';
import { OwnerApp } from '@/components/owner/OwnerApp';
import { ReceptionistApp } from '@/components/receptionist/ReceptionistApp';
import { TrainerApp } from '@/components/trainer/TrainerApp';
import { Button } from '@/components/ui/Button';
import { ErrorState, LoadingState } from '@/components/ui/PageStates';

function AppRoutes() {
  const { status, profile, gym, signOut } = useAuth();

  if (status === 'loading') return <LoadingState label="Loading GymFlow..." />;
  if (status === 'signed-out') return <AuthScreen />;
  if (status === 'needs-gym') return <GymSetupForm />;

  if (status === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md space-y-4">
          <ErrorState message="Your account could not be loaded. Check your connection and try again." onRetry={() => window.location.reload()} />
          <Button variant="secondary" className="w-full" onClick={() => signOut()}>
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </div>
    );
  }

  if (profile?.role === 'owner' && gym) return <OwnerApp gym={gym} />;
  if (profile?.role === 'receptionist' && gym) return <ReceptionistApp gym={gym} />;
  if (profile?.role === 'trainer' && gym) return <TrainerApp gym={gym} />;
  if (profile?.role === 'member' && gym) return <MemberApp gym={gym} />;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
          <Dumbbell className="h-6 w-6" />
        </span>
        <h1 className="mt-5 text-lg font-semibold text-slate-900">Your dashboard is on its way</h1>
        <p className="mt-2 text-sm text-slate-500">
          Your account is not linked to a gym dashboard yet. Please contact your gym.
        </p>
        <Button variant="secondary" className="mt-6 w-full" onClick={() => signOut()}>
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </div>
  );
}

export default function App() {
  if (window.location.pathname === '/member' && new URLSearchParams(window.location.search).has('token')) {
    return <MemberPortal />;
  }

  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
