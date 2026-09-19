-- اشتراك المشتري (٢/٣): المنع.
--
-- «لو مافيش اشتراك ما يقدرش يعمل أي عمليات» — بس **من غير تعليق الحساب**.
-- التعليق بيخلي `app.account_user_id()` ترجّع null، وهي في صلاحيات المحفظة
-- وفي `payment-init`، يعني كنا هنقفل عليه طريق الدفع نفسه.
--
-- المنع اتحط في نقطة واحدة: `app.subscribed_account_user_id()`. كل دالة عمليات
-- للمشتري كانت بتنادي `app.account_user_id()` عشان تعرف هو مين — بقت تنادي
-- النسخة اللي بتتحقق من الاشتراك الأول. ده أأمن من إضافة سطر حراسة في ٢٤
-- دالة: لو الاستبدال مالقاش النداء، الميجريشن بتقف بدل ما تسيب ثغرة بصمت.
--
-- **اللي فضل مفتوح عن قصد** (مش سهو):
--   `cancel_order` · `create_return_request` · `respond_to_return_decision` ·
--   `set_return_attachments`  ← التزامات على طلبات قايمة، حبسها بيحبس العميل
--   `create_support_ticket`                    ← لازم يقدر يكلّمك
--   `request_withdrawal` + المحفظة والفواتير   ← دي فلوسه هو، مش ميزة من عندنا
--   `payment-init` وشحن المحفظة                ← طريق التجديد
--
-- تصفّح الكتالوج ما اتلمسش: منعه معناه رمي استثناء جوّه صلاحيات جدول المنتجات
-- فالشاشات تطلّع أخطاء بدل ما تودّيه لشاشة التجديد. البوابة في التطبيق هي
-- اللي بتخبّي الكتالوج، والداتابيز بتمنع أي عملية تغيّر بيانات أو تطلّع تقرير.

create or replace function app.subscribed_account_user_id()
returns uuid
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $fn$
declare v_id uuid := app.account_user_id();
begin
  if v_id is null then
    -- حساب مش نشط: نسيبها null زي الأصل عشان الدوال تطلّع رسالتها المعتادة.
    return null;
  end if;
  if not app.subscription_active(v_id) then
    -- `detail` علامة يقراها التطبيق فيودّيه لشاشة التجديد بدل رسالة خطأ عامة.
    raise exception 'اشتراكك منتهي — جدّد الاشتراك للمتابعة'
      using errcode = '42501', detail = 'subscription_required';
  end if;
  return v_id;
end $fn$;

do $mig$
declare
  v_sig  text;
  v_def  text;
  v_from constant text := 'app.account_user_id()';
  v_to   constant text := 'app.subscribed_account_user_id()';
  v_sigs text[] := array[
    -- الشراء
    'public.add_to_cart(uuid,public.qty,uuid,uuid)',
    'public.preview_checkout(uuid,uuid,text,boolean,uuid)',
    'public.place_order(uuid,public.payment_method,uuid,uuid,text,text,uuid)',
    'public.pay_order(uuid,public.money_kwd,boolean,public.payment_method)',
    -- المقارنة وعروض الأسعار
    'public.add_to_draft_quotation(uuid,public.qty,text)',
    'public.update_draft_quotation_item(uuid,public.qty,text)',
    'public.set_draft_quotation_item_supplier(uuid,uuid)',
    'public.remove_draft_quotation_item(uuid)',
    'public.clear_draft_quotation()',
    'public.preview_draft_quotation()',
    'public.issue_draft_quotation(date)',
    'public.add_draft_quotation_estimate_to_cart(text,uuid)',
    'public.buyer_respond_quote(uuid,uuid[])',
    -- التقارير
    'public.buyer_report_past_orders(date,date,text)',
    'public.buyer_report_products_by_site(date,date,text)',
    'public.buyer_report_products_by_supplier(date,date,text)',
    'public.buyer_report_top_products(date,date,text)',
    'public.buyer_report_top_sites(date,date,text)',
    'public.buyer_report_top_specialties(date,date,text)',
    'public.buyer_report_top_suppliers(date,date,text)',
    'public.buyer_billing_structure(date,date,text)',
    'public.buyer_invoice_items(date,date,text,text,text)',
    'public.buyer_invoice_files(date,date,text,text,text)',
    -- المفضلة
    'public.list_favorite_products()'
  ];
begin
  foreach v_sig in array v_sigs loop
    v_def := pg_get_functiondef(v_sig::regprocedure);
    if position(v_from in v_def) = 0 then
      raise exception 'الدالة % مابتنادّيش % — الحراسة مش هتتطبّق عليها', v_sig, v_from;
    end if;
    execute replace(v_def, v_from, v_to);
  end loop;
end $mig$;

-- `add_cheapest_offer_to_cart` مش في القايمة عن قصد: هي مابتنادّيش
-- `account_user_id` أصلاً، بتنادي `add_to_cart` — فالحراسة بتوصلها منها.

notify pgrst, 'reload schema';
