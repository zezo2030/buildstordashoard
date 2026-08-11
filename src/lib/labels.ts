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

export const returnStatusLabels: LabelMap = {
  draft: { label: 'مسودة', tone: 'gray' },
  submitted: { label: 'مُقدَّم', tone: 'orange' },
  seller_review: { label: 'مراجعة البائع', tone: 'blue' },
  approved: { label: 'مقبول', tone: 'green' },
  partially_approved: { label: 'مقبول جزئيًا', tone: 'blue' },
  rejected: { label: 'مرفوض', tone: 'red' },
  picked_up: { label: 'تم الاستلام من العميل', tone: 'navy' },
  received: { label: 'وصل للبائع', tone: 'navy' },
  refunded: { label: 'تم رد المبلغ', tone: 'green' },
  cancelled: { label: 'ملغي', tone: 'gray' },
};

export const quotationStatusLabels: LabelMap = {
  draft: { label: 'مسودة', tone: 'gray' },
  issued: { label: 'صادرة', tone: 'blue' },
  offers_received: { label: 'وصلت عروض', tone: 'orange' },
  awarded: { label: 'تمت الترسية', tone: 'green' },
  expired: { label: 'منتهية', tone: 'gray' },
  cancelled: { label: 'ملغاة', tone: 'red' },
};

export const withdrawalStatusLabels: LabelMap = {
  pending: { label: 'معلق', tone: 'orange' },
  approved: { label: 'موافق عليه', tone: 'blue' },
  rejected: { label: 'مرفوض', tone: 'red' },
  paid: { label: 'تم التحويل', tone: 'green' },
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
  adjustment: { label: 'تسوية إدارية', tone: 'gray' },
};

export const productRequestStatusLabels: LabelMap = {
  open: { label: 'مفتوح', tone: 'orange' },
  approved: { label: 'تمت الإضافة', tone: 'green' },
  rejected: { label: 'مرفوض', tone: 'red' },
  closed: { label: 'مغلق', tone: 'gray' },
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
