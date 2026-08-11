// سجل التدقيق — قراءة لسجل audit_log (كتابات النظام الحساسة).
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase, arError } from '../lib/supabase';
import { PageHeader, StatusChip, Input } from '../components/ui';
import { DataTable, type Column, PAGE_SIZE } from '../components/DataTable';
import { fmtDateTime } from '../lib/format';

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
  const [entity, setEntity] = useState('');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['audit', entity, page],
    queryFn: async () => {
      let q = supabase
        .from('audit_log')
        .select('id, actor_id, action, entity, entity_id, created_at')
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
      if (entity.trim()) q = q.ilike('entity', `%${entity.trim()}%`);
      const { data, error } = await q;
      if (error) throw new Error(arError(error));
      return data as Row[];
    },
  });

  const rows = (data ?? []).slice(0, PAGE_SIZE);

  const columns: Column<Row>[] = [
    { key: 'id', header: '#', render: (r) => <span dir="ltr" className="text-xs text-subtext">{r.id}</span> },
    {
      key: 'action',
      header: 'العملية',
      render: (r) => (
        <StatusChip
          label={r.action}
          tone={r.action === 'DELETE' ? 'red' : r.action === 'INSERT' ? 'green' : 'blue'}
        />
      ),
    },
    { key: 'entity', header: 'الجدول', render: (r) => <span dir="ltr" className="font-medium">{r.entity}</span> },
    { key: 'entity_id', header: 'السجل', render: (r) => <span dir="ltr" className="text-xs text-subtext">{r.entity_id ?? '—'}</span> },
    { key: 'at', header: 'الوقت', render: (r) => <span className="text-xs">{fmtDateTime(r.created_at)}</span> },
  ];

  return (
    <div>
      <PageHeader
        title="سجل التدقيق"
        actions={<Input placeholder="فلترة بالجدول…" dir="ltr" value={entity} onChange={(e) => { setEntity(e.target.value); setPage(0); }} className="w-48" />}
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
        emptyTitle="السجل فارغ"
      />
    </div>
  );
}
