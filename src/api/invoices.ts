// الفواتير — الصفوف والكروت من نفس دالة الصفوف في الداتابيز.
import { supabase, arError } from '../lib/supabase';
import { toLoc, type Loc } from './location';

export type InvoiceSortKey = 'invoice_number' | 'seller_name' | 'buyer_name' | 'total' | 'issued_at';

export type InvoiceRow = {
  id: string;
  invoiceNumber: string;
  orderId: string | null;
  orderNumber: string | null;
  sellerName: string | null;
  buyerName: string | null;
  location: Loc | null;
  total: number;
  issuedAt: string;
  paymentMethod: string | null;
  /** `paid` أو `pending` — الفاتورة بتتصدر عند تأكيد الطلب، والدفع عند الاستلام بعدها. */
  paymentStatus: string | null;
  orderCancelled: boolean;
};

/**
 * حالة الفاتورة في الفلتر.
 *
 * `unpaid` مش حالة زيادة للزينة: الفاتورة بتتصدر عند **تأكيد** الطلب، والدفع
 * عند الاستلام بيتحصّل بعدها — فلو مافيش تفرقة، الفواتير المستحقة بتتحسب مدفوعة.
 */
export type InvoiceStatusFilter = 'all' | 'paid' | 'unpaid' | 'cancelled';

export const INVOICE_STATUS_FILTERS: { value: InvoiceStatusFilter; label: string }[] = [
  { value: 'all', label: 'كل الحالات' },
  { value: 'paid', label: 'مدفوعة' },
  { value: 'unpaid', label: 'غير مدفوعة' },
  { value: 'cancelled', label: 'ملغية' },
];

export type InvoicesStats = {
  nItems: number;
  nSites: number;
  nOrders: number;
  nBuyers: number;
  nSellers: number;
  nCancelled: number;
  total: number;
  commission: number;
};

export type InvoicesQuery = {
  from: string | null;
  to: string | null;
  search: string;
  seller: string;
  buyer: string;
  sort: InvoiceSortKey;
  dir: 'asc' | 'desc';
  page: number;
  pageSize: number;
  status: InvoiceStatusFilter;
  /** مفتاح `payment_method` زي ما هو في القاعدة، أو `all`. */
  method: string;
};

const num = (v: unknown) => Number(v ?? 0);

export async function fetchInvoices(q: InvoicesQuery): Promise<{ rows: InvoiceRow[]; total: number }> {
  const { data, error } = await supabase.rpc('admin_invoices_list' as never, {
    p_from: q.from || null,
    p_to: q.to || null,
    p_search: q.search.trim() || null,
    p_seller: q.seller.trim() || null,
    p_buyer: q.buyer.trim() || null,
    p_sort: q.sort,
    p_dir: q.dir,
    p_limit: q.pageSize,
    p_offset: q.page * q.pageSize,
    p_status: q.status,
    p_method: q.method,
  } as never);
  if (error) throw new Error(arError(error));
  const r = data as unknown as { rows?: Record<string, unknown>[]; total?: unknown };
  return {
    rows: (r.rows ?? []).map((x) => ({
      id: String(x.id),
      invoiceNumber: String(x.invoice_number ?? ''),
      orderId: (x.order_id as string | null) ?? null,
      orderNumber: (x.order_number as string | null) ?? null,
      sellerName: (x.seller_name as string | null) ?? null,
      buyerName: (x.buyer_name as string | null) ?? null,
      location: toLoc(x.location),
      total: num(x.total),
      issuedAt: String(x.issued_at),
      paymentMethod: (x.payment_method as string | null) ?? null,
      paymentStatus: (x.payment_status as string | null) ?? null,
      orderCancelled: x.order_cancelled === true,
    })),
    total: num(r.total),
  };
}

export async function fetchInvoicesStats(
  from: string | null,
  to: string | null,
  status: InvoiceStatusFilter = 'all',
  method = 'all',
): Promise<InvoicesStats> {
  const { data, error } = await supabase.rpc('admin_invoices_stats' as never, {
    p_from: from || null, p_to: to || null, p_status: status, p_method: method,
  } as never);
  if (error) throw new Error(arError(error));
  const r = data as unknown as Record<string, unknown>;
  return {
    nItems: num(r.n_items),
    nSites: num(r.n_sites),
    nOrders: num(r.n_orders),
    nBuyers: num(r.n_buyers),
    nSellers: num(r.n_sellers),
    nCancelled: num(r.n_cancelled),
    total: num(r.total),
    commission: num(r.commission),
  };
}
