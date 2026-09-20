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
import { DateRangePicker, type DateRange } from '../components/DateRangePicker';
import { LocationCell } from '../components/LocationCell';
import { ReturnDetailsModal } from '../components/ReturnDetailsModal';
import { fmtDateTime } from '../lib/format';
import { returnStatusLabels, labelOf, isRefundPending, RETURN_STATUS_FILTERS } from '../lib/labels';

export default function Returns() {
  // الافتراضي «كل الفترات» مش آخر 30 يوم: الأدمن بيفتح الصفحة عشان يشوف
  // الصورة كاملة، والنافذة الضيقة كانت بتخبّي بيانات من غير ما تقول — ولازم
  // يدوس زرار كل مرة عشان يشوف الباقي. الطرفان فاضيين = بدون حد،
  // والـAPI بيحوّلهم null.
  const [range, setRange] = useState<DateRange>({ from: '', to: '' });
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
    // شريحة «الفلوس لسه ما رجعتش» جنب الحالة: «مقبول» لوحدها بتضم السند اللي
    // اتقبل من دقيقة والسند اللي خلص ورجعت فلوسه، والفرق بينهم فلوس مستحقة
    // للعميل — لازم تبان في نفس الخانة اللي الأدمن بيقرا منها الحالة.
    { key: 'status', header: 'الحالة', sortKey: 'status',
      render: (r) => {
        const l = labelOf(returnStatusLabels, r.status);
        return (
          <div className="flex flex-wrap items-center gap-1">
            <StatusChip label={l.label} tone={l.tone} />
            {isRefundPending(r.status, r.refundedAt) && (
              <span title="البائع وافق على الإرجاع، وقيمة المرتجع بتتقيّد في محفظة المشتري لما البائع يستلم البضاعة">
                <StatusChip label="الفلوس لسه ما رجعتش للمشتري" tone="red" />
              </span>
            )}
          </div>
        );
      } },
    { key: 'refund', header: 'مبلغ الفاتورة', sortKey: 'refund_amount',
      render: (r) => <Money value={r.refundAmount} /> },
    // حركتين مختلفتين على نفس السند: دي للمشتري ودي للبائع. العمولة بترجع
    // ساعة ما البائع يأكد استلام البضاعة، فقبل كده الخانة فاضية — المنصة ما
    // دفعتش حاجة، وعرض تقدير هنا بيتقري كأنه فلوس اتحوّلت.
    { key: 'fee', header: 'الرسوم المعادة للبائع',
      render: (r) => (r.feeRefund > 0
        ? <Money value={r.feeRefund} />
        : <span className="text-subtext" title="بترجع للبائع لما يأكد استلام البضاعة المرتجعة">—</span>) },
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
        <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {/* «إجمالي المسترد» كان بيجمع اللي رجع واللي لسه مستحق في رقم واحد،
              فمبلغ واجب على المنصة كان بيتعدّ كأنه اترد خلاص. الكارتين دول
              بيفصلوهم: التاني هو الفلوس اللي لسه على المنصة للعملاء. */}
          <KpiCard title="المسترد فعليًا" value={s ? <Money value={s.refunded} /> : '…'}
            icon={<Wallet size={20} />} tone="green"
            footer={<DateRangePicker value={range} onChange={(v) => { setRange(v); setPage(0); }} presets allowAll />} />
          <KpiCard title="مستحق للمشترين ولسه ما اتصرفش" value={s ? <Money value={s.pendingRefund} /> : '…'}
            hint={s ? `${s.nPending} سند — البائع وافق والبضاعة لسه ما وصلتوش` : undefined}
            icon={<Wallet size={20} />} tone="red" />
          <KpiCard title="عدد المرتجعات" value={s ? s.nReturns : '…'} icon={<Undo2 size={20} />} tone="navy" />
          <KpiCard title="عدد المواد المرتجعة" value={s ? s.nItems : '…'} icon={<Package size={20} />} tone="blue" />
          {/* الرسوم اللي المنصة رجّعتها للبائع فعلًا — البائع اللي على اشتراك
              ثابت مالوش استرداد لأنه مادفعش عمولة أصلاً. السندات اللي لسه
              جارية مش داخلة: العمولة بترجع ساعة ما البائع يأكد الاستلام. */}
          <KpiCard title="الرسوم المعادة للبائعين" value={s ? <Money value={s.feesRefunded} /> : '…'}
            hint="اللي اترد فعلًا لما البائع أكد الاستلام — على مبلغ الفاتورة بعد الخصم"
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
        <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }} className="w-60">
          <option value="all">كل الحالات</option>
          {RETURN_STATUS_FILTERS.map(([k, label]) => (
            <option key={k} value={k}>{label}</option>
          ))}
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

