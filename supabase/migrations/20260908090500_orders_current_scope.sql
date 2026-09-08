-- قسم «الطلبات» بقى للعمليات الجارية: الطلب الملغي أو اللي اتدفع مكانه
-- الفواتير. النطاق باراميتر جديد عشان الأدمن يفضل قادر يوصل للمؤرشف وقت
-- الحاجة، والافتراضي «الجاري».
--
-- إضافة وسيط بقيمة افتراضية بتعمل دالة جديدة جنب القديمة والاستدعاء بيبقى
-- ملتبس — عشان كده بندروب التوقيعين القدام في الآخر.

create or replace function app.orders_rows(
  p_from date, p_to date, p_search text, p_status text, p_method text, p_scope text
)
returns table(
  id uuid, order_number text, status text, payment_status text, payment_method text,
  buyer_name text, seller_name text, location jsonb, grand_total text,
  placed_at timestamp with time zone
)
language plpgsql
stable
set search_path to 'public', 'pg_temp'
as $$
declare
  v_q     text := nullif(trim(coalesce(p_search, '')), '');
  v_scope text := coalesce(p_scope, 'all');
begin
  return query
  select o.id,
         o.order_number::text,
         o.status::text,
         o.payment_status::text,
         o.payment_method::text,
         b.full_name::text,
         c.name_ar::text,
         app.order_location(o.site_id, o.address_snapshot),
         o.grand_total::text,
         o.placed_at
    from public.orders o
    left join public.profiles  b on b.id = o.buyer_id
    left join public.companies c on c.id = o.seller_company_id
   where (p_from is null or o.placed_at >= app.kw_start(p_from))
     and (p_to   is null or o.placed_at <  app.kw_start(p_to + 1))
     and (p_status = 'all' or o.status::text = p_status)
     and (p_method = 'all' or o.payment_method::text = p_method)
     -- الجاري = لسه شغال: مش ملغي ولا اتدفع. المؤرشف عكسه بالظبط.
     and (v_scope = 'all'
          or (v_scope = 'current'
              and o.status::text not in ('cancelled', 'refunded')
              and o.payment_status::text <> 'paid')
          or (v_scope = 'archived'
              and (o.status::text in ('cancelled', 'refunded')
                   or o.payment_status::text = 'paid')))
     and (v_q is null
          or o.order_number ilike '%' || v_q || '%'
          or b.full_name    ilike '%' || v_q || '%'
          or c.name_ar      ilike '%' || v_q || '%');
end $$;

create or replace function public.admin_orders_list(
  p_from date default null,
  p_to date default null,
  p_search text default null,
  p_status text default 'all',
  p_method text default 'all',
  p_sort text default 'placed_at',
  p_dir text default 'desc',
  p_limit integer default 25,
  p_offset integer default 0,
  p_scope text default 'current'
)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_dir       text;
  v_sort_expr text;
  v_rows      jsonb;
  v_total     bigint;
begin
  if not app.is_admin() then
    raise exception 'غير مصرح: هذه العملية للأدمن فقط' using errcode = '42501';
  end if;
  if p_status <> 'all' and not exists (
       select 1 from pg_enum e
        join pg_type t on t.oid = e.enumtypid
       where t.typname = 'order_status' and e.enumlabel = p_status) then
    raise exception 'حالة طلب غير معروفة: %', p_status using errcode = '22023';
  end if;
  if p_method <> 'all' and p_method not in
     ('knet','apple_pay','credit_card','wallet','credit_terms','cash_on_delivery') then
    raise exception 'طريقة دفع غير معروفة: %', p_method using errcode = '22023';
  end if;
  if coalesce(p_scope, 'current') not in ('current', 'archived', 'all') then
    raise exception 'نطاق طلبات غير معروف: %', p_scope using errcode = '22023';
  end if;
  if p_sort not in ('order_number','buyer_name','seller_name','status','grand_total','placed_at') then
    raise exception 'عمود فرز غير مسموح: %', p_sort using errcode = '22023';
  end if;
  if p_from is not null and p_to is not null and p_to < p_from then
    raise exception 'نطاق تاريخ غير صالح' using errcode = '22007';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 200 then
    raise exception 'حجم الصفحة يجب أن يكون بين 1 و 200' using errcode = '22023';
  end if;

  v_dir := case when lower(coalesce(p_dir, 'desc')) = 'asc' then 'asc' else 'desc' end;

  -- grand_total نص عالسلك للدقة، فالفرز عليه لازم يتكاست رقم — الفرز النصي
  -- بيحط 9.000 قبل 10.000 وده غلط.
  v_sort_expr := case when p_sort = 'grand_total' then '(grand_total)::numeric'
                      else quote_ident(p_sort) end;

  execute format(
    'select coalesce(jsonb_agg(to_jsonb(t) - ''rn'' order by t.rn), ''[]''::jsonb)
       from (select row_number() over () as rn, s.*
               from (select * from app.orders_rows($1, $2, $3, $4, $5, $8)
                      order by %s %s nulls last, placed_at desc, id
                      limit $6 offset $7) s) t',
    v_sort_expr, v_dir)
    into v_rows
   using p_from, p_to, p_search, p_status, p_method, p_limit,
         greatest(coalesce(p_offset, 0), 0), coalesce(p_scope, 'current');

  select count(*) into v_total
    from app.orders_rows(p_from, p_to, p_search, p_status, p_method, coalesce(p_scope, 'current'));

  return jsonb_build_object('rows', v_rows, 'total', v_total);
end $$;

drop function if exists public.admin_orders_list(date, date, text, text, text, text, text, integer, integer);
drop function if exists app.orders_rows(date, date, text, text, text);
