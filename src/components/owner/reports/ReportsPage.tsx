import { useState, type ComponentType, type ReactNode } from 'react';
import { CalendarCheck, Download, IndianRupee, Users, type LucideProps } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Field, inputClass } from '@/components/ui/Field';
import { toISODate, todayISO } from '@/lib/format';
import type { GymSnapshot } from '@/lib/gymSnapshot';
import {
  attendanceHeaders,
  attendanceRows,
  downloadCsv,
  memberRosterHeaders,
  memberRosterRows,
  paymentHeaders,
  paymentRows,
  toCsv,
} from '@/lib/reports';
import type { Gym } from '@/lib/types';

interface ReportsPageProps {
  gym: Gym;
  snapshot: GymSnapshot;
}

interface DateRange {
  from: string;
  to: string;
}

const DAY_MS = 86400000;

const monthStart = () => `${todayISO().slice(0, 8)}01`;
const daysAgo = (days: number) => toISODate(new Date(Date.now() - days * DAY_MS));

function fileSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

interface ReportCardProps {
  icon: ComponentType<LucideProps>;
  title: string;
  description: string;
  rowCount: number;
  rangeError?: string | null;
  note?: string;
  children?: ReactNode;
  onDownload: () => void;
}

function ReportCard({ icon: Icon, title, description, rowCount, rangeError, note, children, onDownload }: ReportCardProps) {
  return (
    <section className="flex flex-col rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
        <Icon className="h-5 w-5" />
      </span>
      <h2 className="mt-4 text-base font-semibold text-slate-900">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{description}</p>

      {children && <div className="mt-5 grid grid-cols-2 gap-4">{children}</div>}

      <div className="mt-6 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs text-slate-500">
          {rangeError ? (
            <span className="text-rose-600">{rangeError}</span>
          ) : (
            <>
              {rowCount} {rowCount === 1 ? 'row' : 'rows'}
              {note && <span className="block text-slate-400">{note}</span>}
            </>
          )}
        </div>
        <Button onClick={onDownload} disabled={Boolean(rangeError)} className="sm:w-auto">
          <Download className="h-4 w-4" />
          Download CSV
        </Button>
      </div>
    </section>
  );
}

function DateRangeFields({ value, onChange, prefix }: { value: DateRange; onChange: (next: DateRange) => void; prefix: string }) {
  return (
    <>
      <Field label="From" htmlFor={`${prefix}-from`}>
        <input
          id={`${prefix}-from`}
          type="date"
          value={value.from}
          max={value.to}
          onChange={(e) => onChange({ ...value, from: e.target.value })}
          className={inputClass}
        />
      </Field>
      <Field label="To" htmlFor={`${prefix}-to`}>
        <input
          id={`${prefix}-to`}
          type="date"
          value={value.to}
          min={value.from}
          max={todayISO()}
          onChange={(e) => onChange({ ...value, to: e.target.value })}
          className={inputClass}
        />
      </Field>
    </>
  );
}

export function ReportsPage({ gym, snapshot }: ReportsPageProps) {
  const [paymentRange, setPaymentRange] = useState<DateRange>({ from: monthStart(), to: todayISO() });
  const [attendanceRange, setAttendanceRange] = useState<DateRange>({ from: daysAgo(29), to: todayISO() });

  const slug = fileSlug(gym.name);
  const paymentError = paymentRange.from > paymentRange.to ? 'The start date must be before the end date.' : null;
  const attendanceError = attendanceRange.from > attendanceRange.to ? 'The start date must be before the end date.' : null;

  const members = memberRosterRows(snapshot);
  const payments = paymentError ? [] : paymentRows(snapshot, paymentRange.from, paymentRange.to);
  const attendance = attendanceError ? [] : attendanceRows(snapshot, attendanceRange.from, attendanceRange.to);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Reports"
        description="Download your gym's records as spreadsheets. They open in Excel or Google Sheets."
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <ReportCard
          icon={Users}
          title="Member roster"
          description="Every member with their membership status, plan, pending fees, and trainer."
          rowCount={members.length}
          onDownload={() => downloadCsv(`${slug}-members-${todayISO()}.csv`, toCsv(memberRosterHeaders, members))}
        />

        <ReportCard
          icon={IndianRupee}
          title="Payments"
          description="Collections recorded in the chosen period, with method and verification status."
          rowCount={payments.length}
          rangeError={paymentError}
          onDownload={() =>
            downloadCsv(
              `${slug}-payments-${paymentRange.from}-to-${paymentRange.to}.csv`,
              toCsv(paymentHeaders, payments),
            )
          }
        >
          <DateRangeFields value={paymentRange} onChange={setPaymentRange} prefix="payments" />
        </ReportCard>

        <ReportCard
          icon={CalendarCheck}
          title="Attendance"
          description="Every check-in during the chosen period, with the time and member."
          rowCount={attendance.length}
          rangeError={attendanceError}
          note="Covers the last 60 days"
          onDownload={() =>
            downloadCsv(
              `${slug}-attendance-${attendanceRange.from}-to-${attendanceRange.to}.csv`,
              toCsv(attendanceHeaders, attendance),
            )
          }
        >
          <DateRangeFields value={attendanceRange} onChange={setAttendanceRange} prefix="attendance" />
        </ReportCard>
      </div>
    </div>
  );
}
