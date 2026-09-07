// مواد الشركة — الأدمن يربط الكتالوج بالشركة؛ السعر يضعه البائع من التطبيق.
import { useMemo, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, FileSpreadsheet, ImagePlus, PackagePlus, Pencil, Trash2 } from 'lucide-react';
import { supabase, arError } from '../lib/supabase';
import {
  PageHeader, Btn, Card, Field, Input, Money, Select, Spinner, ErrorState,
} from '../components/ui';
import { DataTable, type Column } from '../components/DataTable';
import { ConfirmDialog, Modal } from '../components/Modal';
import { LinkCompanyProductsModal } from '../components/LinkCompanyProductsModal';
import { useToast } from '../components/Toast';
import { filterCatalogForBulkAdd, offerAwaitingSellerPrice } from '../lib/company-materials';
import { linkedSpecialtyIds, productInSpecialty } from '../lib/product-specialties';
import { adminAssignCompanyProducts } from '../api/company-products';

type Tab = 'list' | 'add';

type SellerOfferRow = {
  id: string;
  price: number;
  /** منشأ العرض — فاضي يعني ياخد منشأ المنتج نفسه. */
  origin_country: string | null;
  product: {
    id: string;
    sku: string;
    name_ar: string;
    images: string[];
    specialty_id: string;
    specialty: { name_ar: string } | null;
    category: { name_ar: string } | null;
    unit: { id: string; name_ar: string } | null;
    specialty_ids?: string[];
  } | null;
};

type CatalogProduct = {
  id: string;
  sku: string;
  name_ar: string;
  specialty_id: string;
  specialty: { name_ar: string } | null;
  specialty_ids?: string[];
};

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
        subtitle="ربط مواد الكتالوج بالشركة — الأسعار يضعها البائع من التطبيق"
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
  const [removeTarget, setRemoveTarget] = useState<SellerOfferRow | null>(null);
  const [originTarget, setOriginTarget] = useState<SellerOfferRow | null>(null);
  const [originDraft, setOriginDraft] = useState('');

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
          id, price, origin_country,
          product:products (
            id, sku, name_ar, images, specialty_id,
            specialty:specialties!products_specialty_id_fkey (name_ar),
            category:categories (name_ar),
            unit:units (id, name_ar),
            product_specialties (specialty_id)
          )
        `)
        .eq('seller_company_id', companyId)
        .order('created_at', { ascending: false });
      if (qErr) throw new Error(arError(qErr));
      return ((data ?? []) as unknown as SellerOfferRow[]).map((row) => ({
        ...row,
        product: row.product
          ? {
              ...row.product,
              specialty_ids: linkedSpecialtyIds(
                (row.product as { product_specialties?: { specialty_id: string }[] }).product_specialties,
              ),
            }
          : null,
      }));
    },
  });

  // منشأ العرض بيتحدد من هنا بس — تطبيق البائع بيسعّر ومابيلمسش المنشأ.
  // القاعدة عليها UNIQUE (شركة، منتج، منشأ)، فمنشأ مكرر لنفس المادة بيرجع خطأ.
  const saveOrigin = useMutation({
    mutationFn: async ({ row, origin }: { row: SellerOfferRow; origin: string }) => {
      const { error: qErr } = await supabase
        .from('seller_products')
        .update({ origin_country: origin.trim() || null })
        .eq('id', row.id);
      if (qErr) throw new Error(arError(qErr));
    },
    onSuccess: () => {
      setOriginTarget(null);
      qc.invalidateQueries({ queryKey });
      qc.invalidateQueries({ queryKey: ['company-assigned-product-ids', companyId] });
      toast('success', 'تم حفظ المنشأ');
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
      qc.invalidateQueries({ queryKey: ['company-assigned-product-ids', companyId] });
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
      if (specialty !== 'all' && !productInSpecialty(p.specialty_id, p.specialty_ids, specialty)) return false;
      if (!term) return true;
      return p.name_ar.toLocaleLowerCase().includes(term) || p.sku.toLocaleLowerCase().includes(term);
    });
  }, [offers, search, specialty]);

  const columns: Column<SellerOfferRow>[] = [
    {
      key: 'product',
      header: 'المنتج',
      className: 'w-[36%]',
      render: (r) => (
        <div className="flex min-w-0 items-center gap-3">
          <div className="size-10 shrink-0 overflow-hidden rounded-lg bg-surface ring-1 ring-line">
            {r.product?.images?.[0] ? (
              <img src={r.product.images[0]} alt="" className="size-full object-cover" />
            ) : (
              <div className="grid size-full place-items-center text-subtext">
                <ImagePlus size={14} />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <div className="font-medium">{r.product?.name_ar ?? '—'}</div>
            <div className="text-xs text-subtext" dir="ltr">{r.product?.sku ?? '—'}</div>
          </div>
        </div>
      ),
    },
    { key: 'specialty', header: 'التخصص', render: (r) => r.product?.specialty?.name_ar ?? '—' },
    { key: 'category', header: 'الفئة', render: (r) => r.product?.category?.name_ar ?? '—' },
    { key: 'unit', header: 'الوحدة', render: (r) => r.product?.unit?.name_ar ?? '—' },
    {
      key: 'origin',
      header: 'المنشأ',
      render: (r) => (
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-lg px-2 py-1 hover:bg-surface"
          title="تعديل المنشأ"
          onClick={(e) => {
            e.stopPropagation();
            setOriginDraft(r.origin_country ?? '');
            setOriginTarget(r);
          }}
        >
          <span className={r.origin_country ? '' : 'text-subtext'}>{r.origin_country || 'منشأ المنتج'}</span>
          <Pencil size={13} className="text-subtext" />
        </button>
      ),
    },
    {
      key: 'price',
      header: 'سعر الشركة',
      render: (r) => (
        offerAwaitingSellerPrice(r.price)
          ? <span className="text-subtext">بانتظار التسعير</span>
          : <Money value={r.price} />
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-[8%]',
      render: (r) => (
        <button
          type="button"
          className="rounded-lg p-2 text-danger hover:bg-red-50"
          title="إزالة"
          onClick={(e) => { e.stopPropagation(); setRemoveTarget(r); }}
        >
          <Trash2 size={15} />
        </button>
      ),
    },
  ];

  return (
    <>
      <Card className="mb-4 p-4">
        <p className="text-sm text-subtext">
          {offers?.length ?? 0} مادة مربوطة بـ {companyName} — السعر يظهر بعد ما تسعّره الشركة
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
        emptyTitle="لا توجد مواد لهذه الشركة — انتقل لتبويب «إضافة مواد»"
      />

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

      <Modal
        title={`منشأ العرض — ${originTarget?.product?.name_ar ?? ''}`}
        open={!!originTarget}
        onClose={() => setOriginTarget(null)}
      >
        <Field label="المنشأ" hint="سيبه فاضي والعرض ياخد منشأ المنتج نفسه">
          <Input
            value={originDraft}
            onChange={(e) => setOriginDraft(e.target.value)}
            placeholder="كويتي / سعودي…"
          />
        </Field>
        <div className="mt-4 flex justify-end gap-2">
          <Btn variant="ghost" onClick={() => setOriginTarget(null)}>إلغاء</Btn>
          <Btn
            variant="accent"
            busy={saveOrigin.isPending}
            onClick={() => originTarget && saveOrigin.mutate({ row: originTarget, origin: originDraft })}
          >
            حفظ
          </Btn>
        </div>
      </Modal>
    </>
  );
}

function MaterialsBulkAddTab({ companyId, onAdded }: { companyId: string; onAdded: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [specialty, setSpecialty] = useState('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [origin, setOrigin] = useState('');

  const { data: specialties } = useQuery({
    queryKey: ['specialties-list'],
    queryFn: async () => {
      const { data } = await supabase.from('specialties').select('id, name_ar').order('sort_order');
      return data ?? [];
    },
  });

  // المنشأ جزء من مفتاح العرض، فبنجيبه مع المنتج: المادة بتختفي من القايمة لو
  // مضافة **بنفس المنشأ** المكتوب تحت، وبتفضل متاحة لمنشأ تاني.
  const { data: assignedOffers } = useQuery({
    queryKey: ['company-assigned-product-ids', companyId],
    queryFn: async () => {
      const { data, error: qErr } = await supabase
        .from('seller_products')
        .select('product_id, origin_country')
        .eq('seller_company_id', companyId);
      if (qErr) throw new Error(arError(qErr));
      return (data ?? []) as { product_id: string; origin_country: string | null }[];
    },
  });

  const { data: catalog, isLoading, error, refetch } = useQuery({
    queryKey: ['catalog-products-bulk'],
    queryFn: async () => {
      const { data, error: qErr } = await supabase
        .from('products')
        .select('id, sku, name_ar, specialty_id, specialty:specialties!products_specialty_id_fkey (name_ar), product_specialties (specialty_id)')
        .eq('is_active', true)
        .order('name_ar');
      if (qErr) throw new Error(arError(qErr));
      return ((data ?? []) as unknown as (CatalogProduct & { product_specialties?: { specialty_id: string }[] })[])
        .map((p) => ({ ...p, specialty_ids: linkedSpecialtyIds(p.product_specialties) }));
    },
  });

  const available = useMemo(
    () => filterCatalogForBulkAdd(catalog ?? [], assignedOffers, search, specialty, origin),
    [catalog, assignedOffers, search, specialty, origin],
  );

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
      if (selected.size === 0) throw new Error('اختر مادة واحدة على الأقل');
      return adminAssignCompanyProducts(companyId, [...selected], origin);
    },
    onSuccess: (count) => {
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ['company-seller-products', companyId] });
      qc.invalidateQueries({ queryKey: ['company-assigned-product-ids', companyId] });
      qc.invalidateQueries({ queryKey: ['company', companyId] });
      toast('success', `تم ربط ${count} مادة — الشركة تضع السعر من التطبيق`);
      onAdded();
    },
    onError: (e) => toast('error', (e as Error).message),
  });

  const allVisibleSelected = available.length > 0 && available.every((p) => selected.has(p.id));

  return (
    <Card className="overflow-hidden p-4">
      <p className="mb-4 text-sm text-subtext">
        اختر المواد لربطها بالشركة. لن تظهر للمشترين قبل ما تسعّرها الشركة من التطبيق.
        لو حددت منشأ، تقدر تضيف نفس المادة تاني بمنشأ مختلف — وهتظهر للمشتري صف لكل منشأ بسعره.
      </p>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Input placeholder="بحث…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-48" />
          <Select value={specialty} onChange={(e) => setSpecialty(e.target.value)} className="w-40">
            <option value="all">كل التخصصات</option>
            {(specialties ?? []).map((s) => (
              <option key={s.id} value={s.id}>{s.name_ar}</option>
            ))}
          </Select>
          <Input
            placeholder="المنشأ (اختياري)…"
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            className="w-40"
            title="منشأ العروض اللي هتضيفها دلوقتي"
          />
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
        <p className="py-8 text-center text-sm text-subtext">
          {origin.trim()
            ? `لا توجد مواد متاحة — كل منتجات الكتالوج مضافة لهذه الشركة بمنشأ «${origin.trim()}»`
            : 'لا توجد مواد متاحة للإضافة — كل منتجات الكتالوج مضافة مسبقًا'}
        </p>
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
  );
}
