import { useCallback, useState } from 'react';
import { KeyRound, LogOut } from 'lucide-react';
import { ChangePasswordModal } from '@/components/member/ChangePasswordModal';
import { MemberPageShell } from '@/components/member/MemberPageShell';
import { MemberPortalContent } from '@/components/member/MemberPortalContent';
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { ErrorState, LoadingState } from '@/components/ui/PageStates';
import { useAuth } from '@/context/AuthContext';
import { useMemberPortal } from '@/hooks/useMemberPortal';
import { errorMessage } from '@/lib/errors';
import { fetchMyMemberPortal } from '@/lib/memberPortal';
import type { Gym } from '@/lib/types';

interface MemberAppProps {
  gym: Gym;
}

export function MemberApp({ gym }: MemberAppProps) {
  const { signOut } = useAuth();
  const load = useCallback(() => fetchMyMemberPortal(), []);
  const { state, retry } = useMemberPortal(load);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  const handleSignOut = async () => {
    setSignOutError(null);
    try {
      await signOut();
    } catch (err) {
      setSignOutError(errorMessage(err));
    }
  };

  return (
    <MemberPageShell
      gymName={gym.name}
      actions={
        <>
          <Button variant="ghost" onClick={() => setPasswordOpen(true)} className="px-3 py-2 text-xs">
            <KeyRound className="h-3.5 w-3.5" />
            Password
          </Button>
          <Button variant="secondary" onClick={handleSignOut} className="px-3 py-2 text-xs">
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </Button>
        </>
      }
    >
      {signOutError && (
        <div className="mb-6">
          <Notice>{signOutError}</Notice>
        </div>
      )}

      {state.status === 'loading' && <LoadingState label="Loading your dashboard..." />}

      {state.status === 'empty' && (
        <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-slate-900">Your membership is not linked yet</h1>
          <p className="mt-2 text-sm text-slate-500">Ask the front desk to check your login. They can set it up again from your member profile.</p>
        </div>
      )}

      {state.status === 'error' && <ErrorState message={state.message} onRetry={retry} />}

      {state.status === 'ready' && <MemberPortalContent data={state.data} />}

      {passwordOpen && <ChangePasswordModal onClose={() => setPasswordOpen(false)} />}
    </MemberPageShell>
  );
}
