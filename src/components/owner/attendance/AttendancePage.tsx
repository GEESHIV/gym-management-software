import { useMemo } from 'react';
import { CalendarCheck, Clock, Users } from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/PageStates';
import { summarizeAttendance, summarizeByHour } from '@/lib/attendance';
import type { GymSnapshot } from '@/lib/gymSnapshot';
import { formatDateTime } from '@/lib/format';

const CHART_DAYS = 14;
const RECENT_LIMIT = 20;

interface AttendancePageProps {
  snapshot: GymSnapshot;
}

export function AttendancePage({ snapshot }: AttendancePageProps) {
  const { attendance, members } = snapshot;

  const summary = useMemo(() => summarizeAttendance(attendance, CHART_DAYS), [attendance]);
  const hourly = useMemo(() => summarizeByHour(attendance), [attendance]);
  const nameById = useMemo(() => new Map(members.map((m) => [m.id, m.full_name])), [members]);
  const maxDay = Math.max(1, ...summary.daily.map((d) => d.count));
  const maxHour = Math.max(1, ...hourly.map((h) => h.count));
  const busiest = hourly.reduce((best, h) => (h.count > best.count ? h : best), hourly[0]);
  const recent = attendance.slice(0, RECENT_LIMIT);

  return (
    <div className="space-y-8">
      <PageHeader title="Attendance" description="Check-ins recorded at the front desk over the last 60 days." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Checked in today" value={summary.today} icon={CalendarCheck} tone="emerald" />
        <StatCard label="Last 7 days" value={summary.last7Days} icon={Clock} tone="sky" />
        <StatCard label="Unique members" value={summary.uniqueMembers} icon={Users} tone="slate" hint="Visited in the last 60 days" />
      </div>

      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="font-semibold text-slate-900">Daily check-ins, last {CHART_DAYS} days</h2>
        <div className="mt-8 flex h-56 items-end gap-2 sm:gap-3">
          {summary.daily.map((day) => {
            const height = day.count === 0 ? 3 : Math.max(8, Math.round((day.count / maxDay) * 100));
            return (
              <div key={day.key} className="group flex h-full flex-1 flex-col items-center justify-end gap-2">
                <span className="text-xs font-medium text-slate-500 opacity-0 transition group-hover:opacity-100">{day.count}</span>
                <div
                  className="w-full max-w-[2.5rem] rounded-t-lg bg-gradient-to-t from-emerald-600 to-emerald-400 transition-all duration-500 group-hover:from-emerald-700 group-hover:to-emerald-500"
                  style={{ height: `${height}%` }}
                  title={`${day.label}: ${day.count} check-ins`}
                />
                <span className="text-[10px] text-slate-500 sm:text-xs">{day.label}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="font-semibold text-slate-900">When members arrive</h2>
          {summary.uniqueMembers > 0 && busiest.count > 0 && (
            <p className="text-sm text-slate-500">Busiest hour: {busiest.label}</p>
          )}
        </div>
        <div className="mt-6 flex h-40 items-end gap-1 sm:gap-2">
          {hourly.map((slot) => {
            const height = slot.count === 0 ? 3 : Math.max(8, Math.round((slot.count / maxHour) * 100));
            return (
              <div key={slot.hour} className="group flex h-full flex-1 flex-col items-center justify-end gap-2">
                <div
                  className="w-full rounded-t-md bg-sky-400 transition-all duration-500 group-hover:bg-sky-500"
                  style={{ height: `${height}%` }}
                  title={`${slot.label}: ${slot.count} check-ins`}
                />
                <span className="text-[9px] text-slate-500 sm:text-[10px]">{slot.hour % 3 === 0 ? slot.label : ''}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
          <h2 className="font-semibold text-slate-900">Recent check-ins</h2>
        </div>
        {recent.length === 0 ? (
          <EmptyState icon={CalendarCheck} title="No check-ins yet" description="Check-ins appear here as members arrive at the front desk." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {recent.map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-3 px-5 py-3 sm:px-6">
                <span className="truncate text-sm font-medium text-slate-900">{nameById.get(row.member_id) ?? 'Former member'}</span>
                <span className="shrink-0 text-xs text-slate-500">{formatDateTime(row.checked_in_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
