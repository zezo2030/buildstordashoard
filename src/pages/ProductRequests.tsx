// طلبات المنتجات — طلبات إضافة SKU جديد من المستخدمين، بمعالجة أدمن (قبول/رفض + ملاحظة).
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, arError } from '../lib/supabase';
import { PageHeader, Btn, Field, Textarea, StatusChip, Select } from '../components/ui';
import { DataTable, type Column, PAGE_SIZE } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';
import { fmtDateTime } from '../lib/format';
import { productRequestStatusLabels, labelOf } from '../lib/labels';

type Row = {
  id: string;
  name_ar: string;
  qty: number | null;
  notes: string | null;
  status: string;
  admin_note: string | null;
  created_at: string;
  requester: { full_name: string } | null;
  specialty: { name_ar: string } | null;
  unit: { name_ar: string } | null;
};

export default function ProductRequests() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState('open');
  const [deciding, setDeciding] = useState<{ row: Row; to: 'approved' | 'rejected' } | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['product-requests', status, page],
    queryFn: async () => {
      let q = supabase
        .from('product_requests')
        .select(
          `id, name_ar, qty, notes, status, admin_note, created_at,
           requester:profiles!product_requests_requester_id_fkey (full_name),
           specialty:specialties (name_ar), unit:units (name_ar)`,
        )
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
      if (status !== 'all') q = q.eq('status', status as never);
      const { data, error } = await q;
      if (error) throw new Error(arError(error));
      return data as unknown as Row[];
    },
  });

  const decide = useMutation({
    mutationFn: async (args: { id: string; to: string; note: string }) => {
      const { error } = await supabase
        .from('product_requests')
        .update({ status: args.to, admin_note: args.note || null })
        .eq('id', args.id);
      if (error) throw new Error(arError(error));
    },
    onSuccess: (_d, v) => {
      toast('success', v.to === 'approved' ? 'تم قبول الطلب — أضف المنتج من صفحة المنتجات' : 'تم رفض الطلب');
      setDeciding(null);
      qc.invalidateQueries({ queryKey: ['product-requests'] });
      qc.invalidateQueries({ queryKey: ['nav-badges'] });
    },
    onError: (e) => toast('error', (e as Error).message),
  });

  const rows = (data ?? []).slice(0, PAGE_SIZE);

  const columns: Column<Row>[] = [
    {
      key: 'name',
      header: 'المنتج المطلوب',
      render: (r) => (
        <div>
          <div className="font-medium">{r.name_ar}</div>
          {r.notes && <div className="text-xs text-subtext">{r.notes}</div>}
        </div>
      ),
    },
    { key: 'requester', header: 'مقدّم الطلب', render: (r) => r.requester?.full_name ?? '—' },
    { key: 'specialty', header: 'التخصص', render: (r) => r.specialty?.name_ar ?? '—' },
    { key: 'qty', header: 'الكمية', render: (r) => (r.qty != null ? <span dir="ltr">{r.qty} {r.unit?.name_ar ?? ''}</span> : '—') },
    { key: 'created', header: 'التاريخ', render: (r) => <span className="text-xs">{fmtDateTime(r.created_at)}</span> },
    {
      key: 'status',
      header: 'الحالة',
      render: (r) => {
        const l = labelOf(productRequestStatusLabels, r.status);
        return <StatusChip label={l.label} tone={l.tone} />;
      },
    },
    {
      key: 'actions',
      header: 'الإجراء',
      render: (r) =>
        r.status === 'open' ? (
          <div className="flex gap-2">
            <Btn variant="accent" onClick={() => setDeciding({ row: r, to: 'approved' })}>قبول</Btn>
            <Btn variant="ghost" onClick={() => setDeciding({ row: r, to: 'rejected' })}>رفض</Btn>
          </div>
        ) : (
          <span className="text-xs text-subtext">{r.admin_note ?? ''}</span>
        ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="طلبات المنتجات"
        subtitle="طلبات إضافة مواد جديدة للكتالوج من البائعين والمشترين"
        actions={
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }} className="w-40">
            <option value="open">المفتوحة</option>
            <option value="approved">المقبولة</option>
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
        emptyTitle="لا توجد طلبات"
      />
      {deciding && (
        <DecideModal
          row={deciding.row}
          to={deciding.to}
          busy={decide.isPending}
          onClose={() => setDeciding(null)}
          onSubmit={(note) => decide.mutate({ id: deciding.row.id, to: deciding.to, note })}
        />
      )}
    </div>
  );
}

function DecideModal({ row, to, busy, onClose, onSubmit }: {
  row: Row;
  to: 'approved' | 'rejected';
  busy: boolean;
  onClose: () => void;
  onSubmit: (note: string) => void;
}) {
  const [note, setNote] = useState('');
  return (
    <Modal title={`${to === 'approved' ? 'قبول' : 'رفض'} طلب — ${row.name_ar}`} open onClose={onClose}>
      <div className="space-y-4">
        <Field label="ملاحظة الإدارة (اختياري)">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        {to === 'approved' && (
          <p className="text-xs text-subtext">بعد القبول أضف المنتج فعليًا من صفحة «المنتجات» ليصبح متاحًا للبائعين.</p>
        )}
        <div className="flex justify-end gap-2">
          <Btn variant="ghost" onClick={onClose} disabled={busy}>إلغاء</Btn>
          <Btn variant={to === 'approved' ? 'accent' : 'danger'} busy={busy} onClick={() => onSubmit(note)}>
            {to === 'approved' ? 'قبول' : 'رفض'}
          </Btn>
        </div>
      </div>
    </Modal>
  );
}
