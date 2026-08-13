// مؤشرات لوحة التحكم — محسوبة في الداتابيز عبر دوال admin_* (ميجريشن admin_overview_v2).
// كل المبالغ بترجع نصًا من الداتابيز وبتتحوّل هنا بـ Number عشان مايحصلش فقدان دقة.
import { supabase, arError } from '../lib/supabase';

export type OverviewCounts = {
  openProductRequests: number;
  pendingWithdrawals: number;
  openTickets: number;
  productsTotal: number;
  productsActive: number;
  individualBuyers: number;
  companyBuyers: number;
  sellers: number;
  ordersAll: { n: number; total: number; commission: number };
};

export type SalesRange = { n: number; total: number; commission: number };

export type SalesSeries = {
  bucket: 'day' | 'month';
  points: { day: string; total: number; n: number }[];
};

export type SpecialtySales = {
  specialtyId: string | null;
  nameAr: string;
  total: number;
  nOrders: number;
};

const num = (v: unknown) => Number(v ?? 0);

async function callRpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn as never, args as never);
  if (error) throw new Error(arError(error));
  return data as T;
}

export async function fetchOverviewCounts(): Promise<OverviewCounts> {
  const r = await callRpc<Record<string, unknown>>('admin_overview_counts', {});
  const all = (r.orders_all ?? {}) as Record<string, unknown>;
  return {
    openProductRequests: num(r.open_product_requests),
    pendingWithdrawals: num(r.pending_withdrawals),
    openTickets: num(r.open_tickets),
    productsTotal: num(r.products_total),
    productsActive: num(r.products_active),
    individualBuyers: num(r.individual_buyers),
    companyBuyers: num(r.company_buyers),
    sellers: num(r.sellers),
    ordersAll: { n: num(all.n), total: num(all.total), commission: num(all.commission) },
  };
}

export async function fetchSalesRange(from: string | null, to: string | null): Promise<SalesRange> {
  const r = await callRpc<Record<string, unknown>>('admin_sales_range', { p_from: from, p_to: to });
  return { n: num(r.n), total: num(r.total), commission: num(r.commission) };
}

export async function fetchSalesSeries(from: string, to: string): Promise<SalesSeries> {
  const r = await callRpc<Record<string, unknown>>('admin_sales_series', { p_from: from, p_to: to });
  const points = (r.points ?? []) as Record<string, unknown>[];
  return {
    bucket: r.bucket === 'month' ? 'month' : 'day',
    points: points.map((p) => ({ day: String(p.day), total: num(p.total), n: num(p.n) })),
  };
}

export async function fetchSalesBySpecialty(
  from: string | null,
  to: string | null,
): Promise<SpecialtySales[]> {
  const rows = await callRpc<Record<string, unknown>[]>('admin_sales_by_specialty', {
    p_from: from,
    p_to: to,
  });
  return (rows ?? []).map((r) => ({
    specialtyId: (r.specialty_id as string | null) ?? null,
    nameAr: String(r.name_ar),
    total: num(r.total),
    nOrders: num(r.n_orders),
  }));
}
