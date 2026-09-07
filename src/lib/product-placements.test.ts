import { describe, expect, it } from 'vitest';
import {
  addPlacement, makePrimary, normalizePlacements, placementKey,
  primaryPlacement, removePlacement,
} from './product-placements';

const a = { specialtyId: 's1', categoryId: 'c1' };
const b = { specialtyId: 's1', categoryId: 'c2' };
const c = { specialtyId: 's2', categoryId: null };

describe('normalizePlacements', () => {
  it('يشيل التكرار ويحافظ على الترتيب', () => {
    expect(normalizePlacements([a, b, a])).toEqual([a, b]);
  });

  it('يتجاهل السطر اللي مالوش تخصص', () => {
    expect(normalizePlacements([{ specialtyId: '', categoryId: 'c1' }, a])).toEqual([a]);
  });

  it('الفئة الفاضية بتتحول null عشان تتقارن صح', () => {
    expect(normalizePlacements([{ specialtyId: 's2', categoryId: '' }])).toEqual([c]);
  });

  it('نفس التخصص بفرعين = مكانين مختلفين', () => {
    expect(normalizePlacements([a, b])).toHaveLength(2);
  });
});

describe('addPlacement', () => {
  it('مابيضفش مكان موجود', () => {
    expect(addPlacement([a, b], a)).toEqual([a, b]);
  });
  it('بيضيف مكان جديد في الآخر', () => {
    expect(addPlacement([a], c)).toEqual([a, c]);
  });
});

describe('removePlacement', () => {
  it('بيشيل بالمفتاح', () => {
    expect(removePlacement([a, b], placementKey(a))).toEqual([b]);
  });
});

describe('primaryPlacement / makePrimary', () => {
  it('الأساسي هو الأول', () => {
    expect(primaryPlacement([b, a])).toEqual(b);
    expect(primaryPlacement([])).toBeNull();
  });
  it('التحويل لأساسي بينقله لأول القايمة من غير ما يكرر', () => {
    expect(makePrimary([a, b, c], placementKey(c))).toEqual([c, a, b]);
  });
  it('مفتاح مش موجود مايغيّرش حاجة', () => {
    expect(makePrimary([a, b], 'nope')).toEqual([a, b]);
  });
});
