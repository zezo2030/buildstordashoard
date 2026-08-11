import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

// مفتاح anon عام بطبيعته — الأمان كله في RLS (سياسات app.is_admin()).
// SERVICE_ROLE لا يدخل الكلاينت أبدًا.
const url = import.meta.env.VITE_SUPABASE_URL ?? 'https://saiwbrybhtssrzjwavxr.supabase.co';
const anonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ?? 'sb_publishable_u7YfnWHrHdWBk3BnP7xluw_kG11_9rz';

export const supabase = createClient<Database>(url, anonKey);

/** رسالة عربية مفهومة من أخطاء Supabase/PostgREST — أخطاء البزنس من الداتابيز تمر كما هي. */
export function arError(e: unknown): string {
  const msg = (e as { message?: string })?.message ?? '';
  const code = (e as { code?: string })?.code ?? '';
  if (/[؀-ۿ]/.test(msg)) return msg; // رسالة عربية من الداتابيز
  if (code === 'PGRST202' || /function .* does not exist|Could not find the function/i.test(msg))
    return 'هذه العملية تتطلب تطبيق ميجريشن لوحة التحكم (admin_console) على قاعدة البيانات أولًا.';
  if (/Invalid login credentials/i.test(msg)) return 'بيانات الدخول غير صحيحة';
  if (/Email not confirmed/i.test(msg)) return 'البريد الإلكتروني غير مُفعّل';
  if (/JWT|token/i.test(msg)) return 'انتهت الجلسة — سجّل الدخول من جديد';
  if (/Failed to fetch|NetworkError|network/i.test(msg)) return 'تعذر الاتصال بالخادم — تحقق من الإنترنت';
  if (/duplicate key/i.test(msg)) return 'القيمة مسجلة من قبل (تكرار غير مسموح)';
  if (/violates foreign key/i.test(msg)) return 'لا يمكن الحذف — السجل مرتبط ببيانات أخرى';
  if (/row-level security/i.test(msg)) return 'غير مصرح لك بهذه العملية';
  return msg || 'حدث خطأ غير متوقع';
}
