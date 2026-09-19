-- اشتراك المشتري (٣/٣): الدفع والتحصيل والتجديد التلقائي.
--
-- **دي أول مرة `platform_fees` ياخد صف اشتراك.** الجدول ده هو مصدر كارت
-- «اشتراكات المشترين» في صفحة المال، وكان فاضي تمامًا — عشان كده اشتراك
-- الـ1 د.ك اللي كان متسجّل على حساب فردي عمره ما ظهر في أي رقم.
--
-- مسارين للدفع، والاتنين بيخلصوا عند `app.collect_subscription`:
--   المحفظة ⇒ `pay_subscription_from_wallet` (فوري)
--   KNET/بطاقة ⇒ `payment-init` بيسجّل دفعة، والبوابة بتأكّدها،
--                و`app.confirm_payment` بيوجّهها هنا.
--
-- **المبلغ مابيجيش من العميل أبدًا** — بيتقرا من `app_settings` لحظة التحصيل،
-- وبيتسجّل في `platform_fees` فبيفضل محفوظ بقيمته وقتها لو السعر اتغيّر بعدين.

alter table public.payments
  add column if not exists subscription_profile_id uuid references public.profiles(id);

comment on column public.payments.subscription_profile_id is
  'دفعة اشتراك: الحساب اللي هيتمدّد. `wallet_id` = شحن · `order_group_id` = طلب.';

-- ---------------------------------------------------------------------------

/**
 * نهاية الدورة الجديدة.
 *
 * بيجدّد بدري (لسه سارٍ) ⇒ بنضيف على تاريخ الانتهاء عشان ما ياخدش أيام ناقصة.
 * منتهي خلاص ⇒ بنبدأ من النهارده، مش من تاريخ الانتهاء القديم — ما بنحاسبوش
 * بأثر رجعي على أيام ما استخدمش فيها.
 */
create or replace function app.subscription_next_end(p_until date, p_days int)
returns date
language sql
immutable
as $fn$ select greatest(coalesce(p_until, current_date), current_date) + p_days $fn$;

/**
 * تحصيل دورة اشتراك: قيد في دفتر رسوم المنصة + تمديد التاريخ + إشعار.
 *
 * بيقفل صف الحساب عشان محاولتين متوازيتين (تجديد تلقائي وضغطة زرار في نفس
 * اللحظة) ما ياخدوش دورتين بمبلغين.
 */
create or replace function app.collect_subscription(
  p_profile_id uuid,
  p_amount     numeric,
  p_note       text default null,
  p_payment_id uuid default null
) returns date
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $fn$
declare
  v_role  text;
  v_until date;
  v_days  int := app.setting_int('subscription_period_days', 30);
  v_new   date;
begin
  select p.role::text, p.subscribed_until into v_role, v_until
    from public.profiles p where p.id = p_profile_id for update;

  if v_role is null then
    raise exception 'الحساب غير موجود' using errcode = 'P0002';
  end if;
  if v_role not in ('individual_buyer', 'company_buyer') then
    raise exception 'الاشتراك للمشترين فقط' using errcode = '22023';
  end if;

  v_new := app.subscription_next_end(v_until, v_days);

  insert into public.platform_fees
    (subject_type, subject_id, kind, amount, period_start, period_end, note, created_by)
  values
    (v_role::public.billing_subject, p_profile_id, 'subscription', p_amount,
     greatest(coalesce(v_until, current_date), current_date), v_new,
     nullif(trim(coalesce(p_note, '')), ''), auth.uid());

  update public.profiles set subscribed_until = v_new where id = p_profile_id;

  if p_payment_id is not null then
    update public.payments set subscription_profile_id = p_profile_id
     where id = p_payment_id and subscription_profile_id is null;
  end if;

  insert into public.notifications (user_id, type, title_ar, body_ar, title_en, body_en, data)
  values (p_profile_id, 'system', 'تم تجديد اشتراكك',
          'اشتراكك سارٍ حتى ' || to_char(v_new, 'YYYY-MM-DD') || '.',
          'Subscription renewed',
          'Your subscription is active until ' || to_char(v_new, 'YYYY-MM-DD') || '.',
          jsonb_build_object('route', '/subscription', 'until', v_new));

  return v_new;
end $fn$;

-- ---------------------------------------------------------------------------
-- الحساب الجديد
--
-- من غير التريجر ده الحساب الجديد بيبقى `null` = مشترك قط، فيفتح التطبيق
-- يلاقيه متقفل من أول ثانية. `subscription_trial_days = 0` معناها يوم واحد
-- سارٍ (النهارده) وبعدين يدفع — غيّر الرقم من الإعدادات وقت ما تحب.

create or replace function app.start_buyer_trial()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $fn$
begin
  if new.parent_account_id is null
     and new.role in ('individual_buyer', 'company_buyer')
     and new.subscribed_until is null then
    new.subscribed_until := current_date + app.setting_int('subscription_trial_days', 0);
  end if;
  return new;
end $fn$;

drop trigger if exists t_profiles_start_buyer_trial on public.profiles;
create trigger t_profiles_start_buyer_trial
  before insert on public.profiles
  for each row execute function app.start_buyer_trial();

-- ---------------------------------------------------------------------------
-- الدفع من المحفظة
--
-- `app.account_user_id()` مش النسخة المحروسة — دي الشاشة الوحيدة اللي لازم
-- تشتغل والاشتراك منتهي، وإلا الحساب بيتقفل على نفسه.

create or replace function public.pay_subscription_from_wallet()
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $fn$
declare
  v_id     uuid := app.account_user_id();
  v_role   text;
  v_fee    numeric;
  v_wallet uuid;
  v_until  date;
begin
  if v_id is null then
    raise exception 'الحساب غير نشط' using errcode = '42501';
  end if;

  select p.role::text into v_role from public.profiles p where p.id = v_id;
  if v_role not in ('individual_buyer', 'company_buyer') then
    raise exception 'الاشتراك للمشترين فقط' using errcode = '22023';
  end if;

  v_fee := app.subscription_fee(v_role);

  -- سعر صفر (فترة مجانية قررتها من الإعدادات) ⇒ تمديد من غير حركة محفظة.
  if v_fee <= 0 then
    return jsonb_build_object(
      'until', app.collect_subscription(v_id, 0, 'اشتراك مجاني'), 'amount', '0');
  end if;

  select w.id into v_wallet
    from public.wallets w where w.owner_type = 'user' and w.owner_id = v_id;
  if v_wallet is null then
    raise exception 'المحفظة غير موجودة' using errcode = 'P0002';
  end if;

  -- بترمي «الرصيد غير كافٍ» لوحدها لو مافيش فلوس — الشاشة بتحوّله للشحن.
  perform app.post_wallet_txn(v_wallet, 'subscription', (-v_fee)::public.money_kwd,
                              'subscription', v_id, 'اشتراك المنصة');

  v_until := app.collect_subscription(v_id, v_fee, 'خصم من المحفظة');
  return jsonb_build_object('until', v_until, 'amount', v_fee::text);
end $fn$;

-- ---------------------------------------------------------------------------
-- الدفع بالبوابة: فرع تالت في تأكيد الدفعة.
--
-- الترتيب مهم — دفعة الاشتراك مالهاش `wallet_id` (مش شحن) ولا `order_group_id`
-- (مش طلب)، فلازم تتفحص قبل ما الدالة ترجع من الفرعين دول.

create or replace function app.confirm_payment(p_payment_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $fn$
declare
  v_group  uuid;
  v_wallet uuid;
  v_amount public.money_kwd;
  v_user   uuid;
  v_sub    uuid;
begin
  update public.payments set status = 'paid', paid_at = now()
   where id = p_payment_id and status <> 'paid'
  returning order_group_id, wallet_id, amount, user_id, subscription_profile_id
       into v_group, v_wallet, v_amount, v_user, v_sub;

  if not found then return; end if;

  if v_sub is not null then
    perform app.collect_subscription(v_sub, v_amount, 'دفع إلكتروني', p_payment_id);
    return;
  end if;

  if v_wallet is not null then
    perform app.post_wallet_txn(v_wallet, 'topup', v_amount,
                                'payment', p_payment_id, 'شحن رصيد');

    insert into public.notifications (user_id, type, title_ar, body_ar, title_en, body_en, data)
    values (v_user, 'wallet', 'تم شحن رصيدك',
            'تمت إضافة ' || trim(to_char(v_amount, 'FM999999990.000')) || ' د.ك إلى رصيدك.',
            'Wallet topped up',
            trim(to_char(v_amount, 'FM999999990.000')) || ' KWD has been added to your balance.',
            jsonb_build_object('route', '/wallet'));
    return;
  end if;

  if v_group is null then return; end if;

  update public.order_groups set payment_status = 'paid' where id = v_group;
  update public.orders
     set status = 'confirmed', payment_status = 'paid', confirmed_at = now()
   where order_group_id = v_group and status = 'awaiting_payment';

  perform app.issue_invoice(o.id) from public.orders o where o.order_group_id = v_group;
end $fn$;

-- ---------------------------------------------------------------------------
-- الكنس اليومي: تجديد تلقائي + تذكير + إشعار انتهاء.
--
-- التجديد بيحصل في **آخر يوم سارٍ** مش بعد الانتهاء: كده مفيش يوم بينّهم
-- الحساب يبقى فيه متقفل وهو دافع.
--
-- الحساب اللي `subscribed_until` بتاعه `null` بره الكنس عن قصد: ده حساب عمره
-- ما اشترك، وخصم فلوس من محفظته من غير ما يطلب مفاجأة مش تجديد.

create or replace function app.sweep_subscriptions()
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $fn$
declare
  r          record;
  v_renewed  int := 0;
  v_reminded int := 0;
  v_expired  int := 0;
  v_remind   int := app.setting_int('subscription_reminder_days', 3);
  v_fee      numeric;
  v_wallet   uuid;
  v_balance  numeric;
begin
  for r in
    select p.id, p.role::text as role, p.subscribed_until
      from public.profiles p
     where p.deleted_at is null and p.parent_account_id is null
       and p.role in ('individual_buyer', 'company_buyer')
       and p.subscribed_until is not null
       and p.subscribed_until <= current_date
  loop
    v_fee := app.subscription_fee(r.role);

    select w.id, w.balance into v_wallet, v_balance
      from public.wallets w
     where w.owner_type = 'user' and w.owner_id = r.id and not w.is_frozen;

    if v_fee <= 0 then
      perform app.collect_subscription(r.id, 0, 'اشتراك مجاني');
      v_renewed := v_renewed + 1;
    elsif v_wallet is not null and v_balance >= v_fee then
      perform app.post_wallet_txn(v_wallet, 'subscription', (-v_fee)::public.money_kwd,
                                  'subscription', r.id, 'اشتراك المنصة — تجديد تلقائي');
      perform app.collect_subscription(r.id, v_fee, 'تجديد تلقائي من المحفظة');
      v_renewed := v_renewed + 1;
    elsif r.subscribed_until = current_date - 1 then
      -- انتهى ومافيش رصيد ⇒ إشعار مرة واحدة يوم الانتهاء بس، مش كل يوم
      insert into public.notifications (user_id, type, title_ar, body_ar, title_en, body_en, data)
      values (r.id, 'system', 'انتهى اشتراكك',
              'اشتراكك انتهى والخدمات متوقفة. جدّد للمتابعة.',
              'Subscription expired',
              'Your subscription has expired. Renew to continue.',
              jsonb_build_object('route', '/subscription'));
      v_expired := v_expired + 1;
    end if;
  end loop;

  -- تذكير قبل الانتهاء لمن رصيده لا يغطي — اللي رصيده يغطي هيتجدد لوحده
  -- فتذكيره إزعاج من غير داعي.
  for r in
    select p.id, p.role::text as role, p.subscribed_until
      from public.profiles p
     where p.deleted_at is null and p.parent_account_id is null
       and p.role in ('individual_buyer', 'company_buyer')
       and p.subscribed_until = current_date + v_remind
  loop
    v_fee := app.subscription_fee(r.role);
    select w.balance into v_balance
      from public.wallets w
     where w.owner_type = 'user' and w.owner_id = r.id and not w.is_frozen;

    if v_fee > 0 and coalesce(v_balance, 0) < v_fee then
      insert into public.notifications (user_id, type, title_ar, body_ar, title_en, body_en, data)
      values (r.id, 'system', 'اشتراكك قارب على الانتهاء',
              'اشتراكك ينتهي خلال ' || v_remind || ' أيام. رصيد محفظتك لا يكفي للتجديد التلقائي.',
              'Subscription ending soon',
              'Your subscription ends in ' || v_remind || ' days and your wallet balance is not enough.',
              jsonb_build_object('route', '/subscription'));
      v_reminded := v_reminded + 1;
    end if;
  end loop;

  return jsonb_build_object('renewed', v_renewed, 'reminded', v_reminded, 'expired', v_expired);
end $fn$;

select cron.schedule('sweep-subscriptions', '30 0 * * *', 'select app.sweep_subscriptions()');

notify pgrst, 'reload schema';
