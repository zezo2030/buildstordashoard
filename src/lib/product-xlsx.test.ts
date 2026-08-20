import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseProductXlsx, planProductImport, type ParsedProductRow } from './product-xlsx';

const milstonExport = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../milston/products_export.xlsx',
);

function row(partial: Partial<ParsedProductRow> & Pick<ParsedProductRow, 'rowNumber' | 'sku' | 'nameAr'>): ParsedProductRow {
  return {
    originCountry: null,
    descriptionAr: null,
    image: null,
    ...partial,
  };
}

describe('planProductImport', () => {
  it('queues new SKUs and skips ones already in the catalog', () => {
    const plan = planProductImport(
      [
        row({ rowNumber: 2, nameAr: 'ازميل 10', sku: '54010111', originCountry: 'CHN' }),
        row({ rowNumber: 3, nameAr: 'ازميل 12', sku: '54010112', originCountry: 'CHN' }),
      ],
      new Set(['54010111']),
    );
    expect(plan.toInsert.map((r) => r.sku)).toEqual(['54010112']);
    expect(plan.skippedDuplicate.map((r) => r.sku)).toEqual(['54010111']);
    expect(plan.skippedInvalid).toEqual([]);
  });

  it('skips a second copy of the same SKU inside the file', () => {
    const plan = planProductImport(
      [
        row({ rowNumber: 2, nameAr: 'A', sku: '54010111' }),
        row({ rowNumber: 3, nameAr: 'A copy', sku: '54010111' }),
      ],
      new Set(),
    );
    expect(plan.toInsert.map((r) => r.sku)).toEqual(['54010111']);
    expect(plan.skippedDuplicate.map((r) => r.rowNumber)).toEqual([3]);
  });

  it('skips rows missing name or code', () => {
    const plan = planProductImport(
      [
        row({ rowNumber: 2, nameAr: '', sku: '54010111' }),
        row({ rowNumber: 3, nameAr: 'ازميل', sku: '' }),
        row({ rowNumber: 4, nameAr: 'صالح', sku: '54010603' }),
      ],
      new Set(),
    );
    expect(plan.toInsert.map((r) => r.sku)).toEqual(['54010603']);
    expect(plan.skippedInvalid).toEqual([
      { rowNumber: 2, reason: 'missing_name' },
      { rowNumber: 3, reason: 'missing_sku' },
    ]);
  });

  it('ignores completely blank rows', () => {
    const plan = planProductImport(
      [row({ rowNumber: 2, nameAr: '', sku: '' })],
      new Set(),
    );
    expect(plan.toInsert).toEqual([]);
    expect(plan.skippedDuplicate).toEqual([]);
    expect(plan.skippedInvalid).toEqual([]);
  });
});

describe('parseProductXlsx', () => {
  it('reads the Milston export sheet with embedded images', async () => {
    const buf = await readFile(milstonExport);
    const parsed = await parseProductXlsx(buf);
    expect(parsed.rows).toHaveLength(5);
    expect(parsed.rows[0]?.sku).toBe('54010111');
    expect(parsed.rows[0]?.originCountry).toBe('CHN');
    expect(parsed.rows[0]?.nameAr).toContain('ازميل');
    expect(parsed.rows.map((r) => r.sku)).toEqual([
      '54010111',
      '54010112',
      '54010601',
      '54010602',
      '54010603',
    ]);
    for (const r of parsed.rows) {
      expect(r.image?.bytes.byteLength, `row ${r.rowNumber} image`).toBeGreaterThan(100);
    }
  });

  it('rejects a file that is not a workbook', async () => {
    await expect(parseProductXlsx(new Uint8Array([1, 2, 3]))).rejects.toThrow(/Excel|xlsx|نموذج/i);
  });
});
