// أرقام التشابه على المادة — نفس قواعد `products_similar_codes_check`.
//
// المالك بيكتبها في خانة Description في الإكسل أو بيضيفها من فورم المنتج
// («ممكن أضيف كذا رقم»)، وأي مادتين بينهم رقم مشترك بيظهروا لبعض في
// «منتجات مشابهة» في التطبيق.

/** نفس حد الداتابيز — لو اتغيّر هناك يتغيّر هنا. */
export const MAX_SIMILAR_CODES = 20;

/** أرقام بس، لحد ١٠ خانات — الداتابيز بترفض أي حاجة تانية. */
export function isSimilarCode(raw: string): boolean {
  return /^[0-9]{1,10}$/.test(raw.trim());
}

/**
 * بتضم رقم (أو كذا رقم مكتوبين ورا بعض بفاصلة/مسافة) للقايمة.
 *
 * بتتجاهل المكرر واللي مش رقم بدل ما ترمي خطأ: ده حقل بيتكتب فيه بالإيد
 * والمستخدم بيشوف النتيجة في الشرايح قدامه على طول.
 */
export function addSimilarCodes(current: string[], raw: string): string[] {
  const out = [...current];
  for (const part of raw.split(/[\s,،;/|-]+/)) {
    const code = part.trim();
    if (!isSimilarCode(code) || out.includes(code)) continue;
    if (out.length >= MAX_SIMILAR_CODES) break;
    out.push(code);
  }
  return out;
}
