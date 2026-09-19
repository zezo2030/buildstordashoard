-- تشغيل مادة موقوفة تاني لازم يعدّي على نفس قاعدة المستوى.
--
-- `t_products_xor` كان بيشتغل على `category_id` و`specialty_id` بس. يعني
-- المسار ده كان بيعدّي من غير فحص:
--   ١. مستوى فيه مواد
--   ٢. الأدمن يستعمل «تحويل لإضافة فروع ‹ أرشفة كل المنتجات» → المواد بتتوقف
--   ٣. يضيف أقسام (مسموح دلوقتي، المواد موقوفة)
--   ٤. يرجّع يشغّل مادة منهم → مادة مفعّلة في مستوى فيه أقسام = كسر القاعدة
--
-- وده مش افتراضي: المسار ده مكتوب في اللوحة كخيار من تلاتة في نافذة
-- «تحويل لإضافة فروع». دلوقتي الخطوة ٤ بترفض وبتقول للأدمن يعمل إيه.

create or replace function app.trg_products_xor()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $fn$
begin
  if tg_op = 'INSERT'
     or new.category_id is distinct from old.category_id
     or new.specialty_id is distinct from old.specialty_id
     -- التشغيل بعد إيقاف: المستوى ممكن يكون اتقسّم في الوقت ده
     or (new.is_active and not old.is_active) then
    perform app.assert_taxonomy_xor_for_product(new.specialty_id, new.category_id);
  end if;
  return new;
end;
$fn$;

drop trigger if exists t_products_xor on public.products;
create trigger t_products_xor
  before insert or update of category_id, specialty_id, is_active on public.products
  for each row execute function app.trg_products_xor();

-- الرسالة كانت بتتكلم عن الإضافة بس، والحالة دي تشغيل مش إضافة.
create or replace function app.assert_taxonomy_xor_for_product(p_specialty_id uuid, p_category_id uuid)
returns void
language plpgsql
stable
set search_path to 'public', 'pg_temp'
as $fn$
begin
  if current_setting('app.skip_taxonomy_xor', true) = 'on' then
    return;
  end if;

  if p_category_id is null then
    if exists (
      select 1 from public.categories
       where specialty_id = p_specialty_id and parent_id is null
    ) then
      raise exception 'التخصص ده مقسّم لأقسام — المادة لازم تدخل قسم. انقلها لقسم من تعديل المادة'
        using errcode = 'check_violation';
    end if;
  else
    if exists (select 1 from public.categories where parent_id = p_category_id) then
      raise exception 'القسم ده متقسّم لأقسام تحته — المادة لازم تدخل قسم من جواه'
        using errcode = 'check_violation';
    end if;
  end if;
end;
$fn$;

notify pgrst, 'reload schema';
