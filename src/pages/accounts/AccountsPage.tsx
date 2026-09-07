// قسم الحسابات — أربع تابات، كروت بفلتر فترة، وجدول بفرز من الداتابيز.
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { NavLink, useNavigate } from 'react-router-dom';
import { Users, Building2, Store, ShoppingCart, Package, Wallet, Plus } from 'lucide-react';
import {
  fetchAccounts, fetchAccountsStats, reactivateAccount,
  type AccountKind, type AccountRow, type SortKey,
} from '../../api/accounts';
import { PageHeader, KpiCard, Input, Select, Money, Card, ErrorState, Btn } from '../../components/ui';
import { DataTable, PAGE_SIZE } from '../../components/DataTable';
import { DateRangePicker, todayISO, daysAgoISO, type DateRange } from '../../components/DateRangePicker';
import { PasswordModal } from '../../components/PasswordModal';
import { useToast } from '../../components/Toast';
import { buildColumns } from './columns';
import { SuspendDialog } from './SuspendDialog';
import { BillingCell } from './BillingCell';
import { DeleteAccountDialog } from './DeleteAccountDialog';
import { PendingSellersStrip } from './PendingSellersStrip';
import { AddSellerModal } from './AddSellerModal';
import { AddBuyerModal } from './AddBuyerModal';

const META: Record<AccountKind, { title: string; subtitle: string; empty: string }> = {
  individual: {
    title: 'مشتري فرد',
    subtitle: 'حسابات المشترين الأفراد — صف لكل حساب رئيسي',
    empty: 'لا يوجد مشترون أفراد',
  },
  company_buyer: {
    title: 'مشتري شركة',
    subtitle: 'مؤسسات الشراء — صف لكل مؤسسة، وموظفوها في «الحسابات النشطة»',
    empty: 'لا توجد مؤسسات شراء',
  },
  seller: {
    title: 'البائعون',
    subtitle: 'الشركات البائعة على المنصة',
    empty: 'لا يوجد بائعون',
  },
};

export default function AccountsPage({ kind }: { kind: AccountKind }) {
  const navigate = useNavigate();
  const [range, setRange] = useState<DateRange>({ from: daysAgoISO(30), to: todayISO() });
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'suspended'>('all');
  const [sort, setSort] = useState<SortKey>('created_at');
  const [dir, setDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);
  const [pwdFor, setPwdFor] = useState<AccountRow | null>(null);
  const [addingSeller, setAddingSeller] = useState(false);
  const [addingBuyer, setAddingBuyer] = useState(false);

  const qc = useQueryClient();
  const { toast } = useToast();
  const [suspendFor, setSuspendFor] = useState<AccountRow | null>(null);
  const [deleteFor, setDeleteFor] = useState<AccountRow | null>(null);

  const reactivate = useMutation({
    mutationFn: (r: AccountRow) => reactivateAccount(kind, r.id),
    onSuccess: (_d, r) => {
      toast('success', `تم إعادة تفعيل «${r.name}»`);
      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({ queryKey: ['accounts-stats'] });
    },
    onError: (e) => toast('error', (e as Error).message),
  });

  const meta = META[kind];

  // نأجّل تحديث مصطلح البحث الفعلي (اللي بيدخل في مفتاح الاستعلام) 300ms عن آخر
  // ضغطة، عشان مانبعتش طلب RPC تجميعي لكل حرف. مربّع الإدخال نفسه فوري ومش متأثر.
  useEffect(() => {
    if (search === debouncedSearch) return;
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 300);
    return () => clearTimeout(t);
  }, [search, debouncedSearch]);

  const stats = useQuery({
    queryKey: ['accounts-stats', kind, range.from, range.to],
    queryFn: () => fetchAccountsStats(kind, range.from, range.to),
  });

  const list = useQuery({
    queryKey: ['accounts', kind, range.from, range.to, debouncedSearch, status, sort, dir, page],
    queryFn: () =>
      fetchAccounts({
        kind, from: range.from, to: range.to, search: debouncedSearch, status, sort, dir,
        page, pageSize: PAGE_SIZE,
      }),
    placeholderData: keepPreviousData,
  });

  function toggleSort(key: string) {
    if (key === sort) {
      setDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSort(key as SortKey);
      setDir('desc');
    }
    setPage(0);
  }

  const columns = buildColumns(kind, {
    // ownerId ممكن يكون null لو الشركة لسه مالهاش عضو "مالك" — الزرار نفسه بيتعطّل
    // في columns.tsx، والشرط هنا حماية إضافية عشان pwdFor ميتخزّنش صف مالوش مودال أصلاً.
    onPassword: (r) => { if (r.ownerId) setPwdFor(r); },
    onSuspend: (r) => setSuspendFor(r),
    onReactivate: (r) => reactivate.mutate(r),
    onDelete: (r) => setDeleteFor(r),
    isReactivating: (r) => reactivate.isPending && reactivate.variables?.id === r.id,
    // key={r.id} إجباري هنا: DataTable بيعمل key={i} على الصفوف (فهرس، مش هوية)،
    // فلو الترتيب اتغيّر (فرز، صفحة جديدة، أو invalidate من تعليق متزامن) نفس
    // الـ instance من CommissionCell بيتعاد استخدامه لصف مختلف تماماً مع الاحتفاظ
    // بالـ state القديم (editing/value) بتاعه. تغيير الـ key بيجبر React يعمل
    // remount كامل للمكوّن، وده بيصفّر editing و value تلقائي بدل ما يفضلوا شايلين
    // قيمة اتكتبت لشركة تانية خالص.
    renderCommission: (r) => <BillingCell key={r.id} row={r} kind={kind} />,
  });

  const s = stats.data;
  const isSeller = kind === 'seller';

  return (
    <div>
      <PageHeader
        title={meta.title}
        subtitle={meta.subtitle}
        actions={
          isSeller ? (
            <Btn variant="accent" onClick={() => setAddingSeller(true)}>
              <Plus size={15} /> إضافة بائع
            </Btn>
          ) : (
            <Btn variant="accent" onClick={() => setAddingBuyer(true)}>
              <Plus size={15} /> {kind === 'individual' ? 'إضافة مشتري فرد' : 'إضافة مشتري شركة'}
            </Btn>
          )
        }
      />

      <div className="mb-4 flex w-fit gap-1 rounded-xl bg-white p-1 shadow-sm ring-1 ring-line">
        <Tab to="/requests/materials" label="طلبات المواد" />
        <Tab to="/accounts/individuals" label="مشتري فرد" />
        <Tab to="/accounts/companies" label="مشتري شركة" />
        <Tab to="/accounts/sellers" label="البائعون" />
      </div>

      {isSeller && <PendingSellersStrip />}

      {stats.isError ? (
        <div className="mb-4">
          <Card className="mb-3 p-4">
            <DateRangePicker value={range} onChange={(v) => { setRange(v); setPage(0); }} />
          </Card>
          <Card className="p-4">
            <ErrorState
              message={(stats.error as Error)?.message ?? 'تعذر تحميل المؤشرات'}
              onRetry={() => stats.refetch()}
            />
          </Card>
        </div>
      ) : (
        <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            title={isSeller ? 'إجمالي البائعين' : 'إجمالي المستخدمين'}
            value={s ? s.total : '…'}
            hint={s ? `${s.active} نشط · ${s.suspended} موقوف` : undefined}
            icon={isSeller ? <Store size={20} /> : kind === 'individual' ? <Users size={20} /> : <Building2 size={20} />}
            tone="navy"
          />
          <KpiCard
            title={isSeller ? 'إجمالي المبيعات' : 'إجمالي المشتريات'}
            value={s ? <Money value={s.money} /> : '…'}
            icon={<ShoppingCart size={20} />}
            tone="orange"
            footer={<DateRangePicker value={range} onChange={(v) => { setRange(v); setPage(0); }} />}
          />
          <KpiCard
            title={isSeller ? 'المواد المرفوعة' : 'إجمالي عدد المواد'}
            value={s ? (isSeller ? s.nProducts : s.nItems) : '…'}
            icon={<Package size={20} />}
            tone="blue"
          />
          <KpiCard
            title={isSeller ? 'عمولة المنصة' : 'إجمالي عدد الطلبات'}
            value={s ? (isSeller ? <Money value={s.commission} /> : s.nOrders) : '…'}
            icon={isSeller ? <Wallet size={20} /> : <ShoppingCart size={20} />}
            tone="green"
          />
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        <Input
          placeholder="بحث بالاسم/البريد/الهاتف/رقم الحساب…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-72"
        />
        <Select
          value={status}
          onChange={(e) => { setStatus(e.target.value as typeof status); setPage(0); }}
          className="w-36"
        >
          <option value="all">كل الحالات</option>
          <option value="active">نشط</option>
          <option value="suspended">موقوف</option>
        </Select>
      </div>

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
        onRowClick={(r) => navigate(isSeller ? `/companies/${r.id}` : `/users/${r.id}`)}
        emptyTitle={meta.empty}
      />

      {pwdFor && pwdFor.ownerId && (
        <PasswordModal
          userId={pwdFor.ownerId}
          name={pwdFor.name}
          email={pwdFor.email}
          onClose={() => setPwdFor(null)}
        />
      )}
      {suspendFor && (
        <SuspendDialog row={suspendFor} kind={kind} onClose={() => setSuspendFor(null)} />
      )}
      {deleteFor && (
        <DeleteAccountDialog row={deleteFor} kind={kind} onClose={() => setDeleteFor(null)} />
      )}
      {addingSeller && <AddSellerModal onClose={() => setAddingSeller(false)} />}
      {addingBuyer && kind !== 'seller' && (
        <AddBuyerModal kind={kind} onClose={() => setAddingBuyer(false)} />
      )}
    </div>
  );
}

function Tab({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
          isActive ? 'bg-primary text-white' : 'text-subtext hover:text-primary'
        }`
      }
    >
      {label}
    </NavLink>
  );
}
