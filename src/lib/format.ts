// كل المبالغ numeric(14,3) — تُعرض بثلاث خانات عشرية + «د.ك»، أرقام لاتينية.
const kwd = new Intl.NumberFormat('en', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

export function money(v: number | string | null | undefined): string {
  if (v === null || v === undefined || v === '') return '—';
  const n = typeof v === 'string' ? Number(v) : v;
  if (!Number.isFinite(n)) return '—';
  return `${kwd.format(n)} د.ك`;
}

const dateFmt = new Intl.DateTimeFormat('ar', { dateStyle: 'medium', numberingSystem: 'latn' });
const dateTimeFmt = new Intl.DateTimeFormat('ar', {
  dateStyle: 'medium',
  timeStyle: 'short',
  numberingSystem: 'latn',
});

export function fmtDate(v: string | null | undefined): string {
  if (!v) return '—';
  return dateFmt.format(new Date(v));
}

export function fmtDateTime(v: string | null | undefined): string {
  if (!v) return '—';
  return dateTimeFmt.format(new Date(v));
}

/** يوم قصير للرسم البياني (مثل 9/8) */
export function fmtDayShort(v: string): string {
  const d = new Date(v);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}
