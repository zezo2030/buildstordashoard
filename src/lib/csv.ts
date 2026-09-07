// تصدير جدول لملف CSV — بدون مكتبة. Excel العربي بيقرا UTF-8 صح بس لو الملف
// مبدوء بـ BOM، وبيفصل الأعمدة بفاصلة منقوطة في اللوكيل العربي.

/** يهرب الخلية: علامات التنصيص بتتضاعف، وأي فاصل/سطر بيخلي الخلية بين أقواس. */
export function csvCell(value: unknown): string {
  const s = value == null ? '' : String(value);
  if (!/[";\n\r]/.test(s)) return s;
  return `"${s.replace(/"/g, '""')}"`;
}

export function toCsv(headers: readonly string[], rows: readonly unknown[][]): string {
  return [headers, ...rows].map((r) => r.map(csvCell).join(';')).join('\r\n');
}

export function downloadCsv(fileName: string, headers: readonly string[], rows: readonly unknown[][]) {
  const blob = new Blob(['\uFEFF' + toCsv(headers, rows)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName.endsWith('.csv') ? fileName : `${fileName}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
