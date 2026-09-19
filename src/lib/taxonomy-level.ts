// فرز مواد المستوى: بتاعته ولا متحطّطة فيه كمكان إضافي.
//
// المادة ممكن تتحطّ في أكتر من مكان (`product_placements`)، وواحد بس منهم هو
// مكانها الأساسي (أعمدة `products.specialty_id/category_id`).
//
// قاعدة «كل مستوى يا أقسام يا مواد» بتتطبّق على النوعين زي بعض — التفرقة هنا
// عشان **الأكشن** مختلف: مادة المستوى بتتنقل بتعديل المادة نفسها، والإضافية
// بتتنقل (أو تتشال) بتعديل صف المكان بس من غير ما المادة تتأثر.

export type LevelProduct = {
  specialty_id: string;
  category_id: string | null;
};

/** المستوى المفتوح دلوقتي: جذر التخصص (`categoryId = null`) أو فرع جواه. */
export type Level = {
  specialtyId: string;
  categoryId: string | null;
};

/** المادة مكانها الأساسي في المستوى ده؟ (يعني بتتحسب في قاعدة XOR) */
export function isOwnAtLevel(product: LevelProduct, level: Level): boolean {
  return level.categoryId === null
    ? product.specialty_id === level.specialtyId && product.category_id === null
    : product.category_id === level.categoryId;
}

/** بيفصل مواد المستوى عن المواد المتحطّطة فيه كمكان إضافي. */
export function splitLevelProducts<T extends LevelProduct>(
  rows: readonly T[],
  level: Level,
): { own: T[]; extra: T[] } {
  const own: T[] = [];
  const extra: T[] = [];
  for (const row of rows) (isOwnAtLevel(row, level) ? own : extra).push(row);
  return { own, extra };
}
