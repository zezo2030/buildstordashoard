// حالة اشتراك المشتري في صف الجدول + منح مدة مجانية.
//
// المشتري مالوش صف في `billing_plans`، فأعمدة «رسوم الاشتراك / من / إلى»
// كانت بتطلع فاضية على طول الجدول وتوحي إن مافيش اشتراك أصلًا. الخلية دي
// بتقرا من المكان الصح: `profiles.subscribed_until`.
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Gift } from 'lucide-react';
import { grantSubscriptionDays } from '../api/subscription-policy';
import { Btn, Field, Input, StatusChip, Textarea } from './ui';
import { Modal } from './Modal';
import { useToast } from './Toast';
import { fmtDate } from '../lib/format';

export function SubscriptionCell({ profileId, until }: {
  profileId: string;
  until: string | null;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [days, setDays] = useState('30');
  const [note, setNote] = useState('');

  const grant = useMutation({
    mutationFn: () => grantSubscriptionDays(profileId, Number(days), note),
    onSuccess: (newUntil) => {
      toast('success', `اتمددت لحد ${fmtDate(newUntil)}`);
      setOpen(false);
      setNote('');
      qc.invalidateQueries({ queryKey: ['subscribed-until'] });
      qc.invalidateQueries({ queryKey: ['buyer-subscription-policy'] });
    },
    onError: (e) => toast('error', (e as Error).message),
  });

  // المقارنة بالتاريخ المحلي: `subscribed_until` عمود `date` من غير وقت،
  // فتحويله لـ`Date` بيقع على منتصف ليل UTC — واليوم الأخير كان هيبان
  // منتهي قبل ما يخلص فعلًا.
  const today = new Date();
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const active = until !== null && until >= todayIso;
  const daysLeft = until === null ? null : Math.round(
    (Date.parse(`${until}T00:00:00`) - Date.parse(`${todayIso}T00:00:00`)) / 86_400_000,
  );

  return (
    <div className="flex flex-col items-start gap-1">
      {until === null ? (
        <StatusChip label="ما اشتركش" tone="gray" />
      ) : active ? (
        <>
          <StatusChip label={`باقي ${daysLeft} يوم`} tone="green" />
          <span className="text-[11px] text-subtext">حتى {fmtDate(until)}</span>
        </>
      ) : (
        <>
          <StatusChip label={`منتهي من ${Math.abs(daysLeft ?? 0)} يوم`} tone="red" />
          <span className="text-[11px] text-subtext">انتهى {fmtDate(until)}</span>
        </>
      )}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-[11px] text-accent hover:underline"
      >
        <Gift size={12} /> مدة مجانية
      </button>

      {open && (
        <Modal title="منح مدة مجانية" open onClose={() => setOpen(false)}>
          <p className="mb-3 text-sm text-subtext">
            الأيام دي <span className="font-medium text-primary">بتتضاف</span> على المدة
            الحالية مش بتستبدلها
            {until && active ? ` (سارية دلوقتي حتى ${fmtDate(until)})` : ''}. مفيش أي خصم
            فلوس — دي هدية من الإدارة.
          </p>
          <Field label="عدد الأيام">
            <Input value={days} onChange={(e) => setDays(e.target.value)} dir="ltr" />
          </Field>
          <Field label="السبب (اختياري — بيتسجّل في سجل التدقيق)">
            <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <div className="mt-3 flex gap-2">
            <Btn
              onClick={() => grant.mutate()}
              busy={grant.isPending}
              disabled={!/^\d{1,4}$/.test(days.trim()) || Number(days) < 1}
            >
              منح
            </Btn>
            <Btn variant="ghost" onClick={() => setOpen(false)}>إلغاء</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
