// عمليات الأدمن — RPC أولًا (ذرّية)، ومع عدم تطبيق ميجريشن admin_console بعد،
// نستخدم fallback بكتابات مباشرة حيث تسمح سياسات RLS الحالية للأدمن.
import { supabase, arError } from '../lib/supabase';

// دوال الميجريشن غير موجودة في الأنواع المولّدة قبل تطبيقها — نداء rpc غير مُنمّط عمدًا.
async function rpc<T = unknown>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await (supabase.rpc as (f: string, a: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }>)(fn, args);
  if (error) throw error;
  return data as T;
}

function isMissingFn(e: unknown): boolean {
  const msg = (e as { message?: string })?.message ?? '';
  const code = (e as { code?: string })?.code ?? '';
  return code === 'PGRST202' || /Could not find the function|does not exist/i.test(msg);
}

/** تفعيل بائع: RPC ذرّي، أو fallback بثلاث كتابات متتالية عبر RLS. */
export async function activateSeller(args: {
  profileId: string;
  nameAr: string;
  phone?: string;
  governorate?: string;
  commercialRegister?: string;
}) {
  try {
    return await rpc<string>('admin_activate_seller', {
      p_profile_id: args.profileId,
      p_name_ar: args.nameAr,
      p_phone: args.phone ?? null,
      p_governorate: args.governorate ?? null,
      p_commercial_register: args.commercialRegister ?? null,
    });
  } catch (e) {
    if (!isMissingFn(e)) throw new Error(arError(e));
  }

  // Fallback: نفس الخطوات بدون ذرّية (سياسات is_admin تسمح بها كلها)
  const { data: company, error: cErr } = await supabase
    .from('companies')
    .insert({
      type: 'seller',
      name_ar: args.nameAr.trim(),
      commercial_register: args.commercialRegister?.trim() || null,
      governorate: args.governorate?.trim() || null,
      phones: args.phone?.trim() ? [args.phone.trim()] : [],
      is_verified: true,
      is_active: true,
      created_by: args.profileId,
    })
    .select('id')
    .single();
  if (cErr) throw new Error(arError(cErr));

  const { error: mErr } = await supabase.from('company_members').insert({
    company_id: company.id,
    user_id: args.profileId,
    member_role: 'owner',
  });
  if (mErr) throw new Error(arError(mErr));

  const { error: pErr } = await supabase
    .from('profiles')
    .update({ status: 'active' })
    .eq('id', args.profileId);
  if (pErr) throw new Error(arError(pErr));

  return company.id;
}

export async function rejectSeller(profileId: string, note?: string) {
  try {
    await rpc('admin_reject_seller', { p_profile_id: profileId, p_note: note ?? null });
    return;
  } catch (e) {
    if (!isMissingFn(e)) throw new Error(arError(e));
  }
  const { error } = await supabase
    .from('profiles')
    .update({ status: 'rejected' })
    .eq('id', profileId)
    .eq('role', 'seller')
    .eq('status', 'pending');
  if (error) throw new Error(arError(error));
}

/**
 * الـ RPC هو الطريق الوحيد — مافيش fallback. الكتابة المباشرة القديمة كانت بتحطّ
 * status = 'suspended' من غير suspended_at، والصف ده إعادة التفعيل مابتشوفهوش
 * أصلاً، يعني حالة مالهاش طريق خروج من الكونسول. admin_set_account_status مطبّقة
 * ومتاحة من ميجريشن الحسابات.
 */
export async function setAccountStatus(profileId: string, status: 'active' | 'suspended') {
  try {
    await rpc('admin_set_account_status', { p_profile_id: profileId, p_status: status });
  } catch (e) {
    throw new Error(arError(e));
  }
}

/** تسوية يدوية على محفظة — RPC فقط (قيد دفتر). */
export async function walletAdjust(walletId: string, amount: number, description: string) {
  try {
    return await rpc('admin_wallet_adjust', {
      p_wallet_id: walletId,
      p_amount: amount,
      p_description: description,
    });
  } catch (e) {
    throw new Error(arError(e));
  }
}

/** إشعار جماعي — RPC فقط (لا سياسة INSERT على notifications). */
export async function broadcast(titleAr: string, bodyAr?: string, role?: string) {
  try {
    return await rpc<number>('admin_broadcast', {
      p_title_ar: titleAr,
      p_body_ar: bodyAr ?? null,
      p_role: role ?? null,
    });
  } catch (e) {
    throw new Error(arError(e));
  }
}
