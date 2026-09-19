-- استرداد عمولة المرتجع: على **المبلغ اللي رجع فعلاً** مش على القيمة قبل الخصم.
--
-- بلاغ العميل بالأرقام: مرتجع بـ16.005 د.ك والعمولة 1% ⇒ البائع بيرجّع 99%
-- (15.845) والمنصة بترجّع الـ1% اللي أخدتها (0.160). لكن النظام كان بيحسب
-- النسبة على `total_accepted` = **16.500** (قيمة البضاعة قبل خصم الطلب)
-- فيطلّع 0.165.
--
-- الغلط إن النسبة نفسها مشتقّة من صافي الطلب (`subtotal - discount_total`)،
-- فلازم تتضرب في نصيب السطر **من نفس الصافي** — وده `refund_amount` بالظبط
-- (نفس البضاعة بعد نصيبها من الخصم). ضربها في القيمة قبل الخصم بيخلي المنصة
-- تدفع عمولة أكتر من اللي حصّلتها.
--
-- الأثر على البيانات الحالية صغير (3 سندات، فرق 0.00636 د.ك إجمالًا) — القيود
-- المتسجّلة سايبينها زي ما هي لأن `platform_fees` دفتر، والتصحيح بيسري على
-- اللي جاي. الفرق ظاهر في «الرسوم المعادة للبائعين».
--
-- البائع اللي على اشتراك ثابت مالوش استرداد أصلًا (مادفعش عمولة) — ده كان
-- موجود وصح، وما اتلمسش.

do $mig$
declare
  v_def  text;
  v_from constant text := 'v_refund := round(v_r.total_accepted * v_rate, 3);';
  v_to   constant text := 'v_refund := round(v_r.refund_amount * v_rate, 3);';
begin
  v_def := pg_get_functiondef('public.receive_return(uuid)'::regprocedure);
  if (length(v_def) - length(replace(v_def, v_from, ''))) / length(v_from) <> 1 then
    raise exception 'المرساة مش موجودة مرة واحدة في receive_return';
  end if;
  execute replace(v_def, v_from, v_to);
end $mig$;

-- نفس التصحيح في العرض اللي بيقدّر الاسترداد للسندات اللي لسه ما اتقيّدتش.
create or replace view app.return_fee_refunds as
 select r.id as return_id,
    r.seller_company_id,
    r.requested_at,
    coalesce(pf.amount,
        case
            when (exists ( select 1
               from public.billing_plans bp
              where bp.subject_type = 'seller'::public.billing_subject
                and bp.subject_id = r.seller_company_id
                and bp.is_active and bp.kind = 'subscription'::public.billing_kind)) then 0::numeric
            -- الأساس: المبلغ المردود للمشتري (بعد الخصم) — نفس الصافي اللي
            -- النسبة اتحسبت منه.
            else round(coalesce(r.refund_amount::numeric, 0::numeric)
                       * coalesce(o.commission_amount::numeric, 0::numeric)
                       / nullif(o.subtotal::numeric - o.discount_total::numeric, 0::numeric), 3)
        end, 0::numeric) as amount,
    pf.id is not null as is_posted
   from public.return_requests r
     left join public.orders o on o.id = r.order_id
     left join public.platform_fees pf on pf.return_id = r.id and pf.kind = 'commission_refund'::text;

notify pgrst, 'reload schema';
