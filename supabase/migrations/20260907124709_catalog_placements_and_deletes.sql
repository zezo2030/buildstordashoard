-- ملاحظات لوحة التحكم (ص1، ص11، ص12):
--  • المنتج الواحد يتحط في أكتر من مكان في الشجرة (تخصصات مختلفة أو فروع
--    مختلفة في نفس التخصص)، والأدمن يشوف هو موجود فين بالمسار كامل.
--  • حذف أسباب الإرجاع من الإعدادات.
--  • حذف أكتر من منتج مرة واحدة من شاشة التخصصات والفئات.

-- ---------------------------------------------------------------- 1) الأماكن
-- `products.specialty_id/category_id` بيفضلوا المكان الأساسي (الفواتير
-- والتقارير والخصومات بتمشي عليهم)، و`product_placements` بتضيف أماكن زيادة.
create table if not exists public.product_placements (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references public.products(id)    on delete cascade,
  specialty_id uuid not null references public.specialties(id) on delete cascade,
  category_id  uuid          references public.categories(id)  on delete cascade,
  created_at   timestamptz not null default now(),
  -- nulls not distinct: مكان بفئة فاضية (التخصص نفسه) مايتكررش
  constraint product_placements_uniq
    unique nulls not distinct (product_id, specialty_id, category_id)
);

create index if not exists product_placements_category_idx
  on public.product_placements (category_id) where category_id is not null;
create index if not exists product_placements_specialty_idx
  on public.product_placements (specialty_id);

-- تعبئة الموجود: كل منتج مكانه الأساسي + التخصصات اللي كانت مربوطة بيه
insert into public.product_placements (product_id, specialty_id, category_id)
select p.id, p.specialty_id, p.category_id from public.products p
on conflict do nothing;

insert into public.product_placements (product_id, specialty_id, category_id)
select ps.product_id, ps.specialty_id, null
  from public.product_specialties ps
  join public.products p on p.id = ps.product_id
 where ps.specialty_id <> p.specialty_id
on conflict do nothing;

-- `product_specialties` بيقرا منه التطبيق — بيفضل مرآة لتخصصات الأماكن.
create or replace function app.sync_product_specialties()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare v_product uuid := coalesce(new.product_id, old.product_id);
begin
  insert into public.product_specialties (product_id, specialty_id)
  select v_product, pp.specialty_id
    from public.product_placements pp
   where pp.product_id = v_product
  on conflict do nothing;

  delete from public.product_specialties ps
   where ps.product_id = v_product
     and not exists (
       select 1 from public.product_placements pp
        where pp.product_id = v_product and pp.specialty_id = ps.specialty_id)
     -- التخصص الأساسي مايتشالش أبدًا: التطبيق بيعتمد عليه في الفلترة
     and ps.specialty_id <> (select specialty_id from public.products where id = v_product);
  return null;
end $$;

drop trigger if exists product_placements_sync on public.product_placements;
create trigger product_placements_sync
after insert or update or delete on public.product_placements
for each row execute function app.sync_product_specialties();

alter table public.product_placements enable row level security;

drop policy if exists product_placements_read on public.product_placements;
create policy product_placements_read on public.product_placements
  for select using (true);

drop policy if exists product_placements_admin on public.product_placements;
create policy product_placements_admin on public.product_placements
  for all using (app.is_admin()) with check (app.is_admin());

-- بديل `product_specialties`: صف لكل ظهور للمنتج في الشجرة، بالمسار جاهز.
create or replace view public.v_product_placements as
with recursive up as (
  select c.id as leaf_id, c.id, c.parent_id, c.name_ar, 0 as depth
    from public.categories c
  union all
  select u.leaf_id, c.id, c.parent_id, c.name_ar, u.depth + 1
    from up u join public.categories c on c.id = u.parent_id
),
trail as (
  select leaf_id, array_agg(name_ar order by depth desc) as names
    from up group by leaf_id
)
select pp.id,
       pp.product_id,
       pp.specialty_id,
       pp.category_id,
       s.name_ar as specialty_name,
       (array[s.name_ar] || coalesce(t.names, '{}'::text[])) as path,
       (pp.specialty_id = p.specialty_id
        and pp.category_id is not distinct from p.category_id) as is_primary
  from public.product_placements pp
  join public.products p    on p.id = pp.product_id
  join public.specialties s on s.id = pp.specialty_id
  left join trail t on t.leaf_id = pp.category_id;

grant select on public.v_product_placements to anon, authenticated;

-- ------------------------------------------------- 2) حذف أكتر من منتج مرة
-- نفس شرط الحذف الفردي في اللوحة: ممنوع لو المنتج مربوط بعرض بائع أو مقايسة.
create or replace function public.admin_delete_products(p_ids uuid[])
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_blocked jsonb;
  v_deleted int;
begin
  if not app.is_admin() then
    raise exception 'غير مصرح: هذه العملية للأدمن فقط' using errcode = '42501';
  end if;
  if p_ids is null or cardinality(p_ids) = 0 then
    raise exception 'ما اخترتش أي منتج' using errcode = '23514';
  end if;
  if cardinality(p_ids) > 200 then
    raise exception 'أقصى عدد في المرة الواحدة 200 منتج' using errcode = '23514';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'name_ar', p.name_ar)), '[]'::jsonb)
    into v_blocked
    from public.products p
   where p.id = any (p_ids)
     and (exists (select 1 from public.seller_products sp where sp.product_id = p.id)
       or exists (select 1 from public.quotation_items qi where qi.product_id = p.id));

  with gone as (
    delete from public.products p
     where p.id = any (p_ids)
       and not exists (select 1 from public.seller_products sp where sp.product_id = p.id)
       and not exists (select 1 from public.quotation_items qi where qi.product_id = p.id)
    returning p.id
  )
  select count(*) into v_deleted from gone;

  return jsonb_build_object('deleted', v_deleted, 'blocked', v_blocked);
end $$;

revoke all on function public.admin_delete_products(uuid[]) from public;
grant execute on function public.admin_delete_products(uuid[]) to authenticated;

-- --------------------------------------------- 3) حذف سبب إرجاع من الإعدادات
-- السبب المستخدم في سند قايم مايتحذفش — بيتعطّل بس، عشان السندات القديمة
-- تفضل قادرة تعرض السبب بتاعها.
create or replace function public.admin_delete_return_reason(p_code text)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if not app.is_admin() then
    raise exception 'غير مصرح: هذه العملية للأدمن فقط' using errcode = '42501';
  end if;
  if exists (select 1 from public.return_requests r where r.reason_code = p_code) then
    raise exception 'السبب مستخدم في سندات إرجاع — عطّله بدل الحذف' using errcode = '23503';
  end if;
  delete from public.return_reasons where code = p_code;
  if not found then
    raise exception 'السبب غير موجود' using errcode = 'P0002';
  end if;
end $$;

revoke all on function public.admin_delete_return_reason(text) from public;
grant execute on function public.admin_delete_return_reason(text) to authenticated;
