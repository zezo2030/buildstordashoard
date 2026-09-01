// تفاصيل شركة: بيانات + أعضاء + محفظة + آخر الطلبات + تعديل العمولة.
import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Package } from 'lucide-react';
import { supabase, arError } from '../lib/supabase';
import { setCommission as setCompanyCommission } from '../api/accounts';
import { PageHeader, Card, StatusChip, Money, Btn, Field, Input, Spinner, ErrorState } from '../components/ui';
import { SellerStatsPanel, BuyerCompanyStatsPanel } from '../components/AccountStatsPanel';
import { useToast } from '../components/Toast';
import { fmtDate, fmtDateTime } from '../lib/format';
import { orderStatusLabels, accountStatusLabels, labelOf } from '../lib/labels';

export default function CompanyDetail() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [commission, setCommission] = useState<string | null>(null);

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

  // العمولة بتتكتب عبر admin_set_company_commission بس: بيتحقق من المدى 0..100
  // وبيسجّل صف قبل/بعد في audit_log. الكتابة المباشرة على الجدول كانت بتعدّي
  // 0% و500% من غير أثر (مافيش CHECK على العمود).
  const saveCommission = useMutation({
    mutationFn: (value: number) => setCompanyCommission(id!, value),
    onSuccess: () => {
      toast('success', 'تم تحديث نسبة العمولة');
      setCommission(null);
      qc.invalidateQueries({ queryKey: ['company', id] });
      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({ queryKey: ['accounts-stats'] });
    },
    onError: (e) => toast('error', (e as Error).message),
  });

  // Number('') بيرجع 0، وtype="number" بيرجع '' لأي إدخال مش رقمي — من غير الشرط
  // ده حقل فاضي + حفظ = عمولة 0% فعلية من غير ما حد يقصدها. نفس حارس CommissionCell.
  const commissionInvalid = commission !== null
    && (commission.trim() === '' || !Number.isFinite(Number(commission)));

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
            <div className="flex justify-between gap-2"><dt className="text-subtext">الهواتف</dt><dd dir="ltr">{(c.phones ?? []).join('، ') || '—'}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-subtext">التقييم</dt><dd dir="ltr">★ {c.rating} ({c.ratings_count})</dd></div>
            <div className="flex justify-between gap-2">
              <dt className="text-subtext">الحالة</dt>
              <dd className="flex gap-1">
                {c.is_verified && <StatusChip label="موثقة" tone="green" />}
                <StatusChip label={c.is_active ? 'نشطة' : 'موقوفة'} tone={c.is_active ? 'green' : 'red'} />
              </dd>
            </div>
          </dl>

          {c.type === 'seller' && (
            <div className="mt-4 border-t border-line pt-4">
              {commission === null ? (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-subtext">عمولة المنصة على البائع</span>
                  <div className="flex items-center gap-3">
                    <span className="font-bold" dir="ltr">{c.commission_rate}%</span>
                    <Btn variant="ghost" onClick={() => setCommission(String(c.commission_rate))}>تعديل</Btn>
                  </div>
                </div>
              ) : (
                <div className="flex items-end gap-2">
                  <Field label="نسبة العمولة %">
                    <Input dir="ltr" type="number" step="0.01" min="0" max="100" value={commission} onChange={(e) => setCommission(e.target.value)} className="w-32" />
                  </Field>
                  <Btn variant="accent" busy={saveCommission.isPending} disabled={commissionInvalid} onClick={() => saveCommission.mutate(Number(commission))}>حفظ</Btn>
                  <Btn variant="ghost" onClick={() => setCommission(null)}>إلغاء</Btn>
                </div>
              )}
            </div>
          )}
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
