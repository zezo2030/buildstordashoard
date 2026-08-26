/** كود الإكسل خاص بالأدمن. الـ SKU المعروض في التطبيق يتولد منه ولا يساويه. */
export function skuFromSourceCode(code: string): string {
  const normalized = code.trim();
  if (!normalized) throw new Error('الكود مطلوب');
  const bytes = new TextEncoder().encode(normalized);
  let hash = 0xcbf29ce484222325n;
  for (const byte of bytes) {
    hash ^= BigInt(byte);
    hash = (hash * 0x100000001b3n) & 0xffffffffffffffffn;
  }
  return `BS-${hash.toString(16).toUpperCase().padStart(16, '0')}`;
}
