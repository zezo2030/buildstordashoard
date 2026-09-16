// طلبات تجديد عقود البائعين.
//
// العقد نفسه في `billing_plans` (لكل بائع شروطه — النِسب مختلفة فعلاً)، والطلب
// ده مجرد مسار موافقة فوقه: البائع بيطلب، وإنت بتحدد التاريخ الجديد.
//
// الموافقة بتعدّي على `admin_set_billing_plan` بنفس الشروط القديمة وتاريخ
// جديد — ودي اللي **بتفك إيقاف الشركة لوحدها** لو كانت وقفت لعدم التجديد.
import { supabase, arError } from '../lib/supabase';

export type RenewalStatus = 'pending' | 'approved' | 'rejected';

export type RenewalRow = {
  id: string;
  companyId: string;
  companyName: string;
  status: RenewalStatus;
  suspended: boolean;
  note: string | null;
  adminNote: string | null;
  requestedByName: string | null;
  kind: 'commission' | 'subscription' | null;
  rate: number | null;
  fee: number | null;
  /** نهاية العقد الحالية — دي اللي بيتبني عليها التاريخ الجديد. */
  currentEndsOn: string | null;
  endsOnAtRequest: string | null;
  newEndsOn: string | null;
  requestedAt: string;
  decidedAt: string | null;
};

const num = (v: unknown) => (v == null ? null : Number(v));

export async function fetchRenewals(status: RenewalStatus | 'all' = 'pending'): Promise<RenewalRow[]> {
  const { data, error } = await supabase.rpc('admin_seller_renewals_list' as never, {
    p_status: status,
  } as never);
  if (error) throw new Error(arError(error));
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: String(r.id),
    companyId: String(r.company_id),
    companyName: String(r.company_name ?? '—'),
    status: r.status as RenewalStatus,
    suspended: r.suspended === true,
    note: (r.note as string | null) ?? null,
    adminNote: (r.admin_note as string | null) ?? null,
    requestedByName: (r.requested_by_name as string | null) ?? null,
    kind: (r.kind as RenewalRow['kind']) ?? null,
    rate: num(r.rate),
    fee: num(r.fee),
    currentEndsOn: (r.current_ends_on as string | null) ?? null,
    endsOnAtRequest: (r.ends_on_at_request as string | null) ?? null,
    newEndsOn: (r.new_ends_on as string | null) ?? null,
    requestedAt: String(r.requested_at),
    decidedAt: (r.decided_at as string | null) ?? null,
  }));
}

export async function decideRenewal(args: {
  id: string;
  approve: boolean;
  endsOn?: string | null;
  note?: string | null;
}): Promise<void> {
  const { error } = await supabase.rpc('admin_decide_renewal' as never, {
    p_id: args.id,
    p_approve: args.approve,
    p_ends_on: args.approve ? args.endsOn : null,
    p_note: args.note?.trim() || null,
  } as never);
  if (error) throw new Error(arError(error));
}
