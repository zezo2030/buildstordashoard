-- البائع يدفع اشتراكه بنفسه، والإيقاف يبقى ناعم عشان يقدر يدفع أصلًا.
--
-- ============================ المشكلة الأساسية ============================
-- `app.suspend_expired_subscriptions()` كانت بتنده `suspend_company_internal`
-- اللي بتعمل إيقاف **قاسي**: بتقفل الشركة **وكمان** بتحوّل
-- `profiles.status = 'suspended'` لكل الأعضاء. و`app.account_user_id()`
-- بترجّع null للحساب غير النشط ⇒ البائع **ما يقدرش يدخل ولا يعمل أي حاجة**.
--
-- يعني عقوبة عدم الدفع كانت إنه يتمنع من الدفع. قفلة تامة، ومفيش مخرج غير
-- الأدمن. مسار الكشوف الشهرية (`enforce_seller_statements`) كان واخد باله من
-- ده وبيعمل إيقاف ناعم، والمسار ده اتنسي.
--
-- دلوقتي نفس الإيقاف الناعم: الشركة تختفي من عند المشترين، والبائع يفضل
-- داخل حسابه شايف رسالة ويقدر يدفع.
--
-- ============================ فخ الصرف مرتين ============================
-- `tg_ledger_on_seller_subscription` بتقيّد `-fee` في `seller_ledger` أول ما
-- ينزل سطر `platform_fees` نوعه `subscription`. فلو خصمنا من المحفظة كمان،
-- البائع يكون دفع مرتين: كاش من محفظته **و** دَين في حسابه الجاري.
--
-- الحل: نسيب القيد ينزل (الإيراد لازم يتسجّل في `platform_fees` عشان رصيد
-- المنصة يشوفه) ونقيّد `settlement` بنفس القيمة ⇒ صافي الأثر على الدفتر صفر،
-- والحركة الحقيقية في المحفظة. نفس منطق ما اتعمل في `receive_return`.

-- ١) وسم ثابت نقدر نرفع بيه الإيقاف بأمان — من غيره مش هنعرف نفرّق بين
--    إيقاف الاشتراك وإيقاف الأدمن اليدوي (الرسالة فيها تاريخ فمش ثابتة).
create or replace function app.subscription_suspend_tag()
returns text language sql immutable
as $fn$ select 'عدم سداد الاشتراك' $fn$;

-- ٢) الإيقاف بقى ناعم + إشعار للأعضاء
create or replace function app.suspend_expired_subscriptions()
returns integer
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $fn$
declare v_n integer := 0; r record;
begin
  for r in
    select bp.subject_id as cid, bp.ends_on
      from public.billing_plans bp
      join public.companies c on c.id = bp.subject_id
     where bp.is_active
       -- البائعين بس. اشتراك المشتري مكانه `profiles.subscribed_until`،
       -- وبيقف الأسعار والعمليات — **ومابيعلّقش الحساب** عشان يفضل قادر يدفع.
       and bp.subject_type = 'seller'
       -- أي عقد ليه نهاية: نسبة أو اشتراك ثابت، الاتنين عقد.
       and bp.ends_on is not null
       and bp.ends_on < current_date
       and c.deleted_at is null and c.is_active and c.suspended_at is null
  loop
    -- إيقاف ناعم: الشركة بس. حسابات الأعضاء تفضل نشطة عشان يقدروا يدفعوا.
    update public.companies
       set is_active = false, suspended_at = now(),
           suspend_reason = app.subscription_suspend_reason(r.ends_on)
     where id = r.cid;

    insert into public.audit_log (actor_id, action, entity, entity_id, after)
    values (null, 'suspend', 'companies', r.cid::text,
            jsonb_build_object('reason', app.subscription_suspend_reason(r.ends_on),
                               'auto', true, 'soft', true));

    insert into public.notifications (user_id, type, title_ar, body_ar, title_en, body_en, data)
    select cm.user_id, 'system', 'انتهى اشتراكك — توقّف عرض منتجاتك',
           'منتجاتك مش ظاهرة للمشترين دلوقتي. ادفع الاشتراك من حسابك وهترجع تلقائيًا.',
           'Subscription expired — listings paused',
           'Your listings are hidden from buyers. Pay the subscription to resume.',
           jsonb_build_object('route', '/contract')
      from public.company_members cm
     where cm.company_id = r.cid and cm.status = 'active';

    v_n := v_n + 1;
  end loop;
  return v_n;
end $fn$;

-- ٣) قيمة اشتراك البائع من خطته — null لو مش على اشتراك ثابت
create or replace function app.seller_subscription_fee(p_company uuid)
returns numeric
language sql
stable
set search_path to 'public', 'pg_temp'
as $fn$
  select bp.fee::numeric
    from public.billing_plans bp
   where bp.subject_type = 'seller' and bp.subject_id = p_company
     and bp.is_active and bp.kind = 'subscription'
   order by bp.created_at desc
   limit 1
$fn$;

-- ٤) رفع الإيقاف — **بس اللي إحنا وقفناه**، مش إيقاف الأدمن اليدوي
create or replace function app.restore_company_after_subscription(p_company uuid)
returns boolean
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $fn$
begin
  if not exists (
    select 1 from public.companies c
     where c.id = p_company and c.suspended_at is not null
       and c.suspend_reason like app.subscription_suspend_tag() || '%'
  ) then
    return false;
  end if;

  update public.companies
     set is_active = true, suspended_at = null,
         suspend_reason = null, suspended_by = null
   where id = p_company;

  insert into public.audit_log (actor_id, action, entity, entity_id, after)
  values (auth.uid(), 'unsuspend', 'companies', p_company::text,
          jsonb_build_object('reason', 'تم سداد الاشتراك', 'auto', true));

  insert into public.notifications (user_id, type, title_ar, body_ar, title_en, body_en, data)
  select cm.user_id, 'system', 'رجع عرض منتجاتك',
         'اتسدّد الاشتراك ورجعت منتجاتك تظهر للمشترين.',
         'Listings resumed', 'Your listings are live again.',
         jsonb_build_object('route', '/contract')
    from public.company_members cm
   where cm.company_id = p_company and cm.status = 'active';

  return true;
end $fn$;

-- ٥) الدفع من محفظة الشركة
create or replace function public.pay_seller_subscription_from_wallet()
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $fn$
declare
  v_company  uuid;
  v_plan     record;
  v_fee      numeric;
  v_wallet   uuid;
  v_days     int := app.setting_int('subscription_period_days', 30);
  v_from     date;
  v_until    date;
  v_fee_id   uuid;
  v_restored boolean;
begin
  select x.id into v_company from (select app.seller_company_ids() as id) x limit 1;
  if v_company is null then
    raise exception 'هذه العملية للبائعين فقط' using errcode = '42501';
  end if;

  select bp.id, bp.kind::text as kind, bp.fee, bp.ends_on into v_plan
    from public.billing_plans bp
   where bp.subject_type = 'seller' and bp.subject_id = v_company
     and bp.is_active and bp.kind = 'subscription'
   order by bp.created_at desc limit 1
   for update;

  if v_plan.id is null then
    raise exception 'حسابك على نظام العمولة مش الاشتراك الثابت' using errcode = '22023';
  end if;

  v_fee := coalesce(v_plan.fee, 0)::numeric;
  if v_fee <= 0 then
    raise exception 'مافيش مبلغ اشتراك محدد على حسابك — كلّم الإدارة' using errcode = '22023';
  end if;

  v_wallet := app.ensure_wallet('company', v_company);

  -- بترمي «الرصيد غير كافٍ» لوحدها لو مافيش فلوس — الشاشة بتحوّله للشحن.
  perform app.post_wallet_txn(v_wallet, 'subscription', (-v_fee)::public.money_kwd,
                              'subscription', v_company, 'اشتراك المنصة');

  v_from  := greatest(coalesce(v_plan.ends_on, current_date), current_date);
  v_until := app.subscription_next_end(v_plan.ends_on, v_days);

  update public.billing_plans set ends_on = v_until where id = v_plan.id;

  insert into public.platform_fees
    (subject_type, subject_id, kind, amount, period_start, period_end, note, created_by)
  values ('seller', v_company, 'subscription', v_fee, v_from, v_until,
          'اشتراك — خصم من محفظة البائع', auth.uid())
  returning id into v_fee_id;

  -- القيد اللي فوق بيولّد `subscription` بـ−fee في الحساب الجاري عن طريق
  -- `tg_ledger_on_seller_subscription`. البائع دفع كاش خلاص، فبنقفل القيد
  -- بـ`settlement` بنفس القيمة ⇒ صافي الأثر صفر. من غير السطر ده يكون دفع
  -- مرتين: من المحفظة وكمان دَين في الحساب الجاري.
  perform app.seller_ledger_post(
    v_company, v_fee, 'settlement', 'fee', v_fee_id,
    'سداد الاشتراك من المحفظة');

  v_restored := app.restore_company_after_subscription(v_company);

  return jsonb_build_object(
    'until', v_until, 'amount', v_fee::text, 'restored', v_restored);
end $fn$;

revoke all on function public.pay_seller_subscription_from_wallet() from public;
grant execute on function public.pay_seller_subscription_from_wallet() to authenticated;

notify pgrst, 'reload schema';
