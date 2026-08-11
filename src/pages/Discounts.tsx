// الخصومات (شاشة DISCOUNT في Figma) — على السكيما الفعلية:
// خصومات بنطاق (الكل/تخصص/فئة/منتج) + حد أدنى للطلب + أكواد خصم.
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, arError } from '../lib/supabase';
import { PageHeader, Btn, Field, Input, Select, Toggle, StatusChip, Money, Card } from '../components/ui';
import { DataTable, type Column } from '../components/DataTable';
import { Modal, ConfirmDialog } from '../components/Modal';
import { useToast } from '../components/Toast';
import { fmtDate } from '../lib/format';
import { discountScopeLabels } from '../lib/labels';

type Discount = {
  id: string;
  name_ar: string;
  type: 'percentage' | 'fixed';
  value: number;
  scope: string;
  specialty_id: string | null;
  category_id: string | null;
  product_id: string | null;
  seller_company_id: string | null;
  min_order_total: number;
  max_discount: number | null;
  starts_at: string;
  ends_at: string | null;
  is_active: boolean;
  requires_code: boolean;
  seller: { name_ar: string } | null;
};

type Code = {
  id: string;
  discount_id: string;
  code: string;
  usage_limit: number | null;
  per_user_limit: number;
  used_count: number;
  is_active: boolean;
};

export default function Discounts() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState<Discount | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Discount | null>(null);
  const [codesFor, setCodesFor] = useState<Discount | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['discounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('discounts')
        .select('*, seller:companies (name_ar)')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw new Error(arError(error));
      return data as unknown as Discount[];
    },
  });

  const toggleActive = useMutation({
    mutationFn: async (d: Discount) => {
      const { error } = await supabase.from('discounts').update({ is_active: !d.is_active }).eq('id', d.id);
      if (error) throw new Error(arError(error));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['discounts'] }),
    onError: (e) => toast('error', (e as Error).message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('discounts').delete().eq('id', id);
      if (error) throw new Error(arError(error));
    },
    onSuccess: () => {
      toast('success', 'تم حذف الخصم');
      setDeleting(null);
      qc.invalidateQueries({ queryKey: ['discounts'] });
    },
    onError: (e) => toast('error', (e as Error).message),
  });

  const columns: Column<Discount>[] = [
    {
      key: 'name',
      header: 'الخصم',
      render: (r) => (
        <div>
          <div className="font-medium">{r.name_ar}</div>
          <div className="text-xs text-subtext">{r.seller ? `بائع: ${r.seller.name_ar}` : 'خصم منصة'}</div>
        </div>
      ),
    },
    {
      key: 'value',
      header: 'القيمة',
      render: (r) => (
        <span className="font-bold text-accent" dir="ltr">
          {r.type === 'percentage' ? `${r.value}%` : `${r.value} د.ك`}
        </span>
      ),
    },
    { key: 'scope', header: 'النطاق', render: (r) => discountScopeLabels[r.scope] ?? r.scope },
    { key: 'min', header: 'حد أدنى للطلب', render: (r) => (Number(r.min_order_total) > 0 ? <Money value={r.min_order_total} /> : '—') },
    {
      key: 'period',
      header: 'الفترة',
      render: (r) => (
        <span className="text-xs">
          {fmtDate(r.starts_at)} ← {r.ends_at ? fmtDate(r.ends_at) : 'مفتوح'}
        </span>
      ),
    },
    {
      key: 'code',
      header: 'بكود؟',
      render: (r) =>
        r.requires_code ? (
          <button className="text-sm text-accent hover:underline" onClick={(e) => { e.stopPropagation(); setCodesFor(r); }}>
            الأكواد
          </button>
        ) : (
          <span className="text-xs text-subtext">تلقائي</span>
        ),
    },
    {
      key: 'active',
      header: 'مفعل',
      render: (r) => (
        <span onClick={(e) => e.stopPropagation()}>
          <Toggle checked={r.is_active} onChange={() => toggleActive.mutate(r)} />
        </span>
      ),
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
        title="سياسة الخصم"
        subtitle="خصومات تلقائية أو بكود — تُطبق داخل checkout في الداتابيز"
        actions={<Btn variant="accent" onClick={() => setEditing('new')}>+ إضافة خصم</Btn>}
      />
      <DataTable
        columns={columns}
        rows={data ?? []}
        loading={isLoading}
        error={error ? (error as Error).message : null}
        onRetry={() => refetch()}
        emptyTitle="لا توجد خصومات"
      />
      {editing && (
        <DiscountModal
          discount={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onDone={() => {
            setEditing(null);
            qc.invalidateQueries({ queryKey: ['discounts'] });
          }}
        />
      )}
      <ConfirmDialog
        open={!!deleting}
        title="حذف الخصم"
        message={`سيتم حذف «${deleting?.name_ar}» نهائيًا. متابعة؟`}
        confirmLabel="حذف"
        danger
        busy={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
        onClose={() => setDeleting(null)}
      />
      {codesFor && <CodesModal discount={codesFor} onClose={() => setCodesFor(null)} />}
    </div>
  );
}

function DiscountModal({ discount, onClose, onDone }: {
  discount: Discount | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    name_ar: discount?.name_ar ?? '',
    type: discount?.type ?? 'percentage',
    value: discount ? String(discount.value) : '',
    scope: discount?.scope ?? 'all',
    specialty_id: discount?.specialty_id ?? '',
    category_id: discount?.category_id ?? '',
    product_id: discount?.product_id ?? '',
    min_order_total: discount ? String(discount.min_order_total) : '0',
    max_discount: discount?.max_discount != null ? String(discount.max_discount) : '',
    ends_at: discount?.ends_at ? discount.ends_at.slice(0, 10) : '',
    requires_code: discount?.requires_code ?? false,
  });

  const { data: lookups } = useQuery({
    queryKey: ['discount-lookups'],
    queryFn: async () => {
      const [sp, cat, prod] = await Promise.all([
        supabase.from('specialties').select('id, name_ar').order('sort_order'),
        supabase.from('categories').select('id, name_ar').order('sort_order'),
        supabase.from('products').select('id, name_ar').eq('is_active', true).limit(500),
      ]);
      return { specialties: sp.data ?? [], categories: cat.data ?? [], products: prod.data ?? [] };
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name_ar: form.name_ar.trim(),
        type: form.type as 'percentage' | 'fixed',
        value: Number(form.value),
        scope: form.scope as 'all' | 'specialty' | 'category' | 'product',
        specialty_id: form.scope === 'specialty' ? form.specialty_id || null : null,
        category_id: form.scope === 'category' ? form.category_id || null : null,
        product_id: form.scope === 'product' ? form.product_id || null : null,
        min_order_total: Number(form.min_order_total) || 0,
        max_discount: form.max_discount ? Number(form.max_discount) : null,
        ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
        requires_code: form.requires_code,
      };
      if (!payload.name_ar) throw new Error('اسم الخصم مطلوب');
      if (!Number.isFinite(payload.value) || payload.value <= 0) throw new Error('قيمة الخصم غير صحيحة');
      const q = discount
        ? supabase.from('discounts').update(payload).eq('id', discount.id)
        : supabase.from('discounts').insert(payload);
      const { error } = await q;
      if (error) throw new Error(arError(error));
    },
    onSuccess: () => {
      toast('success', discount ? 'تم تحديث الخصم' : 'تمت إضافة الخصم');
      onDone();
    },
    onError: (e) => toast('error', (e as Error).message),
  });

  return (
    <Modal title={discount ? 'تعديل خصم' : 'إضافة خصم'} open onClose={onClose}>
      <div className="space-y-4">
        <Field label="اسم الخصم (عربي)">
          <Input value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="النوع">
            <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as 'percentage' | 'fixed' })}>
              <option value="percentage">نسبة %</option>
              <option value="fixed">مبلغ ثابت</option>
            </Select>
          </Field>
          <Field label={form.type === 'percentage' ? 'النسبة %' : 'المبلغ (د.ك)'}>
            <Input dir="ltr" type="number" step="0.001" min="0" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="النطاق">
            <Select value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })}>
              {Object.entries(discountScopeLabels).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </Select>
          </Field>
          {form.scope === 'specialty' && (
            <Field label="التخصص">
              <Select value={form.specialty_id} onChange={(e) => setForm({ ...form, specialty_id: e.target.value })}>
                <option value="">اختر…</option>
                {(lookups?.specialties ?? []).map((s) => (
                  <option key={s.id} value={s.id}>{s.name_ar}</option>
                ))}
              </Select>
            </Field>
          )}
          {form.scope === 'category' && (
            <Field label="الفئة">
              <Select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
                <option value="">اختر…</option>
                {(lookups?.categories ?? []).map((c) => (
                  <option key={c.id} value={c.id}>{c.name_ar}</option>
                ))}
              </Select>
            </Field>
          )}
          {form.scope === 'product' && (
            <Field label="المنتج">
              <Select value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })}>
                <option value="">اختر…</option>
                {(lookups?.products ?? []).map((p) => (
                  <option key={p.id} value={p.id}>{p.name_ar}</option>
                ))}
              </Select>
            </Field>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="حد أدنى لقيمة الطلب (د.ك)" hint="0 = بدون حد">
            <Input dir="ltr" type="number" step="0.001" min="0" value={form.min_order_total} onChange={(e) => setForm({ ...form, min_order_total: e.target.value })} />
          </Field>
          <Field label="سقف الخصم (د.ك)" hint="اختياري — للنسب المئوية">
            <Input dir="ltr" type="number" step="0.001" min="0" value={form.max_discount} onChange={(e) => setForm({ ...form, max_discount: e.target.value })} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="ينتهي في" hint="اتركه فارغًا ليبقى مفتوحًا">
            <Input type="date" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} />
          </Field>
          <Field label="يتطلب كود خصم؟" hint="أضف الأكواد بعد الحفظ">
            <div className="pt-1.5">
              <Toggle checked={form.requires_code} onChange={(v) => setForm({ ...form, requires_code: v })} />
            </div>
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

function CodesModal({ discount, onClose }: { discount: Discount; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [code, setCode] = useState('');
  const [usageLimit, setUsageLimit] = useState('');
  const [perUser, setPerUser] = useState('1');

  const { data, isLoading } = useQuery({
    queryKey: ['discount-codes', discount.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('discount_codes').select('*').eq('discount_id', discount.id);
      if (error) throw new Error(arError(error));
      return data as Code[];
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      if (!code.trim()) throw new Error('أدخل الكود');
      const { error } = await supabase.from('discount_codes').insert({
        discount_id: discount.id,
        code: code.trim().toUpperCase(),
        usage_limit: usageLimit ? Number(usageLimit) : null,
        per_user_limit: Number(perUser) || 1,
      });
      if (error) throw new Error(arError(error));
    },
    onSuccess: () => {
      toast('success', 'تمت إضافة الكود');
      setCode('');
      qc.invalidateQueries({ queryKey: ['discount-codes', discount.id] });
    },
    onError: (e) => toast('error', (e as Error).message),
  });

  const toggle = useMutation({
    mutationFn: async (c: Code) => {
      const { error } = await supabase.from('discount_codes').update({ is_active: !c.is_active }).eq('id', c.id);
      if (error) throw new Error(arError(error));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['discount-codes', discount.id] }),
    onError: (e) => toast('error', (e as Error).message),
  });

  return (
    <Modal title={`أكواد الخصم — ${discount.name_ar}`} open onClose={onClose}>
      <Card className="mb-4 space-y-3 border-dashed p-3">
        <div className="grid grid-cols-3 gap-2">
          <Field label="الكود">
            <Input dir="ltr" value={code} onChange={(e) => setCode(e.target.value)} placeholder="RAMADAN26" />
          </Field>
          <Field label="حد الاستخدام" hint="فارغ = بلا حد">
            <Input dir="ltr" type="number" min="1" value={usageLimit} onChange={(e) => setUsageLimit(e.target.value)} />
          </Field>
          <Field label="لكل مستخدم">
            <Input dir="ltr" type="number" min="1" value={perUser} onChange={(e) => setPerUser(e.target.value)} />
          </Field>
        </div>
        <Btn variant="accent" busy={add.isPending} onClick={() => add.mutate()}>إضافة كود</Btn>
      </Card>
      {isLoading ? (
        <div className="py-6 text-center text-sm text-subtext">جارٍ التحميل…</div>
      ) : (data ?? []).length === 0 ? (
        <p className="py-4 text-center text-sm text-subtext">لا توجد أكواد بعد</p>
      ) : (
        <div className="divide-y divide-line">
          {(data ?? []).map((c) => (
            <div key={c.id} className="flex items-center gap-3 py-2.5 text-sm">
              <span className="flex-1 font-bold" dir="ltr">{c.code}</span>
              <span className="text-xs text-subtext" dir="ltr">
                {c.used_count}/{c.usage_limit ?? '∞'}
              </span>
              <StatusChip label={c.is_active ? 'مفعل' : 'موقوف'} tone={c.is_active ? 'green' : 'gray'} />
              <Toggle checked={c.is_active} onChange={() => toggle.mutate(c)} />
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
