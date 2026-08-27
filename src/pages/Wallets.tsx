// المحافظ — كل محافظ المستخدمين والشركات + دفتر الحركات + تسوية يدوية (RPC).
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, arError } from '../lib/supabase';
import { walletAdjust } from '../api/admin';
import { PageHeader, Btn, Field, Input, Textarea, StatusChip, Money, Select } from '../components/ui';
import { DataTable, type Column, PAGE_SIZE } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';
import { fmtDateTime } from '../lib/format';
import { walletTxnLabels, labelOf } from '../lib/labels';

type WalletRow = {
  id: string;
  owner_type: 'user' | 'company';
  owner_id: string;
  balance: number;
  is_frozen: boolean;
  ownerName?: string;
};

export default function Wallets() {
  const [page, setPage] = useState(0);
  const [ownerType, setOwnerType] = useState('all');
  const [ledgerFor, setLedgerFor] = useState<WalletRow | null>(null);
  const [adjustFor, setAdjustFor] = useState<WalletRow | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['wallets', ownerType, page],
    queryFn: async () => {
      let q = supabase
        .from('wallets')
        .select('id, owner_type, owner_id, balance, is_frozen')
        .order('balance', { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
      if (ownerType !== 'all') q = q.eq('owner_type', ownerType as never);
      const { data: wallets, error } = await q;
      if (error) throw new Error(arError(error));

      // owner_id متعدد الأشكال (user/company) — بدون FK، فنحل الأسماء دفعة واحدة
      const userIds = wallets.filter((w) => w.owner_type === 'user').map((w) => w.owner_id);
      const companyIds = wallets.filter((w) => w.owner_type === 'company').map((w) => w.owner_id);
      const [users, companies] = await Promise.all([
        userIds.length
          ? supabase.from('profiles').select('id, full_name').in('id', userIds)
          : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
        companyIds.length
          ? supabase.from('companies').select('id, name_ar').in('id', companyIds)
          : Promise.resolve({ data: [] as { id: string; name_ar: string }[] }),
      ]);
      const names = new Map<string, string>();
      for (const u of users.data ?? []) names.set(u.id, u.full_name);
      for (const c of companies.data ?? []) names.set(c.id, c.name_ar);
      return wallets.map((w) => ({ ...w, ownerName: names.get(w.owner_id) ?? '—' })) as WalletRow[];
    },
  });

  const rows = (data ?? []).slice(0, PAGE_SIZE);

  const columns: Column<WalletRow>[] = [
    { key: 'owner', header: 'المالك', render: (r) => <span className="font-medium">{r.ownerName}</span> },
    {
      key: 'type',
      header: 'النوع',
      render: (r) => (
        <StatusChip label={r.owner_type === 'company' ? 'شركة' : 'مستخدم'} tone={r.owner_type === 'company' ? 'navy' : 'blue'} />
      ),
    },
    { key: 'balance', header: 'الرصيد', render: (r) => <Money value={r.balance} /> },
    {
      key: 'frozen',
      header: 'الحالة',
      render: (r) =>
        r.is_frozen ? <StatusChip label="مجمّدة" tone="red" /> : <StatusChip label="نشطة" tone="green" />,
    },
    {
      key: 'actions',
      header: 'الإجراء',
      render: (r) => (
        <div className="flex flex-col gap-1">
          <Btn variant="ghost" className="px-2.5 py-1 text-xs" onClick={() => setLedgerFor(r)}>
            دفتر الحركات
          </Btn>
          <Btn variant="primary" className="px-2.5 py-1 text-xs" onClick={() => setAdjustFor(r)}>
            تسوية
          </Btn>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="المحافظ"
        subtitle="أرصدة المستخدمين والشركات — دفتر append-only"
        actions={
          <Select value={ownerType} onChange={(e) => { setOwnerType(e.target.value); setPage(0); }} className="w-40">
            <option value="all">الكل</option>
            <option value="company">الشركات</option>
            <option value="user">المستخدمون</option>
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
        emptyTitle="لا توجد محافظ"
      />
      {ledgerFor && <LedgerModal wallet={ledgerFor} onClose={() => setLedgerFor(null)} />}
      {adjustFor && <AdjustModal wallet={adjustFor} onClose={() => setAdjustFor(null)} />}
    </div>
  );
}

function LedgerModal({ wallet, onClose }: { wallet: WalletRow; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['wallet-ledger', wallet.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('id, type, amount, balance_after, description_ar, created_at')
        .eq('wallet_id', wallet.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw new Error(arError(error));
      return data;
    },
  });

  return (
    <Modal title={`دفتر الحركات — ${wallet.ownerName}`} open onClose={onClose} wide>
      {isLoading ? (
        <div className="py-8 text-center text-sm text-subtext">جارٍ التحميل…</div>
      ) : (data ?? []).length === 0 ? (
        <div className="py-8 text-center text-sm text-subtext">لا توجد حركات</div>
      ) : (
        <div className="divide-y divide-line">
          {(data ?? []).map((t) => {
            const l = labelOf(walletTxnLabels, t.type);
            return (
              <div key={t.id} className="flex items-center gap-3 py-2.5 text-sm">
                <StatusChip label={l.label} tone={l.tone} />
                <div className="min-w-0 flex-1">
                  <div className="truncate">{t.description_ar ?? '—'}</div>
                  <div className="text-xs text-subtext">{fmtDateTime(t.created_at)}</div>
                </div>
                <Money value={t.amount} signed />
                <div className="w-32 text-end text-xs text-subtext">
                  الرصيد: <Money value={t.balance_after} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}

function AdjustModal({ wallet, onClose }: { wallet: WalletRow; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [direction, setDirection] = useState<'credit' | 'debit'>('credit');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  const m = useMutation({
    mutationFn: () => {
      const v = Math.abs(Number(amount));
      if (!Number.isFinite(v) || v <= 0) throw new Error('أدخل مبلغًا صحيحًا أكبر من صفر');
      return walletAdjust(wallet.id, direction === 'credit' ? v : -v, description.trim());
    },
    onSuccess: () => {
      toast('success', 'تم تسجيل التسوية في دفتر المحفظة');
      qc.invalidateQueries({ queryKey: ['wallets'] });
      qc.invalidateQueries({ queryKey: ['wallet-ledger', wallet.id] });
      onClose();
    },
    onError: (e) => toast('error', (e as Error).message),
  });

  return (
    <Modal title={`تسوية يدوية — ${wallet.ownerName}`} open onClose={onClose}>
      <div className="space-y-4">
        <div className="rounded-lg bg-surface p-3 text-sm">
          الرصيد الحالي: <Money value={wallet.balance} />
        </div>
        <Field label="نوع التسوية">
          <Select value={direction} onChange={(e) => setDirection(e.target.value as 'credit' | 'debit')}>
            <option value="credit">إيداع (+)</option>
            <option value="debit">خصم (−)</option>
          </Select>
        </Field>
        <Field label="المبلغ (د.ك)">
          <Input dir="ltr" type="number" step="0.001" min="0.001" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label="وصف التسوية" hint="إلزامي — يظهر في دفتر الحركات">
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2">
          <Btn variant="ghost" onClick={onClose} disabled={m.isPending}>
            إلغاء
          </Btn>
          <Btn
            variant={direction === 'debit' ? 'danger' : 'accent'}
            busy={m.isPending}
            disabled={!amount || !description.trim()}
            onClick={() => m.mutate()}
          >
            تسجيل التسوية
          </Btn>
        </div>
      </div>
    </Modal>
  );
}
