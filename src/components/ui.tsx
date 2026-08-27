// مكوّنات أساسية موحّدة — تُبنى مرة واحدة من التوكِنز ولا تُنسّق يدويًا في الشاشات.
import type { ReactNode, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ButtonHTMLAttributes } from 'react';
import { Loader2, Inbox } from 'lucide-react';
import type { Tone } from '../lib/labels';
import { money } from '../lib/format';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-(--radius-card) border border-line bg-white ${className}`}>
      {children}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-primary">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-subtext">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

const toneClasses: Record<Tone, string> = {
  gray: 'bg-gray-100 text-gray-600',
  green: 'bg-green-50 text-success',
  orange: 'bg-accent-soft text-accent',
  red: 'bg-red-50 text-danger',
  blue: 'bg-blue-50 text-[#2f80ed]',
  navy: 'bg-[#e8ecf3] text-primary',
};

export function StatusChip({ label, tone }: { label: string; tone: Tone }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium leading-snug ${toneClasses[tone]}`}>
      {label}
    </span>
  );
}

export function Money({ value, signed = false }: { value: number | string | null | undefined; signed?: boolean }) {
  const n = Number(value ?? 0);
  const cls = signed ? (n > 0 ? 'text-success' : n < 0 ? 'text-danger' : '') : '';
  return (
    <span dir="ltr" className={`font-medium ${cls}`}>
      {signed && n > 0 ? '+' : ''}
      {money(value)}
    </span>
  );
}

export function KpiCard({ title, value, hint, icon, tone = 'navy', footer }: {
  title: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  tone?: Tone;
  footer?: ReactNode;
}) {
  return (
    <Card className="p-4 shadow-[0_1px_0_rgba(22,40,63,0.03)] transition-shadow hover:shadow-[0_10px_28px_-22px_rgba(22,40,63,0.45)]">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[13px] text-subtext">{title}</div>
          <div className="mt-1.5 text-2xl font-bold tracking-tight text-primary">{value}</div>
          {hint && <div className="mt-1 text-xs text-subtext">{hint}</div>}
        </div>
        {icon && <div className={`shrink-0 rounded-xl p-2.5 ${toneClasses[tone]}`}>{icon}</div>}
      </div>
      {footer && <div className="mt-3 border-t border-line pt-2.5">{footer}</div>}
    </Card>
  );
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'accent' | 'ghost' | 'danger';
  busy?: boolean;
};

export function Btn({ variant = 'primary', busy, disabled, children, className = '', ...rest }: BtnProps) {
  const base = 'inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  const variants = {
    primary: 'bg-primary text-white hover:bg-navy',
    accent: 'bg-accent text-white hover:bg-[#e07310]',
    ghost: 'border border-line bg-white text-primary hover:bg-surface',
    danger: 'bg-danger text-white hover:bg-red-700',
  } as const;
  return (
    <button className={`${base} ${variants[variant]} ${className}`} disabled={disabled || busy} {...rest}>
      {busy && <Loader2 size={15} className="animate-spin" />}
      {children}
    </button>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-primary">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-subtext">{hint}</span>}
    </label>
  );
}

const inputCls =
  'w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-primary placeholder:text-subtext focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20';

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputCls} ${props.className ?? ''}`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${inputCls} ${props.className ?? ''}`} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputCls} min-h-24 ${props.className ?? ''}`} />;
}

/** مفتاح تفعيل أخضر — مطابق لتصميم Figma */
export function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${checked ? 'bg-[#4cd964]' : 'bg-gray-300'}`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? 'start-[22px]' : 'start-0.5'}`}
      />
    </button>
  );
}

export function Spinner({ label = 'جارٍ التحميل…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-subtext">
      <Loader2 size={18} className="animate-spin" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function EmptyState({ title = 'لا توجد بيانات', hint }: { title?: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-subtext">
      <Inbox size={32} strokeWidth={1.5} />
      <div className="text-sm font-medium">{title}</div>
      {hint && <div className="text-xs">{hint}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16">
      <div className="text-sm text-danger">{message}</div>
      {onRetry && (
        <Btn variant="ghost" onClick={onRetry}>
          إعادة المحاولة
        </Btn>
      )}
    </div>
  );
}
