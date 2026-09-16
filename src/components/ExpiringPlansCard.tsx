// تنبيه «اشتراكات قربت تخلص» — بيظهر في نظرة عامة لما يكون فيه حساب واحد على
// الأقل خطته بتنتهي خلال المدة المختارة أو خلصت خلاص.
//
// الترتيب بالأقرب انتهاءً، والمنتهي بيتلوّن أحمر: ده الحساب اللي هيقف (أو وقف)
// والأدمن محتاج يجدّد رسومه أو يعدّلها من صفحته.
//
// وفيه زرار تذكير لكل سطر: التذكير التلقائي بيضرب **مرة واحدة** قبل الانتهاء
// بعدد الأيام اللي في الإعدادات، فده للحالة اللي الأدمن عايز يذكّر فيها دلوقتي.
import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { CalendarClock, ArrowUpLeft, BellRing } from 'lucide-react';
import {
  fetchExpiringPlans, notifyPlanExpiry, planHref, type ExpiringPlan,
} from '../api/billing-expiry';
import { Card, StatusChip } from './ui';
import { useToast } from './Toast';
import { fmtDate, money } from '../lib/format';

const SUBJECT_LABEL: Record<string, string> = {
  seller: 'بائع',
  company_buyer: 'مشتري شركة',
  individual_buyer: 'مشتري فرد',
};

/** نوافذ العرض — «الكل» بتوصل لأقصى حد الدالة (سنة). */
const WINDOWS: { days: number; label: string }[] = [
  { days: 30, label: 'شهر' },
  { days: 90, label: '٣ شهور' },
  { days: 365, label: 'الكل' },
];

/** «باقي ٣ أيام» / «منتهٍ منذ يومين» / «ينتهي اليوم». */
function remainingText(daysLeft: number): string {
  if (daysLeft === 0) return 'ينتهي اليوم';
  if (daysLeft < 0) return `منتهٍ منذ ${Math.abs(daysLeft)} يوم`;
  return `باقي ${daysLeft} يوم`;
}

function planText(p: ExpiringPlan): string {
  if (p.kind === 'subscription') return p.fee > 0 ? `اشتراك ${money(p.fee)}` : 'اشتراك مجاني';
  if (p.kind === 'commission') return `نسبة ${p.rate ?? 0}%`;
  return '—';
}

export function ExpiringPlansCard({ days: initialDays = 30 }: { days?: number }) {
  const [days, setDays] = useState(initialDays);
  const { toast } = useToast();

  const q = useQuery({
    queryKey: ['expiring-plans', days],
    queryFn: () => fetchExpiringPlans(days),
    refetchInterval: 300_000,
  });

  const remind = useMutation({
    mutationFn: (p: ExpiringPlan) => notifyPlanExpiry(p),
    onSuccess: (n) => toast('success', `اتبعت التذكير لـ${n} مستخدم`),
    onError: (e) => toast('error', (e as Error).message),
  });

  const rows = q.data ?? [];
  // الكارت بيختفي لو مفيش حاجة في نافذة الشهر، لكن بمجرد ما الأدمن يوسّع
  // النافذة بنسيبه ظاهر عشان ما يختفيش تحت إيده وهو بيبدّل.
  if (q.isLoading || (rows.length === 0 && days === initialDays)) return null;

  return (
    <Card className="mb-6 p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="grid size-9 place-items-center rounded-xl bg-accent-soft text-accent">
          <CalendarClock size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-bold">اشتراكات قاربت على الانتهاء</h2>
          <p className="text-xs text-subtext">
            {rows.length} حساب خطة رسومه بتنتهي خلال {days} يوم أو انتهت — جدّد أو عدّل الرسوم من
            صفحة الحساب، أو ابعت تذكير
          </p>
        </div>
        <div className="flex gap-1 rounded-lg border border-line p-0.5">
          {WINDOWS.map((w) => (
            <button
              key={w.days}
              type="button"
              onClick={() => setDays(w.days)}
              className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
                days === w.days ? 'bg-accent text-white' : 'text-subtext hover:bg-surface'
              }`}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="py-4 text-center text-sm text-subtext">مفيش اشتراكات بتنتهي في المدة دي</p>
      ) : (
        <ul className="divide-y divide-line">
          {rows.map((p) => {
            const over = p.daysLeft < 0;
            const busy = remind.isPending && remind.variables?.id === p.id;
            return (
              <li key={`${p.subject}:${p.id}`} className="flex items-center gap-2">
                <Link
                  to={planHref(p)}
                  className="flex min-w-0 flex-1 flex-wrap items-center gap-2 py-2.5 text-sm transition-colors hover:bg-surface"
                >
                  <span className="min-w-0 flex-1 truncate font-medium">{p.name}</span>
                  <StatusChip label={SUBJECT_LABEL[p.subject] ?? p.subject} tone="navy" />
                  <span className="text-xs text-subtext" dir="ltr">{planText(p)}</span>
                  <span className="text-xs text-subtext">{fmtDate(p.endsOn)}</span>
                  <StatusChip
                    label={p.suspended ? 'موقوف' : remainingText(p.daysLeft)}
                    tone={p.suspended || over ? 'red' : 'orange'}
                  />
                  <ArrowUpLeft size={14} className="shrink-0 text-subtext" />
                </Link>
                <button
                  type="button"
                  onClick={() => remind.mutate(p)}
                  disabled={busy}
                  title="ابعت تذكير بالتجديد"
                  className="flex shrink-0 items-center gap-1 rounded-lg border border-line px-2 py-1 text-xs text-subtext transition-colors hover:bg-surface hover:text-primary disabled:opacity-50"
                >
                  <BellRing size={13} /> {busy ? '…' : 'ذكّره'}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
