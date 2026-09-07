// قسم «المال» — إدارة رسوم واشتراكات كل الحسابات، ورسوم المرتجعات المعادة،
// وإحصائيات المنصة المالية.
//
// تابات المشترين والبائع بتقرا من نفس RPC بتاع قسم الحسابات عشان البحث والفرز
// والترقيم يفضلوا مصدر واحد — الفرق هنا إن الأعمدة رسوم مش نشاط.
import { useEffect, useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Users, Building2, Store, Wallet, ShoppingCart, Undo2, Percent, CalendarClock,
  Download, TrendingUp, PiggyBank, CircleDollarSign, PackageCheck, XCircle,
} from 'lucide-react';
import {
  fetchAccounts, billingSubjectOf,
  type AccountKind, type AccountRow, type SortKey,
} from '../api/accounts';
import {
  fetchFinanceReturns, fetchFinanceStats, fetchFinanceSummary, type FinanceReturnRow,
} from '../api/finance';
import {
  PageHeader, KpiCard, Card, Input, Select, Money, ErrorState, Btn, StatusChip,
} from '../components/ui';
import { DataTable, type Column, PAGE_SIZE } from '../components/DataTable';
import { DateRangePicker, todayISO, daysAgoISO, type DateRange } from '../components/DateRangePicker';
import { BillingCell, billingPeriod, billingSummary } from './accounts/BillingCell';
import { fmtDate, fmtDateTime, money } from '../lib/format';
import { localPhone } from '../lib/format';
import { downloadCsv } from '../lib/csv';
import { returnStatusLabels, labelOf } from '../lib/labels';

type Tab = 'individual' | 'company_buyer' | 'seller' | 'returns' | 'stats';

const TABS: { key: Tab; label: string }[] = [
  { key: 'individual', label: '١. المشتري الفردي' },
  { key: 'company_buyer', label: '٢. مشتري الشركة' },
  { key: 'seller', label: '٣. البائع' },
  { key: 'returns', label: '٤. المرتجعات' },
  { key: 'stats', label: '٥. الإحصائيات' },
];

export default function Finance() {
  const [tab, setTab] = useState<Tab>('individual');
  const [range, setRange] = useState<DateRange>({ from: daysAgoISO(30), to: todayISO() });

  return (
    <div>
      <PageHeader
        title="المال"
        subtitle="رسوم واشتراكات المشترين والبائعين، ورسوم المرتجعات، وأرباح المنصة"
        actions={<DateRangePicker value={range} onChange={setRange} presets allowAll />}
      />

      <div className="mb-4 flex w-fit flex-wrap gap-1 rounded-xl bg-white p-1 shadow-sm ring-1 ring-line">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === t.key ? 'bg-primary text-white' : 'text-subtext hover:text-primary'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'returns' ? (
        <ReturnsTab range={range} />
      ) : tab === 'stats' ? (
        <StatsTab range={range} />
      ) : (
        <AccountsTab key={tab} kind={tab} range={range} />
      )}
    </div>
  );
}

// ---------------------------------------------------- تابات الحسابات (1، 2، 3)
function AccountsTab({ kind, range }: { kind: AccountKind; range: DateRange }) {
  const navigate = useNavigate();
  const subject = billingSubjectOf(kind);
  const isSeller = kind === 'seller';

  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [plan, setPlan] = useState<'all' | 'commission' | 'subscription' | 'none'>('all');
  const [status, setStatus] = useState<'all' | 'active' | 'suspended'>('all');
  const [sort, setSort] = useState<SortKey>('created_at');
  const [dir, setDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (search === debounced) return;
    const t = setTimeout(() => { setDebounced(search); setPage(0); }, 300);
    return () => clearTimeout(t);
  }, [search, debounced]);

  const summary = useQuery({
    queryKey: ['finance', 'summary', subject, range.from, range.to],
    queryFn: () => fetchFinanceSummary(subject, range.from, range.to),
  });

  const list = useQuery({
    queryKey: ['finance', 'accounts', kind, range.from, range.to, debounced, status, sort, dir, page],
    queryFn: () => fetchAccounts({
      kind, from: range.from, to: range.to, search: debounced, status, sort, dir,
      page, pageSize: PAGE_SIZE,
    }),
    placeholderData: keepPreviousData,
  });

  // فلتر نظام الرسوم بيتعمل على الصفحة المعروضة — الـRPC مابيفلترش بيه، وده
  // مقصود: الفلتر ده استعراضي بحت والفرز والبحث الحقيقيين في الداتابيز.
  const rows = (list.data?.rows ?? []).filter((r) => {
    if (plan === 'all') return true;
    if (plan === 'none') return r.billingKind === null;
    return r.billingKind === plan;
  });

  function toggleSort(key: string) {
    if (key === sort) setDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSort(key as SortKey); setDir('desc'); }
    setPage(0);
  }

  const s = summary.data;

  const columns: Column<AccountRow>[] = [
    {
      key: 'name',
      header: isSeller ? 'الشركة' : 'الاسم',
      sortKey: 'name',
      render: (r) => (
        <div>
          <div className="break-words font-medium">{r.name}</div>
          <div className="break-all text-xs text-subtext" dir="ltr">{r.email ?? ''}</div>
        </div>
      ),
    },
    { key: 'code', header: 'ID', sortKey: 'account_code', render: (r) => <span dir="ltr">{r.accountCode ?? '—'}</span> },
    { key: 'phone', header: 'رقم الهاتف', sortKey: 'phone', render: (r) => <span dir="ltr">{localPhone(r.phone)}</span> },
    { key: 'subs', header: 'الحسابات النشطة', sortKey: 'sub_accounts', render: (r) => <span dir="ltr">{r.subAccounts}</span> },
    {
      key: 'plan',
      header: isSeller ? 'نظام الرسوم' : 'رسوم الاشتراك',
      sortKey: 'commission_rate',
      render: (r) => <BillingCell key={r.id} row={r} kind={kind} />,
    },
    { key: 'from', header: 'من', render: (r) => (r.billingFrom ? fmtDate(r.billingFrom) : '—') },
    { key: 'to', header: 'إلى', render: (r) => (r.billingTo ? fmtDate(r.billingTo) : '—') },
    { key: 'fees', header: 'الرسوم المحصّلة', render: (r) => <Money value={r.feesCollected} /> },
    {
      key: 'total',
      header: isSeller ? 'إجمالي المبيعات' : 'إجمالي المشتريات',
      sortKey: 'total',
      render: (r) => <Money value={r.total} />,
    },
    {
      key: 'status',
      header: 'الحالة',
      sortKey: 'status',
      render: (r) => <StatusChip label={r.status === 'active' ? 'نشط' : 'موقوف'} tone={r.status === 'active' ? 'green' : 'red'} />,
    },
  ];

  function exportCsv() {
    downloadCsv(
      `finance-${kind}-${range.from || 'all'}`,
      ['الاسم', 'ID', 'الهاتف', 'الحسابات النشطة', 'نظام الرسوم', 'المدة', 'الرسوم المحصّلة',
        isSeller ? 'إجمالي المبيعات' : 'إجمالي المشتريات', 'الحالة'],
      rows.map((r) => [
        r.name, r.accountCode ?? '', localPhone(r.phone), r.subAccounts,
        billingSummary(r), billingPeriod(r), money(r.feesCollected), money(r.total),
        r.status === 'active' ? 'نشط' : 'موقوف',
      ]),
    );
  }

  return (
    <div>
      {summary.isError ? (
        <Card className="mb-4 p-4">
          <ErrorState
            message={(summary.error as Error)?.message ?? 'تعذر تحميل المؤشرات'}
            onRetry={() => summary.refetch()}
          />
        </Card>
      ) : (
        <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            title={isSeller ? 'إجمالي عدد البائعين' : 'إجمالي عدد الحسابات'}
            value={s ? s.accounts : '…'}
            hint={s ? `${s.active} نشط · ${s.suspended} موقوف` : undefined}
            icon={isSeller ? <Store size={20} /> : kind === 'individual' ? <Users size={20} /> : <Building2 size={20} />}
            tone="navy"
          />
          <KpiCard
            title="إجمالي الرسوم المحصّلة منهم"
            value={s ? <Money value={s.fees + (isSeller ? s.commission : 0)} /> : '…'}
            hint={isSeller && s ? `اشتراكات ${money(s.fees)} · عمولة ${money(s.commission)}` : undefined}
            icon={<CircleDollarSign size={20} />}
            tone="green"
          />
          <KpiCard
            title={isSeller ? 'إجمالي المبيعات' : 'إجمالي المشتريات'}
            value={s ? <Money value={s.money} /> : '…'}
            icon={<ShoppingCart size={20} />}
            tone="orange"
          />
          <KpiCard
            title="نظام الرسوم"
            value={s ? `${s.onSubscription} اشتراك` : '…'}
            hint={s ? `${s.onCommission} على نسبة` : undefined}
            icon={<Percent size={20} />}
            tone="blue"
          />
        </div>
      )}

      <Card className="mb-4 flex flex-wrap items-center gap-2 p-3">
        <Input
          placeholder="بحث بالاسم أو ID أو رقم الهاتف…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-72"
        />
        <Select value={plan} onChange={(e) => setPlan(e.target.value as typeof plan)} className="w-40">
          <option value="all">كل أنظمة الرسوم</option>
          {isSeller && <option value="commission">نسبة من المبيعات</option>}
          <option value="subscription">اشتراك ثابت</option>
          <option value="none">بدون خطة</option>
        </Select>
        <Select
          value={status}
          onChange={(e) => { setStatus(e.target.value as typeof status); setPage(0); }}
          className="w-36"
        >
          <option value="all">كل الحالات</option>
          <option value="active">نشط</option>
          <option value="suspended">موقوف</option>
        </Select>
        <Btn variant="ghost" onClick={exportCsv} disabled={rows.length === 0}>
          <Download size={15} /> تصدير
        </Btn>
      </Card>

      <DataTable
        columns={columns}
        rows={rows}
        loading={list.isLoading}
        error={list.error ? (list.error as Error).message : null}
        onRetry={() => list.refetch()}
        page={page}
        hasMore={(page + 1) * PAGE_SIZE < (list.data?.total ?? 0)}
        onPage={setPage}
        sort={sort}
        dir={dir}
        onSort={toggleSort}
        onRowClick={(r) => navigate(isSeller ? `/companies/${r.id}` : `/users/${r.id}`)}
        emptyTitle="لا توجد حسابات"
      />
    </div>
  );
}

// ------------------------------------------------------------- تاب المرتجعات
function ReturnsTab({ range }: { range: DateRange }) {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (search === debounced) return;
    const t = setTimeout(() => { setDebounced(search); setPage(0); }, 300);
    return () => clearTimeout(t);
  }, [search, debounced]);

  const q = useQuery({
    queryKey: ['finance', 'returns', range.from, range.to, debounced, page],
    queryFn: () => fetchFinanceReturns({
      from: range.from, to: range.to, search: debounced, page, pageSize: PAGE_SIZE,
    }),
    placeholderData: keepPreviousData,
  });

  const rows = q.data?.rows ?? [];
  const s = q.data?.summary;

  const columns: Column<FinanceReturnRow>[] = [
    {
      key: 'number',
      header: 'رقم المرتجع',
      render: (r) => (
        <div className="flex flex-col gap-0.5">
          <span dir="ltr" className="font-medium">{r.returnNumber}</span>
          {r.orderNumber && <span dir="ltr" className="text-xs text-subtext">{r.orderNumber}</span>}
        </div>
      ),
    },
    { key: 'buyer', header: 'اسم المشتري', render: (r) => r.buyerName ?? '—' },
    { key: 'seller', header: 'اسم البائع', render: (r) => r.sellerName ?? '—' },
    { key: 'items', header: 'عدد المنتجات المرتجعة', render: (r) => <span dir="ltr">{r.nItems}</span> },
    { key: 'refund', header: 'قيمة الرسوم المستردة', render: (r) => <Money value={r.refundAmount} /> },
    {
      key: 'fees',
      header: 'الرسوم المعادة للبائع',
      render: (r) => (r.feesRefunded > 0 ? <Money value={r.feesRefunded} /> : '—'),
    },
    {
      key: 'status',
      header: 'حالة المرتجع',
      render: (r) => {
        const l = labelOf(returnStatusLabels, r.status);
        return <StatusChip label={l.label} tone={l.tone} />;
      },
    },
    { key: 'at', header: 'تاريخ التنفيذ', render: (r) => <span className="text-xs">{fmtDateTime(r.executedAt)}</span> },
  ];

  return (
    <div>
      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard title="إجمالي عدد عمليات المرتجعات" value={s ? s.nReturns : '…'}
          icon={<Undo2 size={20} />} tone="navy" />
        <KpiCard title="إجمالي قيمة المنتجات المرتجعة" value={s ? <Money value={s.refund} /> : '…'}
          icon={<Wallet size={20} />} tone="orange" />
        <KpiCard title="إجمالي الرسوم المعادة للبائعين" value={s ? <Money value={s.fees} /> : '…'}
          icon={<PiggyBank size={20} />} tone="green" />
      </div>

      <Card className="mb-4 flex flex-wrap items-center gap-2 p-3">
        <Input
          placeholder="رقم المرتجع / رقم الطلب / المشتري / البائع…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-72"
        />
        <Btn
          variant="ghost"
          disabled={rows.length === 0}
          onClick={() =>
            downloadCsv(
              `finance-returns-${range.from || 'all'}`,
              ['رقم المرتجع', 'رقم الطلب', 'المشتري', 'البائع', 'عدد المنتجات',
                'قيمة المرتجع', 'الرسوم المعادة', 'الحالة', 'تاريخ التنفيذ'],
              rows.map((r) => [
                r.returnNumber, r.orderNumber ?? '', r.buyerName ?? '', r.sellerName ?? '',
                r.nItems, money(r.refundAmount), money(r.feesRefunded),
                labelOf(returnStatusLabels, r.status).label, fmtDateTime(r.executedAt),
              ]),
            )
          }
        >
          <Download size={15} /> تصدير
        </Btn>
      </Card>

      <DataTable
        columns={columns}
        rows={rows}
        loading={q.isLoading}
        error={q.error ? (q.error as Error).message : null}
        onRetry={() => q.refetch()}
        page={page}
        hasMore={(page + 1) * PAGE_SIZE < (q.data?.total ?? 0)}
        onPage={setPage}
        emptyTitle="لا توجد مرتجعات في الفترة"
      />
    </div>
  );
}

// ----------------------------------------------------------- تاب الإحصائيات
function StatsTab({ range }: { range: DateRange }) {
  const q = useQuery({
    queryKey: ['finance', 'stats', range.from, range.to],
    queryFn: () => fetchFinanceStats(range.from, range.to),
  });

  if (q.isError) {
    return (
      <Card className="p-4">
        <ErrorState message={(q.error as Error).message} onRetry={() => q.refetch()} />
      </Card>
    );
  }

  const d = q.data;
  const n = (v: number | undefined) => (d ? v ?? 0 : '…');
  const m = (v: number | undefined) => (d ? <Money value={v ?? 0} /> : '…');

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-3 text-sm font-bold text-primary">الحسابات وعمليات البيع</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard title="١ · إجمالي عدد المشترين الأفراد" value={n(d?.individualBuyers)} icon={<Users size={20} />} tone="blue" />
          <KpiCard title="٢ · إجمالي عدد مشتري الشركات" value={n(d?.companyBuyers)} icon={<Building2 size={20} />} tone="navy" />
          <KpiCard title="٣ · إجمالي عدد البائعين" value={n(d?.sellers)} icon={<Store size={20} />} tone="orange" />
          <KpiCard title="٤ · إجمالي عدد عمليات البيع" value={n(d?.nSales)} icon={<ShoppingCart size={20} />} tone="green" />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-bold text-primary">دخل المنصة</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard title="٥ · إجمالي قيمة المبيعات" value={m(d?.salesValue)} icon={<TrendingUp size={20} />} tone="orange" />
          <KpiCard title="٦ · إجمالي الرسوم والعمولات" value={m(d?.feesTotal)} icon={<CircleDollarSign size={20} />} tone="green" />
          <KpiCard title="٧ · إجمالي قيمة الاشتراكات" value={m(d?.subscriptions)} icon={<CalendarClock size={20} />} tone="navy" />
          <KpiCard title="٨ · إجمالي الأرباح الفعلية" value={m(d?.grossProfit)} icon={<PiggyBank size={20} />} tone="blue" />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-bold text-primary">المرتجعات وصافي الربح</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard title="٩ · إجمالي عدد المرتجعات" value={n(d?.nReturns)} icon={<Undo2 size={20} />} tone="navy" />
          <KpiCard title="١٠ · إجمالي قيمة المرتجعات" value={m(d?.returnsValue)} icon={<Wallet size={20} />} tone="orange" />
          <KpiCard title="١١ · الرسوم المعادة للبائعين" value={m(d?.feesRefunded)} icon={<Undo2 size={20} />} tone="red" />
          <KpiCard
            title="١٢ · صافي الأرباح بعد الاسترداد"
            value={m(d?.netProfit)}
            hint="الرسوم والعمولات ناقص الرسوم المعادة"
            icon={<PiggyBank size={20} />}
            tone="green"
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-bold text-primary">الحالة العامة</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            title="١٣ · الحسابات النشطة وغير النشطة"
            value={d ? `${d.accountsActive} / ${d.accountsInactive}` : '…'}
            hint="نشط / غير نشط"
            icon={<Users size={20} />}
            tone="blue"
          />
          <KpiCard title="١٤ · الطلبات المكتملة" value={n(d?.ordersCompleted)} icon={<PackageCheck size={20} />} tone="green" />
          <KpiCard title="١٤ · الطلبات الملغاة" value={n(d?.ordersCancelled)} icon={<XCircle size={20} />} tone="gray" />
          <KpiCard title="١٤ · الطلبات المرتجعة" value={n(d?.ordersReturned)} icon={<Undo2 size={20} />} tone="red" />
        </div>
      </section>
    </div>
  );
}
