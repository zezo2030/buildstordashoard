// انتقالات حالة اقتراح المنتج — مرآة للحارس جوه
// `admin_decide_product_submission`. الغرض إن الواجهة ما تعرضش زرارًا القاعدة
// هترفضه: من غير كده الأدمن بيضغط ويستنى عشان ياخد رسالة خطأ.
//
// أي تغيير هنا لازم يتغيّر في الميجريشن كمان — الاتنين بيوصفوا نفس القاعدة.
export type SubmissionStatus = 'open' | 'approved' | 'added' | 'rejected';

const TRANSITIONS: Record<SubmissionStatus, SubmissionStatus[]> = {
  open: ['approved', 'rejected'],
  approved: ['added', 'rejected'],
  added: [],
  rejected: [],
};

/** الحالات اللي ينفع ننتقل ليها من `current`. حالة مش معروفة = مفيش قرار. */
export function nextStatuses(current: string): SubmissionStatus[] {
  return TRANSITIONS[current as SubmissionStatus] ?? [];
}

export function canDecide(current: string): boolean {
  return nextStatuses(current).length > 0;
}
