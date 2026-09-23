import { describe, expect, it } from 'vitest';
import { addSimilarCodes, isSimilarCode, MAX_SIMILAR_CODES } from './similar-codes';

describe('isSimilarCode', () => {
  it('أرقام بس', () => {
    expect(isSimilarCode('14')).toBe(true);
    expect(isSimilarCode(' 16 ')).toBe(true);
    expect(isSimilarCode('a14')).toBe(false);
    expect(isSimilarCode('')).toBe(false);
    expect(isSimilarCode('12345678901')).toBe(false);
  });
});

describe('addSimilarCodes', () => {
  it('بتضيف رقم واحد', () => {
    expect(addSimilarCodes([], '14')).toEqual(['14']);
  });

  it('بتفصل الأرقام المكتوبة ورا بعض', () => {
    expect(addSimilarCodes([], '14, 16 18')).toEqual(['14', '16', '18']);
  });

  it('مابتكررش ومابتقبلش اللي مش رقم', () => {
    expect(addSimilarCodes(['14'], '14')).toEqual(['14']);
    expect(addSimilarCodes(['14'], 'abc')).toEqual(['14']);
  });

  it('بتقف عند الحد الأقصى', () => {
    const full = Array.from({ length: MAX_SIMILAR_CODES }, (_, i) => String(i + 1));
    expect(addSimilarCodes(full, '999')).toEqual(full);
  });
});
