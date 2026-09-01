import { describe, expect, it } from 'vitest';
import { skuFromSourceCode } from './catalog-sku';

const PUBLIC_SKU = /^[A-Z]\d{6}$/;

describe('skuFromSourceCode', () => {
  it('builds a public SKU of one letter and six digits, not the Excel code', () => {
    const sku = skuFromSourceCode('69011320');
    expect(sku).not.toBe('69011320');
    expect(sku).toMatch(PUBLIC_SKU);
  });

  it('returns the same SKU every time for the same code', () => {
    expect(skuFromSourceCode('54010111')).toBe(skuFromSourceCode('54010111'));
  });

  it('returns different SKUs for different codes', () => {
    expect(skuFromSourceCode('54010111')).not.toBe(skuFromSourceCode('54010112'));
  });

  it('trims whitespace before hashing', () => {
    expect(skuFromSourceCode('  54010111  ')).toBe(skuFromSourceCode('54010111'));
  });

  it('rejects an empty code', () => {
    expect(() => skuFromSourceCode('   ')).toThrow(/الكود/);
  });
});
