// بيانات البائع الكاملة اللي بتظهر للمشتري في التطبيق: اللوجو، النبذة، أرقام
// التليفون، التخصصات، طرق الدفع، فروع/مواقع الشركة، وأرقام العقد والمحل.
//
// الأعمدة كلها على `companies` ما عدا التخصصات (`seller_specialties`) والمواقع
// (`sites`) — دول جدولين منفصلين لأن كل واحد صفوف متعددة لنفس الشركة.
import { supabase, arError } from '../lib/supabase';

export type SellerLocation = {
  id?: string;
  name: string;
  governorate: string;
  area: string;
  block: string;
  street: string;
  lat: string;
  lng: string;
};

export type SellerProfile = {
  logoUrl: string;
  aboutAr: string;
  phones: string[];
  paymentMethods: string[];
  specialtyIds: string[];
  shopNumber: string;
  contractNumber: string;
  contractFrom: string;
  contractTo: string;
  locations: SellerLocation[];
};

export const emptySellerProfile = (): SellerProfile => ({
  logoUrl: '',
  aboutAr: '',
  phones: [],
  paymentMethods: [],
  specialtyIds: [],
  shopNumber: '',
  contractNumber: '',
  contractFrom: '',
  contractTo: '',
  locations: [],
});

/** طرق الدفع المتاحة — نفس قيم enum payment_method في الداتابيز. */
export const PAYMENT_METHODS: { value: string; label: string }[] = [
  { value: 'knet', label: 'كي نت' },
  { value: 'credit_card', label: 'بطاقة ائتمان' },
  { value: 'apple_pay', label: 'Apple Pay' },
  { value: 'wallet', label: 'المحفظة' },
  { value: 'credit_terms', label: 'آجل (كريديت)' },
  { value: 'cash_on_delivery', label: 'كاش عند التوصيل' },
];

const str = (v: unknown) => (v == null ? '' : String(v));

export async function fetchSellerProfile(companyId: string): Promise<SellerProfile> {
  const [company, specialties, sites] = await Promise.all([
    supabase
      .from('companies')
      .select('logo_url, about_ar, phones, payment_methods, shop_number, contract_number, contract_from, contract_to')
      .eq('id', companyId)
      .single(),
    supabase.from('seller_specialties').select('specialty_id').eq('company_id', companyId),
    supabase
      .from('sites')
      .select('id, name, governorate, area, block, street, lat, lng')
      .eq('company_id', companyId)
      .order('created_at'),
  ]);
  if (company.error) throw new Error(arError(company.error));

  const c = company.data;
  return {
    logoUrl: str(c.logo_url),
    aboutAr: str(c.about_ar),
    phones: (c.phones ?? []).filter(Boolean),
    paymentMethods: c.payment_methods ?? [],
    specialtyIds: (specialties.data ?? []).map((r) => r.specialty_id),
    shopNumber: str(c.shop_number),
    contractNumber: str(c.contract_number),
    contractFrom: str(c.contract_from),
    contractTo: str(c.contract_to),
    locations: (sites.data ?? []).map((s) => ({
      id: s.id,
      name: str(s.name),
      governorate: str(s.governorate),
      area: str(s.area),
      block: str(s.block),
      street: str(s.street),
      lat: str(s.lat),
      lng: str(s.lng),
    })),
  };
}

/** موقع فاضي (مالوش اسم) بيتشال — مش بيتحفظ صف مالوش معنى. */
export function usableLocations(list: readonly SellerLocation[]): SellerLocation[] {
  return list.filter((l) => l.name.trim() !== '');
}

const num = (v: string) => {
  const t = v.trim();
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

export async function saveSellerProfile(companyId: string, p: SellerProfile): Promise<void> {
  const { error } = await supabase
    .from('companies')
    .update({
      logo_url: p.logoUrl.trim() || null,
      about_ar: p.aboutAr.trim() || null,
      phones: p.phones.map((x) => x.trim()).filter(Boolean),
      payment_methods: p.paymentMethods,
      shop_number: p.shopNumber.trim() || null,
      contract_number: p.contractNumber.trim() || null,
      contract_from: p.contractFrom || null,
      contract_to: p.contractTo || null,
    })
    .eq('id', companyId);
  if (error) throw new Error(arError(error));

  // التخصصات: نمسح ونكتب — الجدول ربط بحت من غير أعمدة تانية تتفقد
  const del = await supabase.from('seller_specialties').delete().eq('company_id', companyId);
  if (del.error) throw new Error(arError(del.error));
  if (p.specialtyIds.length) {
    const ins = await supabase.from('seller_specialties').insert(
      p.specialtyIds.map((specialty_id) => ({ company_id: companyId, specialty_id })),
    );
    if (ins.error) throw new Error(arError(ins.error));
  }

  // المواقع: تحديث الموجود، إضافة الجديد، وحذف اللي الأدمن شاله من الفورم.
  // مابنمسحش الكل ونعيد الإدخال لأن `orders.site_id` بيشاور على الصفوف دي.
  const wanted = usableLocations(p.locations);
  const keepIds = wanted.map((l) => l.id).filter((id): id is string => !!id);
  const stale = await supabase
    .from('sites')
    .select('id')
    .eq('company_id', companyId)
    .then((r) => (r.data ?? []).map((x) => x.id).filter((id) => !keepIds.includes(id)));
  if (stale.length) {
    // الموقع المستخدم في طلب قايم بيترفض حذفه من الداتابيز — بنعطّله بدل كده
    const { error: delErr } = await supabase.from('sites').delete().in('id', stale);
    if (delErr) {
      const { error: offErr } = await supabase
        .from('sites').update({ is_active: false }).in('id', stale);
      if (offErr) throw new Error(arError(offErr));
    }
  }

  for (const l of wanted) {
    const payload = {
      company_id: companyId,
      name: l.name.trim(),
      governorate: l.governorate.trim() || null,
      area: l.area.trim() || null,
      block: l.block.trim() || null,
      street: l.street.trim() || null,
      lat: num(l.lat),
      lng: num(l.lng),
    };
    const q = l.id
      ? supabase.from('sites').update(payload).eq('id', l.id)
      : supabase.from('sites').insert(payload);
    const { error: sErr } = await q;
    if (sErr) throw new Error(arError(sErr));
  }
}
