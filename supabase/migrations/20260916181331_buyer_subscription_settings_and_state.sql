-- اشتراك المشتري (١/٣): الإعدادات والحالة. لسه من غير أي منع.
--
-- **القيمة والمدة للمنصة كلها، مش لكل عميل.** `billing_plans` فيه خطة لكل
-- حساب — ده صح للبائعين (نسبة العمولة فعلاً بتختلف: 5% · 4.93% · 1%) وغلط
-- للمشترين: السعر واحد للكل، والفرق الوحيد المسموح بيه فرد ↔ شركة. فالسعر
-- والمدة بقوا في `app_settings`، واللي بيتخزّن على الحساب **تاريخ واحد بس**.
--
-- كده لما تغيّر السعر بيسري على كل التجديدات الجاية من غير ما تلمس حساب واحد،
-- والمبلغ المحصّل بيتسجّل في `platform_fees` فبيفضل محفوظ بقيمته وقت الدفع لو
-- السعر اتغيّر بعدها.
--
-- **الحساب ما بيتعلّقش لما الاشتراك يخلص** (المنع في ٢/٣ على العمليات نفسها).
-- `app.account_user_id()` بترجّع null لأي حساب مش `active`، وهي في صلاحيات
-- **المحفظة** و`payment-init` كمان بترفض الحساب المش نشط — يعني التعليق كان
-- هيقفل عليه طريق الدفع نفسه ويخليه محتاجك تفكّه بإيدك كل مرة.

alter table public.profiles
  add column if not exists subscribed_until date;

comment on column public.profiles.subscribed_until is
  'آخر يوم اشتراك سارٍ. null = مشترك قط. المستخدم الفرعي بيتبع تاريخ صاحب الحساب.';

-- الحسابات الفرعية بتتبع صاحب الحساب، فالفهرس على الملاك بس.
create index if not exists profiles_subscribed_until_idx
  on public.profiles (subscribed_until)
  where parent_account_id is null and deleted_at is null;

insert into public.app_settings (key, value) values
  ('subscription_fee_individual', '1'::jsonb),
  ('subscription_fee_company',    '4'::jsonb),
  ('subscription_period_days',    '30'::jsonb),
  ('subscription_trial_days',     '0'::jsonb),
  ('subscription_reminder_days',  '3'::jsonb)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- قراءة الإعدادات

create or replace function app.setting_int(p_key text, p_default int)
returns int
language sql
stable
set search_path to 'public', 'pg_temp'
as $fn$
  select coalesce((select nullif(value #>> '{}', '')::int
                     from public.app_settings where key = p_key), p_default)
$fn$;

create or replace function app.setting_num(p_key text, p_default numeric)
returns numeric
language sql
stable
set search_path to 'public', 'pg_temp'
as $fn$
  select coalesce((select nullif(value #>> '{}', '')::numeric
                     from public.app_settings where key = p_key), p_default)
$fn$;

/** سعر الدورة حسب نوع الحساب — الفرق الوحيد المسموح بيه بين العملاء. */
create or replace function app.subscription_fee(p_role text)
returns numeric
language sql
stable
set search_path to 'public', 'pg_temp'
as $fn$
  select case p_role
    when 'company_buyer'    then app.setting_num('subscription_fee_company', 4)
    when 'individual_buyer' then app.setting_num('subscription_fee_individual', 1)
  end
$fn$;

-- ---------------------------------------------------------------------------
-- الحالة

/**
 * هل الحساب ده مشترك النهارده؟
 *
 * `p_profile_id` لازم يكون **صاحب الحساب** مش المستخدم الفرعي — المستخدمين
 * الفرعيين بيشتغلوا تحت اشتراك صاحب الحساب، و`app.account_user_id()` بترجّع
 * صاحب الحساب أصلاً.
 *
 * البائع والأدمن مالهمش اشتراك مشتري ⇒ `true` دايمًا؛ عقد البائع موضوع تاني.
 */
create or replace function app.subscription_active(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $fn$
  select case
    when p_profile_id is null then false
    when p.role not in ('individual_buyer', 'company_buyer') then true
    else coalesce(p.subscribed_until >= current_date, false)
  end
  from public.profiles p
  where p.id = p_profile_id
$fn$;

/** نفس السؤال للمستخدم الحالي. */
create or replace function app.subscription_active()
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $fn$ select app.subscription_active(app.account_user_id()) $fn$;

-- ---------------------------------------------------------------------------
-- شاشة «اشتراكي» في التطبيق
--
-- `billing_plans` و`app_settings` مقفولين على الأدمن في الـRLS، فالمشتري
-- محتاج دالة تجمّعله حالته والسعر ورصيده في نداء واحد.

create or replace function public.my_subscription()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $fn$
declare
  v_id      uuid := app.account_user_id();
  v_role    text;
  v_until   date;
  v_fee     numeric;
  v_balance numeric;
begin
  if v_id is null then
    raise exception 'الحساب غير نشط' using errcode = '42501';
  end if;

  select p.role::text, p.subscribed_until into v_role, v_until
    from public.profiles p where p.id = v_id;

  if v_role not in ('individual_buyer', 'company_buyer') then
    raise exception 'الاشتراك للمشترين فقط' using errcode = '22023';
  end if;

  v_fee := app.subscription_fee(v_role);

  select w.balance into v_balance
    from public.wallets w
   where w.owner_type = 'user' and w.owner_id = v_id;

  return jsonb_build_object(
    'role',         v_role,
    'active',       coalesce(v_until >= current_date, false),
    'until',        v_until,
    -- سالب = عدد أيام التأخير. الشاشة بتفرّق بين «فاضل ٣ أيام» و«منتهي من ٣».
    'days_left',    case when v_until is null then null else (v_until - current_date) end,
    'fee',          v_fee::text,
    'period_days',  app.setting_int('subscription_period_days', 30),
    'wallet_balance', coalesce(v_balance, 0)::text,
    -- الرصيد يكفي ⇒ الشاشة تعرض «جدّد من المحفظة» بدل ما توديه يشحن.
    'wallet_covers', coalesce(v_balance, 0) >= v_fee);
end $fn$;

-- ---------------------------------------------------------------------------
-- تحكم الأدمن: مدّ اشتراك حساب بعينه (مسامحة أو تسوية يدوية).
-- ده تاريخ بس — مش سعر خاص. السعر يفضل واحد للكل.

create or replace function public.admin_set_subscription(
  p_profile_id uuid,
  p_until      date,
  p_note       text default null
) returns date
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $fn$
declare v_role text;
begin
  if not app.is_admin() then
    raise exception 'غير مصرح: هذه العملية للأدمن فقط' using errcode = '42501';
  end if;

  select p.role::text into v_role
    from public.profiles p
   where p.id = p_profile_id and p.deleted_at is null and p.parent_account_id is null;

  if v_role is null then
    raise exception 'الحساب غير موجود' using errcode = 'P0002';
  end if;
  if v_role not in ('individual_buyer', 'company_buyer') then
    raise exception 'الاشتراك للمشترين فقط' using errcode = '22023';
  end if;

  update public.profiles set subscribed_until = p_until where id = p_profile_id;

  insert into public.audit_log (actor_id, action, entity, entity_id, after)
  values (auth.uid(), 'set_subscription', 'profiles', p_profile_id::text,
          jsonb_build_object('until', p_until, 'note', nullif(trim(coalesce(p_note, '')), '')));

  return p_until;
end $fn$;

-- ---------------------------------------------------------------------------
-- الحسابات القايمة: دورة من النهارده قبل ما تتحاسب.
--
-- من غير السطر ده الستة كلهم بيبقوا «منتهيين» من أول لحظة المنع يشتغل فيها،
-- ويفتحوا التطبيق الصبح يلاقوه متقفل من غير إنذار.

update public.profiles p
   set subscribed_until = current_date + app.setting_int('subscription_period_days', 30)
 where p.deleted_at is null
   and p.parent_account_id is null
   and p.role in ('individual_buyer', 'company_buyer')
   and p.subscribed_until is null;

notify pgrst, 'reload schema';
