// شعار الشركة — bucket عام حدّه 2 ميجا. الاسم بيتولّد جديد كل مرة عشان نفس
// المسار كان بيفضل يرجّع الصورة القديمة من كاش الـCDN.
import { supabase, arError } from './supabase';

const LOGO_BUCKET = 'company-logos';
const LOGO_MAX_BYTES = 2 * 1024 * 1024; // حد الـbucket نفسه

/**
 * `folder` هو معرّف الشركة لما تكون موجودة. وقت إضافة بائع جديد الشركة لسه
 * ماتعملتش، فبنرفع تحت `new/` والصورة بتترابط بالشركة أول ما تتحفظ.
 */
export async function uploadCompanyLogo(file: File, folder = 'new'): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('الملف يجب أن يكون صورة');
  if (file.size > LOGO_MAX_BYTES) throw new Error('حجم الشعار يجب ألا يتجاوز 2 ميجابايت');
  const ext = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(LOGO_BUCKET).upload(path, file, {
    upsert: false,
    contentType: file.type,
  });
  if (error) throw new Error(arError(error));
  return supabase.storage.from(LOGO_BUCKET).getPublicUrl(path).data.publicUrl;
}
