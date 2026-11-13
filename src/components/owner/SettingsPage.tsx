import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Field, inputClass } from '@/components/ui/Field';
import { Notice } from '@/components/ui/Notice';
import { PageHeader } from '@/components/ui/PageHeader';
import { supabase } from '@/lib/supabase';
import { errorMessage } from '@/lib/errors';
import { isValidIndianMobile, normalizeMobile } from '@/lib/validation';
import type { Gym } from '@/lib/types';

interface SettingsPageProps {
  gym: Gym;
  onSaved: () => Promise<void>;
}

type Values = { name: string; ownerName: string; mobile: string; address: string };
type Errors = Partial<Record<keyof Values, string>>;

export function SettingsPage({ gym, onSaved }: SettingsPageProps) {
  const [values, setValues] = useState<Values>({
    name: gym.name,
    ownerName: gym.owner_name,
    mobile: gym.mobile,
    address: gym.address,
  });
  const [errors, setErrors] = useState<Errors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  const update = (key: keyof Values) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setSaved(false);
    setValues((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitError(null);

    const mobile = normalizeMobile(values.mobile);
    const nextErrors: Errors = {};
    if (values.name.trim().length < 2) nextErrors.name = 'Enter your gym name.';
    if (values.ownerName.trim().length < 2) nextErrors.ownerName = 'Enter the owner’s name.';
    if (!isValidIndianMobile(mobile)) nextErrors.mobile = 'Enter a valid 10-digit mobile number.';
    if (values.address.trim().length < 5) nextErrors.address = 'Enter the gym address.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('gyms')
        .update({
          name: values.name.trim(),
          owner_name: values.ownerName.trim(),
          mobile,
          address: values.address.trim(),
        })
        .eq('id', gym.id)
        .select('id')
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('Your gym details could not be saved. Please try again.');
      await onSaved();
      setSaved(true);
    } catch (err) {
      setSubmitError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const copyGymId = async () => {
    await navigator.clipboard.writeText(gym.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-3xl">
      <PageHeader title="Gym settings" description="These details appear on your members' payment receipts." />

      <div className="space-y-8 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-3 rounded-xl bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Gym ID</p>
            <p className="font-mono text-sm text-slate-800">{gym.id}</p>
          </div>
          <Button variant="secondary" onClick={copyGymId} className="px-3 py-2 text-xs">
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copied' : 'Copy ID'}
          </Button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          {submitError && <Notice>{submitError}</Notice>}
          {saved && <Notice tone="success">Gym details saved.</Notice>}

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Gym name" htmlFor="s-name" error={errors.name}>
              <input id="s-name" value={values.name} onChange={update('name')} className={inputClass} />
            </Field>
            <Field label="Owner name" htmlFor="s-owner" error={errors.ownerName}>
              <input id="s-owner" value={values.ownerName} onChange={update('ownerName')} className={inputClass} />
            </Field>
            <Field label="Mobile number" htmlFor="s-mobile" error={errors.mobile}>
              <input id="s-mobile" inputMode="tel" value={values.mobile} onChange={update('mobile')} className={inputClass} />
            </Field>
            <Field label="Login email" htmlFor="s-email" hint="Your sign-in email cannot be changed here.">
              <input id="s-email" value={gym.email} disabled className={inputClass} />
            </Field>
          </div>

          <Field label="Gym address" htmlFor="s-address" error={errors.address}>
            <textarea id="s-address" rows={3} value={values.address} onChange={update('address')} className={inputClass} />
          </Field>

          <div className="flex justify-end">
            <Button type="submit" loading={submitting}>
              Save changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
