import { describe, expect, it } from 'vitest';
import { sellersOffersLabel } from './labels';

describe('sellersOffersLabel', () => {
  it('المفيش والمفرد والمثنى', () => {
    expect(sellersOffersLabel(0)).toBe('مفيش بائعين');
    expect(sellersOffersLabel(1)).toBe('عند بائع واحد');
    expect(sellersOffersLabel(2)).toBe('عند بائعين');
  });

  it('الجمع بيرجع للمفرد من 11', () => {
    expect(sellersOffersLabel(3)).toBe('عند 3 بائعين');
    expect(sellersOffersLabel(10)).toBe('عند 10 بائعين');
    expect(sellersOffersLabel(11)).toBe('عند 11 بائع');
  });
});
