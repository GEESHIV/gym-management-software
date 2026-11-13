import { formatDate, formatINR } from '@/lib/format';
import type { Gym, Member, Payment } from '@/lib/types';

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char);

export function downloadReceipt(payment: Payment, member: Member, gym: Gym, planName: string | null) {
  const receiptNo = `RCT-${payment.id.slice(0, 8).toUpperCase()}`;
  const rows: [string, string][] = [
    ['Receipt No.', receiptNo],
    ['Date', formatDate(payment.paid_on)],
    ['Member', member.full_name],
    ['Phone', member.phone],
    ['Plan', planName ?? 'General payment'],
    ['Payment Method', payment.method === 'upi' ? 'UPI' : 'Cash'],
    ['Transaction Ref.', payment.transaction_ref ?? '-'],
    ['Status', payment.status === 'paid' ? 'Paid' : 'Pending verification'],
  ];

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8" /><title>${escapeHtml(receiptNo)}</title>
<style>
body{font-family:Arial,sans-serif;color:#0f172a;max-width:640px;margin:40px auto;padding:24px}
h1{font-size:22px;margin:0}
.muted{color:#64748b;font-size:13px}
table{width:100%;border-collapse:collapse;margin-top:24px}
td{padding:10px 0;border-bottom:1px solid #e2e8f0;font-size:14px}
td:first-child{color:#64748b;width:40%}
.total{font-size:24px;font-weight:700;margin-top:24px;text-align:right}
</style></head>
<body>
<h1>${escapeHtml(gym.name)}</h1>
<p class="muted">${escapeHtml(gym.address)} | ${escapeHtml(gym.mobile)}</p>
<h2 style="margin-top:32px;font-size:18px">Payment Receipt</h2>
<table>${rows.map(([k, v]) => `<tr><td>${escapeHtml(k)}</td><td>${escapeHtml(v)}</td></tr>`).join('')}</table>
<p class="total">${escapeHtml(formatINR(payment.amount))}</p>
</body></html>`;

  const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${receiptNo}.html`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
