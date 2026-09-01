// لوح إحصائيات حساب واحد — نفس أرقام رئيسية البائع وتقارير المشتري.
//
// الدوال بترجع لحد 50 صف لكل قايمة، والكارت المصغّر بيعرض أول ثلاثة زي
// التصميم؛ الباقي في مودال «عرض الكل». الفلتر الزمني بيتبعت للقاعدة
// (`p_from`/`p_to`) مش بيتطبق هنا — التجميع كله في الداتابيز.
import { useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import {
  ShoppingCart, Wallet, Package, Users, Store, MapPin, Eye,
} from 'lucide-react';
import {
  fetchBuyerCompanyDashboard,
  fetchBuyerDashboard,
  fetchSellerDashboard,
  ALL_TIME,
  type DashboardRange,
} from '../api/account-dashboard';
import {
  PIE_MAX_SLICES,
  toPieSlices,
  topRows,
  type AmountRow,
  type BuyerDashboard,
  type NamedTotal,
  type PieSlice,
  type SellerDashboard,
} from '../lib/account-dashboard';
import { Card, ErrorState, KpiCard, Money, Spinner } from './ui';
import { Modal } from './Modal';
import { DateRangePicker } from './DateRangePicker';
import { money, qty } from '../lib/format';

/**
 * صف قابل للعرض في كارت مصغّر أو في مودال «عرض الكل». `qtyLabel` بتتعرض
 * للمنتجات بس — المواقع والموردين مقياسهم المبلغ نفسه.
 */
type Listed = {
  key: string;
  name: string;
  note: string;
  imageUrl: string | null;
  qtyLabel: string | null;
  total: number;
};

const asListed = (row: AmountRow, withQty = false): Listed => ({
  key: row.id,
  name: row.name,
  note: row.note,
  imageUrl: row.imageUrl,
  qtyLabel: withQty ? `${qty(row.qty)} ${row.unit}`.trim() : null,
  total: row.total,
});

export function SellerStatsPanel({ companyId }: { companyId: string }) {
  const [range, setRange] = useState<DashboardRange>(ALL_TIME);
  const q = useQuery({
    queryKey: ['seller-dashboard', companyId, range.from, range.to],
    queryFn: () => fetchSellerDashboard(companyId, range),
  });
  return (
    <StatsFrame range={range} onRange={setRange} query={q}>
      {(d: SellerDashboard) => <SellerStatsBody d={d} />}
    </StatsFrame>
  );
}

export function BuyerStatsPanel({ profileId }: { profileId: string }) {
  const [range, setRange] = useState<DashboardRange>(ALL_TIME);
  const q = useQuery({
    queryKey: ['buyer-dashboard', profileId, range.from, range.to],
    queryFn: () => fetchBuyerDashboard(profileId, range),
  });
  return (
    <StatsFrame range={range} onRange={setRange} query={q}>
      {(d: BuyerDashboard) => <BuyerStatsBody d={d} />}
    </StatsFrame>
  );
}

/** أرقام شركة المشتري نفسها — من غير مشتريات مالكها الشخصية. */
export function BuyerCompanyStatsPanel({ companyId }: { companyId: string }) {
  const [range, setRange] = useState<DashboardRange>(ALL_TIME);
  const q = useQuery({
    queryKey: ['buyer-company-dashboard', companyId, range.from, range.to],
    queryFn: () => fetchBuyerCompanyDashboard(companyId, range),
  });
  return (
    <StatsFrame range={range} onRange={setRange} query={q}>
      {(d: BuyerDashboard) => <BuyerStatsBody d={d} />}
    </StatsFrame>
  );
}

/** العنوان والفلتر الزمني وحالات التحميل/الخطأ — مشتركة بين اللوحين. */
function StatsFrame<T>({ range, onRange, query, children }: {
  range: DashboardRange;
  onRange: (r: DashboardRange) => void;
  query: { data?: T; isLoading: boolean; isFetching: boolean; error: unknown; refetch: () => void };
  children: (data: T) => ReactNode;
}) {
  const allTime = !range.from && !range.to;
  return (
    <section className="mt-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-bold">
          إحصائيات الحساب
          {query.isFetching && !query.isLoading && <span className="mr-2 text-xs font-normal text-subtext">جارٍ التحديث…</span>}
        </h2>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => onRange(ALL_TIME)}
            className={`h-8 rounded-lg border px-2 text-xs transition-colors ${
              allTime ? 'border-accent bg-accent/10 text-accent' : 'border-line text-subtext hover:text-primary'
            }`}
          >
            كل الفترات
          </button>
          <DateRangePicker value={range} onChange={onRange} presets />
        </div>
      </div>

      {query.isLoading ? (
        <Card className="p-6"><Spinner label="جارٍ تحميل الإحصائيات…" /></Card>
      ) : query.error || !query.data ? (
        <Card className="p-4">
          <ErrorState
            message={(query.error as Error)?.message ?? 'تعذر تحميل الإحصائيات'}
            onRetry={() => query.refetch()}
          />
        </Card>
      ) : (
        children(query.data)
      )}
    </section>
  );
}

function SellerStatsBody({ d }: { d: SellerDashboard }) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard title="إجمالي المبيعات" value={<Money value={d.totalSales} />} icon={<Wallet size={20} />} tone="green" />
        <KpiCard title="عدد الطلبات" value={d.ordersCount} hint="طلب" icon={<ShoppingCart size={20} />} tone="orange" />
        <KpiCard title="المواد المباعة" value={d.productsSold} hint="منتج" icon={<Package size={20} />} tone="blue" />
        <KpiCard title="عدد العملاء" value={d.customersCount} hint="عميل" icon={<Users size={20} />} tone="navy" />
        <KpiCard title="عدد المشاهدات" value="—" hint="لا يوجد مصدر في القاعدة" icon={<Eye size={20} />} tone="gray" />
        <KpiCard title="المواد المعروضة" value={d.listedItems} hint="مادة نشطة" icon={<Package size={20} />} tone="navy" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <PieCard
          title="المبيعات حسب التخصص"
          items={d.specialties.map((s) => ({ key: s.id, label: s.name, value: s.total }))}
        />
        <PieCard
          title="توزيع العملاء حسب المشتريات"
          items={d.customers.map((c) => ({ key: c.key, label: c.label, value: c.total }))}
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <MiniCard
          title="أكثر المنتجات مبيعًا"
          rows={d.products.map((p) => asListed(p, true))}
        />
        <MiniCard
          title="أكثر المواقع شراءً"
          rows={d.sites.map((s) => asListed(s))}
        />
      </div>
    </>
  );
}

function BuyerStatsBody({ d }: { d: BuyerDashboard }) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard title="إجمالي المشتريات" value={<Money value={d.totalPurchases} />} icon={<Wallet size={20} />} tone="green" />
        <KpiCard title="عدد الطلبات" value={d.ordersCount} hint="طلب" icon={<ShoppingCart size={20} />} tone="orange" />
        <KpiCard title="عدد المواد" value={d.itemsCount} hint="بند" icon={<Package size={20} />} tone="blue" />
        <KpiCard title="عدد الموردين" value={d.suppliersCount} hint="بائع" icon={<Store size={20} />} tone="navy" />
        <KpiCard title="عدد المواقع" value={d.sitesCount} hint="موقع" icon={<MapPin size={20} />} tone="orange" />
      </div>
      <PieCard
        title="المشتريات حسب التخصص"
        items={d.specialties.map((s: NamedTotal) => ({ key: s.id, label: s.name, value: s.total }))}
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <MiniCard
          title="أكثر المنتجات شراءً"
          rows={d.products.map((p) => asListed(p, true))}
        />
        <MiniCard
          title="أكثر الموردين"
          rows={d.suppliers.map((s) => asListed(s))}
        />
        <MiniCard
          title="أكثر المواقع شراءً"
          rows={d.sites.map((s) => asListed(s))}
        />
      </div>
    </>
  );
}

/** زرار «عرض الكل» — بيظهر بس لما يكون في صفوف ورا اللي معروض. */
function ShowAll({ total, visible, onClick }: { total: number; visible: number; onClick: () => void }) {
  if (total <= visible) return null;
  return (
    <button type="button" onClick={onClick} className="text-xs text-accent hover:underline">
      عرض الكل ({total})
    </button>
  );
}

function PieCard({ title, items }: {
  title: string;
  items: { key: string; label: string; value: number }[];
}) {
  const [open, setOpen] = useState(false);
  const slices = toPieSlices(items, 'آخرون');
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  const ranked = [...items].filter((item) => item.value > 0).sort((a, b) => b.value - a.value);
  return (
    <Card className="overflow-hidden p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="font-bold">{title}</h3>
        <ShowAll total={ranked.length} visible={Math.min(ranked.length, PIE_MAX_SLICES)} onClick={() => setOpen(true)} />
      </div>
      {total <= 0 ? (
        <p className="py-10 text-center text-sm text-subtext">لا توجد بيانات</p>
      ) : (
        <>
          <div className="h-44" dir="ltr">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={slices} dataKey="value" nameKey="label" innerRadius={42} outerRadius={68} paddingAngle={2}>
                  {slices.map((slice) => (
                    <Cell key={slice.key} fill={slice.color} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontFamily: 'Tajawal' }}
                  formatter={(v) => money(Number(v))}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-2 space-y-1.5">
            {slices.map((slice) => (
              <LegendRow key={slice.key} slice={slice} total={total} />
            ))}
          </ul>
        </>
      )}

      <Modal title={title} open={open} onClose={() => setOpen(false)} wide>
        <ul className="space-y-1.5">
          {ranked.map((item, i) => (
            <LegendRow
              key={item.key}
              slice={{ ...item, color: '#3771C8' }}
              total={total}
              index={i + 1}
            />
          ))}
        </ul>
      </Modal>
    </Card>
  );
}

function LegendRow({ slice, total, index }: { slice: PieSlice; total: number; index?: number }) {
  return (
    <li className="flex items-center gap-2 text-xs text-primary">
      {index ? (
        <span className="w-5 shrink-0 tabular-nums text-subtext">{index}</span>
      ) : (
        <span className="size-2.5 shrink-0 rounded-full" style={{ background: slice.color }} />
      )}
      <span className="min-w-0 flex-1 truncate">{slice.label}</span>
      <span className="shrink-0 tabular-nums" dir="ltr">
        {total > 0 ? ((slice.value / total) * 100).toFixed(1) : '0.0'}%
      </span>
      <span className="shrink-0"><Money value={slice.value} /></span>
    </li>
  );
}

function MiniCard({ title, rows }: { title: string; rows: Listed[] }) {
  const [open, setOpen] = useState(false);
  const shown = topRows(rows);
  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="font-bold">{title}</h3>
        <ShowAll total={rows.length} visible={shown.length} onClick={() => setOpen(true)} />
      </div>
      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-subtext">لا توجد بيانات</p>
      ) : (
        <ListedRows rows={shown} />
      )}

      <Modal title={title} open={open} onClose={() => setOpen(false)} wide>
        <ListedRows rows={rows} />
      </Modal>
    </Card>
  );
}

function ListedRows({ rows }: { rows: Listed[] }) {
  return (
    <ol className="divide-y divide-line">
      {rows.map((row, i) => (
        <li key={row.key} className="flex items-center gap-2 py-2 text-sm">
          <span className="w-5 shrink-0 tabular-nums text-subtext">{i + 1}</span>
          {row.imageUrl ? (
            <img src={row.imageUrl} alt="" className="size-8 shrink-0 rounded-md object-contain ring-1 ring-line" />
          ) : null}
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium">{row.name}</div>
            {row.note ? <div className="truncate text-xs text-subtext">{row.note}</div> : null}
          </div>
          {row.qtyLabel && (
            <span className="shrink-0 text-xs tabular-nums text-[#3771C8]" dir="ltr">{row.qtyLabel}</span>
          )}
          <span className="shrink-0 text-xs"><Money value={row.total} /></span>
        </li>
      ))}
    </ol>
  );
}
