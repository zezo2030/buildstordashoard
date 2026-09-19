-- سياسة اشتراك المشترين كرقم واحد للكل — قراءة وكتابة في نداء واحد.
--
-- المفاتيح الأربعة موجودة في `app_settings` من الأول والمحرّك بيقراها، بس
-- مكانها في الواجهة كان قايمة الإعدادات العامة مرتّبة أبجديًا — يعني الأدمن
-- اللي واقف في «المال ‹ مشتري الشركة» عايز يظبط الاشتراك مالوش أي دليل إنها
-- موجودة أصلًا. الدالتين دول بيخلّوها تتعرض وتتظبط من مكان السؤال.
--
-- وبتضيف اللي ماكانش موجود: تحقّق من القيم قبل الحفظ (كانت `app_settings`
-- بتقبل أي رقم، ومدة صفر كانت هتخلي كل دفعة تنتهي في نفس اليوم)، وأثر في
-- `audit_log`، وعدّادات بتقول السياسة دي بتأثر على كام حساب فعلًا.

create or replace function public.admin_buyer_subscription_policy()
returns jsonb
language plpgsql
stable security definer
set search_path to 'public', 'pg_temp'
as $fn$
declare v jsonb;
begin
  if not app.is_admin() then
    raise exception 'غير مصرح: هذه العملية للأدمن فقط' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'fee_individual', app.setting_num('subscription_fee_individual', 1)::text,
    'fee_company',    app.setting_num('subscription_fee_company', 4)::text,
    'period_days',    app.setting_int('subscription_period_days', 30),
    'trial_days',     app.setting_int('subscription_trial_days', 0),
    'reminder_days',  app.setting_int('subscription_reminder_days', 3),
    -- العدّادات بتقول السياسة بتأثر على مين. من غيرها الأدمن بيغيّر رقم
    -- وما يعرفش هيمسّ كام حساب.
    'n_individual',   (select count(*) from public.profiles p
                        where p.role = 'individual_buyer' and p.deleted_at is null
                          and p.parent_account_id is null),
    'n_company',      (select count(*) from public.profiles p
                        where p.role = 'company_buyer' and p.deleted_at is null
                          and p.parent_account_id is null),
    'n_active',       (select count(*) from public.profiles p
                        where p.role in ('individual_buyer','company_buyer')
                          and p.deleted_at is null and p.parent_account_id is null
                          and p.subscribed_until is not null
                          and p.subscribed_until >= current_date),
    'n_expired',      (select count(*) from public.profiles p
                        where p.role in ('individual_buyer','company_buyer')
                          and p.deleted_at is null and p.parent_account_id is null
                          and (p.subscribed_until is null or p.subscribed_until < current_date))
  ) into v;

  return v;
end $fn$;

create or replace function public.admin_set_buyer_subscription_policy(
  p_fee_individual numeric,
  p_fee_company    numeric,
  p_period_days    integer,
  p_trial_days     integer,
  p_reminder_days  integer default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $fn$
declare v_before jsonb;
begin
  if not app.is_admin() then
    raise exception 'غير مصرح: هذه العملية للأدمن فقط' using errcode = '42501';
  end if;

  if p_fee_individual is null or p_fee_individual < 0
     or p_fee_company is null or p_fee_company < 0 then
    raise exception 'قيمة الاشتراك لا يمكن أن تكون سالبة' using errcode = '22023';
  end if;
  -- مدة صفر معناها كل دفعة تنتهي في نفس يومها — قفلة صامتة، فمرفوضة.
  if p_period_days is null or p_period_days < 1 or p_period_days > 3650 then
    raise exception 'مدة الاشتراك لازم تكون بين يوم و3650 يوم' using errcode = '22023';
  end if;
  if p_trial_days is null or p_trial_days < 0 or p_trial_days > 3650 then
    raise exception 'مدة التجربة لازم تكون بين صفر و3650 يوم' using errcode = '22023';
  end if;
  if p_reminder_days is not null and (p_reminder_days < 0 or p_reminder_days > 365) then
    raise exception 'مدة التذكير لازم تكون بين صفر و365 يوم' using errcode = '22023';
  end if;

  v_before := public.admin_buyer_subscription_policy();

  update public.app_settings set value = to_jsonb(p_fee_individual), updated_at = now()
   where key = 'subscription_fee_individual';
  update public.app_settings set value = to_jsonb(p_fee_company), updated_at = now()
   where key = 'subscription_fee_company';
  update public.app_settings set value = to_jsonb(p_period_days), updated_at = now()
   where key = 'subscription_period_days';
  update public.app_settings set value = to_jsonb(p_trial_days), updated_at = now()
   where key = 'subscription_trial_days';
  if p_reminder_days is not null then
    update public.app_settings set value = to_jsonb(p_reminder_days), updated_at = now()
     where key = 'subscription_reminder_days';
  end if;

  insert into public.audit_log (actor_id, action, entity, entity_id, before, after)
  values (auth.uid(), 'set_buyer_subscription_policy', 'app_settings', 'subscription',
          v_before, public.admin_buyer_subscription_policy());

  return public.admin_buyer_subscription_policy();
end $fn$;

-- منح مدة مجانية لحساب بعينه، في أي وقت.
--
-- `admin_set_subscription` موجودة وبتاخد تاريخ نهاية مطلق. دي بتاخد **عدد
-- أيام** وبتضيفها على المدة الحالية بدل ما تستبدلها — الفرق مهم: لو الأدمن
-- كتب تاريخ على حساب مشترك لحد بعدين، كان بيقصّر اشتراكه من غير ما يقصد.
create or replace function public.admin_grant_subscription_days(
  p_profile_id uuid,
  p_days integer,
  p_note text default null
)
returns date
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $fn$
declare v_role text; v_until date; v_new date;
begin
  if not app.is_admin() then
    raise exception 'غير مصرح: هذه العملية للأدمن فقط' using errcode = '42501';
  end if;
  if p_days is null or p_days < 1 or p_days > 3650 then
    raise exception 'عدد الأيام لازم يكون بين يوم و3650 يوم' using errcode = '22023';
  end if;

  select p.role::text, p.subscribed_until into v_role, v_until
    from public.profiles p
   where p.id = p_profile_id and p.deleted_at is null and p.parent_account_id is null
   for update;

  if v_role is null then
    raise exception 'الحساب غير موجود' using errcode = 'P0002';
  end if;
  if v_role not in ('individual_buyer', 'company_buyer') then
    raise exception 'الاشتراك للمشترين فقط' using errcode = '22023';
  end if;

  -- إضافة مش استبدال: الحساب المشترك لحد بعدين ما يتقصّرش.
  v_new := app.subscription_next_end(v_until, p_days);
  update public.profiles set subscribed_until = v_new where id = p_profile_id;

  insert into public.audit_log (actor_id, action, entity, entity_id, before, after)
  values (auth.uid(), 'grant_subscription_days', 'profiles', p_profile_id::text,
          jsonb_build_object('until', v_until),
          jsonb_build_object('until', v_new, 'days', p_days,
                             'note', nullif(trim(coalesce(p_note, '')), '')));

  insert into public.notifications (user_id, type, title_ar, body_ar, title_en, body_en, data)
  values (p_profile_id, 'system', 'تم تمديد اشتراكك',
          'اشتراكك سارٍ حتى ' || to_char(v_new, 'YYYY-MM-DD') || '.',
          'Subscription extended',
          'Your subscription is active until ' || to_char(v_new, 'YYYY-MM-DD') || '.',
          jsonb_build_object('route', '/subscription', 'until', v_new));

  return v_new;
end $fn$;

revoke all on function public.admin_buyer_subscription_policy() from public;
revoke all on function public.admin_set_buyer_subscription_policy(numeric, numeric, integer, integer, integer) from public;
revoke all on function public.admin_grant_subscription_days(uuid, integer, text) from public;
grant execute on function public.admin_buyer_subscription_policy() to authenticated;
grant execute on function public.admin_set_buyer_subscription_policy(numeric, numeric, integer, integer, integer) to authenticated;
grant execute on function public.admin_grant_subscription_days(uuid, integer, text) to authenticated;

notify pgrst, 'reload schema';
