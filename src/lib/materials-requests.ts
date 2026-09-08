// منطق صفحة «طلبات المواد»: أقسام فورم اقتراح البائع اللي الأدمن لازم يشوفها
// كاملة مش كمختصر جدول.
//
// تاب المشترين اتشال من الصفحة، فمابقاش فيه اختيار تاب ولا عدّاد مجمّع —
// الشارة في القايمة الجانبية بقت اقتراحات البائعين المفتوحة بس.

export type SellerSubmissionFields = {
  name_ar: string;
  name_en: string | null;
  description_ar: string | null;
  brand: string | null;
  origin_country: string | null;
  specialty: { name_ar: string } | null;
  unit: { name_ar: string } | null;
  seller: { full_name: string } | null;
  company: { name_ar: string } | null;
};

function shown(value: string | null | undefined): string {
  const t = value?.trim();
  return t ? t : '—';
}

/** نفس ترتيب حقول فورم «اضافة منتج جديد» عند البائع، للقراءة في الداشبورد. */
export function sellerSubmissionSections(row: SellerSubmissionFields): { label: string; value: string }[] {
  return [
    { label: 'الاسم بالعربي', value: shown(row.name_ar) },
    { label: 'الاسم بالإنجليزي', value: shown(row.name_en) },
    { label: 'التخصص', value: shown(row.specialty?.name_ar) },
    { label: 'الوحدة', value: shown(row.unit?.name_ar) },
    { label: 'الماركة', value: shown(row.brand) },
    { label: 'بلد المنشأ', value: shown(row.origin_country) },
    { label: 'الوصف', value: shown(row.description_ar) },
    { label: 'البائع', value: shown(row.seller?.full_name) },
    { label: 'الشركة', value: shown(row.company?.name_ar) },
  ];
}
