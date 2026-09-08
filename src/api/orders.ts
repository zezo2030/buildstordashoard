// الطلبات — كل الفلترة والفرز والترقيم في الداتابيز عبر admin_orders_list.
// المبالغ بترجع نصًا وبتتحوّل هنا بـ Number عشان مايحصلش فقدان دقة.
import { supabase, arError } from '../lib/supabase';
import { toLoc, type Loc } from './location';

export type OrderSortKey =
  | 'order_number' | 'buyer_name' | 'seller_name' | 'status' | 'grand_total' | 'placed_at';

export type OrderRow = {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  buyerName: string | null;
  sellerName: string | null;
  location: Loc | null;
  grandTotal: number;
  placedAt: string;
};

/**
 * نطاق القايمة.
 *
 * «الطلبات» بقت العمليات الجارية بس: الطلب اللي اتلغى أو اتدفع بقى مستنده
 * فاتورة، ومكانه قسم الفواتير. المؤرشف لسه موصول من نفس الشاشة عشان الأدمن
 * يقدر يراجعه، بس مش هو الافتراضي.
 */
export type OrdersScope = 'current' | 'archived' | 'all';

export type OrdersQuery = {
  from: string | null;
  to: string | null;
  search: string;
  status: string;
  method: string;
  scope: OrdersScope;
  sort: OrderSortKey;
  dir: 'asc' | 'desc';
  page: number;
  pageSize: number;
};

export async function fetchOrders(q: OrdersQuery): Promise<{ rows: OrderRow[]; total: number }> {
  const { data, error } = await supabase.rpc('admin_orders_list' as never, {
    // خانة التاريخ الفاضية بترجع '' — لازم تتحول null (يعني «من غير حد») قبل
    // ما توصل للداتابيز، وإلا Postgres بيرفض '' كتاريخ ويكسر الصفحة.
    p_from: q.from || null,
    p_to: q.to || null,
    p_search: q.search.trim() || null,
    p_status: q.status,
    p_method: q.method,
    p_sort: q.sort,
    p_dir: q.dir,
    p_limit: q.pageSize,
    p_offset: q.page * q.pageSize,
    p_scope: q.scope,
  } as never);
  if (error) throw new Error(arError(error));
  const r = data as unknown as { rows?: Record<string, unknown>[]; total?: unknown };
  return {
    rows: (r.rows ?? []).map((x) => ({
      id: String(x.id),
      orderNumber: String(x.order_number ?? ''),
      status: String(x.status ?? ''),
      paymentStatus: String(x.payment_status ?? ''),
      paymentMethod: String(x.payment_method ?? ''),
      buyerName: (x.buyer_name as string | null) ?? null,
      sellerName: (x.seller_name as string | null) ?? null,
      location: toLoc(x.location),
      grandTotal: Number(x.grand_total ?? 0),
      placedAt: String(x.placed_at),
    })),
    total: Number(r.total ?? 0),
  };
}
