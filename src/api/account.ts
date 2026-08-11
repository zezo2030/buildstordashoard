// كلمات المرور — حالتان مختلفتان تقنيًا:
//  • كلمة مرورك أنت: بالمفتاح العام + جلستك (updateUser).
//  • كلمة مرور مستخدم آخر: تحتاج SERVICE_ROLE ⇒ عبر Edge Function حصرًا.
import { supabase, arError } from '../lib/supabase';

export const MIN_PASSWORD_LENGTH = 8;

/** تغيير كلمة مرور الأدمن الحالي — نتحقق من القديمة بمحاولة دخول أولًا. */
export async function changeOwnPassword(email: string, current: string, next: string) {
  if (next.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`كلمة المرور يجب أن تكون ${MIN_PASSWORD_LENGTH} أحرف على الأقل`);
  }
  if (next === current) throw new Error('كلمة المرور الجديدة مطابقة للحالية');

  const { error: checkErr } = await supabase.auth.signInWithPassword({ email, password: current });
  if (checkErr) throw new Error('كلمة المرور الحالية غير صحيحة');

  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) throw new Error(arError(error));
}

/**
 * تعيين كلمة مرور مستخدم آخر — عبر Edge Function `admin-set-password`.
 * الدالة بتتحقق من دور المُنادي في الداتابيز، وبتمنع تغيير كلمة مرور أدمن آخر.
 */
export async function setUserPassword(userId: string, password: string) {
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`كلمة المرور يجب أن تكون ${MIN_PASSWORD_LENGTH} أحرف على الأقل`);
  }

  const { data, error } = await supabase.functions.invoke<{ ok?: boolean; error?: string }>(
    'admin-set-password',
    { body: { user_id: userId, password } },
  );

  // أخطاء الدالة بترجع في جسم الرد — نقرأه قبل رسالة الشبكة العامة
  if (data?.error) throw new Error(data.error);
  if (error) {
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === 'function') {
      try {
        const body = await ctx.json();
        if (body?.error) throw new Error(body.error);
      } catch (parsed) {
        if (parsed instanceof Error && parsed.message) throw parsed;
      }
    }
    throw new Error(arError(error));
  }
}

/** توليد كلمة مرور قوية عشوائية — للأدمن يسلّمها للمستخدم ثم يطلب تغييرها. */
export function generatePassword(length = 12): string {
  const alphabet = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789@#%*';
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}
