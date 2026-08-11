// المرتجعات — إشراف على طلبات الإرجاع وقرارات البائعين والمبالغ المستردة.
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase, arError } from '../lib/supabase';
import { PageHeader, StatusChip, Select, Money } from '../components/ui';
import { DataTable, type Column, PAGE_SIZE } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { fmtDateTime } from '../lib/format';
import { returnStatusLabels, labelOf } from '../lib/labels';

type Row = {
  id: string;
  return_number: string;
  status: string;
  reason_text: string | null;
  refund_amount: number | null;
  requested_at: string;
  buyer: { full_name: string } | null;
  seller: { name_ar: string } | null;
};

export default function Returns() {
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState('all');
  const [selected, setSelected] = useState<Row | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['returns', status, page],
    queryFn: async () => {
      let q = supabase
        .from('return_requests')
        .select(
          `id, return_number, status, reason_text, refund_amount, requested_at,
           buyer:profiles!return_requests_buyer_id_fkey (full_name),
           seller:companies!return_requests_seller_company_id_fkey (name_ar)`,
        )
        .order('requested_at', { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
      if (status !== 'all') q = q.eq('status', status as never);
      const { data, error } = await q;
      if (error) throw new Error(arError(error));
      return data as unknown as Row[];
    },
  });

  const rows = (data ?? []).slice(0, PAGE_SIZE);

  const columns: Column<Row>[] = [
    { key: 'number', header: 'رقم المرتجع', render: (r) => <span dir="ltr" className="font-medium">{r.return_number}</span> },
    { key: 'buyer', header: 'المشتري', render: (r) => r.buyer?.full_name ?? '—' },
    { key: 'seller', header: 'البائع', render: (r) => r.seller?.name_ar ?? '—' },
    {
      key: 'status',
      header: 'الحالة',
      render: (r) => {
        const l = labelOf(returnStatusLabels, r.status);
        return <StatusChip label={l.label} tone={l.tone} />;
      },
    },
    { key: 'refund', header: 'المبلغ المسترد', render: (r) => (r.refund_amount != null ? <Money value={r.refund_amount} /> : '—') },
    { key: 'at', header: 'التاريخ', render: (r) => <span className="text-xs">{fmtDateTime(r.requested_at)}</span> },
  ];

  return (
    <div>
      <PageHeader
        title="المرتجعات"
        actions={
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }} className="w-44">
            <option value="all">كل الحالات</option>
            {Object.entries(returnStatusLabels).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
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
        onRowClick={setSelected}
        emptyTitle="لا توجد مرتجعات"
      />
      {selected && <ReturnModal row={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function ReturnModal({ row, onClose }: { row: Row; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['return', row.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('return_items')
        .select('id, qty_requested, qty_accepted, qty_rejected, unit_price, accepted_total, order_item:order_items (name_ar, sku)')
        .eq('return_id', row.id);
      if (error) throw new Error(arError(error));
      return data as unknown as {
        id: string;
        qty_requested: number;
        qty_accepted: number | null;
        qty_rejected: number | null;
        unit_price: number;
        accepted_total: number | null;
        order_item: { name_ar: string; sku: string | null } | null;
      }[];
    },
  });

  const st = labelOf(returnStatusLabels, row.status);

  return (
    <Modal title={`مرتجع ${row.return_number}`} open onClose={onClose} wide>
      <div className="mb-3 flex items-center gap-2">
        <StatusChip label={st.label} tone={st.tone} />
        {row.reason_text && <span className="text-sm text-subtext">السبب: {row.reason_text}</span>}
      </div>
      {isLoading ? (
        <div className="py-8 text-center text-sm text-subtext">جارٍ التحميل…</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface text-subtext">
                <th className="px-3 py-2 text-start font-medium">الصنف</th>
                <th className="px-3 py-2 text-start font-medium">المطلوب</th>
                <th className="px-3 py-2 text-start font-medium">المقبول</th>
                <th className="px-3 py-2 text-start font-medium">المرفوض</th>
                <th className="px-3 py-2 text-start font-medium">قيمة المقبول</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((it) => (
                <tr key={it.id} className="border-t border-line">
                  <td className="px-3 py-2">{it.order_item?.name_ar ?? '—'}</td>
                  <td className="px-3 py-2" dir="ltr">{it.qty_requested}</td>
                  <td className="px-3 py-2" dir="ltr">{it.qty_accepted ?? '—'}</td>
                  <td className="px-3 py-2" dir="ltr">{it.qty_rejected ?? '—'}</td>
                  <td className="px-3 py-2">{it.accepted_total != null ? <Money value={it.accepted_total} /> : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {row.refund_amount != null && (
        <div className="mt-3 flex justify-between rounded-lg bg-surface px-3 py-2 text-sm font-bold">
          <span>إجمالي المسترد للمحفظة</span>
          <Money value={row.refund_amount} />
        </div>
      )}
    </Modal>
  );
}
