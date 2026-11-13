import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Building2, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { AuthShell } from '@/components/auth/AuthShell';
import { Button } from '@/components/ui/Button';
import { Field, inputClass } from '@/components/ui/Field';
import { Notice } from '@/components/ui/Notice';
import { supabase } from '@/lib/supabase';
import { errorMessage } from '@/lib/errors';
import { isValidIndianMobile, normalizeMobile } from '@/lib/validation';

type Values = { gymName: string; ownerName: string; mobile: string; address: string };
type Errors = Partial<Record<keyof Values, string>>;

export function GymSetupForm() {
  const { session, signOut, refreshAccount } = useAuth();
  const email = session?.user.email ?? '';
  const [values, setValues] = useState<Values>({ gymName: '', ownerName: '', mobile: '', address: '' });
  const [errors, setErrors] = useState<Errors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const update = (key: keyof Values) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setValues((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitError(null);

    const mobile = normalizeMobile(values.mobile);
    const nextErrors: Errors = {};
    if (values.gymName.trim().length < 2) nextErrors.gymName = 'Enter your gym name.';
    if (values.ownerName.trim().length < 2) nextErrors.ownerName = 'Enter the owner’s name.';
    if (!isValidIndianMobile(mobile)) nextErrors.mobile = 'Enter a valid 10-digit mobile number.';
    if (values.address.trim().length < 5) nextErrors.address = 'Enter the gym address.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.rpc('register_gym', {
        p_gym_name: values.gymName,
        p_owner_name: values.ownerName,
        p_email: email,
        p_mobile: mobile,
        p_address: values.address,
      });
      if (error) throw error;
      await refreshAccount();
    } catch (err) {
      setSubmitError(errorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <AuthShell title="Set up your gym" subtitle="Tell us about your gym. Each gym gets a private workspace with its own members, staff and reports.">
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {submitError && <Notice>{submitError}</Notice>}

        <Field label="Gym name" htmlFor="gymName" error={errors.gymName}>
          <input id="gymName" value={values.gymName} onChange={update('gymName')} className={inputClass} placeholder="FitZone Gym" />
        </Field>

        <Field label="Owner name" htmlFor="ownerName" error={errors.ownerName}>
          <input id="ownerName" value={values.ownerName} onChange={update('ownerName')} className={inputClass} />
        </Field>

        <Field label="Account email" htmlFor="email" hint="This is the email you signed up with.">
          <input id="email" value={email} disabled className={inputClass} />
        </Field>

        <Field label="Mobile number" htmlFor="mobile" error={errors.mobile}>
          <input
            id="mobile"
            inputMode="tel"
            value={values.mobile}
            onChange={update('mobile')}
            className={inputClass}
            placeholder="98765 43210"
          />
        </Field>

        <Field label="Gym address" htmlFor="address" error={errors.address}>
          <textarea
            id="address"
            rows={3}
            value={values.address}
            onChange={update('address')}
            className={inputClass}
            placeholder="Street, area, city, PIN code"
          />
        </Field>

        <Button type="submit" loading={submitting} className="w-full">
          <Building2 className="h-4 w-4" />
          Create my gym
        </Button>

        <button
          type="button"
          onClick={() => signOut()}
          className="flex w-full items-center justify-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </form>
    </AuthShell>
  );
}
