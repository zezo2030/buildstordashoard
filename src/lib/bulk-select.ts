// تحديد متعدد في قايمة — منطق خالص عشان يتختبر لوحده بعيد عن الشاشة.

export function toggleId(selected: readonly string[], id: string): string[] {
  return selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
}

/** كل العناصر متحددة؟ (قايمة فاضية = لأ، عشان زرار «الكل» مايبانش متفعّل) */
export function allSelected(selected: readonly string[], ids: readonly string[]): boolean {
  return ids.length > 0 && ids.every((id) => selected.includes(id));
}

/** زرار «تحديد الكل»: يحدد الكل، أو يفضّي لو الكل متحدد. */
export function toggleAll(selected: readonly string[], ids: readonly string[]): string[] {
  return allSelected(selected, ids) ? [] : [...ids];
}

/** يشيل أي اختيار لعنصر مابقاش ظاهر (تغيّر المستوى أو الفلتر). */
export function pruneSelection(selected: readonly string[], ids: readonly string[]): string[] {
  const present = new Set(ids);
  return selected.filter((id) => present.has(id));
}
