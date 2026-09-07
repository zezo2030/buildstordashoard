// المنتجات (الكتالوج المشترك — SKU واحد لكل مادة) + عروض البائعين عليها.
// المنتج ممكن يبقى في أكتر من مكان في الشجرة (`product_placements`)، والجدول
// بيعرض مسار المكان الأساسي كامل من التخصص الرئيسي لغاية آخر فئة.
import { useRef, useState, type ChangeEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ImagePlus, X } from 'lucide-react';
import { supabase, arError } from '../lib/supabase';
import { uploadProductImage } from '../lib/product-image';
import { skuFromSourceCode } from '../lib/catalog-sku';
import { PageHeader, Btn, Field, Input, Select, Toggle, StatusChip, Money } from '../components/ui';
import { DataTable, type Column, PAGE_SIZE } from '../components/DataTable';
import { ImportProductsModal } from '../components/ImportProductsModal';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';
import { productPathText, type PathCategory, type PathSpecialty } from '../lib/product-path';
import { PlacementsField, savePlacements, specialtyNeedsCategory } from '../components/PlacementsField';
import { normalizePlacements, type Placement } from '../lib/product-placements';

type Row = {
  id: string;
  sku: string;
  source_code: string | null;
  name_ar: string;
  brand: string | null;
  images: string[];
  is_active: boolean;
  specialty_id?: string;
  category_id?: string | null;
  unit: { name_ar: string } | null;
  seller_products: { count: number }[];
  product_placements?: { specialty_id: string; category_id: string | null }[];
};

type CatalogTree = { specialties: PathSpecialty[]; categories: PathCategory[] };

/** شجرة الكتالوج كاملة — قوايم صغيرة، بتتجاب مرة وبتتشارك بين الجدول والفورم. */
function useCatalogTree() {
  return useQuery<CatalogTree>({
    queryKey: ['catalog-tree'],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const [sp, cat] = await Promise.all([
        supabase.from('specialties').select('id, name_ar').order('sort_order'),
        supabase.from('categories').select('id, name_ar, parent_id, specialty_id').order('sort_order'),
      ]);
      if (sp.error) throw new Error(arError(sp.error));
      if (cat.error) throw new Error(arError(cat.error));
      return { specialties: sp.data ?? [], categories: (cat.data ?? []) as PathCategory[] };
    },
  });
}

export default function Products() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [specialty, setSpecialty] = useState('all');
  const [editing, setEditing] = useState<Row | 'new' | null>(null);
  const [offersFor, setOffersFor] = useState<Row | null>(null);
  const [importing, setImporting] = useState(false);

  const { data: tree } = useCatalogTree();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['products', search, specialty, page],
    queryFn: async () => {
      const linksSelect = specialty !== 'all'
        ? 'product_placements!inner (specialty_id, category_id)'
        : 'product_placements (specialty_id, category_id)';
      let q = supabase
        .from('products')
        .select(
          `id, sku, source_code, name_ar, brand, images, is_active, specialty_id, category_id,
           unit:units (name_ar), seller_products (count), ${linksSelect}`,
        )
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
      if (specialty !== 'all') q = q.eq('product_placements.specialty_id', specialty);
      if (search.trim()) q = q.or(`name_ar.ilike.%${search.trim()}%,sku.ilike.%${search.trim()}%`);
      const { data, error } = await q;
      if (error) throw new Error(arError(error));
      return data as unknown as Row[];
    },
  });

  const toggleActive = useMutation({
    mutationFn: async (r: Row) => {
      const { error } = await supabase.from('products').update({ is_active: !r.is_active }).eq('id', r.id);
      if (error) throw new Error(arError(error));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
    onError: (e) => toast('error', (e as Error).message),
  });

  const rows = (data ?? []).slice(0, PAGE_SIZE);

  const columns: Column<Row>[] = [
    {
      key: 'name',
      header: 'المنتج',
      render: (r) => (
        <div className="flex items-center gap-3">
          <div className="size-11 shrink-0 overflow-hidden rounded-lg bg-surface ring-1 ring-line">
            {r.images?.[0] ? (
              <img src={r.images[0]} alt="" className="size-full object-cover" />
            ) : (
              <div className="grid size-full place-items-center text-subtext">
                <ImagePlus size={16} />
              </div>
            )}
          </div>
          <div>
            <div className="font-medium">{r.name_ar}</div>
            <div className="text-xs text-subtext" dir="ltr">{r.sku}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'path',
      header: 'المسار',
      className: 'w-[26%]',
      // المكان الأساسي بالكامل + عدد الأماكن الزيادة، عشان الأدمن يعرف المنتج
      // موجود فين من غير ما يفتح الفورم.
      render: (r) => {
        const extra = Math.max(0, (r.product_placements?.length ?? 0) - 1);
        return (
          <div>
            <div>
              {productPathText(
                tree?.specialties ?? [], tree?.categories ?? [],
                r.specialty_id, r.category_id ?? null,
              )}
            </div>
            {extra > 0 && (
              <div className="mt-0.5 text-[11px] text-subtext">
                + {extra} {extra === 1 ? 'مكان آخر' : 'أماكن أخرى'}
              </div>
            )}
          </div>
        );
      },
    },
    { key: 'unit', header: 'الوحدة', render: (r) => r.unit?.name_ar ?? '—' },
    {
      key: 'offers',
      header: 'عروض البائعين',
      render: (r) => (
        <button
          className="text-sm text-accent hover:underline"
          onClick={(e) => { e.stopPropagation(); setOffersFor(r); }}
        >
          {r.seller_products?.[0]?.count ?? 0} عرض
        </button>
      ),
    },
    {
      key: 'active',
      header: 'نشط',
      render: (r) => (
        <span onClick={(e) => e.stopPropagation()}>
          <Toggle checked={r.is_active} onChange={() => toggleActive.mutate(r)} />
        </span>
      ),
    },
    { key: 'edit', header: '', render: (r) => <Btn variant="ghost" className="px-2.5 py-1 text-xs" onClick={() => setEditing(r)}>تعديل</Btn> },
  ];

  return (
    <div>
      <PageHeader
        title="المنتجات"
        subtitle="الكتالوج المشترك — كل منتج SKU واحد يعرض عليه البائعون أسعارهم"
        actions={
          <>
            <Input placeholder="بحث بالاسم/SKU…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} className="w-56" />
            <Select value={specialty} onChange={(e) => { setSpecialty(e.target.value); setPage(0); }} className="w-44">
              <option value="all">كل التخصصات</option>
              {(tree?.specialties ?? []).map((s) => (
                <option key={s.id} value={s.id}>{s.name_ar}</option>
              ))}
            </Select>
            <Btn variant="ghost" onClick={() => setImporting(true)}>رفع Excel</Btn>
            <Btn variant="accent" onClick={() => setEditing('new')}>+ إضافة منتج</Btn>
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
        emptyTitle="لا توجد منتجات"
      />
      {editing && (
        <ProductModal
          product={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onDone={() => {
            setEditing(null);
            qc.invalidateQueries({ queryKey: ['products'] });
          }}
        />
      )}
      {offersFor && <OffersModal product={offersFor} onClose={() => setOffersFor(null)} />}
      {importing && (
        <ImportProductsModal
          open
          onClose={() => setImporting(false)}
          onDone={() => {
            setImporting(false);
            qc.invalidateQueries({ queryKey: ['products'] });
          }}
        />
      )}
    </div>
  );
}

function ProductModal({ product, onClose, onDone }: { product: Row | null; onClose: () => void; onDone: () => void }) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [form, setForm] = useState({
    source_code: product?.source_code ?? '',
    name_ar: product?.name_ar ?? '',
    image_url: product?.images?.[0] ?? '',
    unit_id: '',
  });
  const generatedSku = form.source_code.trim() ? skuFromSourceCode(form.source_code) : '';
  const displaySku = product?.sku || generatedSku;

  const { data: tree } = useCatalogTree();

  const { data: units } = useQuery({
    queryKey: ['units-list'],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from('units').select('id, name_ar').order('code');
      if (error) throw new Error(arError(error));
      return data ?? [];
    },
  });

  // عند التعديل: جلب الوحدة والأماكن الحالية (الأساسي الأول)
  useQuery({
    queryKey: ['product-refs', product?.id],
    enabled: !!product,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('specialty_id, category_id, unit_id, images, product_placements (specialty_id, category_id)')
        .eq('id', product!.id)
        .single();
      if (error) throw new Error(arError(error));
      if (data) {
        const primary: Placement = {
          specialtyId: data.specialty_id ?? '',
          categoryId: data.category_id ?? null,
        };
        const rest = (data.product_placements ?? []).map((p) => ({
          specialtyId: p.specialty_id,
          categoryId: p.category_id,
        }));
        setPlacements(normalizePlacements([primary, ...rest]));
        setForm((f) => ({
          ...f,
          unit_id: data.unit_id ?? '',
          image_url: data.images?.[0] ?? f.image_url,
        }));
      }
      return data;
    },
  });

  async function onPickImage(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadProductImage(file);
      setForm((f) => ({ ...f, image_url: url }));
      toast('success', 'تم رفع صورة المنتج');
    } catch (err) {
      toast('error', (err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  const save = useMutation({
    mutationFn: async () => {
      if (!form.name_ar.trim()) throw new Error('الاسم مطلوب');
      if (!product && !form.source_code.trim()) throw new Error('الكود مطلوب');
      if (!form.unit_id) throw new Error('اختر الوحدة');
      const list = normalizePlacements(placements);
      const primary = list[0];
      if (!primary) throw new Error('أضف مكانًا واحدًا على الأقل للمنتج في الكتالوج');
      // المنتج بيتربط بورقة بس — قسم فيه فروع مايستقبلش منتجات مباشرة
      const cats = tree?.categories ?? [];
      for (const p of list) {
        if (!p.categoryId && specialtyNeedsCategory(cats, p.specialtyId)) {
          throw new Error('في تخصص فيه فروع — لازم تختار فئة (آخر فرع) لكل مكان');
        }
        if (p.categoryId && cats.some((c) => c.parent_id === p.categoryId)) {
          throw new Error('لا يمكن ربط المنتج بقسم فيه فروع — اختر آخر فرع في الشجرة');
        }
      }

      const payload = {
        sku: product?.sku ?? skuFromSourceCode(form.source_code),
        source_code: form.source_code.trim() || null,
        name_ar: form.name_ar.trim(),
        specialty_id: primary.specialtyId,
        category_id: primary.categoryId,
        unit_id: form.unit_id,
        images: form.image_url.trim() ? [form.image_url.trim()] : [],
      };
      const q = product
        ? supabase.from('products').update(payload).eq('id', product.id).select('id').single()
        : supabase.from('products').insert(payload).select('id').single();
      const { data: saved, error } = await q;
      if (error) throw new Error(arError(error));
      if (!saved) throw new Error('تعذر حفظ المنتج');
      await savePlacements(saved.id, list);
    },
    onSuccess: () => {
      toast('success', product ? 'تم تحديث المنتج' : 'تمت إضافة المنتج');
      onDone();
    },
    onError: (e) => toast('error', (e as Error).message),
  });

  return (
    <Modal title={product ? `تعديل — ${product.name_ar}` : 'إضافة منتج'} open onClose={onClose} wide>
      <div className="space-y-4">
        <Field label="صورة المنتج">
          <div className="flex items-start gap-3">
            <div className="relative size-24 shrink-0 overflow-hidden rounded-xl bg-surface ring-1 ring-line">
              {form.image_url ? (
                <img src={form.image_url} alt="" className="size-full object-cover" />
              ) : (
                <div className="grid size-full place-items-center text-subtext">
                  <ImagePlus size={22} />
                </div>
              )}
              {form.image_url && (
                <button
                  type="button"
                  onClick={() => setForm({ ...form, image_url: '' })}
                  className="absolute top-1 start-1 rounded-full bg-primary/80 p-0.5 text-white hover:bg-danger"
                  title="إزالة الصورة"
                >
                  <X size={12} />
                </button>
              )}
            </div>
            <div className="space-y-2">
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickImage} />
              <Btn variant="ghost" busy={uploading} onClick={() => fileRef.current?.click()}>
                رفع صورة
              </Btn>
              <p className="text-xs text-subtext">PNG / JPG — حتى 5MB — تظهر في التطبيق</p>
            </div>
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="الكود" hint="كودك الخاص من الإكسل — لا يظهر في التطبيق">
            <Input
              dir="ltr"
              value={form.source_code}
              onChange={(e) => setForm({ ...form, source_code: e.target.value })}
            />
          </Field>
          <Field label="SKU" hint="يتولد تلقائيًا — حرف و 6 أرقام، يظهر في التطبيق">
            <Input dir="ltr" value={displaySku} readOnly className="bg-surface" />
          </Field>
        </div>
        <Field label="الاسم (عربي)">
          <Input value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} />
        </Field>

        <PlacementsField
          value={placements}
          onChange={setPlacements}
          specialties={tree?.specialties ?? []}
          categories={tree?.categories ?? []}
        />

        <div className="grid grid-cols-2 gap-3">
          <Field label="الوحدة" hint="تظهر للمشتري جنب الكمية المطلوبة في التطبيق">
            <Select value={form.unit_id} onChange={(e) => setForm({ ...form, unit_id: e.target.value })}>
              <option value="">اختر…</option>
              {(units ?? []).map((u) => (
                <option key={u.id} value={u.id}>{u.name_ar}</option>
              ))}
            </Select>
          </Field>
        </div>
        {/* بلد المنشأ اتشال من المادة: هو خاصية عرض البائع (نفس المادة بمناشئ
            مختلفة عند بائعين مختلفين)، وبيتحط على عرض البائع في seller_products. */}

        <div className="flex justify-end gap-2">
          <Btn variant="ghost" onClick={onClose} disabled={save.isPending}>إلغاء</Btn>
          <Btn variant="accent" busy={save.isPending} onClick={() => save.mutate()}>حفظ</Btn>
        </div>
      </div>
    </Modal>
  );
}

function OffersModal({ product, onClose }: { product: Row; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['product-offers', product.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seller_products')
        .select('id, price, is_active, origin_country, seller:companies (name_ar)')
        .eq('product_id', product.id)
        .order('price');
      if (error) throw new Error(arError(error));
      return data as unknown as {
        id: string;
        price: number;
        is_active: boolean;
        origin_country: string | null;
        seller: { name_ar: string } | null;
      }[];
    },
  });

  return (
    <Modal title={`عروض البائعين — ${product.name_ar}`} open onClose={onClose}>
      {isLoading ? (
        <div className="py-6 text-center text-sm text-subtext">جارٍ التحميل…</div>
      ) : (data ?? []).length === 0 ? (
        <p className="py-4 text-center text-sm text-subtext">لا يعرض أي بائع هذا المنتج بعد</p>
      ) : (
        <div className="divide-y divide-line">
          {(data ?? []).map((o, i) => (
            <div key={o.id} className="flex items-center gap-3 py-2.5 text-sm">
              <span className="text-xs text-subtext">{i + 1}</span>
              <span className="flex-1 font-medium">{o.seller?.name_ar ?? '—'}</span>
              {o.origin_country && <span className="text-xs text-subtext">{o.origin_country}</span>}
              <StatusChip label={o.is_active ? 'نشط' : 'موقوف'} tone={o.is_active ? 'green' : 'gray'} />
              <Money value={o.price} />
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
