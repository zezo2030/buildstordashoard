// خانة «الرسوم» للبائع في قسم المال — الرقم وتفسيره.
//
// الرقم هو **صافي اللي المنصة كسبته من البائع** في الفترة:
//     عمولة مبيعاته − العمولة اللي رجعت له في المرتجعات + الاشتراك المحصّل
//
// والضغطة بتفتح التفسير: العقود بالترتيب (نسبة ← اشتراك ← نسبة…)، والعمولة
// طلب طلب بطريقة الدفع — عشان الأدمن يعرف العمولة دي اتخصمت من فلوس عدّت
// على المنصة، ولا لسه على البائع لأنه قبض كاش أو آجل.
import { useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowUpLeft } from 'lucide-react';
import type { AccountRow } from '../../api/accounts';
import { fetchSellerFeesDetail, type SellerFeePlan } from '../../api/finance';
import { Money, StatusChip, Spinner, ErrorState } from '../../components/ui';
import { Modal } from '../../components/Modal';
import { fmtDate, money } from '../../lib/format';
import { paymentMethodLabels, labelOf } from '../../lib/labels';
import { periodText } from './BillingCell';

/** الفلوس بتعدّي على المنصة ⇒ العمولة بتتخصم قبل ما الحصيلة تتحوّل للبائع. */
const ONLINE = new Set(['knet', 'apple_pay', 'credit_card', 'wallet']);

/** صافي الرسوم — نفس معادلة `admin_seller_fees_detail.net`. */
export function sellerNetFees(r: AccountRow): number {
  return r.commission - r.commissionRefunded + r.feesCollected;
}

function planLabel(p: { kind: 'commission' | 'subscription' | null; rate: number | null; fee: number }) {
  if (p.kind === 'subscription') return `اشتراك ثابت ${money(p.fee)}`;
  if (p.kind === 'commission') return `عمولة ${p.rate ?? 0}%`;
  return 'بدون خطة';
}

export function SellerFeesCell({ row, from, to }: {
  row: AccountRow;
  from: string | null;
  to: string | null;
}) {
  const [open, setOpen] = useState(false);
  const net = sellerNetFees(row);

  return (
    <>
      <button
        type="button"
        className="inline-flex flex-col items-start gap-0.5 rounded-lg px-2 py-1 text-start hover:bg-surface"
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
      >
        <span className="font-medium"><Money value={net} /></span>
        {/* العقد الحالي — لو اشتراك ثابت بيتكتب بقيمته */}
        <span className="text-[11px] text-subtext">
          {planLabel({ kind: row.billingKind, rate: row.commissionRate, fee: row.billingFee })}
        </span>
        {row.commissionRefunded > 0 && (
          <span className="text-[11px] text-subtext">
            بعد خصم مرتجعات <Money value={row.commissionRefunded} />
          </span>
        )}
        <span className="flex items-center gap-0.5 text-[11px] text-accent">
          التفاصيل <ArrowUpLeft size={11} />
        </span>
      </button>
      {open && (
        <SellerFeesDialog
          companyId={row.id}
          name={row.name}
          from={from}
          to={to}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function PlanRow({ p }: { p: SellerFeePlan }) {
  return (
    <div className="flex flex-wrap items-center gap-3 py-2 text-sm">
      <span className="w-40 shrink-0 font-medium">{planLabel(p)}</span>
      <span className="min-w-0 flex-1 text-xs text-subtext">
        {periodText(p.startsOn, p.endsOn)}
        {p.cycles ? ` · ${p.cycles} دورة` : ''}
      </span>
      <span className="text-xs text-subtext">اتسجّل {fmtDate(p.createdAt)}</span>
      {p.isActive ? <StatusChip label="الحالي" tone="green" /> : <StatusChip label="منتهي" tone="gray" />}
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <div className="mt-5">
      <h3 className="text-sm font-bold text-primary">{title}</h3>
      {hint && <p className="mt-0.5 text-xs text-subtext">{hint}</p>}
      <div className="mt-2 divide-y divide-line">{children}</div>
    </div>
  );
}

function SellerFeesDialog({ companyId, name, from, to, onClose }: {
  companyId: string;
  name: string;
  from: string | null;
  to: string | null;
  onClose: () => void;
}) {
  const q = useQuery({
    queryKey: ['seller-fees-detail', companyId, from, to],
    queryFn: () => fetchSellerFeesDetail(companyId, from, to),
  });
  const d = q.data;

  return (
    <Modal title={`رسوم ${name}`} open onClose={onClose} wide>
      {q.isError ? (
        <ErrorState message={(q.error as Error).message} onRetry={() => q.refetch()} />
      ) : !d ? <Spinner /> : (
        <div>
          <p className="text-xs text-subtext">
            {from || to ? `الفترة ${periodText(from, to)}` : 'كل الفترات'} — نفس فترة الجدول.
          </p>

          <div className="mt-3 grid gap-2 sm:grid-cols-4">
            {([
              ['عمولة المبيعات', d.commission, ''],
              ['رجعت في المرتجعات', d.refunded, '−'],
              ['اشتراكات محصّلة', d.subscriptions, '+'],
            ] as const).map(([label, v, sign]) => (
              <div key={label} className="rounded-lg border border-line p-3">
                <div className="text-xs text-subtext">{label}</div>
                <div className="mt-1 font-medium">{sign}<Money value={v} /></div>
              </div>
            ))}
            <div className="rounded-lg border border-accent bg-accent-soft p-3">
              <div className="text-xs text-subtext">الصافي للمنصة</div>
              <div className="mt-1 font-bold text-accent"><Money value={d.net} /></div>
            </div>
          </div>

          {/* الرقم فوق هو اللي المنصة كسبته؛ ده اللي فاضل يتحصّل أو يتحوّل فعلًا */}
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-surface p-3 text-sm">
            <span className="text-subtext">الحساب الجاري دلوقتي:</span>
            {Math.abs(d.balance) < 0.0005 ? (
              <span className="font-medium">مقفول</span>
            ) : d.balance < 0 ? (
              <span className="font-medium text-danger">البائع عليه <Money value={-d.balance} /></span>
            ) : (
              <span className="font-medium text-success">المنصة عليها له <Money value={d.balance} /></span>
            )}
            <span className="text-xs text-subtext">— التحصيل والتحويل من تاب «٧. حساب البائعين»</span>
          </div>

          <Section
            title="العقود"
            hint="كل خطط الرسوم اللي اتعملت للبائع من الأحدث للأقدم — العمولة على كل طلب بتتحسب بالعقد اللي كان ساري وقتها."
          >
            {d.plans.length === 0
              ? <p className="py-3 text-sm text-subtext">مفيش عقود مسجّلة</p>
              : d.plans.map((p, i) => <PlanRow key={`${p.createdAt}-${i}`} p={p} />)}
          </Section>

          <Section
            title={`العمولة على الطلبات (${d.orders.length})`}
            hint="دفع إلكتروني ⇒ الفلوس دخلت المنصة والعمولة اتخصمت من حصيلة البائع. كاش أو آجل ⇒ البائع قبض بنفسه والعمولة عليه لحد ما يسدّدها مع كشف الحساب."
          >
            {d.orders.length === 0 ? (
              <p className="py-3 text-sm text-subtext">مفيش مبيعات في الفترة</p>
            ) : d.orders.map((o) => {
              const pm = labelOf(paymentMethodLabels, o.paymentMethod);
              const online = ONLINE.has(o.paymentMethod);
              return (
                <div key={o.orderId} className="flex flex-wrap items-center gap-3 py-2 text-sm">
                  <span className="w-20 shrink-0 text-xs text-subtext">{fmtDate(o.issuedAt)}</span>
                  <Link to={`/orders/${o.orderId}`} className="w-36 shrink-0 font-medium text-primary hover:underline" dir="ltr">
                    {o.orderNumber}
                  </Link>
                  <StatusChip label={pm.label} tone={pm.tone} />
                  <span className="min-w-0 flex-1 text-xs text-subtext">
                    الطلب <Money value={o.grandTotal} />
                  </span>
                  {o.commission > 0 && (
                    <StatusChip
                      label={online ? 'اتخصمت من الحصيلة' : 'على البائع'}
                      tone={online ? 'green' : 'orange'}
                    />
                  )}
                  <span className="w-24 shrink-0 text-end font-medium"><Money value={o.commission} /></span>
                </div>
              );
            })}
          </Section>

          {d.refunds.length > 0 && (
            <Section
              title={`عمولة رجعت في المرتجعات (${d.refunds.length})`}
              hint="لما المشتري بيرجّع، المنصة بترجّع للبائع عمولة الجزء المرتجع بنفس نسبة الطلب."
            >
              {d.refunds.map((r, i) => (
                <div key={r.returnId ?? i} className="flex flex-wrap items-center gap-3 py-2 text-sm">
                  <span className="w-20 shrink-0 text-xs text-subtext">{fmtDate(r.at)}</span>
                  <span className="w-36 shrink-0 font-medium" dir="ltr">{r.returnNumber ?? '—'}</span>
                  <span className="min-w-0 flex-1 text-xs text-subtext" dir="ltr">
                    {r.orderNumber ? `← ${r.orderNumber}` : ''}
                  </span>
                  <span className="w-24 shrink-0 text-end font-medium text-danger">−<Money value={r.amount} /></span>
                </div>
              ))}
            </Section>
          )}

          {d.subscriptionFees.length > 0 && (
            <Section title={`اشتراكات محصّلة (${d.subscriptionFees.length})`}>
              {d.subscriptionFees.map((s, i) => (
                <div key={`${s.at}-${i}`} className="flex flex-wrap items-center gap-3 py-2 text-sm">
                  <span className="w-20 shrink-0 text-xs text-subtext">{fmtDate(s.at)}</span>
                  <span className="min-w-0 flex-1 text-xs text-subtext">
                    {s.periodStart || s.periodEnd ? periodText(s.periodStart, s.periodEnd) : (s.note ?? '')}
                  </span>
                  <span className="w-24 shrink-0 text-end font-medium text-success">+<Money value={s.amount} /></span>
                </div>
              ))}
            </Section>
          )}
        </div>
      )}
    </Modal>
  );
}
