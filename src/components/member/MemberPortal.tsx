import { useCallback } from 'react';
import { Link2Off } from 'lucide-react';
import { MemberPageShell } from '@/components/member/MemberPageShell';
import { MemberPortalContent } from '@/components/member/MemberPortalContent';
import { ErrorState, LoadingState } from '@/components/ui/PageStates';
import { useMemberPortal } from '@/hooks/useMemberPortal';
import { extractMemberToken, fetchMemberPortal } from '@/lib/memberPortal';

export function MemberPortal() {
  const token = extractMemberToken(new URLSearchParams(window.location.search).get('token') ?? '');
  const load = useCallback(() => (token ? fetchMemberPortal(token) : Promise.resolve(null)), [token]);
  const { state, retry } = useMemberPortal(load);

  return (
    <MemberPageShell gymName={state.status === 'ready' ? state.data.gym?.name ?? null : null}>
      {state.status === 'loading' && <LoadingState label="Loading your membership..." />}

      {state.status === 'empty' && (
        <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
            <Link2Off className="h-6 w-6" />
          </span>
          <h1 className="mt-5 text-lg font-semibold text-slate-900">This link is not valid</h1>
          <p className="mt-2 text-sm text-slate-500">Ask the front desk for your membership QR code or a fresh link.</p>
        </div>
      )}

      {state.status === 'error' && <ErrorState message={state.message} onRetry={retry} />}

      {state.status === 'ready' && <MemberPortalContent data={state.data} />}
    </MemberPageShell>
  );
}
