import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Field, inputClass } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { Notice } from '@/components/ui/Notice';
import { supabase } from '@/lib/supabase';
import { errorMessage } from '@/lib/errors';
import { isValidEmail, isValidIndianMobile, normalizeMobile } from '@/lib/validation';
import type { Member, StaffMember } from '@/lib/types';

interface MemberFormModalProps {
  gymId: string;
  member: Member | null;
  trainers: StaffMember[];
  onSaved: () => void;
  onClose: () => void;
}

type Values = { fullName: string; phone: string; email: string; address: string; trainerId: string; promoOptOut: boolean };
type Errors = Partial<Record<keyof Values, string>>;

export function MemberFormModal({ gymId, member, trainers, onSaved, onClose }: MemberFormModalProps) {
  const [values, setValues] = useState<Values>({
    fullName: member?.full_name ?? '',
    phone: member?.phone ?? '',
    email: member?.email ?? '',
    address: member?.address ?? '',
    trainerId: member?.assigned_trainer_id ?? '',
    promoOptOut: member?.whatsapp_opt_out ?? false,
  });
  const [errors, setErrors] = useState<Errors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const update = (key: 'fullName' | 'phone' | 'email' | 'address' | 'trainerId') =>
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setValues((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitError(null);

    const phone = normalizeMobile(values.phone);
    const nextErrors: Errors = {};
    if (values.fullName.trim().length < 2) nextErrors.fullName = 'Enter the member’s full name.';
    if (!isValidIndianMobile(phone)) nextErrors.phone = 'Enter a valid 10-digit mobile number.';
    if (values.email.trim() && !isValidEmail(values.email)) nextErrors.email = 'Enter a valid email address.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const payload = {
      full_name: values.fullName.trim(),
      phone,
      email: values.email.trim() || null,
      address: values.address.trim() || null,
      assigned_trainer_id: values.trainerId || null,
      whatsapp_opt_out: values.promoOptOut,
    };

    setSubmitting(true);
    try {
      if (member) {
        const { data, error } = await supabase.from('members').update(payload).eq('id', member.id).select('id').maybeSingle();
        if (error) throw error;
        if (!data) throw new Error('This member could not be updated. Please refresh and try again.');
      } else {
        const { error } = await supabase.from('members').insert({ ...payload, gym_id: gymId });
        if (error) throw error;
      }
      onSaved();
    } catch (err) {
      setSubmitError(errorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <Modal title={member ? 'Edit member' : 'Register new member'} onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {submitError && <Notice>{submitError}</Notice>}

        <Field label="Full name" htmlFor="m-name" error={errors.fullName}>
          <input id="m-name" value={values.fullName} onChange={update('fullName')} className={inputClass} />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Mobile number" htmlFor="m-phone" error={errors.phone}>
            <input id="m-phone" inputMode="tel" value={values.phone} onChange={update('phone')} className={inputClass} placeholder="98765 43210" />
          </Field>
          <Field label="Email (optional)" htmlFor="m-email" error={errors.email}>
            <input id="m-email" type="email" value={values.email} onChange={update('email')} className={inputClass} />
          </Field>
        </div>

        <Field label="Address (optional)" htmlFor="m-address">
          <textarea id="m-address" rows={2} value={values.address} onChange={update('address')} className={inputClass} />
        </Field>

        <Field label="Assigned trainer" htmlFor="m-trainer" hint={trainers.length === 0 ? 'Add a trainer under Staff to assign one.' : undefined}>
          <select id="m-trainer" value={values.trainerId} onChange={update('trainerId')} className={inputClass}>
            <option value="">No trainer</option>
            {trainers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.full_name}
              </option>
            ))}
          </select>
        </Field>

        <label className="flex items-start gap-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={values.promoOptOut}
            onChange={(e) => setValues((prev) => ({ ...prev, promoOptOut: e.target.checked }))}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
          />
          <span>
            <span className="font-medium">Opted out of promotional WhatsApp messages</span>
            <span className="block text-xs text-slate-500">Renewal and payment reminders are still sent.</span>
          </span>
        </label>

        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>
            {member ? 'Save changes' : 'Register member'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
