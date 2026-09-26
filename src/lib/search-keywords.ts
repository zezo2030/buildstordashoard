// كلمات البحث المخفية على المادة — `products.search_keywords`.
//
// الأدمن بيكتب الكلمات اللي المشتري ممكن يدوّر بيها بالبلدي («لحام»، «لحامة»)
// والبحث في التطبيق بيلاقي المادة بيها، من غير ما تظهر في أي شاشة.
// الداتابيز بتخزّنها نص واحد مفصول بـ` | ` (البحث بـ`ilike` مش بيشتغل على
// مصفوفة) — الملف ده هو اللي بيحوّل بين النص والشرايح في الفورم.

export const KEYWORD_SEPARATOR = ' | ';
/** نفس حد `products_search_keywords_check`. */
export const MAX_KEYWORDS_LENGTH = 1000;

/** النص المخزّن ← كلمات. */
export function parseKeywords(stored: string | null | undefined): string[] {
  return (stored ?? '').split('|').map((k) => k.trim()).filter(Boolean);
}

/** كلمات ← النص المخزّن. */
export function serializeKeywords(list: string[]): string {
  return list.join(KEYWORD_SEPARATOR);
}

/**
 * بتضيف اللي اتكتب للقايمة. الفاصلة (عربي أو إنجليزي) أو `|` بتفصل كذا كلمة،
 * لكن المسافة لأ — «ماكينة لحام» كلمة بحث واحدة. المكرر (بعد توحيد الحالة)
 * بيتجاهل، واللي يعدّي حد الطول بيقف.
 */
export function addKeywords(current: string[], raw: string): string[] {
  const out = [...current];
  for (const part of raw.split(/[,،|؛;\n]+/)) {
    const word = part.trim().replace(/\s+/g, ' ');
    if (!word) continue;
    if (out.some((k) => k.toLocaleLowerCase() === word.toLocaleLowerCase())) continue;
    if (serializeKeywords([...out, word]).length > MAX_KEYWORDS_LENGTH) break;
    out.push(word);
  }
  return out;
}
