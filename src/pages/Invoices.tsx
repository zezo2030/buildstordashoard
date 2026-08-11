// الفواتير — قراءة فقط (مقفولة بتريجر؛ التصحيح بإشعارات دائنة).
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase, arError } from '../lib/supabase';
import { PageHeader, StatusChip, Input, Money } from '../components/ui';
import { DataTable, type Column, PAGE_SIZE } from '../components/DataTable';
import { fmtDateTime } from '../lib/format';

type Row = {
  id: string;
  invoice_number: string;
  type: string;
  total: number;
  issued_at: string;
  is_locked: boolean;
  order_id: string;
  seller_snapshot: { name_ar?: string } | null;
  buyer_snapshot: { name?: string; full_name?: string } | null;
};

export default function Invoices() {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['invoices', search, page],
    queryFn: async () => {
      let q = supabase
        .from('invoices')
        .select('id, invoice_number, type, total, issued_at, is_locked, order_id, seller_snapshot, buyer_snapshot')
        .order('issued_at', { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
      if (search.trim()) q = q.ilike('invoice_number', `%${search.trim()}%`);
      const { data, error } = await q;
      if (error) throw new Error(arError(error));
      return data as unknown as Row[];
    },
  });

  const rows = (data ?? []).slice(0, PAGE_SIZE);

  const columns: Column<Row>[] = [
    { key: 'number', header: 'رقم الفاتورة', render: (r) => <span className="font-medium" dir="ltr">{r.invoice_number}</span> },
    {
      key: 'type',
      header: 'النوع',
      render: (r) => (
        <StatusChip label={r.type === 'credit_note' ? 'إشعار دائن' : 'فاتورة'} tone={r.type === 'credit_note' ? 'orange' : 'navy'} />
      ),
    },
    { key: 'seller', header: 'البائع', render: (r) => r.seller_snapshot?.name_ar ?? '—' },
    { key: 'buyer', header: 'المشتري', render: (r) => r.buyer_snapshot?.name ?? r.buyer_snapshot?.full_name ?? '—' },
    { key: 'total', header: 'الإجمالي', render: (r) => <Money value={r.total} /> },
    { key: 'issued', header: 'تاريخ الإصدار', render: (r) => <span className="text-xs">{fmtDateTime(r.issued_at)}</span> },
    {
      key: 'locked',
      header: 'الحالة',
      render: (r) => (r.is_locked ? <StatusChip label="مقفولة" tone="gray" /> : <StatusChip label="مفتوحة" tone="green" />),
    },
  ];

  return (
    <div>
      <PageHeader
        title="الفواتير"
        subtitle="الفواتير لقطة مجمّدة عند الشراء — التصحيح يكون بإشعار دائن لا بالتعديل"
        actions={
          <Input placeholder="رقم الفاتورة…" dir="ltr" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} className="w-48" />
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
        onRowClick={(r) => navigate(`/orders/${r.order_id}`)}
        emptyTitle="لا توجد فواتير"
      />
    </div>
  );
}
