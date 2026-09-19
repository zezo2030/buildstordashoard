-- دفع اشتراك البائع بكي نت/بطاقة في خطوة واحدة.
--
-- قبل كده كان لازم خطوتين: يشحن محفظة الشركة بكي نت، وبعدين يدفع منها.
-- كل خطوة فيهم ممكن تقف في النص، والبائع الموقوف يفضل موقوف وهو دافع.
--
-- الدفعة كانت لازم تشاور على هدف واحد من تلاتة (طلب / محفظة / اشتراك مشتري)،
-- و«اشتراك مشتري» عمود بيشاور على `profiles`. اشتراك البائع على **شركة**،
-- فمحتاج عمود رابع.
--
-- وأهم حاجة: منطق تحصيل اشتراك البائع كان مكتوب جوه
-- `pay_seller_subscription_from_wallet`. لو نسخته في `confirm_payment` كان
-- هيبقى تعريفين للحاجة الواحدة — ومن الأول في الجلسة دي ده بالظبط مصدر كل
-- الأرقام اللي مااتطابقتش. فاتشال لدالة واحدة والمسارين بينادوا عليها.

-- ١) هدف رابع للدفعة
alter table public.payments
  add column if not exists subscription_company_id uuid
    references public.companies(id) on delete set null;

create index if not exists payments_subscription_company_idx
  on public.payments (subscription_company_id)
  where subscription_company_id is not null;

alter table public.payments drop constraint if exists payments_target_ck;
alter table public.payments add constraint payments_target_ck
  check ( (order_group_id is not null)::int
        + (wallet_id is not null)::int
        + (subscription_profile_id is not null)::int
        + (subscription_company_id is not null)::int = 1 );

-- ٢) التحصيل في مكان واحد — المحفظة والبوابة بينادوا عليه
create or replace function app.collect_seller_subscription(
  p_company uuid,
  p_amount numeric,
  p_note text default null,
  p_payment_id uuid default null
)
returns date
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $fn$
declare
  v_plan   record;
  v_days   int := app.setting_int('subscription_period_days', 30);
  v_from   date;
  v_until  date;
  v_fee_id uuid;
begin
  select bp.id, bp.ends_on into v_plan
    from public.billing_plans bp
   where bp.subject_type = 'seller' and bp.subject_id = p_company
     and bp.is_active and bp.kind = 'subscription'
   order by bp.created_at desc limit 1
   for update;

  if v_plan.id is null then
    raise exception 'الحساب على نظام العمولة مش الاشتراك الثابت' using errcode = '22023';
  end if;

  v_from  := greatest(coalesce(v_plan.ends_on, current_date), current_date);
  v_until := app.subscription_next_end(v_plan.ends_on, v_days);

  update public.billing_plans set ends_on = v_until where id = v_plan.id;

  insert into public.platform_fees
    (subject_type, subject_id, kind, amount, period_start, period_end, note, created_by)
  values ('seller', p_company, 'subscription', p_amount, v_from, v_until,
          nullif(trim(coalesce(p_note, '')), ''), auth.uid())
  returning id into v_fee_id;

  -- القيد اللي فوق بيولّد `subscription` بـ−amount في الحساب الجاري عن طريق
  -- `tg_ledger_on_seller_subscription`. البائع دفع خلاص (محفظة أو بطاقة)،
  -- فبنقفل القيد بـ`settlement` بنفس القيمة ⇒ صافي الأثر صفر. من غير السطر
  -- ده يكون دفع مرتين: كاش وكمان دَين في الحساب الجاري.
  perform app.seller_ledger_post(
    p_company, p_amount, 'settlement', 'fee', v_fee_id,
    coalesce(nullif(trim(coalesce(p_note, '')), ''), 'سداد الاشتراك'));

  perform app.restore_company_after_subscription(p_company);

  insert into public.notifications (user_id, type, title_ar, body_ar, title_en, body_en, data)
  select cm.user_id, 'system', 'تم تجديد اشتراكك',
         'اشتراكك سارٍ حتى ' || to_char(v_until, 'YYYY-MM-DD') || '.',
         'Subscription renewed',
         'Your subscription is active until ' || to_char(v_until, 'YYYY-MM-DD') || '.',
         jsonb_build_object('route', '/contract', 'until', v_until)
    from public.company_members cm
   where cm.company_id = p_company and cm.status = 'active';

  if p_payment_id is not null then
    update public.payments set subscription_company_id = p_company
     where id = p_payment_id and subscription_company_id is null;
  end if;

  return v_until;
end $fn$;

-- ٣) مسار المحفظة بقى غلاف: بيخصم وبعدين بينده على التحصيل المشترك
create or replace function public.pay_seller_subscription_from_wallet()
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $fn$
declare
  v_company uuid;
  v_fee     numeric;
  v_wallet  uuid;
  v_until   date;
begin
  select x.id into v_company from (select app.seller_company_ids() as id) x limit 1;
  if v_company is null then
    raise exception 'هذه العملية للبائعين فقط' using errcode = '42501';
  end if;

  v_fee := app.seller_subscription_fee(v_company);
  if v_fee is null then
    raise exception 'حسابك على نظام العمولة مش الاشتراك الثابت' using errcode = '22023';
  end if;
  if v_fee <= 0 then
    raise exception 'مافيش مبلغ اشتراك محدد على حسابك — كلّم الإدارة' using errcode = '22023';
  end if;

  v_wallet := app.ensure_wallet('company', v_company);

  -- بترمي «الرصيد غير كافٍ» لوحدها لو مافيش فلوس — الشاشة بتحوّله للشحن.
  perform app.post_wallet_txn(v_wallet, 'subscription', (-v_fee)::public.money_kwd,
                              'subscription', v_company, 'اشتراك المنصة');

  v_until := app.collect_seller_subscription(
    v_company, v_fee, 'اشتراك — خصم من محفظة البائع');

  return jsonb_build_object(
    'until', v_until, 'amount', v_fee::text,
    'restored', not exists (select 1 from public.companies c
                             where c.id = v_company and c.suspended_at is not null));
end $fn$;

-- ٤) تأكيد الدفعة: هدف رابع
create or replace function app.confirm_payment(p_payment_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $fn$
declare
  v_group   uuid;
  v_wallet  uuid;
  v_amount  public.money_kwd;
  v_user    uuid;
  v_sub     uuid;
  v_company uuid;
begin
  update public.payments set status = 'paid', paid_at = now()
   where id = p_payment_id and status <> 'paid'
  returning order_group_id, wallet_id, amount, user_id,
            subscription_profile_id, subscription_company_id
       into v_group, v_wallet, v_amount, v_user, v_sub, v_company;

  if not found then return; end if;

  if v_company is not null then
    perform app.collect_seller_subscription(
      v_company, v_amount::numeric, 'اشتراك — دفع إلكتروني', p_payment_id);
    return;
  end if;

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

notify pgrst, 'reload schema';
