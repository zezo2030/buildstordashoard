// طلبات سحب الرصيد — قرار الأدمن عبر RPC ذرّي (`admin_decide_withdrawal`).
//
// دورة الفلوس: المبلغ بيتخصم من المحفظة **وقت تقديم الطلب** (حجز)، مش وقت
// الموافقة. فالاعتماد هنا بيغيّر الحالة وبيسجّل مرجع التحويل بس، والرفض بيرجّع
// المبلغ المحجوز لصاحبه. النصوص تحت لازم تفضل مطابقة للسلوك ده.
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, arError } from '../lib/supabase';
import { decideWithdrawal } from '../api/admin';
import { PageHeader, Btn, Field, Input, Textarea, StatusChip, Money, Select } from '../components/ui';
import { DataTable, type Column, PAGE_SIZE } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';
import { fmtDateTime } from '../lib/format';
import { withdrawalStatusLabels, labelOf } from '../lib/labels';

type Row = {
  id: string;
  amount: number;
  status: string;
  admin_note: string | null;
  transfer_ref: string | null;
  created_at: string;
  decided_at: string | null;
  requested_by: { full_name: string } | null;
  bank_account: { bank_name: string; iban: string; holder_name: string } | null;
  wallet: { id: string; owner_type: string; balance: number } | null;
};

export default function Withdrawals() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState('pending');
  const [deciding, setDeciding] = useState<{ row: Row; approve: boolean } | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['withdrawals', status, page],
    queryFn: async () => {
      let q = supabase
        .from('withdrawal_requests')
        .select(
          `id, amount, status, admin_note, transfer_ref, created_at, decided_at,
           requested_by:profiles!withdrawal_requests_requested_by_fkey (full_name),
           bank_account:bank_accounts (bank_name, iban, holder_name),
           wallet:wallets (id, owner_type, balance)`,
        )
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
      if (status !== 'all') q = q.eq('status', status as never);
      const { data, error } = await q;
      if (error) throw new Error(arError(error));
      return data as unknown as Row[];
    },
  });

  const rows = (data ?? []).slice(0, PAGE_SIZE);

  const m = useMutation({
    mutationFn: (args: { id: string; approve: boolean; note?: string; transferRef?: string }) =>
      decideWithdrawal(args),
    onSuccess: (_d, v) => {
      toast(
        'success',
        v.approve
          ? 'تم اعتماد السحب — المبلغ كان محجوزًا من المحفظة منذ تقديم الطلب'
          : 'تم رفض طلب السحب وإرجاع المبلغ المحجوز إلى المحفظة',
      );
      setDeciding(null);
      qc.invalidateQueries({ queryKey: ['withdrawals'] });
      qc.invalidateQueries({ queryKey: ['nav-badges'] });
    },
    onError: (e) => toast('error', (e as Error).message),
  });

  const columns: Column<Row>[] = [
    { key: 'who', header: 'مقدّم الطلب', render: (r) => <span className="font-medium">{r.requested_by?.full_name ?? '—'}</span> },
    { key: 'amount', header: 'المبلغ', render: (r) => <Money value={r.amount} /> },
    {
      key: 'balance',
      header: 'رصيد المحفظة (بعد الحجز)',
      render: (r) => <Money value={r.wallet?.balance} />,
    },
    {
      key: 'bank',
      header: 'الحساب البنكي',
      render: (r) =>
        r.bank_account ? (
          <div className="text-xs">
            <div>{r.bank_account.bank_name}</div>
            <div dir="ltr" className="text-subtext">{r.bank_account.iban}</div>
          </div>
        ) : (
          '—'
        ),
    },
    { key: 'created', header: 'التاريخ', render: (r) => <span className="text-xs">{fmtDateTime(r.created_at)}</span> },
    {
      key: 'status',
      header: 'الحالة',
      render: (r) => {
        const s = labelOf(withdrawalStatusLabels, r.status);
        return <StatusChip label={s.label} tone={s.tone} />;
      },
    },
    {
      key: 'actions',
      header: 'الإجراء',
      render: (r) =>
        r.status === 'pending' ? (
          <div className="flex gap-2">
            <Btn variant="accent" onClick={() => setDeciding({ row: r, approve: true })}>
              اعتماد وتحويل
            </Btn>
            <Btn variant="ghost" onClick={() => setDeciding({ row: r, approve: false })}>
              رفض
            </Btn>
          </div>
        ) : (
          <span className="text-xs text-subtext">{r.transfer_ref ? `مرجع: ${r.transfer_ref}` : r.admin_note ?? ''}</span>
        ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="طلبات السحب"
        actions={
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }} className="w-40">
            <option value="pending">المعلقة</option>
            <option value="paid">المحوّلة</option>
            <option value="rejected">المرفوضة</option>
            <option value="all">الكل</option>
          </Select>
        }
      />
      <DataTable
        columns={columns}
        rows={rows}
        loading={isLoading}
        error={error ? (error as Error).message : null}
        onRetry={() => refetch()}
        page={page}
        hasMore={(data?.length ?? 0) > PAGE_SIZE}
        onPage={setPage}
        emptyTitle="لا توجد طلبات سحب"
      />
      {deciding && (
        <DecideModal
          row={deciding.row}
          approve={deciding.approve}
          busy={m.isPending}
          onClose={() => setDeciding(null)}
          onSubmit={(note, ref) =>
            m.mutate({ id: deciding.row.id, approve: deciding.approve, note, transferRef: ref })
          }
        />
      )}
    </div>
  );
}

function DecideModal({ row, approve, busy, onClose, onSubmit }: {
  row: Row;
  approve: boolean;
  busy: boolean;
  onClose: () => void;
  onSubmit: (note?: string, transferRef?: string) => void;
}) {
  const [note, setNote] = useState('');
  const [ref, setRef] = useState('');

  return (
    <Modal title={approve ? 'اعتماد السحب وتحويل المبلغ' : 'رفض طلب السحب'} open onClose={onClose}>
      <div className="space-y-4">
        <div className="rounded-lg bg-surface p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-subtext">المبلغ</span>
            <Money value={row.amount} />
          </div>
          <div className="mt-1 flex justify-between">
            <span className="text-subtext">رصيد المحفظة (بعد حجز هذا المبلغ)</span>
            <Money value={row.wallet?.balance} />
          </div>
          {row.bank_account && (
            <div className="mt-1 flex justify-between">
              <span className="text-subtext">إلى حساب</span>
              <span dir="ltr" className="text-xs">{row.bank_account.iban}</span>
            </div>
          )}
        </div>
        {approve && (
          <Field label="مرجع التحويل البنكي (اختياري)">
            <Input dir="ltr" value={ref} onChange={(e) => setRef(e.target.value)} placeholder="TRF-2026-001" />
          </Field>
        )}
        <Field label={approve ? 'ملاحظة (اختياري)' : 'سبب الرفض'}>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <p className="text-xs text-subtext">
          {approve
            ? 'المبلغ مخصوم من المحفظة منذ تقديم الطلب. الاعتماد يغيّر الحالة إلى «تم التحويل» ويسجّل مرجع التحويل — لا يمكن التراجع، فأكّد التحويل البنكي أولًا.'
            : 'الرفض يرجّع المبلغ المحجوز إلى محفظة العميل فورًا ويُرسل له إشعارًا بالسبب.'}
        </p>
        <div className="flex justify-end gap-2">
          <Btn variant="ghost" onClick={onClose} disabled={busy}>
            إلغاء
          </Btn>
          <Btn variant={approve ? 'accent' : 'danger'} busy={busy} onClick={() => onSubmit(note || undefined, ref || undefined)}>
            {approve ? 'اعتماد وتحويل' : 'رفض'}
          </Btn>
        </div>
      </div>
    </Modal>
  );
}
