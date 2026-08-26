// نظرة عامة — تنبيهات + 8 مؤشرات + رسم المبيعات + المبيعات حسب التخصص.
// كل قسم بيجيب بياناته لوحده عشان فلتر التاريخ بتاعه مايعملش reload للصفحة كلها.
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { PackagePlus, Banknote, Headset, FileSpreadsheet, Users, Building2, Store, Package, ShoppingCart, Wallet, ArrowUpLeft } from 'lucide-react';
import { fetchOverviewCounts, fetchSalesRange } from '../api/stats';
import { supabase, arError } from '../lib/supabase';
import { KpiCard, PageHeader, Spinner, ErrorState, Money } from '../components/ui';
import { DateRangePicker, todayISO, type DateRange } from '../components/DateRangePicker';
import SalesChartCard from '../components/overview/SalesChartCard';
import SpecialtySalesCard from '../components/overview/SpecialtySalesCard';
import { money } from '../lib/format';

export default function Overview() {
  const [salesRange, setSalesRange] = useState<DateRange>({ from: todayISO(), to: todayISO() });

  const counts = useQuery({
    queryKey: ['overview-counts'],
    queryFn: fetchOverviewCounts,
    refetchInterval: 120_000,
  });

  const sales = useQuery({
    queryKey: ['sales-range', salesRange.from, salesRange.to],
    queryFn: () => fetchSalesRange(salesRange.from, salesRange.to),
  });

  const openSubmissions = useQuery({
    queryKey: ['overview-open-submissions'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('product_submissions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'open');
      if (error) throw new Error(arError(error));
      return count ?? 0;
    },
    refetchInterval: 120_000,
  });

  if (counts.isLoading) return <Spinner label="جارٍ تحميل المؤشرات…" />;
  if (counts.error || !counts.data)
    return (
      <ErrorState
        message={(counts.error as Error)?.message ?? 'تعذر تحميل المؤشرات'}
        onRetry={() => counts.refetch()}
      />
    );

  const d = counts.data;

  const alerts = [
    { to: '/requests/materials?tab=sellers', label: 'اقتراح منتج من بائع', count: openSubmissions.data ?? 0, icon: <PackagePlus size={18} /> },
    { to: '/requests/materials', label: 'طلب مادة من مشترٍ', count: d.openProductRequests, icon: <FileSpreadsheet size={18} /> },
    { to: '/withdrawals', label: 'طلب سحب معلق', count: d.pendingWithdrawals, icon: <Banknote size={18} /> },
    { to: '/support', label: 'تذكرة دعم مفتوحة', count: d.openTickets, icon: <Headset size={18} /> },
  ].filter((a) => a.count > 0);

  return (
    <div>
      <PageHeader title="نظرة عامة" subtitle="مؤشرات حيّة من قاعدة البيانات" />

      {alerts.length > 0 && (
        <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {alerts.map((a) => (
            <Link
              key={a.to}
              to={a.to}
              className="group flex items-center gap-3 rounded-(--radius-card) border border-accent/30 bg-accent-soft/80 px-4 py-3.5 transition-all hover:border-accent hover:bg-accent-soft"
            >
              <span className="grid size-10 place-items-center rounded-xl bg-accent text-white shadow-[0_8px_18px_-10px_rgba(245,133,31,0.9)]">
                {a.icon}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-xl font-bold text-accent tabular-nums">{a.count}</div>
                <div className="truncate text-xs text-primary/80">{a.label}</div>
              </div>
              <ArrowUpLeft size={16} className="shrink-0 text-accent/50 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent" />
            </Link>
          ))}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="مبيعات الفترة"
          value={sales.isLoading ? '…' : <Money value={sales.data?.total ?? 0} />}
          hint={sales.isLoading ? undefined : `${sales.data?.n ?? 0} طلب`}
          icon={<ShoppingCart size={20} />}
          tone="orange"
          footer={<DateRangePicker value={salesRange} onChange={setSalesRange} />}
        />
        <KpiCard
          title="إجمالي المبيعات"
          value={<Money value={d.ordersAll.total} />}
          hint={`${d.ordersAll.n} طلب`}
          icon={<Wallet size={20} />}
          tone="green"
        />
        <KpiCard
          title="عمولة المنصة"
          value={<Money value={d.ordersAll.commission} />}
          hint={`من ${money(d.ordersAll.total)}`}
          icon={<Wallet size={20} />}
          tone="navy"
        />
        <KpiCard
          title="المواد المرفوعة للمنصة"
          value={d.productsTotal}
          hint={`منها ${d.productsActive} نشط`}
          icon={<Package size={20} />}
          tone="blue"
        />
        <KpiCard title="المشترون (أفراد)" value={d.individualBuyers} icon={<Users size={20} />} tone="blue" />
        <KpiCard title="المشترون (شركات)" value={d.companyBuyers} icon={<Building2 size={20} />} tone="navy" />
        <KpiCard title="البائعون" value={d.sellers} icon={<Store size={20} />} tone="orange" />
        <KpiCard title="إجمالي الطلبات" value={d.ordersAll.n} icon={<ShoppingCart size={20} />} tone="green" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <SalesChartCard />
        <SpecialtySalesCard />
      </div>
    </div>
  );
}
