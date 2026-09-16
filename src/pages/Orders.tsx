// الطلبات — فلترة وبحث وفرز من الداتابيز، وعمود موقع التسليم مع رقم المستلم.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { fetchOrders, type OrderRow, type OrderSortKey } from '../api/orders';
import { PageHeader, StatusChip, Select, Input, Money, Card } from '../components/ui';
import { DataTable, type Column, PAGE_SIZE } from '../components/DataTable';
import { LocationCell } from '../components/LocationCell';
import { fmtDateTime } from '../lib/format';
import { orderStatusLabels, paymentMethodLabels, labelOf } from '../lib/labels';

// الشاشة دي بتعرض الجاري بس، فالفلتر لازم يعرض حالات جارية بس — لو فيها
// «تم التسليم» الأدمن هيختارها ويلاقي القايمة فاضية ومايعرفش ليه. المسلَّم
// مستنده فاتورة، ومكانه قسم الفواتير.
const IN_FLIGHT: string[] = [
  'awaiting_seller_review', 'quoted', 'awaiting_payment',
  'confirmed', 'preparing', 'out_for_delivery',
];
const STATUS_OPTIONS = IN_FLIGHT
  .filter((k) => k in orderStatusLabels)
  .map((k) => [k, orderStatusLabels[k]] as [string, { label: string }]);

/**
 * «ملغي» استثناء في الفلتر ده — مش حالة جارية، بس مالهاش مكان تاني.
 *
 * الطلب اللي اتلغى **قبل التأكيد** عمره ما اتعملّه فاتورة، فهو مش في الفواتير
 * (وهي فواتير حقيقية بس بقرار العميل)، ومش في الجاري كمان. يعني كان بيختفي من
 * اللوحة خالص: وقت كتابة السطر ده **24 طلب بـ8,267.149 د.ك**. اختياره بيحوّل
 * النطاق لـ`archived` عشان الاستعلام يطلّعه.
 */
const CANCELLED = 'cancelled';


export default function Orders() {
  const navigate = useNavigate();
  // مفيش فلتر فترة هنا عن قصد: الشاشة بتعرض الجاري، والجاري مالوش تاريخ
  // انتهاء — الطلب اللي عدّى عليه أسبوع وهو لسه مفتوح هو بالظبط اللي محتاج
  // متابعة. أول ما يتسلّم أو يتلغى بينتقل للفواتير.
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState('all');
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
    queryKey: ['orders', debouncedSearch, status, sort, dir, page],
    queryFn: () => fetchOrders({
      from: null, to: null, search: debouncedSearch, status, method: 'all',
      scope: status === CANCELLED ? 'archived' : 'current',
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
    // شريحة «متأخر التسليم» جنب الحالة مش عمود لوحده: التأخير مش حالة تانية،
    // ده نفس الطلب المؤكَّد وقف عند البائع. الأدمن بيدوّر عليه في نفس الخانة
    // اللي بيقرا منها الحالة، والإشعار بيروح للطرفين مرة واحدة بس — فالشريحة
    // دي هي المتابعة المستمرة لحد ما يتسلّم.
    { key: 'status', header: 'حالة الطلب', sortKey: 'status',
      render: (r) => {
        const l = labelOf(orderStatusLabels, r.status);
        return (
          <div className="flex flex-wrap items-center gap-1">
            <StatusChip label={l.label} tone={l.tone} />
            {r.deliveryOverdue && <StatusChip label="متأخر التسليم" tone="red" />}
          </div>
        );
      } },
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
      <PageHeader
        title="الطلبات"
        subtitle="العمليات الجارية — الطلب اللي اتسلّم مستنده فاتورة، والملغي تحت فلتر «ملغي»"
      />

      <Card className="mb-4 flex flex-wrap items-center gap-2 p-3">
        <Input
          placeholder="رقم الطلب / المشتري / البائع…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64"
        />
        <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }} className="w-44">
          <option value="all">كل الحالات الجارية</option>
          {STATUS_OPTIONS.map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          <option value={CANCELLED}>{labelOf(orderStatusLabels, CANCELLED).label}</option>
        </Select>
        {status === CANCELLED && (
          <span className="text-xs text-subtext">
            الطلبات الملغية — اللي اتلغى قبل التأكيد مالوش فاتورة، فمكانه هنا.
          </span>
        )}
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
