import { describe, expect, it } from 'vitest';
import { planCompanyProductLink, type CatalogMatch } from './company-link-xlsx';
import type { ParsedProductRow } from './product-xlsx';

function row(partial: Partial<ParsedProductRow> & Pick<ParsedProductRow, 'rowNumber' | 'sku' | 'nameAr'>): ParsedProductRow {
  return {
    originCountry: null,
    descriptionAr: null,
    image: null,
    ...partial,
  };
}

const catalog = new Map<string, CatalogMatch>([
  ['54010111', { id: 'p-1', sku: '54010111', name_ar: 'ازميل 10', unit_id: 'u-1' }],
  ['54010112', { id: 'p-2', sku: '54010112', name_ar: 'ازميل 12', unit_id: 'u-1' }],
]);

describe('planCompanyProductLink', () => {
  it('links catalog SKUs not yet offered by the company', () => {
    const plan = planCompanyProductLink(
      [
        row({ rowNumber: 2, nameAr: 'ازميل 10', sku: '54010111' }),
        row({ rowNumber: 3, nameAr: 'اسم مختلف بالشيت', sku: '54010112' }),
      ],
      catalog,
      new Set(['p-1']),
    );
    expect(plan.toLink).toEqual([
      {
        rowNumber: 3,
        productId: 'p-2',
        sku: '54010112',
        nameAr: 'اسم مختلف بالشيت',
        catalogNameAr: 'ازميل 12',
        unitId: 'u-1',
        originCountry: null,
      },
    ]);
    expect(plan.alreadyLinked.map((r) => r.sku)).toEqual(['54010111']);
    expect(plan.notInCatalog).toEqual([]);
  });

  it('classifies SKUs missing from the catalog without dropping other rows', () => {
    const plan = planCompanyProductLink(
      [
        row({ rowNumber: 2, nameAr: 'غير موجود', sku: '99999999' }),
        row({ rowNumber: 3, nameAr: 'صالح', sku: '54010111' }),
      ],
      catalog,
      new Set(),
    );
    expect(plan.notInCatalog).toEqual([{ rowNumber: 2, sku: '99999999', nameAr: 'غير موجود' }]);
    expect(plan.toLink.map((r) => r.sku)).toEqual(['54010111']);
  });

  it('skips a second copy of the same SKU inside the file', () => {
    const plan = planCompanyProductLink(
      [
        row({ rowNumber: 2, nameAr: 'A', sku: '54010111' }),
        row({ rowNumber: 3, nameAr: 'A copy', sku: '54010111' }),
      ],
      catalog,
      new Set(),
    );
    expect(plan.toLink.map((r) => r.rowNumber)).toEqual([2]);
    expect(plan.duplicateInFile.map((r) => r.rowNumber)).toEqual([3]);
  });

  it('reports rows without a code and ignores blank rows', () => {
    const plan = planCompanyProductLink(
      [
        row({ rowNumber: 2, nameAr: 'بدون كود', sku: '' }),
        row({ rowNumber: 3, nameAr: '', sku: '' }),
      ],
      catalog,
      new Set(),
    );
    expect(plan.missingSku).toEqual([{ rowNumber: 2 }]);
    expect(plan.toLink).toEqual([]);
    expect(plan.notInCatalog).toEqual([]);
  });
});
