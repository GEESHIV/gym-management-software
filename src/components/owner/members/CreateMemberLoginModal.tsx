import { useState, type FormEvent } from 'react';
import { CheckCircle2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Field, inputClass } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { Notice } from '@/components/ui/Notice';
import { createMemberLogin } from '@/lib/memberLoginApi';
import { errorMessage } from '@/lib/errors';
import { isValidEmail } from '@/lib/validation';
import type { Member } from '@/lib/types';

interface CreateMemberLoginModalProps {
  member: Member;
  onSaved: () => void;
  onClose: () => void;
}

const PASSWORD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

function generatePassword() {
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return Array.from(bytes, (byte) => PASSWORD_ALPHABET[byte % PASSWORD_ALPHABET.length]).join('');
}

export function CreateMemberLoginModal({ member, onSaved, onClose }: CreateMemberLoginModalProps) {
  const [email, setEmail] = useState(member.email ?? '');
  const [password, setPassword] = useState(generatePassword);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitError(null);
    const trimmedEmail = email.trim();
    if (!isValidEmail(trimmedEmail)) {
      setEmailError('Enter a valid email address.');
      return;
    }
    setEmailError(null);
    if (password.length < 8) {
      setSubmitError('The temporary password must be at least 8 characters.');
      return;
    }

    setSubmitting(true);
    try {
      await createMemberLogin({ member_id: member.id, email: trimmedEmail, password });
      setCreated({ email: trimmedEmail, password });
    } catch (err) {
      setSubmitError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (created) {
    return (
      <Modal title="Member login created" onClose={onSaved}>
        <div className="space-y-6">
          <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            <p className="text-sm">
              {member.full_name} can now sign in and see their own membership dashboard. Share these details with them. The password is not shown again.
            </p>
          </div>
          <dl className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Email</dt>
              <dd className="mt-1 break-all font-medium text-slate-900">{created.email}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Temporary password</dt>
              <dd className="mt-1 break-all font-mono font-medium text-slate-900">{created.password}</dd>
            </div>
          </dl>
          <div className="flex justify-end">
            <Button onClick={onSaved}>Done</Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Create member login" onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <p className="text-sm text-slate-600">
          Creates a sign-in for {member.full_name}. They use it to see their own attendance, payments, and workout plans. They cannot see other members.
        </p>

        {submitError && <Notice>{submitError}</Notice>}

        <Field label="Login email" htmlFor="ml-email" error={emailError ?? undefined}>
          <input id="ml-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} autoComplete="off" />
        </Field>

        <Field label="Temporary password" htmlFor="ml-password" hint="Share this with the member. They can use it to sign in right away.">
          <div className="flex gap-2">
            <input
              id="ml-password"
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              autoComplete="off"
            />
            <Button variant="secondary" onClick={() => setPassword(generatePassword())} aria-label="Generate a new password" className="shrink-0 px-3">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </Field>

        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>
            Create login
          </Button>
        </div>
      </form>
    </Modal>
  );
}
