import { supabase, arError } from './supabase';

export function mimeOfImageExt(ext: string): string {
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'gif') return 'image/gif';
  return 'image/jpeg';
}

function copyBytes(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy;
}

export function imageBytesToFile(bytes: Uint8Array, ext: string): File {
  return new File([copyBytes(bytes)], `product.${ext}`, { type: mimeOfImageExt(ext) });
}

export function imageBytesToObjectUrl(bytes: Uint8Array, ext: string): string {
  return URL.createObjectURL(new Blob([copyBytes(bytes)], { type: mimeOfImageExt(ext) }));
}

export async function uploadProductImage(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('الملف يجب أن يكون صورة');
  if (file.size > 5 * 1024 * 1024) throw new Error('حجم الصورة يجب ألا يتجاوز 5 ميجابايت');
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const tryBuckets = [
    { bucket: 'product-images', path: `catalog/${crypto.randomUUID()}.${ext}` },
    { bucket: 'taxonomy-images', path: `products/${crypto.randomUUID()}.${ext}` },
  ] as const;
  let lastErr: Error | null = null;
  for (const t of tryBuckets) {
    const { error } = await supabase.storage.from(t.bucket).upload(t.path, file, {
      upsert: false,
      contentType: file.type,
    });
    if (!error) {
      const { data } = supabase.storage.from(t.bucket).getPublicUrl(t.path);
      return data.publicUrl;
    }
    lastErr = new Error(arError(error));
  }
  throw lastErr ?? new Error('فشل رفع الصورة');
}

