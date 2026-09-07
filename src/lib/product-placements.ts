// أماكن المنتج في شجرة الكتالوج — المنتج الواحد يظهر في أكتر من تخصص أو أكتر
// من فرع في نفس التخصص. أول مكان في القايمة هو المكان الأساسي: هو اللي
// بيتكتب في `products.specialty_id/category_id` وبتمشي عليه التقارير والخصومات.

export type Placement = { specialtyId: string; categoryId: string | null };

export function placementKey(p: Placement): string {
  return `${p.specialtyId}::${p.categoryId ?? ''}`;
}

/** يشيل التكرار ويحافظ على الترتيب — أول ظهور هو اللي يفضل. */
export function normalizePlacements(list: readonly Placement[]): Placement[] {
  const seen = new Set<string>();
  const out: Placement[] = [];
  for (const p of list) {
    if (!p.specialtyId) continue;
    const key = placementKey(p);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ specialtyId: p.specialtyId, categoryId: p.categoryId || null });
  }
  return out;
}

export function addPlacement(list: readonly Placement[], next: Placement): Placement[] {
  return normalizePlacements([...list, next]);
}

export function removePlacement(list: readonly Placement[], key: string): Placement[] {
  return list.filter((p) => placementKey(p) !== key);
}

/** المكان الأساسي — أول واحد، وهو المطلوب في الحفظ. */
export function primaryPlacement(list: readonly Placement[]): Placement | null {
  return list[0] ?? null;
}

/** ينقل مكان لأول القايمة عشان يبقى هو الأساسي. */
export function makePrimary(list: readonly Placement[], key: string): Placement[] {
  const hit = list.find((p) => placementKey(p) === key);
  if (!hit) return [...list];
  return [hit, ...list.filter((p) => placementKey(p) !== key)];
}
