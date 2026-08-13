// الطلبات — فلترة وبحث وفرز من الداتابيز، وعمود موقع التسليم مع رقم المستلم.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { fetchOrders, type OrderRow, type OrderSortKey } from '../api/orders';
import { PageHeader, StatusChip, Select, Input, Money, Card } from '../components/ui';
import { DataTable, type Column, PAGE_SIZE } from '../components/DataTable';
import { DateRangePicker, todayISO, daysAgoISO, type DateRange } from '../components/DateRangePicker';
import { LocationCell } from '../components/LocationCell';
import { fmtDateTime } from '../lib/format';
import { orderStatusLabels, paymentMethodLabels, labelOf } from '../lib/labels';

// «مسترجع» اتشالت من القايمة لأن مكانها تبويب المرتجعات — الطلب المسترجع نفسه
// لسه بيبان تحت «كل الحالات».
const STATUS_OPTIONS = Object.entries(orderStatusLabels).filter(([k]) => k !== 'refunded');

// المحفظة وApple Pay والآجل موجودين في الداتا لكن مش خيارات فلتر — بيبانوا
// تحت «كل الطرق» وعمود الدفع بيوضّح طريقتهم.
const METHOD_OPTIONS: [string, string][] = [
  ['cash_on_delivery', 'كاش عند التوصيل'],
  ['knet', 'كي نت'],
  ['credit_card', 'بطاقة ائتمان'],
];

export default function Orders() {
  const navigate = useNavigate();
  const [range, setRange] = useState<DateRange>({ from: daysAgoISO(30), to: todayISO() });
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [method, setMethod] = useState('all');
  const [sort, setSort] = useState<OrderSortKey>('placed_at');
  const [dir, setDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);

  // بنأجّل مصطلح البحث 300ms عن آخر ضغطة عشان مانبعتش RPC لكل حرف.
  useEffect(() => {
    if (search === debouncedSearch) return;
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(0); }, 300);
    return () => clearTimeout(t);
  }, [search, debouncedSearch]);

  const list = useQuery({
    queryKey: ['orders', range.from, range.to, debouncedSearch, status, method, sort, dir, page],
    queryFn: () => fetchOrders({
      from: range.from, to: range.to, search: debouncedSearch, status, method,
      sort, dir, page, pageSize: PAGE_SIZE,
    }),
    placeholderData: keepPreviousData,
  });

  function toggleSort(key: string) {
    if (key === sort) setDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSort(key as OrderSortKey); setDir('desc'); }
    setPage(0);
  }

  const columns: Column<OrderRow>[] = [
    { key: 'number', header: 'رقم الطلب', sortKey: 'order_number',
      render: (r) => <span className="font-medium" dir="ltr">{r.orderNumber}</span> },
    { key: 'buyer', header: 'المشتري', sortKey: 'buyer_name', render: (r) => r.buyerName ?? '—' },
    { key: 'seller', header: 'البائع', sortKey: 'seller_name', render: (r) => r.sellerName ?? '—' },
    { key: 'location', header: 'الموقع', render: (r) => <LocationCell loc={r.location} /> },
    { key: 'status', header: 'حالة الطلب', sortKey: 'status',
      render: (r) => { const l = labelOf(orderStatusLabels, r.status); return <StatusChip label={l.label} tone={l.tone} />; } },
    // طريقة الدفع بس — حالة الدفع (مدفوع/معلق/مسترد) مكانها صفحة تفاصيل الطلب،
    // عشان عمود الدفع في القايمة يجاوب على سؤال واحد: اتدفع بإيه.
    { key: 'payment', header: 'الدفع',
      render: (r) => labelOf(paymentMethodLabels, r.paymentMethod).label },
    { key: 'total', header: 'الإجمالي', sortKey: 'grand_total', render: (r) => <Money value={r.grandTotal} /> },
    { key: 'placed', header: 'التاريخ', sortKey: 'placed_at',
      render: (r) => <span className="text-xs">{fmtDateTime(r.placedAt)}</span> },
  ];

  return (
    <div>
      <PageHeader title="الطلبات" subtitle="كل طلبات المنصة — بحث برقم الطلب أو اسم المشتري أو البائع" />

      <Card className="mb-4 flex flex-wrap items-center gap-2 p-3">
        <Input
          placeholder="رقم الطلب / المشتري / البائع…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64"
        />
        <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }} className="w-40">
          <option value="all">كل الحالات</option>
          {STATUS_OPTIONS.map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </Select>
        <Select value={method} onChange={(e) => { setMethod(e.target.value); setPage(0); }} className="w-40">
          <option value="all">كل الطرق</option>
          {METHOD_OPTIONS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
        <DateRangePicker value={range} onChange={(v) => { setRange(v); setPage(0); }} />
      </Card>

      <DataTable
        columns={columns}
        rows={list.data?.rows ?? []}
        loading={list.isLoading}
        error={list.error ? (list.error as Error).message : null}
        onRetry={() => list.refetch()}
        page={page}
        hasMore={(page + 1) * PAGE_SIZE < (list.data?.total ?? 0)}
        onPage={setPage}
        sort={sort}
        dir={dir}
        onSort={toggleSort}
        onRowClick={(r) => navigate(`/orders/${r.id}`)}
        emptyTitle="لا توجد طلبات"
      />
    </div>
  );
}
