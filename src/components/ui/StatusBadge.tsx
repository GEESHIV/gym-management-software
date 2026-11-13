import { cn } from '@/lib/cn';
import type { MembershipStatus } from '@/lib/membership';
import type { PaymentStatus } from '@/lib/types';

const membershipStyles: Record<MembershipStatus, { label: string; className: string }> = {
  active: { label: 'Active', className: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' },
  expiring: { label: 'Expiring soon', className: 'bg-amber-50 text-amber-700 ring-amber-600/20' },
  expired: { label: 'Expired', className: 'bg-rose-50 text-rose-700 ring-rose-600/20' },
  none: { label: 'No plan', className: 'bg-slate-100 text-slate-600 ring-slate-500/20' },
};

const paymentStyles: Record<PaymentStatus, { label: string; className: string }> = {
  paid: { label: 'Paid', className: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' },
  pending: { label: 'Pending', className: 'bg-amber-50 text-amber-700 ring-amber-600/20' },
};

const pill = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset';

export function MembershipBadge({ status }: { status: MembershipStatus }) {
  return <span className={cn(pill, membershipStyles[status].className)}>{membershipStyles[status].label}</span>;
}

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  return <span className={cn(pill, paymentStyles[status].className)}>{paymentStyles[status].label}</span>;
}
