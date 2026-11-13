import { useCallback, useEffect, useState } from 'react';
import { errorMessage } from '@/lib/errors';
import type { MemberPortalData } from '@/lib/memberPortal';

export type MemberPortalState =
  | { status: 'loading' }
  | { status: 'empty' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: MemberPortalData };

export function useMemberPortal(load: () => Promise<MemberPortalData | null>) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<MemberPortalState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    load()
      .then((data) => {
        if (!cancelled) setState(data ? { status: 'ready', data } : { status: 'empty' });
      })
      .catch((err: unknown) => {
        if (!cancelled) setState({ status: 'error', message: errorMessage(err) });
      });
    return () => {
      cancelled = true;
    };
  }, [load, attempt]);

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((n) => n + 1);
  }, []);

  return { state, retry };
}
