import type { ReactNode } from 'react';
import { Dumbbell, ShieldCheck, Users, Wallet } from 'lucide-react';

const highlights = [
  { icon: Users, text: 'Members, plans and renewals in one place' },
  { icon: Wallet, text: 'Cash and UPI payments with receipts' },
  { icon: ShieldCheck, text: 'Each gym’s data is private to its own team' },
];

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="grid min-h-screen bg-slate-50 lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-slate-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(16,185,129,0.30),transparent_45%),radial-gradient(circle_at_85%_85%,rgba(14,165,233,0.20),transparent_45%)]" />
        <div className="relative flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500 text-white">
            <Dumbbell className="h-6 w-6" />
          </span>
          <span className="text-lg font-semibold tracking-tight">GymFlow</span>
        </div>
        <div className="relative max-w-md">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight">Run every gym from one calm, secure dashboard.</h1>
          <ul className="mt-8 space-y-4">
            {highlights.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-slate-300">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
                  <Icon className="h-4 w-4 text-emerald-300" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-slate-500">Built for gyms across India.</p>
      </aside>

      <main className="flex items-center justify-center px-5 py-12 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white">
              <Dumbbell className="h-5 w-5" />
            </span>
            <span className="text-lg font-semibold tracking-tight text-slate-900">GymFlow</span>
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </main>
    </div>
  );
}
