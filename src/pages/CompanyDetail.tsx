// تفاصيل شركة: بيانات + أعضاء + محفظة + آخر الطلبات + تعديل العمولة.
import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Package } from 'lucide-react';
import { supabase, arError } from '../lib/supabase';
import { uploadCompanyLogo } from '../lib/company-logo';
import { PageHeader, Card, StatusChip, Money, Btn, Field, Input, Spinner, ErrorState } from '../components/ui';
import { SellerStatsPanel, BuyerCompanyStatsPanel } from '../components/AccountStatsPanel';
import { SellerProfileCard } from '../components/SellerProfileCard';
import { BillingPlanDialog, periodText, type CurrentPlan } from './accounts/BillingCell';
import { useToast } from '../components/Toast';
import { fmtDate, fmtDateTime, localPhone, money } from '../lib/format';
import { orderStatusLabels, accountStatusLabels, labelOf } from '../lib/labels';

export default function CompanyDetail() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['company', id],
    queryFn: async () => {
      const [company, members, wallet, orders, productCount] = await Promise.all([
        supabase.from('companies').select('*').eq('id', id!).single(),
        supabase
          .from('company_members')
          .select('id, member_role, status, profile:profiles!company_members_user_id_fkey (id, full_name, email, phone)')
          .eq('company_id', id!),
        supabase.from('wallets').select('id, balance, is_frozen').eq('owner_type', 'company').eq('owner_id', id!).maybeSingle(),
        supabase
          .from('orders')
          .select('id, order_number, status, grand_total, placed_at')
          .or(`seller_company_id.eq.${id},buyer_company_id.eq.${id}`)
          .order('placed_at', { ascending: false })
          .limit(10),
        supabase
          .from('seller_products')
          .select('id', { count: 'exact', head: true })
          .eq('seller_company_id', id!),
      ]);
      if (company.error) throw new Error(arError(company.error));
      return {
        company: company.data,
        members: (members.data ?? []) as unknown as {
          id: string;
          member_role: string;
          status: string;
          profile: { id: string; full_name: string; email: string | null; phone: string | null } | null;
        }[],
        wallet: wallet.data,
        orders: orders.data ?? [],
        productCount: productCount.count ?? 0,
      };
    },
  });

  if (isLoading) return <Spinner />;
  if (error || !data?.company)
    return <ErrorState message={(error as Error)?.message ?? 'الشركة غير موجودة'} onRetry={() => refetch()} />;

  const c = data.company;
  const memberRoleLabel: Record<string, string> = {
    owner: 'مالك',
    manager: 'مدير',
    purchaser: 'مشتري',
    viewer: 'مطّلع',
  };

  return (
    <div>
      <PageHeader
        title={c.name_ar}
        subtitle={`${c.type === 'seller' ? 'شركة بائع' : 'شركة مشتري'} · أُنشئت ${fmtDate(c.created_at)}`}
        actions={
          // شركة المشتري مالهاش مكان في تاب البائعين — الرجوع لازم يروح لتابها هي.
          <Link
            to={c.type === 'seller' ? '/accounts/sellers' : '/accounts/companies'}
            className="flex items-center gap-1 text-sm text-subtext hover:text-primary"
          >
            <ArrowRight size={15} /> {c.type === 'seller' ? 'رجوع للبائعين' : 'رجوع لمشتري شركة'}
          </Link>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-4 lg:col-span-2">
          <h2 className="mb-3 font-bold">بيانات الشركة</h2>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <div className="flex justify-between gap-2"><dt className="text-subtext">السجل التجاري</dt><dd dir="ltr">{c.commercial_register ?? '—'}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-subtext">المحافظة</dt><dd>{c.governorate ?? '—'}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-subtext">البريد</dt><dd dir="ltr">{c.email ?? '—'}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-subtext">الهواتف</dt><dd dir="ltr">{(c.phones ?? []).map(localPhone).join('، ') || '—'}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-subtext">التقييم</dt><dd dir="ltr">★ {c.rating} ({c.ratings_count})</dd></div>
            <div className="flex justify-between gap-2">
              <dt className="text-subtext">الحالة</dt>
              <dd className="flex gap-1">
                {c.is_verified && <StatusChip label="موثقة" tone="green" />}
                <StatusChip label={c.is_active ? 'نشطة' : 'موقوفة'} tone={c.is_active ? 'green' : 'red'} />
              </dd>
            </div>
          </dl>

          {/* الرسوم بقت خطة كاملة: نسبة أو اشتراك ثابت بمدة سريان محددة */}
          {c.type === 'seller' && <SellerBillingRow companyId={c.id} name={c.name_ar} />}
        </Card>

        <Card className="p-4">
          <h2 className="mb-3 font-bold">المحفظة</h2>
          {data.wallet ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-subtext">الرصيد</span><Money value={data.wallet.balance} /></div>
              <div className="flex justify-between">
                <span className="text-subtext">الحالة</span>
                {data.wallet.is_frozen ? <StatusChip label="مجمّدة" tone="red" /> : <StatusChip label="نشطة" tone="green" />}
              </div>
              <Link to="/wallets" className="mt-2 block text-sm text-accent hover:underline">إدارة المحافظ ←</Link>
            </div>
          ) : (
            <p className="text-sm text-subtext">لا توجد محفظة لهذه الشركة</p>
          )}
        </Card>
      </div>

      {c.type !== 'seller' && (
      <BrandingCard
        companyId={c.id}
        name={c.name_ar}
        logoUrl={c.logo_url}
        lat={c.lat}
        lng={c.lng}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ['company', id] });
          qc.invalidateQueries({ queryKey: ['accounts'] });
        }}
      />
      )}

      {c.type === 'seller' && <SellerProfileCard companyId={c.id} />}

      {c.type === 'seller' ? (
        <SellerStatsPanel companyId={c.id} />
      ) : (
        <BuyerCompanyStatsPanel companyId={c.id} />
      )}

      {c.type === 'seller' && (
        <Card className="mt-4 p-4">
          <h2 className="mb-3 font-bold">كتالوج المواد</h2>
          <Link
            to={`/companies/${c.id}/materials`}
            className="flex items-center justify-between gap-3 rounded-lg border border-line px-4 py-3 text-sm transition-colors hover:bg-surface"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-accent-soft p-2 text-accent">
                <Package size={18} />
              </div>
              <div>
                <div className="font-medium">مواد الشركة</div>
                <div className="text-xs text-subtext">
                  {data.productCount} مادة — عرض، تعديل، أو إضافة دفعة واحدة
                </div>
              </div>
            </div>
            <span className="text-accent">←</span>
          </Link>
        </Card>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h2 className="mb-3 font-bold">الأعضاء ({data.members.length})</h2>
          {data.members.length === 0 ? (
            <p className="text-sm text-subtext">لا يوجد أعضاء</p>
          ) : (
            <div className="divide-y divide-line">
              {data.members.map((m) => {
                const s = labelOf(accountStatusLabels, m.status);
                return (
                  <div key={m.id} className="flex items-center gap-3 py-2.5 text-sm">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{m.profile?.full_name ?? '—'}</div>
                      <div className="text-xs text-subtext" dir="ltr">{m.profile?.email ?? m.profile?.phone ?? ''}</div>
                    </div>
                    <StatusChip label={memberRoleLabel[m.member_role] ?? m.member_role} tone="navy" />
                    <StatusChip label={s.label} tone={s.tone} />
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="p-4">
          <h2 className="mb-3 font-bold">آخر الطلبات</h2>
          {data.orders.length === 0 ? (
            <p className="text-sm text-subtext">لا توجد طلبات</p>
          ) : (
            <div className="divide-y divide-line">
              {data.orders.map((o) => {
                const s = labelOf(orderStatusLabels, o.status);
                return (
                  <Link key={o.id} to={`/orders/${o.id}`} className="flex items-center gap-3 py-2.5 text-sm hover:bg-surface">
                    <span className="font-medium" dir="ltr">{o.order_number}</span>
                    <span className="flex-1 text-xs text-subtext">{fmtDateTime(o.placed_at)}</span>
                    <StatusChip label={s.label} tone={s.tone} />
                    <Money value={o.grand_total} />
                  </Link>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

/**
 * إحداثيات من إدخال حر: «24.7136, 46.6753» أو رابط خرائط جوجل منسوخ زي ما هو
 * (`/@24.71,46.67,15z` أو `?q=24.71,46.67`) — الأدمن بينسخ من الخريطة مباشرة.
 */
function parseCoordinates(raw: string): { lat: number; lng: number } | null {
  const text = raw.trim();
  if (!text) return null;
  const source = text.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/)
    ?? text.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
  if (!source) return null;
  const lat = Number(source[1]);
  const lng = Number(source[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

/**
 * شعار الشركة وموقعها على الخريطة.
 *
 * الاتنين بيظهروا للمشتري في «تفاصيل الشركة» في التطبيق: الشعار في رأس الشاشة،
 * والإحداثيات هي اللي زرار «فتح الموقع على الخريطة» بيفتح بيها تطبيق الخرائط
 * على الدبّوس بالظبط. من غيرهم الشاشة بتعرض أيقونة بديلة وبحث بالعنوان.
 */
function BrandingCard({
  companyId,
  name,
  logoUrl,
  lat,
  lng,
  onSaved,
}: {
  companyId: string;
  name: string;
  logoUrl: string | null;
  lat: number | null;
  lng: number | null;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [coords, setCoords] = useState(lat != null && lng != null ? `${lat}, ${lng}` : '');

  const saveLogo = useMutation({
    mutationFn: async (file: File) => {
      const url = await uploadCompanyLogo(file, companyId);
      const { error } = await supabase.from('companies').update({ logo_url: url }).eq('id', companyId);
      if (error) throw new Error(arError(error));
    },
    onSuccess: () => {
      toast('success', 'تم تحديث شعار الشركة');
      onSaved();
    },
    onError: (e) => toast('error', (e as Error).message),
  });

  const saveCoords = useMutation({
    mutationFn: async (value: string) => {
      const point = value.trim() ? parseCoordinates(value) : null;
      if (value.trim() && !point) throw new Error('الإحداثيات غير صحيحة — اكتب «خط العرض، خط الطول» أو الصق رابط الخريطة');
      const { error } = await supabase
        .from('companies')
        .update({ lat: point?.lat ?? null, lng: point?.lng ?? null })
        .eq('id', companyId);
      if (error) throw new Error(arError(error));
    },
    onSuccess: () => {
      toast('success', 'تم تحديث موقع الشركة');
      onSaved();
    },
    onError: (e) => toast('error', (e as Error).message),
  });

  return (
    <Card className="mt-4 p-4">
      <h2 className="mb-3 font-bold">الشعار والموقع</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex items-center gap-3">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line bg-surface">
            {logoUrl ? (
              <img src={logoUrl} alt={name} className="h-full w-full object-contain" />
            ) : (
              <span className="text-xs text-subtext">بدون شعار</span>
            )}
          </div>
          <div className="text-sm">
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-line bg-white px-4 py-2 font-medium text-primary transition-colors hover:bg-surface">
              {saveLogo.isPending ? 'جارٍ الرفع…' : 'رفع شعار'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={saveLogo.isPending}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (file) saveLogo.mutate(file);
                }}
              />
            </label>
            <p className="mt-1 text-xs text-subtext">PNG أو JPG — حتى 2 ميجابايت</p>
          </div>
        </div>

        <div className="flex items-end gap-2">
          <Field
            label="إحداثيات الموقع (GPS)"
            hint="مثال: 29.3759, 47.9774 — أو الصق رابط الموقع من خرائط جوجل"
          >
            <Input
              dir="ltr"
              value={coords}
              placeholder="29.3759, 47.9774"
              onChange={(e) => setCoords(e.target.value)}
            />
          </Field>
          <Btn variant="accent" busy={saveCoords.isPending} onClick={() => saveCoords.mutate(coords)}>
            حفظ
          </Btn>
          {lat != null && lng != null && (
            <a
              href={`https://maps.google.com/?q=${lat},${lng}`}
              target="_blank"
              rel="noreferrer"
              className="whitespace-nowrap py-2 text-sm text-accent hover:underline"
            >
              معاينة
            </a>
          )}
        </div>
      </div>
    </Card>
  );
}

/**
 * خطة رسوم البائع في صفحته: النظام (نسبة/اشتراك)، القيمة، ومدة السريان.
 * بتقرا من `billing_plans` مباشرة — الصفحة دي مش بتمر على قايمة الحسابات.
 */
function SellerBillingRow({ companyId, name }: { companyId: string; name: string }) {
  const [open, setOpen] = useState(false);

  const q = useQuery({
    queryKey: ['billing-plan', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('billing_plans')
        .select('kind, rate, fee, starts_on, ends_on, cycles')
        .eq('subject_type', 'seller')
        .eq('subject_id', companyId)
        .eq('is_active', true)
        .maybeSingle();
      if (error) throw new Error(arError(error));
      return data;
    },
  });

  const p = q.data;
  const current: CurrentPlan = {
    kind: (p?.kind as CurrentPlan['kind']) ?? null,
    rate: p?.rate == null ? null : Number(p.rate),
    fee: Number(p?.fee ?? 0),
    from: p?.starts_on ?? null,
    to: p?.ends_on ?? null,
    cycles: p?.cycles ?? null,
  };
  const summary = current.kind === 'subscription'
    ? (current.fee > 0 ? `اشتراك ${money(current.fee)}` : 'اشتراك مجاني')
    : current.kind === 'commission'
      ? `نسبة ${current.rate ?? 0}%`
      : '—';

  return (
    <div className="mt-4 border-t border-line pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <div>
          <div className="text-subtext">رسوم المنصة على البائع</div>
          <div className="mt-0.5 text-xs text-subtext">{periodText(current.from, current.to)}</div>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-bold" dir="ltr">{q.isLoading ? '…' : summary}</span>
          <Btn variant="ghost" onClick={() => setOpen(true)}>تعديل</Btn>
        </div>
      </div>
      {open && (
        <BillingPlanDialog
          subject="seller"
          subjectId={companyId}
          name={name}
          current={current}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
