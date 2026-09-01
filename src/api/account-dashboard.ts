import { supabase, arError } from '../lib/supabase';
import {
  parseBuyerDashboard,
  parseSellerDashboard,
  type BuyerDashboard,
  type SellerDashboard,
} from '../lib/account-dashboard';

/** مدى زمني اختياري — نص فاضي معناه «كل الفترات» وبيتبعت null للقاعدة. */
export type DashboardRange = { from: string; to: string };

export const ALL_TIME: DashboardRange = { from: '', to: '' };

function rangeArgs(range: DashboardRange) {
  return { p_from: range.from || null, p_to: range.to || null };
}

async function callRpc(fn: string, args: Record<string, unknown>): Promise<unknown> {
  const { data, error } = await supabase.rpc(fn as never, args as never);
  if (error) throw new Error(arError(error));
  return data;
}

export async function fetchSellerDashboard(
  companyId: string,
  range: DashboardRange,
): Promise<SellerDashboard> {
  return parseSellerDashboard(
    await callRpc('admin_seller_dashboard', { p_company_id: companyId, ...rangeArgs(range) }),
  );
}

export async function fetchBuyerDashboard(
  profileId: string,
  range: DashboardRange,
): Promise<BuyerDashboard> {
  return parseBuyerDashboard(
    await callRpc('admin_buyer_dashboard', { p_profile_id: profileId, ...rangeArgs(range) }),
  );
}

/**
 * أرقام شركة المشتري نفسها — مش أرقام مالكها. اللوح كان بينادي
 * `fetchBuyerDashboard` بمعرف المالك، فكانت مشترياته الشخصية بتتحسب على
 * الشركة، والشركة اللي ملهاش عضو `owner` ما كانتش بتعرض أي إحصائيات.
 */
export async function fetchBuyerCompanyDashboard(
  companyId: string,
  range: DashboardRange,
): Promise<BuyerDashboard> {
  return parseBuyerDashboard(
    await callRpc('admin_buyer_company_dashboard', { p_company_id: companyId, ...rangeArgs(range) }),
  );
}
