import { useMemo, useState } from 'react';
import { CheckCircle2, ExternalLink, MessageCircle } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { EmptyState } from '@/components/ui/PageStates';
import { TemplatesModal } from '@/components/follow-ups/TemplatesModal';
import { errorMessage } from '@/lib/errors';
import { formatDate } from '@/lib/format';
import { buildFollowUpItems, type FollowUpItem } from '@/lib/followUps';
import type { GymSnapshot } from '@/lib/gymSnapshot';
import { buildWhatsAppLink, FOLLOW_UP_KINDS, renderTemplate, templateBodies } from '@/lib/whatsapp';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/cn';
import type { FollowUpKind, Gym } from '@/lib/types';

interface FollowUpsPageProps {
  gym: Gym;
  snapshot: GymSnapshot;
  canEditTemplates: boolean;
  onChanged: () => void;
}

export function FollowUpsPage({ gym, snapshot, canEditTemplates, onChanged }: FollowUpsPageProps) {
  const [kind, setKind] = useState<FollowUpKind>('renewal');
  const [editing, setEditing] = useState(false);
  const [contactingKey, setContactingKey] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const items = useMemo(() => buildFollowUpItems(snapshot, gym.name), [snapshot, gym.name]);
  const bodies = useMemo(() => templateBodies(snapshot.templates), [snapshot.templates]);
  const visible = items.filter((item) => item.kind === kind);
  const countFor = (k: FollowUpKind) => items.filter((item) => item.kind === k).length;

  const markContacted = async (item: FollowUpItem) => {
    setContactingKey(item.key);
    setActionError(null);
    try {
      const { error } = await supabase.from('follow_ups').insert({
        gym_id: gym.id,
        member_id: item.member.id,
        kind: item.kind,
        channel: 'whatsapp',
      });
      if (error) throw error;
      onChanged();
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setContactingKey(null);
    }
  };

  const kindInfo = FOLLOW_UP_KINDS.find((k) => k.kind === kind);

  return (
    <div>
      <PageHeader
        title="Follow-ups"
        description="Send WhatsApp reminders. Each button opens WhatsApp with a ready message; you press send there."
        action={
          canEditTemplates ? (
            <Button variant="secondary" onClick={() => setEditing(true)}>
              Edit messages
            </Button>
          ) : undefined
        }
      />

      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
        {FOLLOW_UP_KINDS.map((option) => {
          const active = option.kind === kind;
          return (
            <button
              key={option.kind}
              type="button"
              onClick={() => setKind(option.kind)}
              aria-pressed={active}
              className={cn(
                'flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition duration-150',
                active ? 'bg-slate-900 text-white shadow-sm' : 'bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-50',
              )}
            >
              {option.label}
              <span className={cn('rounded-full px-2 py-0.5 text-xs', active ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-600')}>
                {countFor(option.kind)}
              </span>
            </button>
          );
        })}
      </div>

      {kindInfo && <p className="mb-4 text-sm text-slate-500">{kindInfo.description}</p>}
      {actionError && <div className="mb-4"><Notice>{actionError}</Notice></div>}

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        {visible.length === 0 ? (
          <EmptyState icon={MessageCircle} title="Nobody needs a follow-up" description="This list is empty right now. It updates as members and payments change." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {visible.map((item) => {
              const message = renderTemplate(bodies[item.kind], item.vars);
              const link = buildWhatsAppLink(item.member.phone, message);
              return (
                <li key={item.key} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">{item.member.full_name}</p>
                    <p className="text-xs text-slate-500">
                      {item.member.phone} · {item.detail}
                    </p>
                    {item.lastContacted && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Contacted {formatDate(item.lastContacted.slice(0, 10))}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {link ? (
                      <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Open WhatsApp
                      </a>
                    ) : (
                      <span className="text-xs text-rose-600">Invalid mobile number</span>
                    )}
                    <Button variant="secondary" loading={contactingKey === item.key} onClick={() => markContacted(item)}>
                      Mark contacted
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {editing && (
        <TemplatesModal
          gymId={gym.id}
          bodies={bodies}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            onChanged();
          }}
        />
      )}
    </div>
  );
}
