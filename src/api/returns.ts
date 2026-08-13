// المرتجعات — نفس نمط الطلبات والفواتير: الصفوف والكروت من دالة واحدة.
import { supabase, arError } from '../lib/supabase';
import { toLoc, type Loc } from './location';

export type ReturnSortKey =
  | 'return_number' | 'buyer_name' | 'seller_name' | 'status' | 'refund_amount' | 'requested_at';

export type ReturnRow = {
  id: string;
  returnNumber: string;
  status: string;
  orderId: string | null;
  orderNumber: string | null;
  buyerName: string | null;
  sellerName: string | null;
  location: Loc | null;
  reasonText: string | null;
  refundAmount: number;
  requestedAt: string;
};

export type ReturnsStats = {
  nReturns: number;
  nItems: number;
  nSites: number;
  nOrders: number;
  nBuyers: number;
  nSellers: number;
  refund: number;
};

export type ReturnsQuery = {
  from: string | null;
  to: string | null;
  search: string;
  status: string;
  sort: ReturnSortKey;
  dir: 'asc' | 'desc';
  page: number;
  pageSize: number;
};

const num = (v: unknown) => Number(v ?? 0);

export async function fetchReturns(q: ReturnsQuery): Promise<{ rows: ReturnRow[]; total: number }> {
  const { data, error } = await supabase.rpc('admin_returns_list' as never, {
    // خانة التاريخ الفاضية بترجع '' — لازم تتحول null (يعني «من غير حد») قبل
    // ما توصل للداتابيز، وإلا Postgres بيرفض '' كتاريخ ويكسر الصفحة.
    p_from: q.from || null,
    p_to: q.to || null,
    p_search: q.search.trim() || null,
    p_status: q.status,
    p_sort: q.sort,
    p_dir: q.dir,
    p_limit: q.pageSize,
    p_offset: q.page * q.pageSize,
  } as never);
  if (error) throw new Error(arError(error));
  const r = data as unknown as { rows?: Record<string, unknown>[]; total?: unknown };
  return {
    rows: (r.rows ?? []).map((x) => ({
      id: String(x.id),
      returnNumber: String(x.return_number ?? ''),
      status: String(x.status ?? ''),
      orderId: (x.order_id as string | null) ?? null,
      orderNumber: (x.order_number as string | null) ?? null,
      buyerName: (x.buyer_name as string | null) ?? null,
      sellerName: (x.seller_name as string | null) ?? null,
      location: toLoc(x.location),
      reasonText: (x.reason_text as string | null) ?? null,
      refundAmount: num(x.refund_amount),
      requestedAt: String(x.requested_at),
    })),
    total: num(r.total),
  };
}

export async function fetchReturnsStats(from: string | null, to: string | null): Promise<ReturnsStats> {
  const { data, error } = await supabase.rpc('admin_returns_stats' as never, {
    p_from: from || null, p_to: to || null,
  } as never);
  if (error) throw new Error(arError(error));
  const r = data as unknown as Record<string, unknown>;
  return {
    nReturns: num(r.n_returns),
    nItems: num(r.n_items),
    nSites: num(r.n_sites),
    nOrders: num(r.n_orders),
    nBuyers: num(r.n_buyers),
    nSellers: num(r.n_sellers),
    refund: num(r.refund),
  };
}
