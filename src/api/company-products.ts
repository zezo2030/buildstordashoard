import { supabase, arError } from '../lib/supabase';
import { chunkIds } from '../lib/company-materials';

/**
 * ربط مواد الكتالوج بشركة بائع — السعر 0 وغير مفعّل لحد ما الشركة تسعّر.
 *
 * `origin` بيحدد منشأ العرض: الشركة تقدر تاخد نفس المادة أكتر من مرة بمنشأ
 * مختلف كل مرة (كويتي/سعودي)، وبتظهر للمشتري صف لكل منشأ بسعره. سيبه فاضي
 * والعرض هياخد منشأ المنتج نفسه.
 */
export async function adminAssignCompanyProducts(
  companyId: string,
  productIds: string[],
  origin?: string | null,
): Promise<number> {
  let added = 0;
  // المولّد بيكتب الوسيط الاختياري `string | undefined` مش `string | null`، فبنسيبه
  // مش موجود خالص لما مفيش منشأ بدل ما نبعت null صريح.
  const originArg = origin?.trim() || undefined;
  for (const part of chunkIds(productIds)) {
    const { data, error } = await supabase.rpc('admin_assign_company_products', {
      p_company_id: companyId,
      p_product_ids: part,
      ...(originArg ? { p_origin_country: originArg } : {}),
    });
    if (error) throw new Error(arError(error));
    added += Number(data ?? 0);
  }
  return added;
}
