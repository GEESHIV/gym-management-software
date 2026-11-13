import { useState, type ReactNode } from 'react';
import { Dumbbell, LogOut, Menu, X, type LucideIcon } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/cn';

export interface NavItem<T extends string> {
  id: T;
  label: string;
  icon: LucideIcon;
}

interface AppShellProps<T extends string> {
  items: NavItem<T>[];
  page: T;
  gymName: string;
  onNavigate: (page: T) => void;
  children: ReactNode;
}

export function AppShell<T extends string>({ items, page, gymName, onNavigate, children }: AppShellProps<T>) {
  const { profile, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const current = items.find((item) => item.id === page);

  const go = (next: T) => {
    onNavigate(next);
    setMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-slate-950 text-slate-300 transition-transform duration-300 ease-out lg:translate-x-0',
          menuOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center gap-3 px-6 pb-6 pt-7">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white">
            <Dumbbell className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white">GymFlow</p>
            <p className="truncate text-xs text-slate-400">{gymName}</p>
          </div>
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
            className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-white/10 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {items.map(({ id, label, icon: Icon }) => {
            const active = id === page;
            return (
              <button
                key={id}
                type="button"
                onClick={() => go(id)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition duration-150',
                  active ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white',
                )}
              >
                <Icon className={cn('h-4 w-4', active ? 'text-emerald-400' : 'text-slate-500 group-hover:text-slate-300')} />
                {label}
                {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-400" />}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-4">
          <p className="truncate px-2 text-sm font-medium text-white">{profile?.full_name}</p>
          <p className="px-2 text-xs capitalize text-slate-500">{profile?.role}</p>
          <button
            type="button"
            onClick={() => signOut()}
            className="mt-3 flex w-full items-center gap-2 rounded-xl px-2 py-2 text-sm font-medium text-slate-400 transition hover:bg-white/5 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      {menuOpen && (
        <div className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm lg:hidden" onClick={() => setMenuOpen(false)} />
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            className="rounded-lg p-2 text-slate-700 hover:bg-slate-100"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-sm font-semibold text-slate-900">{current?.label}</span>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">{children}</main>
      </div>
    </div>
  );
}
