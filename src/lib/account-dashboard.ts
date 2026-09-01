// لوحة إحصائيات حساب واحد — نفس أرقام رئيسية البائع / تقارير المشتري.
// الداتابيز بترجع JSON بـ snake_case ومبالغ نصًا؛ التحويل هنا عشان الشاشة تتعامل بأرقام.

export const PIE_MAX_SLICES = 5;
export const MINI_ROWS = 3;
export const PIE_COLORS = ['#6E5A6B', '#FF7A00', '#0A2540', '#3771C8', '#E0A800', '#22C55E', '#2BB3A3'];

export type PieSlice = { key: string; label: string; value: number; color: string };

export type AmountRow = {
  id: string;
  name: string;
  note: string;
  imageUrl: string | null;
  qty: number;
  unit: string;
  total: number;
};

export type NamedTotal = { id: string; name: string; total: number };

export type SellerDashboard = {
  totalSales: number;
  ordersCount: number;
  productsSold: number;
  customersCount: number;
  listedItems: number;
  specialties: NamedTotal[];
  customers: { key: string; label: string; total: number }[];
  products: AmountRow[];
  sites: AmountRow[];
};

export type BuyerDashboard = {
  totalPurchases: number;
  ordersCount: number;
  itemsCount: number;
  suppliersCount: number;
  sitesCount: number;
  specialties: NamedTotal[];
  products: AmountRow[];
  suppliers: AmountRow[];
  sites: AmountRow[];
};

const num = (v: unknown) => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

const rec = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};

const rows = (v: unknown): Record<string, unknown>[] =>
  Array.isArray(v) ? v.filter((x): x is Record<string, unknown> => !!x && typeof x === 'object') : [];

/**
 * الصفوف اللي بتتعرض في الكارت المصغّر. الباقي مش بيتقص من الحمولة — مودال
 * «عرض الكل» بيقراه، فالقصّ عرض بس مش تحويل.
 */
export function topRows<T>(rows: T[]): T[] {
  return rows.slice(0, MINI_ROWS);
}

export function toPieSlices(
  items: { key: string; label: string; value: number }[],
  otherLabel: string,
  max = PIE_MAX_SLICES,
): PieSlice[] {
  const ranked = [...items].filter((item) => item.value > 0).sort((a, b) => b.value - a.value);
  const head = ranked.slice(0, max);
  const tail = ranked.slice(max);
  const slices = head.map((item, index) => ({
    ...item,
    color: PIE_COLORS[index % PIE_COLORS.length],
  }));
  if (tail.length > 0) {
    slices.push({
      key: '__other__',
      label: otherLabel,
      value: tail.reduce((sum, item) => sum + item.value, 0),
      color: PIE_COLORS[max % PIE_COLORS.length],
    });
  }
  return slices;
}

function amountRow(r: Record<string, unknown>): AmountRow {
  return {
    id: String(r.id ?? ''),
    name: String(r.name ?? ''),
    note: String(r.note ?? ''),
    imageUrl: typeof r.image_url === 'string' && r.image_url ? r.image_url : null,
    qty: num(r.qty),
    unit: String(r.unit ?? ''),
    total: num(r.total),
  };
}

function namedTotal(r: Record<string, unknown>): NamedTotal {
  return { id: String(r.id ?? ''), name: String(r.name ?? ''), total: num(r.total) };
}

export function parseSellerDashboard(raw: unknown): SellerDashboard {
  const r = rec(raw);
  return {
    totalSales: num(r.total_sales),
    ordersCount: num(r.orders_count),
    productsSold: num(r.products_sold),
    customersCount: num(r.customers_count),
    listedItems: num(r.listed_items),
    specialties: rows(r.specialties).map(namedTotal),
    customers: rows(r.customers).map((c) => ({
      key: String(c.key ?? ''),
      label: String(c.label ?? ''),
      total: num(c.total),
    })),
    products: rows(r.products).map(amountRow),
    sites: rows(r.sites).map(amountRow),
  };
}

export function parseBuyerDashboard(raw: unknown): BuyerDashboard {
  const r = rec(raw);
  return {
    totalPurchases: num(r.total_purchases),
    ordersCount: num(r.orders_count),
    itemsCount: num(r.items_count),
    suppliersCount: num(r.suppliers_count),
    sitesCount: num(r.sites_count),
    specialties: rows(r.specialties).map(namedTotal),
    products: rows(r.products).map(amountRow),
    suppliers: rows(r.suppliers).map(amountRow),
    sites: rows(r.sites).map(amountRow),
  };
}
