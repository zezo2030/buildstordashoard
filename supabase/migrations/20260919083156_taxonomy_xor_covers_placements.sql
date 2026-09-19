-- قاعدة «كل مستوى يا أقسام يا مواد» تشمل الأماكن الإضافية كمان.
--
-- القاعدة كانت متطبّقة على المكان الأساسي بس (أعمدة `products`)، فالمادة اللي
-- بتتحطّ في تخصص تاني عن طريق `product_placements` كانت بتعدّي من غير فحص —
-- وده اللي خلّى «موزع مدوراستيل» يقعد في جذر الكهرباء واللي فيها 3 أقسام:
-- لا هو قسم ولا هو جوّه قسم، ومابيتلاقاش لو المشتري دخل أي قسم منهم.
--
-- بعد الهجرة دي المكان — أساسي كان أو إضافي — لازم يكون على مستوى مافيهوش
-- أقسام. المستوى المقسّم بيبقى للأقسام بس.

-- ١) حارس الفرع: يعدّ الأماكن كلها، مش المكان الأساسي بس.
create or replace function app.assert_taxonomy_xor_for_branch(p_specialty_id uuid, p_parent_id uuid)
returns void
language plpgsql
stable
set search_path to 'public', 'pg_temp'
as $fn$
begin
  if current_setting('app.skip_taxonomy_xor', true) = 'on' then
    return;
  end if;

  if exists (
    select 1
      from public.product_placements pp
      join public.products p on p.id = pp.product_id
     where p.is_active
       and (
         (p_parent_id is null
            and pp.specialty_id = p_specialty_id
            and pp.category_id is null)
         or (p_parent_id is not null and pp.category_id = p_parent_id)
       )
  ) then
    raise exception 'لا يمكن إضافة قسم هنا: المستوى ده فيه مواد بالفعل. انقل أو أرشف المواد أولًا'
      using errcode = 'check_violation';
  end if;
end;
$fn$;

-- ٢) الاتجاه التاني: المكان نفسه لازم ينزل على مستوى مافيهوش أقسام.
create or replace function app.assert_placement_level(p_specialty_id uuid, p_category_id uuid)
returns void
language plpgsql
stable
set search_path to 'public', 'pg_temp'
as $fn$
declare
  v_owner uuid;
begin
  if current_setting('app.skip_taxonomy_xor', true) = 'on' then
    return;
  end if;

  if p_category_id is null then
    if exists (
      select 1 from public.categories c
       where c.specialty_id = p_specialty_id and c.parent_id is null
    ) then
      raise exception 'التخصص ده مقسّم لأقسام — المادة لازم تدخل قسم، مايصحّش تتساب في الجذر'
        using errcode = 'check_violation';
    end if;
    return;
  end if;

  select specialty_id into v_owner from public.categories where id = p_category_id;
  if v_owner is null then
    raise exception 'القسم غير موجود' using errcode = 'check_violation';
  end if;
  -- القسم لازم يكون تابع لنفس التخصص، وإلا المكان بيبقى متناقض مع نفسه
  if v_owner <> p_specialty_id then
    raise exception 'القسم ده مش تابع للتخصص المختار' using errcode = 'check_violation';
  end if;
  if exists (select 1 from public.categories k where k.parent_id = p_category_id) then
    raise exception 'القسم ده متقسّم لأقسام تحته — اختر قسم من جواه'
      using errcode = 'check_violation';
  end if;
end;
$fn$;

create or replace function app.trg_placements_xor()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $fn$
begin
  if tg_op = 'INSERT'
     or new.specialty_id is distinct from old.specialty_id
     or new.category_id is distinct from old.category_id then
    perform app.assert_placement_level(new.specialty_id, new.category_id);
  end if;
  return new;
end;
$fn$;

drop trigger if exists t_placements_xor on public.product_placements;
create trigger t_placements_xor
  before insert or update of specialty_id, category_id on public.product_placements
  for each row execute function app.trg_placements_xor();

notify pgrst, 'reload schema';
