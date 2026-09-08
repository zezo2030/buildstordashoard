// تنبيه «اشتراكات قربت تخلص» — بيظهر في نظرة عامة لما يكون فيه حساب واحد على
// الأقل خطته بتنتهي خلال شهر أو خلصت خلاص.
//
// الترتيب بالأقرب انتهاءً، والمنتهي بيتلوّن أحمر: ده الحساب اللي هيقف (أو وقف)
// والأدمن محتاج يجدّد رسومه أو يعدّلها من صفحته.
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { CalendarClock, ArrowUpLeft } from 'lucide-react';
import { fetchExpiringPlans, planHref, type ExpiringPlan } from '../api/billing-expiry';
import { Card, StatusChip } from './ui';
import { fmtDate, money } from '../lib/format';

const SUBJECT_LABEL: Record<string, string> = {
  seller: 'بائع',
  company_buyer: 'مشتري شركة',
  individual_buyer: 'مشتري فرد',
};

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

export function ExpiringPlansCard({ days = 30 }: { days?: number }) {
  const q = useQuery({
    queryKey: ['expiring-plans', days],
    queryFn: () => fetchExpiringPlans(days),
    refetchInterval: 300_000,
  });

  const rows = q.data ?? [];
  if (q.isLoading || rows.length === 0) return null;

  return (
    <Card className="mb-6 p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="grid size-9 place-items-center rounded-xl bg-accent-soft text-accent">
          <CalendarClock size={18} />
        </span>
        <div>
          <h2 className="font-bold">اشتراكات قاربت على الانتهاء</h2>
          <p className="text-xs text-subtext">
            {rows.length} حساب خطة رسومه بتنتهي خلال {days} يوم أو انتهت — جدّد أو عدّل الرسوم من صفحة الحساب
          </p>
        </div>
      </div>
      <ul className="divide-y divide-line">
        {rows.map((p) => {
          const over = p.daysLeft < 0;
          return (
            <li key={`${p.subject}:${p.id}`}>
              <Link
                to={planHref(p)}
                className="flex flex-wrap items-center gap-2 py-2.5 text-sm transition-colors hover:bg-surface"
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
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
