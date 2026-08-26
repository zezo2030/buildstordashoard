import { describe, expect, it } from 'vitest';
import { canDecide, nextStatuses } from './submission-status';

describe('nextStatuses', () => {
  it('يسمح بالموافقة أو الرفض على الاقتراح الجديد', () => {
    expect(nextStatuses('open')).toEqual(['approved', 'rejected']);
  });

  it('يسمح بالإضافة أو الرفض بعد الموافقة', () => {
    expect(nextStatuses('approved')).toEqual(['added', 'rejected']);
  });

  it('يقفل الحالات النهائية', () => {
    expect(nextStatuses('added')).toEqual([]);
    expect(nextStatuses('rejected')).toEqual([]);
  });

  it('يرجّع قائمة فاضية لحالة مش معروفة بدل ما يرمي', () => {
    expect(nextStatuses('fulfilled')).toEqual([]);
  });
});

describe('canDecide', () => {
  it('يفتح القرار على المفتوح والموافَق عليه فقط', () => {
    expect(canDecide('open')).toBe(true);
    expect(canDecide('approved')).toBe(true);
    expect(canDecide('added')).toBe(false);
    expect(canDecide('rejected')).toBe(false);
  });
});
