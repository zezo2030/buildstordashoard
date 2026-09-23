// أكواد الخصم — إنشاء وتعطيل ومتابعة الاستخدام.
//
// الأكواد كانت بتتعمل من الداتابيز مباشرة (الكود الوحيد الموجود كان متزروع في
// `seed.sql`)، فمافيش طريقة للأدمن يعمل كود ولا يوقفه. والحاجة اللي فتحت
// الموضوع: كود «توصيل مجاني» — أقوى من كل قواعد رسوم التوصيل — ملوش أي مدخل
// في الواجهة أصلاً.
//
// الكود = صفّين: `discounts` (القيمة والشروط) + `discount_codes` (النص وحدود
// الاستخدام). الاتنين لازم يكونوا مفعّلين عشان `preview_checkout` تقبل الكود،
// فالمفتاح هنا بيقلّبهم مع بعض — مفتاح بيوقف نص الكود وبيسيب الخصم شغّال كان
// هيسيب الأدمن يفتكر إنه قفله.
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, arError } from '../lib/supabase';
import { PageHeader, Btn, Field, Input, Select, Toggle, Money, StatusChip } from '../components/ui';
import { DataTable, type Column } from '../components/DataTable';
import { Modal, ConfirmDialog } from '../components/Modal';
import { useToast } from '../components/Toast';
import { fmtDate } from '../lib/format';

type DiscountRow = {
  id: string;
  name_ar: string;
  type: 'percentage' | 'fixed';
  value: number;
  free_delivery: boolean;
  min_order_total: number;
  max_discount: number | null;
  ends_at: string | null;
  is_active: boolean;
};

type CodeRow = {
  id: string;
  code: string;
  is_active: boolean;
  usage_limit: number | null;
  used_count: number;
  per_user_limit: number;
  discounts: DiscountRow;
};

/** نوع الكود زي ما الأدمن بيفكّر فيه — القيمة والعلم بيتشتقوا منه. */
type CodeKind = 'percentage' | 'fixed' | 'free_delivery';

const KIND_LABELS: Record<CodeKind, string> = {
  percentage: 'نسبة من قيمة الطلب',
  fixed: 'مبلغ ثابت',
  free_delivery: 'توصيل مجاني فقط',
};

type CodeForm = {
  code: string;
  name_ar: string;
  kind: CodeKind;
  value: string;
  freeDelivery: boolean;
  minOrderTotal: string;
  maxDiscount: string;
  usageLimit: string;
  perUserLimit: string;
  endsAt: string;
};

const emptyForm = (): CodeForm => ({
  code: '',
  name_ar: '',
  kind: 'percentage',
  value: '10',
  freeDelivery: false,
  minOrderTotal: '0',
  maxDiscount: '',
  usageLimit: '',
  perUserLimit: '1',
  endsAt: '',
});

export default function DiscountCodes() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<CodeRow | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['discount-codes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('discount_codes')
        .select(
          'id, code, is_active, usage_limit, used_count, per_user_limit,' +
          ' discounts!inner (id, name_ar, type, value, free_delivery, min_order_total,' +
          ' max_discount, ends_at, is_active)',
        )
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw new Error(arError(error));
      return data as unknown as CodeRow[];
    },
  });

  // الصفّين بيتقلبوا مع بعض: الكود مايشتغلش غير لما يكون الاتنين مفعّلين.
  const toggleActive = useMutation({
    mutationFn: async (row: CodeRow) => {
      const next = !(row.is_active && row.discounts.is_active);
      const code = await supabase.from('discount_codes').update({ is_active: next }).eq('id', row.id);
      if (code.error) throw new Error(arError(code.error));
      const disc = await supabase.from('discounts').update({ is_active: next }).eq('id', row.discounts.id);
      if (disc.error) throw new Error(arError(disc.error));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['discount-codes'] }),
    onError: (e) => toast('error', (e as Error).message),
  });

  const remove = useMutation({
    mutationFn: async (row: CodeRow) => {
      const code = await supabase.from('discount_codes').delete().eq('id', row.id);
      if (code.error) throw new Error(arError(code.error));
      // الخصم بيتشال معاه — هو اتعمل عشان الكود ده بس. لو مربوط بحاجة تانية
      // الداتابيز هترفض والرسالة هتظهر زي ما هي.
      const disc = await supabase.from('discounts').delete().eq('id', row.discounts.id);
      if (disc.error) throw new Error(arError(disc.error));
    },
    onSuccess: () => {
      toast('success', 'تم حذف الكود');
      setDeleting(null);
      qc.invalidateQueries({ queryKey: ['discount-codes'] });
    },
    onError: (e) => toast('error', (e as Error).message),
  });

  const columns: Column<CodeRow>[] = [
    {
      key: 'code',
      header: 'الكود',
      render: (r) => (
        <div>
          <div className="font-mono font-bold" dir="ltr">{r.code}</div>
          <div className="text-xs text-subtext">{r.discounts.name_ar}</div>
        </div>
      ),
    },
    {
      key: 'value',
      header: 'الخصم',
      render: (r) => (
        <div className="flex flex-wrap items-center gap-1.5">
          {Number(r.discounts.value) > 0 && (
            <span className="font-medium">
              {r.discounts.type === 'percentage'
                ? `${Number(r.discounts.value)}٪`
                : <Money value={r.discounts.value} />}
            </span>
          )}
          {r.discounts.free_delivery && <StatusChip label="توصيل مجاني" tone="green" />}
        </div>
      ),
    },
    {
      key: 'conditions',
      header: 'الشروط',
      render: (r) => (
        <div className="text-xs text-subtext">
          <div>الحد الأدنى <Money value={r.discounts.min_order_total} /></div>
          {r.discounts.max_discount != null && (
            <div>أقصى خصم <Money value={r.discounts.max_discount} /></div>
          )}
          <div>{r.per_user_limit} مرة لكل مشتري</div>
        </div>
      ),
    },
    {
      key: 'usage',
      header: 'الاستخدام',
      render: (r) => (
        <span dir="ltr" className="tabular-nums">
          {r.used_count}
          {r.usage_limit != null ? ` / ${r.usage_limit}` : ' / ∞'}
        </span>
      ),
    },
    {
      key: 'ends',
      header: 'ينتهي',
      render: (r) => (
        <span className="text-xs text-subtext">
          {r.discounts.ends_at ? fmtDate(r.discounts.ends_at) : 'بدون تاريخ'}
        </span>
      ),
    },
    {
      key: 'active',
      header: 'الحالة',
      render: (r) => (
        <Toggle
          checked={r.is_active && r.discounts.is_active}
          onChange={() => toggleActive.mutate(r)}
        />
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (r) => (
        <Btn variant="ghost" className="px-2.5 py-1 text-xs text-danger" onClick={() => setDeleting(r)}>
          حذف
        </Btn>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="أكواد الخصم"
        subtitle="أكواد يكتبها المشتري في شاشة الدفع. كود «التوصيل المجاني» بيلغي رسوم التوصيل كلها مهما كانت قواعد البائع."
        actions={<Btn variant="accent" onClick={() => setCreating(true)}>+ كود جديد</Btn>}
      />
      <DataTable
        columns={columns}
        rows={data ?? []}
        loading={isLoading}
        error={error ? (error as Error).message : null}
        onRetry={() => refetch()}
        emptyTitle="لا توجد أكواد بعد"
      />
      {creating && (
        <CodeModal
          onClose={() => setCreating(false)}
          onDone={() => {
            setCreating(false);
            qc.invalidateQueries({ queryKey: ['discount-codes'] });
          }}
        />
      )}
      <ConfirmDialog
        open={!!deleting}
        title="حذف الكود"
        message={deleting ? `سيتم حذف «${deleting.code}» نهائيًا. لو الكود اتستخدم قبل كده يفضل أفضل توقفه بدل حذفه.` : null}
        confirmLabel="حذف"
        danger
        busy={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting)}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}

const MONEY_RE = /^\d{1,7}(\.\d{1,3})?$/;

function CodeModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState<CodeForm>(emptyForm());
  const set = <K extends keyof CodeForm>(key: K, value: CodeForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const save = useMutation({
    mutationFn: async () => {
      const code = form.code.trim().toUpperCase();
      if (!/^[A-Z0-9_-]{3,20}$/.test(code)) {
        throw new Error('الكود حروف إنجليزية وأرقام من 3 لـ20 خانة');
      }
      if (!form.name_ar.trim()) throw new Error('اكتب اسمًا للكود');

      const freeDelivery = form.kind === 'free_delivery' || form.freeDelivery;
      // «توصيل مجاني فقط» = قيمة صفر: القيد في الداتابيز بيسمح بالصفر للكود ده
      // لوحده (`value > 0 or free_delivery`).
      const value = form.kind === 'free_delivery' ? 0 : Number(form.value);
      if (form.kind !== 'free_delivery') {
        if (!Number.isFinite(value) || value <= 0) throw new Error('قيمة الخصم لازم تكون أكبر من صفر');
        if (form.kind === 'percentage' && value > 100) throw new Error('النسبة ما تزيدش عن 100٪');
      }
      if (form.minOrderTotal && !MONEY_RE.test(form.minOrderTotal.trim())) {
        throw new Error('الحد الأدنى مبلغ بصيغة 0.000');
      }
      if (form.maxDiscount && !MONEY_RE.test(form.maxDiscount.trim())) {
        throw new Error('أقصى خصم مبلغ بصيغة 0.000');
      }

      const { data: discount, error: discErr } = await supabase
        .from('discounts')
        .insert({
          name_ar: form.name_ar.trim(),
          type: form.kind === 'fixed' ? 'fixed' : 'percentage',
          value,
          scope: 'all',
          free_delivery: freeDelivery,
          requires_code: true,
          min_order_total: Number(form.minOrderTotal || 0),
          max_discount: form.maxDiscount.trim() ? Number(form.maxDiscount) : null,
          ends_at: form.endsAt ? new Date(`${form.endsAt}T23:59:59`).toISOString() : null,
          is_active: true,
        })
        .select('id')
        .single();
      if (discErr) throw new Error(arError(discErr));

      const { error: codeErr } = await supabase.from('discount_codes').insert({
        code,
        discount_id: discount.id,
        is_active: true,
        usage_limit: form.usageLimit.trim() ? Number(form.usageLimit) : null,
        per_user_limit: Number(form.perUserLimit || 1),
      });
      if (codeErr) {
        // الصفّين بيتكتبوا ورا بعض من غير معاملة واحدة، فلو الكود فشل (اسم
        // مكرر مثلاً) بنشيل الخصم اليتيم بدل ما يفضل في الجدول بلا كود.
        await supabase.from('discounts').delete().eq('id', discount.id);
        throw new Error(arError(codeErr));
      }
    },
    onSuccess: () => {
      toast('success', 'تم إنشاء الكود');
      onDone();
    },
    onError: (e) => toast('error', (e as Error).message),
  });

  return (
    <Modal title="كود خصم جديد" open onClose={onClose}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="الكود" hint="اللي المشتري بيكتبه — إنجليزي بدون مسافات">
          <Input
            dir="ltr"
            value={form.code}
            onChange={(e) => set('code', e.target.value.toUpperCase())}
            placeholder="FREESHIP"
          />
        </Field>
        <Field label="الاسم" hint="للإدارة بس — مش بيظهر للمشتري">
          <Input value={form.name_ar} onChange={(e) => set('name_ar', e.target.value)} />
        </Field>
      </div>

      <Field label="نوع الكود">
        <Select value={form.kind} onChange={(e) => set('kind', e.target.value as CodeKind)}>
          {(Object.keys(KIND_LABELS) as CodeKind[]).map((k) => (
            <option key={k} value={k}>{KIND_LABELS[k]}</option>
          ))}
        </Select>
      </Field>

      {form.kind !== 'free_delivery' && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={form.kind === 'percentage' ? 'النسبة (٪)' : 'المبلغ (د.ك)'}>
            <Input dir="ltr" value={form.value} onChange={(e) => set('value', e.target.value)} />
          </Field>
          {form.kind === 'percentage' && (
            <Field label="أقصى خصم (د.ك)" hint="اختياري — سقف للمبلغ المخصوم">
              <Input dir="ltr" value={form.maxDiscount} onChange={(e) => set('maxDiscount', e.target.value)} />
            </Field>
          )}
        </div>
      )}

      {form.kind !== 'free_delivery' && (
        <label className="mb-3 flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 accent-accent"
            checked={form.freeDelivery}
            onChange={(e) => set('freeDelivery', e.target.checked)}
          />
          ومعاه توصيل مجاني كمان
        </label>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="الحد الأدنى للطلب (د.ك)">
          <Input dir="ltr" value={form.minOrderTotal} onChange={(e) => set('minOrderTotal', e.target.value)} />
        </Field>
        <Field label="ينتهي في" hint="اختياري">
          <Input type="date" value={form.endsAt} onChange={(e) => set('endsAt', e.target.value)} />
        </Field>
        <Field label="عدد مرات الاستخدام" hint="فاضي = بلا حد">
          <Input dir="ltr" value={form.usageLimit} onChange={(e) => set('usageLimit', e.target.value)} />
        </Field>
        <Field label="لكل مشتري">
          <Input dir="ltr" value={form.perUserLimit} onChange={(e) => set('perUserLimit', e.target.value)} />
        </Field>
      </div>

      <div className="mt-3 flex justify-end gap-2">
        <Btn variant="ghost" onClick={onClose}>إلغاء</Btn>
        <Btn variant="accent" busy={save.isPending} onClick={() => save.mutate()}>حفظ</Btn>
      </div>
    </Modal>
  );
}
