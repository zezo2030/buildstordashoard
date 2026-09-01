/** تخصص أساسي + تخصصات تانية لنفس المنتج — من غير تكرار. */
export function linkedSpecialtyIds(
  rows: { specialty_id: string }[] | null | undefined,
): string[] {
  return (rows ?? []).map((r) => r.specialty_id);
}

export function specialtyLinkIds(primaryId: string, extraIds: readonly string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of [primaryId, ...extraIds]) {
    const id = raw.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

export function productInSpecialty(
  primaryId: string,
  linkedIds: readonly string[] | undefined,
  specialtyId: string,
): boolean {
  if (primaryId === specialtyId) return true;
  return (linkedIds ?? []).includes(specialtyId);
}
