// تاب «رصيد المنصة» في صفحة المال.
//
// بيجاوب على سؤالين مختلفين في شاشة واحدة:
//   كسبت كام في الفترة دي؟  ← كروت الحركة (بتتبع فلتر الفترة)
//   عندي كام دلوقتي أقدر أسحبه؟ ← كارت الرصيد (تراكمي، مالوش فترة)
//
// الفرق ده مهم: لو الرصيد اتبع الفلتر، «آخر 30 يوم» هتوريك رصيد أقل من
// الحقيقي وتسحب على أساسه.
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Wallet, PiggyBank, Undo2, Landmark, Trash2, TrendingUp, Users,
} from 'lucide-react';
import {
  fetchPlatformBalance, fetchWithdrawals, recordWithdrawal, deleteWithdrawal,
} from '../api/platform-balance';
import type { DateRange } from './DateRangePicker';
import { Card, KpiCard, Money, Btn, Field, Input, Textarea, ErrorState, Spinner } from './ui';
import { ConfirmDialog, Modal } from './Modal';
import { useToast } from './Toast';
import { fmtDate } from '../lib/format';

export function PlatformBalanceTab({ range }: { range: DateRange }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [bankRef, setBankRef] = useState('');
  const [note, setNote] = useState('');
  const [at, setAt] = useState('');
  const [delTarget, setDelTarget] = useState<string | null>(null);

  const balance = useQuery({
    queryKey: ['platform-balance', range.from, range.to],
    queryFn: () => fetchPlatformBalance(range.from, range.to),
  });
  const list = useQuery({ queryKey: ['platform-withdrawals'], queryFn: () => fetchWithdrawals() });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['platform-balance'] });
    qc.invalidateQueries({ queryKey: ['platform-withdrawals'] });
  };

  const save = useMutation({
    mutationFn: () => recordWithdrawal({ amount, bankRef, note, at: at || null }),
    onSuccess: () => {
      toast('success', 'تم تسجيل السحب');
      setOpen(false); setAmount(''); setBankRef(''); setNote(''); setAt('');
      refresh();
    },
    onError: (e) => toast('error', (e as Error).message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteWithdrawal(id),
    onSuccess: () => { toast('success', 'تم حذف السحب'); setDelTarget(null); refresh(); },
    onError: (e) => toast('error', (e as Error).message),
  });

  if (balance.isError) {
    return (
      <Card className="p-4">
        <ErrorState
          message={(balance.error as Error)?.message ?? 'تعذر تحميل الرصيد'}
          onRetry={() => balance.refetch()}
        />
      </Card>
    );
  }
  if (balance.isLoading || !balance.data) return <Spinner />;

  const b = balance.data;
  const rows = list.data ?? [];

  return (
    <div>
      {/* الرصيد المتاح لوحده وفوق: ده الرقم اللي بيتسحب عليه. */}
      <Card className="mb-4 flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <p className="text-sm text-subtext">الرصيد المتاح للسحب</p>
          <p className="mt-1 text-3xl font-bold">
            <Money value={b.balance} />
          </p>
          <p className="mt-1 text-xs text-subtext">
            إجمالي الدخل <Money value={b.totalIncome} /> ناقص المسحوب <Money value={b.withdrawn} />
            {' '}— رقم تراكمي، مش تابع لفلتر الفترة
          </p>
        </div>
        <Btn onClick={() => setOpen(true)}>
          <Landmark size={15} /> تسجيل سحب بنكي
        </Btn>
      </Card>

      {/* أموال العملاء جنب رصيد المنصة عن قصد: الحساب البنكي شايل الاتنين
          مخلوطين، فالأدمن لو بص على كشف البنك لوحده ممكن يفتكر الفرق ربح. */}
      <Card className="mb-4 border-r-4 border-r-danger p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-1.5 text-sm text-subtext">
              <Users size={15} /> أموال العملاء المحتجزة
            </p>
            <p className="mt-1 text-2xl font-bold">
              <Money value={b.customerFunds} />
            </p>
            <p className="mt-1 text-xs text-subtext">
              أرصدة المشترين <Money value={b.buyerFunds} /> · أرصدة البائعين{' '}
              <Money value={b.sellerFunds} />
            </p>
          </div>
          <div className="text-xs text-subtext">
            <p className="font-bold text-danger">مش للسحب</p>
            <p className="mt-1 max-w-xs leading-relaxed">
              لما العميل يشحن محفظته الفلوس بتدخل حساب المنصة في البنك فعلًا، بس تفضل ملكه لحد
              ما يشتري بيها أو يسحبها. الرقم ده أمانة مش ربح، ومش داخل الرصيد المتاح فوق.
            </p>
            <p className="mt-2">
              في الفترة: شحن <Money value={b.customerTopups} /> · صرف{' '}
              <Money value={b.customerPayouts} />
            </p>
          </div>
        </div>
      </Card>

      {/* حركة الفترة */}
      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="عمولات المبيعات" value={<Money value={b.commission} />}
          icon={<Wallet size={20} />} tone="green" />
        <KpiCard title="الاشتراكات" value={<Money value={b.subscriptions} />}
          icon={<PiggyBank size={20} />} tone="blue" />
        {/* دي بتطلع من نفس الرصيد: المنصة بترجّع للبائع العمولة اللي أخدتها
            لما البيعة ترجع. */}
        <KpiCard title="عمولات مرتجعة للبائعين" value={<Money value={b.refunds} />}
          hint="بتتخصم من رصيد المنصة" icon={<Undo2 size={20} />} tone="red" />
        <KpiCard title="صافي الفترة" value={<Money value={b.periodNet} />}
          icon={<TrendingUp size={20} />} tone="navy" />
      </div>

      <Card className="p-5">
        <h2 className="mb-1 font-bold">سجل السحب البنكي</h2>
        <p className="mb-3 text-sm text-subtext">
          تسجيل للتحويلات اللي طلعت من رصيد المنصة لحسابك البنكي — السطر هنا بيوصف تحويل حصل
          في البنك، والنظام ما بيحوّلش فلوس.
        </p>

        {rows.length === 0 ? (
          <p className="py-4 text-center text-sm text-subtext">لا توجد عمليات سحب</p>
        ) : (
          <div className="divide-y divide-line">
            {rows.map((w) => (
              <div key={w.id} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
                <span className="font-medium"><Money value={w.amount} /></span>
                <span className="text-xs text-subtext">{fmtDate(w.withdrawnAt)}</span>
                {w.bankRef && <span className="text-xs text-subtext" dir="ltr">{w.bankRef}</span>}
                <span className="min-w-0 flex-1 truncate text-xs text-subtext">{w.note ?? ''}</span>
                {w.createdByName && (
                  <span className="text-xs text-subtext">{w.createdByName}</span>
                )}
                <button
                  type="button"
                  onClick={() => setDelTarget(w.id)}
                  className="text-subtext transition-colors hover:text-danger"
                  aria-label="حذف"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {open && (
        <Modal title="تسجيل سحب بنكي" open onClose={() => setOpen(false)}>
          <p className="mb-3 text-sm text-subtext">
            المتاح دلوقتي <Money value={b.balance} />. الرصيد ده هو اللي بترجع منه عمولات
            المرتجعات، فسيب فيه غطاء.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="المبلغ (د.ك)">
              <Input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.000"
                dir="ltr"
              />
            </Field>
            <Field label="تاريخ التحويل">
              <Input
                type="date"
                value={at}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setAt(e.target.value)}
              />
            </Field>
          </div>
          <Field label="رقم التحويل / الإيصال">
            <Input value={bankRef} onChange={(e) => setBankRef(e.target.value)} dir="ltr" />
          </Field>
          <Field label="ملاحظة (اختياري)">
            <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <div className="mt-3 flex gap-2">
            <Btn onClick={() => save.mutate()} busy={save.isPending} disabled={!amount.trim()}>
              تسجيل
            </Btn>
            <Btn variant="ghost" onClick={() => setOpen(false)}>إلغاء</Btn>
          </div>
        </Modal>
      )}

      <ConfirmDialog
        open={!!delTarget}
        title="حذف عملية السحب"
        message="السطر ده هيتشال والرصيد المتاح هيزيد بقيمته. الحذف بيتسجّل في سجل التدقيق."
        confirmLabel="حذف"
        busy={remove.isPending}
        onClose={() => setDelTarget(null)}
        danger
        onConfirm={() => { if (delTarget) remove.mutate(delTarget); }}
      />
    </div>
  );
}
