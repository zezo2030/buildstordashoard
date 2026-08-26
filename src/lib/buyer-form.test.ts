import { describe, expect, it } from 'vitest';
import {
  companyBuyerError,
  individualBuyerError,
  type CompanyBuyerForm,
  type IndividualBuyerForm,
} from './buyer-form';

const individual: IndividualBuyerForm = {
  fullName: 'أحمد علي',
  civilId: '290010112345',
  phone: '+96551234567',
  email: 'buyer@example.com',
  nationality: 'kw',
  password: 'secret123',
};

const company: CompanyBuyerForm = {
  companyName: 'مؤسسة البناء',
  commercialRegister: '123456',
  address: 'السالمية قطعة 12',
  civilId: '290010112345',
  phone: '+96551234567',
  email: 'company@example.com',
  companyCode: 'BUILD-1',
  password: 'secret123',
};

describe('individualBuyerError', () => {
  it('returns null when every required field is valid', () => {
    expect(individualBuyerError(individual)).toBeNull();
  });

  it('requires a name', () => {
    expect(individualBuyerError({ ...individual, fullName: '  ' })).toBe('الاسم مطلوب');
  });

  it('requires a 12-digit civil id', () => {
    expect(individualBuyerError({ ...individual, civilId: '123' })).toBe('الرقم المدني يجب أن يكون 12 رقمًا');
  });

  it('requires a valid email', () => {
    expect(individualBuyerError({ ...individual, email: 'not-an-email' })).toBe('البريد غير صالح');
  });

  it('requires a password of at least 8 characters', () => {
    expect(individualBuyerError({ ...individual, password: 'short' })).toBe('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
  });

  it('requires nationality', () => {
    expect(individualBuyerError({ ...individual, nationality: '' })).toBe('الجنسية مطلوبة');
  });

  it('requires a phone', () => {
    expect(individualBuyerError({ ...individual, phone: '  ' })).toBe('الجوال مطلوب');
  });
});

describe('companyBuyerError', () => {
  it('returns null when required company fields are valid', () => {
    expect(companyBuyerError(company)).toBeNull();
  });

  it('allows an empty company code', () => {
    expect(companyBuyerError({ ...company, companyCode: '' })).toBeNull();
  });

  it('requires company name, register, and address', () => {
    expect(companyBuyerError({ ...company, companyName: '' })).toBe('اسم الشركة مطلوب');
    expect(companyBuyerError({ ...company, commercialRegister: '' })).toBe('السجل التجاري مطلوب');
    expect(companyBuyerError({ ...company, address: '' })).toBe('العنوان مطلوب');
  });
});
