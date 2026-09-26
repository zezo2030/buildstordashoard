// كشف حساب البائع — تابين:
//
//   «العمولات مع المنصة»  اللي بين المنصة والبائع بس: العمولة طلب طلب (اتخصمت
//                          من الحصيلة ولا لسه عليه)، العمولة اللي رجعت له في
//                          المرتجعات، الاشتراك، وأي سداد أو خصم من محفظته.
//   «كشف عام — للاطلاع»   كل مبيعاته ومرتجعاته وحركة محفظته، من غير أي فعل.
//
// قيمة المرتجع نفسها مش في كشف العمولات: الرد بين البائع والمشتري، والمنصة
// مش بتدفع للمشتري من فلوسها.
import { useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  fetchCommissionStatement, fetchGeneralStatement, type CommissionLine,
} from '../api/seller-ledger';
import { Money, StatusChip, Spinner, ErrorState } from './ui';
import { Modal } from './Modal';
import { fmtDate, fmtDateTime } from '../lib/format';
import {
  labelOf, paymentMethodLabels, orderStatusLabels, returnStatusLabels, walletTxnLabels,
} from '../lib/labels';

/** الفلوس بتعدّي على المنصة ⇒ العمولة بتتخصم من الحصيلة قبل ما توصل للبائع. */
const ONLINE = new Set(['knet', 'apple_pay', 'credit_card', 'wallet']);

function lineTitle(l: CommissionLine): { title: string; chip?: { label: string; tone: 'green' | 'orange' | 'navy' | 'gray' } } {
  switch (l.kind) {
    case 'commission':
      return l.paymentMethod && ONLINE.has(l.paymentMethod)
        ? { title: `عمولة ${l.orderNumber ?? ''}`, chip: { label: 'اتخصمت من الحصيلة', tone: 'green' } }
        : { title: `عمولة ${l.orderNumber ?? ''}`, chip: { label: 'على البائع', tone: 'orange' } };
    case 'commission_refund':
      return { title: 'عمولة رجعت له بسبب مرتجع' };
    case 'subscription':
      return { title: 'رسوم اشتراك', chip: { label: 'على البائع', tone: 'orange' } };
    case 'settlement':
      if (l.refType === 'wallet') return { title: 'اتخصمت من محفظته', chip: { label: 'تلقائي', tone: 'navy' } };
      if (l.refType === 'payment') return { title: 'سدّد إلكتروني', chip: { label: 'سداد', tone: 'green' } };
      if (l.refType === 'fee') return { title: 'سدّد الاشتراك', chip: { label: 'سداد', tone: 'green' } };
      return { title: 'تحصيل', chip: { label: 'سداد', tone: 'green' } };
    default:
      return { title: 'تسوية' };
  }
}

function CommissionTab({ companyId }: { companyId: string }) {
  const q = useQuery({
    queryKey: ['seller-commission-statement', companyId],
    queryFn: () => fetchCommissionStatement(companyId),
  });
  if (q.isError) return <ErrorState message={(q.error as Error).message} onRetry={() => q.refetch()} />;
  if (!q.data) return <Spinner />;
  const d = q.data;

  const rules = [
    d.afterDays > 0 ? `بعد ${d.afterDays} يوم من أقدم مستحق` : null,
    d.maxDebt > 0 ? `لما المستحق يوصل ${d.maxDebt.toFixed(3)} د.ك` : null,
  ].filter(Boolean);

  return (
    <div>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-lg border border-line p-3">
          <div className="text-xs text-subtext">المستحق عليه للمنصة دلوقتي</div>
          <div className={`mt-1 font-bold ${d.debt > 0 ? 'text-danger' : ''}`}>
            {d.debt > 0 ? <Money value={d.debt} /> : 'مفيش'}
          </div>
          {d.since && d.debt > 0 && (
            <div className="mt-0.5 text-xs text-subtext">أقدم مستحق من {fmtDate(d.since)}</div>
          )}
        </div>
        <div className="rounded-lg border border-line p-3">
          <div className="text-xs text-subtext">في محفظته (فلوسه)</div>
          <div className="mt-1 font-bold text-success"><Money value={d.wallet} /></div>
          <div className="mt-0.5 text-xs text-subtext">أي مستحق جديد بيتخصم منها تلقائي</div>
        </div>
      </div>
      <p className="mt-2 text-xs text-subtext">
        {d.suspended && <StatusChip label="موقوف" tone="red" />}{' '}
        الإيقاف التلقائي: {rules.length ? rules.join(' أو ') : 'مقفول من الإعدادات'}.
      </p>

      <div className="mt-4 divide-y divide-line">
        {d.rows.length === 0 && <p className="py-6 text-center text-sm text-subtext">مفيش حركة عمولات</p>}
        {d.rows.map((l) => {
          const t = lineTitle(l);
          const pm = l.paymentMethod ? labelOf(paymentMethodLabels, l.paymentMethod) : null;
          return (
            <div key={l.id} className="flex flex-wrap items-center gap-3 py-2 text-sm">
              <span className="w-20 shrink-0 text-xs text-subtext">{fmtDate(l.date)}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  {l.orderId ? (
                    <Link to={`/orders/${l.orderId}`} className="font-medium text-primary hover:underline">
                      {t.title}
                    </Link>
                  ) : <span className="font-medium">{t.title}</span>}
                  {pm && <StatusChip label={pm.label} tone={pm.tone} />}
                  {t.chip && <StatusChip label={t.chip.label} tone={t.chip.tone} />}
                </div>
                {l.kind !== 'commission' && l.description && (
                  <div className="truncate text-xs text-subtext">{l.description}</div>
                )}
              </div>
              <span className={`w-24 shrink-0 text-end font-medium ${l.amount < 0 ? 'text-danger' : 'text-success'}`}>
                {l.amount < 0 ? '−' : '+'}<Money value={Math.abs(l.amount)} />
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-subtext">
        السالب = اتحسب على البائع · الموجب = اتسدّد أو رجع له. العمولة على الدفع الإلكتروني بتتقفل
        لوحدها لأن الفلوس عدّت على المنصة؛ اللي على الكاش والآجل بيفضل مستحق لحد ما يسدّد أو يتخصم من محفظته.
      </p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-4 first:mt-0">
      <h3 className="text-sm font-bold text-primary">{title}</h3>
      <div className="mt-1 divide-y divide-line">{children}</div>
    </div>
  );
}

function GeneralTab({ companyId }: { companyId: string }) {
  const q = useQuery({
    queryKey: ['seller-general-statement', companyId],
    queryFn: () => fetchGeneralStatement(companyId),
  });
  if (q.isError) return <ErrorState message={(q.error as Error).message} onRetry={() => q.refetch()} />;
  if (!q.data) return <Spinner />;
  const d = q.data;

  return (
    <div>
      <p className="mb-3 text-xs text-subtext">للاطلاع بس — كل حركة البائع على المنصة.</p>

      <Section title={`المبيعات (${d.sales.length})`}>
        {d.sales.length === 0 && <p className="py-3 text-sm text-subtext">مفيش مبيعات</p>}
        {d.sales.map((s) => {
          const pm = labelOf(paymentMethodLabels, s.paymentMethod);
          const st = labelOf(orderStatusLabels, s.status);
          return (
            <div key={s.orderId} className="flex flex-wrap items-center gap-2 py-2 text-sm">
              <span className="w-20 shrink-0 text-xs text-subtext">{fmtDate(s.date)}</span>
              <Link to={`/orders/${s.orderId}`} className="w-36 shrink-0 font-medium text-primary hover:underline" dir="ltr">
                {s.orderNumber}
              </Link>
              <span className="min-w-0 flex-1 truncate text-xs text-subtext">{s.buyer ?? ''}</span>
              <StatusChip label={pm.label} tone={pm.tone} />
              <StatusChip label={st.label} tone={st.tone} />
              <span className="w-24 shrink-0 text-end"><Money value={s.total} /></span>
              <span className="w-24 shrink-0 text-end text-xs text-subtext">
                عمولة <Money value={s.commission} />
              </span>
            </div>
          );
        })}
      </Section>

      <Section title={`المرتجعات (${d.returns.length})`}>
        {d.returns.length === 0 && <p className="py-3 text-sm text-subtext">مفيش مرتجعات</p>}
        {d.returns.map((r) => {
          const st = labelOf(returnStatusLabels, r.status);
          return (
            <div key={r.returnId} className="flex flex-wrap items-center gap-2 py-2 text-sm">
              <span className="w-20 shrink-0 text-xs text-subtext">{fmtDate(r.date)}</span>
              <span className="w-36 shrink-0 font-medium" dir="ltr">{r.returnNumber}</span>
              <span className="min-w-0 flex-1 text-xs text-subtext" dir="ltr">{r.orderNumber ?? ''}</span>
              <StatusChip label={st.label} tone={st.tone} />
              <span className="w-24 shrink-0 text-end"><Money value={r.refundAmount} /></span>
            </div>
          );
        })}
      </Section>

      <Section title={`حركة المحفظة (${d.wallet.length})`}>
        {d.wallet.length === 0 && <p className="py-3 text-sm text-subtext">مفيش حركة</p>}
        {d.wallet.map((w) => (
          <div key={w.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
            <span className="w-32 shrink-0 text-xs text-subtext">{fmtDateTime(w.date)}</span>
            <StatusChip label={labelOf(walletTxnLabels, w.type).label} tone="navy" />
            <span className="min-w-0 flex-1 truncate text-xs text-subtext">{w.description ?? ''}</span>
            <span className={`w-24 shrink-0 text-end font-medium ${w.amount < 0 ? 'text-danger' : 'text-success'}`}>
              {w.amount < 0 ? '−' : '+'}<Money value={Math.abs(w.amount)} />
            </span>
            <span className="w-24 shrink-0 text-end text-xs text-subtext">
              الرصيد <Money value={w.balanceAfter} />
            </span>
          </div>
        ))}
      </Section>
    </div>
  );
}

export function SellerStatementModal({ companyId, name, onClose }: {
  companyId: string;
  name: string;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<'commission' | 'general'>('commission');
  return (
    <Modal title={`كشف حساب ${name}`} open onClose={onClose} wide>
      <div className="mb-4 flex gap-1 rounded-lg bg-surface p-1 text-sm">
        {([
          ['commission', 'العمولات مع المنصة'],
          ['general', 'كشف عام — للاطلاع'],
        ] as const).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={`flex-1 rounded-md px-3 py-1.5 transition-colors ${
              tab === k ? 'bg-white font-medium text-primary shadow-sm' : 'text-subtext hover:text-primary'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'commission' ? <CommissionTab companyId={companyId} /> : <GeneralTab companyId={companyId} />}
    </Modal>
  );
}
