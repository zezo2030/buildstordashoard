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
  /** عمولة رجعت للبائعين بسبب المرتجعات في نفس الفترة. */
  commissionRefunded: number;
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
    commissionRefunded: num(r.commission_refunded),
    fees: num(r.fees),
    onSubscription: num(r.on_subscription),
    onCommission: num(r.on_commission),
  };
}

export type FinanceReturnRow = {
  id: string;
  returnNumber: string;
  orderId: string | null;
  orderNumber: string | null;
  buyerName: string | null;
  sellerName: string | null;
  status: string;
  refundAmount: number;
  feesRefunded: number;
  executedAt: string;
  /** null = اتقبل والفلوس لسه ما رجعتش. شوف `isRefundPending` في `labels.ts`. */
  refundedAt: string | null;
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
  /** مجموعة الحالة زي صفحة المرتجعات — 'all' أو مفتاح من `RETURN_STATUS_FILTERS`. */
  status: string;
  page: number;
  pageSize: number;
}): Promise<FinanceReturns> {
  const r = await callRpc<Record<string, unknown>>('admin_finance_returns', {
    p_from: q.from || null,
    p_to: q.to || null,
    p_search: q.search.trim() || null,
    p_limit: q.pageSize,
    p_offset: q.page * q.pageSize,
    p_status: q.status,
  });
  const rows = (r.rows ?? []) as Record<string, unknown>[];
  const s = (r.summary ?? {}) as Record<string, unknown>;
  return {
    rows: rows.map((x) => ({
      id: String(x.id),
      returnNumber: String(x.return_number ?? ''),
      orderId: (x.order_id as string | null) ?? null,
      orderNumber: (x.order_number as string | null) ?? null,
      buyerName: (x.buyer_name as string | null) ?? null,
      sellerName: (x.seller_name as string | null) ?? null,
      status: String(x.status ?? ''),
      refundAmount: num(x.refund_amount),
      feesRefunded: num(x.fees_refunded),
      executedAt: String(x.executed_at),
      refundedAt: (x.refunded_at as string | null) ?? null,
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
  /** اشتراكات المشترين (فردي + شركة) بس. */
  subscriptions: number;
  /** الاشتراك الثابت من البائعين — منفصل عن عمولتهم. */
  sellerSubscriptions: number;
  commission: number;
  grossProfit: number;
  /** مجموع أرصدة محافظ المشترين — مش دخل للمنصة، فلوس عملاء قابلة للشراء. */
  buyersBalance: number;
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
    sellerSubscriptions: num(r.seller_subscriptions),
    commission: num(r.commission),
    grossProfit: num(r.gross_profit),
    buyersBalance: num(r.buyers_balance),
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

// ------------------------------------------------ تفسير رسوم بائع واحد
//
// نفس فلاتر عمود «الرسوم» بالظبط، فـ`net` = الرقم اللي في الجدول. الاسترداد
// صفوف لوحده (مش جوه الطلب) عشان مرتجع في الفترة على طلب قديم يقفل المجموع.

export type SellerFeePlan = {
  kind: 'commission' | 'subscription';
  rate: number | null;
  fee: number;
  startsOn: string | null;
  endsOn: string | null;
  cycles: number | null;
  isActive: boolean;
  createdAt: string;
  note: string | null;
};

export type SellerFeeOrder = {
  orderId: string;
  orderNumber: string;
  issuedAt: string | null;
  paymentMethod: string;
  grandTotal: number;
  commission: number;
};

export type SellerFeesDetail = {
  commission: number;
  refunded: number;
  subscriptions: number;
  net: number;
  /** رصيد الحساب الجاري دلوقتي (كل الفترات): موجب = له · سالب = عليه. */
  balance: number;
  plans: SellerFeePlan[];
  orders: SellerFeeOrder[];
  refunds: { returnId: string | null; returnNumber: string | null; orderId: string | null;
             orderNumber: string | null; amount: number; at: string }[];
  subscriptionFees: { amount: number; periodStart: string | null; periodEnd: string | null;
                      at: string; note: string | null }[];
};

export async function fetchSellerFeesDetail(
  companyId: string,
  from: string | null,
  to: string | null,
): Promise<SellerFeesDetail> {
  const r = await callRpc<Record<string, unknown>>('admin_seller_fees_detail', {
    p_company: companyId, p_from: from || null, p_to: to || null,
  });
  const arr = (k: string) => (r[k] ?? []) as Record<string, unknown>[];
  const str = (v: unknown) => (v == null ? null : String(v));
  return {
    commission: num(r.commission),
    refunded: num(r.refunded),
    subscriptions: num(r.subscriptions),
    net: num(r.net),
    balance: num(r.balance),
    plans: arr('plans').map((p) => ({
      kind: p.kind === 'subscription' ? 'subscription' : 'commission',
      rate: p.rate == null ? null : num(p.rate),
      fee: num(p.fee),
      startsOn: str(p.starts_on),
      endsOn: str(p.ends_on),
      cycles: p.cycles == null ? null : num(p.cycles),
      isActive: p.is_active === true,
      createdAt: String(p.created_at),
      note: str(p.note),
    })),
    orders: arr('orders').map((o) => ({
      orderId: String(o.order_id),
      orderNumber: String(o.order_number ?? ''),
      issuedAt: str(o.issued_at),
      paymentMethod: String(o.payment_method ?? ''),
      grandTotal: num(o.grand_total),
      commission: num(o.commission),
    })),
    refunds: arr('refunds').map((x) => ({
      returnId: str(x.return_id),
      returnNumber: str(x.return_number),
      orderId: str(x.order_id),
      orderNumber: str(x.order_number),
      amount: num(x.amount),
      at: String(x.at),
    })),
    subscriptionFees: arr('subscription_fees').map((x) => ({
      amount: num(x.amount),
      periodStart: str(x.period_start),
      periodEnd: str(x.period_end),
      at: String(x.at),
      note: str(x.note),
    })),
  };
}
