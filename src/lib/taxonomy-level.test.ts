import { describe, expect, it } from 'vitest';
import { isOwnAtLevel, splitLevelProducts } from './taxonomy-level';

const SPEC_A = 'spec-a';
const SPEC_B = 'spec-b';
const CAT = 'cat-1';

describe('isOwnAtLevel', () => {
  it('جذر التخصص: المادة بتاعته لو مكانها الأساسي هو الجذر نفسه', () => {
    expect(isOwnAtLevel({ specialty_id: SPEC_A, category_id: null }, { specialtyId: SPEC_A, categoryId: null }))
      .toBe(true);
  });

  it('جذر التخصص: مادة مكانها الأساسي تخصص تاني = مكان إضافي', () => {
    expect(isOwnAtLevel({ specialty_id: SPEC_B, category_id: null }, { specialtyId: SPEC_A, categoryId: null }))
      .toBe(false);
  });

  it('جذر التخصص: مادة مكانها الأساسي فرع جوه نفس التخصص = مكان إضافي', () => {
    expect(isOwnAtLevel({ specialty_id: SPEC_A, category_id: CAT }, { specialtyId: SPEC_A, categoryId: null }))
      .toBe(false);
  });

  it('داخل فرع: المقارنة على الفرع نفسه مش على التخصص', () => {
    expect(isOwnAtLevel({ specialty_id: SPEC_B, category_id: CAT }, { specialtyId: SPEC_A, categoryId: CAT }))
      .toBe(true);
    expect(isOwnAtLevel({ specialty_id: SPEC_A, category_id: 'cat-2' }, { specialtyId: SPEC_A, categoryId: CAT }))
      .toBe(false);
  });
});

describe('splitLevelProducts', () => {
  // ده بالظبط وضع «الكهرباء»: 3 أقسام + مادة سايبة في الجذر مكانها الأساسي
  // تخصص تاني — لازم تتفرز «إضافية» عشان تاخد زرار «نقل لقسم» مش تعديل المادة.
  it('المادة اللي مكانها الأساسي بره بتتفرز إضافية', () => {
    const { own, extra } = splitLevelProducts(
      [{ specialty_id: SPEC_B, category_id: 'cat-x' }],
      { specialtyId: SPEC_A, categoryId: null },
    );
    expect(own).toHaveLength(0);
    expect(extra).toHaveLength(1);
  });

  it('بيحافظ على ترتيب الصفوف في كل قايمة', () => {
    const rows = [
      { specialty_id: SPEC_A, category_id: null, sku: '1' },
      { specialty_id: SPEC_B, category_id: null, sku: '2' },
      { specialty_id: SPEC_A, category_id: null, sku: '3' },
    ];
    const { own, extra } = splitLevelProducts(rows, { specialtyId: SPEC_A, categoryId: null });
    expect(own.map((r) => r.sku)).toEqual(['1', '3']);
    expect(extra.map((r) => r.sku)).toEqual(['2']);
  });
});
