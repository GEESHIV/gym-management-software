import type { FollowUpKind, WhatsappTemplate } from '@/lib/types';

export const FOLLOW_UP_KINDS: { kind: FollowUpKind; label: string; description: string }[] = [
  { kind: 'renewal', label: 'Renewals', description: 'Memberships ending in the next 7 days' },
  { kind: 'expired', label: 'Expired', description: 'Memberships that have already ended' },
  { kind: 'pending_fee', label: 'Pending fees', description: 'Members with an unpaid balance' },
  { kind: 'inactive', label: 'Inactive', description: 'Active members not seen for 7+ days' },
  { kind: 'new_member', label: 'New members', description: 'Joined in the last 7 days' },
  { kind: 'promotional', label: 'Promotional', description: 'Members who have not opted out' },
];

export const TEMPLATE_VARIABLES = ['member_name', 'gym_name', 'plan_name', 'end_date', 'days_left', 'amount_due'] as const;

export const DEFAULT_TEMPLATES: Record<FollowUpKind, string> = {
  renewal: 'Hi {member_name}, your membership at {gym_name} ends on {end_date} ({days_left} days left). Reply here to renew and keep your momentum going.',
  expired: 'Hi {member_name}, your membership at {gym_name} ended on {end_date}. Reply here and we will help you pick a plan to restart.',
  pending_fee: 'Hi {member_name}, a balance of {amount_due} is pending on your membership at {gym_name}. Please clear it at the front desk or reply here to arrange payment.',
  inactive: 'Hi {member_name}, we have not seen you at {gym_name} for a while. Come in this week, we would love to see you back.',
  new_member: 'Welcome to {gym_name}, {member_name}! Your {plan_name} membership runs until {end_date}. Reply here if you have any questions.',
  promotional: 'Hi {member_name}, {gym_name} has a special offer this month. Reply here to hear more.',
};

export function templateBodies(saved: WhatsappTemplate[]): Record<FollowUpKind, string> {
  const bodies = { ...DEFAULT_TEMPLATES };
  for (const row of saved) bodies[row.kind] = row.body;
  return bodies;
}

export function renderTemplate(body: string, vars: Record<string, string>) {
  return body.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? '');
}

export function whatsAppNumber(phone: string) {
  const digits = phone.replace(/\D/g, '');
  if (/^[6-9]\d{9}$/.test(digits)) return `91${digits}`;
  if (/^91[6-9]\d{9}$/.test(digits)) return digits;
  return null;
}

export function buildWhatsAppLink(phone: string, message: string) {
  const number = whatsAppNumber(phone);
  if (!number) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
