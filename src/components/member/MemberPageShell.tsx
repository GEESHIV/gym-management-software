import type { ReactNode } from 'react';
import { Dumbbell } from 'lucide-react';

interface MemberPageShellProps {
  gymName: string | null;
  actions?: ReactNode;
  children: ReactNode;
}

export function MemberPageShell({ gymName, actions, children }: MemberPageShellProps) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
              <Dumbbell className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">{gymName ?? 'GymFlow'}</p>
              <p className="text-xs text-slate-500">Member area</p>
            </div>
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">{children}</main>
    </div>
  );
}
