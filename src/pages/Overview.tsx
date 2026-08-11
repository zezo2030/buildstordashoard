// نظرة عامة — KPIs حيّة + مبيعات 14 يوم + توزيع حالات الطلبات + أفضل البائعين.
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Store, Banknote, Headset, FileSpreadsheet, Users, Package, ShoppingCart, Wallet, ArrowUpLeft,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { fetchDashboardStats } from '../api/stats';
import { Card, KpiCard, PageHeader, Spinner, ErrorState, Money } from '../components/ui';
import { money, fmtDayShort } from '../lib/format';
import { orderStatusLabels, labelOf } from '../lib/labels';

const CHART_COLORS = ['#7c4dff', '#f5851f', '#2f80ed', '#16a34a', '#f2c94c', '#16283f', '#dc2626'];

export default function Overview() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: fetchDashboardStats,
    refetchInterval: 120_000,
  });

  if (isLoading) return <Spinner label="جارٍ تحميل المؤشرات…" />;
  if (error || !data)
    return <ErrorState message={(error as Error)?.message ?? 'تعذر تحميل المؤشرات'} onRetry={() => refetch()} />;

  const pieData = Object.entries(data.orderStatusDist).map(([status, n]) => ({
    name: labelOf(orderStatusLabels, status).label,
    value: n,
  }));

  const pending = [
    { to: '/sellers', label: 'بائع بانتظار التفعيل', count: data.pendingSellers, icon: <Store size={18} /> },
    { to: '/withdrawals', label: 'طلب سحب معلق', count: data.pendingWithdrawals, icon: <Banknote size={18} /> },
    { to: '/support', label: 'تذكرة دعم مفتوحة', count: data.openTickets, icon: <Headset size={18} /> },
    { to: '/catalog/requests', label: 'طلب منتج جديد', count: data.openProductRequests, icon: <FileSpreadsheet size={18} /> },
  ].filter((p) => p.count > 0);

  return (
    <div>
      <PageHeader title="نظرة عامة" subtitle="مؤشرات حيّة من قاعدة البيانات" />

      {pending.length > 0 && (
        <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {pending.map((p) => (
            <Link
              key={p.to}
              to={p.to}
              className="group flex items-center gap-3 rounded-(--radius-card) border border-accent/30 bg-accent-soft/80 px-4 py-3.5 transition-all hover:border-accent hover:bg-accent-soft"
            >
              <span className="grid size-10 place-items-center rounded-xl bg-accent text-white shadow-[0_8px_18px_-10px_rgba(245,133,31,0.9)]">
                {p.icon}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-xl font-bold text-accent tabular-nums">{p.count}</div>
                <div className="truncate text-xs text-primary/80">{p.label}</div>
              </div>
              <ArrowUpLeft size={16} className="shrink-0 text-accent/50 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent" />
            </Link>
          ))}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="مبيعات اليوم"
          value={<Money value={data.ordersToday.total} />}
          hint={`${data.ordersToday.n} طلب`}
          icon={<ShoppingCart size={20} />}
          tone="orange"
        />
        <KpiCard
          title="مبيعات آخر 30 يوم"
          value={<Money value={data.orders30d.total} />}
          hint={`${data.orders30d.n} طلب`}
          icon={<ShoppingCart size={20} />}
          tone="blue"
        />
        <KpiCard
          title="إجمالي المبيعات"
          value={<Money value={data.ordersAll.total} />}
          hint={`عمولة المنصة ${money(data.ordersAll.commission)}`}
          icon={<Wallet size={20} />}
          tone="green"
        />
        <KpiCard
          title="أرصدة المحافظ (التزام)"
          value={<Money value={data.walletLiabilities} />}
          icon={<Wallet size={20} />}
          tone="navy"
        />
        <KpiCard title="المستخدمون" value={data.usersTotal} icon={<Users size={20} />} tone="blue" />
        <KpiCard title="بائعون نشطون" value={data.activeSellers} icon={<Store size={20} />} tone="orange" />
        <KpiCard title="منتجات نشطة" value={data.activeProducts} icon={<Package size={20} />} tone="green" />
        <KpiCard title="إجمالي الطلبات" value={data.ordersAll.n} icon={<ShoppingCart size={20} />} tone="navy" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="overflow-hidden p-5 lg:col-span-2">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="font-bold text-primary">المبيعات — آخر 14 يوم</h2>
              <p className="mt-0.5 text-xs text-subtext">إجمالي يومي بالدينار الكويتي</p>
            </div>
          </div>
          <div className="h-72" dir="ltr">
            <ResponsiveContainer>
              <BarChart data={data.sales14d} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <XAxis dataKey="day" tickFormatter={fmtDayShort} fontSize={11} stroke="#828a89" tickLine={false} axisLine={false} />
                <YAxis fontSize={11} stroke="#828a89" width={70} tickLine={false} axisLine={false} tickFormatter={(v: number) => money(v).replace(' د.ك', '')} />
                <Tooltip
                  cursor={{ fill: 'rgba(22, 40, 63, 0.04)' }}
                  contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontFamily: 'Tajawal' }}
                  formatter={(v) => [money(Number(v)), 'المبيعات']}
                  labelFormatter={(l) => fmtDayShort(String(l))}
                />
                <Bar dataKey="total" fill="#f5851f" radius={[8, 8, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="overflow-hidden p-5">
          <div className="mb-4">
            <h2 className="font-bold text-primary">توزيع حالات الطلبات</h2>
            <p className="mt-0.5 text-xs text-subtext">حسب الحالة الحالية</p>
          </div>
          {pieData.length === 0 ? (
            <div className="grid h-64 place-items-center text-sm text-subtext">لا توجد طلبات بعد</div>
          ) : (
            <div className="h-72" dir="ltr">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={52} outerRadius={82} paddingAngle={2}>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontFamily: 'Tajawal' }} />
                  <Legend wrapperStyle={{ fontSize: 12, fontFamily: 'Tajawal' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      <Card className="mt-4 overflow-hidden">
        <div className="border-b border-line px-5 py-4">
          <h2 className="font-bold text-primary">أفضل البائعين — آخر 30 يوم</h2>
          <p className="mt-0.5 text-xs text-subtext">مرتّبون حسب إجمالي المبيعات</p>
        </div>
        {data.topSellers30d.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-subtext">لا توجد مبيعات خلال الفترة</div>
        ) : (
          <div className="divide-y divide-line">
            {data.topSellers30d.map((s, i) => (
              <Link
                key={s.companyId}
                to={`/companies/${s.companyId}`}
                className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-surface/80"
              >
                <span
                  className={[
                    'grid size-8 place-items-center rounded-lg text-xs font-bold',
                    i === 0 ? 'bg-accent text-white' : i === 1 ? 'bg-primary text-white' : i === 2 ? 'bg-primary/70 text-white' : 'bg-surface text-primary',
                  ].join(' ')}
                >
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-primary">{s.nameAr}</span>
                <span className="shrink-0 text-xs text-subtext">{s.n} طلب</span>
                <span className="shrink-0 text-sm font-semibold text-primary">
                  <Money value={s.total} />
                </span>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
