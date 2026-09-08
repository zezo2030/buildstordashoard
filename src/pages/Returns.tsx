// المرتجعات — إشراف على طلبات الإرجاع وقرارات البائعين والمبالغ المستردة،
// بنفس بنية الطلبات والفواتير: كروت بفترة + جدول بفرز وبحث من الداتابيز.
import { useEffect, useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { Undo2, Package, Wallet } from 'lucide-react';
import {
  fetchReturns, fetchReturnsStats,
  type ReturnRow, type ReturnSortKey,
} from '../api/returns';
import {
  PageHeader, KpiCard, StatusChip, Select, Input, Money, Card, ErrorState,
} from '../components/ui';
import { DataTable, type Column, PAGE_SIZE } from '../components/DataTable';
import { DateRangePicker, todayISO, daysAgoISO, type DateRange } from '../components/DateRangePicker';
import { LocationCell } from '../components/LocationCell';
import { ReturnDetailsModal } from '../components/ReturnDetailsModal';
import { fmtDateTime } from '../lib/format';
import { returnStatusLabels, labelOf } from '../lib/labels';

export default function Returns() {
  const [range, setRange] = useState<DateRange>({ from: daysAgoISO(30), to: todayISO() });
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState<ReturnSortKey>('requested_at');
  const [dir, setDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<ReturnRow | null>(null);

  useEffect(() => {
    if (search === debouncedSearch) return;
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(0); }, 300);
    return () => clearTimeout(t);
  }, [search, debouncedSearch]);

  const stats = useQuery({
    queryKey: ['returns-stats', range.from, range.to],
    queryFn: () => fetchReturnsStats(range.from, range.to),
  });

  const list = useQuery({
    queryKey: ['returns', range.from, range.to, debouncedSearch, status, sort, dir, page],
    queryFn: () => fetchReturns({
      from: range.from, to: range.to, search: debouncedSearch, status, sort, dir, page, pageSize: PAGE_SIZE,
    }),
    placeholderData: keepPreviousData,
  });

  function toggleSort(key: string) {
    if (key === sort) setDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSort(key as ReturnSortKey); setDir('desc'); }
    setPage(0);
  }

  const s = stats.data;

  const columns: Column<ReturnRow>[] = [
    { key: 'number', header: 'رقم المرتجع', sortKey: 'return_number',
      render: (r) => (
        <div className="flex flex-col gap-0.5">
          <span dir="ltr" className="font-medium">{r.returnNumber}</span>
          {r.orderNumber && <span dir="ltr" className="text-xs text-subtext">{r.orderNumber}</span>}
        </div>
      ) },
    { key: 'buyer', header: 'المشتري', sortKey: 'buyer_name', render: (r) => r.buyerName ?? '—' },
    { key: 'seller', header: 'البائع', sortKey: 'seller_name', render: (r) => r.sellerName ?? '—' },
    { key: 'location', header: 'الموقع', render: (r) => <LocationCell loc={r.location} /> },
    { key: 'status', header: 'الحالة', sortKey: 'status',
      render: (r) => { const l = labelOf(returnStatusLabels, r.status); return <StatusChip label={l.label} tone={l.tone} />; } },
    { key: 'refund', header: 'المبلغ المسترد', sortKey: 'refund_amount',
      render: (r) => <Money value={r.refundAmount} /> },
    { key: 'at', header: 'التاريخ', sortKey: 'requested_at',
      render: (r) => <span className="text-xs">{fmtDateTime(r.requestedAt)}</span> },
  ];

  return (
    <div>
      <PageHeader title="المرتجعات" subtitle="طلبات الإرجاع وقرارات البائعين والمبالغ المستردة" />

      {stats.isError ? (
        <Card className="mb-4 p-4">
          <ErrorState
            message={(stats.error as Error)?.message ?? 'تعذر تحميل المؤشرات'}
            onRetry={() => stats.refetch()}
          />
        </Card>
      ) : (
        <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard title="إجمالي المسترد" value={s ? <Money value={s.refund} /> : '…'}
            icon={<Wallet size={20} />} tone="orange"
            footer={<DateRangePicker value={range} onChange={(v) => { setRange(v); setPage(0); }} presets allowAll />} />
          <KpiCard title="عدد المرتجعات" value={s ? s.nReturns : '…'} icon={<Undo2 size={20} />} tone="navy" />
          <KpiCard title="عدد المواد المرتجعة" value={s ? s.nItems : '…'} icon={<Package size={20} />} tone="blue" />
          {/* الرسوم اللي المنصة رجّعتها للبائع على المواد المرتجعة — البائع
              اللي على اشتراك ثابت مالوش استرداد لأنه مادفعش عمولة أصلاً. */}
          <KpiCard title="الرسوم المعادة للبائعين" value={s ? <Money value={s.feesRefunded} /> : '…'}
            icon={<Undo2 size={20} />} tone="green" />
        </div>
      )}

      <Card className="mb-4 flex flex-wrap items-center gap-2 p-3">
        <Input
          placeholder="رقم المرتجع / رقم الطلب / المشتري / البائع…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-72"
        />
        <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }} className="w-44">
          <option value="all">كل الحالات</option>
          {Object.entries(returnStatusLabels).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </Select>
        <DateRangePicker value={range} onChange={(v) => { setRange(v); setPage(0); }} presets allowAll />
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
        onRowClick={setSelected}
        emptyTitle="لا توجد مرتجعات"
      />
      {selected && <ReturnDetailsModal row={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

