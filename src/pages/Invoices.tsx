// الفواتير — كروت بفترة + جدول ببحث بائع/مشتري وفلتر تاريخ. المستند مقفول،
// فالصفحة قراءة بس: التصحيح بيكون بإشعار دائن لا بالتعديل.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { Package, MapPin, ShoppingCart, Wallet, Users, Store } from 'lucide-react';
import { fetchInvoices, fetchInvoicesStats, type InvoiceRow, type InvoiceSortKey } from '../api/invoices';
import { PageHeader, KpiCard, Input, Money, Card, ErrorState } from '../components/ui';
import { DataTable, type Column, PAGE_SIZE } from '../components/DataTable';
import { DateRangePicker, todayISO, daysAgoISO, type DateRange } from '../components/DateRangePicker';
import { LocationCell } from '../components/LocationCell';
import { fmtDateTime, qty } from '../lib/format';

type SearchFields = { invoice: string; seller: string; buyer: string };

export default function Invoices() {
  const navigate = useNavigate();
  const [range, setRange] = useState<DateRange>({ from: daysAgoISO(30), to: todayISO() });
  const [search, setSearch] = useState<SearchFields>({ invoice: '', seller: '', buyer: '' });
  const [debounced, setDebounced] = useState<SearchFields>(search);
  const [sort, setSort] = useState<InvoiceSortKey>('issued_at');
  const [dir, setDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);
  const [showCancelled, setShowCancelled] = useState(false);

  useEffect(() => {
    if (
      search.invoice === debounced.invoice
      && search.seller === debounced.seller
      && search.buyer === debounced.buyer
    ) return;
    const t = setTimeout(() => { setDebounced(search); setPage(0); }, 300);
    return () => clearTimeout(t);
  }, [search, debounced]);

  const stats = useQuery({
    queryKey: ['invoices-stats', range.from, range.to, showCancelled],
    queryFn: () => fetchInvoicesStats(range.from, range.to, showCancelled),
  });

  const list = useQuery({
    queryKey: ['invoices', range.from, range.to, debounced, sort, dir, page, showCancelled],
    queryFn: () => fetchInvoices({
      from: range.from,
      to: range.to,
      search: debounced.invoice,
      seller: debounced.seller,
      buyer: debounced.buyer,
      sort,
      dir,
      page,
      pageSize: PAGE_SIZE,
      includeCancelled: showCancelled,
    }),
    placeholderData: keepPreviousData,
  });

  function toggleSort(key: string) {
    if (key === sort) setDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSort(key as InvoiceSortKey); setDir('desc'); }
    setPage(0);
  }

  const s = stats.data;
  const allTime = !range.from && !range.to;

  const columns: Column<InvoiceRow>[] = [
    { key: 'number', header: 'رقم الفاتورة', sortKey: 'invoice_number',
      render: (r) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-medium" dir="ltr">{r.invoiceNumber}</span>
          {r.orderNumber && <span className="text-xs text-subtext" dir="ltr">{r.orderNumber}</span>}
        </div>
      ) },
    { key: 'seller', header: 'البائع', sortKey: 'seller_name', render: (r) => r.sellerName ?? '—' },
    { key: 'buyer', header: 'المشتري', sortKey: 'buyer_name', render: (r) => r.buyerName ?? '—' },
    { key: 'location', header: 'الموقع', render: (r) => <LocationCell loc={r.location} /> },
    { key: 'total', header: 'الإجمالي', sortKey: 'total', render: (r) => <Money value={r.total} /> },
    { key: 'issued', header: 'تاريخ الإصدار', sortKey: 'issued_at',
      render: (r) => <span className="text-xs">{fmtDateTime(r.issuedAt)}</span> },
  ];

  return (
    <div>
      <PageHeader
        title="الفواتير"
        subtitle="الفواتير لقطة مجمّدة عند الشراء — التصحيح يكون بإشعار دائن لا بالتعديل"
      />

      {stats.isError ? (
        <Card className="mb-4 p-4">
          <ErrorState
            message={(stats.error as Error)?.message ?? 'تعذر تحميل المؤشرات'}
            onRetry={() => stats.refetch()}
          />
        </Card>
      ) : (
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard title="إجمالي عدد المواد" value={s ? qty(s.nItems) : '…'}
            icon={<Package size={20} />} tone="blue" />
          <KpiCard title="عدد المواقع" value={s ? s.nSites : '…'}
            icon={<MapPin size={20} />} tone="navy" />
          <KpiCard title="عدد الطلبات" value={s ? s.nOrders : '…'}
            icon={<ShoppingCart size={20} />} tone="navy" />
          <KpiCard title="إجمالي المبيعات" value={s ? <Money value={s.total} /> : '…'}
            hint="بدون فواتير الطلبات الملغية" icon={<ShoppingCart size={20} />} tone="orange" />
          <KpiCard title="عمولة المنصة" value={s ? <Money value={s.commission} /> : '…'}
            icon={<Wallet size={20} />} tone="green" />
          <KpiCard title="عدد المستخدمين" value={s ? s.nBuyers : '…'}
            icon={<Users size={20} />} tone="navy" />
          <KpiCard title="عدد البائعين" value={s ? s.nSellers : '…'}
            icon={<Store size={20} />} tone="orange" />
        </div>
      )}

      <Card className="mb-4 flex flex-wrap items-center gap-2 p-3">
        <Input
          placeholder="رقم الفاتورة / رقم الطلب…"
          value={search.invoice}
          onChange={(e) => setSearch((v) => ({ ...v, invoice: e.target.value }))}
          className="w-52"
        />
        <Input
          placeholder="البائع…"
          value={search.seller}
          onChange={(e) => setSearch((v) => ({ ...v, seller: e.target.value }))}
          className="w-44"
        />
        <Input
          placeholder="المشتري…"
          value={search.buyer}
          onChange={(e) => setSearch((v) => ({ ...v, buyer: e.target.value }))}
          className="w-44"
        />
        <DateRangePicker value={range} onChange={(v) => { setRange(v); setPage(0); }} presets allowAll />
        {/* الطلب الملغي/المرفوض مش بيتعرض هنا افتراضيًا — الفاتورة محفوظة في
            القاعدة لكن مالهاش لازمة في مراجعة الفواتير اليومية. */}
        <label className="flex cursor-pointer items-center gap-2 text-xs text-subtext">
          <input
            type="checkbox"
            className="size-4 accent-accent"
            checked={showCancelled}
            onChange={(e) => { setShowCancelled(e.target.checked); setPage(0); }}
          />
          إظهار فواتير الطلبات الملغية
          {s && s.nCancelled > 0 && !showCancelled && (
            <span className="rounded-full bg-surface px-1.5 py-0.5 tabular-nums">{s.nCancelled}</span>
          )}
        </label>
        <button
          type="button"
          onClick={() => { setRange({ from: '', to: '' }); setPage(0); }}
          className={`h-8 rounded-lg border px-2 text-xs transition-colors ${
            allTime ? 'border-accent bg-accent/10 text-accent' : 'border-line text-subtext hover:text-primary'
          }`}
        >
          كل الفترات
        </button>
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
        onRowClick={(r) => { if (r.orderId) navigate(`/orders/${r.orderId}`); }}
        emptyTitle="لا توجد فواتير"
      />
    </div>
  );
}
