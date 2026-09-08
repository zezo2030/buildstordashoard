// كتالوج المنصة في اللوحة — البحث والتخصص وعدد عروض البائعين كلهم فلترة في
// الداتابيز عبر `admin_products_list`.
//
// الفلتر على عدد العروض ما ينفعش يتعمل بـPostgREST: العدّ نفسه هو شرط الفلترة
// («عرض واحد بس» / «من غير عروض») ودي `having` مش `where`، فالقايمة بقت RPC زي
// الطلبات والفواتير — وكده الترقيم والإجمالي بيفضلوا صح مع الفلتر.
import { supabase, arError } from '../lib/supabase';

export type ProductRow = {
  id: string;
  sku: string;
  sourceCode: string | null;
  nameAr: string;
  images: string[];
  isActive: boolean;
  specialtyId: string | null;
  categoryId: string | null;
  unitName: string;
  offers: number;
  placements: number;
};

/** شرائح عدد العروض المعروضة في الفلتر — الحدود بتتبعت للداتابيز زي ما هي. */
export type OffersFilter = 'all' | 'none' | 'one' | 'two' | 'three_plus';

export const OFFERS_FILTERS: { value: OffersFilter; label: string }[] = [
  { value: 'all', label: 'كل العروض' },
  { value: 'none', label: 'بدون عروض' },
  { value: 'one', label: 'عرض واحد' },
  { value: 'two', label: 'عرضان' },
  { value: 'three_plus', label: '٣ عروض فأكثر' },
];

export function offersRange(f: OffersFilter): { min: number | null; max: number | null } {
  switch (f) {
    case 'none': return { min: 0, max: 0 };
    case 'one': return { min: 1, max: 1 };
    case 'two': return { min: 2, max: 2 };
    case 'three_plus': return { min: 3, max: null };
    default: return { min: null, max: null };
  }
}

export type ProductsQuery = {
  search: string;
  specialty: string;
  offers: OffersFilter;
  page: number;
  pageSize: number;
};

export async function fetchProducts(q: ProductsQuery): Promise<{ rows: ProductRow[]; total: number }> {
  const range = offersRange(q.offers);
  const { data, error } = await supabase.rpc('admin_products_list' as never, {
    p_search: q.search.trim() || null,
    p_specialty: q.specialty === 'all' ? null : q.specialty,
    p_offers_min: range.min,
    p_offers_max: range.max,
    p_limit: q.pageSize,
    p_offset: q.page * q.pageSize,
  } as never);
  if (error) throw new Error(arError(error));
  const r = data as unknown as { rows?: Record<string, unknown>[]; total?: unknown };
  return {
    rows: (r.rows ?? []).map((x) => ({
      id: String(x.id),
      sku: String(x.sku ?? ''),
      sourceCode: (x.source_code as string | null) ?? null,
      nameAr: String(x.name_ar ?? ''),
      images: Array.isArray(x.images) ? (x.images as string[]) : [],
      isActive: x.is_active === true,
      specialtyId: (x.specialty_id as string | null) ?? null,
      categoryId: (x.category_id as string | null) ?? null,
      unitName: String(x.unit_name ?? ''),
      offers: Number(x.offers ?? 0),
      placements: Number(x.placements ?? 0),
    })),
    total: Number(r.total ?? 0),
  };
}
