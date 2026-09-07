import { describe, expect, it } from 'vitest';
import { inputWidthCls } from './ui';

describe('inputWidthCls', () => {
  it('العرض الكامل هو الافتراضي', () => {
    expect(inputWidthCls(undefined)).toBe('w-full');
    expect(inputWidthCls('')).toBe('w-full');
    expect(inputWidthCls('text-xs bg-surface')).toBe('w-full');
  });

  it('المُنادي اللي حدّد عرض بياخده هو', () => {
    expect(inputWidthCls('w-72')).toBe('');
    expect(inputWidthCls('text-xs w-20 px-2')).toBe('');
    expect(inputWidthCls('min-w-40')).toBe('');
    expect(inputWidthCls('max-w-sm')).toBe('');
    expect(inputWidthCls('flex-1')).toBe('');
  });

  it('كلاس بيبدأ بحروف زي w- من غير ما يكون عرض مايخدعش الفحص', () => {
    // `wrap-anywhere` و`whitespace-nowrap` مش أدوات عرض
    expect(inputWidthCls('wrap-anywhere')).toBe('w-full');
    expect(inputWidthCls('whitespace-nowrap')).toBe('w-full');
  });
});
