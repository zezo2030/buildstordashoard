// موقع التسليم — الطلب إما لموقع شركة (sites) أو لعنوان شخصي (address_snapshot).
// دوال القوايم بترجع نفس الشكل ده من الداتابيز عبر app.order_location، وصفحة
// التفاصيل بتبنيه هنا من الجداول مباشرة — الشكل واحد فالعرض واحد.
export type Loc = {
  name: string | null;
  address: string | null;
  contactName: string | null;
  contactPhone: string | null;
};

const str = (v: unknown) => {
  const s = typeof v === 'string' ? v.trim() : '';
  return s === '' ? null : s;
};

/** بيقرا jsonb الراجع من app.order_location. */
export function toLoc(v: unknown): Loc | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  const loc: Loc = {
    name: str(o.name),
    address: str(o.address),
    contactName: str(o.contact_name),
    contactPhone: str(o.contact_phone),
  };
  return loc.name || loc.address || loc.contactName || loc.contactPhone ? loc : null;
}

export type SiteLite = {
  name: string | null;
  governorate: string | null;
  area: string | null;
  block: string | null;
  street: string | null;
  manager_name: string | null;
  manager_phone: string | null;
} | null;

/** نفس قواعد app.order_location بالظبط — لصفحة التفاصيل اللي بتقرا الجداول مباشرة. */
export function locFromOrder(site: SiteLite, addr: Record<string, unknown> | null): Loc | null {
  const join = (parts: (string | null)[]) => str(parts.filter(Boolean).join(' · '));
  if (site) {
    return {
      name: str(site.name),
      address: join([
        str(site.governorate),
        str(site.area),
        str(site.block) ? `قطعة ${str(site.block)}` : null,
        str(site.street),
      ]),
      contactName: str(site.manager_name),
      contactPhone: str(site.manager_phone),
    };
  }
  if (!addr) return null;
  return {
    name: str(addr.label) ?? 'عنوان التوصيل',
    address: join([
      str(addr.governorate),
      str(addr.area),
      str(addr.block) ? `قطعة ${str(addr.block)}` : null,
      str(addr.street),
    ]),
    contactName: str(addr.recipient),
    contactPhone: str(addr.phone),
  };
}
