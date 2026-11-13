import { useMemo, useState } from 'react';
import { Search, UserPlus, Users } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/PageStates';
import { MembershipBadge } from '@/components/ui/StatusBadge';
import { MemberFormModal } from '@/components/owner/members/MemberFormModal';
import { MemberDetailModal } from '@/components/owner/members/MemberDetailModal';
import { inputClass } from '@/components/ui/Field';
import type { GymSnapshot } from '@/lib/gymSnapshot';
import { formatDate, formatINR } from '@/lib/format';
import { summarizeMembers, type MembershipStatus } from '@/lib/membership';
import type { Gym, Member } from '@/lib/types';

interface MembersPageProps {
  gym: Gym;
  snapshot: GymSnapshot;
  onChanged: () => void;
}

const statusOptions: { value: 'all' | MembershipStatus; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'expiring', label: 'Expiring soon' },
  { value: 'expired', label: 'Expired' },
  { value: 'none', label: 'No plan' },
];

export function MembersPage({ gym, snapshot, onChanged }: MembersPageProps) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | MembershipStatus>('all');
  const [form, setForm] = useState<{ member: Member | null } | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const summaries = useMemo(
    () => summarizeMembers(snapshot.members, snapshot.memberships, snapshot.payments),
    [snapshot],
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return snapshot.members.filter((m) => {
      const status = summaries.get(m.id)?.status ?? 'none';
      if (statusFilter !== 'all' && status !== statusFilter) return false;
      if (!q) return true;
      return m.full_name.toLowerCase().includes(q) || m.phone.includes(q) || (m.email ?? '').toLowerCase().includes(q);
    });
  }, [snapshot.members, summaries, query, statusFilter]);

  const detailMember = snapshot.members.find((m) => m.id === detailId) ?? null;

  return (
    <div>
      <PageHeader
        title="Members"
        description={`${snapshot.members.length} registered member${snapshot.members.length === 1 ? '' : 's'}`}
        action={
          <Button onClick={() => setForm({ member: null })}>
            <UserPlus className="h-4 w-4" />
            Add member
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, phone or email"
            aria-label="Search members"
            className={`${inputClass} pl-10`}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | MembershipStatus)}
          aria-label="Filter by status"
          className={`${inputClass} sm:w-48`}
        >
          {statusOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        {snapshot.members.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No members yet"
            description="Add your first member to start tracking memberships and payments."
            action={
              <Button onClick={() => setForm({ member: null })}>
                <UserPlus className="h-4 w-4" />
                Add member
              </Button>
            }
          />
        ) : rows.length === 0 ? (
          <EmptyState icon={Search} title="No matching members" description="Try a different search or status filter." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/70 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Member</th>
                  <th className="px-5 py-3 font-medium">Phone</th>
                  <th className="px-5 py-3 font-medium">Current plan</th>
                  <th className="px-5 py-3 font-medium">Expires</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium">Pending fees</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((m) => {
                  const summary = summaries.get(m.id);
                  return (
                    <tr
                      key={m.id}
                      onClick={() => setDetailId(m.id)}
                      className="cursor-pointer transition hover:bg-emerald-50/40"
                    >
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-slate-900">{m.full_name}</p>
                        <p className="text-xs text-slate-500">{m.email ?? 'No email'}</p>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">{m.phone}</td>
                      <td className="px-5 py-3.5 text-slate-600">{summary?.latest?.plan_name ?? '-'}</td>
                      <td className="px-5 py-3.5 text-slate-600">
                        {summary?.latest ? formatDate(summary.latest.end_date) : '-'}
                      </td>
                      <td className="px-5 py-3.5">
                        <MembershipBadge status={summary?.status ?? 'none'} />
                      </td>
                      <td className="px-5 py-3.5 text-right font-medium text-slate-900">
                        {summary && summary.pendingFees > 0 ? formatINR(summary.pendingFees) : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {form && (
        <MemberFormModal
          gymId={gym.id}
          member={form.member}
          trainers={snapshot.staff.filter((s) => s.role === 'trainer')}
          onClose={() => setForm(null)}
          onSaved={() => {
            setForm(null);
            onChanged();
          }}
        />
      )}

      {detailMember && (
        <MemberDetailModal
          gym={gym}
          member={detailMember}
          snapshot={snapshot}
          onEdit={() => {
            setDetailId(null);
            setForm({ member: detailMember });
          }}
          onChanged={onChanged}
          onClose={() => setDetailId(null)}
        />
      )}
    </div>
  );
}
