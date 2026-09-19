-- شاشة العقد عند البائع كانت بتعرض التاريخ وزرار «اطلب التجديد» وبس. عشان
-- يقدر يدفع بنفسه محتاجة كمان: هو متوقف بسبب الاشتراك ولا لأ، المبلغ كام،
-- رصيد محفظته كام، والرصيد يغطي ولا لازم يشحن.
--
-- المفاتيح كلها **إضافة** — الشاشة القديمة ما بتتكسرش.

create or replace function public.my_seller_contract()
returns jsonb
language plpgsql
stable security definer
set search_path to 'public', 'pg_temp'
as $fn$
declare
  v_company uuid;
  v_plan    record;
  v_req     record;
  v_co      record;
  v_fee     numeric;
  v_bal     numeric;
  v_wallet  uuid;
begin
  select x.id into v_company from (select app.seller_company_ids() as id) x limit 1;
  if v_company is null then
    raise exception 'هذه الشاشة للبائعين فقط' using errcode = '42501';
  end if;

  select c.name_ar, c.is_active, c.suspended_at, c.suspend_reason
    into v_co from public.companies c where c.id = v_company;

  select bp.kind::text as kind, bp.rate, bp.fee, bp.starts_on, bp.ends_on
    into v_plan
    from public.billing_plans bp
   where bp.subject_type = 'seller' and bp.subject_id = v_company and bp.is_active
   order by bp.created_at desc limit 1;

  select r.id, r.status, r.requested_at, r.decided_at, r.admin_note, r.new_ends_on
    into v_req
    from public.seller_renewal_requests r
   where r.company_id = v_company
   order by r.requested_at desc limit 1;

  v_fee := case when v_plan.kind = 'subscription'
                then coalesce(v_plan.fee, 0)::numeric else 0 end;

  select w.id, w.balance::numeric into v_wallet, v_bal
    from public.wallets w
   where w.owner_type = 'company' and w.owner_id = v_company;
  v_bal := coalesce(v_bal, 0);

  return jsonb_build_object(
    'company_id',   v_company,
    'company_name', v_co.name_ar,
    'suspended',    v_co.suspended_at is not null or not v_co.is_active,
    'suspend_reason', v_co.suspend_reason,
    'kind',       v_plan.kind,
    'rate',       v_plan.rate::text,
    'fee',        v_plan.fee::text,
    'starts_on',  v_plan.starts_on,
    'ends_on',    v_plan.ends_on,
    -- null = عقد مفتوح بلا نهاية ⇒ مفيش تجديد أصلاً، والشاشة بتقول كده.
    'days_left',  case when v_plan.ends_on is null then null
                       else v_plan.ends_on - current_date end,
    -- الإيقاف ده بتاعنا (اشتراك) ولا الأدمن وقفه بإيده؟ الفرق مهم: الدفع
    -- بيرفع الأول بس، والتاني محتاج الإدارة.
    'suspended_for_subscription',
      coalesce(v_co.suspend_reason like app.subscription_suspend_tag() || '%', false),
    'wallet_id',      v_wallet,
    'wallet_balance', v_bal::text,
    'amount_due',     v_fee::text,
    -- الاشتراك الثابت بس هو اللي بيتدفع من هنا؛ نظام النسبة بيتحصّل من
    -- الحساب الجاري والكشوف الشهرية.
    'can_pay',        (v_plan.kind = 'subscription' and v_fee > 0),
    'wallet_covers',  (v_plan.kind = 'subscription' and v_fee > 0 and v_bal >= v_fee),
    'request', case when v_req.id is null then null else jsonb_build_object(
      'id', v_req.id, 'status', v_req.status, 'requested_at', v_req.requested_at,
      'decided_at', v_req.decided_at, 'admin_note', v_req.admin_note,
      'new_ends_on', v_req.new_ends_on) end);
end $fn$;

notify pgrst, 'reload schema';
