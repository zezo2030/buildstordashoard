// الكريديت (شاشة CREDIT OF ALL COMPANIES في Figma) — حدود الآجل لشركات المشترين:
// الحد المسموح + فترة السريان + المستخدم فعليًا (طلبات credit_terms غير الملغاة).
// الحقول تُضاف بميجريشن admin_console — الصفحة تتدهور بسلاسة قبل تطبيقه.
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, arError } from '../lib/supabase';
import { PageHeader, Btn, Field, Input, Money, Card } from '../components/ui';
import { DataTable, type Column } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';
import { fmtDate } from '../lib/format';

type Row = {
  id: string;
  name_ar: string;
  type: string;
  credit_limit: number | null;
  credit_from: string | null;
  credit_to: string | null;
  used: number;
};

function isMissingColumn(msg: string): boolean {
  return /credit_limit|column .* does not exist|42703/i.test(msg);
}

export default function Credit() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Row | null>(null);
  const [search, setSearch] = useState('');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['credit-companies', search],
    retry: false,
    queryFn: async () => {
      let q = supabase
        .from('companies')
        .select('id, name_ar, type, credit_limit, credit_from, credit_to' as '*')
        .eq('type', 'buyer')
        .order('name_ar')
        .limit(200);
      if (search.trim()) q = q.ilike('name_ar', `%${search.trim()}%`);
      const res = await q;
      if (res.error) throw new Error(isMissingColumn(res.error.message) ? 'MIGRATION_NEEDED' : arError(res.error));
      const companies = (res.data ?? []) as unknown as Omit<Row, 'used'>[];

      // المستخدم من الكريديت = طلبات آجلة غير ملغاة وغير مدفوعة بالكامل
      const ids = companies.map((c) => c.id);
      const used = new Map<string, number>();
      if (ids.length) {
        const { data: orders } = await supabase
          .from('orders')
          .select('buyer_company_id, grand_total, payment_status')
          .eq('payment_method', 'credit_terms')
          .neq('status', 'cancelled')
          .in('buyer_company_id', ids)
          .limit(5000);
        for (const o of orders ?? []) {
          if (o.payment_status === 'paid' || !o.buyer_company_id) continue;
          used.set(o.buyer_company_id, (used.get(o.buyer_company_id) ?? 0) + (Number(o.grand_total) || 0));
        }
      }
      return companies.map((c) => ({ ...c, used: used.get(c.id) ?? 0 })) as Row[];
    },
  });

  const migrationNeeded = error && (error as Error).message === 'MIGRATION_NEEDED';

  const columns: Column<Row>[] = [
    { key: 'name', header: 'الشركة', render: (r) => <span className="font-medium">{r.name_ar}</span> },
    {
      key: 'limit',
      header: 'القيمة المسموح بها',
      render: (r) => (r.credit_limit != null ? <span className="font-bold text-accent"><Money value={r.credit_limit} /></span> : <span className="text-subtext">غير مفعّل</span>),
    },
    { key: 'used', header: 'قيمة الشراء الحالية', render: (r) => <Money value={r.used} /> },
    {
      key: 'remaining',
      header: 'المتبقي',
      render: (r) =>
        r.credit_limit != null ? (
          <span className={r.credit_limit - r.used < 0 ? 'text-danger' : 'text-success'}>
            <Money value={r.credit_limit - r.used} />
          </span>
        ) : (
          '—'
        ),
    },
    {
      key: 'period',
      header: 'الفترة',
      render: (r) =>
        r.credit_from || r.credit_to ? (
          <span className="text-xs">
            {fmtDate(r.credit_from)} ← {fmtDate(r.credit_to)}
          </span>
        ) : (
          '—'
        ),
    },
    {
      key: 'actions',
      header: '',
      render: (r) => <Btn variant="ghost" onClick={() => setEditing(r)}>تعديل الحد</Btn>,
    },
  ];

  return (
    <div>
      <PageHeader
        title="الكريديت"
        subtitle="حدود الشراء الآجل لشركات المشترين — العرض والإدارة (تطبيق الحد داخل checkout مرحلة لاحقة)"
        actions={<Input placeholder="ابحث عن شركة…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-56" />}
      />
      {migrationNeeded ? (
        <Card className="border-accent/40 bg-accent-soft p-5 text-sm leading-6 text-primary">
          <b>حقول الكريديت غير موجودة بعد في قاعدة البيانات.</b>
          <p className="mt-1">
            طبّق ميجريشن <code dir="ltr">20260809145230_admin_console.sql</code> (موجود في
            <code dir="ltr"> docs/buildstoresupabase/supabase/migrations/</code>) من Supabase SQL Editor
            ثم أعد تحميل الصفحة — سيضيف حقول credit_limit / credit_from / credit_to لجدول الشركات.
          </p>
        </Card>
      ) : (
        <DataTable
          columns={columns}
          rows={data ?? []}
          loading={isLoading}
          error={error ? (error as Error).message : null}
          onRetry={() => refetch()}
          emptyTitle="لا توجد شركات مشترين"
        />
      )}
      {editing && (
        <CreditModal
          row={editing}
          onClose={() => setEditing(null)}
          onDone={() => {
            setEditing(null);
            qc.invalidateQueries({ queryKey: ['credit-companies'] });
          }}
        />
      )}
    </div>
  );
}

function CreditModal({ row, onClose, onDone }: { row: Row; onClose: () => void; onDone: () => void }) {
  const { toast } = useToast();
  const [limit, setLimit] = useState(row.credit_limit != null ? String(row.credit_limit) : '');
  const [from, setFrom] = useState(row.credit_from ?? '');
  const [to, setTo] = useState(row.credit_to ?? '');

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        credit_limit: limit ? Number(limit) : null,
        credit_from: from || null,
        credit_to: to || null,
      };
      if (payload.credit_limit != null && (!Number.isFinite(payload.credit_limit) || payload.credit_limit < 0))
        throw new Error('أدخل حدًا صحيحًا');
      const { error } = await supabase.from('companies').update(payload).eq('id', row.id);
      if (error) throw new Error(arError(error));
    },
    onSuccess: () => {
      toast('success', 'تم تحديث حد الكريديت');
      onDone();
    },
    onError: (e) => toast('error', (e as Error).message),
  });

  return (
    <Modal title={`كريديت — ${row.name_ar}`} open onClose={onClose}>
      <div className="space-y-4">
        <Field label="القيمة المسموح بها (د.ك)" hint="اتركه فارغًا لإلغاء الكريديت">
          <Input dir="ltr" type="number" step="0.001" min="0" value={limit} onChange={(e) => setLimit(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="من تاريخ">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field label="إلى تاريخ">
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </Field>
        </div>
        <div className="flex justify-end gap-2">
          <Btn variant="ghost" onClick={onClose} disabled={save.isPending}>إلغاء</Btn>
          <Btn variant="accent" busy={save.isPending} onClick={() => save.mutate()}>حفظ</Btn>
        </div>
      </div>
    </Modal>
  );
}
