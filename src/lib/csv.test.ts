import { describe, expect, it } from 'vitest';
import { csvCell, toCsv } from './csv';

describe('csvCell', () => {
  it('النص العادي زي ما هو', () => expect(csvCell('أحمد')).toBe('أحمد'));
  it('الفاضي بيبقى فاضي', () => {
    expect(csvCell(null)).toBe('');
    expect(csvCell(undefined)).toBe('');
  });
  it('الفاصل المنقوط بيتحاط بين أقواس', () => {
    expect(csvCell('a;b')).toBe('"a;b"');
  });
  it('علامة التنصيص بتتضاعف', () => {
    expect(csvCell('قال "أهلا"')).toBe('"قال ""أهلا"""');
  });
  it('السطر الجديد بيتحاط بين أقواس', () => {
    expect(csvCell('سطر\nتاني')).toBe('"سطر\nتاني"');
  });
});

describe('toCsv', () => {
  it('العناوين أول سطر والصفوف بعدها', () => {
    expect(toCsv(['الاسم', 'المبلغ'], [['أحمد', 5], ['سارة', 7]]))
      .toBe('الاسم;المبلغ\r\nأحمد;5\r\nسارة;7');
  });
});
