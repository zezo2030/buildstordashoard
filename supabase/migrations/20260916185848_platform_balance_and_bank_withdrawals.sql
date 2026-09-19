-- رصيد المنصة والسحب البنكي.
--
-- بلاغ العميل: «لازم يكون في حاجة في لوحة التحكم اسمها رصيد المنصة، عبارة عن
-- (العمولات اللي أنا باخدها + الاشتراكات)، والرصيد ده ممكن أسحبه على حسابي
-- البنكي، وهو نفسه الرصيد اللي يرجع منه مبلغ العمولة للبائع لو كان فيه
-- مرتجعات».
--
-- **ده رصيد محسوب مش محفظة.** العمولة عمرها ما اتنقلت من محفظة لمحفظة في
-- النظام — `orders.commission_amount` رقم على الطلب، وحركات `commission` في
-- دفتر المحافظ كلها **استردادات** للبائعين (3 حركات، 0.192 د.ك). فالرصيد
-- بيتجمّع من مصادره:
--
--     + عمولات الطلبات      orders.commission_amount (غير الملغي)
--     + الاشتراكات          platform_fees.kind = 'subscription'
--     − عمولات مرتجعة       platform_fees.kind = 'commission_refund'
--     − مسحوب للبنك         platform_withdrawals
--     = المتاح للسحب
--
-- السحب مجرد **تسجيل** لتحويل حصل بره النظام (بنك لبنك) — مش أمر تحويل.
-- عشان كده مفيش حالات ولا موافقات زي `withdrawal_requests` بتاعة البائعين:
-- إنت اللي بتسحب لنفسك.

create table if not exists public.platform_withdrawals (
  id            uuid primary key default gen_random_uuid(),
  amount        numeric(14,3) not null check (amount > 0),
  -- رقم التحويل/الإيصال من البنك — اللي بيربط السطر ده بالكشف البنكي.
  bank_ref      text,
  note          text,
  withdrawn_at  date not null default current_date,
  created_by    uuid references public.profiles(id),
  created_at    timestamptz not null default now()
);

comment on table public.platform_withdrawals is
  'تسجيل تحويلات رصيد المنصة للحساب البنكي. سجل، مش أمر تحويل.';

create index if not exists platform_withdrawals_at_idx
  on public.platform_withdrawals (withdrawn_at desc);

alter table public.platform_withdrawals enable row level security;

drop policy if exists platform_withdrawals_admin on public.platform_withdrawals;
create policy platform_withdrawals_admin on public.platform_withdrawals
  for all to authenticated
  using (app.is_admin()) with check (app.is_admin());

-- ---------------------------------------------------------------------------

/**
 * أرقام رصيد المنصة.
 *
 * `p_from`/`p_to` بيفلتروا **حركة الفترة** بس. `balance` و`withdrawn` أرقام
 * تراكمية من أول يوم مهما كان الفلتر — الرصيد المتاح للسحب مالوش فترة.
 */
create or replace function public.admin_platform_balance(
  p_from date default null,
  p_to   date default null
) returns jsonb
language plpgsql
stable
security definer
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
  v_withdrawn    numeric;
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

  select coalesce(sum(pf.amount) filter (where pf.kind = 'subscription'), 0),
         coalesce(sum(pf.amount) filter (where pf.kind = 'commission_refund'), 0)
    into v_subs, v_refunds
    from public.platform_fees pf
   where pf.collected_at >= v_from and pf.collected_at < v_to;

  -- التراكمي: الرصيد المتاح مالوش فترة.
  select coalesce(sum(o.commission_amount), 0) into v_all_comm
    from public.orders o where o.status <> 'cancelled';

  select coalesce(sum(pf.amount) filter (where pf.kind = 'subscription'), 0),
         coalesce(sum(pf.amount) filter (where pf.kind = 'commission_refund'), 0)
    into v_all_subs, v_all_refunds
    from public.platform_fees pf;

  select coalesce(sum(w.amount), 0) into v_withdrawn from public.platform_withdrawals w;

  return jsonb_build_object(
    'commission',      v_commission::text,
    'subscriptions',   v_subs::text,
    'refunds',         v_refunds::text,
    'period_net',      (v_commission + v_subs - v_refunds)::text,
    'total_commission', v_all_comm::text,
    'total_subscriptions', v_all_subs::text,
    'total_refunds',   v_all_refunds::text,
    'total_income',    (v_all_comm + v_all_subs - v_all_refunds)::text,
    'withdrawn',       v_withdrawn::text,
    'balance',         (v_all_comm + v_all_subs - v_all_refunds - v_withdrawn)::text);
end $fn$;

/**
 * تسجيل سحب للحساب البنكي.
 *
 * بيرفض السحب اللي أكبر من المتاح: الرصيد ده هو اللي بترجع منه عمولات
 * المرتجعات، فسحبه بالكامل بيسيب المنصة من غير غطاء لأول مرتجع.
 */
create or replace function public.admin_record_withdrawal(
  p_amount   numeric,
  p_bank_ref text default null,
  p_note     text default null,
  p_at       date default null
) returns uuid
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $fn$
declare
  v_balance numeric;
  v_id      uuid;
begin
  if not app.is_admin() then
    raise exception 'غير مصرح: هذه العملية للأدمن فقط' using errcode = '42501';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'المبلغ يجب أن يكون أكبر من صفر' using errcode = '22023';
  end if;
  if p_at is not null and p_at > current_date then
    raise exception 'تاريخ السحب لا يمكن أن يكون في المستقبل' using errcode = '22023';
  end if;

  v_balance := (public.admin_platform_balance() ->> 'balance')::numeric;
  if p_amount > v_balance then
    raise exception 'المبلغ أكبر من الرصيد المتاح (%)', trim(to_char(v_balance, 'FM999999990.000'))
      using errcode = '23514';
  end if;

  insert into public.platform_withdrawals (amount, bank_ref, note, withdrawn_at, created_by)
  values (round(p_amount, 3),
          nullif(trim(coalesce(p_bank_ref, '')), ''),
          nullif(trim(coalesce(p_note, '')), ''),
          coalesce(p_at, current_date),
          auth.uid())
  returning id into v_id;

  insert into public.audit_log (actor_id, action, entity, entity_id, after)
  values (auth.uid(), 'platform_withdrawal', 'platform_withdrawals', v_id::text,
          jsonb_build_object('amount', p_amount, 'bank_ref', p_bank_ref,
                             'balance_before', v_balance));

  return v_id;
end $fn$;

/** حذف سطر اتسجّل غلط. السحب تسجيل لتحويل بره النظام، فالتصحيح بالحذف. */
create or replace function public.admin_delete_withdrawal(p_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $fn$
declare v_row public.platform_withdrawals;
begin
  if not app.is_admin() then
    raise exception 'غير مصرح: هذه العملية للأدمن فقط' using errcode = '42501';
  end if;

  delete from public.platform_withdrawals where id = p_id returning * into v_row;
  if not found then
    raise exception 'السحب غير موجود' using errcode = 'P0002';
  end if;

  insert into public.audit_log (actor_id, action, entity, entity_id, before)
  values (auth.uid(), 'platform_withdrawal_delete', 'platform_withdrawals', p_id::text,
          to_jsonb(v_row));
end $fn$;

create or replace function public.admin_platform_withdrawals_list(p_limit int default 50)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $fn$
declare v jsonb;
begin
  if not app.is_admin() then
    raise exception 'غير مصرح: هذه العملية للأدمن فقط' using errcode = '42501';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 200 then
    raise exception 'حجم الصفحة يجب أن يكون بين 1 و 200' using errcode = '22023';
  end if;

  select coalesce(jsonb_agg(t order by t.withdrawn_at desc, t.created_at desc), '[]'::jsonb)
    into v
    from (select w.id, w.amount::text as amount, w.bank_ref, w.note,
                 w.withdrawn_at, w.created_at, p.full_name as created_by_name
            from public.platform_withdrawals w
            left join public.profiles p on p.id = w.created_by
           order by w.withdrawn_at desc, w.created_at desc
           limit p_limit) t;

  return v;
end $fn$;

notify pgrst, 'reload schema';
