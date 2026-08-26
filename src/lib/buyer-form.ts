// قواعد فورم إضافة مشتري من الداشبورد — مطابقة لتسجيل التطبيق.
export const CIVIL_ID_RE = /^\d{12}$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_PASSWORD_LENGTH = 8;

export const NATIONALITIES = [
  { code: 'kw', label: 'كويتي' },
  { code: 'sa', label: 'سعودي' },
  { code: 'ae', label: 'إماراتي' },
  { code: 'qa', label: 'قطري' },
  { code: 'bh', label: 'بحريني' },
  { code: 'om', label: 'عُماني' },
  { code: 'eg', label: 'مصري' },
  { code: 'sy', label: 'سوري' },
  { code: 'jo', label: 'أردني' },
  { code: 'lb', label: 'لبناني' },
  { code: 'in', label: 'هندي' },
  { code: 'pk', label: 'باكستاني' },
  { code: 'other', label: 'أخرى' },
] as const;

export type IndividualBuyerForm = {
  fullName: string;
  civilId: string;
  phone: string;
  email: string;
  nationality: string;
  password: string;
};

export type CompanyBuyerForm = {
  companyName: string;
  commercialRegister: string;
  address: string;
  civilId: string;
  phone: string;
  email: string;
  companyCode: string;
  password: string;
};

function required(value: string, message: string): string | null {
  return value.trim() === '' ? message : null;
}

function sharedAccountError(form: { civilId: string; phone: string; email: string; password: string }): string | null {
  if (!CIVIL_ID_RE.test(form.civilId.trim())) return 'الرقم المدني يجب أن يكون 12 رقمًا';
  const missingPhone = required(form.phone, 'الجوال مطلوب');
  if (missingPhone) return missingPhone;
  if (!EMAIL_RE.test(form.email.trim())) return 'البريد غير صالح';
  if (form.password.length < MIN_PASSWORD_LENGTH) {
    return `كلمة المرور يجب أن تكون ${MIN_PASSWORD_LENGTH} أحرف على الأقل`;
  }
  return null;
}

export function individualBuyerError(form: IndividualBuyerForm): string | null {
  return (
    required(form.fullName, 'الاسم مطلوب')
    ?? required(form.nationality, 'الجنسية مطلوبة')
    ?? sharedAccountError(form)
  );
}

export function companyBuyerError(form: CompanyBuyerForm): string | null {
  return (
    required(form.companyName, 'اسم الشركة مطلوب')
    ?? required(form.commercialRegister, 'السجل التجاري مطلوب')
    ?? required(form.address, 'العنوان مطلوب')
    ?? sharedAccountError(form)
  );
}
