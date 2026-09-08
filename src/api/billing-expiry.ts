// خطط الرسوم اللي قربت تخلص — التنبيه اللي كان ناقص في اللوحة.
//
// `ends_on` موجود في `billing_plans` من الأول لكن محدش كان بيسأل عليه، فالأدمن
// كان بيعرف إن الاشتراك خلص لما الحساب يقف. الدالة بترجّع اللي فاضل ليه أيام
// واللي خلص فعلاً (`daysLeft` سالبة) في قايمة واحدة مرتّبة بالأقرب.
import { supabase, arError } from '../lib/supabase';
import type { BillingKind, BillingSubject } from './accounts';

export type ExpiringPlan = {
  id: string;
  subject: BillingSubject;
  name: string;
  kind: BillingKind | null;
  fee: number;
  rate: number | null;
  endsOn: string;
  daysLeft: number;
  suspended: boolean;
};

/** مسار صفحة الحساب: البائع كيانه شركة، والمشتري ملف شخصي. */
export function planHref(p: ExpiringPlan): string {
  return p.subject === 'seller' ? `/companies/${p.id}` : `/users/${p.id}`;
}

export async function fetchExpiringPlans(days = 30): Promise<ExpiringPlan[]> {
  const { data, error } = await supabase.rpc('admin_expiring_billing_plans' as never, {
    p_days: days,
  } as never);
  if (error) throw new Error(arError(error));
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: String(r.id),
    subject: (r.subject as BillingSubject) ?? 'seller',
    name: String(r.name ?? '—'),
    kind: (r.kind as BillingKind | null) ?? null,
    fee: Number(r.fee ?? 0),
    rate: r.rate == null ? null : Number(r.rate),
    endsOn: String(r.ends_on),
    daysLeft: Number(r.days_left ?? 0),
    suspended: r.suspended === true,
  }));
}
