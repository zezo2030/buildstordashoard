-- الشركة الواحدة تقدر يكون عندها نفس المنتج بأكتر من منشأ (عرض لكل منشأ).
-- المنشأ بيحطّه الأدمن من الداشبورد؛ البائع لسه بياخد عرض واحد لكل منتج.

-- 1) مفتاح التفرّد: (شركة، منتج، منشأ) بدل (شركة، منتج).
--    NULLS NOT DISTINCT عشان ما ينفعش صفين بمنشأ فاضي لنفس المنتج.
alter table public.seller_products
  drop constraint if exists seller_products_seller_company_id_product_id_key;

alter table public.seller_products
  add constraint seller_products_company_product_origin_key
  unique nulls not distinct (seller_company_id, product_id, origin_country);

-- 2) البائع: عرض واحد لكل منتج مهما كان منشأ عروضه الموجودة.
--    `on conflict` لوحدها مابقتش كفاية: لو الأدمن ضاف المنتج بمنشأ، صف بمنشأ
--    فاضي مش هيتعارض معاه، فمحتاجين شرط `not exists` صريح.
create or replace function public.seller_add_products(p_product_ids uuid[])
 returns table(product_id uuid, seller_product_id uuid)
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_user   uuid := auth.uid();
  v_seller uuid;
begin
  if v_user is null then raise exception 'غير مصرّح' using errcode = '42501'; end if;
  v_seller := app.seller_company_of(v_user);
  if v_seller is null then raise exception 'غير مصرّح' using errcode = '42501'; end if;

  if p_product_ids is null or cardinality(p_product_ids) = 0 then
    raise exception 'ما اخترتش أي مادة' using errcode = '23514';
  end if;
  if cardinality(p_product_ids) > 200 then
    raise exception 'أقصى عدد في المرة الواحدة 200 مادة' using errcode = '23514';
  end if;

  insert into public.seller_products (
    seller_company_id, product_id, price, unit_id, is_active, track_stock, stock_qty
  )
  select v_seller, p.id, 0, p.unit_id, false, false, null
    from public.products p
   where p.id = any(p_product_ids)
     and p.is_active
     and not exists (
       select 1
         from public.seller_products sp
        where sp.seller_company_id = v_seller
          and sp.product_id = p.id
     )
  on conflict (seller_company_id, product_id, origin_country) do nothing;

  -- المنتج ممكن يكون له أكتر من عرض للشركة؛ بنرجّع عرض واحد لكل منتج:
  -- عرض البائع نفسه (من غير منشأ) وإلا أقدم عرض.
  return query
  select distinct on (sp.product_id) sp.product_id, sp.id
    from public.seller_products sp
   where sp.seller_company_id = v_seller
     and sp.product_id = any(p_product_ids)
   order by sp.product_id, (sp.origin_country is null) desc, sp.created_at;
end;
$function$;

-- 3) الأدمن: بارامتر منشأ جديد عشان يقدر يربط نفس المنتج بأكتر من منشأ.
--    لازم drop مش replace — إضافة بارامتر بتعمل overload مش استبدال.
--    البارامتر ليه default، فنداءات الداشبورد القديمة (بارامترين) فضلت شغالة.
drop function if exists public.admin_assign_company_products(uuid, uuid[]);

create function public.admin_assign_company_products(
  p_company_id uuid,
  p_product_ids uuid[],
  p_origin_country text default null
)
 returns integer
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_type     public.company_type;
  v_origin   text := nullif(btrim(coalesce(p_origin_country, '')), '');
  v_inserted int := 0;
begin
  if auth.uid() is null or not app.is_admin() then
    raise exception 'غير مصرّح' using errcode = '42501';
  end if;

  select c.type into v_type from public.companies c where c.id = p_company_id;
  if v_type is null then
    raise exception 'الشركة غير موجودة' using errcode = 'P0002';
  end if;
  if v_type is distinct from 'seller' then
    raise exception 'إدارة المواد متاحة لشركات البائع فقط' using errcode = '23514';
  end if;

  if p_product_ids is null or cardinality(p_product_ids) = 0 then
    raise exception 'ما اخترتش أي مادة' using errcode = '23514';
  end if;
  if cardinality(p_product_ids) > 200 then
    raise exception 'أقصى عدد في المرة الواحدة 200 مادة' using errcode = '23514';
  end if;

  insert into public.seller_products (
    seller_company_id, product_id, price, unit_id, is_active, track_stock, stock_qty, origin_country
  )
  select p_company_id, p.id, 0, p.unit_id, false, false, null, v_origin
    from public.products p
   where p.id = any(p_product_ids)
     and p.is_active
  on conflict (seller_company_id, product_id, origin_country) do nothing;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$function$;

-- نفس صلاحيات النسخة القديمة بالظبط. السحب من public لوحده مش كفاية:
-- الـdefault privileges بتدي EXECUTE لـanon على أي دالة جديدة في public،
-- والنسخة القديمة كانت authenticated + service_role بس.
revoke all on function public.admin_assign_company_products(uuid, uuid[], text) from public, anon;
grant execute on function public.admin_assign_company_products(uuid, uuid[], text) to authenticated, service_role;

-- 4) كتالوج البائع: المنشأ في الصف. من غيره الشركة اللي عندها نفس المادة
--    بمنشأين هتشوف صفين متطابقين في «منتجاتي» والتسعير وتسعّر غلط.
--    تغيير نوع الإرجاع محتاج drop مش replace.
drop function if exists public.seller_catalog_list(uuid, text);

create function public.seller_catalog_list(
  p_specialty_id uuid default null,
  p_search text default null
)
 returns table(seller_product_id uuid, product_id uuid, sku text, name_ar text, image_url text,
               specialty_id uuid, specialty_name text, category_id uuid, unit_ar text,
               price money_kwd, is_active boolean, origin_country text)
 language plpgsql
 stable security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_user uuid := auth.uid();
  v_seller uuid;
  v_q text := nullif(btrim(coalesce(p_search, '')), '');
begin
  if v_user is null then raise exception 'غير مصرّح' using errcode = '42501'; end if;
  v_seller := app.seller_company_of(v_user);
  if v_seller is null then raise exception 'غير مصرّح' using errcode = '42501'; end if;

  return query
  select sp.id, p.id, p.sku,
         app.display_name(p.name_ar, p.name_en),
         nullif(p.images[1], ''),
         p.specialty_id, app.display_name(s.name_ar, s.name_en), p.category_id,
         coalesce(app.display_name(u.name_ar, u.name_en), ''),
         sp.price, sp.is_active, sp.origin_country
    from public.seller_products sp
    join public.products p on p.id = sp.product_id
    left join public.specialties s on s.id = p.specialty_id
    left join public.units u on u.id = sp.unit_id
   where sp.seller_company_id = v_seller
     and (p_specialty_id is null or app.product_in_specialty(p.id, p_specialty_id))
     and (v_q is null
          or p.name_ar ilike '%' || v_q || '%'
          or coalesce(p.name_en, '') ilike '%' || v_q || '%'
          or p.sku ilike '%' || v_q || '%')
   order by s.sort_order nulls last, p.name_ar, sp.origin_country nulls first;
end;
$function$;

revoke all on function public.seller_catalog_list(uuid, text) from public, anon;
grant execute on function public.seller_catalog_list(uuid, text) to authenticated, service_role;

-- 5) منتقي مواد البائع: المنتج مرة واحدة حتى لو الشركة عندها أكتر من عرض ليه.
create or replace function public.seller_pickable_products(
  p_specialty_id uuid default null,
  p_search text default null
)
 returns table(product_id uuid, seller_product_id uuid, sku text, name_ar text, image_url text,
               specialty_id uuid, specialty_name text, unit_ar text, price money_kwd,
               is_active boolean, in_catalog boolean)
 language plpgsql
 stable security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_user   uuid := auth.uid();
  v_seller uuid;
  v_q      text := nullif(btrim(coalesce(p_search, '')), '');
begin
  if v_user is null then raise exception 'غير مصرّح' using errcode = '42501'; end if;
  v_seller := app.seller_company_of(v_user);
  if v_seller is null then raise exception 'غير مصرّح' using errcode = '42501'; end if;

  return query
  select t.o_product_id, t.o_seller_product_id, t.o_sku, t.o_name_ar, t.o_image_url,
         t.o_specialty_id, t.o_specialty_name, t.o_unit_ar, t.o_price, t.o_is_active, t.o_in_catalog
    from (
      select distinct on (p.id)
             p.id                                                 as o_product_id,
             sp.id                                                as o_seller_product_id,
             p.sku                                                as o_sku,
             app.display_name(p.name_ar, p.name_en)               as o_name_ar,
             nullif(p.images[1], '')                              as o_image_url,
             p.specialty_id                                       as o_specialty_id,
             app.display_name(s.name_ar, s.name_en)               as o_specialty_name,
             coalesce(app.display_name(u.name_ar, u.name_en), '') as o_unit_ar,
             sp.price                                             as o_price,
             coalesce(sp.is_active, false)                        as o_is_active,
             sp.id is not null                                    as o_in_catalog
        from public.products p
        join public.units u on u.id = p.unit_id
        left join public.specialties s on s.id = p.specialty_id
        left join public.seller_products sp
               on sp.product_id = p.id and sp.seller_company_id = v_seller
       where p.is_active
         and (p_specialty_id is null or app.product_in_specialty(p.id, p_specialty_id))
         and (v_q is null
              or p.name_ar ilike '%' || v_q || '%'
              or coalesce(p.name_en, '') ilike '%' || v_q || '%'
              or p.sku ilike '%' || v_q || '%')
       order by p.id, (sp.origin_country is null) desc, sp.created_at
    ) t
   order by (t.o_seller_product_id is not null) desc, t.o_name_ar;
end;
$function$;
