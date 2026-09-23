import { describe, expect, it } from 'vitest';
import { arrangeLevel, isOwnAtLevel, moveTo, shownDividers, splitLevelProducts } from './taxonomy-level';

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

describe('moveTo', () => {
  it('السحب لتحت بيحط المادة بعد الهدف', () => {
    expect(moveTo(['a', 'b', 'c', 'd'], 'a', 'c')).toEqual(['b', 'c', 'a', 'd']);
  });

  it('السحب لفوق بيحطها قبل الهدف', () => {
    expect(moveTo(['a', 'b', 'c', 'd'], 'd', 'b')).toEqual(['a', 'd', 'b', 'c']);
  });

  // الموقوف المخفي بيفضل في ترتيب المستوى، فالسحب بيعدّي فوقه من غير ما يزحزحه
  // بره مكانه بين جيرانه.
  it('العناصر المخفية بتفضل مكانها النسبي', () => {
    expect(moveTo(['a', 'hidden', 'b'], 'b', 'a')).toEqual(['b', 'a', 'hidden']);
  });

  it('السحب على نفسه أو على عنصر مش في القايمة مابيغيّرش حاجة', () => {
    expect(moveTo(['a', 'b'], 'a', 'a')).toEqual(['a', 'b']);
    expect(moveTo(['a', 'b'], 'a', 'zz')).toEqual(['a', 'b']);
  });
});

describe('arrangeLevel', () => {
  const rows = [
    { id: 'a', name_ar: 'سيفون 4x6', origin_country: 'KWT' },
    { id: 'b', name_ar: 'اسطوانة 7', origin_country: 'CHN' },
    { id: 'c', name_ar: 'بلف', origin_country: null },
    { id: 'd', name_ar: 'اسطوانة 4', origin_country: 'kwt' },
    { id: 'e', name_ar: 'جلبة', origin_country: 'CHN ' },
  ];

  it('بالاسم: أبجدي ومن غير فواصل', () => {
    expect(arrangeLevel(rows, 'name')).toEqual({ ids: ['d', 'b', 'c', 'e', 'a'], dividerIds: [] });
  });

  it('بالمنشأ: المنشأ مع بعض، بالاسم جوّاه، واللي من غير منشأ آخر حاجة', () => {
    expect(arrangeLevel(rows, 'origin').ids).toEqual(['b', 'e', 'd', 'a', 'c']);
  });

  it('بالمنشأ: فاصل فوق أول مادة في كل مجموعة غير الأولى — والحروف والمسافات ما بتفرّقش', () => {
    expect(arrangeLevel(rows, 'origin').dividerIds).toEqual(['d', 'c']);
  });

  it('منشأ واحد بس ⇒ مفيش فواصل', () => {
    expect(arrangeLevel(rows.slice(0, 1), 'origin').dividerIds).toEqual([]);
  });
});

describe('shownDividers', () => {
  const order = ['a', 'b', 'c', 'd', 'e'];

  it('الفاصل على مادة ظاهرة بيترسم فوقها', () => {
    expect(shownDividers(order, new Set(['c']), new Set(order))).toEqual(new Set(['c']));
  });

  it('الفاصل على مادة مستخبية بيتنقل لأول مادة ظاهرة بعدها', () => {
    expect(shownDividers(order, new Set(['c']), new Set(['a', 'b', 'e']))).toEqual(new Set(['e']));
  });

  it('مفيش خط فوق أول مادة ظاهرة، ولا خطين ورا بعض', () => {
    expect(shownDividers(order, new Set(['a', 'b', 'c']), new Set(['b', 'c', 'd']))).toEqual(new Set(['c']));
  });
});
