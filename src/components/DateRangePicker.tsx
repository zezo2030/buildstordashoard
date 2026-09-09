// فلتر فترة زمنية — <input type="date"> أصلي، من غير مكتبة، وبيشتغل صح في RTL.
export type DateRange = { from: string; to: string };

/** تاريخ النهارده بصيغة YYYY-MM-DD بالتوقيت المحلي (مش UTC). */
export function todayISO(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 10);
}

/** تاريخ من n يوم فات بصيغة YYYY-MM-DD. */
export function daysAgoISO(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 10);
}

const cls =
  'h-8 rounded-lg border border-line bg-white px-2 text-xs text-primary outline-none ' +
  'focus:border-accent focus:ring-2 focus:ring-accent/20';

// الأزرار السريعة اختيارية (presets) — صفحة الحسابات بتستخدم المكوّن من غيرها
// فمابتتأثرش، وصفحات التجارة بتشغّلها.
const PRESETS: [string, number][] = [
  ['اليوم', 0],
  ['آخر ٧ أيام', 7],
  ['آخر ١٠ أيام', 10],
  ['آخر ٣٠ يوم', 30],
];

export function DateRangePicker({ value, onChange, className = '', presets = false, allowAll = false }: {
  value: DateRange;
  onChange: (v: DateRange) => void;
  className?: string;
  presets?: boolean;
  /** زرار «كل الفترات» — بيفضّي الطرفين، والـAPI بيحوّل '' لـ null (بدون حد). */
  allowAll?: boolean;
}) {
  const isAll = value.from === '' && value.to === '';
  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {presets && PRESETS.map(([label, days]) => {
        const active = !isAll && value.to === todayISO() && value.from === daysAgoISO(days);
        return (
          <button
            key={days}
            type="button"
            onClick={() => onChange({ from: daysAgoISO(days), to: todayISO() })}
            className={`h-8 rounded-lg border px-2 text-xs transition-colors ${
              active ? 'border-accent bg-accent/10 text-accent' : 'border-line text-subtext hover:text-primary'
            }`}
          >
            {label}
          </button>
        );
      })}
      {allowAll && (
        <button
          type="button"
          onClick={() => onChange({ from: '', to: '' })}
          className={`h-8 rounded-lg border px-2 text-xs transition-colors ${
            isAll ? 'border-accent bg-accent/10 text-accent' : 'border-line text-subtext hover:text-primary'
          }`}
        >
          كل الفترات
        </button>
      )}
      <span className="text-xs text-subtext">من</span>
      <input
        type="date"
        dir="ltr"
        aria-label="من تاريخ"
        className={cls}
        value={value.from}
        max={value.to}
        onChange={(e) => onChange({ ...value, from: e.target.value })}
      />
      <span className="text-xs text-subtext">إلى</span>
      <input
        type="date"
        dir="ltr"
        aria-label="إلى تاريخ"
        className={cls}
        value={value.to}
        min={value.from}
        onChange={(e) => onChange({ ...value, to: e.target.value })}
      />
    </div>
  );
}
