import { useState, type FormEvent } from 'react';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Field, inputClass } from '@/components/ui/Field';
import { Notice } from '@/components/ui/Notice';
import { errorMessage } from '@/lib/errors';
import { isValidEmail } from '@/lib/validation';

export function SignInForm({ onSwitch }: { onSwitch: () => void }) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitError(null);

    const nextErrors: typeof errors = {};
    if (!isValidEmail(email)) nextErrors.email = 'Enter a valid email address.';
    if (!password) nextErrors.password = 'Enter your password.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      await signIn(email, password);
    } catch (err) {
      setSubmitError(errorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {submitError && <Notice>{submitError}</Notice>}

      <Field label="Email address" htmlFor="email" error={errors.email}>
        <input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
          placeholder="you@yourgym.com"
        />
      </Field>

      <Field label="Password" htmlFor="password" error={errors.password}>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
        />
      </Field>

      <Button type="submit" loading={submitting} className="w-full">
        Sign in
        <ArrowRight className="h-4 w-4" />
      </Button>

      <p className="text-center text-sm text-slate-500">
        New to GymFlow?{' '}
        <button type="button" onClick={onSwitch} className="font-semibold text-emerald-700 hover:text-emerald-800">
          Create an account
        </button>
      </p>
    </form>
  );
}
