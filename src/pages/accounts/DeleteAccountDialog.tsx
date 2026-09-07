// حذف بائع أو مشتري من اللوحة.
//
// الحذف الكامل بيتم بس لما مافيش سجلات مرتبطة (طلبات/فواتير/مرتجعات) — قيود
// RESTRICT في الداتابيز بترفضه غير كده. في الحالة دي الدالة بتعمل «حذف ناعم»:
// الحساب بيتقفل، بيتمنع من الدخول، وبيختفي من قوايم اللوحة، من غير ما نكسر
// طلب أو فاتورة قديمة بتشاور عليه.
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteAccount, type AccountKind, type AccountRow } from '../../api/accounts';
import { Btn, Field, Textarea } from '../../components/ui';
import { Modal } from '../../components/Modal';
import { useToast } from '../../components/Toast';

export function DeleteAccountDialog({ row, kind, onClose }: {
  row: AccountRow;
  kind: AccountKind;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [reason, setReason] = useState('');
  const [confirmText, setConfirmText] = useState('');

  const m = useMutation({
    mutationFn: () => deleteAccount(kind, row.id, reason),
    onSuccess: (mode) => {
      toast(
        'success',
        mode === 'hard'
          ? `تم حذف «${row.name}» نهائيًا`
          : `«${row.name}» عليه سجلات مرتبطة — تم قفله وإخفاؤه بدل الحذف النهائي`,
      );
      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({ queryKey: ['accounts-stats'] });
      qc.invalidateQueries({ queryKey: ['finance'] });
      qc.invalidateQueries({ queryKey: ['nav-badges'] });
      onClose();
    },
    onError: (e) => toast('error', (e as Error).message),
  });

  // كتابة الاسم شرط للحذف — الزرار جنب «تعليق» في نفس العمود، والضغط بالغلط
  // على حاجة مالهاش رجعة لازم يكون صعب.
  const ready = confirmText.trim() === row.name.trim();

  return (
    <Modal title={`حذف ${kind === 'seller' ? 'البائع' : 'المشتري'}`} open onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-primary">
          هتحذف «<span className="font-bold">{row.name}</span>». لو الحساب عليه طلبات أو فواتير
          مش هيتمسح نهائيًا — هيتقفل ويختفي من القوايم والدخول بيتمنع عنه.
        </p>

        <Field label="سبب الحذف (اختياري)">
          <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>

        <Field label="للتأكيد اكتب اسم الحساب" hint={row.name}>
          <Textarea rows={1} value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
        </Field>

        <div className="flex justify-end gap-2">
          <Btn variant="ghost" onClick={onClose} disabled={m.isPending}>إلغاء</Btn>
          <Btn variant="danger" busy={m.isPending} disabled={!ready} onClick={() => m.mutate()}>
            حذف نهائي
          </Btn>
        </div>
      </div>
    </Modal>
  );
}
