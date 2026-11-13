import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Field, inputClass } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { Notice } from '@/components/ui/Notice';
import { useAuth } from '@/context/AuthContext';
import { errorMessage } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import { FOLLOW_UP_KINDS, TEMPLATE_VARIABLES } from '@/lib/whatsapp';
import type { FollowUpKind } from '@/lib/types';

interface TemplatesModalProps {
  gymId: string;
  bodies: Record<FollowUpKind, string>;
  onSaved: () => void;
  onClose: () => void;
}

export function TemplatesModal({ gymId, bodies, onSaved, onClose }: TemplatesModalProps) {
  const { session } = useAuth();
  const [values, setValues] = useState<Record<FollowUpKind, string>>(bodies);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const invalid = FOLLOW_UP_KINDS.find(({ kind }) => values[kind].trim().length < 1 || values[kind].length > 1000);

  const save = async () => {
    if (!session) return;
    if (invalid) {
      setSubmitError(`Write a message for ${invalid.label.toLowerCase()} (up to 1000 characters).`);
      return;
    }
    setSubmitError(null);
    setSubmitting(true);
    try {
      const rows = FOLLOW_UP_KINDS.map(({ kind }) => ({
        gym_id: gymId,
        kind,
        body: values[kind].trim(),
        updated_by: session.user.id,
        updated_at: new Date().toISOString(),
      }));
      const { error } = await supabase.from('whatsapp_templates').upsert(rows, { onConflict: 'gym_id,kind' });
      if (error) throw error;
      onSaved();
    } catch (err) {
      setSubmitError(errorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <Modal title="WhatsApp messages" onClose={onClose} size="lg">
      <div className="space-y-6">
        <p className="text-sm text-slate-500">
          Use these placeholders and GymFlow fills them in for each member:{' '}
          {TEMPLATE_VARIABLES.map((v) => `{${v}}`).join(' ')}
        </p>

        {submitError && <Notice>{submitError}</Notice>}

        {FOLLOW_UP_KINDS.map(({ kind, label, description }) => (
          <Field key={kind} label={label} htmlFor={`t-${kind}`} hint={description}>
            <textarea
              id={`t-${kind}`}
              rows={3}
              value={values[kind]}
              onChange={(e) => setValues((prev) => ({ ...prev, [kind]: e.target.value }))}
              className={inputClass}
            />
          </Field>
        ))}

        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={submitting} onClick={save}>
            Save messages
          </Button>
        </div>
      </div>
    </Modal>
  );
}
