// سجل التدقيق — من عمل إيه في النظام ومتى (إيقاف حساب، موافقة سحب، تعديل إعداد…).
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase, arError } from '../lib/supabase';
import { PageHeader, StatusChip, Input } from '../components/ui';
import { DataTable, type Column, PAGE_SIZE } from '../components/DataTable';
import { fmtDateTime } from '../lib/format';
import { auditActionLabels, auditEntityLabels, labelOf } from '../lib/labels';

type Row = {
  id: number;
  actor_id: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  created_at: string;
};

export default function AuditLog() {
  const [page, setPage] = useState(0);
  const [q, setQ] = useState('');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['audit', q, page],
    queryFn: async () => {
      let query = supabase
        .from('audit_log')
        .select('id, actor_id, action, entity, entity_id, created_at')
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
      if (q.trim()) query = query.ilike('entity', `%${q.trim()}%`);
      const { data, error } = await query;
      if (error) throw new Error(arError(error));
      return data as Row[];
    },
  });

  const rows = (data ?? []).slice(0, PAGE_SIZE);

  const columns: Column<Row>[] = [
    {
      key: 'action',
      header: 'العملية',
      render: (r) => {
        const l = labelOf(auditActionLabels, r.action);
        return <StatusChip label={l.label} tone={l.tone} />;
      },
    },
    {
      key: 'entity',
      header: 'على إيه',
      render: (r) => <span className="font-medium">{auditEntityLabels[r.entity] ?? r.entity}</span>,
    },
    {
      key: 'entity_id',
      header: 'رقم السجل',
      render: (r) => <span dir="ltr" className="text-xs text-subtext">{r.entity_id ?? '—'}</span>,
    },
    { key: 'at', header: 'الوقت', render: (r) => <span className="text-xs">{fmtDateTime(r.created_at)}</span> },
  ];

  return (
    <div>
      <PageHeader
        title="سجل التدقيق"
        subtitle="سجل تلقائي: مين عدّل إيه في النظام ومتى. للقراءة فقط، مش بتعدّل منه حاجة."
        actions={
          <Input
            placeholder="ابحث باسم الجدول…"
            dir="ltr"
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(0); }}
            className="w-48"
          />
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
        emptyTitle="ما فيش عمليات مسجّلة بعد"
      />
    </div>
  );
}
