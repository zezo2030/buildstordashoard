// خطة رسوم الحساب: نسبة من المبيعات أو اشتراك ثابت، ومعاها مدّة سريان الخطة
// — الأدمن كان بيشوف رقم العمولة لوحده من غير تاريخ.
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil } from 'lucide-react';
import {
  setBillingPlan, billingSubjectOf,
  type AccountKind, type AccountRow, type BillingKind, type BillingSubject,
} from '../../api/accounts';
import { Btn, Field, Input, Select } from '../../components/ui';
import { Modal } from '../../components/Modal';
import { useToast } from '../../components/Toast';
import { fmtDate, money } from '../../lib/format';

/** القيم اللي الفورم بيبدأ منها — نفس شكل الخطة النشطة في الداتابيز. */
export type CurrentPlan = {
  kind: BillingKind | null;
  rate: number | null;
  fee: number;
  from: string | null;
  to: string | null;
  cycles: number | null;
};

export const planOf = (row: AccountRow): CurrentPlan => ({
  kind: row.billingKind,
  rate: row.commissionRate,
  fee: row.billingFee,
  from: row.billingFrom,
  to: row.billingTo,
  cycles: row.billingCycles,
});

/** نص مختصر للخطة زي ما بيتعرض في الخلية. */
export function billingSummary(row: AccountRow): string {
  if (row.billingKind === 'subscription') {
    return row.billingFee > 0 ? `اشتراك ${money(row.billingFee)}` : 'اشتراك مجاني';
  }
  if (row.billingKind === 'commission') return `${row.commissionRate ?? 0}%`;
  return row.commissionRate != null ? `${row.commissionRate}%` : '—';
}

/** مدّة سريان الخطة — «بدون مدة محددة» لو الخطة مفتوحة. */
export function billingPeriod(row: AccountRow): string {
  return periodText(row.billingFrom, row.billingTo);
}

export function periodText(from: string | null, to: string | null): string {
  if (!from && !to) return 'بدون مدة محددة';
  return `${from ? fmtDate(from) : '—'} ← ${to ? fmtDate(to) : 'مفتوح'}`;
}

export function BillingCell({ row, kind }: { row: AccountRow; kind: AccountKind }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="inline-flex flex-col items-start gap-0.5 rounded-lg px-2 py-1 text-start hover:bg-surface"
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
      >
        <span className="flex items-center gap-1">
          <span dir="ltr" className="tabular-nums">{billingSummary(row)}</span>
          <Pencil size={12} className="text-subtext" />
        </span>
        <span className="text-[11px] text-subtext">{billingPeriod(row)}</span>
      </button>
      {open && (
        <BillingPlanDialog
          subject={billingSubjectOf(kind)}
          subjectId={row.id}
          name={row.name}
          current={planOf(row)}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

export function BillingPlanDialog({ subject, subjectId, name, current, onClose }: {
  subject: BillingSubject;
  subjectId: string;
  name: string;
  current: CurrentPlan;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  // المشتري مابيدفعش نسبة — اشتراك ثابت بس
  const allowCommission = subject === 'seller';
  const [planKind, setPlanKind] = useState<BillingKind>(
    current.kind ?? (allowCommission ? 'commission' : 'subscription'),
  );
  const [rate, setRate] = useState(String(current.rate ?? 0));
  const [fee, setFee] = useState(String(current.fee ?? 0));
  const [from, setFrom] = useState(current.from ?? '');
  const [to, setTo] = useState(current.to ?? '');
  const [cycles, setCycles] = useState(current.cycles == null ? '' : String(current.cycles));

  const save = useMutation({
    mutationFn: () =>
      setBillingPlan({
        subject,
        subjectId,
        kind: planKind,
        rate: planKind === 'commission' ? Number(rate) : null,
        fee: planKind === 'subscription' ? Number(fee || 0) : null,
        startsOn: from || null,
        endsOn: to || null,
        cycles: cycles.trim() === '' ? null : Number(cycles),
      }),
    onSuccess: () => {
      toast('success', `تم تحديث رسوم «${name}»`);
      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({ queryKey: ['accounts-stats'] });
      qc.invalidateQueries({ queryKey: ['finance'] });
      qc.invalidateQueries({ queryKey: ['billing-plan', subjectId] });
      qc.invalidateQueries({ queryKey: ['company', subjectId] });
      onClose();
    },
    onError: (e) => toast('error', (e as Error).message),
  });

  // Number('') = 0، فحقل فاضي كان هيتبعت كنسبة 0% من غير قصد
  const invalid = planKind === 'commission'
    ? rate.trim() === '' || !Number.isFinite(Number(rate))
    : fee.trim() === '' || !Number.isFinite(Number(fee));

  return (
    <Modal title={`رسوم — ${name}`} open onClose={onClose}>
      <div className="space-y-4">
        <Field
          label="نظام الرسوم"
          hint={allowCommission
            ? 'البائع إما يدفع نسبة من مبيعاته أو اشتراكًا ثابتًا للمدة'
            : 'المشتري يدفع اشتراكًا ثابتًا فقط — صفر يعني حساب مجاني'}
        >
          <Select
            value={planKind}
            onChange={(e) => setPlanKind(e.target.value as BillingKind)}
            disabled={!allowCommission}
          >
            {allowCommission && <option value="commission">نسبة من المبيعات</option>}
            <option value="subscription">اشتراك ثابت</option>
          </Select>
        </Field>

        {planKind === 'commission' ? (
          <Field label="النسبة %">
            <Input dir="ltr" type="number" min={0} max={100} step="0.1" value={rate}
              onChange={(e) => setRate(e.target.value)} />
          </Field>
        ) : (
          <Field label="قيمة الاشتراك (د.ك)" hint="صفر = مجاني">
            <Input dir="ltr" type="number" min={0} step="0.001" value={fee}
              onChange={(e) => setFee(e.target.value)} />
          </Field>
        )}

        <div className="grid grid-cols-3 gap-3">
          <Field label="من تاريخ">
            <Input dir="ltr" type="date" value={from} max={to || undefined}
              onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field label="إلى تاريخ">
            <Input dir="ltr" type="date" value={to} min={from || undefined}
              onChange={(e) => setTo(e.target.value)} />
          </Field>
          {/* رقم توثيقي: بيتخزّن مع الخطة ولا يحرّك تحصيلًا تلقائيًا — التحصيل
              لسه يدوي، فالحقل بيقول الاتفاق كام دورة بس. */}
          <Field label="عدد الدورات" hint="عدد الشهور المتفق عليها — للتوثيق، التحصيل يدوي">
            <Input dir="ltr" type="number" min={1} step="1" value={cycles}
              onChange={(e) => setCycles(e.target.value)} />
          </Field>
        </div>

        <div className="flex justify-end gap-2">
          <Btn variant="ghost" onClick={onClose} disabled={save.isPending}>إلغاء</Btn>
          <Btn variant="accent" busy={save.isPending} disabled={invalid} onClick={() => save.mutate()}>
            حفظ
          </Btn>
        </div>
      </div>
    </Modal>
  );
}
