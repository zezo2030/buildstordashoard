import { describe, expect, it } from 'vitest';
import { sellerSubmissionSections } from './materials-requests';

describe('sellerSubmissionSections', () => {
  it('يرجّع كل أقسام فورم البائع بالترتيب وبالقيم اللي اتبعتت', () => {
    const sections = sellerSubmissionSections({
      name_ar: 'أسمنت',
      name_en: 'Cement',
      description_ar: 'وصف المادة',
      brand: 'Holcim',
      origin_country: 'مصر',
      specialty: { name_ar: 'مواد بناء' },
      unit: { name_ar: 'شيكارة' },
      seller: { full_name: 'أحمد' },
      company: { name_ar: 'شركة النور' },
    });

    expect(sections).toEqual([
      { label: 'الاسم بالعربي', value: 'أسمنت' },
      { label: 'الاسم بالإنجليزي', value: 'Cement' },
      { label: 'التخصص', value: 'مواد بناء' },
      { label: 'الوحدة', value: 'شيكارة' },
      { label: 'الماركة', value: 'Holcim' },
      { label: 'بلد المنشأ', value: 'مصر' },
      { label: 'الوصف', value: 'وصف المادة' },
      { label: 'البائع', value: 'أحمد' },
      { label: 'الشركة', value: 'شركة النور' },
    ]);
  });

  it('يعرض شرطة للحقل الفاضي بدل ما يخفيه', () => {
    const sections = sellerSubmissionSections({
      name_ar: 'رمل',
      name_en: null,
      description_ar: '  ',
      brand: null,
      origin_country: null,
      specialty: null,
      unit: { name_ar: 'طن' },
      seller: null,
      company: null,
    });

    expect(sections.find((s) => s.label === 'الاسم بالإنجليزي')?.value).toBe('—');
    expect(sections.find((s) => s.label === 'الوصف')?.value).toBe('—');
    expect(sections.find((s) => s.label === 'الماركة')?.value).toBe('—');
    expect(sections.find((s) => s.label === 'البائع')?.value).toBe('—');
    expect(sections).toHaveLength(9);
  });
});
