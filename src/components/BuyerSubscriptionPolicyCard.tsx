// سياسة اشتراك المشترين — رقم واحد بيسري على كل الحسابات.
//
// الأرقام دي موجودة في «الإعدادات» من الأول، بس مرتّبة أبجديًا وسط إعدادات
// المنصة كلها — يعني الأدمن الواقف في «المال ‹ مشتري الشركة» عايز يظبط
// الاشتراك مالوش أي دليل إنها موجودة. الكارت ده بيحطّها في مكان السؤال.
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BadgePercent, Pencil } from 'lucide-react';
import {
  fetchBuyerSubscriptionPolicy, saveBuyerSubscriptionPolicy,
} from '../api/subscription-policy';
import { Card, Btn, Field, Input, Money, Spinner, ErrorState } from './ui';
import { Modal } from './Modal';
import { useToast } from './Toast';

export function BuyerSubscriptionPolicyCard() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [feeIndividual, setFeeIndividual] = useState('');
  const [feeCompany, setFeeCompany] = useState('');
  const [periodDays, setPeriodDays] = useState('');
  const [trialDays, setTrialDays] = useState('');

  const q = useQuery({
    queryKey: ['buyer-subscription-policy'],
    queryFn: fetchBuyerSubscriptionPolicy,
  });

  const save = useMutation({
    mutationFn: () => saveBuyerSubscriptionPolicy({ feeIndividual, feeCompany, periodDays, trialDays }),
    onSuccess: () => {
      toast('success', 'اتحفظت السياسة — بتسري على التجديدات الجاية');
      setOpen(false);
      qc.invalidateQueries({ queryKey: ['buyer-subscription-policy'] });
    },
    onError: (e) => toast('error', (e as Error).message),
  });

  if (q.isError) {
    return (
      <Card className="mb-4 p-4">
        <ErrorState
          message={(q.error as Error)?.message ?? 'تعذر تحميل سياسة الاشتراك'}
          onRetry={() => q.refetch()}
        />
      </Card>
    );
  }
  if (q.isLoading || !q.data) return <Card className="mb-4 p-4"><Spinner /></Card>;

  const p = q.data;
  const edit = () => {
    setFeeIndividual(p.feeIndividual);
    setFeeCompany(p.feeCompany);
    setPeriodDays(String(p.periodDays));
    setTrialDays(String(p.trialDays));
    setOpen(true);
  };

  return (
    <>
      <Card className="mb-4 p-5">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-1.5 font-bold">
              <BadgePercent size={16} /> سياسة اشتراك المشترين
            </h2>
            <p className="mt-1 text-sm text-subtext">
              رقم واحد بيسري على كل المشترين — الأفراد والشركات. لحساب بعينه استخدم
              «مدة مجانية» في صفه بالجدول تحت.
            </p>
          </div>
          <Btn variant="ghost" onClick={edit}><Pencil size={15} /> تعديل</Btn>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="اشتراك الفرد" value={<Money value={p.feeIndividual} />}
            hint={`${p.nIndividual} حساب`} />
          <Stat label="اشتراك الشركة" value={<Money value={p.feeCompany} />}
            hint={`${p.nCompany} حساب`} />
          <Stat label="مدة الدورة" value={`${p.periodDays} يوم`}
            hint="كل دفعة بتمدّ المدة دي" />
          <Stat
            label="تجربة مجانية"
            value={p.trialDays > 0 ? `${p.trialDays} يوم` : 'مفيش'}
            hint={p.trialDays > 0 ? 'للحساب الجديد' : 'الحساب الجديد بيدفع من أول يوم'}
          />
        </div>

        <p className="mt-3 text-xs text-subtext">
          مشترك سارٍ: <span className="font-medium text-primary">{p.nActive}</span> ·
          منتهي: <span className="font-medium text-danger">{p.nExpired}</span>
          {' — '}التغيير بيسري على التجديدات الجاية، والمدد الشغّالة دلوقتي ما بتتأثرش.
        </p>
      </Card>

      {open && (
        <Modal title="سياسة اشتراك المشترين" open onClose={() => setOpen(false)}>
          <p className="mb-3 text-sm text-subtext">
            الأرقام دي بتسري على <span className="font-medium text-primary">كل</span> المشترين.
            صفر في قيمة الاشتراك = مجاني للكل.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="اشتراك المشتري الفرد (د.ك)">
              <Input value={feeIndividual} onChange={(e) => setFeeIndividual(e.target.value)} dir="ltr" />
            </Field>
            <Field label="اشتراك المشتري الشركة (د.ك)">
              <Input value={feeCompany} onChange={(e) => setFeeCompany(e.target.value)} dir="ltr" />
            </Field>
            <Field label="مدة الدورة (أيام)">
              <Input value={periodDays} onChange={(e) => setPeriodDays(e.target.value)} dir="ltr" />
            </Field>
            <Field label="التجربة المجانية (أيام)">
              <Input value={trialDays} onChange={(e) => setTrialDays(e.target.value)} dir="ltr" />
            </Field>
          </div>
          <p className="mt-2 text-xs text-subtext">
            التجربة بتتحسب للحساب الجديد وقت إنشائه بس — تغييرها ما بيرجّعش بأثر رجعي
            على الحسابات القديمة.
          </p>
          <div className="mt-3 flex gap-2">
            <Btn onClick={() => save.mutate()} busy={save.isPending}>حفظ</Btn>
            <Btn variant="ghost" onClick={() => setOpen(false)}>إلغاء</Btn>
          </div>
        </Modal>
      )}
    </>
  );
}

function Stat({ label, value, hint }: {
  label: string;
  value: React.ReactNode;
  hint: string;
}) {
  return (
    <div className="rounded-xl bg-surface px-3 py-2.5">
      <div className="text-xs text-subtext">{label}</div>
      <div className="mt-0.5 text-lg font-bold">{value}</div>
      <div className="mt-0.5 text-[11px] text-subtext">{hint}</div>
    </div>
  );
}
