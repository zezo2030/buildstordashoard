// فحص جاهزية الإطلاق.
//
// البنود اللي من نوع «لازم تفتكرها قبل الإطلاق» بتتنسى لو فضلت في رسالة أو
// ملف. هنا بتتحسب من الداتا الحية كل مرة، والكارت بيختفي لوحده لما كل بند
// يتظبط — فمفيش حاجة تفضل معلّمة «خلصت» وهي لأ.
//
// الفحص **بيقرا بس**. التصليح قرار الأدمن، ولكل بند مسار يوديه للمكان الصح.
import { supabase, arError } from '../lib/supabase';

export type ReadinessLevel = 'blocker' | 'warning';

export type ReadinessCheck = {
  key: string;
  level: ReadinessLevel;
  title: string;
  /** الأرقام أو الأسماء — نص جاهز للعرض من الداتابيز. */
  detail: string;
  /** ليه ده مهم — سطر بيشرح الخطر مش بيعيد العنوان. */
  hint: string;
  count: number;
  route: string;
};

export type Readiness = {
  checkedAt: string;
  blockers: number;
  warnings: number;
  checks: ReadinessCheck[];
};

export async function fetchReadiness(): Promise<Readiness> {
  const { data, error } = await supabase.rpc('admin_launch_readiness' as never);
  if (error) throw new Error(arError(error));
  const r = data as unknown as Record<string, unknown>;
  return {
    checkedAt: String(r.checked_at ?? ''),
    blockers: Number(r.blockers ?? 0),
    warnings: Number(r.warnings ?? 0),
    checks: ((r.checks ?? []) as Record<string, unknown>[]).map((c) => ({
      key: String(c.key),
      level: c.level === 'blocker' ? 'blocker' : 'warning',
      title: String(c.title ?? ''),
      detail: String(c.detail ?? ''),
      hint: String(c.hint ?? ''),
      count: Number(c.count ?? 0),
      route: String(c.route ?? '/'),
    })),
  };
}
