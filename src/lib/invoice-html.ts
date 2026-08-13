// طباعة الفاتورة من اللوحة — نفس تخطيط الـPDF اللي بيشوفه المشتري والبائع في
// التطبيق. بنبني HTML ونحقنه في iframe مخفي وننادي print()، فالمتصفح بيدي
// «طباعة» أو «حفظ PDF» من غير أي مكتبة زيادة.
import { supabase, arError } from './supabase';
import { money, qty } from './format';

type InvoiceItem = {
  line_no: number; sku: string | null; name_ar: string;
  unit_ar: string | null; qty: string; unit_price: string; line_total: string;
};

type Invoice = {
  invoice_number: string; type: string; issued_at: string; currency: string | null;
  subtotal: string; discount_total: string; delivery_fee: string; total: string;
  seller_snapshot: Record<string, unknown> | null;
  buyer_snapshot: Record<string, unknown> | null;
  orders: { order_number: string } | null;
  invoice_items: InvoiceItem[];
};

const esc = (v: unknown) =>
  String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const pick = (snap: Record<string, unknown> | null, keys: string[]) => {
  for (const k of keys) {
    const v = snap?.[k];
    if (typeof v === 'string' && v.trim()) return v;
  }
  return '';
};

export function invoiceHtml(inv: Invoice): string {
  const sellerName = pick(inv.seller_snapshot, ['name_ar', 'name_en', 'name']);
  const buyerName = pick(inv.buyer_snapshot, ['name', 'full_name']);
  const cr = pick(inv.seller_snapshot, ['commercial_register']);
  const tax = pick(inv.seller_snapshot, ['tax_number']);
  const buyerPhone = pick(inv.buyer_snapshot, ['phone']);
  const d = new Date(inv.issued_at);
  const issued = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  const title = inv.type === 'credit_note' ? 'إشعار دائن' : 'فاتورة';

  const rows = [...(inv.invoice_items ?? [])]
    .sort((a, b) => a.line_no - b.line_no)
    .map((it) => `
      <tr>
        <td>${it.line_no}</td>
        <td class="name">${esc(it.name_ar)}<div class="sku">${esc(it.sku ?? '')}</div></td>
        <td>${esc(qty(it.qty))} ${esc(it.unit_ar ?? '')}</td>
        <td class="num">${esc(money(it.unit_price))}</td>
        <td class="num">${esc(money(it.line_total))}</td>
      </tr>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8" />
<title>${esc(title)} ${esc(inv.invoice_number)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Tajawal, "Noto Naskh Arabic", "Segoe UI", Tahoma, sans-serif;
         color: #16283F; margin: 0; padding: 28px; direction: rtl; }
  .head { display: flex; justify-content: space-between; align-items: flex-start;
          border-bottom: 3px solid #F5851F; padding-bottom: 12px; }
  .brand { font-size: 22px; font-weight: 700; }
  .doc { text-align: left; }
  .doc .no { font-size: 16px; font-weight: 700; }
  .doc .date { font-size: 12px; color: #828A89; }
  .parties { display: flex; gap: 16px; margin: 20px 0; }
  .party { flex: 1; background: #F5F6F7; border-radius: 10px; padding: 12px; }
  .party h3 { margin: 0 0 6px; font-size: 12px; color: #828A89; font-weight: 600; }
  .party p { margin: 2px 0; font-size: 13px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th { background: #16283F; color: #fff; font-size: 12px; padding: 8px; text-align: right; }
  td { border-bottom: 1px solid #E5E7EB; padding: 8px; font-size: 13px; text-align: right; }
  td.num, th.num { font-variant-numeric: tabular-nums; }
  .name { font-weight: 600; }
  .sku { font-size: 11px; color: #828A89; font-weight: 400; }
  .totals { margin-top: 16px; margin-right: auto; width: 60%; }
  .totals div { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; }
  .totals .grand { border-top: 2px solid #16283F; margin-top: 6px; font-size: 16px;
                   font-weight: 700; color: #F5851F; }
  .foot { margin-top: 24px; font-size: 11px; color: #828A89; text-align: center; }
</style></head>
<body>
  <div class="head">
    <div><div class="brand">Build store</div>
         <div style="font-size:12px;color:#828A89">سوق مواد البناء</div></div>
    <div class="doc">
      <div class="no">${esc(title)} ${esc(inv.invoice_number)}</div>
      <div class="date">تاريخ الإصدار: ${esc(issued)}</div>
      ${inv.orders?.order_number ? `<div class="date">رقم الطلب: ${esc(inv.orders.order_number)}</div>` : ''}
    </div>
  </div>
  <div class="parties">
    <div class="party"><h3>المورّد</h3><p><strong>${esc(sellerName)}</strong></p>
      ${cr ? `<p>السجل التجاري: ${esc(cr)}</p>` : ''}
      ${tax ? `<p>الرقم الضريبي: ${esc(tax)}</p>` : ''}</div>
    <div class="party"><h3>العميل</h3><p><strong>${esc(buyerName)}</strong></p>
      ${buyerPhone ? `<p>${esc(buyerPhone)}</p>` : ''}</div>
  </div>
  <table><thead><tr>
    <th style="width:34px">#</th><th>الصنف</th><th style="width:90px">الكمية</th>
    <th class="num" style="width:100px">سعر الوحدة</th><th class="num" style="width:110px">الإجمالي</th>
  </tr></thead><tbody>${rows}</tbody></table>
  <div class="totals">
    <div><span>المجموع الفرعي</span><span>${esc(money(inv.subtotal))}</span></div>
    <div><span>الخصم</span><span>${esc(money(inv.discount_total))}</span></div>
    <div><span>رسوم التوصيل</span><span>${esc(money(inv.delivery_fee))}</span></div>
    <div class="grand"><span>الإجمالي النهائي</span><span>${esc(money(inv.total))}</span></div>
  </div>
  <div class="foot">مستند مقفول — أي تعديل يتم بإشعار دائن (credit note)</div>
</body></html>`;
}

export async function printInvoice(invoiceId: string): Promise<void> {
  const { data, error } = await supabase
    .from('invoices')
    .select(
      `invoice_number, type, issued_at, currency, subtotal, discount_total, delivery_fee, total,
       seller_snapshot, buyer_snapshot,
       orders (order_number),
       invoice_items (line_no, sku, name_ar, unit_ar, qty, unit_price, line_total)`,
    )
    .eq('id', invoiceId)
    .single();
  if (error) throw new Error(arError(error));

  const frame = document.createElement('iframe');
  frame.style.cssText = 'position:fixed;inset:0;width:0;height:0;border:0;visibility:hidden';
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  if (!doc) { frame.remove(); throw new Error('تعذر فتح نافذة الطباعة'); }
  doc.open();
  doc.write(invoiceHtml(data as unknown as Invoice));
  doc.close();
  // بننتظر onload عشان المتصفح يكون خلّص رسم الخط قبل الطباعة، وبنشيل الـiframe
  // بعد ثانية — لو شلناه فورًا بعد print() الطباعة بتتلغي في بعض المتصفحات.
  frame.onload = () => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    setTimeout(() => frame.remove(), 1000);
  };
}
