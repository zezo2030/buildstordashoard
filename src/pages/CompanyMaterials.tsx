// مواد الشركة — صفحة مستقلة: عرض المواد الحالية + إضافة جماعية من الكتalog.
import { useMemo, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, FileSpreadsheet, ImagePlus, PackagePlus, Trash2 } from 'lucide-react';
import { supabase, arError } from '../lib/supabase';
import {
  PageHeader, Btn, Card, Field, Input, Money, Select, Spinner, ErrorState, Toggle,
} from '../components/ui';
import { DataTable, type Column } from '../components/DataTable';
import { Modal, ConfirmDialog } from '../components/Modal';
import { LinkCompanyProductsModal } from '../components/LinkCompanyProductsModal';
import { useToast } from '../components/Toast';

type Tab = 'list' | 'add';

type SellerOfferRow = {
  id: string;
  price: number;
  compare_at_price: number | null;
  stock_qty: number | null;
  min_order_qty: number;
  origin_country: string | null;
  is_active: boolean;
  track_stock: boolean;
  product: {
    id: string;
    sku: string;
    name_ar: string;
    images: string[];
    unit_id: string;
    specialty_id: string;
    specialty: { name_ar: string } | null;
    category: { name_ar: string } | null;
    unit: { id: string; name_ar: string } | null;
  } | null;
};

type CatalogProduct = {
  id: string;
  sku: string;
  name_ar: string;
  unit_id: string;
  specialty_id: string;
  specialty: { name_ar: string } | null;
};

type OfferForm = {
  price: string;
  compare_at_price: string;
  origin_country: string;
  min_order_qty: string;
  stock_qty: string;
  track_stock: boolean;
  is_active: boolean;
};

const defaultBulk = (): OfferForm => ({
  price: '',
  compare_at_price: '',
  origin_country: '',
  min_order_qty: '1',
  stock_qty: '100',
  track_stock: true,
  is_active: true,
});

export default function CompanyMaterials() {
  const { id: companyId } = useParams<{ id: string }>();
  const [tab, setTab] = useState<Tab>('list');
  const [linkOpen, setLinkOpen] = useState(false);

  const { data: company, isLoading, error, refetch } = useQuery({
    queryKey: ['company-materials-meta', companyId],
    queryFn: async () => {
      const { data, error: qErr } = await supabase
        .from('companies')
        .select('id, name_ar, type')
        .eq('id', companyId!)
        .single();
      if (qErr) throw new Error(arError(qErr));
      if (data.type !== 'seller') throw new Error('إدارة المواد متاحة لشركات البائع فقط');
      return data;
    },
  });

  if (isLoading) return <Spinner />;
  if (error || !company)
    return <ErrorState message={(error as Error)?.message ?? 'الشركة غير موجودة'} onRetry={() => refetch()} />;

  return (
    <div>
      <PageHeader
        title={`مواد — ${company.name_ar}`}
        subtitle="عرض وتعديل مواد الشركة أو إضافة مواد جديدة دفعة واحدة"
        actions={
          <>
            <Btn variant="ghost" onClick={() => setLinkOpen(true)}>
              <FileSpreadsheet size={16} />
              ربط من Excel
            </Btn>
            <Link
              to={`/companies/${companyId}`}
              className="flex items-center gap-1 text-sm text-subtext hover:text-primary"
            >
              <ArrowRight size={15} /> رجوع لتفاصيل الشركة
            </Link>
          </>
        }
      />

      <div className="mb-4 flex gap-2 border-b border-line pb-1">
        <TabButton active={tab === 'list'} onClick={() => setTab('list')}>المواد الحالية</TabButton>
        <TabButton active={tab === 'add'} onClick={() => setTab('add')}>إضافة مواد</TabButton>
      </div>

      {tab === 'list' ? (
        <MaterialsListTab companyId={company.id} companyName={company.name_ar} />
      ) : (
        <MaterialsBulkAddTab companyId={company.id} onAdded={() => setTab('list')} />
      )}

      {linkOpen && (
        <LinkCompanyProductsModal
          open
          companyId={company.id}
          companyName={company.name_ar}
          onClose={() => setLinkOpen(false)}
          onDone={() => setLinkOpen(false)}
        />
      )}
    </div>
  );
}

function TabButton({ active, onClick, children }: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-t-lg px-4 py-2 text-sm font-medium transition-colors ${
        active
          ? 'border border-b-0 border-line bg-white text-primary'
          : 'text-subtext hover:bg-surface hover:text-primary'
      }`}
    >
      {children}
    </button>
  );
}

function MaterialsListTab({ companyId, companyName }: { companyId: string; companyName: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [specialty, setSpecialty] = useState('all');
  const [editor, setEditor] = useState<SellerOfferRow | null>(null);
  const [removeTarget, setRemoveTarget] = useState<SellerOfferRow | null>(null);

  const queryKey = ['company-seller-products', companyId] as const;

  const { data: specialties } = useQuery({
    queryKey: ['specialties-list'],
    queryFn: async () => {
      const { data } = await supabase.from('specialties').select('id, name_ar').order('sort_order');
      return data ?? [];
    },
  });

  const { data: offers, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error: qErr } = await supabase
        .from('seller_products')
        .select(`
          id, price, compare_at_price, stock_qty, min_order_qty, origin_country, is_active, track_stock,
          product:products (
            id, sku, name_ar, images, unit_id, specialty_id,
            specialty:specialties (name_ar),
            category:categories (name_ar),
            unit:units (id, name_ar)
          )
        `)
        .eq('seller_company_id', companyId)
        .order('created_at', { ascending: false });
      if (qErr) throw new Error(arError(qErr));
      return (data ?? []) as unknown as SellerOfferRow[];
    },
  });

  const toggleActive = useMutation({
    mutationFn: async (row: SellerOfferRow) => {
      const { error: qErr } = await supabase
        .from('seller_products')
        .update({ is_active: !row.is_active })
        .eq('id', row.id);
      if (qErr) throw new Error(arError(qErr));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      toast('success', 'تم تحديث حالة العرض');
    },
    onError: (e) => toast('error', (e as Error).message),
  });

  const removeOffer = useMutation({
    mutationFn: async (row: SellerOfferRow) => {
      const { error: qErr } = await supabase.from('seller_products').delete().eq('id', row.id);
      if (qErr) throw new Error(arError(qErr));
    },
    onSuccess: () => {
      setRemoveTarget(null);
      qc.invalidateQueries({ queryKey });
      qc.invalidateQueries({ queryKey: ['company', companyId] });
      toast('success', 'تم إزالة المنتج من الشركة');
    },
    onError: (e) => toast('error', (e as Error).message),
  });

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return (offers ?? []).filter((row) => {
      const p = row.product;
      if (!p) return false;
      if (specialty !== 'all' && p.specialty_id !== specialty) return false;
      if (!term) return true;
      return p.name_ar.toLocaleLowerCase().includes(term) || p.sku.toLocaleLowerCase().includes(term);
    });
  }, [offers, search, specialty]);

  const columns: Column<SellerOfferRow>[] = [
    {
      key: 'product',
      header: 'المنتج',
      render: (r) => (
        <div className="flex items-center gap-3">
          <div className="size-10 shrink-0 overflow-hidden rounded-lg bg-surface ring-1 ring-line">
            {r.product?.images?.[0] ? (
              <img src={r.product.images[0]} alt="" className="size-full object-cover" />
            ) : (
              <div className="grid size-full place-items-center text-subtext">
                <ImagePlus size={14} />
              </div>
            )}
          </div>
          <div>
            <div className="font-medium">{r.product?.name_ar ?? '—'}</div>
            <div className="text-xs text-subtext" dir="ltr">{r.product?.sku ?? '—'}</div>
          </div>
        </div>
      ),
    },
    { key: 'specialty', header: 'التخصص', render: (r) => r.product?.specialty?.name_ar ?? '—' },
    { key: 'category', header: 'الفئة', render: (r) => r.product?.category?.name_ar ?? '—' },
    { key: 'unit', header: 'الوحدة', render: (r) => r.product?.unit?.name_ar ?? '—' },
    { key: 'origin', header: 'المنشأ', render: (r) => r.origin_country ?? '—' },
    { key: 'min', header: 'حد أدنى', render: (r) => <span dir="ltr">{r.min_order_qty}</span> },
    {
      key: 'stock',
      header: 'المخزون',
      render: (r) => (
        r.track_stock
          ? <span dir="ltr">{r.stock_qty ?? '—'}</span>
          : <span className="text-subtext">غير محدود</span>
      ),
    },
    { key: 'price', header: 'السعر', render: (r) => <Money value={r.price} /> },
    {
      key: 'active',
      header: 'نشط',
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
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Btn variant="ghost" onClick={() => setEditor(r)}>تعديل</Btn>
          <button
            type="button"
            className="rounded-lg p-2 text-danger hover:bg-red-50"
            title="إزالة"
            onClick={() => setRemoveTarget(r)}
          >
            <Trash2 size={15} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <Card className="mb-4 p-4">
        <p className="text-sm text-subtext">
          {offers?.length ?? 0} مادة معروضة من {companyName}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Input
            placeholder="بحث بالاسم/SKU…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-56"
          />
          <Select value={specialty} onChange={(e) => setSpecialty(e.target.value)} className="w-44">
            <option value="all">كل التخصصات</option>
            {(specialties ?? []).map((s) => (
              <option key={s.id} value={s.id}>{s.name_ar}</option>
            ))}
          </Select>
        </div>
      </Card>

      <DataTable
        columns={columns}
        rows={filtered}
        loading={isLoading}
        error={error ? (error as Error).message : null}
        onRetry={() => refetch()}
        onRowClick={(row) => setEditor(row)}
        emptyTitle="لا توجد مواد لهذه الشركة — انتقل لتبويب «إضافة مواد»"
      />

      {editor && (
        <OfferEditModal
          offer={editor}
          onClose={() => setEditor(null)}
          onDone={() => {
            setEditor(null);
            qc.invalidateQueries({ queryKey });
            qc.invalidateQueries({ queryKey: ['company', companyId] });
          }}
        />
      )}

      <ConfirmDialog
        open={!!removeTarget}
        title="إزالة المادة"
        message={removeTarget ? (
          <>هل تريد إزالة <strong>{removeTarget.product?.name_ar}</strong>؟</>
        ) : null}
        confirmLabel="إزالة"
        danger
        busy={removeOffer.isPending}
        onConfirm={() => removeTarget && removeOffer.mutate(removeTarget)}
        onClose={() => setRemoveTarget(null)}
      />
    </>
  );
}

function MaterialsBulkAddTab({ companyId, onAdded }: { companyId: string; onAdded: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [specialty, setSpecialty] = useState('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [defaults, setDefaults] = useState<OfferForm>(defaultBulk);

  const { data: specialties } = useQuery({
    queryKey: ['specialties-list'],
    queryFn: async () => {
      const { data } = await supabase.from('specialties').select('id, name_ar').order('sort_order');
      return data ?? [];
    },
  });

  const { data: assignedIds } = useQuery({
    queryKey: ['company-seller-products', companyId],
    queryFn: async () => {
      const { data, error: qErr } = await supabase
        .from('seller_products')
        .select('product_id')
        .eq('seller_company_id', companyId);
      if (qErr) throw new Error(arError(qErr));
      return new Set((data ?? []).map((r) => r.product_id));
    },
  });

  const { data: catalog, isLoading, error, refetch } = useQuery({
    queryKey: ['catalog-products-bulk'],
    queryFn: async () => {
      const { data, error: qErr } = await supabase
        .from('products')
        .select('id, sku, name_ar, unit_id, specialty_id, specialty:specialties (name_ar)')
        .eq('is_active', true)
        .order('name_ar');
      if (qErr) throw new Error(arError(qErr));
      return (data ?? []) as unknown as CatalogProduct[];
    },
  });

  const available = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return (catalog ?? []).filter((p) => {
      if (assignedIds?.has(p.id)) return false;
      if (specialty !== 'all' && p.specialty_id !== specialty) return false;
      if (!term) return true;
      return p.name_ar.toLocaleLowerCase().includes(term) || p.sku.toLocaleLowerCase().includes(term);
    });
  }, [catalog, assignedIds, search, specialty]);

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllVisible = () => {
    const visibleIds = available.map((p) => p.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) visibleIds.forEach((id) => next.delete(id));
      else visibleIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const bulkAdd = useMutation({
    mutationFn: async () => {
      const price = Number(defaults.price);
      if (!Number.isFinite(price) || price < 0) throw new Error('أدخل سعرًا افتراضيًا صالحًا');
      const minOrder = Number(defaults.min_order_qty);
      if (!Number.isFinite(minOrder) || minOrder <= 0) throw new Error('الحد الأدنى غير صالح');
      const compareAt = defaults.compare_at_price.trim() ? Number(defaults.compare_at_price) : null;
      if (compareAt != null && (!Number.isFinite(compareAt) || compareAt < price)) {
        throw new Error('سعر المقارنة يجب أن يكون ≥ السعر');
      }
      const stockQty = defaults.track_stock && defaults.stock_qty.trim()
        ? Number(defaults.stock_qty)
        : null;
      if (defaults.track_stock && stockQty != null && (!Number.isFinite(stockQty) || stockQty < 0)) {
        throw new Error('المخزون غير صالح');
      }
      if (selected.size === 0) throw new Error('اختر مادة واحدة على الأقل');

      const byId = new Map((catalog ?? []).map((p) => [p.id, p]));
      const rows = [...selected].map((productId) => {
        const p = byId.get(productId);
        if (!p) throw new Error('منتج غير موجود');
        return {
          seller_company_id: companyId,
          product_id: productId,
          unit_id: p.unit_id,
          price,
          compare_at_price: compareAt,
          origin_country: defaults.origin_country.trim() || null,
          min_order_qty: minOrder,
          stock_qty: stockQty,
          track_stock: defaults.track_stock,
          is_active: defaults.is_active,
        };
      });

      const { error: qErr } = await supabase.from('seller_products').insert(rows);
      if (qErr) throw new Error(arError(qErr));
      return rows.length;
    },
    onSuccess: (count) => {
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ['company-seller-products', companyId] });
      qc.invalidateQueries({ queryKey: ['company', companyId] });
      toast('success', `تمت إضافة ${count} مادة للشركة`);
      onAdded();
    },
    onError: (e) => toast('error', (e as Error).message),
  });

  const allVisibleSelected = available.length > 0 && available.every((p) => selected.has(p.id));

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h2 className="mb-1 font-bold">إعدادات افتراضية للمواد المحددة</h2>
        <p className="mb-4 text-sm text-subtext">تُطبَّق على كل المواد التي تختارها قبل الضغط على «إضافة الكل»</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Field label="السعر (د.ك)">
            <Input dir="ltr" type="number" step="0.001" min="0" value={defaults.price} onChange={(e) => setDefaults({ ...defaults, price: e.target.value })} />
          </Field>
          <Field label="سعر قبل الخصم">
            <Input dir="ltr" type="number" step="0.001" min="0" value={defaults.compare_at_price} onChange={(e) => setDefaults({ ...defaults, compare_at_price: e.target.value })} />
          </Field>
          <Field label="المنشأ">
            <Input value={defaults.origin_country} onChange={(e) => setDefaults({ ...defaults, origin_country: e.target.value })} placeholder="سعودي" />
          </Field>
          <Field label="حد أدنى">
            <Input dir="ltr" type="number" min="1" value={defaults.min_order_qty} onChange={(e) => setDefaults({ ...defaults, min_order_qty: e.target.value })} />
          </Field>
          <Field label="المخزون">
            <Input dir="ltr" type="number" min="0" value={defaults.stock_qty} disabled={!defaults.track_stock} onChange={(e) => setDefaults({ ...defaults, stock_qty: e.target.value })} />
          </Field>
          <div className="flex flex-col justify-end gap-2 pb-1">
            <label className="flex items-center gap-2 text-sm">
              <Toggle checked={defaults.track_stock} onChange={() => setDefaults({ ...defaults, track_stock: !defaults.track_stock })} />
              تتبّع المخزون
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Toggle checked={defaults.is_active} onChange={() => setDefaults({ ...defaults, is_active: !defaults.is_active })} />
              نشط
            </label>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <Input placeholder="بحث…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-48" />
            <Select value={specialty} onChange={(e) => setSpecialty(e.target.value)} className="w-40">
              <option value="all">كل التخصصات</option>
              {(specialties ?? []).map((s) => (
                <option key={s.id} value={s.id}>{s.name_ar}</option>
              ))}
            </Select>
            <Btn variant="ghost" onClick={toggleAllVisible}>
              {allVisibleSelected ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
            </Btn>
          </div>
          <Btn
            variant="accent"
            busy={bulkAdd.isPending}
            disabled={selected.size === 0}
            onClick={() => bulkAdd.mutate()}
          >
            <PackagePlus size={16} />
            إضافة الكل ({selected.size})
          </Btn>
        </div>

        {isLoading ? (
          <Spinner />
        ) : error ? (
          <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
        ) : available.length === 0 ? (
          <p className="py-8 text-center text-sm text-subtext">لا توجد مواد متاحة للإضافة — كل منتجات الكتalog مضافة مسبقًا</p>
        ) : (
          <div className="max-h-[min(520px,60vh)] overflow-y-auto rounded-lg border border-line">
            {available.map((p) => {
              const checked = selected.has(p.id);
              return (
                <label
                  key={p.id}
                  className={`flex cursor-pointer items-center gap-3 border-b border-line px-4 py-3 text-sm last:border-0 hover:bg-surface ${checked ? 'bg-accent-soft/40' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleOne(p.id)}
                    className="size-4 accent-accent"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="font-medium">{p.name_ar}</span>
                    <span className="mx-2 text-xs text-subtext">{p.specialty?.name_ar}</span>
                  </span>
                  <span dir="ltr" className="text-xs text-subtext">{p.sku}</span>
                </label>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

function OfferEditModal({
  offer,
  onClose,
  onDone,
}: {
  offer: SellerOfferRow;
  onClose: () => void;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState<OfferForm>({
    price: String(offer.price),
    compare_at_price: offer.compare_at_price != null ? String(offer.compare_at_price) : '',
    origin_country: offer.origin_country ?? '',
    min_order_qty: String(offer.min_order_qty),
    stock_qty: offer.stock_qty != null ? String(offer.stock_qty) : '',
    track_stock: offer.track_stock,
    is_active: offer.is_active,
  });

  const save = useMutation({
    mutationFn: async () => {
      const price = Number(form.price);
      if (!Number.isFinite(price) || price < 0) throw new Error('أدخل سعرًا صالحًا');
      const minOrder = Number(form.min_order_qty);
      if (!Number.isFinite(minOrder) || minOrder <= 0) throw new Error('الحد الأدنى غير صالح');
      const compareAt = form.compare_at_price.trim() ? Number(form.compare_at_price) : null;
      if (compareAt != null && (!Number.isFinite(compareAt) || compareAt < price)) {
        throw new Error('سعر المقارنة يجب أن يكون ≥ السعر');
      }
      const stockQty = form.track_stock && form.stock_qty.trim() ? Number(form.stock_qty) : null;

      const { error: qErr } = await supabase
        .from('seller_products')
        .update({
          price,
          compare_at_price: compareAt,
          origin_country: form.origin_country.trim() || null,
          min_order_qty: minOrder,
          stock_qty: stockQty,
          track_stock: form.track_stock,
          is_active: form.is_active,
        })
        .eq('id', offer.id);
      if (qErr) throw new Error(arError(qErr));
    },
    onSuccess: () => {
      toast('success', 'تم تحديث العرض');
      onDone();
    },
    onError: (e) => toast('error', (e as Error).message),
  });

  return (
    <Modal title={`تعديل — ${offer.product?.name_ar}`} open onClose={onClose} wide>
      <div className="space-y-4">
        <div className="rounded-lg bg-surface px-3 py-2 text-sm">
          <span className="font-medium">{offer.product?.name_ar}</span>
          <span className="mx-2 text-subtext" dir="ltr">{offer.product?.sku}</span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Field label="السعر (د.ك)">
            <Input dir="ltr" type="number" step="0.001" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          </Field>
          <Field label="سعر قبل الخصم">
            <Input dir="ltr" type="number" step="0.001" min="0" value={form.compare_at_price} onChange={(e) => setForm({ ...form, compare_at_price: e.target.value })} />
          </Field>
          <Field label="المنشأ">
            <Input value={form.origin_country} onChange={(e) => setForm({ ...form, origin_country: e.target.value })} />
          </Field>
          <Field label="حد أدنى">
            <Input dir="ltr" type="number" min="1" value={form.min_order_qty} onChange={(e) => setForm({ ...form, min_order_qty: e.target.value })} />
          </Field>
          <Field label="المخزون">
            <Input dir="ltr" type="number" min="0" value={form.stock_qty} disabled={!form.track_stock} onChange={(e) => setForm({ ...form, stock_qty: e.target.value })} />
          </Field>
          <div className="flex flex-col justify-end gap-3 pb-1">
            <label className="flex items-center gap-2 text-sm">
              <Toggle checked={form.track_stock} onChange={() => setForm({ ...form, track_stock: !form.track_stock })} />
              تتبّع المخزون
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Toggle checked={form.is_active} onChange={() => setForm({ ...form, is_active: !form.is_active })} />
              نشط
            </label>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Btn variant="ghost" onClick={onClose} disabled={save.isPending}>إلغاء</Btn>
          <Btn variant="accent" busy={save.isPending} onClick={() => save.mutate()}>حفظ</Btn>
        </div>
      </div>
    </Modal>
  );
}
