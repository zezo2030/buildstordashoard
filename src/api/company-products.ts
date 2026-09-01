import { supabase, arError } from '../lib/supabase';
import { chunkIds } from '../lib/company-materials';

/** ربط مواد الكتالوج بشركة بائع — السعر 0 وغير مفعّل لحد ما الشركة تسعّر. */
export async function adminAssignCompanyProducts(companyId: string, productIds: string[]): Promise<number> {
  let added = 0;
  for (const part of chunkIds(productIds)) {
    const { data, error } = await supabase.rpc('admin_assign_company_products', {
      p_company_id: companyId,
      p_product_ids: part,
    });
    if (error) throw new Error(arError(error));
    added += Number(data ?? 0);
  }
  return added;
}
