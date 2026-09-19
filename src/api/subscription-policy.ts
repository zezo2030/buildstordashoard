// سياسة اشتراك المشترين — رقم واحد بيسري على كل الحسابات.
//
// اشتراك المشتري **مش** في `billing_plans` زي البائع: هو إعدادات منصة
// (`subscription_fee_individual` / `_company` / `_period_days` / `_trial_days`)
// + تاريخ نهاية لكل حساب في `profiles.subscribed_until`.
//
// عشان كده أعمدة «رسوم الاشتراك / من / إلى» في تابات المشتري كانت فاضية
// دايمًا — هي بتقرا `billing_plans` اللي المشتري مالوش فيها صف أصلًا.
import { supabase, arError } from '../lib/supabase';

export type BuyerSubscriptionPolicy = {
  feeIndividual: string;
  feeCompany: string;
  periodDays: number;
  trialDays: number;
  reminderDays: number;
  /** السياسة بتأثر على كام حساب — من غيرهم الأدمن بيغيّر رقم على العمياني. */
  nIndividual: number;
  nCompany: number;
  nActive: number;
  nExpired: number;
};

const num = (v: unknown) => Number(v ?? 0);

function parse(r: Record<string, unknown>): BuyerSubscriptionPolicy {
  return {
    feeIndividual: String(r.fee_individual ?? '0'),
    feeCompany: String(r.fee_company ?? '0'),
    periodDays: num(r.period_days),
    trialDays: num(r.trial_days),
    reminderDays: num(r.reminder_days),
    nIndividual: num(r.n_individual),
    nCompany: num(r.n_company),
    nActive: num(r.n_active),
    nExpired: num(r.n_expired),
  };
}

export async function fetchBuyerSubscriptionPolicy(): Promise<BuyerSubscriptionPolicy> {
  const { data, error } = await supabase.rpc('admin_buyer_subscription_policy' as never);
  if (error) throw new Error(arError(error));
  return parse(data as unknown as Record<string, unknown>);
}

export async function saveBuyerSubscriptionPolicy(p: {
  feeIndividual: string;
  feeCompany: string;
  periodDays: string;
  trialDays: string;
}): Promise<BuyerSubscriptionPolicy> {
  // المبالغ نص لحد الداتابيز — ولا `parseFloat` على فلوس.
  for (const [label, v] of [['اشتراك الفرد', p.feeIndividual], ['اشتراك الشركة', p.feeCompany]]) {
    if (!/^\d{1,7}(\.\d{1,3})?$/.test(v.trim())) throw new Error(`${label}: اكتب مبلغًا صالحًا`);
  }
  for (const [label, v] of [['المدة', p.periodDays], ['التجربة', p.trialDays]]) {
    if (!/^\d{1,4}$/.test(v.trim())) throw new Error(`${label}: اكتب عدد أيام صالح`);
  }

  const { data, error } = await supabase.rpc('admin_set_buyer_subscription_policy' as never, {
    p_fee_individual: p.feeIndividual.trim(),
    p_fee_company: p.feeCompany.trim(),
    p_period_days: Number(p.periodDays.trim()),
    p_trial_days: Number(p.trialDays.trim()),
  } as never);
  if (error) throw new Error(arError(error));
  return parse(data as unknown as Record<string, unknown>);
}

/** تاريخ نهاية الاشتراك لكل حساب من المعروض على الشاشة. */
export async function fetchSubscribedUntil(ids: string[]): Promise<Record<string, string | null>> {
  if (ids.length === 0) return {};
  const { data, error } = await supabase
    .from('profiles')
    .select('id, subscribed_until')
    .in('id', ids);
  if (error) throw new Error(arError(error));
  const out: Record<string, string | null> = {};
  for (const r of (data ?? []) as { id: string; subscribed_until: string | null }[]) {
    out[r.id] = r.subscribed_until;
  }
  return out;
}

/**
 * منح أيام مجانية لحساب — **بتتضاف** على المدة الحالية مش بتستبدلها، عشان
 * منح يوم لحساب مشترك لحد بعدين ما يقصّرش اشتراكه.
 */
export async function grantSubscriptionDays(
  profileId: string,
  days: number,
  note?: string,
): Promise<string> {
  const { data, error } = await supabase.rpc('admin_grant_subscription_days' as never, {
    p_profile_id: profileId,
    p_days: days,
    p_note: note?.trim() || null,
  } as never);
  if (error) throw new Error(arError(error));
  return String(data);
}
