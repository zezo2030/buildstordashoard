// عمولة المنصة على البائع — تعديل مباشر من الجدول.
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, X, Pencil } from 'lucide-react';
import { setCommission, type AccountRow } from '../../api/accounts';
import { Input } from '../../components/ui';
import { useToast } from '../../components/Toast';

export function CommissionCell({ row }: { row: AccountRow }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(row.commissionRate ?? 0));

  const m = useMutation({
    mutationFn: () => setCommission(row.id, Number(value)),
    onSuccess: () => {
      toast('success', `تم تحديث عمولة «${row.name}»`);
      setEditing(false);
      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({ queryKey: ['accounts-stats'] });
    },
    onError: (e) => toast('error', (e as Error).message),
  });

  // Number('') بيرجع 0 (رقم صحيح)، فلو سبنا الحقل فاضي وضغطنا حفظ هنبعت عمولة 0%
  // فعلية من غير ما المستخدم يقصد كده أصلاً. type="number" كمان بيرجع '' لأي
  // إدخال مش رقمي زي "abc". فالشرط ده مش تكرار لفحص المدى 0..100 (ده باقي
  // مسؤولية الـ API/الـ RPC كخط دفاع أخير)، هو بس بيمنع إرسال قيمة فاضية/غير رقمية أصلاً.
  const isEmptyOrInvalid = value.trim() === '' || !Number.isFinite(Number(value));

  if (!editing) {
    return (
      <button
        type="button"
        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 hover:bg-surface"
        onClick={(e) => { e.stopPropagation(); setValue(String(row.commissionRate ?? 0)); setEditing(true); }}
      >
        <span dir="ltr" className="tabular-nums">{row.commissionRate ?? '—'}%</span>
        <Pencil size={12} className="text-subtext" />
      </button>
    );
  }

  return (
    <span className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
      <Input
        dir="ltr"
        type="number"
        min={0}
        max={100}
        step="0.1"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-20 px-2 py-1 text-xs"
      />
      <button
        type="button"
        aria-label="حفظ"
        disabled={m.isPending || isEmptyOrInvalid}
        className="rounded p-1 text-success hover:bg-green-50 disabled:opacity-50"
        onClick={() => m.mutate()}
      >
        <Check size={14} />
      </button>
      <button
        type="button"
        aria-label="إلغاء"
        className="rounded p-1 text-subtext hover:bg-surface"
        onClick={() => setEditing(false)}
      >
        <X size={14} />
      </button>
    </span>
  );
}
