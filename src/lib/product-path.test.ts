import { describe, expect, it } from 'vitest';
import {
  productPath, productPathText, leafCategories, specialtiesWithoutBranches,
} from './product-path';

const specialties = [
  { id: 'sp-elec', name_ar: 'الكهرباء' },
  { id: 'sp-ac', name_ar: 'التكييف' },
];

const categories = [
  { id: 'c1', name_ar: 'بوكسات', parent_id: null, specialty_id: 'sp-elec' },
  { id: 'c2', name_ar: 'بوكس كهرباء', parent_id: 'c1', specialty_id: 'sp-elec' },
  { id: 'c3', name_ar: 'كابلات', parent_id: null, specialty_id: 'sp-elec' },
];

describe('productPath', () => {
  it('يبني المسار من التخصص لآخر فئة', () => {
    expect(productPath(specialties, categories, 'sp-elec', 'c2'))
      .toEqual(['الكهرباء', 'بوكسات', 'بوكس كهرباء']);
  });

  it('التخصص لوحده لما مفيش فئة', () => {
    expect(productPath(specialties, categories, 'sp-ac', null)).toEqual(['التكييف']);
  });

  it('يرجع فاضي لما التخصص مش معروف ومفيش فئة', () => {
    expect(productPath(specialties, categories, null, null)).toEqual([]);
    expect(productPathText(specialties, categories, null, null)).toBe('—');
  });

  it('مايعلّقش لو parent_id عامل حلقة', () => {
    const looped = [
      { id: 'a', name_ar: 'أ', parent_id: 'b', specialty_id: 'sp-elec' },
      { id: 'b', name_ar: 'ب', parent_id: 'a', specialty_id: 'sp-elec' },
    ];
    expect(productPath(specialties, looped, 'sp-elec', 'a')).toEqual(['الكهرباء', 'ب', 'أ']);
  });

  it('نص المسار بسهم', () => {
    expect(productPathText(specialties, categories, 'sp-elec', 'c1'))
      .toBe('الكهرباء ← بوكسات');
  });
});

describe('leafCategories', () => {
  it('الفروع اللي مالهاش أبناء بس', () => {
    expect(leafCategories(categories).map((c) => c.id)).toEqual(['c2', 'c3']);
  });
});

describe('specialtiesWithoutBranches', () => {
  it('التخصص اللي مفيهوش فروع بيقبل منتجات مباشرة', () => {
    const s = specialtiesWithoutBranches(specialties, categories);
    expect(s.has('sp-ac')).toBe(true);
    expect(s.has('sp-elec')).toBe(false);
  });
});
