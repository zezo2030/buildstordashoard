// قسم «المال» — الرسوم والاشتراكات والأرباح.
//
// تابات المشترين والبائع بتقرا من نفس `admin_accounts_list` بتاع قسم الحسابات
// (بيرجّع خطة الرسوم والاشتراكات المحصّلة كمان)، فالبحث والفرز والترقيم
// بيشتغلوا زي ما هما من غير تكرار منطق في الداتابيز.
import { supabase, arError } from '../lib/supabase';
import type { BillingSubject } from './accounts';

const num = (v: unknown) => Number(v ?? 0);

async function callRpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn as never, args as never);
  if (error) throw new Error(arError(error));
  return data as T;
}

export type FinanceSummary = {
  accounts: number;
  active: number;
  suspended: number;
  money: number;
  commission: number;
  fees: number;
  onSubscription: number;
  onCommission: number;
};

export async function fetchFinanceSummary(
  subject: BillingSubject,
  from: string | null,
  to: string | null,
): Promise<FinanceSummary> {
  const r = await callRpc<Record<string, unknown>>('admin_finance_summary', {
    p_subject_type: subject,
    p_from: from || null,
    p_to: to || null,
  });
  return {
    accounts: num(r.accounts),
    active: num(r.active),
    suspended: num(r.suspended),
    money: num(r.money),
    commission: num(r.commission),
    fees: num(r.fees),
    onSubscription: num(r.on_subscription),
    onCommission: num(r.on_commission),
  };
}

export type FinanceReturnRow = {
  id: string;
  returnNumber: string;
  orderNumber: string | null;
  buyerName: string | null;
  sellerName: string | null;
  status: string;
  refundAmount: number;
  feesRefunded: number;
  executedAt: string;
  nItems: number;
};

export type FinanceReturns = {
  rows: FinanceReturnRow[];
  total: number;
  summary: { nReturns: number; refund: number; fees: number };
};

export async function fetchFinanceReturns(q: {
  from: string | null;
  to: string | null;
  search: string;
  page: number;
  pageSize: number;
}): Promise<FinanceReturns> {
  const r = await callRpc<Record<string, unknown>>('admin_finance_returns', {
    p_from: q.from || null,
    p_to: q.to || null,
    p_search: q.search.trim() || null,
    p_limit: q.pageSize,
    p_offset: q.page * q.pageSize,
  });
  const rows = (r.rows ?? []) as Record<string, unknown>[];
  const s = (r.summary ?? {}) as Record<string, unknown>;
  return {
    rows: rows.map((x) => ({
      id: String(x.id),
      returnNumber: String(x.return_number ?? ''),
      orderNumber: (x.order_number as string | null) ?? null,
      buyerName: (x.buyer_name as string | null) ?? null,
      sellerName: (x.seller_name as string | null) ?? null,
      status: String(x.status ?? ''),
      refundAmount: num(x.refund_amount),
      feesRefunded: num(x.fees_refunded),
      executedAt: String(x.executed_at),
      nItems: num(x.n_items),
    })),
    total: num(r.total),
    summary: {
      nReturns: num(s.n_returns),
      refund: num(s.refund),
      fees: num(s.fees),
    },
  };
}

export type FinanceStats = {
  individualBuyers: number;
  companyBuyers: number;
  sellers: number;
  nSales: number;
  salesValue: number;
  feesTotal: number;
  subscriptions: number;
  commission: number;
  grossProfit: number;
  nReturns: number;
  returnsValue: number;
  feesRefunded: number;
  netProfit: number;
  accountsActive: number;
  accountsInactive: number;
  ordersCompleted: number;
  ordersCancelled: number;
  ordersReturned: number;
};

export async function fetchFinanceStats(
  from: string | null,
  to: string | null,
): Promise<FinanceStats> {
  const r = await callRpc<Record<string, unknown>>('admin_finance_stats', {
    p_from: from || null,
    p_to: to || null,
  });
  return {
    individualBuyers: num(r.individual_buyers),
    companyBuyers: num(r.company_buyers),
    sellers: num(r.sellers),
    nSales: num(r.n_sales),
    salesValue: num(r.sales_value),
    feesTotal: num(r.fees_total),
    subscriptions: num(r.subscriptions),
    commission: num(r.commission),
    grossProfit: num(r.gross_profit),
    nReturns: num(r.n_returns),
    returnsValue: num(r.returns_value),
    feesRefunded: num(r.fees_refunded),
    netProfit: num(r.net_profit),
    accountsActive: num(r.accounts_active),
    accountsInactive: num(r.accounts_inactive),
    ordersCompleted: num(r.orders_completed),
    ordersCancelled: num(r.orders_cancelled),
    ordersReturned: num(r.orders_returned),
  };
}
