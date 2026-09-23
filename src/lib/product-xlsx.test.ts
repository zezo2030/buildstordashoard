import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { skuFromSourceCode } from './catalog-sku';
import {
  buildCodeColumnXlsxTemplate,
  cleanCell,
  buildProductXlsxTemplate,
  parseCodeColumnXlsx,
  parseProductXlsx,
  planProductImport,
  splitDescriptionCell,
  type ParsedProductRow,
} from './product-xlsx';

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
  it('generates a public SKU from the Excel code and skips codes already in the catalog', () => {
    const plan = planProductImport(
      [
        row({ rowNumber: 2, nameAr: 'ازميل 10', sku: '54010111', originCountry: 'CHN' }),
        row({ rowNumber: 3, nameAr: 'ازميل 12', sku: '54010112', originCountry: 'CHN' }),
      ],
      new Set(['54010111']),
    );
    expect(plan.toInsert).toEqual([
      expect.objectContaining({
        sourceCode: '54010112',
        sku: skuFromSourceCode('54010112'),
        nameAr: 'ازميل 12',
      }),
    ]);
    expect(plan.skippedDuplicate.map((r) => r.sourceCode)).toEqual(['54010111']);
    expect(plan.skippedInvalid).toEqual([]);
  });

  it('skips a code whose generated SKU is already in the catalog', () => {
    const plan = planProductImport(
      [row({ rowNumber: 2, nameAr: 'ازميل 10', sku: '54010111' })],
      new Set([skuFromSourceCode('54010111')]),
    );
    expect(plan.toInsert).toEqual([]);
    expect(plan.skippedDuplicate.map((r) => r.sourceCode)).toEqual(['54010111']);
  });

  it('skips a second copy of the same code inside the file', () => {
    const plan = planProductImport(
      [
        row({ rowNumber: 2, nameAr: 'A', sku: '54010111' }),
        row({ rowNumber: 3, nameAr: 'A copy', sku: '54010111' }),
      ],
      new Set(),
    );
    expect(plan.toInsert.map((r) => r.sourceCode)).toEqual(['54010111']);
    expect(plan.toInsert[0]?.sku).toBe(skuFromSourceCode('54010111'));
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
    expect(plan.toInsert.map((r) => r.sourceCode)).toEqual(['54010603']);
    expect(plan.toInsert[0]?.sku).toBe(skuFromSourceCode('54010603'));
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

describe('buildProductXlsxTemplate', () => {
  it('produces a workbook the importer accepts, with no data rows', async () => {
    const parsed = await parseProductXlsx(buildProductXlsxTemplate());
    expect(parsed.rows).toEqual([]);
  });

  it('round-trips sample rows including Arabic text', async () => {
    const parsed = await parseProductXlsx(buildProductXlsxTemplate([
      { nameAr: 'ازميل 10', originCountry: 'CHN', sku: '54010111', descriptionAr: 'وصف' },
    ]));
    expect(parsed.rows).toEqual([
      expect.objectContaining({
        rowNumber: 2,
        nameAr: 'ازميل 10',
        originCountry: 'CHN',
        sku: '54010111',
        descriptionAr: 'وصف',
        image: null,
      }),
    ]);
  });
});

describe('parseCodeColumnXlsx', () => {
  it('reads codes from a Code-only sheet', async () => {
    const parsed = await parseCodeColumnXlsx(buildCodeColumnXlsxTemplate(['54010111', '54010112']));
    expect(parsed.rows.map((r) => ({ rowNumber: r.rowNumber, sku: r.sku }))).toEqual([
      { rowNumber: 2, sku: '54010111' },
      { rowNumber: 3, sku: '54010112' },
    ]);
  });

  it('reads Code from the full product import sheet and ignores the other columns', async () => {
    const parsed = await parseCodeColumnXlsx(buildProductXlsxTemplate([
      { nameAr: 'ازميل 10', originCountry: 'CHN', sku: '54010111', descriptionAr: 'وصف' },
    ]));
    expect(parsed.rows.map((r) => r.sku)).toEqual(['54010111']);
  });

  it('is rejected by the product importer because that still needs the full header row', async () => {
    const bytes = buildCodeColumnXlsxTemplate(['54010111']);
    await expect(parseProductXlsx(bytes)).rejects.toThrow(/Product Name|Made In|نموذج/i);
  });
});

describe('splitDescriptionCell', () => {
  it('الرقم بيبقى رقم تشابه مش وصف', () => {
    expect(splitDescriptionCell('14')).toEqual({ similarCodes: ['14'], descriptionAr: null });
  });

  it('كذا رقم في نفس الخانة', () => {
    expect(splitDescriptionCell('14, 16')).toEqual({ similarCodes: ['14', '16'], descriptionAr: null });
    expect(splitDescriptionCell('14-16')).toEqual({ similarCodes: ['14', '16'], descriptionAr: null });
  });

  it('المكرر مرة واحدة', () => {
    expect(splitDescriptionCell('14 14')).toEqual({ similarCodes: ['14'], descriptionAr: null });
  });

  it('النص بيفضل وصف — والشيتات القديمة ما تتكسرش', () => {
    expect(splitDescriptionCell('كابل نحاس معزول 4 مم')).toEqual({
      similarCodes: [],
      descriptionAr: 'كابل نحاس معزول 4 مم',
    });
  });

  it('الفاضي مالوش لا ده ولا ده', () => {
    expect(splitDescriptionCell('  ')).toEqual({ similarCodes: [], descriptionAr: null });
    expect(splitDescriptionCell(null)).toEqual({ similarCodes: [], descriptionAr: null });
  });
});

describe('cleanCell', () => {
  it('بيرجّع النص المفيد زي ما هو', () => {
    expect(cleanCell(' الكويت ')).toBe('الكويت');
  });

  it('القيم النايبة بتبقى null مش نص', () => {
    for (const v of ['N/A', 'n/a', 'NA', '-', '—', 'غير متوفر', 'لا يوجد']) {
      expect(cleanCell(v)).toBeNull();
    }
  });

  it('الفاضي والمعدوم بيرجعوا null', () => {
    expect(cleanCell('')).toBeNull();
    expect(cleanCell('   ')).toBeNull();
    expect(cleanCell(null)).toBeNull();
    expect(cleanCell(undefined)).toBeNull();
  });
});
