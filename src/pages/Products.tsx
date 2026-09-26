// المنتجات (الكتالوج المشترك — SKU واحد لكل مادة) + عروض البائعين عليها.
// المنتج ممكن يبقى في أكتر من مكان في الشجرة (`product_placements`)، والجدول
// بيعرض مسار المكان الأساسي كامل من التخصص الرئيسي لغاية آخر فئة.
//
// القايمة بتيجي من `admin_products_list` مش من PostgREST مباشرة، عشان فلتر
// «عدد عروض البائعين» يشتغل في الداتابيز والترقيم يفضل صح معاه.
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { ImagePlus } from 'lucide-react';
import { supabase, arError } from '../lib/supabase';
import {
  ACTIVE_FILTERS, fetchProducts, OFFERS_FILTERS,
  type ActiveFilter, type OffersFilter, type ProductRow,
} from '../api/products';
import { PageHeader, Btn, Input, Select, Toggle, StatusChip, Money } from '../components/ui';
import { DataTable, type Column, PAGE_SIZE } from '../components/DataTable';
import { ImportProductsModal } from '../components/ImportProductsModal';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';
import { productPathText } from '../lib/product-path';
import { ProductModal, useCatalogTree } from '../components/ProductModal';


export default function Products() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [specialty, setSpecialty] = useState('all');
  const [offers, setOffers] = useState<OffersFilter>('all');
  const [active, setActive] = useState<ActiveFilter>('all');
  const [editing, setEditing] = useState<ProductRow | 'new' | null>(null);
  const [offersFor, setOffersFor] = useState<ProductRow | null>(null);
  const [importing, setImporting] = useState(false);

  const { data: tree } = useCatalogTree();

  useEffect(() => {
    if (search === debouncedSearch) return;
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(0); }, 300);
    return () => clearTimeout(t);
  }, [search, debouncedSearch]);

  const list = useQuery({
    queryKey: ['products', debouncedSearch, specialty, offers, active, page],
    queryFn: () => fetchProducts({
      search: debouncedSearch, specialty, offers, active, page, pageSize: PAGE_SIZE,
    }),
    placeholderData: keepPreviousData,
  });

  const toggleActive = useMutation({
    mutationFn: async (r: ProductRow) => {
      const { error } = await supabase.from('products').update({ is_active: !r.isActive }).eq('id', r.id);
      if (error) throw new Error(arError(error));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
    onError: (e) => toast('error', (e as Error).message),
  });

  const rows = list.data?.rows ?? [];

  const columns: Column<ProductRow>[] = [
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
            <div className="font-medium">{r.nameAr}</div>
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
        const extra = Math.max(0, r.placements - 1);
        return (
          <div>
            <div>
              {productPathText(
                tree?.specialties ?? [], tree?.categories ?? [],
                r.specialtyId ?? undefined, r.categoryId ?? null,
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
    { key: 'unit', header: 'الوحدة', render: (r) => r.unitName || '—' },
    {
      key: 'similar',
      header: 'تشابه',
      // الرقم هنا هو اللي بيجمع المواد في «منتجات مشابهة» في التطبيق —
      // ظاهر في الجدول عشان الأدمن يشوف المجموعات من غير ما يفتح كل مادة.
      render: (r) => (
        r.similarCodes.length === 0 ? <span className="text-subtext">—</span> : (
          <div className="flex flex-wrap gap-1">
            {r.similarCodes.map((code) => (
              <span key={code} className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] text-primary" dir="ltr">
                {code}
              </span>
            ))}
          </div>
        )
      ),
    },
    {
      key: 'offers',
      header: 'عروض البائعين',
      render: (r) => (
        <button
          className="text-sm text-accent hover:underline"
          onClick={(e) => { e.stopPropagation(); setOffersFor(r); }}
        >
          {r.offers} عرض
        </button>
      ),
    },
    {
      key: 'active',
      header: 'نشط',
      render: (r) => (
        <span onClick={(e) => e.stopPropagation()}>
          <Toggle checked={r.isActive} onChange={() => toggleActive.mutate(r)} />
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
            <Input placeholder="بحث بالاسم/SKU/رقم تشابه…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-56" />
            <Select value={specialty} onChange={(e) => { setSpecialty(e.target.value); setPage(0); }} className="w-44">
              <option value="all">كل التخصصات</option>
              {(tree?.specialties ?? []).map((s) => (
                <option key={s.id} value={s.id}>{s.name_ar}</option>
              ))}
            </Select>
            {/* «مين مالوش عروض» هو أهم سؤال في الكتالوج — المادة من غير عرض
                بتبان للمشتري من غير سعر. */}
            <Select
              value={offers}
              onChange={(e) => { setOffers(e.target.value as OffersFilter); setPage(0); }}
              className="w-40"
            >
              {OFFERS_FILTERS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>
            {/* المنتج الموقوف بيختفي من «التخصصات والفئات» (استعلامها بيجيب
                النشط بس)، والصفحة دي هي المكان الوحيد اللي بيرجّعه منها.
                من غير الفلتر ده الأدمن اللي نسي الاسم أو الـSKU كان لازم
                يقلّب الصفحات كلها. */}
            <Select
              value={active}
              onChange={(e) => { setActive(e.target.value as ActiveFilter); setPage(0); }}
              className="w-36"
            >
              {ACTIVE_FILTERS.map((a) => (
                <option key={a.value} value={a.value}>{a.label}</option>
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
        loading={list.isLoading}
        error={list.error ? (list.error as Error).message : null}
        onRetry={() => list.refetch()}
        page={page}
        hasMore={(page + 1) * PAGE_SIZE < (list.data?.total ?? 0)}
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


function OffersModal({ product, onClose }: { product: ProductRow; onClose: () => void }) {
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
    <Modal title={`عروض البائعين — ${product.nameAr}`} open onClose={onClose}>
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
