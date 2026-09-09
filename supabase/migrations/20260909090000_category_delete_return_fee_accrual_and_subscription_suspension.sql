-- ملاحظات لوحة التحكم 003 — تلات حاجات مالهمش علاقة ببعض غير إنهم في نفس
-- الجولة:
--
-- 1) `admin_delete_category`: الحذف كان في التخصص الرئيسي بس، والفرع مالوش زرار.
--
-- 2) `app.return_fee_refunds`: «الرسوم المعادة للبائعين» كانت بتتقرا من صفوف
--    `platform_fees` اللي بتتكتب لحظة استلام المرتجع بس — فالمرتجع اللي لسه
--    مفتوح واللي اتقفل قبل ما الاسترداد يتنفّذ كانوا بيبانوا صفر جنب قيمة
--    مرتجعات بالآلاف. باقي أرقام «المال» كلها استحقاق (العمولة بتتحسب من
--    الطلب مش من التحصيل)، فالاسترداد بقى استحقاق زيها: نصيب العمولة من قيمة
--    المرتجع. الصف المتسجّل فعلاً في `platform_fees` بيغلب الحساب النظري.
--
-- 3) تعليق الاشتراك المنتهي: البائع على اشتراك ثابت بيحوّل قيمته للمنصة عن
--    المدة. لو المدة عدّت من غير سداد، الحساب بيتعلّق تلقائيًا بسبب مكتوب،
--    وتجديد المدة من نفس شاشة الرسوم بيفكّ التعليق.

-- ---------------------------------------------------------------- 1) الحذف
create or replace function public.admin_delete_category(p_id uuid)
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
    raise exception 'معرف التخصص الفرعي مطلوب' using errcode = '22023';
  end if;
  if not exists (select 1 from public.categories c where c.id = p_id) then
    raise exception 'التخصص الفرعي غير موجود' using errcode = 'P0002';
  end if;

  if exists (select 1 from public.categories c where c.parent_id = p_id) then
    raise exception 'التخصص الفرعي تحته فروع — احذف الفروع الأول' using errcode = '23503';
  end if;
  if exists (select 1 from public.products p where p.category_id = p_id)
     or exists (select 1 from public.product_placements pp where pp.category_id = p_id) then
    raise exception 'التخصص الفرعي فيه منتجات — انقلها أو احذفها الأول' using errcode = '23503';
  end if;
  if exists (select 1 from public.discounts d where d.category_id = p_id)
     or exists (select 1 from public.price_rules pr where pr.category_id = p_id) then
    raise exception 'التخصص الفرعي مربوط بخصومات أو قواعد أسعار — شيلها الأول' using errcode = '23503';
  end if;

  delete from public.categories where id = p_id;
end $$;

comment on function public.admin_delete_category(uuid) is
  'حذف تخصص فرعي فاضي — بيرفض لو تحته فروع أو منتجات أو مربوط بخصومات';

-- ------------------------------------------- 2) استرداد عمولة المرتجع كاستحقاق
-- نفس معادلة `receive_return` بالظبط: الكمية المعتمدة × (عمولة الطلب ÷ صافي
-- الطلب). البائع اللي على اشتراك ثابت مالوش استرداد لأنه مادفعش عمولة أصلاً.
create or replace view app.return_fee_refunds as
select r.id                as return_id,
       r.seller_company_id,
       r.requested_at,
       coalesce(
         pf.amount,
         case
           when exists (select 1 from public.billing_plans bp
                         where bp.subject_type = 'seller'
                           and bp.subject_id = r.seller_company_id
                           and bp.is_active
                           and bp.kind = 'subscription')
             then 0
           else round(coalesce(r.total_accepted, 0)
                      * coalesce(o.commission_amount, 0)
                      / nullif(o.subtotal - o.discount_total, 0), 3)
         end,
         0)::numeric       as amount,
       (pf.id is not null)  as is_posted
  from public.return_requests r
  left join public.orders o
         on o.id = r.order_id
  left join public.platform_fees pf
         on pf.return_id = r.id and pf.kind = 'commission_refund';

comment on view app.return_fee_refunds is
  'استرداد عمولة كل مرتجع — الصف المقيّد في platform_fees وإلا نصيب العمولة المستحق';

create or replace function public.admin_finance_stats(p_from date default null, p_to date default null)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $fn$
declare
  v_from timestamptz := case when p_from is null then '-infinity'::timestamptz else app.kw_start(p_from) end;
  v_to   timestamptz := case when p_to   is null then 'infinity'::timestamptz  else app.kw_start(p_to + 1) end;
  v jsonb;
  v_commission numeric;
  v_subs       numeric;
  v_refunded   numeric;
begin
  if not app.is_admin() then
    raise exception 'غير مصرح: هذه العملية للأدمن فقط' using errcode = '42501';
  end if;
  if p_from is not null and p_to is not null and p_to < p_from then
    raise exception 'نطاق تاريخ غير صالح' using errcode = '22007';
  end if;

  select coalesce(sum(o.commission_amount), 0) into v_commission
    from public.orders o
   where o.status <> 'cancelled' and o.placed_at >= v_from and o.placed_at < v_to;

  select coalesce(sum(pf.amount), 0) into v_subs
    from public.platform_fees pf
   where pf.kind = 'subscription' and pf.collected_at >= v_from and pf.collected_at < v_to;

  -- بنفس فترة «قيمة المرتجعات» (تاريخ طلب الإرجاع) عشان الرقمين يتقارنوا:
  -- ١١ هو نصيب المنصة من ١٠.
  select coalesce(sum(f.amount), 0) into v_refunded
    from app.return_fee_refunds f
   where f.requested_at >= v_from and f.requested_at < v_to;

  select jsonb_build_object(
    -- 01..03 الحسابات
    'individual_buyers', (select count(*) from public.profiles
                           where role = 'individual_buyer' and deleted_at is null
                             and parent_account_id is null),
    'company_buyers',    (select count(*) from public.profiles
                           where role = 'company_buyer' and deleted_at is null
                             and parent_account_id is null),
    'sellers',           (select count(*) from public.companies
                           where type = 'seller' and deleted_at is null),
    -- 04..05 البيع
    'n_sales',    (select count(*) from public.orders o
                    where o.status <> 'cancelled' and o.placed_at >= v_from and o.placed_at < v_to),
    'sales_value',(select coalesce(sum(o.grand_total), 0) from public.orders o
                    where o.status <> 'cancelled' and o.placed_at >= v_from and o.placed_at < v_to)::text,
    -- 06..08 دخل المنصة
    'fees_total',   (v_commission + v_subs)::text,
    'subscriptions', v_subs::text,
    'commission',    v_commission::text,
    'gross_profit', (v_commission + v_subs)::text,
    -- 09..12 المرتجعات
    'n_returns',    (select count(*) from public.return_requests r
                      where r.requested_at >= v_from and r.requested_at < v_to),
    'returns_value',(select coalesce(sum(r.refund_amount), 0) from public.return_requests r
                      where r.requested_at >= v_from and r.requested_at < v_to)::text,
    'fees_refunded', v_refunded::text,
    'net_profit',   (v_commission + v_subs - v_refunded)::text,
    -- 13 الحسابات النشطة/غير النشطة
    'accounts_active',   (select count(*) from public.profiles
                           where deleted_at is null and status = 'active' and role <> 'admin')
                       + (select count(*) from public.companies
                           where deleted_at is null and is_active and type = 'seller'),
    'accounts_inactive', (select count(*) from public.profiles
                           where deleted_at is null and status <> 'active' and role <> 'admin')
                       + (select count(*) from public.companies
                           where deleted_at is null and not is_active and type = 'seller'),
    -- 14 الطلبات
    'orders_completed', (select count(*) from public.orders o
                          where o.status = 'delivered' and o.placed_at >= v_from and o.placed_at < v_to),
    'orders_cancelled', (select count(*) from public.orders o
                          where o.status = 'cancelled' and o.placed_at >= v_from and o.placed_at < v_to),
    'orders_returned',  (select count(distinct r.order_id) from public.return_requests r
                          where r.requested_at >= v_from and r.requested_at < v_to)
  ) into v;

  return v;
end $fn$;

create or replace function public.admin_returns_stats(p_from date default null, p_to date default null)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $fn$
declare v jsonb; v_fees numeric;
begin
  if not app.is_admin() then
    raise exception 'غير مصرح: هذه العملية للأدمن فقط' using errcode = '42501';
  end if;
  if p_from is not null and p_to is not null and p_to < p_from then
    raise exception 'نطاق تاريخ غير صالح' using errcode = '22007';
  end if;

  select coalesce(sum(f.amount), 0) into v_fees
    from app.return_fee_refunds f
   where (p_from is null or f.requested_at >= app.kw_start(p_from))
     and (p_to   is null or f.requested_at <  app.kw_start(p_to + 1));

  select jsonb_build_object(
           'n_returns', count(*),
           'n_items',   coalesce(sum(r.n_items), 0),
           'n_sites',   count(distinct r.site_key),
           'n_orders',  count(distinct r.order_id),
           'n_buyers',  count(distinct r.buyer_id),
           'n_sellers', count(distinct r.seller_company_id),
           'refund',    coalesce(sum(r.refund_amount::numeric), 0)::text,
           'fees_refunded', v_fees::text)
    into v
    from app.returns_rows(p_from, p_to, null, 'all') r;

  return v;
end $fn$;

create or replace function public.admin_finance_returns(
  p_from date default null,
  p_to date default null,
  p_search text default null,
  p_limit integer default 25,
  p_offset integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $fn$
declare v_rows jsonb; v_total bigint; v_sum jsonb; v_q text;
begin
  if not app.is_admin() then
    raise exception 'غير مصرح: هذه العملية للأدمن فقط' using errcode = '42501';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 200 then
    raise exception 'حجم الصفحة يجب أن يكون بين 1 و 200' using errcode = '22023';
  end if;
  v_q := nullif(trim(coalesce(p_search, '')), '');

  with rows as (
    select r.id,
           r.return_number,
           o.id                              as order_id,
           o.order_number,
           b.full_name                       as buyer_name,
           s.name_ar                         as seller_name,
           r.status::text                    as status,
           r.refund_amount::text             as refund_amount,
           coalesce(fr.amount, 0)::text      as fees_refunded,
           coalesce(r.refunded_at, r.received_at, r.requested_at) as executed_at,
           (select coalesce(sum(ri.qty_accepted), 0) from public.return_items ri
             where ri.return_id = r.id)::text as n_items
      from public.return_requests r
      join public.orders o    on o.id = r.order_id
      join public.profiles b  on b.id = r.buyer_id
      join public.companies s on s.id = r.seller_company_id
      left join app.return_fee_refunds fr on fr.return_id = r.id
     where (p_from is null or r.requested_at >= app.kw_start(p_from))
       and (p_to   is null or r.requested_at <  app.kw_start(p_to + 1))
       and (v_q is null
            or r.return_number ilike '%' || v_q || '%'
            or o.order_number  ilike '%' || v_q || '%'
            or b.full_name     ilike '%' || v_q || '%'
            or s.name_ar       ilike '%' || v_q || '%')
  )
  select coalesce(jsonb_agg(to_jsonb(t) order by t.executed_at desc), '[]'::jsonb),
         (select count(*) from rows),
         (select jsonb_build_object(
                   'n_returns', count(*),
                   'refund',    coalesce(sum(refund_amount::numeric), 0)::text,
                   'fees',      coalesce(sum(fees_refunded::numeric), 0)::text)
            from rows)
    into v_rows, v_total, v_sum
    from (select * from rows order by executed_at desc
           limit p_limit offset greatest(coalesce(p_offset, 0), 0)) t;

  return jsonb_build_object('rows', v_rows, 'total', v_total, 'summary', v_sum);
end $fn$;

-- ------------------------------------------- 3) تعليق الاشتراك اللي مدته خلصت
-- التعليق كان للأدمن بس (`admin_suspend_*`)، والوردية التلقائية محتاجة نفس
-- الخطوات من غير بوابة الأدمن — فالجزء اللي بيعمل الشغل اتنقل جوه `app` والدوال
-- الإدارية بقت غلاف تحقّق فوقه. الجسم زي ما هو بالحرف.
create or replace function app.suspend_company_internal(
  p_company_id uuid, p_reason text, p_by uuid
)
returns boolean
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare v_at timestamptz := now();
begin
  -- تعليق تاني كان هيغيّر ختم الشركة من غير ما يلمس الأعضاء، وساعتها إعادة
  -- التفعيل ماتلاقيش صف يطابق الختم الجديد فتسيبهم موقوفين للأبد.
  if exists (select 1 from public.companies
              where id = p_company_id and suspended_at is not null) then
    return false;
  end if;

  update public.companies
     set is_active = false, suspended_at = v_at,
         suspend_reason = trim(p_reason), suspended_by = p_by
   where id = p_company_id;

  -- الموظف اللي كان موقوف لوحده قبل كده مابنلمسوش (suspended_at is null)،
  -- واللي مش نشط (pending/rejected) بنسيبه على حاله عشان إعادة التفعيل
  -- ماترقّيهوش لـ active.
  update public.profiles p
     set status = 'suspended', suspended_at = v_at,
         suspend_reason = trim(p_reason), suspended_by = p_by
   where p.suspended_at is null
     and p.status = 'active'
     and p.role <> 'admin'
     and (exists (select 1 from public.company_members cm
                   where cm.company_id = p_company_id and cm.user_id = p.id)
       or exists (select 1 from public.company_members cm
                   where cm.company_id = p_company_id and cm.user_id = p.parent_account_id));

  update public.company_subusers
     set status = 'suspended', suspended_at = v_at
   where company_id = p_company_id and status = 'active' and suspended_at is null;

  insert into public.audit_log (actor_id, action, entity, entity_id, after)
  values (p_by, 'suspend', 'companies', p_company_id::text,
          jsonb_build_object('reason', trim(p_reason), 'at', v_at));

  return true;
end $$;

create or replace function app.suspend_profile_internal(
  p_profile_id uuid, p_reason text, p_by uuid
)
returns boolean
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare v_at timestamptz := now();
begin
  if not exists (select 1 from public.profiles
                  where id = p_profile_id and status = 'active' and suspended_at is null) then
    return false;
  end if;

  update public.profiles
     set status = 'suspended', suspended_at = v_at,
         suspend_reason = trim(p_reason), suspended_by = p_by
   where (id = p_profile_id or parent_account_id = p_profile_id)
     and status = 'active'
     and suspended_at is null;

  update public.company_subusers
     set status = 'suspended', suspended_at = v_at
   where owner_id = p_profile_id and status = 'active' and suspended_at is null;

  insert into public.audit_log (actor_id, action, entity, entity_id, after)
  values (p_by, 'suspend', 'profiles', p_profile_id::text,
          jsonb_build_object('reason', trim(p_reason), 'at', v_at));

  return true;
end $$;

create or replace function public.admin_suspend_company(p_company_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if not app.is_admin() then
    raise exception 'غير مصرح: هذه العملية للأدمن فقط' using errcode = '42501';
  end if;
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'سبب التعليق مطلوب' using errcode = '22023';
  end if;
  if not exists (select 1 from public.companies where id = p_company_id) then
    raise exception 'الشركة غير موجودة' using errcode = '22023';
  end if;

  if not app.suspend_company_internal(p_company_id, p_reason, auth.uid()) then
    raise exception 'الشركة موقوفة بالفعل' using errcode = '22023';
  end if;
end $$;

create or replace function public.admin_suspend_account(p_profile_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare v_status public.account_status;
begin
  if not app.is_admin() then
    raise exception 'غير مصرح: هذه العملية للأدمن فقط' using errcode = '42501';
  end if;
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'سبب التعليق مطلوب' using errcode = '22023';
  end if;
  if p_profile_id = auth.uid() then
    raise exception 'لا يمكنك تعليق حسابك' using errcode = '22023';
  end if;

  select status into v_status from public.profiles where id = p_profile_id;
  if not found then
    raise exception 'الحساب غير موجود' using errcode = '22023';
  end if;
  if exists (select 1 from public.profiles where id = p_profile_id and role = 'admin') then
    raise exception 'لا يمكن تعليق حساب إداري' using errcode = '22023';
  end if;
  -- مافيش عمود بيحفظ الحالة قبل التعليق، وإعادة التفعيل بترجّع 'active' دايمًا،
  -- فتعليق حساب pending/rejected كان هيرقّيه غصب. بنمنع التعليق من الأصل.
  if v_status <> 'active' then
    raise exception 'لا يمكن تعليق حساب غير نشط' using errcode = '22023';
  end if;

  perform app.suspend_profile_internal(p_profile_id, p_reason, auth.uid());
end $$;

-- السبب بيبدأ بالجملة دي دايمًا: التجديد بيدوّر عليها عشان يفكّ التعليق
-- التلقائي بس، ومايلمسش حساب اتقفل بسبب مخالفة.
create or replace function app.subscription_suspend_reason(p_ends_on date)
returns text
language sql
immutable
as $$ select 'عدم سداد الاشتراك — انتهت مدة الخطة في ' || to_char(p_ends_on, 'YYYY-MM-DD') $$;

create or replace function app.suspend_expired_subscriptions()
returns integer
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare v_n integer := 0; r record;
begin
  for r in
    select bp.subject_type::text as subject_type, bp.subject_id, bp.ends_on
      from public.billing_plans bp
     where bp.is_active
       and bp.kind = 'subscription'
       and bp.ends_on is not null
       and bp.ends_on < current_date
  loop
    if r.subject_type = 'seller' then
      if exists (select 1 from public.companies c
                  where c.id = r.subject_id and c.deleted_at is null
                    and c.is_active and c.suspended_at is null)
         and app.suspend_company_internal(
               r.subject_id, app.subscription_suspend_reason(r.ends_on), null) then
        v_n := v_n + 1;
      end if;
    else
      if exists (select 1 from public.profiles p
                  where p.id = r.subject_id and p.deleted_at is null
                    and p.status = 'active' and p.suspended_at is null)
         and app.suspend_profile_internal(
               r.subject_id, app.subscription_suspend_reason(r.ends_on), null) then
        v_n := v_n + 1;
      end if;
    end if;
  end loop;
  return v_n;
end $$;

comment on function app.suspend_expired_subscriptions() is
  'تعليق أي حساب على اشتراك ثابت عدّت مدته من غير تجديد — وردية يومية';

select cron.unschedule('suspend-expired-subscriptions')
 where exists (select 1 from cron.job where jobname = 'suspend-expired-subscriptions');

select cron.schedule('suspend-expired-subscriptions', '20 0 * * *',
                     $cron$select app.suspend_expired_subscriptions()$cron$);

-- تجديد المدة (أو التحويل لنسبة) بيفكّ التعليق التلقائي من نفس الشاشة، وإلا
-- كان الأدمن هيجدّد الرسوم ويفضل الحساب مقفول من غير سبب ظاهر.
create or replace function public.admin_set_billing_plan(
  p_subject_type text, p_subject_id uuid, p_kind text,
  p_rate numeric default null, p_fee numeric default 0,
  p_starts_on date default null, p_ends_on date default null,
  p_cycles integer default null, p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare v_id uuid;
begin
  if not app.is_admin() then
    raise exception 'غير مصرح: هذه العملية للأدمن فقط' using errcode = '42501';
  end if;
  if p_subject_type not in ('individual_buyer','company_buyer','seller') then
    raise exception 'نوع حساب غير معروف: %', p_subject_type using errcode = '22023';
  end if;
  if p_kind not in ('commission','subscription') then
    raise exception 'نوع رسوم غير معروف: %', p_kind using errcode = '22023';
  end if;
  if p_kind = 'commission' and (p_rate is null or p_rate < 0 or p_rate > 100) then
    raise exception 'نسبة العمولة يجب أن تكون بين 0 و 100' using errcode = '22023';
  end if;
  if p_kind = 'subscription' and (p_fee is null or p_fee < 0) then
    raise exception 'قيمة الاشتراك لا يمكن أن تكون سالبة' using errcode = '22023';
  end if;
  if p_subject_type <> 'seller' and p_kind = 'commission' then
    raise exception 'المشتري لا يدفع نسبة — الاشتراك فقط' using errcode = '22023';
  end if;

  update public.billing_plans
     set is_active = false, updated_at = now()
   where subject_type = p_subject_type::public.billing_subject
     and subject_id = p_subject_id
     and is_active;

  insert into public.billing_plans
    (subject_type, subject_id, kind, rate, fee, starts_on, ends_on, cycles, note, created_by)
  values
    (p_subject_type::public.billing_subject, p_subject_id, p_kind::public.billing_kind,
     case when p_kind = 'commission' then p_rate end,
     case when p_kind = 'subscription' then coalesce(p_fee, 0) else 0 end,
     p_starts_on, p_ends_on, p_cycles, nullif(trim(coalesce(p_note, '')), ''), auth.uid())
  returning id into v_id;

  if p_subject_type = 'seller' then
    update public.companies
       set commission_rate = case when p_kind = 'commission' then p_rate else 0 end
     where id = p_subject_id;
  end if;

  -- الخطة الجديدة سارية؟ يبقى سبب التعليق التلقائي راح
  if p_ends_on is null or p_ends_on >= current_date then
    if p_subject_type = 'seller' then
      if exists (select 1 from public.companies c
                  where c.id = p_subject_id and c.suspended_at is not null
                    and c.suspend_reason like 'عدم سداد الاشتراك%') then
        perform public.admin_reactivate_company(p_subject_id);
      end if;
    else
      if exists (select 1 from public.profiles p
                  where p.id = p_subject_id and p.suspended_at is not null
                    and p.suspend_reason like 'عدم سداد الاشتراك%') then
        perform public.admin_reactivate_account(p_subject_id);
      end if;
    end if;
  end if;

  insert into public.audit_log (actor_id, action, entity, entity_id, after)
  values (auth.uid(), 'set_billing_plan', 'billing_plans', v_id::text,
          jsonb_build_object('subject_type', p_subject_type, 'subject_id', p_subject_id,
                             'kind', p_kind, 'rate', p_rate, 'fee', p_fee,
                             'starts_on', p_starts_on, 'ends_on', p_ends_on));
  return v_id;
end $$;
