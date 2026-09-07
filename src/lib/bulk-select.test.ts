import { describe, expect, it } from 'vitest';
import { allSelected, pruneSelection, toggleAll, toggleId } from './bulk-select';

describe('toggleId', () => {
  it('بيضيف الغير متحدد', () => expect(toggleId(['a'], 'b')).toEqual(['a', 'b']));
  it('بيشيل المتحدد', () => expect(toggleId(['a', 'b'], 'a')).toEqual(['b']));
});

describe('allSelected', () => {
  it('قايمة فاضية = لأ', () => expect(allSelected([], [])).toBe(false));
  it('الكل متحدد', () => expect(allSelected(['a', 'b'], ['a', 'b'])).toBe(true));
  it('ناقص واحد', () => expect(allSelected(['a'], ['a', 'b'])).toBe(false));
});

describe('toggleAll', () => {
  it('بيحدد الكل', () => expect(toggleAll(['a'], ['a', 'b'])).toEqual(['a', 'b']));
  it('بيفضّي لو الكل متحدد', () => expect(toggleAll(['a', 'b'], ['a', 'b'])).toEqual([]));
});

describe('pruneSelection', () => {
  it('بيشيل اللي مابقاش ظاهر', () => {
    expect(pruneSelection(['a', 'b'], ['b', 'c'])).toEqual(['b']);
  });
});
