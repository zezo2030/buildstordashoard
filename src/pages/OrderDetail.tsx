// تفاصيل طلب: أصناف + مدفوعات + تاريخ الحالات + الفواتير — قراءة إشرافية.
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { supabase, arError } from '../lib/supabase';
import { PageHeader, Card, StatusChip, Money, Spinner, ErrorState } from '../components/ui';
import { fmtDateTime } from '../lib/format';
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
           seller:companies!orders_seller_company_id_fkey (id, name_ar)`,
        )
        .eq('id', id!)
        .single();
      if (order.error) throw new Error(arError(order.error));
      const [items, history, invoices] = await Promise.all([
        supabase.from('order_items').select('*').eq('order_id', id!),
        supabase.from('order_status_history').select('*').eq('order_id', id!).order('created_at'),
        supabase.from('invoices').select('id, invoice_number, type, total, issued_at').eq('order_id', id!),
      ]);
      return {
        order: order.data as typeof order.data & {
          buyer: { full_name: string; email: string | null; phone: string | null } | null;
          seller: { id: string; name_ar: string } | null;
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
  const addr = (o.address_snapshot ?? {}) as Record<string, string>;

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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-start text-subtext">
                  <th className="py-2 text-start font-medium">الصنف</th>
                  <th className="py-2 text-start font-medium">الكمية</th>
                  <th className="py-2 text-start font-medium">سعر الوحدة</th>
                  <th className="py-2 text-start font-medium">الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((it) => (
                  <tr key={it.id} className="border-b border-line last:border-0">
                    <td className="py-2">
                      <div className="font-medium">{it.name_ar}</div>
                      <div className="text-xs text-subtext" dir="ltr">{it.sku ?? ''}</div>
                    </td>
                    <td className="py-2" dir="ltr">{it.qty} {it.unit_ar ?? ''}</td>
                    <td className="py-2"><Money value={it.unit_price} /></td>
                    <td className="py-2"><Money value={it.line_total} /></td>
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
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-subtext">المشتري</dt>
                <dd className="font-medium">{o.buyer?.full_name ?? '—'}</dd>
                <dd className="text-xs text-subtext" dir="ltr">{o.buyer?.email ?? o.buyer?.phone ?? ''}</dd>
              </div>
              <div>
                <dt className="text-subtext">البائع</dt>
                <dd>
                  {o.seller ? (
                    <Link to={`/companies/${o.seller.id}`} className="font-medium text-accent hover:underline">
                      {o.seller.name_ar}
                    </Link>
                  ) : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-subtext">عنوان التوصيل</dt>
                <dd className="text-xs">
                  {[addr.governorate, addr.area, addr.block && `قطعة ${addr.block}`, addr.street].filter(Boolean).join(' · ') || '—'}
                </dd>
              </div>
            </dl>
          </Card>

          <Card className="p-4">
            <h2 className="mb-3 font-bold">الفواتير</h2>
            {data.invoices.length === 0 ? (
              <p className="text-sm text-subtext">لم تصدر فاتورة بعد</p>
            ) : (
              <div className="space-y-2 text-sm">
                {data.invoices.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between">
                    <span dir="ltr" className="font-medium">{inv.invoice_number}</span>
                    <Money value={inv.total} />
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
                    <li key={h.id} className="flex items-center gap-2 text-sm">
                      <span className="size-2 shrink-0 rounded-full bg-accent" />
                      <StatusChip label={l.label} tone={l.tone} />
                      <span className="text-xs text-subtext">{fmtDateTime(h.created_at)}</span>
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
