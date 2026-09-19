-- «عمولات مرتجعة للبائعين» كانت رقمين مختلفين في شاشتين.
--
--   تاب رصيد المنصة ...... 0.192 د.ك  ← من `platform_fees` (المقيّد بس)
--   تاب الإحصائيات ....... 73.905 د.ك ← من `app.return_fee_refunds`
--
-- الفرق مش خطأ حسابي، ده تعريفين. والفرق نفسه بيحكي حاجتين مهمّتين:
--
--   0.192  اتقيّدت فعلًا (3 مرتجعات)
--  21.835  مرتجعات **اتصرفت للمشتري وخلصت** ومحصلش عليها قيد استرداد عمولة
--          — يعني فلوس المنصة لسه شايلاها وهي مش بتاعتها
--  51.878  مرتجعات **لسه جارية** (موافَق عليها / اتسلّمت) والصرف لسه ما تمّش
--  ──────
--  73.905
--
-- الاتنين كانوا غلط في اتجاهين: رصيد المنصة بيقول 0.192 فبيسمح بسحب فلوس
-- مش بتاعته، والإحصائيات بتحط الـ51.878 في «صافي الربح» كأنها اتصرفت خلاص.
--
-- الحل: مصدر واحد (`app.return_fee_refunds`) متقسّم بحالة المرتجع، والرصيد
-- المتاح للسحب بيتخصم منه التلاتة — المقيّد والمستحق والمحجوز.

create or replace function public.admin_platform_balance(p_from date default null, p_to date default null)
returns jsonb
language plpgsql
stable security definer
set search_path to 'public', 'pg_temp'
as $fn$
declare
  v_from timestamptz := case when p_from is null then '-infinity'::timestamptz else app.kw_start(p_from) end;
  v_to   timestamptz := case when p_to   is null then 'infinity'::timestamptz  else app.kw_start(p_to + 1) end;
  v_commission   numeric;
  v_subs         numeric;
  v_refunds      numeric;
  v_all_comm     numeric;
  v_all_subs     numeric;
  v_all_refunds  numeric;
  v_due          numeric;
  v_held         numeric;
  v_withdrawn    numeric;
  v_cust_funds   numeric;
  v_buyer_funds  numeric;
  v_seller_funds numeric;
  v_cust_topups  numeric;
  v_cust_payouts numeric;
begin
  if not app.is_admin() then
    raise exception 'غير مصرح: هذه العملية للأدمن فقط' using errcode = '42501';
  end if;
  if p_from is not null and p_to is not null and p_to < p_from then
    raise exception 'نطاق تاريخ غير صالح' using errcode = '22007';
  end if;

  select coalesce(sum(s.commission_amount), 0) into v_commission
    from app.realized_sales s
   where s.issued_at >= v_from and s.issued_at < v_to;

  select coalesce(sum(pf.amount) filter (where pf.kind = 'subscription'), 0),
         coalesce(sum(pf.amount) filter (where pf.kind = 'commission_refund'), 0)
    into v_subs, v_refunds
    from public.platform_fees pf
   where pf.collected_at >= v_from and pf.collected_at < v_to;

  -- التراكمي: الرصيد المتاح مالوش فترة.
  -- على البيعات اللي اتمّت بس: الرصيد ده بيتسحب على حساب بنكي، فما ينفعش
  -- يشيل عمولة طلب لسه البائع بيراجعه وممكن يتلغي.
  select coalesce(sum(s.commission_amount), 0) into v_all_comm
    from app.realized_sales s;

  select coalesce(sum(pf.amount) filter (where pf.kind = 'subscription'), 0),
         coalesce(sum(pf.amount) filter (where pf.kind = 'commission_refund'), 0)
    into v_all_subs, v_all_refunds
    from public.platform_fees pf;

  -- نفس مصدر تاب الإحصائيات، بس متقسّم بحالة المرتجع بدل رقم واحد:
  --   due  = المرتجع خلص والفلوس راحت للمشتري، والعمولة لسه ما رجعتش للبائع
  --   held = المرتجع لسه ماشي، فالمبلغ محجوز مش متاح للسحب
  select coalesce(sum(f.amount) filter (where r.status = 'refunded'), 0),
         coalesce(sum(f.amount) filter (
           where r.status in ('approved', 'partially_approved', 'picked_up', 'received')), 0)
    into v_due, v_held
    from app.return_fee_refunds f
    join public.return_requests r on r.id = f.return_id
   where not f.is_posted;

  select coalesce(sum(w.amount), 0) into v_withdrawn from public.platform_withdrawals w;

  -- أموال العملاء: رقم لحظي (الأمانة دلوقتي كام) مش حركة فترة.
  select coalesce(sum(cw.balance), 0),
         coalesce(sum(cw.balance) filter (where cw.side = 'buyer'), 0),
         coalesce(sum(cw.balance) filter (where cw.side = 'seller'), 0)
    into v_cust_funds, v_buyer_funds, v_seller_funds
    from app.customer_wallets cw;

  -- الحركة بتتبع الفلتر: دخل كام وخرج كام من أموال العملاء في الفترة.
  select coalesce(sum(t.amount) filter (where t.amount > 0), 0),
         coalesce(-sum(t.amount) filter (where t.amount < 0), 0)
    into v_cust_topups, v_cust_payouts
    from public.wallet_transactions t
    join app.customer_wallets cw on cw.id = t.wallet_id
   where t.created_at >= v_from and t.created_at < v_to;

  return jsonb_build_object(
    'commission',      v_commission::text,
    'subscriptions',   v_subs::text,
    'refunds',         v_refunds::text,
    'period_net',      (v_commission + v_subs - v_refunds)::text,
    'total_commission', v_all_comm::text,
    'total_subscriptions', v_all_subs::text,
    'total_refunds',   v_all_refunds::text,
    -- عمولة مرتجعات خلصت وما اتقيّدتش: دَين مستحق، مش ربح
    'refunds_due',     v_due::text,
    -- عمولة مرتجعات لسه جارية: محجوزة لحد ما تخلص
    'refunds_held',    v_held::text,
    'total_income',    (v_all_comm + v_all_subs - v_all_refunds)::text,
    'withdrawn',       v_withdrawn::text,
    'balance',         (v_all_comm + v_all_subs - v_all_refunds - v_due - v_held - v_withdrawn)::text,
    -- أمانة مش ربح: الحساب البنكي شايل ده كمان، وما ينفعش يتسحب.
    'customer_funds',  v_cust_funds::text,
    'buyer_funds',     v_buyer_funds::text,
    'seller_funds',    v_seller_funds::text,
    'customer_topups', v_cust_topups::text,
    'customer_payouts',v_cust_payouts::text);
end $fn$;

-- «أموال العملاء المحتجزة» كان رقم واحد من غير أي طريقة تعرف بتاع مين.
create or replace function public.admin_customer_wallets()
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

  select coalesce(jsonb_agg(x order by x->>'side', (x->>'balance')::numeric desc), '[]'::jsonb)
    into v
    from (
      select jsonb_build_object(
               'wallet_id', cw.id,
               'side',      cw.side,
               'owner_type', cw.owner_type::text,
               'owner_id',  cw.owner_id,
               'name',      coalesce(c.name_ar, p.full_name, '—'),
               'balance',   cw.balance::text,
               'last_txn_at', (select max(t.created_at) from public.wallet_transactions t
                                where t.wallet_id = cw.id)
             ) as x
        from app.customer_wallets cw
        left join public.companies c on c.id = cw.owner_id and cw.owner_type = 'company'
        left join public.profiles  p on p.id = cw.owner_id and cw.owner_type = 'user'
       where cw.balance <> 0
    ) s;

  return v;
end $fn$;

revoke all on function public.admin_customer_wallets() from public;
grant execute on function public.admin_customer_wallets() to authenticated;

notify pgrst, 'reload schema';
