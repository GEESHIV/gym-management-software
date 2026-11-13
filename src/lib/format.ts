const rupees = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

export const formatINR = (amount: number) => rupees.format(amount);

export const toISODate = (date: Date) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

export const todayISO = () => toISODate(new Date());

export const monthKey = (iso: string) => iso.slice(0, 7);

export const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export function addMonthsISO(startISO: string, months: number) {
  const [year, month, day] = startISO.split('-').map(Number);
  const lastDayOfTarget = new Date(year, month - 1 + months + 1, 0).getDate();
  const end = new Date(year, month - 1 + months, Math.min(day, lastDayOfTarget));
  end.setDate(end.getDate() - 1);
  return toISODate(end);
}
