import { describe, expect, it } from 'vitest';
import { addKeywords, parseKeywords, serializeKeywords, MAX_KEYWORDS_LENGTH } from './search-keywords';

describe('search keywords', () => {
  it('round-trips through the stored text', () => {
    const list = ['لحام', 'لحامة', 'ماكينة لحام'];
    expect(serializeKeywords(list)).toBe('لحام | لحامة | ماكينة لحام');
    expect(parseKeywords(serializeKeywords(list))).toEqual(list);
  });

  it('treats empty storage as no keywords', () => {
    expect(parseKeywords('')).toEqual([]);
    expect(parseKeywords(null)).toEqual([]);
  });

  it('splits on commas but keeps multi-word keywords together', () => {
    expect(addKeywords([], 'لحام، لحامة , ماكينة   لحام')).toEqual(['لحام', 'لحامة', 'ماكينة لحام']);
  });

  it('skips duplicates regardless of case', () => {
    expect(addKeywords(['Welder'], 'welder, لحام')).toEqual(['Welder', 'لحام']);
  });

  it('stops before exceeding the database length limit', () => {
    const long = 'x'.repeat(MAX_KEYWORDS_LENGTH - 2);
    expect(addKeywords([long], 'extra')).toEqual([long]);
  });
});
