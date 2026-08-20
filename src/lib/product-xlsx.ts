import { unzipSync } from 'fflate';

export type ParsedProductImage = {
  bytes: Uint8Array;
  ext: string;
};

export type ParsedProductRow = {
  rowNumber: number;
  nameAr: string;
  originCountry: string | null;
  sku: string;
  descriptionAr: string | null;
  image: ParsedProductImage | null;
};

export type ImportSkipReason = 'missing_name' | 'missing_sku';

export type ImportPlan = {
  toInsert: ParsedProductRow[];
  skippedDuplicate: ParsedProductRow[];
  skippedInvalid: { rowNumber: number; reason: ImportSkipReason }[];
};

const REQUIRED_HEADERS = {
  'product name': 'nameAr',
  'made in': 'originCountry',
  code: 'sku',
  description: 'descriptionAr',
  image: 'image',
} as const;

type FieldKey = (typeof REQUIRED_HEADERS)[keyof typeof REQUIRED_HEADERS];

const BAD_FILE = 'ملف Excel غير صالح — ارفع ملف xlsx مطابق للنموذج';
const BAD_HEADERS =
  'ملف Excel غير مطابق للنموذج — الأعمدة المطلوبة: Product Name, Made In, Code, Description, Image';

export function planProductImport(rows: ParsedProductRow[], existingSkus: Set<string>): ImportPlan {
  const seen = new Set([...existingSkus].map((s) => s.trim()));
  const toInsert: ParsedProductRow[] = [];
  const skippedDuplicate: ParsedProductRow[] = [];
  const skippedInvalid: ImportPlan['skippedInvalid'] = [];

  for (const r of rows) {
    const nameAr = r.nameAr.trim();
    const sku = r.sku.trim();
    const originCountry = r.originCountry?.trim() || null;
    const descriptionAr = r.descriptionAr?.trim() || null;
    if (!nameAr && !sku && !originCountry && !descriptionAr && !r.image) continue;
    if (!nameAr) {
      skippedInvalid.push({ rowNumber: r.rowNumber, reason: 'missing_name' });
      continue;
    }
    if (!sku) {
      skippedInvalid.push({ rowNumber: r.rowNumber, reason: 'missing_sku' });
      continue;
    }
    const normalized = { ...r, nameAr, sku, originCountry, descriptionAr };
    if (seen.has(sku)) {
      skippedDuplicate.push(normalized);
      continue;
    }
    seen.add(sku);
    toInsert.push(normalized);
  }

  return { toInsert, skippedDuplicate, skippedInvalid };
}

export async function parseProductXlsx(data: Uint8Array | ArrayBuffer): Promise<{ rows: ParsedProductRow[] }> {
  const files = unzipXlsx(asBytes(data));
  const strings = parseSharedStrings(readText(files, 'xl/sharedStrings.xml') ?? '');
  const sheetPath = findWorksheetPath(files);
  const sheetXml = readText(files, sheetPath);
  if (!sheetXml) throw new Error(BAD_FILE);

  const cells = parseCells(sheetXml, strings);
  const headerRow = cells.get(1);
  if (!headerRow) throw new Error(BAD_HEADERS);

  const cols = mapHeaders(headerRow);
  const imagesByRow = parseRowImages(files, sheetPath, cols.imageCol);

  const rowNumbers = new Set<number>([...cells.keys(), ...imagesByRow.keys()]);
  const rows: ParsedProductRow[] = [];
  for (const rowNumber of [...rowNumbers].sort((a, b) => a - b)) {
    if (rowNumber <= 1) continue;
    const row = cells.get(rowNumber) ?? new Map<number, string>();
    const nameAr = row.get(cols.nameAr) ?? '';
    const sku = row.get(cols.sku) ?? '';
    const origin = row.get(cols.originCountry) ?? '';
    const description = row.get(cols.descriptionAr) ?? '';
    const image = imagesByRow.get(rowNumber) ?? null;
    if (!nameAr && !sku && !origin && !description && !image) continue;
    rows.push({
      rowNumber,
      nameAr,
      sku,
      originCountry: origin || null,
      descriptionAr: description || null,
      image,
    });
  }

  return { rows };
}

function asBytes(data: Uint8Array | ArrayBuffer): Uint8Array {
  return data instanceof Uint8Array ? data : new Uint8Array(data);
}

function unzipXlsx(bytes: Uint8Array): Record<string, Uint8Array> {
  try {
    const files = unzipSync(bytes);
    if (!files['xl/workbook.xml'] && !files['xl/worksheets/sheet1.xml']) throw new Error(BAD_FILE);
    return files;
  } catch (e) {
    if (e instanceof Error && e.message === BAD_FILE) throw e;
    throw new Error(BAD_FILE);
  }
}

function readText(files: Record<string, Uint8Array>, path: string): string | null {
  const bytes = files[path] ?? files[path.replace(/^\//, '')];
  if (!bytes) return null;
  return new TextDecoder('utf-8').decode(bytes);
}

function findWorksheetPath(files: Record<string, Uint8Array>): string {
  const rels = readText(files, 'xl/_rels/workbook.xml.rels');
  if (rels) {
    for (const tag of rels.match(/<Relationship\b[^>]*>/g) ?? []) {
      const type = attr(tag, 'Type') ?? '';
      const target = attr(tag, 'Target');
      if (target && type.includes('worksheet')) return joinZip('xl', target);
    }
  }
  if (files['xl/worksheets/sheet1.xml']) return 'xl/worksheets/sheet1.xml';
  throw new Error(BAD_FILE);
}

function mapHeaders(headerRow: Map<number, string>): Record<FieldKey, number> & { imageCol: number } {
  const cols: Partial<Record<FieldKey, number>> = {};
  for (const [col, raw] of headerRow) {
    const key = REQUIRED_HEADERS[raw.trim().toLowerCase() as keyof typeof REQUIRED_HEADERS];
    if (key) cols[key] = col;
  }
  if (
    cols.nameAr == null ||
    cols.originCountry == null ||
    cols.sku == null ||
    cols.descriptionAr == null ||
    cols.image == null
  ) {
    throw new Error(BAD_HEADERS);
  }
  return { ...cols, imageCol: cols.image } as Record<FieldKey, number> & { imageCol: number };
}

function parseSharedStrings(xml: string): string[] {
  const out: string[] = [];
  const siRe = /<si\b[^>]*>([\s\S]*?)<\/si>/g;
  let m: RegExpExecArray | null;
  while ((m = siRe.exec(xml))) {
    const texts: string[] = [];
    const tRe = /<t\b[^>]*>([\s\S]*?)<\/t>/g;
    let tm: RegExpExecArray | null;
    while ((tm = tRe.exec(m[1]))) texts.push(decodeXml(tm[1]));
    out.push(texts.join(''));
  }
  return out;
}

function parseCells(sheetXml: string, strings: string[]): Map<number, Map<number, string>> {
  const rows = new Map<number, Map<number, string>>();
  const cellRe = /<c\b([^>]*)(?:\/>|>([\s\S]*?)<\/c>)/g;
  let m: RegExpExecArray | null;
  while ((m = cellRe.exec(sheetXml))) {
    const ref = attr(m[1], 'r');
    if (!ref) continue;
    const parsed = splitCellRef(ref);
    if (!parsed) continue;
    const type = attr(m[1], 't');
    const value = cellValue(type, m[2] ?? '', strings);
    let row = rows.get(parsed.row);
    if (!row) {
      row = new Map();
      rows.set(parsed.row, row);
    }
    row.set(parsed.col, value);
  }
  return rows;
}

function cellValue(type: string | null, inner: string, strings: string[]): string {
  if (type === 's') {
    const idx = Number(innerMatch(inner, 'v'));
    return Number.isInteger(idx) ? (strings[idx] ?? '') : '';
  }
  if (type === 'inlineStr') {
    const texts: string[] = [];
    const tRe = /<t\b[^>]*>([\s\S]*?)<\/t>/g;
    let tm: RegExpExecArray | null;
    while ((tm = tRe.exec(inner))) texts.push(decodeXml(tm[1]));
    return texts.join('');
  }
  const raw = innerMatch(inner, 'v');
  if (raw == null) return '';
  const decoded = decodeXml(raw);
  if (type === 'str' || type === 'b' || type === 'e') return decoded;
  const n = Number(decoded);
  if (decoded !== '' && Number.isFinite(n) && Number.isInteger(n)) return String(n);
  return decoded;
}

function parseRowImages(
  files: Record<string, Uint8Array>,
  sheetPath: string,
  imageCol: number,
): Map<number, ParsedProductImage> {
  const out = new Map<number, ParsedProductImage>();
  const sheetRels = readText(files, relsPathFor(sheetPath));
  if (!sheetRels) return out;
  const drawingTarget = [...(sheetRels.match(/<Relationship\b[^>]*>/g) ?? [])]
    .map((tag) => ({ type: attr(tag, 'Type') ?? '', target: attr(tag, 'Target') }))
    .find((r) => r.target && r.type.includes('drawing'))?.target;
  if (!drawingTarget) return out;

  const drawingPath = joinZip(parentDir(sheetPath), drawingTarget);
  const drawingXml = readText(files, drawingPath);
  if (!drawingXml) return out;
  const drawingRels = parseRelsMap(readText(files, relsPathFor(drawingPath)) ?? '');

  const anchors = drawingXml.match(/<xdr:twoCellAnchor\b[\s\S]*?<\/xdr:twoCellAnchor>/g) ?? [];
  for (const block of anchors) {
    const col = Number(/<xdr:col>(\d+)<\/xdr:col>/.exec(block)?.[1]);
    const row = Number(/<xdr:row>(\d+)<\/xdr:row>/.exec(block)?.[1]);
    const embed = /r:embed="([^"]+)"/.exec(block)?.[1];
    if (!embed || !Number.isFinite(col) || !Number.isFinite(row)) continue;
    if (col !== imageCol) continue;
    const excelRow = row + 1;
    if (out.has(excelRow)) continue;
    const target = drawingRels.get(embed);
    if (!target) continue;
    const mediaPath = joinZip(parentDir(drawingPath), target);
    const bytes = files[mediaPath];
    if (!bytes) continue;
    out.set(excelRow, { bytes, ext: extOf(mediaPath) });
  }
  return out;
}

function parseRelsMap(xml: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const tag of xml.match(/<Relationship\b[^>]*>/g) ?? []) {
    const id = attr(tag, 'Id');
    const target = attr(tag, 'Target');
    if (id && target) map.set(id, target);
  }
  return map;
}

function splitCellRef(ref: string): { col: number; row: number } | null {
  const m = /^([A-Z]+)(\d+)$/i.exec(ref.trim());
  if (!m) return null;
  return { col: colToIndex(m[1].toUpperCase()), row: Number(m[2]) };
}

function colToIndex(col: string): number {
  let n = 0;
  for (const ch of col) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

function attr(tag: string, name: string): string | null {
  return new RegExp(`\\b${name}="([^"]*)"`).exec(tag)?.[1] ?? null;
}

function innerMatch(inner: string, tag: string): string | null {
  return new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`).exec(inner)?.[1] ?? null;
}

function decodeXml(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function relsPathFor(filePath: string): string {
  return `${parentDir(filePath)}/_rels/${filePath.slice(filePath.lastIndexOf('/') + 1)}.rels`;
}

function parentDir(filePath: string): string {
  const i = filePath.lastIndexOf('/');
  return i === -1 ? '' : filePath.slice(0, i);
}

function joinZip(fromDir: string, target: string): string {
  const cleaned = target.replace(/^\.\//, '');
  if (cleaned.startsWith('/')) return cleaned.slice(1);
  const parts = fromDir.split('/').filter(Boolean);
  for (const seg of cleaned.split('/')) {
    if (seg === '..') parts.pop();
    else if (seg && seg !== '.') parts.push(seg);
  }
  return parts.join('/');
}

function extOf(path: string): string {
  const base = path.split('/').pop() ?? 'jpg';
  const ext = (base.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
  return ext === 'jpeg' ? 'jpg' : ext || 'jpg';
}
