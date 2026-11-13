import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Field, inputClass } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { Notice } from '@/components/ui/Notice';
import { errorMessage } from '@/lib/errors';
import { manageStaff } from '@/lib/staffApi';
import { isValidEmail, isValidIndianMobile, normalizeMobile } from '@/lib/validation';

interface AddStaffModalProps {
  onSaved: () => void;
  onClose: () => void;
}

type Values = { fullName: string; email: string; phone: string; role: 'receptionist' | 'trainer'; password: string };
type Errors = Partial<Record<keyof Values, string>>;

export function AddStaffModal({ onSaved, onClose }: AddStaffModalProps) {
  const [values, setValues] = useState<Values>({ fullName: '', email: '', phone: '', role: 'receptionist', password: '' });
  const [errors, setErrors] = useState<Errors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const update = (key: keyof Values) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setValues((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitError(null);

    const phone = normalizeMobile(values.phone);
    const nextErrors: Errors = {};
    if (values.fullName.trim().length < 2) nextErrors.fullName = 'Enter the staff member’s full name.';
    if (!isValidEmail(values.email)) nextErrors.email = 'Enter a valid email address.';
    if (!isValidIndianMobile(phone)) nextErrors.phone = 'Enter a valid 10-digit mobile number.';
    if (values.password.length < 8) nextErrors.password = 'Use at least 8 characters.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      await manageStaff({
        action: 'create',
        full_name: values.fullName.trim(),
        email: values.email.trim(),
        phone,
        role: values.role,
        password: values.password,
      });
      onSaved();
    } catch (err) {
      setSubmitError(errorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <Modal title="Add staff member" onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {submitError && <Notice>{submitError}</Notice>}

        <Field label="Full name" htmlFor="s-name" error={errors.fullName}>
          <input id="s-name" value={values.fullName} onChange={update('fullName')} className={inputClass} />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Role" htmlFor="s-role">
            <select id="s-role" value={values.role} onChange={update('role')} className={inputClass}>
              <option value="receptionist">Receptionist</option>
              <option value="trainer">Trainer</option>
            </select>
          </Field>
          <Field label="Mobile number" htmlFor="s-phone" error={errors.phone}>
            <input id="s-phone" inputMode="tel" value={values.phone} onChange={update('phone')} className={inputClass} placeholder="98765 43210" />
          </Field>
        </div>

        <Field label="Login email" htmlFor="s-email" error={errors.email}>
          <input id="s-email" type="email" value={values.email} onChange={update('email')} className={inputClass} />
        </Field>

        <Field
          label="Temporary password"
          htmlFor="s-password"
          error={errors.password}
          hint="Share this with the staff member. They sign in with this email and password."
        >
          <input id="s-password" type="text" value={values.password} onChange={update('password')} className={inputClass} autoComplete="off" />
        </Field>

        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>
            Add staff member
          </Button>
        </div>
      </form>
    </Modal>
  );
}
