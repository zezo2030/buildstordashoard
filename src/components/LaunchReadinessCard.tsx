// كارت «جاهزية الإطلاق» في نظرة عامة.
//
// بيختفي لوحده لما كل البنود تتظبط — فوجوده نفسه هو الإشارة، ومفيش حاجة
// بتفضل معلّمة «خلصت» وهي لأ.
//
// المانع بالأحمر: ده اللي لو اتساب هيدّي فلوس وهمية أو بائع محدش يقدر يدخله.
// التحذير بالبرتقالي: يفضّل يتظبط بس مش مانع.
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowUpLeft, CheckCircle2 } from 'lucide-react';
import { fetchReadiness, type ReadinessCheck } from '../api/launch-readiness';
import { Card, StatusChip } from './ui';

function Row({ c }: { c: ReadinessCheck }) {
  const blocker = c.level === 'blocker';
  return (
    <li>
      <Link
        to={c.route}
        className="flex flex-wrap items-start gap-2 py-2.5 transition-colors hover:bg-surface"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{c.title}</span>
            <StatusChip label={blocker ? 'مانع' : 'تحذير'} tone={blocker ? 'red' : 'orange'} />
            <span className="text-xs text-subtext" dir="auto">{c.detail}</span>
          </div>
          <p className="mt-0.5 text-xs leading-relaxed text-subtext">{c.hint}</p>
        </div>
        <ArrowUpLeft size={14} className="mt-1 shrink-0 text-subtext" />
      </Link>
    </li>
  );
}

export function LaunchReadinessCard() {
  const q = useQuery({
    queryKey: ['launch-readiness'],
    queryFn: fetchReadiness,
    refetchInterval: 300_000,
  });

  const d = q.data;
  if (q.isLoading || !d || d.checks.length === 0) return null;

  return (
    <Card className="mb-6 p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="grid size-9 place-items-center rounded-xl bg-red-50 text-danger">
          <ShieldAlert size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-bold">جاهزية الإطلاق</h2>
          <p className="text-xs text-subtext">
            {d.blockers > 0
              ? `${d.blockers} بند مانع${d.warnings > 0 ? ` و${d.warnings} تحذير` : ''} — `
              : `${d.warnings} تحذير — `}
            الكارت ده بيختفي لوحده أول ما كله يتظبط
          </p>
        </div>
        {d.blockers === 0 && (
          <span className="flex items-center gap-1 text-xs text-success">
            <CheckCircle2 size={14} /> مفيش موانع
          </span>
        )}
      </div>
      <ul className="divide-y divide-line">
        {d.checks.map((c) => <Row key={c.key} c={c} />)}
      </ul>
    </Card>
  );
}
