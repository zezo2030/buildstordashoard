// كل المبالغ numeric(14,3) — تُعرض بثلاث خانات عشرية + «د.ك»، أرقام لاتينية.
const kwd = new Intl.NumberFormat('en', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

export function money(v: number | string | null | undefined): string {
  if (v === null || v === undefined || v === '') return '—';
  const n = typeof v === 'string' ? Number(v) : v;
  if (!Number.isFinite(n)) return '—';
  return `${kwd.format(n)} د.ك`;
}

/**
 * الكميات numeric(14,3) بترجع نص زي "50.000" — بنشيل الأصفار الزايدة بمعالجة
 * نصية مش رقمية عشان مانفقدش دقة العشري (نفس نتيجة qtyText في التطبيق).
 */
export function qty(v: number | string | null | undefined): string {
  if (v === null || v === undefined || v === '') return '0';
  const s = String(v);
  if (!/^-?\d+(\.\d+)?$/.test(s)) return s;
  if (!s.includes('.')) return s;
  return s.replace(/0+$/, '').replace(/\.$/, '');
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

/** شهر قصير للرسم البياني (مثل 8/2026) */
export function fmtMonthShort(v: string): string {
  const d = new Date(v);
  return `${d.getMonth() + 1}/${d.getFullYear()}`;
}

/**
 * أرقام الكويت 8 خانات — الكود الدولي +965 مالوش لازمة في اللوحة (كل الحسابات
 * كويتية)، فبنشيله من العرض ونسيب الرقم المحلي بس. أي رقم بكود دولي تاني
 * بيتعرض زي ما هو عشان مايتشوّهش.
 */
export function localPhone(v: string | null | undefined): string {
  const s = (v ?? '').trim();
  if (!s) return '—';
  const digits = s.replace(/[^\d]/g, '');
  if (digits.length === 11 && digits.startsWith('965')) return digits.slice(3);
  if (digits.length === 8) return digits;
  return s;
}
