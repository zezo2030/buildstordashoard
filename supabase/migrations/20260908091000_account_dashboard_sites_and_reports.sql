-- لوحة إحصائيات الحساب في الأدمن: «الموقع» بقى يشمل عنوان التوصيل، وزودنا
-- التقارير اللي موجودة في التطبيق وكانت ناقصة في اللوحة.
--
-- الموقع كان `orders.site_id` بس، والطلب اللي بيتسلّم على عنوان شخصي
-- (`address_snapshot`) كان بيقع بره الحساب خالص — فكارت «أكثر المواقع شراءً»
-- وعدّاد المواقع كانوا فاضيين لأغلب الحسابات. العنوان بقى موقع بمفتاح خاص بيه.

create or replace function app.order_site(
  p_site_id uuid, p_address_id uuid, p_addr jsonb
)
returns jsonb
language sql
stable
set search_path to 'public', 'pg_temp'
as $fn$
  select case
    when p_site_id is not null then (
      select jsonb_build_object(
               'key',  'site:' || s.id::text,
               'name', s.name,
               'note', coalesce(nullif(c.name_ar, ''), nullif(concat_ws(' · ',
                         nullif(s.governorate, ''), nullif(s.area, '')), ''), ''))
        from public.sites s
        left join public.companies c on c.id = s.company_id
       where s.id = p_site_id)
    when p_addr is not null and jsonb_typeof(p_addr) = 'object' then
      jsonb_build_object(
        -- العنوان الممسوح لسه ليه لقطة في الطلب، فالمفتاح بيرجع للقطة لما
        -- مايبقاش فيه address_id — كده الطلبات القديمة ما تتلمّش في صف واحد.
        'key',  'addr:' || coalesce(p_address_id::text, md5(p_addr::text)),
        'name', coalesce(nullif(p_addr ->> 'label', ''), 'عنوان التوصيل'),
        'note', coalesce(nullif(concat_ws(' · ',
                  nullif(p_addr ->> 'governorate', ''),
                  nullif(p_addr ->> 'area', ''),
                  case when nullif(p_addr ->> 'block', '') is not null
                       then 'قطعة ' || (p_addr ->> 'block') end,
                  nullif(p_addr ->> 'street', '')), ''), ''))
    else null
  end;
$fn$;

comment on function app.order_site(uuid, uuid, jsonb) is
  'موقع تسليم الطلب كمفتاح واسم وسطر عنوان — الموقع المسجّل أو عنوان التوصيل';

-- ------------------------------------------------------------- لوحة المشتري
create or replace function app.buyer_dashboard_json(
  p_buyer_id uuid, p_company_ids uuid[], p_from date, p_to date
)
returns jsonb
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $fn$
  with ord as (
    select o.id, o.seller_company_id, o.grand_total,
           l.loc ->> 'key'  as site_key,
           l.loc ->> 'name' as site_name,
           l.loc ->> 'note' as site_note
      from public.orders o
      cross join lateral (
        select app.order_site(o.site_id, o.address_id, o.address_snapshot) as loc
      ) l
     where o.status in ('confirmed', 'preparing', 'out_for_delivery', 'delivered')
       and (
         (p_buyer_id is not null and o.buyer_id = p_buyer_id)
         or (p_company_ids is not null and o.buyer_company_id = any (p_company_ids))
       )
       and (p_from is null or o.placed_at >= p_from::timestamptz)
       and (p_to   is null or o.placed_at <  (p_to + 1)::timestamptz)
  ),
  ret as (
    select r.id, r.return_number, r.status::text as status, r.refund_amount,
           r.requested_at, o.order_number, c.name_ar as party
      from public.return_requests r
      left join public.orders o    on o.id = r.order_id
      left join public.companies c on c.id = r.seller_company_id
     where (
         (p_buyer_id is not null and r.buyer_id = p_buyer_id)
         or (p_company_ids is not null and r.buyer_company_id = any (p_company_ids))
       )
       and (p_from is null or r.requested_at >= p_from::timestamptz)
       and (p_to   is null or r.requested_at <  (p_to + 1)::timestamptz)
  ),
  by_supplier as (
    select ord.seller_company_id as gid,
           p.id as pid, p.name_ar as pname, nullif(p.images[1], '') as pimage,
           sum(oi.qty) as pqty, coalesce(u.name_ar, '') as punit,
           round(sum(oi.line_total)::numeric, 3) as ptotal
      from public.order_items oi
      join ord on ord.id = oi.order_id
      join public.products p on p.id = oi.product_id
      left join public.units u on u.id = p.unit_id
     where oi.is_available
     group by ord.seller_company_id, p.id, p.name_ar, p.images, u.name_ar
  ),
  by_site as (
    select ord.site_key as gid, min(ord.site_name) as gname, min(ord.site_note) as gnote,
           p.id as pid, p.name_ar as pname, nullif(p.images[1], '') as pimage,
           sum(oi.qty) as pqty, coalesce(u.name_ar, '') as punit,
           round(sum(oi.line_total)::numeric, 3) as ptotal
      from public.order_items oi
      join ord on ord.id = oi.order_id
      join public.products p on p.id = oi.product_id
      left join public.units u on u.id = p.unit_id
     where oi.is_available and ord.site_key is not null
     group by ord.site_key, p.id, p.name_ar, p.images, u.name_ar
  )
  select jsonb_build_object(
    'total_purchases', round(coalesce((select sum(ord.grand_total) from ord), 0)::numeric, 3)::text,
    'orders_count',    (select count(*) from ord),
    'items_count',     (
      select count(*)
        from public.order_items oi
        join ord on ord.id = oi.order_id
       where oi.is_available
    ),
    'suppliers_count', (select count(distinct ord.seller_company_id) from ord),
    'sites_count',     (select count(distinct ord.site_key) from ord where ord.site_key is not null),
    'specialties', coalesce((
      select jsonb_agg(t.obj)
        from (
          select jsonb_build_object(
                   'id', sp.id,
                   'name', sp.name_ar,
                   'total', round(sum(oi.line_total)::numeric, 3)::text
                 ) as obj
            from public.order_items oi
            join ord on ord.id = oi.order_id
            join public.products p on p.id = oi.product_id
            join public.specialties sp on sp.id = p.specialty_id
           where oi.is_available
           group by sp.id, sp.name_ar
           order by sum(oi.line_total) desc
        ) t
    ), '[]'::jsonb),
    -- «عدد المواد في كل تخصص»: عدد المنتجات المختلفة والكميات، مش المبلغ بس
    'specialty_items', coalesce((
      select jsonb_agg(t.obj)
        from (
          select jsonb_build_object(
                   'id', sp.id,
                   'name', sp.name_ar,
                   'note', '',
                   'count', count(distinct oi.product_id),
                   'qty', sum(oi.qty)::text,
                   'total', round(sum(oi.line_total)::numeric, 3)::text
                 ) as obj
            from public.order_items oi
            join ord on ord.id = oi.order_id
            join public.products p on p.id = oi.product_id
            join public.specialties sp on sp.id = p.specialty_id
           where oi.is_available
           group by sp.id, sp.name_ar
           order by count(distinct oi.product_id) desc
        ) t
    ), '[]'::jsonb),
    'products', coalesce((
      select jsonb_agg(t.obj)
        from (
          select jsonb_build_object(
                   'id', p.id,
                   'name', p.name_ar,
                   'image_url', nullif(p.images[1], ''),
                   'qty', sum(oi.qty)::text,
                   'unit', coalesce(u.name_ar, ''),
                   'total', round(sum(oi.line_total)::numeric, 3)::text
                 ) as obj
            from public.order_items oi
            join ord on ord.id = oi.order_id
            join public.products p on p.id = oi.product_id
            left join public.units u on u.id = p.unit_id
           where oi.is_available
           group by p.id, p.name_ar, p.images, u.name_ar
           order by sum(oi.line_total) desc
           limit 50
        ) t
    ), '[]'::jsonb),
    'suppliers', coalesce((
      select jsonb_agg(t.obj)
        from (
          select jsonb_build_object(
                   'id', c.id,
                   'name', c.name_ar,
                   'image_url', c.logo_url,
                   'total', round(sum(ord.grand_total)::numeric, 3)::text
                 ) as obj
            from ord
            join public.companies c on c.id = ord.seller_company_id
           group by c.id, c.name_ar, c.logo_url
           order by sum(ord.grand_total) desc
           limit 50
        ) t
    ), '[]'::jsonb),
    'sites', coalesce((
      select jsonb_agg(t.obj)
        from (
          select jsonb_build_object(
                   'id', ord.site_key,
                   'name', min(ord.site_name),
                   'note', min(ord.site_note),
                   'total', round(sum(ord.grand_total)::numeric, 3)::text
                 ) as obj
            from ord
           where ord.site_key is not null
           group by ord.site_key
           order by sum(ord.grand_total) desc
           limit 50
        ) t
    ), '[]'::jsonb),
    -- «عدد الطلبات لكل موقع» — العدّ على الطلب والكمية على البنود، فالتجميعتين
    -- منفصلتين عشان ضرب الصفوف مايكبّرش الإجمالي.
    'site_orders', coalesce((
      select jsonb_agg(
               jsonb_build_object(
                 'id', po.site_key, 'name', po.site_name, 'note', po.site_note,
                 'count', po.orders, 'qty', coalesce(pit.units, 0)::text,
                 'total', round(po.total, 3)::text)
               order by po.orders desc, po.total desc)
        from (
          select ord.site_key, min(ord.site_name) as site_name, min(ord.site_note) as site_note,
                 count(*) as orders, sum(ord.grand_total)::numeric as total
            from ord where ord.site_key is not null group by ord.site_key
        ) po
        left join (
          select ord.site_key, sum(oi.qty) as units
            from public.order_items oi
            join ord on ord.id = oi.order_id
           where oi.is_available and ord.site_key is not null
           group by ord.site_key
        ) pit on pit.site_key = po.site_key
    ), '[]'::jsonb),
    -- المنتجات مجمّعة تحت كل مورّد / كل موقع — نفس تقريري التطبيق
    'products_by_supplier', coalesce((
      select jsonb_agg(g.obj order by g.total desc)
        from (
          select sum(b.ptotal) as total,
                 jsonb_build_object(
                   'id', c.id::text,
                   'name', c.name_ar,
                   'note', '',
                   'image_url', c.logo_url,
                   'total', round(sum(b.ptotal), 3)::text,
                   'rows', jsonb_agg(jsonb_build_object(
                             'id', b.pid, 'name', b.pname, 'image_url', b.pimage,
                             'qty', b.pqty::text, 'unit', b.punit,
                             'total', b.ptotal::text) order by b.ptotal desc)
                 ) as obj
            from by_supplier b
            join public.companies c on c.id = b.gid
           group by c.id, c.name_ar, c.logo_url
        ) g
    ), '[]'::jsonb),
    'products_by_site', coalesce((
      select jsonb_agg(g.obj order by g.total desc)
        from (
          select sum(b.ptotal) as total,
                 jsonb_build_object(
                   'id', b.gid,
                   'name', min(b.gname),
                   'note', min(b.gnote),
                   'image_url', null,
                   'total', round(sum(b.ptotal), 3)::text,
                   'rows', jsonb_agg(jsonb_build_object(
                             'id', b.pid, 'name', b.pname, 'image_url', b.pimage,
                             'qty', b.pqty::text, 'unit', b.punit,
                             'total', b.ptotal::text) order by b.ptotal desc)
                 ) as obj
            from by_site b
           group by b.gid
        ) g
    ), '[]'::jsonb),
    'returns', coalesce((
      select jsonb_agg(
               jsonb_build_object(
                 'id', r.id,
                 'number', r.return_number,
                 'order_number', coalesce(r.order_number, ''),
                 'party', coalesce(r.party, ''),
                 'status', r.status,
                 'count', (select count(*) from public.return_items ri where ri.return_id = r.id),
                 'total', round(r.refund_amount::numeric, 3)::text,
                 'at', r.requested_at)
               order by r.requested_at desc)
        from ret r
    ), '[]'::jsonb)
  );
$fn$;

-- -------------------------------------------------------------- لوحة البائع
create or replace function public.admin_seller_dashboard(
  p_company_id uuid, p_from date default null, p_to date default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $fn$
declare
  v jsonb;
begin
  if not app.is_admin() then
    raise exception 'غير مصرح: هذه العملية للأدمن فقط' using errcode = '42501';
  end if;
  if p_company_id is null then
    raise exception 'معرف الشركة مطلوب' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.companies c where c.id = p_company_id and c.type = 'seller'
  ) then
    raise exception 'الشركة غير موجودة أو ليست بائعًا' using errcode = 'P0002';
  end if;

  with ord as (
    select o.id,
           coalesce(o.buyer_company_id::text, o.buyer_id::text) as buyer_key,
           coalesce(bc.name_ar, bp.full_name, '—') as buyer_label,
           l.loc ->> 'key'  as site_key,
           l.loc ->> 'name' as site_name,
           l.loc ->> 'note' as site_note,
           o.grand_total
      from public.orders o
      left join public.companies bc on bc.id = o.buyer_company_id
      left join public.profiles bp on bp.id = o.buyer_id
      cross join lateral (
        select app.order_site(o.site_id, o.address_id, o.address_snapshot) as loc
      ) l
     where o.seller_company_id = p_company_id
       and o.status in ('confirmed', 'preparing', 'out_for_delivery', 'delivered')
       and (p_from is null or o.placed_at >= p_from::timestamptz)
       and (p_to   is null or o.placed_at <  (p_to + 1)::timestamptz)
  ),
  ret as (
    select r.id, r.return_number, r.status::text as status, r.refund_amount,
           r.requested_at, o.order_number,
           coalesce(bc.name_ar, bp.full_name, '—') as party
      from public.return_requests r
      left join public.orders o     on o.id = r.order_id
      left join public.companies bc on bc.id = r.buyer_company_id
      left join public.profiles bp  on bp.id = r.buyer_id
     where r.seller_company_id = p_company_id
       and (p_from is null or r.requested_at >= p_from::timestamptz)
       and (p_to   is null or r.requested_at <  (p_to + 1)::timestamptz)
  ),
  by_customer as (
    select ord.buyer_key as gid, min(ord.buyer_label) as gname,
           p.id as pid, p.name_ar as pname, nullif(p.images[1], '') as pimage,
           sum(oi.qty) as pqty, coalesce(u.name_ar, '') as punit,
           round(sum(oi.line_total)::numeric, 3) as ptotal
      from public.order_items oi
      join ord on ord.id = oi.order_id
      join public.products p on p.id = oi.product_id
      left join public.units u on u.id = p.unit_id
     where oi.is_available
     group by ord.buyer_key, p.id, p.name_ar, p.images, u.name_ar
  ),
  by_site as (
    select ord.site_key as gid, min(ord.site_name) as gname, min(ord.site_note) as gnote,
           p.id as pid, p.name_ar as pname, nullif(p.images[1], '') as pimage,
           sum(oi.qty) as pqty, coalesce(u.name_ar, '') as punit,
           round(sum(oi.line_total)::numeric, 3) as ptotal
      from public.order_items oi
      join ord on ord.id = oi.order_id
      join public.products p on p.id = oi.product_id
      left join public.units u on u.id = p.unit_id
     where oi.is_available and ord.site_key is not null
     group by ord.site_key, p.id, p.name_ar, p.images, u.name_ar
  )
  select jsonb_build_object(
    'total_sales',     round(coalesce((select sum(ord.grand_total) from ord), 0)::numeric, 3)::text,
    'orders_count',    (select count(*) from ord),
    'products_sold',   (
      select count(distinct oi.product_id)
        from public.order_items oi
        join ord on ord.id = oi.order_id
       where oi.is_available
    ),
    'customers_count', (select count(distinct ord.buyer_key) from ord),
    'listed_items',    (
      select count(*) from public.seller_products sp
       where sp.seller_company_id = p_company_id and sp.is_active
    ),
    'specialties', coalesce((
      select jsonb_agg(t.obj)
        from (
          select jsonb_build_object(
                   'id', sp.id,
                   'name', sp.name_ar,
                   'total', round(sum(oi.line_total)::numeric, 3)::text
                 ) as obj
            from public.order_items oi
            join ord on ord.id = oi.order_id
            join public.products p on p.id = oi.product_id
            join public.specialties sp on sp.id = p.specialty_id
           where oi.is_available
           group by sp.id, sp.name_ar
           order by sum(oi.line_total) desc
        ) t
    ), '[]'::jsonb),
    'specialty_items', coalesce((
      select jsonb_agg(t.obj)
        from (
          select jsonb_build_object(
                   'id', sp.id,
                   'name', sp.name_ar,
                   'note', '',
                   'count', count(distinct oi.product_id),
                   'qty', sum(oi.qty)::text,
                   'total', round(sum(oi.line_total)::numeric, 3)::text
                 ) as obj
            from public.order_items oi
            join ord on ord.id = oi.order_id
            join public.products p on p.id = oi.product_id
            join public.specialties sp on sp.id = p.specialty_id
           where oi.is_available
           group by sp.id, sp.name_ar
           order by count(distinct oi.product_id) desc
        ) t
    ), '[]'::jsonb),
    'customers', coalesce((
      select jsonb_agg(t.obj)
        from (
          select jsonb_build_object(
                   'key', ord.buyer_key,
                   'label', ord.buyer_label,
                   'total', round(sum(ord.grand_total)::numeric, 3)::text
                 ) as obj
            from ord
           group by ord.buyer_key, ord.buyer_label
           order by sum(ord.grand_total) desc
        ) t
    ), '[]'::jsonb),
    -- «عدد الطلبات لكل عميل» — نفس تقرير أكثر العملاء في التطبيق
    'customer_orders', coalesce((
      select jsonb_agg(
               jsonb_build_object(
                 'id', po.buyer_key, 'name', po.buyer_label, 'note', '',
                 'count', po.orders, 'qty', coalesce(pit.units, 0)::text,
                 'total', round(po.total, 3)::text)
               order by po.orders desc, po.total desc)
        from (
          select ord.buyer_key, min(ord.buyer_label) as buyer_label,
                 count(*) as orders, sum(ord.grand_total)::numeric as total
            from ord group by ord.buyer_key
        ) po
        left join (
          select ord.buyer_key, sum(oi.qty) as units
            from public.order_items oi
            join ord on ord.id = oi.order_id
           where oi.is_available
           group by ord.buyer_key
        ) pit on pit.buyer_key = po.buyer_key
    ), '[]'::jsonb),
    'products', coalesce((
      select jsonb_agg(t.obj)
        from (
          select jsonb_build_object(
                   'id', p.id,
                   'name', p.name_ar,
                   'image_url', nullif(p.images[1], ''),
                   'qty', sum(oi.qty)::text,
                   'unit', coalesce(u.name_ar, ''),
                   'total', round(sum(oi.line_total)::numeric, 3)::text
                 ) as obj
            from public.order_items oi
            join ord on ord.id = oi.order_id
            join public.products p on p.id = oi.product_id
            left join public.units u on u.id = p.unit_id
           where oi.is_available
           group by p.id, p.name_ar, p.images, u.name_ar
           order by sum(oi.line_total) desc
           limit 50
        ) t
    ), '[]'::jsonb),
    'sites', coalesce((
      select jsonb_agg(t.obj)
        from (
          select jsonb_build_object(
                   'id', ord.site_key,
                   'name', min(ord.site_name),
                   'note', min(ord.site_note),
                   'total', round(sum(ord.grand_total)::numeric, 3)::text
                 ) as obj
            from ord
           where ord.site_key is not null
           group by ord.site_key
           order by sum(ord.grand_total) desc
           limit 50
        ) t
    ), '[]'::jsonb),
    'site_orders', coalesce((
      select jsonb_agg(
               jsonb_build_object(
                 'id', po.site_key, 'name', po.site_name, 'note', po.site_note,
                 'count', po.orders, 'qty', coalesce(pit.units, 0)::text,
                 'total', round(po.total, 3)::text)
               order by po.orders desc, po.total desc)
        from (
          select ord.site_key, min(ord.site_name) as site_name, min(ord.site_note) as site_note,
                 count(*) as orders, sum(ord.grand_total)::numeric as total
            from ord where ord.site_key is not null group by ord.site_key
        ) po
        left join (
          select ord.site_key, sum(oi.qty) as units
            from public.order_items oi
            join ord on ord.id = oi.order_id
           where oi.is_available and ord.site_key is not null
           group by ord.site_key
        ) pit on pit.site_key = po.site_key
    ), '[]'::jsonb),
    'products_by_customer', coalesce((
      select jsonb_agg(g.obj order by g.total desc)
        from (
          select sum(b.ptotal) as total,
                 jsonb_build_object(
                   'id', b.gid,
                   'name', min(b.gname),
                   'note', '',
                   'image_url', null,
                   'total', round(sum(b.ptotal), 3)::text,
                   'rows', jsonb_agg(jsonb_build_object(
                             'id', b.pid, 'name', b.pname, 'image_url', b.pimage,
                             'qty', b.pqty::text, 'unit', b.punit,
                             'total', b.ptotal::text) order by b.ptotal desc)
                 ) as obj
            from by_customer b
           group by b.gid
        ) g
    ), '[]'::jsonb),
    'products_by_site', coalesce((
      select jsonb_agg(g.obj order by g.total desc)
        from (
          select sum(b.ptotal) as total,
                 jsonb_build_object(
                   'id', b.gid,
                   'name', min(b.gname),
                   'note', min(b.gnote),
                   'image_url', null,
                   'total', round(sum(b.ptotal), 3)::text,
                   'rows', jsonb_agg(jsonb_build_object(
                             'id', b.pid, 'name', b.pname, 'image_url', b.pimage,
                             'qty', b.pqty::text, 'unit', b.punit,
                             'total', b.ptotal::text) order by b.ptotal desc)
                 ) as obj
            from by_site b
           group by b.gid
        ) g
    ), '[]'::jsonb),
    'returns', coalesce((
      select jsonb_agg(
               jsonb_build_object(
                 'id', r.id,
                 'number', r.return_number,
                 'order_number', coalesce(r.order_number, ''),
                 'party', coalesce(r.party, ''),
                 'status', r.status,
                 'count', (select count(*) from public.return_items ri where ri.return_id = r.id),
                 'total', round(r.refund_amount::numeric, 3)::text,
                 'at', r.requested_at)
               order by r.requested_at desc)
        from ret r
    ), '[]'::jsonb)
  ) into v;

  return v;
end;
$fn$;
