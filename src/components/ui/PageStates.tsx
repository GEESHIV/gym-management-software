import { AlertTriangle, Loader2, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/Button';

export function LoadingState({ label = 'Loading your gym data...' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-slate-500">
      <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string | null; onRetry: () => void }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-2xl border border-rose-200 bg-white px-6 py-12 text-center shadow-sm">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600">
        <AlertTriangle className="h-6 w-6" />
      </span>
      <div>
        <p className="font-semibold text-slate-900">We could not load this data</p>
        <p className="mt-1 text-sm text-slate-500">{message ?? 'Please try again.'}</p>
      </div>
      <Button variant="secondary" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
        <Icon className="h-6 w-6" />
      </span>
      <div>
        <p className="font-semibold text-slate-900">{title}</p>
        <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>
      </div>
      {action}
    </div>
  );
}
