import { useState } from 'react';
import { ClipboardList, LayoutDashboard, type LucideIcon } from 'lucide-react';
import { MemberOverview } from '@/components/member/MemberOverview';
import { MemberTraining } from '@/components/member/MemberTraining';
import { cn } from '@/lib/cn';
import type { MemberPortalData } from '@/lib/memberPortal';

type Tab = 'overview' | 'training';

const TABS: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'training', label: 'Training', icon: ClipboardList },
];

export function MemberPortalContent({ data }: { data: MemberPortalData }) {
  const [tab, setTab] = useState<Tab>('overview');

  return (
    <div className="space-y-8">
      <div role="tablist" aria-label="Member sections" className="flex gap-1 rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-200/80">
        {TABS.map((item) => {
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(item.id)}
              className={cn(
                'inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500',
                active ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </div>

      {tab === 'overview' ? <MemberOverview data={data} /> : <MemberTraining data={data} />}
    </div>
  );
}
