-- جدول المرتجعات بيوري المبلغ اللي رجع للمشتري، ومفيش فيه المبلغ اللي رجع
-- للبائع. الاتنين حركتين مختلفتين على نفس السند، وكارت «الرسوم المعادة
-- للبائعين» فوق الجدول بيجمع رقم مالوش أي تفصيل في الصفوف.
--
-- `fee_refund` من `app.return_fee_refunds` — نفس مصدر الكارت بالظبط، فمجموع
-- العمود = الكارت. و`fee_posted` بيقول القيمة دي اتقيّدت فعلًا ولا لسه تقدير
-- على سند ما خلصش، عشان الواجهة تفرّق بينهم بدل ما تخلطهم.
--
-- الدالة بتتعمل drop وrecreate مش replace: إضافة عمود للإخراج بتغيّر التوقيع.
-- `admin_returns_list` بتعمل `select *` + `to_jsonb`، و`admin_returns_stats`
-- بتنده الأعمدة بأسمائها — فالاتنين بياخدوا العمود الجديد من غير تعديل.

drop function if exists app.returns_rows(date, date, text, text);

create function app.returns_rows(p_from date, p_to date, p_search text, p_status text)
returns table (
  id uuid, return_number text, status text, order_id uuid, order_number text,
  buyer_name text, seller_name text, location jsonb, reason_text text,
  refund_amount text, requested_at timestamptz, n_items bigint, site_key uuid,
  buyer_id uuid, seller_company_id uuid, refunded_at timestamptz,
  fee_refund text, fee_posted boolean
)
language plpgsql
stable
set search_path to 'public', 'pg_temp'
as $fn$
#variable_conflict use_column
-- زي دالة الفواتير: أسماء أعمدة الإخراج بتتشابه مع أعمدة الـCTE، والسطر ده
-- لازم يفضل أول سطر في جسم الدالة. (ممنوع كتابة علامة الدولار المزدوجة في
-- التعليق ده لأنها بتقفل جسم الدالة.)
declare v_q text := nullif(trim(coalesce(p_search, '')), '');
begin
  return query
  with base as (
    select r.id,
           r.return_number::text,
           r.status::text as status,
           r.order_id,
           o.order_number::text as order_number,
           b.full_name::text as buyer_name,
           c.name_ar::text   as seller_name,
           app.order_location(o.site_id, o.address_snapshot) as location,
           r.reason_text::text,
           coalesce(r.refund_amount, 0)::text as refund_amount,
           r.requested_at,
           (select count(*) from public.return_items ri where ri.return_id = r.id) as n_items,
           coalesce(o.site_id, o.address_id) as site_key,
           r.buyer_id,
           r.seller_company_id,
           r.refunded_at,
           coalesce(f.amount, 0)::text as fee_refund,
           coalesce(f.is_posted, false) as fee_posted
      from public.return_requests r
      left join public.orders    o on o.id = r.order_id
      left join public.profiles  b on b.id = r.buyer_id
      left join public.companies c on c.id = r.seller_company_id
      left join app.return_fee_refunds f on f.return_id = r.id
     where (p_from is null or r.requested_at >= app.kw_start(p_from))
       and (p_to   is null or r.requested_at <  app.kw_start(p_to + 1))
       -- الفلتر بقى على المجموعة مش على الحالة الخام: «مقبول» بترجّع الخمسة
       -- بتوعها، مش `approved` لوحدها.
       and (p_status = 'all' or app.return_status_group(r.status::text) = p_status)
  )
  select * from base
   where v_q is null
      or base.return_number ilike '%' || v_q || '%'
      or base.order_number  ilike '%' || v_q || '%'
      or base.buyer_name    ilike '%' || v_q || '%'
      or base.seller_name   ilike '%' || v_q || '%';
end $fn$;

notify pgrst, 'reload schema';
