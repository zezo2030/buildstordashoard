// الشركات (بائعون ومشترون) — صفحة مستقلة عن المستخدمين الأفراد.
import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, arError } from '../lib/supabase';
import { PageHeader, StatusChip, Select, Input, Toggle } from '../components/ui';
import { DataTable, type Column, PAGE_SIZE } from '../components/DataTable';
import { useToast } from '../components/Toast';

type Row = {
  id: string;
  type: 'buyer' | 'seller';
  name_ar: string;
  governorate: string | null;
  commission_rate: number;
  rating: number;
  is_verified: boolean;
  is_active: boolean;
};

export default function Companies() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [page, setPage] = useState(0);
  const [type, setType] = useState('all');
  const [search, setSearch] = useState('');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['companies', type, search, page],
    queryFn: async () => {
      let q = supabase
        .from('companies')
        .select('id, type, name_ar, governorate, commission_rate, rating, is_verified, is_active')
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
      if (type !== 'all') q = q.eq('type', type as never);
      if (search.trim()) q = q.ilike('name_ar', `%${search.trim()}%`);
      const { data, error } = await q;
      if (error) throw new Error(arError(error));
      return data as Row[];
    },
  });

  const toggle = useMutation({
    mutationFn: async (args: { id: string; field: 'is_verified' | 'is_active'; value: boolean }) => {
      const patch = args.field === 'is_verified' ? { is_verified: args.value } : { is_active: args.value };
      const { error } = await supabase.from('companies').update(patch).eq('id', args.id);
      if (error) throw new Error(arError(error));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['companies'] }),
    onError: (e) => toast('error', (e as Error).message),
  });

  const rows = (data ?? []).slice(0, PAGE_SIZE);

  const columns: Column<Row>[] = [
    {
      key: 'name',
      header: 'الشركة',
      render: (r) => (
        <div>
          <div className="font-medium">{r.name_ar}</div>
          <div className="text-xs text-subtext">{r.governorate ?? ''}</div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'النوع',
      render: (r) => (
        <StatusChip
          label={r.type === 'seller' ? 'شركة بائعة' : 'شركة مشترية'}
          tone={r.type === 'seller' ? 'orange' : 'blue'}
        />
      ),
    },
    { key: 'commission', header: 'العمولة %', render: (r) => <span dir="ltr">{r.commission_rate}%</span> },
    { key: 'rating', header: 'التقييم', render: (r) => <span dir="ltr">★ {r.rating}</span> },
    {
      key: 'verified',
      header: 'موثقة',
      render: (r) => (
        <span onClick={(e) => e.stopPropagation()}>
          <Toggle checked={r.is_verified} onChange={(v) => toggle.mutate({ id: r.id, field: 'is_verified', value: v })} />
        </span>
      ),
    },
    {
      key: 'active',
      header: 'نشطة',
      render: (r) => (
        <span onClick={(e) => e.stopPropagation()}>
          <Toggle checked={r.is_active} onChange={(v) => toggle.mutate({ id: r.id, field: 'is_active', value: v })} />
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="الشركات" subtitle="شركات البيع والشراء — منفصلة عن حسابات الأفراد" />

      <div className="mb-4 flex w-fit gap-1 rounded-xl bg-white p-1 shadow-sm ring-1 ring-line">
        <KindTab to="/users/buyers" label="مستخدمون عاديون" />
        <KindTab to="/users/sellers" label="بائعون" />
        <KindTab to="/companies" label="شركات" />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <Input
          placeholder="ابحث بالاسم…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          className="w-56"
        />
        <Select value={type} onChange={(e) => { setType(e.target.value); setPage(0); }} className="w-40">
          <option value="all">كل الشركات</option>
          <option value="seller">شركات بائعة</option>
          <option value="buyer">شركات مشترية</option>
        </Select>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        loading={isLoading}
        error={error ? (error as Error).message : null}
        onRetry={() => refetch()}
        page={page}
        hasMore={(data?.length ?? 0) > PAGE_SIZE}
        onPage={setPage}
        onRowClick={(r) => navigate(`/companies/${r.id}`)}
        emptyTitle="لا توجد شركات"
      />
    </div>
  );
}

function KindTab({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
          isActive ? 'bg-primary text-white' : 'text-subtext hover:text-primary'
        }`
      }
    >
      {label}
    </NavLink>
  );
}
