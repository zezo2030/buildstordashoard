// أعمدة جداول الحسابات — التلات أنواع بيشاركوا نفس صف البيانات AccountRow،
// والاختلاف في الأعمدة الظاهرة وترتيبها بس.
import type { Column } from '../../components/DataTable';
import { StatusChip, Money } from '../../components/ui';
import { fmtDate, fmtDateTime, localPhone } from '../../lib/format';
import type { AccountKind, AccountRow } from '../../api/accounts';

export type ColumnActions = {
  onPassword: (row: AccountRow) => void;
  onSuspend: (row: AccountRow) => void;
  onReactivate: (row: AccountRow) => void;
  onDelete: (row: AccountRow) => void;
  isReactivating?: (row: AccountRow) => boolean;
  renderCommission?: (row: AccountRow) => React.ReactNode;
};

const n = (v: number) => <span dir="ltr" className="tabular-nums">{v}</span>;

/**
 * الحساب الموقوف لازم يبان معاه سبب الوقف وتاريخه في الخلية نفسها — الشرح كان
 * في `title` بس، يعني مايبانش غير بالوقوف بالماوس فوق الشارة.
 */
function statusCell(r: AccountRow) {
  if (r.status === 'active') return <StatusChip label="نشط" tone="green" />;
  return (
    <div className="flex flex-col items-start gap-0.5">
      <StatusChip label="موقوف" tone="red" />
      {r.suspendReason && (
        <span className="block break-words text-[11px] text-danger">{r.suspendReason}</span>
      )}
      {r.suspendedAt && (
        <span className="block text-[11px] text-subtext">{fmtDateTime(r.suspendedAt)}</span>
      )}
    </div>
  );
}

export function buildColumns(kind: AccountKind, a: ColumnActions): Column<AccountRow>[] {
  const isSeller = kind === 'seller';

  const cols: Column<AccountRow>[] = [
    {
      key: 'name',
      header: isSeller ? 'الشركة' : 'المستخدم',
      sortKey: 'name',
      className: 'w-[16%]',
      render: (r) => (
        <div>
          <div className="break-words font-medium">{r.name}</div>
          <div className="break-all text-xs text-subtext" dir="ltr">
            {isSeller ? (r.ownerName ?? '') : (r.email ?? localPhone(r.phone))}
          </div>
        </div>
      ),
    },
    {
      key: 'code',
      header: 'رقم الحساب',
      sortKey: 'account_code',
      render: (r) => <span dir="ltr">{r.accountCode ?? '—'}</span>,
    },
    {
      key: 'subs',
      header: 'الحسابات النشطة',
      sortKey: 'sub_accounts',
      render: (r) => n(r.subAccounts),
    },
    // كل الحسابات كويتية — الكود الدولي +965 مالوش لازمة ومكبّر العمود
    { key: 'phone', header: 'رقم الهاتف', sortKey: 'phone', render: (r) => <span dir="ltr">{localPhone(r.phone)}</span> },
    { key: 'status', header: 'الحالة', sortKey: 'status', render: statusCell },
    { key: 'created', header: 'تاريخ التسجيل', sortKey: 'created_at', render: (r) => fmtDate(r.createdAt) },
  ];

  if (isSeller) {
    cols.push(
      { key: 'products', header: 'المواد المرفوعة', sortKey: 'n_products', render: (r) => n(r.nProducts) },
      { key: 'orders', header: 'الطلبات الواردة', sortKey: 'n_orders', render: (r) => n(r.nOrders) },
      { key: 'sites', header: 'المواقع', sortKey: 'n_sites', render: (r) => n(r.nSites) },
      { key: 'total', header: 'إجمالي المبيعات', sortKey: 'total', render: (r) => <Money value={r.total} /> },
      { key: 'balance', header: 'الرصيد', sortKey: 'balance', render: (r) => <Money value={r.balance} /> },
      { key: 'partners', header: 'عدد المشترين', sortKey: 'n_partners', render: (r) => n(r.nPartners) },
      {
        key: 'commission',
        header: 'الرسوم',
        sortKey: 'commission_rate',
        render: (r) =>
          a.renderCommission
            ? a.renderCommission(r)
            : <span dir="ltr">{r.commissionRate != null ? `${r.commissionRate}%` : '—'}</span>,
      },
    );
  } else {
    cols.push(
      { key: 'items', header: 'عدد المواد', sortKey: 'n_items', render: (r) => n(r.nItems) },
      { key: 'orders', header: 'عدد الطلبات', sortKey: 'n_orders', render: (r) => n(r.nOrders) },
      { key: 'sites', header: 'المواقع', sortKey: 'n_sites', render: (r) => n(r.nSites) },
      { key: 'partners', header: 'عدد البائعين', sortKey: 'n_partners', render: (r) => n(r.nPartners) },
      { key: 'total', header: 'إجمالي المشتريات', sortKey: 'total', render: (r) => <Money value={r.total} /> },
      { key: 'balance', header: 'الرصيد', sortKey: 'balance', render: (r) => <Money value={r.balance} /> },
      {
        key: 'subscription',
        header: 'الاشتراك',
        render: (r) =>
          a.renderCommission ? a.renderCommission(r) : <span dir="ltr">—</span>,
      },
    );
  }

  cols.push({
    key: 'actions',
    header: 'الإجراءات',
    render: (r) => (
      <div className="flex flex-col items-stretch gap-1" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          disabled={!r.ownerId}
          title={r.ownerId ? undefined : 'لا يوجد حساب مالك لهذه الشركة'}
          className="rounded-md border border-line bg-white px-2 py-1 text-[11px] text-primary hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white"
          onClick={() => a.onPassword(r)}
        >
          كلمة المرور
        </button>
        {r.status === 'active' ? (
          <button
            type="button"
            className="rounded-md border border-line bg-white px-2 py-1 text-[11px] text-danger hover:bg-red-50"
            onClick={() => a.onSuspend(r)}
          >
            تعليق
          </button>
        ) : (
          <button
            type="button"
            disabled={a.isReactivating?.(r)}
            className="rounded-md border border-line bg-white px-2 py-1 text-[11px] text-success hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => a.onReactivate(r)}
          >
            إعادة تفعيل
          </button>
        )}
        <button
          type="button"
          className="rounded-md border border-danger/40 bg-white px-2 py-1 text-[11px] font-medium text-danger hover:bg-red-50"
          onClick={() => a.onDelete(r)}
        >
          حذف
        </button>
      </div>
    ),
  });

  return cols;
}
