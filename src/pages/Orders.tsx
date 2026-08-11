// الطلبات — كل طلبات المنصة مع فلترة الحالة/الدفع وبحث برقم الطلب.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase, arError } from '../lib/supabase';
import { PageHeader, StatusChip, Select, Input, Money } from '../components/ui';
import { DataTable, type Column, PAGE_SIZE } from '../components/DataTable';
import { fmtDateTime } from '../lib/format';
import { orderStatusLabels, paymentStatusLabels, paymentMethodLabels, labelOf } from '../lib/labels';

type Row = {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  payment_method: string;
  grand_total: number;
  placed_at: string;
  buyer: { full_name: string } | null;
  seller: { name_ar: string } | null;
};

export default function Orders() {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState('all');
  const [payment, setPayment] = useState('all');
  const [search, setSearch] = useState('');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['orders', status, payment, search, page],
    queryFn: async () => {
      let q = supabase
        .from('orders')
        .select(
          `id, order_number, status, payment_status, payment_method, grand_total, placed_at,
           buyer:profiles!orders_buyer_id_fkey (full_name),
           seller:companies!orders_seller_company_id_fkey (name_ar)`,
        )
        .order('placed_at', { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
      if (status !== 'all') q = q.eq('status', status as never);
      if (payment !== 'all') q = q.eq('payment_status', payment as never);
      if (search.trim()) q = q.ilike('order_number', `%${search.trim()}%`);
      const { data, error } = await q;
      if (error) throw new Error(arError(error));
      return data as unknown as Row[];
    },
  });

  const rows = (data ?? []).slice(0, PAGE_SIZE);

  const columns: Column<Row>[] = [
    { key: 'number', header: 'رقم الطلب', render: (r) => <span className="font-medium" dir="ltr">{r.order_number}</span> },
    { key: 'buyer', header: 'المشتري', render: (r) => r.buyer?.full_name ?? '—' },
    { key: 'seller', header: 'البائع', render: (r) => r.seller?.name_ar ?? '—' },
    {
      key: 'status',
      header: 'حالة الطلب',
      render: (r) => {
        const l = labelOf(orderStatusLabels, r.status);
        return <StatusChip label={l.label} tone={l.tone} />;
      },
    },
    {
      key: 'payment',
      header: 'الدفع',
      render: (r) => {
        const ps = labelOf(paymentStatusLabels, r.payment_status);
        const pm = labelOf(paymentMethodLabels, r.payment_method);
        return (
          <div className="flex flex-col gap-1">
            <StatusChip label={ps.label} tone={ps.tone} />
            <span className="text-xs text-subtext">{pm.label}</span>
          </div>
        );
      },
    },
    { key: 'total', header: 'الإجمالي', render: (r) => <Money value={r.grand_total} /> },
    { key: 'placed', header: 'التاريخ', render: (r) => <span className="text-xs">{fmtDateTime(r.placed_at)}</span> },
  ];

  return (
    <div>
      <PageHeader
        title="الطلبات"
        actions={
          <>
            <Input placeholder="رقم الطلب…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} className="w-44" dir="ltr" />
            <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }} className="w-40">
              <option value="all">كل الحالات</option>
              {Object.entries(orderStatusLabels).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </Select>
            <Select value={payment} onChange={(e) => { setPayment(e.target.value); setPage(0); }} className="w-40">
              <option value="all">كل حالات الدفع</option>
              {Object.entries(paymentStatusLabels).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </Select>
          </>
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
        onRowClick={(r) => navigate(`/orders/${r.id}`)}
        emptyTitle="لا توجد طلبات"
      />
    </div>
  );
}
