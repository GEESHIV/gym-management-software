import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: 'emerald' | 'sky' | 'amber' | 'rose' | 'slate';
  hint?: string;
}

const tones: Record<NonNullable<StatCardProps['tone']>, string> = {
  emerald: 'bg-emerald-50 text-emerald-600',
  sky: 'bg-sky-50 text-sky-600',
  amber: 'bg-amber-50 text-amber-600',
  rose: 'bg-rose-50 text-rose-600',
  slate: 'bg-slate-100 text-slate-600',
};

export function StatCard({ label, value, icon: Icon, tone = 'emerald', hint }: StatCardProps) {
  return (
    <div className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <span className={cn('flex h-9 w-9 items-center justify-center rounded-xl', tones[tone])}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
