import { describe, expect, it } from 'vitest';
import {
  ADMIN_ASSIGN_CHUNK,
  chunkIds,
  filterCatalogForBulkAdd,
  offerAwaitingSellerPrice,
  toAssignedProductIdSet,
} from './company-materials';

const catalog = [
  { id: 'p1', sku: 'C-1', name_ar: 'أسمنت', specialty_id: 's1' },
  { id: 'p2', sku: 'C-2', name_ar: 'رمل', specialty_id: 's1' },
  { id: 'p3', sku: 'S-9', name_ar: 'حديد', specialty_id: 's2' },
];

describe('toAssignedProductIdSet', () => {
  it('يقبل Set من ids', () => {
    expect([...toAssignedProductIdSet(new Set(['p1']))]).toEqual(['p1']);
  });

  it('يقبل مصفوفة ids', () => {
    expect([...toAssignedProductIdSet(['p1', 'p2'])].sort()).toEqual(['p1', 'p2']);
  });

  it('يستخرج product_id من صفوف seller_products', () => {
    expect([...toAssignedProductIdSet([{ product_id: 'p1' }])]).toEqual(['p1']);
  });

  it('يستخرج id المنتج من كاش تاب القائمة (صفوف العروض) بدون ما يرمي', () => {
    const listTabCache = [{ id: 'offer-1', product: { id: 'p1' } }];
    expect(() => toAssignedProductIdSet(listTabCache)).not.toThrow();
    expect([...toAssignedProductIdSet(listTabCache)]).toEqual(['p1']);
  });

  it('يرجّع Set فاضي للقيم الفاضية', () => {
    expect(toAssignedProductIdSet(undefined).size).toBe(0);
    expect(toAssignedProductIdSet(null).size).toBe(0);
  });
});

describe('filterCatalogForBulkAdd', () => {
  it('لا يرمي لما الكاش مصفوفة عروض — نفس شكل queryKey المشترك مع تاب القائمة', () => {
    const listTabCache = [{ id: 'offer-1', price: 1.5, product: { id: 'p1' } }];
    expect(() => filterCatalogForBulkAdd(catalog, listTabCache, '', 'all')).not.toThrow();
    expect(filterCatalogForBulkAdd(catalog, listTabCache, '', 'all').map((p) => p.id)).toEqual(['p2', 'p3']);
  });

  it('يخفي المواد المعينة مسبقاً من مصفوفة ids', () => {
    expect(filterCatalogForBulkAdd(catalog, ['p2'], '', 'all').map((p) => p.id)).toEqual(['p1', 'p3']);
  });

  it('يصفي بالتخصص والبحث', () => {
    expect(filterCatalogForBulkAdd(catalog, [], 'حديد', 'all').map((p) => p.id)).toEqual(['p3']);
    expect(filterCatalogForBulkAdd(catalog, [], '', 's1').map((p) => p.id)).toEqual(['p1', 'p2']);
  });

  it('يظهر المنتج في التخصص الإضافي من specialty_ids', () => {
    const extra = [{ id: 'p4', sku: 'X-1', name_ar: 'أسمنت', specialty_id: 's1', specialty_ids: ['s1', 's2'] }];
    expect(filterCatalogForBulkAdd(extra, [], '', 's2').map((p) => p.id)).toEqual(['p4']);
    expect(filterCatalogForBulkAdd(extra, [], '', 's3').map((p) => p.id)).toEqual([]);
  });
});

describe('chunkIds', () => {
  it('يقسّم على سقف الـRPC', () => {
    const ids = Array.from({ length: ADMIN_ASSIGN_CHUNK + 2 }, (_, i) => `p${i}`);
    const parts = chunkIds(ids);
    expect(parts).toHaveLength(2);
    expect(parts[0]).toHaveLength(ADMIN_ASSIGN_CHUNK);
    expect(parts[1]).toEqual(['p200', 'p201']);
  });

  it('يرجّع فاضي للمصفوفة الفاضية', () => {
    expect(chunkIds([])).toEqual([]);
  });
});

describe('offerAwaitingSellerPrice', () => {
  it('يعتبر صفر وسالب بانتظار سعر الشركة', () => {
    expect(offerAwaitingSellerPrice(0)).toBe(true);
    expect(offerAwaitingSellerPrice(-1)).toBe(true);
    expect(offerAwaitingSellerPrice(1.25)).toBe(false);
  });
});
