// تفاصيل طلب: أصناف + مدفوعات + تاريخ الحالات + الفواتير — قراءة إشرافية.
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Printer } from 'lucide-react';
import { printInvoice } from '../lib/invoice-html';
import { supabase, arError } from '../lib/supabase';
import { PageHeader, Card, StatusChip, Money, Spinner, ErrorState } from '../components/ui';
import { fmtDate, fmtDateTime, localPhone, qty } from '../lib/format';
import { locFromOrder, type SiteLite } from '../api/location';
import { LocationCell } from '../components/LocationCell';
import { orderStatusLabels, paymentStatusLabels, paymentMethodLabels, labelOf } from '../lib/labels';

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['order', id],
    queryFn: async () => {
      const order = await supabase
        .from('orders')
        .select(
          `*, buyer:profiles!orders_buyer_id_fkey (full_name, email, phone),
           seller:companies!orders_seller_company_id_fkey (id, name_ar, commercial_register, tax_number),
           site:sites!orders_site_id_fkey (name, governorate, area, block, street, manager_name, manager_phone)`,
        )
        .eq('id', id!)
        .single();
      if (order.error) throw new Error(arError(order.error));
      const [items, history, invoices] = await Promise.all([
        supabase.from('order_items').select('*').eq('order_id', id!).order('created_at').order('id'),
        supabase.from('order_status_history').select('*').eq('order_id', id!).order('created_at'),
        supabase
          .from('invoices')
          .select('id, invoice_number, type, total, issued_at')
          .eq('order_id', id!)
          .order('issued_at'),
      ]);
      return {
        order: order.data as typeof order.data & {
          buyer: { full_name: string; email: string | null; phone: string | null } | null;
          seller: { id: string; name_ar: string; commercial_register: string | null; tax_number: string | null } | null;
          site: SiteLite;
        },
        items: items.data ?? [],
        history: history.data ?? [],
        invoices: invoices.data ?? [],
      };
    },
  });

  if (isLoading) return <Spinner />;
  if (error || !data)
    return <ErrorState message={(error as Error)?.message ?? 'الطلب غير موجود'} onRetry={() => refetch()} />;

  const o = data.order;
  const st = labelOf(orderStatusLabels, o.status);
  const ps = labelOf(paymentStatusLabels, o.payment_status);
  const pm = labelOf(paymentMethodLabels, o.payment_method);
  const addr = (o.address_snapshot ?? null) as Record<string, unknown> | null;

  return (
    <div>
      <PageHeader
        title={`طلب ${o.order_number}`}
        subtitle={fmtDateTime(o.placed_at)}
        actions={
          <Link to="/orders" className="flex items-center gap-1 text-sm text-subtext hover:text-primary">
            <ArrowRight size={15} /> رجوع للطلبات
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <StatusChip label={st.label} tone={st.tone} />
        <StatusChip label={`الدفع: ${ps.label}`} tone={ps.tone} />
        <StatusChip label={pm.label} tone="gray" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-4 lg:col-span-2">
          <h2 className="mb-3 font-bold">الأصناف</h2>
          <div>
            <table className="w-full table-fixed text-[13px]">
              <thead>
                <tr className="border-b border-line text-subtext">
                  <th className="w-8 py-2 text-start font-medium">#</th>
                  <th className="py-2 text-start font-medium">الصنف</th>
                  <th className="w-24 py-2 text-start font-medium">الكمية</th>
                  <th className="w-28 py-2 text-start font-medium">سعر الوحدة</th>
                  <th className="w-24 py-2 text-start font-medium">الخصم</th>
                  <th className="w-32 py-2 text-start font-medium">الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((it, i) => (
                  <tr key={it.id} className="border-b border-line align-top last:border-0">
                    <td className="py-2 text-start tabular-nums text-subtext">{i + 1}</td>
                    <td className="py-2 text-start">
                      <div className="font-medium">{it.name_ar}</div>
                      {/* نفس سطر التفاصيل اللي بيشوفه المشتري في التطبيق: الكود · بلد المنشأ */}
                      {(it.sku || it.origin_country) && (
                        <div className="text-xs text-subtext">
                          {it.sku && <span dir="ltr">{it.sku}</span>}
                          {it.sku && it.origin_country && ' · '}
                          {it.origin_country}
                        </div>
                      )}
                    </td>
                    {/* من غير dir="ltr" على الخلية — ده كان بيحاذي الكمية لليسار تحت
                        عنوان محاذي لليمين فتبان «مترحلة». الأرقام بتتقرا صح في RTL. */}
                    <td className="py-2 text-start tabular-nums whitespace-nowrap">
                      {qty(it.qty)} {it.unit_ar ?? ''}
                    </td>
                    <td className="py-2 text-start whitespace-nowrap"><Money value={it.unit_price} /></td>
                    <td className="py-2 text-start whitespace-nowrap">
                      {Number(it.discount_amount ?? 0) > 0 ? <Money value={it.discount_amount} /> : '—'}
                    </td>
                    <td className="py-2 text-start whitespace-nowrap"><Money value={it.line_total} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <dl className="mt-4 space-y-1.5 border-t border-line pt-3 text-sm">
            <div className="flex justify-between"><dt className="text-subtext">المجموع الفرعي</dt><dd><Money value={o.subtotal} /></dd></div>
            <div className="flex justify-between"><dt className="text-subtext">الخصم</dt><dd><Money value={o.discount_total} /></dd></div>
            <div className="flex justify-between"><dt className="text-subtext">التوصيل</dt><dd><Money value={o.delivery_fee} /></dd></div>
            <div className="flex justify-between"><dt className="text-subtext">مدفوع من المحفظة</dt><dd><Money value={o.wallet_applied} /></dd></div>
            <div className="flex justify-between text-base font-bold"><dt>الإجمالي</dt><dd><Money value={o.grand_total} /></dd></div>
            <div className="flex justify-between text-xs"><dt className="text-subtext">عمولة المنصة</dt><dd><Money value={o.commission_amount} /></dd></div>
          </dl>
        </Card>

        <div className="space-y-4">
          <Card className="p-4">
            <h2 className="mb-3 font-bold">الأطراف</h2>
            <dl className="space-y-2.5 text-sm">
              <div>
                <dt className="text-subtext">المشتري</dt>
                {/* لينك زي المورّد بالظبط — الضغط بيفتح ملف المشتري كامل */}
                <dd>
                  <Link to={`/users/${o.buyer_id}`} className="font-medium text-accent hover:underline">
                    {o.buyer?.full_name ?? '—'}
                  </Link>
                </dd>
                {o.buyer?.phone && (
                  <dd className="text-xs text-subtext" dir="ltr">{localPhone(o.buyer.phone)}</dd>
                )}
                {o.buyer?.email && <dd className="text-xs text-subtext" dir="ltr">{o.buyer.email}</dd>}
              </div>
              <div>
                <dt className="text-subtext">المورّد</dt>
                <dd>
                  {o.seller ? (
                    <Link to={`/companies/${o.seller.id}`} className="font-medium text-accent hover:underline">
                      {o.seller.name_ar}
                    </Link>
                  ) : '—'}
                </dd>
                {o.seller?.commercial_register && (
                  <dd className="text-xs text-subtext">السجل التجاري: <span dir="ltr">{o.seller.commercial_register}</span></dd>
                )}
                {o.seller?.tax_number && (
                  <dd className="text-xs text-subtext">الرقم الضريبي: <span dir="ltr">{o.seller.tax_number}</span></dd>
                )}
              </div>
              <div>
                <dt className="mb-0.5 text-subtext">موقع التسليم</dt>
                <dd><LocationCell loc={locFromOrder(o.site, addr)} /></dd>
              </div>
              {o.notes && (
                <div>
                  <dt className="text-subtext">ملاحظات المشتري</dt>
                  <dd className="whitespace-pre-line">{o.notes}</dd>
                </div>
              )}
              {o.cancel_reason && (
                <div>
                  <dt className="text-subtext">سبب الإلغاء</dt>
                  <dd className="whitespace-pre-line text-danger">{o.cancel_reason}</dd>
                </div>
              )}
            </dl>
          </Card>

          <Card className="p-4">
            <h2 className="mb-3 font-bold">الفواتير</h2>
            {data.invoices.length === 0 ? (
              <p className="text-sm text-subtext">لم تصدر فاتورة بعد</p>
            ) : (
              <div className="space-y-2.5 text-sm">
                {data.invoices.map((inv) => (
                  <div key={inv.id} className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <div className="flex items-center gap-1.5">
                        <span dir="ltr" className="font-medium">{inv.invoice_number}</span>
                        {inv.type === 'credit_note' && <StatusChip label="إشعار دائن" tone="orange" />}
                      </div>
                      <span className="text-xs text-subtext">{fmtDate(inv.issued_at)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Money value={inv.total} />
                      <button
                        type="button"
                        onClick={() => { void printInvoice(inv.id).catch((e) => alert((e as Error).message)); }}
                        className="rounded-lg border border-line px-2 py-1 text-xs text-subtext hover:border-accent hover:text-accent"
                        title="طباعة أو حفظ PDF"
                      >
                        <Printer size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-4">
            <h2 className="mb-3 font-bold">تاريخ الحالات</h2>
            {data.history.length === 0 ? (
              <p className="text-sm text-subtext">لا يوجد سجل</p>
            ) : (
              <ol className="space-y-2">
                {data.history.map((h) => {
                  const l = labelOf(orderStatusLabels, h.to_status);
                  return (
                    <li key={h.id} className="text-sm">
                      <div className="flex items-center gap-2">
                        <span className="size-2 shrink-0 rounded-full bg-accent" />
                        <StatusChip label={l.label} tone={l.tone} />
                        <span className="text-xs text-subtext">{fmtDateTime(h.created_at)}</span>
                      </div>
                      {h.note && <p className="ms-4 mt-0.5 text-xs text-subtext">{h.note}</p>}
                    </li>
                  );
                })}
              </ol>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
