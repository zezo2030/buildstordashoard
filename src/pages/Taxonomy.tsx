// التخصصات الهرمية — دخول للتخصص/الفرع + إضافة تخصص فرعي أو منتج + صورة لكل مستوى.
// التخصصات الفرعية = جدول categories (parent_id) للحفاظ على توافق الموبايل.
import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, FolderOpen, ImagePlus, Package, Pencil, X } from 'lucide-react';
import { supabase, arError } from '../lib/supabase';
import { PageHeader, Btn, Field, Input, Select, Toggle, Card, Spinner, EmptyState } from '../components/ui';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';

type Tab = 'tree' | 'units';

type Specialty = {
  id: string;
  code: string;
  name_ar: string;
  sort_order: number;
  is_active: boolean;
  image_url: string | null;
};

type Category = {
  id: string;
  code: string | null;
  name_ar: string;
  specialty_id: string;
  parent_id: string | null;
  sort_order: number;
  is_active: boolean;
  image_url: string | null;
};

type ProductRow = {
  id: string;
  sku: string;
  name_ar: string;
  brand: string | null;
  images: string[];
  is_active: boolean;
  unit_id: string;
  unit: { name_ar: string } | null;
};

type Crumb = { kind: 'root' } | { kind: 'specialty'; id: string; name_ar: string } | { kind: 'category'; id: string; name_ar: string };

type SpecialtyForm = {
  id?: string;
  code: string;
  name_ar: string;
  sort_order: number;
  image_url: string;
};

type CategoryForm = {
  id?: string;
  code: string;
  name_ar: string;
  sort_order: number;
  image_url: string;
};

const TAXONOMY_BUCKET = 'taxonomy-images';

async function uploadTaxonomyImage(file: File, folder: string): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('الملف يجب أن يكون صورة');
  if (file.size > 5 * 1024 * 1024) throw new Error('حجم الصورة يجب ألا يتجاوز 5 ميجابايت');
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(TAXONOMY_BUCKET).upload(path, file, {
    upsert: false,
    contentType: file.type,
  });
  if (error) throw new Error(arError(error));
  const { data } = supabase.storage.from(TAXONOMY_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/** رفع صورة منتج — product-images أولًا، وإلا taxonomy-images/products */
async function uploadProductImage(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('الملف يجب أن يكون صورة');
  if (file.size > 5 * 1024 * 1024) throw new Error('حجم الصورة يجب ألا يتجاوز 5 ميجابايت');
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const path = `catalog/${crypto.randomUUID()}.${ext}`;
  const tryBuckets = [
    { bucket: 'product-images', path },
    { bucket: TAXONOMY_BUCKET, path: `products/${crypto.randomUUID()}.${ext}` },
  ] as const;
  let lastErr: Error | null = null;
  for (const t of tryBuckets) {
    const { error } = await supabase.storage.from(t.bucket).upload(t.path, file, {
      upsert: false,
      contentType: file.type,
    });
    if (!error) {
      const { data } = supabase.storage.from(t.bucket).getPublicUrl(t.path);
      return data.publicUrl;
    }
    lastErr = new Error(arError(error));
  }
  throw lastErr ?? new Error('فشل رفع الصورة');
}

export default function Taxonomy() {
  const [tab, setTab] = useState<Tab>('tree');

  return (
    <div>
      <PageHeader
        title="التخصصات والفئات"
        subtitle="كل مستوى إما فروع أو منتجات — مش الاتنين مع بعض"
      />
      <div className="mb-4 flex w-fit gap-1 rounded-xl bg-white p-1 shadow-sm ring-1 ring-line">
        {(
          [
            ['tree', 'التخصصات'],
            ['units', 'وحدات القياس'],
          ] as [Tab, string][]
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${tab === k ? 'bg-primary text-white' : 'text-subtext hover:text-primary'}`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'tree' && <TaxonomyBrowser />}
      {tab === 'units' && <Units />}
    </div>
  );
}

function TaxonomyBrowser() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [path, setPath] = useState<Crumb[]>([{ kind: 'root' }]);
  const [editingSpecialty, setEditingSpecialty] = useState<SpecialtyForm | null>(null);
  const [editingCategory, setEditingCategory] = useState<CategoryForm | null>(null);
  const [addingProduct, setAddingProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductRow | null>(null);
  const [converting, setConverting] = useState(false);

  const current = path[path.length - 1]!;
  const specialtyCrumb = path.find((c): c is Extract<Crumb, { kind: 'specialty' }> => c.kind === 'specialty');
  const categoryCrumb = current.kind === 'category' ? current : null;

  const { data: specialties, isLoading: loadingSpecs } = useQuery({
    queryKey: ['specialties'],
    queryFn: async () => {
      const { data, error } = await supabase.from('specialties').select('*').order('sort_order');
      if (error) throw new Error(arError(error));
      return data as Specialty[];
    },
  });

  const specialtyId = specialtyCrumb?.id ?? null;

  const { data: childCategories, isLoading: loadingCats } = useQuery({
    queryKey: ['taxonomy-children', specialtyId, categoryCrumb?.id ?? 'root'],
    enabled: !!specialtyId,
    queryFn: async () => {
      let q = supabase
        .from('categories')
        .select('id, code, name_ar, specialty_id, parent_id, sort_order, is_active, image_url')
        .eq('specialty_id', specialtyId!)
        .order('sort_order');
      q = categoryCrumb ? q.eq('parent_id', categoryCrumb.id) : q.is('parent_id', null);
      const { data, error } = await q;
      if (error) throw new Error(arError(error));
      return data as Category[];
    },
  });

  const { data: products, isLoading: loadingProducts } = useQuery({
    queryKey: ['taxonomy-products', specialtyId, categoryCrumb?.id ?? 'none'],
    enabled: !!specialtyId,
    queryFn: async () => {
      let q = supabase
        .from('products')
        .select('id, sku, name_ar, brand, images, is_active, unit_id, unit:units (name_ar)')
        .eq('specialty_id', specialtyId!)
        .eq('is_active', true)
        .order('name_ar');
      q = categoryCrumb ? q.eq('category_id', categoryCrumb.id) : q.is('category_id', null);
      const { data, error } = await q;
      if (error) throw new Error(arError(error));
      return data as unknown as ProductRow[];
    },
  });

  const enterSpecialty = (s: Specialty) => {
    setPath([{ kind: 'root' }, { kind: 'specialty', id: s.id, name_ar: s.name_ar }]);
  };

  const enterCategory = (c: Category) => {
    setPath((prev) => [...prev, { kind: 'category', id: c.id, name_ar: c.name_ar }]);
  };

  const goToCrumb = (index: number) => {
    setPath((prev) => prev.slice(0, index + 1));
  };

  const toggleSpecialty = useMutation({
    mutationFn: async (s: Specialty) => {
      const { error } = await supabase.from('specialties').update({ is_active: !s.is_active }).eq('id', s.id);
      if (error) throw new Error(arError(error));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['specialties'] }),
    onError: (e) => toast('error', (e as Error).message),
  });

  const toggleCategory = useMutation({
    mutationFn: async (c: Category) => {
      const { error } = await supabase.from('categories').update({ is_active: !c.is_active }).eq('id', c.id);
      if (error) throw new Error(arError(error));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['taxonomy-children'] }),
    onError: (e) => toast('error', (e as Error).message),
  });

  const saveSpecialty = useMutation({
    mutationFn: async () => {
      if (!editingSpecialty) return;
      if (!editingSpecialty.code.trim() || !editingSpecialty.name_ar.trim()) throw new Error('الكود والاسم مطلوبان');
      const payload = {
        code: editingSpecialty.code.trim(),
        name_ar: editingSpecialty.name_ar.trim(),
        sort_order: editingSpecialty.sort_order,
        image_url: editingSpecialty.image_url.trim() || null,
      };
      const q = editingSpecialty.id
        ? supabase.from('specialties').update(payload).eq('id', editingSpecialty.id)
        : supabase.from('specialties').insert(payload);
      const { error } = await q;
      if (error) throw new Error(arError(error));
    },
    onSuccess: () => {
      toast('success', 'تم حفظ التخصص');
      setEditingSpecialty(null);
      qc.invalidateQueries({ queryKey: ['specialties'] });
    },
    onError: (e) => toast('error', (e as Error).message),
  });

  const saveCategory = useMutation({
    mutationFn: async () => {
      if (!editingCategory || !specialtyId) return;
      if (!editingCategory.name_ar.trim()) throw new Error('الاسم مطلوب');
      // منع إضافة فرع جديد في مستوى فيه منتجات
      if (!editingCategory.id && (products?.length ?? 0) > 0) {
        throw new Error('لا يمكن إضافة فرع هنا: هذا المستوى يحتوي منتجات بالفعل');
      }
      const payload = {
        code: editingCategory.code.trim() || editingCategory.name_ar.trim(),
        name_ar: editingCategory.name_ar.trim(),
        specialty_id: specialtyId,
        parent_id: categoryCrumb?.id ?? null,
        sort_order: editingCategory.sort_order,
        image_url: editingCategory.image_url.trim() || null,
      };
      const q = editingCategory.id
        ? supabase.from('categories').update(payload).eq('id', editingCategory.id)
        : supabase.from('categories').insert(payload);
      const { error } = await q;
      if (error) throw new Error(arError(error));
    },
    onSuccess: () => {
      toast('success', 'تم حفظ التخصص الفرعي');
      setEditingCategory(null);
      qc.invalidateQueries({ queryKey: ['taxonomy-children'] });
    },
    onError: (e) => toast('error', (e as Error).message),
  });

  const toggleProduct = useMutation({
    mutationFn: async (p: ProductRow) => {
      const { error } = await supabase.from('products').update({ is_active: !p.is_active }).eq('id', p.id);
      if (error) throw new Error(arError(error));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['taxonomy-products'] });
      qc.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (e) => toast('error', (e as Error).message),
  });

  const breadcrumb = useMemo(() => path, [path]);

  if (current.kind === 'root') {
    return (
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <div className="text-sm text-subtext">اضغط على تخصص للدخول إليه</div>
          <Btn
            variant="accent"
            onClick={() =>
              setEditingSpecialty({
                code: '',
                name_ar: '',
                sort_order: (specialties?.length ?? 0) + 1,
                image_url: '',
              })
            }
          >
            + تخصص رئيسي
          </Btn>
        </div>
        {loadingSpecs ? (
          <Spinner />
        ) : !specialties?.length ? (
          <EmptyState title="لا توجد تخصصات" hint="أضف تخصصًا رئيسيًا للبدء" />
        ) : (
          <div className="divide-y divide-line">
            {specialties.map((s) => (
              <div key={s.id} className="flex items-center gap-2 px-3 py-2.5 hover:bg-surface/80">
                <button
                  type="button"
                  onClick={() => enterSpecialty(s)}
                  className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-1 py-1 text-start"
                >
                  <Thumb url={s.image_url} tone="accent" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-primary">{s.name_ar}</span>
                    <span className="block text-xs text-subtext" dir="ltr">
                      {s.code}
                    </span>
                  </span>
                  <ChevronLeft size={16} className="shrink-0 text-subtext" />
                </button>
                <Toggle checked={s.is_active} onChange={() => toggleSpecialty.mutate(s)} />
                <button
                  type="button"
                  className="rounded-lg p-2 text-subtext hover:bg-white hover:text-primary"
                  onClick={() =>
                    setEditingSpecialty({
                      id: s.id,
                      code: s.code,
                      name_ar: s.name_ar,
                      sort_order: s.sort_order,
                      image_url: s.image_url ?? '',
                    })
                  }
                  title="تعديل"
                >
                  <Pencil size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
        {editingSpecialty && (
          <SpecialtyModal
            editing={editingSpecialty}
            setEditing={setEditingSpecialty}
            busy={saveSpecialty.isPending}
            onSave={() => saveSpecialty.mutate()}
          />
        )}
      </Card>
    );
  }

  const loading = loadingCats || loadingProducts;
  const hasBranches = (childCategories?.length ?? 0) > 0;
  const hasProducts = (products?.length ?? 0) > 0;
  /** XOR: المستوى الفاضي يختار نوعه؛ بعد أول إضافة يتقفل النوع التاني */
  const canAddBranch = !hasProducts;
  const canAddProduct = !hasBranches;
  const levelMode: 'empty' | 'branches' | 'products' = hasBranches
    ? 'branches'
    : hasProducts
      ? 'products'
      : 'empty';

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
          <nav className="flex min-w-0 flex-wrap items-center gap-1 text-sm">
            {breadcrumb.map((c, i) => {
              const label =
                c.kind === 'root' ? 'التخصصات' : c.kind === 'specialty' ? c.name_ar : c.name_ar;
              const isLast = i === breadcrumb.length - 1;
              return (
                <span key={`${c.kind}-${i}`} className="flex items-center gap-1">
                  {i > 0 && <span className="text-subtext/50">‹</span>}
                  {isLast ? (
                    <span className="font-semibold text-primary">{label}</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => goToCrumb(i)}
                      className="text-subtext hover:text-accent"
                    >
                      {label}
                    </button>
                  )}
                </span>
              );
            })}
          </nav>
          <div className="flex flex-wrap items-center gap-2">
            {canAddBranch && (
              <Btn
                variant="ghost"
                onClick={() =>
                  setEditingCategory({
                    code: '',
                    name_ar: '',
                    sort_order: (childCategories?.length ?? 0) + 1,
                    image_url: '',
                  })
                }
              >
                + تخصص فرعي
              </Btn>
            )}
            {levelMode === 'products' && (
              <Btn variant="ghost" onClick={() => setConverting(true)}>
                تحويل لإضافة فروع…
              </Btn>
            )}
            {canAddProduct && (
              <Btn variant="accent" onClick={() => setAddingProduct(true)}>
                + منتج
              </Btn>
            )}
          </div>
        </div>

        {levelMode !== 'empty' && (
          <div className="border-b border-line bg-surface/60 px-4 py-2 text-xs text-subtext">
            {levelMode === 'branches'
              ? 'هذا المستوى فيه فروع — يمكن إضافة فروع فقط (مش منتجات).'
              : 'هذا المستوى فيه منتجات — يمكن إضافة منتجات فقط. عايز فروع؟ استخدم «تحويل لإضافة فروع».'}
          </div>
        )}
        {levelMode === 'empty' && (
          <div className="border-b border-line bg-accent-soft/40 px-4 py-2 text-xs text-primary">
            المستوى فاضي — اختر إما إضافة فرع أو منتج. بعد الاختيار مش هتقدر تضيف النوع التاني هنا.
          </div>
        )}

        {loading ? (
          <Spinner />
        ) : (
          <>
            {(levelMode === 'branches' || levelMode === 'empty') && (
              <>
                <SectionTitle title="التخصصات الفرعية" count={childCategories?.length ?? 0} />
                {!childCategories?.length ? (
                  <p className="px-4 py-6 text-center text-sm text-subtext">
                    لا توجد تخصصات فرعية هنا بعد
                  </p>
                ) : (
                  <div className="divide-y divide-line border-b border-line">
                    {childCategories.map((c) => (
                      <div key={c.id} className="flex items-center gap-2 px-3 py-2.5 hover:bg-surface/80">
                        <button
                          type="button"
                          onClick={() => enterCategory(c)}
                          className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-1 py-1 text-start"
                        >
                          <Thumb url={c.image_url} tone="navy" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-primary">{c.name_ar}</span>
                            {c.code && (
                              <span className="block text-xs text-subtext" dir="ltr">
                                {c.code}
                              </span>
                            )}
                          </span>
                          <ChevronLeft size={16} className="shrink-0 text-subtext" />
                        </button>
                        <Toggle checked={c.is_active} onChange={() => toggleCategory.mutate(c)} />
                        <button
                          type="button"
                          className="rounded-lg p-2 text-subtext hover:bg-white hover:text-primary"
                          onClick={() =>
                            setEditingCategory({
                              id: c.id,
                              code: c.code ?? '',
                              name_ar: c.name_ar,
                              sort_order: c.sort_order,
                              image_url: c.image_url ?? '',
                            })
                          }
                          title="تعديل"
                        >
                          <Pencil size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {(levelMode === 'products' || levelMode === 'empty') && (
              <>
                <SectionTitle title="المنتجات في هذا المستوى" count={products?.length ?? 0} />
                {!products?.length ? (
                  <p className="px-4 py-6 text-center text-sm text-subtext">لا توجد منتجات مربوطة بهذا المستوى</p>
                ) : (
                  <div className="divide-y divide-line">
                    {products.map((p, i) => (
                      <div key={p.id} className="flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-surface/80">
                        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-surface text-[11px] text-subtext ring-1 ring-line">
                          {i + 1}
                        </span>
                        <Thumb url={p.images?.[0] ?? null} tone="accent" empty="package" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium text-primary">{p.name_ar}</div>
                          <div className="text-xs text-subtext" dir="ltr">
                            {p.sku}
                            {p.unit?.name_ar ? ` · ${p.unit.name_ar}` : ''}
                          </div>
                        </div>
                        <Toggle checked={p.is_active} onChange={() => toggleProduct.mutate(p)} />
                        <button
                          type="button"
                          className="rounded-lg p-2 text-subtext hover:bg-white hover:text-primary"
                          onClick={() => setEditingProduct(p)}
                          title="تعديل المنتج والصورة"
                        >
                          <Pencil size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </Card>

      {editingCategory && (
        <CategoryModal
          editing={editingCategory}
          setEditing={setEditingCategory}
          busy={saveCategory.isPending}
          onSave={() => saveCategory.mutate()}
        />
      )}

      {(addingProduct || editingProduct) && specialtyId && (
        <TaxonomyProductModal
          specialtyId={specialtyId}
          categoryId={categoryCrumb?.id ?? null}
          product={editingProduct}
          onClose={() => {
            setAddingProduct(false);
            setEditingProduct(null);
          }}
          onDone={() => {
            setAddingProduct(false);
            setEditingProduct(null);
            qc.invalidateQueries({ queryKey: ['taxonomy-products'] });
            qc.invalidateQueries({ queryKey: ['products'] });
          }}
        />
      )}

      {converting && specialtyId && (
        <ConvertLevelModal
          specialtyId={specialtyId}
          levelCategoryId={categoryCrumb?.id ?? null}
          productCount={products?.length ?? 0}
          onClose={() => setConverting(false)}
          onDone={(newBranch) => {
            setConverting(false);
            qc.invalidateQueries({ queryKey: ['taxonomy-children'] });
            qc.invalidateQueries({ queryKey: ['taxonomy-products'] });
            qc.invalidateQueries({ queryKey: ['products'] });
            if (newBranch) {
              enterCategory({
                id: newBranch.id,
                code: newBranch.code,
                name_ar: newBranch.name_ar,
                specialty_id: specialtyId,
                parent_id: categoryCrumb?.id ?? null,
                sort_order: 10,
                is_active: true,
                image_url: null,
              });
            }
          }}
        />
      )}
    </div>
  );
}

function Thumb({
  url,
  tone,
  empty = 'folder',
}: {
  url: string | null;
  tone: 'accent' | 'navy';
  empty?: 'folder' | 'package';
}) {
  if (url) {
    return <img src={url} alt="" className="size-9 shrink-0 rounded-xl object-cover ring-1 ring-line" />;
  }
  return (
    <span
      className={`grid size-9 shrink-0 place-items-center rounded-xl ${
        tone === 'accent' ? 'bg-accent-soft text-accent' : 'bg-[#e8ecf3] text-primary'
      }`}
    >
      {empty === 'package' ? <Package size={17} /> : <FolderOpen size={18} />}
    </span>
  );
}

function ImagePicker({
  value,
  folder,
  onChange,
}: {
  value: string;
  folder: string;
  onChange: (url: string) => void;
}) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadTaxonomyImage(file, folder);
      onChange(url);
      toast('success', 'تم رفع الصورة');
    } catch (err) {
      toast('error', (err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <Field label="الصورة">
      <div className="flex items-start gap-3">
        <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-surface ring-1 ring-line">
          {value ? (
            <img src={value} alt="" className="size-full object-cover" />
          ) : (
            <div className="grid size-full place-items-center text-subtext">
              <ImagePlus size={22} />
            </div>
          )}
          {value && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="absolute top-1 start-1 rounded-full bg-primary/80 p-0.5 text-white hover:bg-danger"
              title="إزالة الصورة"
            >
              <X size={12} />
            </button>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={onFile} />
          <Btn type="button" variant="ghost" busy={uploading} onClick={() => inputRef.current?.click()}>
            {value ? 'تغيير الصورة' : 'رفع صورة'}
          </Btn>
          <Input
            dir="ltr"
            placeholder="أو الصق رابط صورة…"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
          <p className="text-[11px] text-subtext">JPEG / PNG / WebP — حتى 5 ميجابايت</p>
        </div>
      </div>
    </Field>
  );
}

function SectionTitle({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-center justify-between bg-surface/60 px-4 py-2">
      <h3 className="text-xs font-semibold tracking-wide text-subtext uppercase">{title}</h3>
      <span className="rounded-md bg-white px-1.5 py-0.5 text-[11px] font-medium text-subtext ring-1 ring-line">
        {count}
      </span>
    </div>
  );
}

function SpecialtyModal({
  editing,
  setEditing,
  busy,
  onSave,
}: {
  editing: SpecialtyForm;
  setEditing: (v: SpecialtyForm | null) => void;
  busy: boolean;
  onSave: () => void;
}) {
  return (
    <Modal title={editing.id ? 'تعديل تخصص' : 'إضافة تخصص رئيسي'} open onClose={() => setEditing(null)}>
      <div className="space-y-4">
        <ImagePicker
          value={editing.image_url}
          folder="specialties"
          onChange={(image_url) => setEditing({ ...editing, image_url })}
        />
        <Field label="الاسم (عربي)">
          <Input value={editing.name_ar} onChange={(e) => setEditing({ ...editing, name_ar: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="الكود">
            <Input dir="ltr" value={editing.code} onChange={(e) => setEditing({ ...editing, code: e.target.value })} />
          </Field>
          <Field label="الترتيب">
            <Input
              dir="ltr"
              type="number"
              value={editing.sort_order}
              onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })}
            />
          </Field>
        </div>
        <div className="flex justify-end gap-2">
          <Btn variant="ghost" onClick={() => setEditing(null)}>
            إلغاء
          </Btn>
          <Btn variant="accent" busy={busy} onClick={onSave}>
            حفظ
          </Btn>
        </div>
      </div>
    </Modal>
  );
}

function CategoryModal({
  editing,
  setEditing,
  busy,
  onSave,
}: {
  editing: CategoryForm;
  setEditing: (v: CategoryForm | null) => void;
  busy: boolean;
  onSave: () => void;
}) {
  return (
    <Modal title={editing.id ? 'تعديل تخصص فرعي' : 'إضافة تخصص فرعي'} open onClose={() => setEditing(null)}>
      <div className="space-y-4">
        <ImagePicker
          value={editing.image_url}
          folder="categories"
          onChange={(image_url) => setEditing({ ...editing, image_url })}
        />
        <Field label="الاسم (عربي)">
          <Input value={editing.name_ar} onChange={(e) => setEditing({ ...editing, name_ar: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="الكود" hint="اختياري — يُولَّد من الاسم إن تُرك فارغًا">
            <Input dir="ltr" value={editing.code} onChange={(e) => setEditing({ ...editing, code: e.target.value })} />
          </Field>
          <Field label="الترتيب">
            <Input
              dir="ltr"
              type="number"
              value={editing.sort_order}
              onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })}
            />
          </Field>
        </div>
        <div className="flex justify-end gap-2">
          <Btn variant="ghost" onClick={() => setEditing(null)}>
            إلغاء
          </Btn>
          <Btn variant="accent" busy={busy} onClick={onSave}>
            حفظ
          </Btn>
        </div>
      </div>
    </Modal>
  );
}

function ConvertLevelModal({
  specialtyId,
  levelCategoryId,
  productCount,
  onClose,
  onDone,
}: {
  specialtyId: string;
  levelCategoryId: string | null;
  productCount: number;
  onClose: () => void;
  onDone: (newBranch: { id: string; code: string; name_ar: string } | null) => void;
}) {
  const { toast } = useToast();
  const [mode, setMode] = useState<'move' | 'archive' | 'delete'>('move');
  const [branchName, setBranchName] = useState('عام');
  const [branchCode, setBranchCode] = useState('');

  const run = useMutation({
    mutationFn: async () => {
      // الدالة بتطلب مستوى محدد (البارامتر بلا default في الداتابيز).
      // الأنواع القديمة كانت بتسمح بـnull فالنداء كان هيفشل وقت التشغيل.
      if (!levelCategoryId) throw new Error('اختر المستوى المراد تحويله أولاً');

      const { data, error } = await supabase.rpc('convert_level_for_branches', {
        p_specialty_id: specialtyId,
        p_level_category_id: levelCategoryId,
        p_mode: mode,
        p_new_branch_name_ar: mode === 'move' ? branchName : undefined,
        p_new_branch_code: mode === 'move' ? branchCode || undefined : undefined,
      });
      if (error) throw new Error(arError(error));
      if (mode === 'move' && data) {
        return { id: data as string, code: branchCode || branchName, name_ar: branchName };
      }
      return null;
    },
    onSuccess: (branch) => {
      const msg =
        mode === 'move'
          ? `تم إنشاء الفرع ونقل ${productCount} منتج إليه`
          : mode === 'archive'
            ? `تمت أرشفة ${productCount} منتج — تقدر تضيف فروع دلوقتي`
            : `تم حذف المنتجات — تقدر تضيف فروع دلوقتي`;
      toast('success', msg);
      onDone(branch);
    },
    onError: (e) => toast('error', (e as Error).message),
  });

  return (
    <Modal title="تحويل المستوى لإضافة فروع" open onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-subtext">
          فيه <strong className="text-primary">{productCount}</strong> منتج نشط هنا. عشان تضيف فروع لازم تفضي المستوى
          منهم أولًا:
        </p>

        <div className="space-y-2">
          {(
            [
              ['move', 'إنشاء فرع ونقل كل المنتجات إليه (موصى به)'],
              ['archive', 'أرشفة كل المنتجات (إخفاء من التطبيق) ثم إضافة فروع'],
              ['delete', 'حذف المنتجات نهائيًا (إن لم يكن عليها عروض)'],
            ] as const
          ).map(([value, label]) => (
            <label
              key={value}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 text-sm ${
                mode === value ? 'border-accent bg-accent-soft/40' : 'border-line hover:bg-surface'
              }`}
            >
              <input
                type="radio"
                name="convert-mode"
                className="mt-1"
                checked={mode === value}
                onChange={() => setMode(value)}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>

        {mode === 'move' && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="اسم الفرع الجديد">
              <Input value={branchName} onChange={(e) => setBranchName(e.target.value)} placeholder="مثال: عام" />
            </Field>
            <Field label="الكود" hint="اختياري">
              <Input dir="ltr" value={branchCode} onChange={(e) => setBranchCode(e.target.value)} />
            </Field>
          </div>
        )}

        {mode === 'archive' && (
          <p className="text-xs text-subtext">
            المنتجات المؤرشفة تفضل في قاعدة البيانات (`is_active = false`) ومش هتظهر في التطبيق، والمستوى يبقى فاضي
            للفروع. تقدر بعدين تفعّلها وتنقلها لفرع من صفحة المنتجات.
          </p>
        )}
        {mode === 'delete' && (
          <p className="text-xs text-danger">
            الحذف نهائي وممنوع لو المنتج عليه عروض بائعين أو مقايسات — في الحالة دي استخدم الأرشفة أو النقل.
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Btn variant="ghost" onClick={onClose} disabled={run.isPending}>
            إلغاء
          </Btn>
          <Btn
            variant="accent"
            busy={run.isPending}
            onClick={() => run.mutate()}
            disabled={mode === 'move' && !branchName.trim()}
          >
            تنفيذ
          </Btn>
        </div>
      </div>
    </Modal>
  );
}

function TaxonomyProductModal({
  specialtyId,
  categoryId,
  product,
  onClose,
  onDone,
}: {
  specialtyId: string;
  categoryId: string | null;
  product: ProductRow | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    sku: product?.sku ?? '',
    name_ar: product?.name_ar ?? '',
    unit_id: product?.unit_id ?? '',
    brand: product?.brand ?? '',
    image_url: product?.images?.[0] ?? '',
    is_active: product?.is_active ?? true,
  });

  const { data: units } = useQuery({
    queryKey: ['units'],
    queryFn: async () => {
      const { data, error } = await supabase.from('units').select('id, name_ar').order('code');
      if (error) throw new Error(arError(error));
      return data ?? [];
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
      if (!form.sku.trim() || !form.name_ar.trim()) throw new Error('SKU والاسم مطلوبان');
      if (!form.unit_id) throw new Error('اختر وحدة القياس');
      if (!product) {
        let branchQ = supabase
          .from('categories')
          .select('id', { count: 'exact', head: true })
          .eq('specialty_id', specialtyId);
        branchQ = categoryId ? branchQ.eq('parent_id', categoryId) : branchQ.is('parent_id', null);
        const { count, error: countErr } = await branchQ;
        if (countErr) throw new Error(arError(countErr));
        if ((count ?? 0) > 0) {
          throw new Error('لا يمكن إضافة منتج هنا: هذا المستوى يحتوي فروع بالفعل');
        }
      }
      const payload = {
        sku: form.sku.trim(),
        name_ar: form.name_ar.trim(),
        brand: form.brand.trim() || null,
        specialty_id: specialtyId,
        category_id: categoryId,
        unit_id: form.unit_id,
        images: form.image_url.trim() ? [form.image_url.trim()] : [],
        is_active: form.is_active,
      };
      const q = product
        ? supabase.from('products').update(payload).eq('id', product.id)
        : supabase.from('products').insert(payload);
      const { error } = await q;
      if (error) throw new Error(arError(error));
    },
    onSuccess: () => {
      toast('success', product ? 'تم تحديث المنتج' : 'تمت إضافة المنتج');
      onDone();
    },
    onError: (e) => toast('error', (e as Error).message),
  });

  return (
    <Modal title={product ? `تعديل — ${product.name_ar}` : 'إضافة منتج في هذا المستوى'} open onClose={onClose}>
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
              <p className="text-xs text-subtext">PNG / JPG — حتى 5MB</p>
            </div>
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="SKU">
            <Input dir="ltr" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
          </Field>
          <Field label="الاسم (عربي)">
            <Input value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="وحدة القياس">
            <Select value={form.unit_id} onChange={(e) => setForm({ ...form, unit_id: e.target.value })}>
              <option value="">اختر…</option>
              {(units ?? []).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name_ar}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="الماركة">
            <Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
          </Field>
        </div>
        {product && (
          <label className="flex items-center gap-2 text-sm">
            <Toggle checked={form.is_active} onChange={(v) => setForm({ ...form, is_active: v })} />
            <span>{form.is_active ? 'نشط' : 'موقوف / مؤرشف'}</span>
          </label>
        )}
        <p className="text-xs text-subtext">
          سيُربط المنتج بالتخصص{categoryId ? ' والفرع الحالي' : ' (بدون فئة)'}.
        </p>
        <div className="flex justify-end gap-2">
          <Btn variant="ghost" onClick={onClose} disabled={save.isPending}>
            إلغاء
          </Btn>
          <Btn variant="accent" busy={save.isPending} onClick={() => save.mutate()}>
            حفظ
          </Btn>
        </div>
      </div>
    </Modal>
  );
}

function Units() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState<{ id?: string; code: string; name_ar: string; decimals: number } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['units'],
    queryFn: async () => {
      const { data, error } = await supabase.from('units').select('*').order('code');
      if (error) throw new Error(arError(error));
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      if (!editing.code.trim() || !editing.name_ar.trim()) throw new Error('الكود والاسم مطلوبان');
      const payload = { code: editing.code.trim(), name_ar: editing.name_ar.trim(), decimals: editing.decimals };
      const q = editing.id
        ? supabase.from('units').update(payload).eq('id', editing.id)
        : supabase.from('units').insert(payload);
      const { error } = await q;
      if (error) throw new Error(arError(error));
    },
    onSuccess: () => {
      toast('success', 'تم الحفظ');
      setEditing(null);
      qc.invalidateQueries({ queryKey: ['units'] });
    },
    onError: (e) => toast('error', (e as Error).message),
  });

  return (
    <Card className="p-4">
      <div className="mb-3 flex justify-end">
        <Btn variant="accent" onClick={() => setEditing({ code: '', name_ar: '', decimals: 0 })}>
          + إضافة وحدة
        </Btn>
      </div>
      {isLoading ? (
        <div className="py-6 text-center text-sm text-subtext">جارٍ التحميل…</div>
      ) : (
        <div className="divide-y divide-line">
          {(data ?? []).map((u) => (
            <div key={u.id} className="flex items-center gap-3 py-2.5 text-sm">
              <span className="flex-1 font-medium">{u.name_ar}</span>
              <span className="text-xs text-subtext" dir="ltr">
                {u.code}
              </span>
              <span className="text-xs text-subtext" dir="ltr">
                خانات: {u.decimals}
              </span>
              <Btn
                variant="ghost"
                onClick={() => setEditing({ id: u.id, code: u.code, name_ar: u.name_ar, decimals: u.decimals })}
              >
                تعديل
              </Btn>
            </div>
          ))}
        </div>
      )}
      {editing && (
        <Modal title={editing.id ? 'تعديل وحدة' : 'إضافة وحدة'} open onClose={() => setEditing(null)}>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <Field label="الاسم (عربي)">
                <Input value={editing.name_ar} onChange={(e) => setEditing({ ...editing, name_ar: e.target.value })} />
              </Field>
              <Field label="الكود">
                <Input dir="ltr" value={editing.code} onChange={(e) => setEditing({ ...editing, code: e.target.value })} />
              </Field>
              <Field label="الخانات العشرية">
                <Input
                  dir="ltr"
                  type="number"
                  min="0"
                  max="3"
                  value={editing.decimals}
                  onChange={(e) => setEditing({ ...editing, decimals: Number(e.target.value) })}
                />
              </Field>
            </div>
            <div className="flex justify-end gap-2">
              <Btn variant="ghost" onClick={() => setEditing(null)}>
                إلغاء
              </Btn>
              <Btn variant="accent" busy={save.isPending} onClick={() => save.mutate()}>
                حفظ
              </Btn>
            </div>
          </div>
        </Modal>
      )}
    </Card>
  );
}
