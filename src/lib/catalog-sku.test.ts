import { describe, expect, it } from 'vitest';
import { skuFromSourceCode } from './catalog-sku';

describe('skuFromSourceCode', () => {
  it('builds a public SKU that is not the private Excel code', () => {
    const sku = skuFromSourceCode('69011320');
    expect(sku).not.toBe('69011320');
    expect(sku.startsWith('BS-')).toBe(true);
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
