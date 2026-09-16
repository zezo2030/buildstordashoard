// حساب البائع الجاري.
//
// **رقم واحد بالموجب والسالب** بدل ما الأدمن يفضل يحسب:
//
//     الرصيد > 0  ⇒  المنصة عليها للبائع   (باع أونلاين والمنصة شايلة فلوسه)
//     الرصيد < 0  ⇒  البائع عليه للمنصة    (باع كاش وقبض، والعمولة عليه)
//
// القيود بتتولد لوحدها من تريجرات في الداتابيز — الواجهة بتقرا وبتسجّل
// التحصيل والتحويل بس.
import { supabase, arError } from '../lib/supabase';

const num = (v: unknown) => Number(v ?? 0);

export type SellerBalance = {
  id: string;
  name: string;
  isActive: boolean;
  /** محذوف ولسه عليه فلوس — الحذف بيوقف التعامل مش المديونية. */
  deleted: boolean;
  balance: number;
  /** إجمالي اللي اتحمّل عليه (عمولة + اشتراك). */
  charged: number;
  settled: number;
  lastEntry: string | null;
  nEntries: number;
};

export type LedgerEntryKind =
  | 'commission' | 'sale_proceeds' | 'commission_refund' | 'sale_reversal'
  | 'subscription' | 'payout' | 'settlement' | 'adjustment';

export type LedgerEntry = {
  id: string;
  amount: number;
  kind: LedgerEntryKind;
  refType: string | null;
  refId: string | null;
  description: string | null;
  entryDate: string;
  createdAt: string;
};

export type SellerStatement = {
  companyId: string;
  name: string;
  /** رصيد ما قبل الفترة — عشان الكشف يقفل صح. */
  opening: number;
  balance: number;
  rows: LedgerEntry[];
};

export async function fetchSellerBalances(search = ''): Promise<SellerBalance[]> {
  const { data, error } = await supabase.rpc('admin_seller_balances' as never, {
    p_search: search.trim() || null,
  } as never);
  if (error) throw new Error(arError(error));
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: String(r.id),
    name: String(r.name ?? ''),
    isActive: r.is_active === true,
    deleted: r.deleted === true,
    balance: num(r.balance),
    charged: num(r.charged),
    settled: num(r.settled),
    lastEntry: (r.last_entry as string | null) ?? null,
    nEntries: num(r.n_entries),
  }));
}

export async function fetchSellerStatement(
  companyId: string,
  from: string | null = null,
  to: string | null = null,
): Promise<SellerStatement> {
  const { data, error } = await supabase.rpc('admin_seller_statement' as never, {
    p_company: companyId, p_from: from || null, p_to: to || null, p_limit: 200,
  } as never);
  if (error) throw new Error(arError(error));
  const r = data as unknown as Record<string, unknown>;
  return {
    companyId: String(r.company_id),
    name: String(r.name ?? ''),
    opening: num(r.opening),
    balance: num(r.balance),
    rows: ((r.rows ?? []) as Record<string, unknown>[]).map((x) => ({
      id: String(x.id),
      amount: num(x.amount),
      kind: String(x.kind) as LedgerEntryKind,
      refType: (x.ref_type as string | null) ?? null,
      refId: (x.ref_id as string | null) ?? null,
      description: (x.description_ar as string | null) ?? null,
      entryDate: String(x.entry_date),
      createdAt: String(x.created_at),
    })),
  };
}

export async function settleSeller(args: {
  companyId: string;
  amount: string;
  kind: 'settlement' | 'payout' | 'adjustment';
  note?: string | null;
  date?: string | null;
}): Promise<void> {
  // المبلغ نص لحد الداتابيز — ولا `parseFloat` على فلوس.
  if (!/^\d{1,9}(\.\d{1,3})?$/.test(args.amount.trim())) {
    throw new Error('اكتب مبلغًا صالحًا');
  }
  const { error } = await supabase.rpc('admin_seller_settle' as never, {
    p_company: args.companyId,
    p_amount: args.amount.trim(),
    p_kind: args.kind,
    p_note: args.note?.trim() || null,
    p_date: args.date || null,
  } as never);
  if (error) throw new Error(arError(error));
}

export const LEDGER_KIND_LABELS: Record<LedgerEntryKind, string> = {
  commission: 'عمولة',
  sale_proceeds: 'حصيلة بيعة',
  commission_refund: 'استرداد عمولة',
  sale_reversal: 'سحب حصيلة مرتجع',
  subscription: 'رسوم اشتراك',
  payout: 'تحويل للبائع',
  settlement: 'تحصيل من البائع',
  adjustment: 'تسوية',
};

// ---------------------------------------------------------------- الكشوف
//
// الكشف **لقطة من الدفتر بتاريخ استحقاق** — الدفتر هو المصدر، والكشف هو
// المطالبة. عشان كده «مستحق الكشف» ممكن يختلف عن «الرصيد دلوقتي» لو حصلت
// حركة بعد الإصدار، والاتنين معروضين.

export type StatementStatus = 'open' | 'overdue' | 'paid' | 'waived';

export type SellerStatementRow = {
  id: string;
  companyId: string;
  name: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  status: StatementStatus;
  amountDue: number;
  charged: number;
  settled: number;
  /** موجب = فاضل أيام · سالب = متأخر بكام يوم. */
  daysLeft: number;
  suspended: boolean;
  /** الرصيد الحالي من الدفتر — ممكن يكون اتغيّر بعد الإصدار. */
  balanceNow: number;
};

export async function fetchSellerStatements(
  status: 'due' | 'all' = 'due',
): Promise<SellerStatementRow[]> {
  const { data, error } = await supabase.rpc('admin_seller_statements' as never, {
    p_status: status,
  } as never);
  if (error) throw new Error(arError(error));
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: String(r.id),
    companyId: String(r.seller_company_id),
    name: String(r.name ?? ''),
    periodStart: String(r.period_start),
    periodEnd: String(r.period_end),
    dueDate: String(r.due_date),
    status: String(r.status) as StatementStatus,
    amountDue: num(r.amount_due),
    charged: num(r.charged),
    settled: num(r.settled),
    daysLeft: num(r.days_left),
    suspended: r.suspended === true,
    balanceNow: num(r.balance_now),
  }));
}

/** إصدار كشوف فترة منتهية. بدون تاريخ = الشهر اللي فات. */
export async function issueStatements(periodEnd: string | null = null): Promise<number> {
  const { data, error } = await supabase.rpc('admin_issue_seller_statements' as never, {
    p_period_end: periodEnd || null,
  } as never);
  if (error) throw new Error(arError(error));
  return Number(data ?? 0);
}

export async function waiveStatement(id: string, note: string): Promise<void> {
  const { error } = await supabase.rpc('admin_waive_statement' as never, {
    p_id: id, p_note: note.trim() || null,
  } as never);
  if (error) throw new Error(arError(error));
}
