// تعليق حساب أو مؤسسة — السبب إجباري وبيتسجّل مع التاريخ في الداتابيز.
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { suspendAccount, type AccountKind, type AccountRow } from '../../api/accounts';
import { Btn, Field, Textarea } from '../../components/ui';
import { Modal } from '../../components/Modal';
import { useToast } from '../../components/Toast';

export function SuspendDialog({ row, kind, onClose }: {
  row: AccountRow;
  kind: AccountKind;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [reason, setReason] = useState('');

  const m = useMutation({
    mutationFn: () => suspendAccount(kind, row.id, reason),
    onSuccess: () => {
      toast('success', `تم تعليق «${row.name}»`);
      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({ queryKey: ['accounts-stats'] });
      onClose();
    },
    onError: (e) => toast('error', (e as Error).message),
  });

  const warning =
    kind === 'seller'
      ? 'سيتم إيقاف الشركة وكل حسابات موظفيها، وستختفي منتجاتها من التطبيق.'
      : 'سيتم إيقاف الحساب وكل حساباته الفرعية عن الدخول.';

  return (
    <Modal title={`تعليق — ${row.name}`} open onClose={onClose}>
      <div className="space-y-4">
        <p className="rounded-lg bg-red-50 p-3 text-sm text-danger">{warning}</p>

        <Field label="سبب التعليق" hint="إجباري — بيتسجّل مع التاريخ وبيظهر في الجدول">
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="مثال: مخالفة شروط الاستخدام — بلاغات متكررة"
          />
        </Field>

        <div className="flex justify-end gap-2">
          <Btn variant="ghost" onClick={onClose} disabled={m.isPending}>إلغاء</Btn>
          <Btn variant="danger" busy={m.isPending} disabled={!reason.trim()} onClick={() => m.mutate()}>
            تعليق
          </Btn>
        </div>
      </div>
    </Modal>
  );
}
