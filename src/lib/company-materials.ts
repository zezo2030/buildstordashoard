import { productInSpecialty } from './product-specialties';

export type BulkCatalogProduct = {
  id: string;
  sku: string;
  name_ar: string;
  specialty_id: string;
  specialty?: { name_ar: string } | null;
  specialty_ids?: string[];
};

/** يحوّل أي شكل كاش (Set، ids، صفوف عروض) لمجموعة product_id — بدون ما يرمي. */
export function toAssignedProductIdSet(cache: unknown): Set<string> {
  if (!cache) return new Set();
  if (cache instanceof Set) {
    return new Set([...cache].filter((v): v is string => typeof v === 'string'));
  }
  if (!Array.isArray(cache)) return new Set();
  const ids = new Set<string>();
  for (const item of cache) {
    if (typeof item === 'string') {
      ids.add(item);
      continue;
    }
    if (!item || typeof item !== 'object') continue;
    const row = item as { product_id?: unknown; product?: { id?: unknown } };
    if (typeof row.product_id === 'string') ids.add(row.product_id);
    else if (typeof row.product?.id === 'string') ids.add(row.product.id);
  }
  return ids;
}

export function filterCatalogForBulkAdd(
  catalog: BulkCatalogProduct[],
  assignedCache: unknown,
  search: string,
  specialty: string,
): BulkCatalogProduct[] {
  const assigned = toAssignedProductIdSet(assignedCache);
  const term = search.trim().toLocaleLowerCase();
  return catalog.filter((p) => {
    if (assigned.has(p.id)) return false;
    if (specialty !== 'all' && !productInSpecialty(p.specialty_id, p.specialty_ids, specialty)) return false;
    if (!term) return true;
    return p.name_ar.toLocaleLowerCase().includes(term) || p.sku.toLocaleLowerCase().includes(term);
  });
}

/** سقف `admin_assign_company_products` / `seller_add_products`. */
export const ADMIN_ASSIGN_CHUNK = 200;

export function chunkIds(ids: string[], size = ADMIN_ASSIGN_CHUNK): string[][] {
  if (ids.length === 0) return [];
  const out: string[][] = [];
  for (let i = 0; i < ids.length; i += size) out.push(ids.slice(i, i + size));
  return out;
}

/** سعر 0 = لسه الشركة ما حطّتش سعرها، والعرض مش ظاهر للمشتري. */
export function offerAwaitingSellerPrice(price: number): boolean {
  return !Number.isFinite(price) || price <= 0;
}
