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

/**
 * نقل عنصر لمكان عنصر تاني في نفس القايمة — قلب السحب والإفلات.
 *
 * بتشتغل على **ترتيب المستوى كامل** مش على اللي ظاهر بس: الموقوف المخفي
 * والمواد الإضافية بيفضلوا بين جيرانهم، فالترتيب المحفوظ مايتلخبطش لما
 * الأدمن يخفي الموقوف ويسحب.
 */
export function moveTo(ids: readonly string[], dragId: string, targetId: string): string[] {
  const from = ids.indexOf(dragId);
  const to = ids.indexOf(targetId);
  if (from < 0 || to < 0 || from === to) return [...ids];
  const next = [...ids];
  next.splice(from, 1);
  // بعد الشيل الفهارس اللي بعده بتزحزح — فالسحب لتحت بيحطّه بعد الهدف
  // والسحب لفوق بيحطّه قبله، وده اللي العين متوقعاه.
  next.splice(to, 0, dragId);
  return next;
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

export type ArrangeBy = 'name' | 'origin';

export type ArrangeRow = { id: string; name_ar: string; origin_country: string | null };

/**
 * ترتيب المستوى أوتوماتيك بالاسم أو بالمنشأ — بدل ما الأدمن يسحب مادة مادة.
 *
 * بالمنشأ: كل منشأ مع بعض (أبجدي) والمواد جوّاه بالاسم، واللي مالهاش منشأ
 * آخر المستوى. وبيرجّع كمان أول مادة في كل مجموعة غير الأولى — دي اللي بيتحط
 * فوقها خط فاصل في التطبيق. بالاسم مفيش مجموعات فمفيش فواصل.
 */
export function arrangeLevel(
  rows: readonly ArrangeRow[],
  by: ArrangeBy,
): { ids: string[]; dividerIds: string[] } {
  const origin = (r: ArrangeRow) => r.origin_country?.trim() ?? '';
  const byName = (a: ArrangeRow, b: ArrangeRow) => a.name_ar.localeCompare(b.name_ar, 'ar');
  const sorted = [...rows].sort(
    by === 'name'
      ? byName
      : (a, b) => {
          const oa = origin(a);
          const ob = origin(b);
          if (!oa !== !ob) return oa ? -1 : 1;
          return oa.localeCompare(ob, 'ar', { sensitivity: 'base' }) || byName(a, b);
        },
  );
  const dividerIds: string[] = [];
  if (by === 'origin') {
    sorted.forEach((r, i) => {
      if (i > 0 && origin(r).toLowerCase() !== origin(sorted[i - 1]!).toLowerCase()) dividerIds.push(r.id);
    });
  }
  return { ids: sorted.map((r) => r.id), dividerIds };
}

/**
 * الفواصل اللي تترسم فعلًا بين المواد الظاهرة.
 *
 * الفاصل متخزّن على مادة، والمادة دي ممكن تبقى مستخبية (موقوفة، أو في
 * التطبيق مالهاش عرض) — ساعتها الخط مايضيعش: بيتنقل لأول مادة ظاهرة بعدها.
 * وماينرسمش فوق أول مادة ظاهرة (مفيش حاجة فوقه يفصلها عنها).
 */
export function shownDividers(
  orderedIds: readonly string[],
  dividerIds: ReadonlySet<string>,
  shownIds: ReadonlySet<string>,
): Set<string> {
  const out = new Set<string>();
  let pending = false;
  let seenShown = false;
  for (const id of orderedIds) {
    if (dividerIds.has(id)) pending = true;
    if (!shownIds.has(id)) continue;
    if (pending && seenShown) out.add(id);
    pending = false;
    seenShown = true;
  }
  return out;
}
