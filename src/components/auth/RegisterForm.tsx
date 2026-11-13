import { useState, type FormEvent } from 'react';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Field, inputClass } from '@/components/ui/Field';
import { Notice } from '@/components/ui/Notice';
import { errorMessage } from '@/lib/errors';
import { isValidEmail } from '@/lib/validation';

type Errors = { email?: string; password?: string; confirm?: string };

export function RegisterForm({ onSwitch }: { onSwitch: () => void }) {
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitError(null);

    const nextErrors: Errors = {};
    if (!isValidEmail(email)) nextErrors.email = 'Enter a valid email address.';
    if (password.length < 8) nextErrors.password = 'Use at least 8 characters.';
    if (confirm !== password) nextErrors.confirm = 'Passwords do not match.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      await signUp(email, password);
    } catch (err) {
      setSubmitError(errorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {submitError && <Notice>{submitError}</Notice>}

      <Field label="Email address" htmlFor="reg-email" error={errors.email}>
        <input
          id="reg-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
          placeholder="you@yourgym.com"
        />
      </Field>

      <Field label="Password" htmlFor="reg-password" error={errors.password} hint="At least 8 characters.">
        <input
          id="reg-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
        />
      </Field>

      <Field label="Confirm password" htmlFor="reg-confirm" error={errors.confirm}>
        <input
          id="reg-confirm"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className={inputClass}
        />
      </Field>

      <Button type="submit" loading={submitting} className="w-full">
        Continue
        <ArrowRight className="h-4 w-4" />
      </Button>

      <p className="text-center text-sm text-slate-500">
        Already registered?{' '}
        <button type="button" onClick={onSwitch} className="font-semibold text-emerald-700 hover:text-emerald-800">
          Sign in
        </button>
      </p>
    </form>
  );
}
