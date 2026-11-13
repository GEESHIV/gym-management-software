import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { CalendarCheck, Camera, CheckCircle2, Clock, QrCode, ShieldAlert, UserX, Users, X, type LucideIcon } from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/PageStates';
import { Notice } from '@/components/ui/Notice';
import { inputClass } from '@/components/ui/Field';
import { cn } from '@/lib/cn';
import { recordCheckIn, summarizeAttendance, type CheckInResult } from '@/lib/attendance';
import { errorMessage } from '@/lib/errors';
import { extractMemberToken } from '@/lib/memberPortal';
import { QrScanner } from '@/components/receptionist/QrScanner';
import type { GymSnapshot } from '@/lib/gymSnapshot';
import { formatDate, formatDateTime } from '@/lib/format';

interface CheckInDeskProps {
  snapshot: GymSnapshot;
  onChanged: () => void;
}

const RESULT_VIEW: Record<CheckInResult['status'], { icon: LucideIcon; title: string; tone: string }> = {
  checked_in: { icon: CheckCircle2, title: 'Checked in', tone: 'border-emerald-200 bg-emerald-50 text-emerald-800' },
  duplicate: { icon: Clock, title: 'Already checked in', tone: 'border-amber-200 bg-amber-50 text-amber-800' },
  no_active_membership: { icon: ShieldAlert, title: 'No active membership', tone: 'border-rose-200 bg-rose-50 text-rose-800' },
  not_found: { icon: UserX, title: 'Member not found', tone: 'border-slate-200 bg-slate-100 text-slate-800' },
};

function resultDetail(result: CheckInResult) {
  const name = result.member_name ?? 'This member';
  switch (result.status) {
    case 'checked_in':
      return `${name} is in. Membership valid until ${result.end_date ? formatDate(result.end_date) : 'the plan end date'}.`;
    case 'duplicate':
      return `${name} was already checked in within the last 2 hours.`;
    case 'no_active_membership':
      return `${name} does not have an active membership. Renew or record a payment before check-in.`;
    case 'not_found':
      return 'This code does not match any member of this gym. Try scanning again.';
  }
}

export function CheckInDesk({ snapshot, onChanged }: CheckInDeskProps) {
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { attendance, members } = snapshot;
  const summary = useMemo(() => summarizeAttendance(attendance, 1), [attendance]);
  const nameById = useMemo(() => new Map(members.map((m) => [m.id, m.full_name])), [members]);
  const recent = attendance.slice(0, 15);

  useEffect(() => {
    inputRef.current?.focus();
  }, [result]);

  const checkIn = async (raw: string) => {
    if (!raw.trim() || submitting) return;
    const token = extractMemberToken(raw);
    if (!token) {
      setError('That code is not a valid member code. Scan the QR code again.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const outcome = await recordCheckIn(token);
      setResult(outcome);
      setCode('');
      if (outcome.status === 'checked_in') onChanged();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void checkIn(code);
  };

  const handleDetected = (value: string) => {
    setScannerOpen(false);
    void checkIn(value);
  };

  const view = result ? RESULT_VIEW[result.status] : null;

  return (
    <div className="space-y-8">
      <PageHeader title="Front desk" description="Scan a member's QR code, or type the code, to record a check-in." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label="Checked in today" value={summary.today} icon={CalendarCheck} tone="emerald" />
        <StatCard label="Unique members, 60 days" value={summary.uniqueMembers} icon={Users} tone="sky" />
      </div>

      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-slate-900">Check-in scanner</h2>
            <p className="text-xs text-slate-500">Use the camera, or a USB barcode reader in the box below.</p>
          </div>
          <Button variant={scannerOpen ? 'secondary' : 'primary'} onClick={() => setScannerOpen((open) => !open)} className="shrink-0">
            {scannerOpen ? <X className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
            {scannerOpen ? 'Close camera' : 'Open camera'}
          </Button>
        </div>

        {scannerOpen && (
          <div className="mb-4">
            <QrScanner onDetected={handleDetected} />
          </div>
        )}

        <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <QrCode className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              ref={inputRef}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Scan QR code or paste member code"
              aria-label="Member QR code"
              autoComplete="off"
              className={`${inputClass} pl-10`}
            />
          </div>
          <Button type="submit" loading={submitting} disabled={!code.trim()} className="sm:w-40">
            Check in
          </Button>
        </form>

        {error && (
          <div className="mt-4">
            <Notice>{error}</Notice>
          </div>
        )}

        {view && result && (
          <div className={cn('mt-4 flex items-start gap-4 rounded-xl border p-4 transition-all duration-300', view.tone)} role="status">
            <view.icon className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">{view.title}</p>
              <p className="mt-1 text-sm opacity-90">{resultDetail(result)}</p>
            </div>
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
          <h2 className="font-semibold text-slate-900">Recent check-ins</h2>
        </div>
        {recent.length === 0 ? (
          <EmptyState icon={CalendarCheck} title="No check-ins yet" description="Check-ins appear here as members arrive." />
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
