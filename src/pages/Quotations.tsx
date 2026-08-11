// المقايسات — إشراف على مقايسات المشترين وعروض البائعين.
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase, arError } from '../lib/supabase';
import { PageHeader, StatusChip, Select, Money } from '../components/ui';
import { DataTable, type Column, PAGE_SIZE } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { fmtDate, fmtDateTime } from '../lib/format';
import { quotationStatusLabels, labelOf } from '../lib/labels';

type Row = {
  id: string;
  quotation_number: string | null;
  title: string | null;
  status: string;
  valid_until: string | null;
  created_at: string;
  owner: { full_name: string } | null;
};

export default function Quotations() {
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState('all');
  const [selected, setSelected] = useState<Row | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['quotations', status, page],
    queryFn: async () => {
      let q = supabase
        .from('quotations')
        .select('id, quotation_number, title, status, valid_until, created_at, owner:profiles!quotations_buyer_id_fkey (full_name)')
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
      if (status !== 'all') q = q.eq('status', status as never);
      const { data, error } = await q;
      if (error) throw new Error(arError(error));
      return data as unknown as Row[];
    },
  });

  const rows = (data ?? []).slice(0, PAGE_SIZE);

  const columns: Column<Row>[] = [
    { key: 'number', header: 'الرقم', render: (r) => <span dir="ltr" className="font-medium">{r.quotation_number ?? '—'}</span> },
    { key: 'title', header: 'العنوان', render: (r) => r.title ?? '—' },
    { key: 'owner', header: 'صاحب المقايسة', render: (r) => r.owner?.full_name ?? '—' },
    {
      key: 'status',
      header: 'الحالة',
      render: (r) => {
        const l = labelOf(quotationStatusLabels, r.status);
        return <StatusChip label={l.label} tone={l.tone} />;
      },
    },
    { key: 'valid', header: 'سارية حتى', render: (r) => fmtDate(r.valid_until) },
    { key: 'created', header: 'التاريخ', render: (r) => <span className="text-xs">{fmtDateTime(r.created_at)}</span> },
  ];

  return (
    <div>
      <PageHeader
        title="المقايسات"
        actions={
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }} className="w-44">
            <option value="all">كل الحالات</option>
            {Object.entries(quotationStatusLabels).map(([k, v]) => (
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
        emptyTitle="لا توجد مقايسات"
      />
      {selected && <QuotationModal row={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function QuotationModal({ row, onClose }: { row: Row; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['quotation', row.id],
    queryFn: async () => {
      const [items, offers] = await Promise.all([
        supabase
          .from('quotation_items')
          .select('id, line_no, qty, preferred_origin, product:products (name_ar)')
          .eq('quotation_id', row.id)
          .order('line_no'),
        supabase
          .from('quotation_offers')
          .select('id, status, total, submitted_at, seller:companies!quotation_offers_seller_company_id_fkey (name_ar)')
          .eq('quotation_id', row.id),
      ]);
      return {
        items: (items.data ?? []) as unknown as {
          id: string;
          line_no: number;
          qty: number;
          preferred_origin: string | null;
          product: { name_ar: string } | null;
        }[],
        offers: (offers.data ?? []) as unknown as {
          id: string;
          status: string;
          total: number | null;
          submitted_at: string | null;
          seller: { name_ar: string } | null;
        }[],
      };
    },
  });

  return (
    <Modal title={`مقايسة ${row.quotation_number ?? ''}`} open onClose={onClose} wide>
      {isLoading ? (
        <div className="py-8 text-center text-sm text-subtext">جارٍ التحميل…</div>
      ) : (
        <div className="space-y-5">
          <div>
            <h3 className="mb-2 text-sm font-bold">البنود ({data?.items.length ?? 0})</h3>
            <div className="max-h-56 divide-y divide-line overflow-y-auto rounded-lg border border-line">
              {(data?.items ?? []).map((it) => (
                <div key={it.id} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span>{it.product?.name_ar ?? `بند ${it.line_no}`}</span>
                  <span className="text-xs text-subtext" dir="ltr">{it.qty}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-bold">عروض البائعين ({data?.offers.length ?? 0})</h3>
            {(data?.offers ?? []).length === 0 ? (
              <p className="text-sm text-subtext">لا توجد عروض بعد</p>
            ) : (
              <div className="divide-y divide-line rounded-lg border border-line">
                {(data?.offers ?? []).map((of) => (
                  <div key={of.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                    <span className="font-medium">{of.seller?.name_ar ?? '—'}</span>
                    <span className="text-xs text-subtext">{of.submitted_at ? fmtDateTime(of.submitted_at) : 'لم يُقدَّم'}</span>
                    <StatusChip label={of.status} tone={of.status === 'awarded' ? 'green' : of.status === 'submitted' ? 'blue' : 'gray'} />
                    {of.total != null && <Money value={of.total} />}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
