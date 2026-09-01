// تخطيط ربط منتجات الكتالوج الموجودة مسبقًا بشركة — من عمود Code في شيت Excel.
// لا يُنشئ منتجات جديدة: يطابق SKU فقط، والمكرر/المفقود يتصنّف للعرض قبل التنفيذ.
import type { ParsedProductRow } from './product-xlsx';

export type CatalogMatch = { id: string; sku: string; source_code?: string | null; name_ar: string; unit_id: string };

export type LinkableRow = {
  rowNumber: number;
  productId: string;
  sku: string;
  nameAr: string;
  catalogNameAr: string;
  unitId: string;
  originCountry: string | null;
};

export type SkippedLinkRow = { rowNumber: number; sku: string; nameAr: string };

export type CompanyLinkPlan = {
  toLink: LinkableRow[];
  notInCatalog: SkippedLinkRow[];
  alreadyLinked: SkippedLinkRow[];
  duplicateInFile: SkippedLinkRow[];
  missingSku: { rowNumber: number }[];
};

export function planCompanyProductLink(
  rows: ParsedProductRow[],
  catalogBySku: ReadonlyMap<string, CatalogMatch>,
  linkedProductIds: ReadonlySet<string>,
): CompanyLinkPlan {
  const plan: CompanyLinkPlan = {
    toLink: [],
    notInCatalog: [],
    alreadyLinked: [],
    duplicateInFile: [],
    missingSku: [],
  };
  const seenSkus = new Set<string>();

  for (const r of rows) {
    const nameAr = r.nameAr.trim();
    const sku = r.sku.trim();
    if (!nameAr && !sku && !r.originCountry && !r.descriptionAr && !r.image) continue;
    if (!sku) {
      plan.missingSku.push({ rowNumber: r.rowNumber });
      continue;
    }
    if (seenSkus.has(sku)) {
      plan.duplicateInFile.push({ rowNumber: r.rowNumber, sku, nameAr });
      continue;
    }
    seenSkus.add(sku);

    const match = catalogBySku.get(sku);
    if (!match) {
      plan.notInCatalog.push({ rowNumber: r.rowNumber, sku, nameAr });
      continue;
    }
    if (linkedProductIds.has(match.id)) {
      plan.alreadyLinked.push({ rowNumber: r.rowNumber, sku, nameAr });
      continue;
    }
    plan.toLink.push({
      rowNumber: r.rowNumber,
      productId: match.id,
      sku,
      nameAr,
      catalogNameAr: match.name_ar,
      unitId: match.unit_id,
      originCountry: r.originCountry,
    });
  }

  return plan;
}
