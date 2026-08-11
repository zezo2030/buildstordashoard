// مؤشرات لوحة التحكم — محسوبة في الكلاينت من جداول يقرأها الأدمن عبر RLS.
// (توجد نسخة RPC أكفأ في ميجريشن admin_console؛ عند تطبيقها يمكن التحويل إليها.)
import { supabase, arError } from '../lib/supabase';

export type DashboardStats = {
  pendingSellers: number;
  pendingWithdrawals: number;
  openTickets: number;
  openProductRequests: number;
  activeProducts: number;
  activeSellers: number;
  usersTotal: number;
  ordersToday: { n: number; total: number };
  orders30d: { n: number; total: number };
  ordersAll: { n: number; total: number; commission: number };
  orderStatusDist: Record<string, number>;
  walletLiabilities: number;
  sales14d: { day: string; total: number; n: number }[];
  topSellers30d: { companyId: string; nameAr: string; total: number; n: number }[];
};

async function countOf(
  table: string,
  filter?: (q: ReturnType<typeof supabase.from>['select'] extends never ? never : any) => any,
): Promise<number> {
  let q = supabase.from(table as 'profiles').select('*', { count: 'exact', head: true });
  if (filter) q = filter(q);
  const { count, error } = await q;
  if (error) throw new Error(arError(error));
  return count ?? 0;
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const [
    pendingSellers,
    pendingWithdrawals,
    openTickets,
    openProductRequests,
    activeProducts,
    activeSellers,
    usersTotal,
    ordersRes,
    walletsRes,
  ] = await Promise.all([
    countOf('profiles', (q) => q.eq('role', 'seller').eq('status', 'pending')),
    countOf('withdrawal_requests', (q) => q.eq('status', 'pending')),
    countOf('support_tickets', (q) => q.in('status', ['open', 'in_progress'])),
    countOf('product_requests', (q) => q.eq('status', 'open')),
    countOf('products', (q) => q.eq('is_active', true)),
    countOf('companies', (q) => q.eq('type', 'seller').eq('is_active', true)),
    countOf('profiles'),
    // آخر 5000 طلب تكفي حاليًا؛ النسخة الـ RPC تجمع في الداتابيز مباشرة
    supabase
      .from('orders')
      .select('grand_total, commission_amount, status, placed_at, seller_company_id')
      .order('placed_at', { ascending: false })
      .range(0, 4999),
    supabase.from('wallets').select('balance').range(0, 1999),
  ]);

  if (ordersRes.error) throw new Error(arError(ordersRes.error));
  if (walletsRes.error) throw new Error(arError(walletsRes.error));

  const orders = ordersRes.data ?? [];
  const startToday = new Date();
  startToday.setHours(0, 0, 0, 0);
  const start30 = new Date(startToday);
  start30.setDate(start30.getDate() - 30);
  const start14 = new Date(startToday);
  start14.setDate(start14.getDate() - 13);

  const dist: Record<string, number> = {};
  const byDay = new Map<string, { total: number; n: number }>();
  const bySeller = new Map<string, { total: number; n: number }>();
  const agg = { today: { n: 0, total: 0 }, d30: { n: 0, total: 0 }, all: { n: 0, total: 0, commission: 0 } };

  for (const o of orders) {
    dist[o.status] = (dist[o.status] ?? 0) + 1;
    if (o.status === 'cancelled') continue;
    const t = Number(o.grand_total) || 0;
    const placed = new Date(o.placed_at);
    agg.all.n += 1;
    agg.all.total += t;
    agg.all.commission += Number(o.commission_amount) || 0;
    if (placed >= startToday) {
      agg.today.n += 1;
      agg.today.total += t;
    }
    if (placed >= start30) {
      agg.d30.n += 1;
      agg.d30.total += t;
      const s = bySeller.get(o.seller_company_id) ?? { total: 0, n: 0 };
      s.total += t;
      s.n += 1;
      bySeller.set(o.seller_company_id, s);
    }
    if (placed >= start14) {
      const key = placed.toISOString().slice(0, 10);
      const d = byDay.get(key) ?? { total: 0, n: 0 };
      d.total += t;
      d.n += 1;
      byDay.set(key, d);
    }
  }

  // سلسلة 14 يوم كاملة (أيام بدون مبيعات = صفر)
  const sales14d: DashboardStats['sales14d'] = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(start14);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    const v = byDay.get(key) ?? { total: 0, n: 0 };
    sales14d.push({ day: key, total: v.total, n: v.n });
  }

  const topIds = [...bySeller.entries()].sort((a, b) => b[1].total - a[1].total).slice(0, 5);
  let topSellers30d: DashboardStats['topSellers30d'] = [];
  if (topIds.length) {
    const { data: comps } = await supabase
      .from('companies')
      .select('id, name_ar')
      .in('id', topIds.map(([id]) => id));
    const names = new Map((comps ?? []).map((c) => [c.id, c.name_ar]));
    topSellers30d = topIds.map(([id, v]) => ({
      companyId: id,
      nameAr: names.get(id) ?? '—',
      total: v.total,
      n: v.n,
    }));
  }

  return {
    pendingSellers,
    pendingWithdrawals,
    openTickets,
    openProductRequests,
    activeProducts,
    activeSellers,
    usersTotal,
    ordersToday: agg.today,
    orders30d: agg.d30,
    ordersAll: agg.all,
    orderStatusDist: dist,
    walletLiabilities: (walletsRes.data ?? []).reduce((s, w) => s + (Number(w.balance) || 0), 0),
    sales14d,
    topSellers30d,
  };
}
