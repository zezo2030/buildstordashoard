-- حذف التخصص ووحدة القياس من لوحة الكتالوج + قائمة المنتجات بفلتر عدد العروض.
--
-- الحذف بيرفض طول ما فيه حاجة معلّقة عليه بدل ما يكسر مفتاح أجنبي برسالة
-- إنجليزية — كل حالة ليها رسالة بتقول للأدمن يعمل إيه.

create or replace function public.admin_delete_specialty(p_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if not app.is_admin() then
    raise exception 'غير مصرح: هذه العملية للأدمن فقط' using errcode = '42501';
  end if;
  if p_id is null then
    raise exception 'معرف التخصص مطلوب' using errcode = '22023';
  end if;
  if not exists (select 1 from public.specialties s where s.id = p_id) then
    raise exception 'التخصص غير موجود' using errcode = 'P0002';
  end if;

  if exists (select 1 from public.categories c where c.specialty_id = p_id) then
    raise exception 'التخصص فيه فروع — احذف الفروع الأول' using errcode = '23503';
  end if;
  if exists (select 1 from public.products p where p.specialty_id = p_id)
     or exists (select 1 from public.product_placements pp where pp.specialty_id = p_id)
     or exists (select 1 from public.product_specialties ps where ps.specialty_id = p_id) then
    raise exception 'التخصص فيه منتجات — انقلها أو احذفها الأول' using errcode = '23503';
  end if;
  if exists (select 1 from public.order_items oi where oi.specialty_id = p_id) then
    raise exception 'التخصص مستخدم في طلبات سابقة فما ينفعش يتحذف' using errcode = '23503';
  end if;
  if exists (select 1 from public.discounts d where d.specialty_id = p_id)
     or exists (select 1 from public.price_rules pr where pr.specialty_id = p_id) then
    raise exception 'التخصص مربوط بخصومات أو قواعد أسعار — شيلها الأول' using errcode = '23503';
  end if;
  if exists (select 1 from public.product_requests r where r.specialty_id = p_id)
     or exists (select 1 from public.product_submissions s where s.specialty_id = p_id) then
    raise exception 'التخصص مربوط بطلبات مواد أو اقتراحات بائعين' using errcode = '23503';
  end if;

  -- تخصصات البائعين مجرد إعلان اهتمام، بتتشال مع التخصص نفسه
  delete from public.seller_specialties where specialty_id = p_id;
  delete from public.specialties where id = p_id;
end $$;

comment on function public.admin_delete_specialty(uuid) is
  'حذف تخصص فاضي — بيرفض لو عليه فروع أو منتجات أو استخدام تاريخي';

create or replace function public.admin_delete_unit(p_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if not app.is_admin() then
    raise exception 'غير مصرح: هذه العملية للأدمن فقط' using errcode = '42501';
  end if;
  if p_id is null then
    raise exception 'معرف الوحدة مطلوب' using errcode = '22023';
  end if;
  if not exists (select 1 from public.units u where u.id = p_id) then
    raise exception 'الوحدة غير موجودة' using errcode = 'P0002';
  end if;

  if exists (select 1 from public.products p where p.unit_id = p_id) then
    raise exception 'الوحدة مستخدمة في منتجات — غيّر وحدتها الأول' using errcode = '23503';
  end if;
  if exists (select 1 from public.seller_products sp where sp.unit_id = p_id) then
    raise exception 'الوحدة مستخدمة في عروض بائعين' using errcode = '23503';
  end if;
  if exists (select 1 from public.quotation_items qi where qi.unit_id = p_id) then
    raise exception 'الوحدة مستخدمة في عروض أسعار سابقة' using errcode = '23503';
  end if;
  if exists (select 1 from public.product_requests r where r.unit_id = p_id)
     or exists (select 1 from public.product_submissions s where s.unit_id = p_id) then
    raise exception 'الوحدة مستخدمة في طلبات مواد أو اقتراحات بائعين' using errcode = '23503';
  end if;

  delete from public.units where id = p_id;
end $$;

comment on function public.admin_delete_unit(uuid) is
  'حذف وحدة قياس غير مستخدمة — بيرفض لو أي منتج أو عرض بيستخدمها';

-- قائمة المنتجات للأدمن: البحث والتخصص وعدد عروض البائعين كلهم فلترة في
-- الداتابيز. عدّ العروض مايتعملش بـPostgREST embed لأن الفلترة على العدد
-- نفسه (0 عرض / 2 عرض) محتاجة having، فبقت RPC زي باقي جداول اللوحة.
create or replace function public.admin_products_list(
  p_search      text    default null,
  p_specialty   uuid    default null,
  p_offers_min  integer default null,
  p_offers_max  integer default null,
  p_limit       integer default 25,
  p_offset      integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_rows  jsonb;
  v_total bigint;
  v_q     text;
begin
  if not app.is_admin() then
    raise exception 'غير مصرح: هذه العملية للأدمن فقط' using errcode = '42501';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 200 then
    raise exception 'حجم الصفحة يجب أن يكون بين 1 و 200' using errcode = '22023';
  end if;
  v_q := nullif(trim(coalesce(p_search, '')), '');

  with base as (
    select p.id,
           p.sku,
           p.source_code,
           p.name_ar,
           p.images,
           p.is_active,
           p.specialty_id,
           p.category_id,
           p.created_at,
           coalesce(u.name_ar, '') as unit_name,
           (select count(*) from public.seller_products sp where sp.product_id = p.id) as offers,
           (select count(*) from public.product_placements pp where pp.product_id = p.id) as placements
      from public.products p
      left join public.units u on u.id = p.unit_id
     where (v_q is null or p.name_ar ilike '%' || v_q || '%' or p.sku ilike '%' || v_q || '%')
       and (p_specialty is null or exists (
             select 1 from public.product_placements pp
              where pp.product_id = p.id and pp.specialty_id = p_specialty))
  ), filtered as (
    select * from base
     where (p_offers_min is null or offers >= p_offers_min)
       and (p_offers_max is null or offers <= p_offers_max)
  )
  select coalesce(jsonb_agg(to_jsonb(t) - 'created_at' order by t.created_at desc), '[]'::jsonb),
         (select count(*) from filtered)
    into v_rows, v_total
    from (select * from filtered
           order by created_at desc
           limit p_limit offset greatest(coalesce(p_offset, 0), 0)) t;

  return jsonb_build_object('rows', v_rows, 'total', v_total);
end $$;

comment on function public.admin_products_list(text, uuid, integer, integer, integer, integer) is
  'كتالوج المنصة للأدمن مع فلتر عدد عروض البائعين (p_offers_min/p_offers_max)';
