// رسوم التوصيل (شاشة delivery fees في Figma) — قواعد عامة أو لبائع محدد:
// محافظة/منطقة + حد أدنى للطلب + رسوم + مجاني فوق مبلغ + أولوية.
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, arError } from '../lib/supabase';
import { PageHeader, Btn, Field, Input, Select, Toggle, Money } from '../components/ui';
import { DataTable, type Column } from '../components/DataTable';
import { Modal, ConfirmDialog } from '../components/Modal';
import { useToast } from '../components/Toast';

type Rule = {
  id: string;
  seller_company_id: string | null;
  governorate: string | null;
  area: string | null;
  min_order_total: number;
  fee: number;
  free_above: number | null;
  priority: number;
  is_active: boolean;
  seller: { name_ar: string } | null;
};

const GOVERNORATES = ['العاصمة', 'حولي', 'الفروانية', 'مبارك الكبير', 'الأحمدي', 'الجهراء'];

export default function DeliveryFees() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState<Rule | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Rule | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['delivery-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('delivery_fee_rules')
        .select('*, seller:companies (name_ar)')
        .order('priority', { ascending: false })
        .limit(200);
      if (error) throw new Error(arError(error));
      return data as unknown as Rule[];
    },
  });

  const toggleActive = useMutation({
    mutationFn: async (r: Rule) => {
      const { error } = await supabase.from('delivery_fee_rules').update({ is_active: !r.is_active }).eq('id', r.id);
      if (error) throw new Error(arError(error));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['delivery-rules'] }),
    onError: (e) => toast('error', (e as Error).message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('delivery_fee_rules').delete().eq('id', id);
      if (error) throw new Error(arError(error));
    },
    onSuccess: () => {
      toast('success', 'تم حذف القاعدة');
      setDeleting(null);
      qc.invalidateQueries({ queryKey: ['delivery-rules'] });
    },
    onError: (e) => toast('error', (e as Error).message),
  });

  const columns: Column<Rule>[] = [
    {
      key: 'where',
      header: 'المحافظة / المنطقة',
      render: (r) => (
        <div>
          <div className="font-medium">{r.governorate ?? 'كل الكويت'}</div>
          {r.area && <div className="text-xs text-subtext">{r.area}</div>}
        </div>
      ),
    },
    { key: 'seller', header: 'البائع', render: (r) => r.seller?.name_ar ?? <span className="text-subtext">قاعدة عامة</span> },
    { key: 'min', header: 'من قيمة', render: (r) => <Money value={r.min_order_total} /> },
    { key: 'fee', header: 'رسوم التوصيل', render: (r) => <span className="font-bold text-accent"><Money value={r.fee} /></span> },
    {
      key: 'free',
      header: 'مجاني فوق',
      render: (r) => (r.free_above != null ? <span className="text-success"><Money value={r.free_above} /></span> : '—'),
    },
    { key: 'priority', header: 'الأولوية', render: (r) => <span dir="ltr">{r.priority}</span> },
    {
      key: 'active',
      header: 'الحالة',
      render: (r) => <Toggle checked={r.is_active} onChange={() => toggleActive.mutate(r)} />,
    },
    {
      key: 'actions',
      header: '',
      render: (r) => (
        <div className="flex gap-2">
          <Btn variant="ghost" onClick={() => setEditing(r)}>تعديل</Btn>
          <Btn variant="ghost" className="text-danger" onClick={() => setDeleting(r)}>حذف</Btn>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="رسوم التوصيل"
        subtitle="القاعدة الأعلى أولوية المطابقة للمحافظة/القيمة هي التي تُطبق في checkout"
        actions={<Btn variant="accent" onClick={() => setEditing('new')}>+ إضافة قاعدة</Btn>}
      />
      <DataTable
        columns={columns}
        rows={data ?? []}
        loading={isLoading}
        error={error ? (error as Error).message : null}
        onRetry={() => refetch()}
        emptyTitle="لا توجد قواعد توصيل"
      />
      {editing && (
        <RuleModal
          rule={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onDone={() => {
            setEditing(null);
            qc.invalidateQueries({ queryKey: ['delivery-rules'] });
          }}
        />
      )}
      <ConfirmDialog
        open={!!deleting}
        title="حذف قاعدة التوصيل"
        message="سيتم حذف القاعدة نهائيًا. متابعة؟"
        confirmLabel="حذف"
        danger
        busy={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}

function RuleModal({ rule, onClose, onDone }: { rule: Rule | null; onClose: () => void; onDone: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    governorate: rule?.governorate ?? '',
    area: rule?.area ?? '',
    min_order_total: rule ? String(rule.min_order_total) : '0',
    fee: rule ? String(rule.fee) : '',
    free_above: rule?.free_above != null ? String(rule.free_above) : '',
    priority: rule ? String(rule.priority) : '0',
    seller_company_id: rule?.seller_company_id ?? '',
  });

  const { data: sellers } = useQuery({
    queryKey: ['seller-companies-list'],
    queryFn: async () => {
      const { data } = await supabase.from('companies').select('id, name_ar').eq('type', 'seller').order('name_ar');
      return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const fee = Number(form.fee);
      if (!Number.isFinite(fee) || fee < 0) throw new Error('أدخل رسومًا صحيحة');
      const payload = {
        governorate: form.governorate || null,
        area: form.area.trim() || null,
        min_order_total: Number(form.min_order_total) || 0,
        fee,
        free_above: form.free_above ? Number(form.free_above) : null,
        priority: Number(form.priority) || 0,
        seller_company_id: form.seller_company_id || null,
      };
      const q = rule
        ? supabase.from('delivery_fee_rules').update(payload).eq('id', rule.id)
        : supabase.from('delivery_fee_rules').insert(payload);
      const { error } = await q;
      if (error) throw new Error(arError(error));
    },
    onSuccess: () => {
      toast('success', rule ? 'تم تحديث القاعدة' : 'تمت إضافة القاعدة');
      onDone();
    },
    onError: (e) => toast('error', (e as Error).message),
  });

  return (
    <Modal title={rule ? 'تعديل قاعدة توصيل' : 'إضافة قاعدة توصيل'} open onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="المحافظة" hint="فارغ = كل الكويت">
            <Select value={form.governorate} onChange={(e) => setForm({ ...form, governorate: e.target.value })}>
              <option value="">كل الكويت</option>
              {GOVERNORATES.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </Select>
          </Field>
          <Field label="المنطقة" hint="اختياري">
            <Input value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} />
          </Field>
        </div>
        <Field label="البائع" hint="فارغ = قاعدة عامة للمنصة">
          <Select value={form.seller_company_id} onChange={(e) => setForm({ ...form, seller_company_id: e.target.value })}>
            <option value="">قاعدة عامة</option>
            {(sellers ?? []).map((s) => (
              <option key={s.id} value={s.id}>{s.name_ar}</option>
            ))}
          </Select>
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="من قيمة طلب (د.ك)">
            <Input dir="ltr" type="number" step="0.001" min="0" value={form.min_order_total} onChange={(e) => setForm({ ...form, min_order_total: e.target.value })} />
          </Field>
          <Field label="الرسوم (د.ك)">
            <Input dir="ltr" type="number" step="0.001" min="0" value={form.fee} onChange={(e) => setForm({ ...form, fee: e.target.value })} />
          </Field>
          <Field label="مجاني فوق (د.ك)" hint="اختياري">
            <Input dir="ltr" type="number" step="0.001" min="0" value={form.free_above} onChange={(e) => setForm({ ...form, free_above: e.target.value })} />
          </Field>
        </div>
        <Field label="الأولوية" hint="الأعلى يفوز عند تطابق أكثر من قاعدة">
          <Input dir="ltr" type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="w-32" />
        </Field>
        <div className="flex justify-end gap-2">
          <Btn variant="ghost" onClick={onClose} disabled={save.isPending}>إلغاء</Btn>
          <Btn variant="accent" busy={save.isPending} onClick={() => save.mutate()}>حفظ</Btn>
        </div>
      </div>
    </Modal>
  );
}
