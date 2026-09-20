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
import { DateRangePicker, type DateRange } from '../components/DateRangePicker';
import { ReturnDetailsModal } from '../components/ReturnDetailsModal';
import { BuyerSubscriptionPolicyCard } from '../components/BuyerSubscriptionPolicyCard';
import { SubscriptionCell } from '../components/SubscriptionCell';
import { fetchSubscribedUntil } from '../api/subscription-policy';
import { BillingCell } from './accounts/BillingCell';
import { statusCell } from './accounts/columns';
import { fmtDate, fmtDateTime, money } from '../lib/format';
import { localPhone } from '../lib/format';
import { downloadCsv } from '../lib/csv';
import { returnStatusLabels, labelOf, isRefundPending, RETURN_STATUS_FILTERS } from '../lib/labels';
import { PlatformBalanceTab } from '../components/PlatformBalanceTab';
import { SellerLedgerTab } from '../components/SellerLedgerTab';

type Tab = 'individual' | 'company_buyer' | 'seller' | 'returns' | 'stats' | 'balance' | 'ledger';

const TABS: { key: Tab; label: string }[] = [
  { key: 'individual', label: '١. المشتري الفردي' },
  { key: 'company_buyer', label: '٢. مشتري الشركة' },
  { key: 'seller', label: '٣. البائع' },
  { key: 'returns', label: '٤. المرتجعات' },
  { key: 'stats', label: '٥. الإحصائيات' },
  { key: 'balance', label: '٦. رصيد المنصة' },
  { key: 'ledger', label: '٧. حساب البائعين' },
];

export default function Finance() {
  const [tab, setTab] = useState<Tab>('individual');
  // الافتراضي «كل الفترات» مش آخر 30 يوم: الأدمن بيفتح الصفحة عشان يشوف
  // الصورة كاملة، والنافذة الضيقة كانت بتخبّي بيانات من غير ما تقول — ولازم
  // يدوس زرار كل مرة عشان يشوف الباقي. الطرفان فاضيين = بدون حد،
  // والـAPI بيحوّلهم null.
  const [range, setRange] = useState<DateRange>({ from: '', to: '' });

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

      {tab === 'ledger' ? (
        <SellerLedgerTab />
      ) : tab === 'balance' ? (
        <PlatformBalanceTab range={range} />
      ) : tab === 'returns' ? (
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

  // اشتراك المشتري مش في `billing_plans` — هو `profiles.subscribed_until`.
  // بنجيبه للصفوف المعروضة بس، فاستعلام واحد مهما كان حجم الجدول.
  const pageIds = (list.data?.rows ?? []).map((r) => r.id);
  const until = useQuery({
    queryKey: ['subscribed-until', pageIds],
    queryFn: () => fetchSubscribedUntil(pageIds),
    enabled: !isSeller && pageIds.length > 0,
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
    // البائع ليه خطة في `billing_plans` (نسبة أو اشتراك بمدة). المشتري لأ —
    // اشتراكه سياسة عامة + تاريخ نهاية على حسابه، فأعمدة الخطة كانت بتطلع
    // فاضية على طول الجدول وتوحي إن مافيش اشتراك أصلًا.
    ...(isSeller ? [
      {
        key: 'plan',
        header: 'نظام الرسوم',
        sortKey: 'commission_rate',
        render: (r: AccountRow) => <BillingCell key={r.id} row={r} kind={kind} />,
      },
      { key: 'from', header: 'من', render: (r: AccountRow) => (r.billingFrom ? fmtDate(r.billingFrom) : '—') },
      { key: 'to', header: 'إلى', render: (r: AccountRow) => (r.billingTo ? fmtDate(r.billingTo) : '—') },
    ] : [
      {
        key: 'subscription',
        header: 'الاشتراك',
        render: (r: AccountRow) => (
          <SubscriptionCell profileId={r.id} until={until.data?.[r.id] ?? null} />
        ),
      },
    ]),
    {
      // العمود كان بيقرا رسوم الاشتراك بس، فالبائع اللي على نسبة كان بيطلع
      // **صفر دايمًا** مهما باع. العمولة رقم محسوب على الطلب و**لسه ما اتحصّلش**
      // فعليًا (مافيش قيد في `platform_fees` ولا خصم من محفظة البائع)، عشان كده
      // بتتعرض متعلّمة «مستحقة» بدل ما تتحسب محصّلة.
      key: 'fees',
      header: 'الرسوم',
      render: (r) => (r.billingKind === 'subscription' ? (
        <div>
          <Money value={r.feesCollected} />
          {r.feesCollected === 0 && (
            <div className="text-xs text-subtext">لسه ما اتحصّلش</div>
          )}
        </div>
      ) : (
        <div>
          <Money value={r.commission} />
          <div className="text-xs text-danger">عمولة مستحقة</div>
        </div>
      )),
    },
    {
      key: 'total',
      header: isSeller ? 'إجمالي المبيعات' : 'إجمالي المشتريات',
      sortKey: 'total',
      render: (r) => <Money value={r.total} />,
    },
    // نفس خلية الحسابات: الموقوف بيبان معاه سبب الوقف — والتعليق التلقائي
    // بيكتب «عدم سداد الاشتراك» فالأدمن يعرف إن السبب رسوم مش مخالفة.
    { key: 'status', header: 'الحالة', sortKey: 'status', render: statusCell },
  ];

  return (
    <div>
      {!isSeller && <BuyerSubscriptionPolicyCard />}
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
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<FinanceReturnRow | null>(null);

  useEffect(() => {
    if (search === debounced) return;
    const t = setTimeout(() => { setDebounced(search); setPage(0); }, 300);
    return () => clearTimeout(t);
  }, [search, debounced]);

  const q = useQuery({
    queryKey: ['finance', 'returns', range.from, range.to, debounced, status, page],
    queryFn: () => fetchFinanceReturns({
      from: range.from, to: range.to, search: debounced, status, page, pageSize: PAGE_SIZE,
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
    { key: 'refund', header: 'مبلغ الفاتورة', render: (r) => <Money value={r.refundAmount} /> },
    {
      key: 'fees',
      header: 'الرسوم المعادة للبائع',
      // المبلغ بيتقيّد ساعة ما البائع يأكد الاستلام. قبل كده الخانة فاضية عن
      // قصد: المنصة ما دفعتش حاجة لسه، وعرض تقدير هنا بيتقري كأنه اتحوّل.
      render: (r) => (r.feesRefunded > 0 ? <Money value={r.feesRefunded} /> : (
        <span className="text-subtext" title="بترجع للبائع لما يأكد استلام البضاعة المرتجعة">—</span>
      )),
    },
    {
      key: 'status',
      header: 'حالة المرتجع',
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
        {/* نفس مفاتيح صفحة المرتجعات: الفلتر على مجموعة الحالة، فـ«مقبول»
            معناها واحد في الشاشتين. والكروت فوق بتتبع الفلتر. */}
        <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }} className="w-60">
          <option value="all">كل الحالات</option>
          {RETURN_STATUS_FILTERS.map(([k, label]) => (
            <option key={k} value={k}>{label}</option>
          ))}
        </Select>
        <span className="text-xs text-subtext">اضغط على أي صف لعرض المواد المرتجعة وتفاصيل السند</span>
        <Btn
          variant="ghost"
          disabled={rows.length === 0}
          onClick={() =>
            downloadCsv(
              `finance-returns-${range.from || 'all'}`,
              ['رقم المرتجع', 'رقم الطلب', 'المشتري', 'البائع', 'عدد المنتجات',
                'مبلغ الفاتورة', 'الرسوم المعادة للبائع', 'الحالة', 'تاريخ التنفيذ'],
              rows.map((r) => [
                r.returnNumber, r.orderNumber ?? '', r.buyerName ?? '', r.sellerName ?? '',
                r.nItems, money(r.refundAmount), money(r.feesRefunded),
                labelOf(returnStatusLabels, r.status).label
                  + (isRefundPending(r.status, r.refundedAt) ? ' — الفلوس لسه ما رجعتش للمشتري' : ''),
                fmtDateTime(r.executedAt),
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
        onRowClick={setSelected}
        emptyTitle="لا توجد مرتجعات في الفترة"
      />
      {selected && (
        <ReturnDetailsModal
          row={{
            id: selected.id,
            returnNumber: selected.returnNumber,
            status: selected.status,
            orderId: selected.orderId,
            orderNumber: selected.orderNumber,
            buyerName: selected.buyerName,
            sellerName: selected.sellerName,
            refundAmount: selected.refundAmount,
            requestedAt: selected.executedAt,
          }}
          onClose={() => setSelected(null)}
        />
      )}
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
          {/* الرسوم كانت رقمين ملمومين: «الرسوم والعمولات» بيجمع كل حاجة،
              و«الاشتراكات» بتخلط اشتراك المشتري باشتراك البائع. دلوقتي كل
              مصدر لوحده، والإجمالي فوقهم — التلاتة بيجمعوا الإجمالي بالظبط. */}
          <KpiCard
            title="٦ · إجمالي الرسوم والعمولات"
            value={m(d?.feesTotal)}
            hint="عمولة البائعين + اشتراكاتهم + اشتراكات المشترين"
            icon={<CircleDollarSign size={20} />}
            tone="green"
          />
          <KpiCard
            title="٧ · عمولة البائعين"
            value={m(d?.commission)}
            hint="نسبة من كل بيعة"
            icon={<CircleDollarSign size={20} />}
            tone="orange"
          />
          <KpiCard
            title="٨ · اشتراكات البائعين"
            value={m(d?.sellerSubscriptions)}
            hint="الاشتراك الثابت"
            icon={<CalendarClock size={20} />}
            tone="navy"
          />
          <KpiCard
            title="٩ · اشتراكات المشترين"
            value={m(d?.subscriptions)}
            hint="فردي + شركة"
            icon={<CalendarClock size={20} />}
            tone="blue"
          />
          <KpiCard title="١٠ · إجمالي الأرباح الفعلية" value={m(d?.grossProfit)} icon={<PiggyBank size={20} />} tone="blue" />
          {/* رصيد المشترين مش دخل — فلوس عملاء في محافظهم يقدروا يشتروا بيها
              في أي وقت. معروض عشان تبقى معروفة، وما بيدخلش في أي مجموع أرباح. */}
          <KpiCard
            title="١١ · رصيد المشترين"
            value={m(d?.buyersBalance)}
            hint="للعرض — فلوس العملاء مش دخل للمنصة"
            icon={<Wallet size={20} />}
            tone="gray"
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-bold text-primary">المرتجعات وصافي الربح</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard title="١٢ · إجمالي عدد المرتجعات" value={n(d?.nReturns)} icon={<Undo2 size={20} />} tone="navy" />
          <KpiCard title="١٣ · إجمالي قيمة المرتجعات" value={m(d?.returnsValue)} icon={<Wallet size={20} />} tone="orange" />
          <KpiCard
            title="١٤ · الرسوم المعادة للبائعين"
            value={m(d?.feesRefunded)}
            hint="اللي اترد فعلًا لما البائع أكد استلام البضاعة — المرتجعات اللي لسه ماشية مش محسوبة هنا"
            icon={<Undo2 size={20} />}
            tone="red"
          />
          <KpiCard
            title="١٥ · صافي الأرباح بعد الاسترداد"
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
            title="١٦ · الحسابات النشطة وغير النشطة"
            value={d ? `${d.accountsActive} / ${d.accountsInactive}` : '…'}
            hint="نشط / غير نشط"
            icon={<Users size={20} />}
            tone="blue"
          />
          <KpiCard title="١٧ · الطلبات المكتملة" value={n(d?.ordersCompleted)} icon={<PackageCheck size={20} />} tone="green" />
          <KpiCard title="١٨ · الطلبات الملغاة" value={n(d?.ordersCancelled)} icon={<XCircle size={20} />} tone="gray" />
          <KpiCard title="١٩ · الطلبات المرتجعة" value={n(d?.ordersReturned)} icon={<Undo2 size={20} />} tone="red" />
        </div>
      </section>
    </div>
  );
}
