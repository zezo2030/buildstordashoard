// مسار المنتج في الكتالوج: من التخصص الرئيسي لغاية آخر فئة.
// الشجرة كلها في الذاكرة (التخصصات والفئات قوايم صغيرة)، فالمسار بيتبني
// بالمشي لفوق على parent_id من الفئة لحد الجذر ثم عكس الترتيب.

export type PathCategory = {
  id: string;
  name_ar: string;
  parent_id: string | null;
  specialty_id: string;
};

export type PathSpecialty = { id: string; name_ar: string };

/** أسماء المسار مرتّبة: [التخصص, فرع, فرع فرعي, …]. */
export function productPath(
  specialties: readonly PathSpecialty[],
  categories: readonly PathCategory[],
  specialtyId: string | null | undefined,
  categoryId: string | null | undefined,
): string[] {
  const out: string[] = [];
  const byId = new Map(categories.map((c) => [c.id, c]));

  const chain: string[] = [];
  let cur = categoryId ? byId.get(categoryId) : undefined;
  // حارس ضد حلقة في البيانات (parent يشاور على ابنه) — الشجرة عمرها ما بتعدي
  // عمق معقول، فالسقف هنا بيمنع لوب لا نهائي بدل ما يعلّق الصفحة.
  const seen = new Set<string>();
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id);
    chain.push(cur.name_ar);
    cur = cur.parent_id ? byId.get(cur.parent_id) : undefined;
  }

  const sp = specialtyId ? specialties.find((s) => s.id === specialtyId) : undefined;
  if (sp) out.push(sp.name_ar);
  out.push(...chain.reverse());
  return out;
}

/** نفس المسار كنص واحد للعرض في سطر — «كهرباء ← بوكسات ← بوكس كهرباء». */
export function productPathText(
  specialties: readonly PathSpecialty[],
  categories: readonly PathCategory[],
  specialtyId: string | null | undefined,
  categoryId: string | null | undefined,
): string {
  const parts = productPath(specialties, categories, specialtyId, categoryId);
  return parts.length ? parts.join(' ← ') : '—';
}

/** آخر فرع في كل تخصص — الأماكن اللي المنتج ينفع يتحط فيها. */
export function leafCategories(categories: readonly PathCategory[]): PathCategory[] {
  const parents = new Set(
    categories.map((c) => c.parent_id).filter((id): id is string => !!id),
  );
  return categories.filter((c) => !parents.has(c.id));
}

/** التخصصات اللي مفيهاش أي فرع — المنتج فيها بيتربط بالتخصص مباشرة. */
export function specialtiesWithoutBranches(
  specialties: readonly PathSpecialty[],
  categories: readonly PathCategory[],
): Set<string> {
  const withRoots = new Set(
    categories.filter((c) => c.parent_id === null).map((c) => c.specialty_id),
  );
  return new Set(specialties.map((s) => s.id).filter((id) => !withRoots.has(id)));
}
