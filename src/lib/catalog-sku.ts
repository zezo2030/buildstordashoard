/** كود الإكسل خاص بالأدمن. الـ SKU المعروض في التطبيق: حرف + 6 أرقام. */
export function skuFromSourceCode(code: string): string {
  const normalized = code.trim();
  if (!normalized) throw new Error('الكود مطلوب');
  const bytes = new TextEncoder().encode(normalized);
  let hash = 0xcbf29ce484222325n;
  for (const byte of bytes) {
    hash ^= BigInt(byte);
    hash = (hash * 0x100000001b3n) & 0xffffffffffffffffn;
  }
  const letter = String.fromCharCode(65 + Number(hash % 26n));
  const digits = Number((hash / 26n) % 1_000_000n).toString().padStart(6, '0');
  return `${letter}${digits}`;
}
