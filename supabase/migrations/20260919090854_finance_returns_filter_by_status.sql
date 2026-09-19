-- تاب «٤. المرتجعات» في المال ماكانش فيه فلتر حالة، فصفحة المرتجعات وتاب
-- المال بيوروا نفس الصفوف بس واحد بيتفلتر والتاني لأ.
--
-- الفلتر على **مجموعة** الحالة مش الحالة الخام — نفس `app.return_status_group`
-- اللي بتستعمله `app.returns_rows`، عشان «مقبول» ترجّع الخمس حالات بتوعها في
-- الشاشتين بنفس المعنى.
--
-- ملحوظة: `summary` بتتحسب من نفس الـCTE، فالكروت فوق الجدول بتتبع الفلتر —
-- وده المطلوب، غير كده الأدمن يفلتر ويلاقي الكارت بيقول رقم تاني.

create or replace function public.admin_finance_returns(
  p_from date default null,
  p_to date default null,
  p_search text default null,
  p_limit integer default 25,
  p_offset integer default 0,
  p_status text default 'all'
)
returns jsonb
language plpgsql
stable security definer
set search_path to 'public', 'pg_temp'
as $fn$
declare v_rows jsonb; v_total bigint; v_sum jsonb; v_q text;
begin
  if not app.is_admin() then
    raise exception 'غير مصرح: هذه العملية للأدمن فقط' using errcode = '42501';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 200 then
    raise exception 'حجم الصفحة يجب أن يكون بين 1 و 200' using errcode = '22023';
  end if;
  -- نفس تحقّق `admin_returns_list`: المجموعات بس، والحالة الخام ترجع خطأ
  -- واضح بدل قايمة ناقصة بصمت.
  if p_status <> 'all' and p_status not in ('submitted', 'accepted', 'rejected', 'cancelled') then
    raise exception 'حالة مرتجع غير معروفة: %', p_status using errcode = '22023';
  end if;
  v_q := nullif(trim(coalesce(p_search, '')), '');

  with rows as (
    select r.id,
           r.return_number,
           o.id                              as order_id,
           o.order_number,
           b.full_name                       as buyer_name,
           s.name_ar                         as seller_name,
           r.status::text                    as status,
           r.refund_amount::text             as refund_amount,
           coalesce(fr.amount, 0)::text      as fees_refunded,
           r.refunded_at,
           coalesce(r.refunded_at, r.received_at, r.requested_at) as executed_at,
           (select coalesce(sum(ri.qty_accepted), 0) from public.return_items ri
             where ri.return_id = r.id)::text as n_items
      from public.return_requests r
      join public.orders o    on o.id = r.order_id
      join public.profiles b  on b.id = r.buyer_id
      join public.companies s on s.id = r.seller_company_id
      left join app.return_fee_refunds fr on fr.return_id = r.id
     where (p_from is null or r.requested_at >= app.kw_start(p_from))
       and (p_to   is null or r.requested_at <  app.kw_start(p_to + 1))
       and (p_status = 'all' or app.return_status_group(r.status::text) = p_status)
       and (v_q is null
            or r.return_number ilike '%' || v_q || '%'
            or o.order_number  ilike '%' || v_q || '%'
            or b.full_name     ilike '%' || v_q || '%'
            or s.name_ar       ilike '%' || v_q || '%')
  )
  select coalesce(jsonb_agg(to_jsonb(t) order by t.executed_at desc), '[]'::jsonb),
         (select count(*) from rows),
         (select jsonb_build_object(
                   'n_returns', count(*),
                   'refund',    coalesce(sum(refund_amount::numeric), 0)::text,
                   'fees',      coalesce(sum(fees_refunded::numeric), 0)::text)
            from rows)
    into v_rows, v_total, v_sum
    from (select * from rows order by executed_at desc
           limit p_limit offset greatest(coalesce(p_offset, 0), 0)) t;

  return jsonb_build_object('rows', v_rows, 'total', v_total, 'summary', v_sum);
end $fn$;

notify pgrst, 'reload schema';
