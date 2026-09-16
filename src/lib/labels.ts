// تسميات عربية موحّدة للحالات + لون الشارة لكل حالة.
// اللون tone وليس كلاس مباشر — StatusChip يحوّله لكلاسات.

export type Tone = 'gray' | 'green' | 'orange' | 'red' | 'blue' | 'navy';

type LabelMap = Record<string, { label: string; tone: Tone }>;

export const roleLabels: LabelMap = {
  individual_buyer: { label: 'مشتري فرد', tone: 'blue' },
  company_buyer: { label: 'مشتري شركة', tone: 'navy' },
  seller: { label: 'بائع', tone: 'orange' },
  admin: { label: 'أدمن', tone: 'red' },
};

export const accountStatusLabels: LabelMap = {
  pending: { label: 'في الانتظار', tone: 'orange' },
  active: { label: 'نشط', tone: 'green' },
  suspended: { label: 'موقوف', tone: 'red' },
  rejected: { label: 'مرفوض', tone: 'gray' },
};

export const orderStatusLabels: LabelMap = {
  // الحالتان الأوليان من دورة الطلب (المرحلة 2) — الترتيب هنا هو ترتيب الدورة
  awaiting_seller_review: { label: 'بانتظار مراجعة البائع', tone: 'orange' },
  quoted: { label: 'عرض سعر للمشتري', tone: 'blue' },
  awaiting_payment: { label: 'بانتظار الدفع', tone: 'orange' },
  confirmed: { label: 'مؤكد', tone: 'blue' },
  preparing: { label: 'قيد التجهيز', tone: 'navy' },
  out_for_delivery: { label: 'خرج للتوصيل', tone: 'blue' },
  delivered: { label: 'تم التوصيل', tone: 'green' },
  cancelled: { label: 'ملغي', tone: 'gray' },
  refunded: { label: 'مسترجع', tone: 'red' },
};

export const paymentStatusLabels: LabelMap = {
  pending: { label: 'معلق', tone: 'orange' },
  authorized: { label: 'مفوَّض', tone: 'blue' },
  paid: { label: 'مدفوع', tone: 'green' },
  failed: { label: 'فشل', tone: 'red' },
  refunded: { label: 'مسترد', tone: 'gray' },
  partially_refunded: { label: 'مسترد جزئيًا', tone: 'orange' },
};

export const paymentMethodLabels: LabelMap = {
  knet: { label: 'كي نت', tone: 'blue' },
  apple_pay: { label: 'Apple Pay', tone: 'gray' },
  credit_card: { label: 'بطاقة ائتمان', tone: 'navy' },
  wallet: { label: 'المحفظة', tone: 'green' },
  credit_terms: { label: 'آجل (كريديت)', tone: 'orange' },
  cash_on_delivery: { label: 'كاش عند التوصيل', tone: 'gray' },
};

// أربع حالات في اللوحة بدل عشرة.
//
// العشرة اللي في الإينَم بيوصفوا عملية بين البائع والمشتري (مراجعة بائع،
// استلام من العميل، وصول للبائع…) والأدمن مش طرف فيها — اللي يهمّه النتيجة:
// اتقدّم · مقبول · رفض مين. التطبيق نفسه (شاشة المشتري وشاشة البائع) لسه
// بيعرض التفصيل كامل لأن الطرفين دول محتاجينه فعلاً.
//
// التسمية بتقول مين اللي عمل الحاجة: «مرفوض» لوحدها كانت بتلخبط رفض البائع
// مع إلغاء المشتري لطلب الإرجاع.
//
// نظير الفلترة في الداتابيز: `app.return_status_group` — أي حالة جديدة في
// الإينَم لازم تتحط في الاتنين.
export const returnStatusLabels: LabelMap = {
  draft: { label: 'تم تقديمه', tone: 'orange' },
  submitted: { label: 'تم تقديمه', tone: 'orange' },
  seller_review: { label: 'تم تقديمه', tone: 'orange' },
  approved: { label: 'مقبول', tone: 'green' },
  partially_approved: { label: 'مقبول', tone: 'green' },
  picked_up: { label: 'مقبول', tone: 'green' },
  received: { label: 'مقبول', tone: 'green' },
  refunded: { label: 'مقبول', tone: 'green' },
  rejected: { label: 'رفض من البائع', tone: 'red' },
  cancelled: { label: 'رفض من المشتري', tone: 'gray' },
};

/** مفاتيح المجموعات اللي `admin_returns_list` بيقبلها في `p_status`. */
export const RETURN_STATUS_FILTERS: [string, string][] = [
  ['submitted', 'تم تقديمه'],
  ['accepted', 'مقبول'],
  ['rejected', 'رفض من البائع'],
  ['cancelled', 'رفض من المشتري'],
];

const ACCEPTED_RETURN_STATUSES = new Set(
  ['approved', 'partially_approved', 'picked_up', 'received', 'refunded'],
);

/**
 * السند اتقبل والفلوس لسه ما رجعتش للعميل.
 *
 * دي التفرقة الوحيدة اللي التجميع مايقدرش يستغنى عنها: «مقبول» بتضم `approved`
 * (لسه البضاعة عند العميل) لحد `refunded` (خلصت)، ومن غير العلامة دي مبلغ
 * مستحق للعملاء بيختفي جوّه كلمة «مقبول».
 */
export function isRefundPending(status: string, refundedAt: string | null): boolean {
  return !refundedAt && ACCEPTED_RETURN_STATUSES.has(status);
}

export const refundMethodLabels: LabelMap = {
  wallet: { label: 'رصيد المحفظة', tone: 'green' },
  original_payment: { label: 'نفس وسيلة الدفع', tone: 'blue' },
  bank_transfer: { label: 'تحويل بنكي', tone: 'navy' },
};

/** مستندات المرتجع في bucket return-docs — مسارها <return_id>/<file> */
export const returnDocLabels: LabelMap = {
  return_note: { label: 'سند إرجاع', tone: 'navy' },
  rejection_note: { label: 'إشعار رفض', tone: 'red' },
  credit_note: { label: 'إشعار دائن', tone: 'orange' },
};

export const ticketStatusLabels: LabelMap = {
  open: { label: 'مفتوحة', tone: 'orange' },
  in_progress: { label: 'قيد المعالجة', tone: 'blue' },
  resolved: { label: 'تم الحل', tone: 'green' },
  closed: { label: 'مغلقة', tone: 'gray' },
};

export const walletTxnLabels: LabelMap = {
  topup: { label: 'تعبئة رصيد', tone: 'green' },
  withdrawal: { label: 'سحب', tone: 'red' },
  order_payment: { label: 'دفع طلب', tone: 'navy' },
  order_refund: { label: 'استرداد طلب', tone: 'blue' },
  return_credit: { label: 'رصيد مرتجع', tone: 'blue' },
  commission: { label: 'عمولة', tone: 'orange' },
  subscription: { label: 'اشتراك المنصة', tone: 'orange' },
  adjustment: { label: 'تسوية إدارية', tone: 'gray' },
};

// القيم دي هي بالظبط قيد `product_requests.status` في القاعدة — كان فيها
// `approved`/`closed` مش موجودين في القيد، وناقصها `in_review`/`fulfilled`.
export const productRequestStatusLabels: LabelMap = {
  open: { label: 'مفتوح', tone: 'orange' },
  in_review: { label: 'قيد المراجعة', tone: 'blue' },
  fulfilled: { label: 'تمت الإضافة', tone: 'green' },
  rejected: { label: 'مرفوض', tone: 'red' },
};

// اقتراح المنتج من البائع مفرداته غير مفردات طلب المشتري — خريطة مستقلة عن قصد:
// `approved` هنا وعد بالإضافة، و`added` هي التنفيذ.
export const productSubmissionStatusLabels: LabelMap = {
  open: { label: 'جديد', tone: 'orange' },
  approved: { label: 'موافَق — بانتظار الإضافة', tone: 'blue' },
  added: { label: 'تمت الإضافة', tone: 'green' },
  rejected: { label: 'مرفوض', tone: 'red' },
};

export const discountScopeLabels: Record<string, string> = {
  all: 'كل المنتجات',
  specialty: 'تخصص',
  category: 'فئة',
  product: 'منتج',
};

export function labelOf(map: LabelMap, key: string | null | undefined) {
  if (!key) return { label: '—', tone: 'gray' as Tone };
  return map[key] ?? { label: key, tone: 'gray' as Tone };
}

/** إعدادات المنصة المعروفة — الاسم والشرح يظهران في صفحة الإعدادات بدل المفتاح الإنجليزي. */
export const appSettingMeta: Record<string, { label: string; hint: string; kind: 'number' | 'text' | 'phone' | 'boolean' }> = {
  return_window_days: { label: 'مدة الإرجاع (أيام)', hint: 'كم يوم يقدر المشتري يطلب إرجاع بعد التوصيل', kind: 'number' },
  default_commission_rate: { label: 'نسبة العمولة الافتراضية %', hint: 'عمولة المنصة على البائع الجديد إذا ما تحددت نسبة خاصة', kind: 'number' },
  quotation_validity_days: { label: 'صلاحية عرض السعر (أيام)', hint: 'كم يوم يفضل عرض السعر ساري قبل ما ينتهي', kind: 'number' },
  delivery_due_days: {
    label: 'مهلة التسليم (أيام)',
    hint: 'بعد تأكيد الطلب بكام يوم من غير تسليم يتبعت تنبيه للبائع والمشتري ويتعلّم «متأخر التسليم» في قايمة الطلبات. التنبيه مرة واحدة والطلب ما بيتلغيش تلقائيًا',
    kind: 'number',
  },
  wallet_topup_min: { label: 'أقل شحن محفظة (د.ك)', hint: 'أقل مبلغ يقدر المستخدم يشحن به محفظته', kind: 'number' },
  wallet_topup_max: { label: 'أعلى شحن محفظة (د.ك)', hint: 'أعلى مبلغ شحن في العملية الواحدة', kind: 'number' },
  whatsapp_support: { label: 'رقم واتساب الدعم', hint: 'الرقم اللي بيتفتح لما المستخدم يضغط تواصل عبر واتساب', kind: 'phone' },
  // اشتراك المشتري: القيمة والمدة **للمنصة كلها**، مش لكل عميل. تغيّر الرقم
  // هنا فيسري على كل التجديدات الجاية من غير ما تلمس حساب واحد. الفرق الوحيد
  // المسموح بيه بين العملاء هو فرد ↔ شركة.
  subscription_fee_individual: {
    label: 'اشتراك المشتري الفرد (د.ك)',
    hint: 'قيمة الدورة الواحدة لكل مشتري فرد. صفر = مجاني للكل',
    kind: 'number',
  },
  subscription_fee_company: {
    label: 'اشتراك المشتري الشركة (د.ك)',
    hint: 'قيمة الدورة الواحدة لكل مشتري شركة. صفر = مجاني للكل',
    kind: 'number',
  },
  subscription_period_days: {
    label: 'مدة الاشتراك (أيام)',
    hint: 'طول الدورة اللي بيتمدّها كل دفعة. بيسري على التجديدات الجاية، والمدد الحالية ما بتتغيّرش',
    kind: 'number',
  },
  subscription_trial_days: {
    label: 'التجربة المجانية (أيام)',
    hint: 'الحساب الجديد بياخد المدة دي من غير دفع. صفر = يدفع من أول يوم',
    kind: 'number',
  },
  subscription_reminder_days: {
    label: 'التذكير قبل الانتهاء (أيام)',
    hint: 'إشعار للمشتري اللي رصيده مش هيغطي التجديد التلقائي. اللي رصيده يغطي بيتجدد لوحده من غير إزعاج',
    kind: 'number',
  },
  platform_seller_enabled: {
    label: 'بائع Build Store',
    hint: 'عند الفتح تظهر مواد الكتالوج غير المربوطة بأي شركة للعرض فقط — من غير سعر ولا شراء. الربط بشركة يخفيها من بائع Build Store فورًا',
    kind: 'boolean',
  },
};

export const legalSlugLabels: Record<string, string> = {
  terms: 'شروط وأحكام التطبيق',
  privacy: 'سياسة الخصوصية',
  return_policy: 'سياسة الإرجاع',
};

export const auditActionLabels: LabelMap = {
  INSERT: { label: 'إضافة', tone: 'green' },
  UPDATE: { label: 'تعديل', tone: 'blue' },
  DELETE: { label: 'حذف', tone: 'red' },
};

export const auditEntityLabels: Record<string, string> = {
  profiles: 'حساب مستخدم',
  companies: 'شركة',
  orders: 'طلب',
  products: 'منتج',
  wallets: 'محفظة',
  withdrawal_requests: 'طلب سحب',
  support_tickets: 'تذكرة دعم',
  legal_documents: 'مستند قانوني',
  app_settings: 'إعداد المنصة',
  discounts: 'خصم',
};
