import { describe, expect, it } from 'vitest';
import { linkedSpecialtyIds, productInSpecialty, specialtyLinkIds } from './product-specialties';

describe('linkedSpecialtyIds', () => {
  it('يستخرج ids من صفوف الجدول أو الـembed', () => {
    expect(linkedSpecialtyIds([{ specialty_id: 's1' }, { specialty_id: 's2' }])).toEqual(['s1', 's2']);
  });

  it('يرجع فاضي للقيم الفاضية', () => {
    expect(linkedSpecialtyIds(undefined)).toEqual([]);
    expect(linkedSpecialtyIds(null)).toEqual([]);
  });
});

describe('specialtyLinkIds', () => {
  it('يحط التخصص الأساسي أول ويشيل التكرار والفاضي', () => {
    expect(specialtyLinkIds('s1', ['s2', 's1', '', 's2'])).toEqual(['s1', 's2']);
  });

  it('يرجع الأساسي لو مفيش إضافي', () => {
    expect(specialtyLinkIds('s1', [])).toEqual(['s1']);
  });
});

describe('productInSpecialty', () => {
  it('يطابق الأساسي حتى من غير قائمة ربط', () => {
    expect(productInSpecialty('s1', undefined, 's1')).toBe(true);
    expect(productInSpecialty('s1', undefined, 's2')).toBe(false);
  });

  it('يطابق أي تخصص مربوط', () => {
    expect(productInSpecialty('s1', ['s1', 's2'], 's2')).toBe(true);
    expect(productInSpecialty('s1', ['s1', 's2'], 's3')).toBe(false);
  });
});
