insert into public.app_settings (key, value) values
  ('seller_statement_day',       to_jsonb(1)),
  ('seller_payment_grace_days',  to_jsonb(14)),
  ('seller_suspend_min_debt',    to_jsonb(1.000))
on conflict (key) do nothing;

create table if not exists public.seller_statements (
  id                uuid primary key default gen_random_uuid(),
  seller_company_id uuid not null references public.companies(id),
  period_start      date not null,
  period_end        date not null,
  opening           numeric(14,3) not null default 0,
  charged           numeric(14,3) not null default 0,
  settled           numeric(14,3) not null default 0,
  closing           numeric(14,3) not null default 0,
  amount_due        numeric(14,3) not null default 0 check (amount_due >= 0),
  due_date          date not null,
  status            text not null default 'open'
                    check (status in ('open', 'paid', 'overdue', 'waived')),
  issued_at         timestamptz not null default now(),
  notified_at       timestamptz,
  closed_at         timestamptz,
  note              text,
  check (period_end >= period_start)
);

comment on table public.seller_statements is
  'كشف حساب شهري للبائع — لقطة من الدفتر بتاريخ استحقاق. الدفتر هو المصدر، ده المطالبة.';

create unique index if not exists seller_statements_period
  on public.seller_statements (seller_company_id, period_start);

create index if not exists seller_statements_open_idx
  on public.seller_statements (status, due_date)
  where status in ('open', 'overdue');

alter table public.seller_statements enable row level security;

drop policy if exists seller_statements_admin on public.seller_statements;
create policy seller_statements_admin on public.seller_statements
  for all to authenticated
  using (app.is_admin()) with check (app.is_admin());

drop policy if exists seller_statements_own_read on public.seller_statements;
create policy seller_statements_own_read on public.seller_statements
  for select to authenticated
  using (seller_company_id in (select app.seller_company_ids()));

-- سبب الإيقاف اللي إحنا بنحطه — بنرفعه إحنا بس، وما نلمسش إيقاف اتعمل لسبب تاني.
create or replace function app.statement_suspend_reason()
returns text language sql immutable as
$fn$ select 'عدم سداد مستحقات المنصة' $fn$;

-- ---------------------------------------------------------------------------
/**
 * إصدار كشوف فترة منتهية في `p_period_end`.
 *
 * بيتعمل كشف **بس** للبائع اللي رصيده سالب آخر الفترة — اللي حسابه مقفول أو
 * ليه فلوس مالوش مطالبة.
 */
create or replace function app.issue_seller_statements(p_period_end date default null)
returns int
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $fn$
declare
  v_end    date := coalesce(p_period_end, (date_trunc('month', current_date) - interval '1 day')::date);
  v_start  date := date_trunc('month', v_end)::date;
  v_grace  int  := app.setting_int('seller_payment_grace_days', 14);
  v_n      int  := 0;
  r        record;
  v_id     uuid;
begin
  for r in
    select c.id as company_id,
           c.name_ar,
           coalesce(sum(l.amount) filter (where l.entry_date <  v_start), 0) as opening,
           coalesce(-sum(l.amount) filter (where l.entry_date between v_start and v_end
                                             and l.amount < 0), 0)           as charged,
           coalesce(sum(l.amount)  filter (where l.entry_date between v_start and v_end
                                             and l.amount > 0), 0)           as settled,
           coalesce(sum(l.amount) filter (where l.entry_date <= v_end), 0)   as closing
      from public.companies c
      join public.seller_ledger l on l.seller_company_id = c.id
     where c.type = 'seller' and c.deleted_at is null
     group by c.id, c.name_ar
    having coalesce(sum(l.amount) filter (where l.entry_date <= v_end), 0) < 0
  loop
    insert into public.seller_statements
      (seller_company_id, period_start, period_end, opening, charged, settled,
       closing, amount_due, due_date, notified_at)
    values (r.company_id, v_start, v_end, r.opening, r.charged, r.settled,
            r.closing, -r.closing, v_end + v_grace, now())
    on conflict (seller_company_id, period_start) do nothing
    returning id into v_id;

    if v_id is null then continue; end if;

    insert into public.notifications (user_id, type, title_ar, body_ar, title_en, body_en, data)
    select cm.user_id, 'system', 'كشف حساب المنصة',
           'مستحق عليك ' || trim(to_char(-r.closing, 'FM999999990.000')) || ' د.ك حتى '
             || to_char(v_end, 'YYYY-MM-DD') || '. آخر موعد للسداد '
             || to_char(v_end + v_grace, 'YYYY-MM-DD') || '.',
           'Platform statement',
           'You owe ' || trim(to_char(-r.closing, 'FM999999990.000'))
             || ' KWD, due ' || to_char(v_end + v_grace, 'YYYY-MM-DD') || '.',
           jsonb_build_object('route', '/statement')
      from public.company_members cm
     where cm.company_id = r.company_id and cm.status = 'active';

    v_n := v_n + 1;
  end loop;

  return v_n;
end $fn$;

/**
 * التنفيذ اليومي: يقفل المسدَّد، يعلّم المتأخر، يوقف، ويرفع الإيقاف لما يتسدّد.
 *
 * **الإيقاف هنا ناعم عن قصد**: بنعطّل الشركة بس (تختفي عن المشترين) وما
 * بنعلّقش حسابات مستخدميها. `app.suspend_company_internal` بيعلّق البروفايلات
 * كمان، و`app.account_user_id()` بيرجّع null لأي بروفايل مش نشط — يعني البائع
 * كان هيتقفل بره ومش قادر يشوف المطلوب منه ولا يسدّد. نفس المصيدة اللي ظهرت
 * مع اشتراك المشتري.
 */
create or replace function app.enforce_seller_statements()
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $fn$
declare
  v_min       numeric := app.setting_num('seller_suspend_min_debt', 1.000);
  v_paid      int := 0;
  v_overdue   int := 0;
  v_suspended int := 0;
  v_restored  int := 0;
  r           record;
begin
  -- 1) الرصيد اتقفل ⇒ كل الكشوف المفتوحة تتقفل معاه.
  with cleared as (
    select s.id
      from public.seller_statements s
     where s.status in ('open', 'overdue')
       and coalesce((select sum(l.amount) from public.seller_ledger l
                      where l.seller_company_id = s.seller_company_id), 0) > -v_min
  )
  update public.seller_statements s
     set status = 'paid', closed_at = now()
    from cleared where s.id = cleared.id;
  get diagnostics v_paid = row_count;

  -- 2) عدّى موعد السداد ولسه عليه ⇒ متأخر.
  update public.seller_statements s
     set status = 'overdue'
   where s.status = 'open' and s.due_date < current_date;
  get diagnostics v_overdue = row_count;

  -- 3) الإيقاف الناعم.
  for r in
    select distinct s.seller_company_id as cid, c.name_ar
      from public.seller_statements s
      join public.companies c on c.id = s.seller_company_id
     where s.status = 'overdue'
       and c.deleted_at is null and c.is_active and c.suspended_at is null
  loop
    update public.companies
       set is_active = false, suspended_at = now(),
           suspend_reason = app.statement_suspend_reason()
     where id = r.cid;

    insert into public.audit_log (actor_id, action, entity, entity_id, after)
    values (null, 'suspend', 'companies', r.cid::text,
            jsonb_build_object('reason', app.statement_suspend_reason(), 'auto', true));

    insert into public.notifications (user_id, type, title_ar, body_ar, title_en, body_en, data)
    select cm.user_id, 'system', 'تم إيقاف عرض منتجاتك',
           'مستحقات المنصة لم تُسدَّد في موعدها، فتوقّف عرض منتجاتك للمشترين. '
             || 'سدّد المستحق وهيرجع العرض تلقائيًا.',
           'Listings paused',
           'Your listings are paused until the outstanding balance is settled.',
           jsonb_build_object('route', '/statement')
      from public.company_members cm
     where cm.company_id = r.cid and cm.status = 'active';

    v_suspended := v_suspended + 1;
  end loop;

  -- 4) رفع الإيقاف — **بس اللي إحنا وقفناه**.
  for r in
    select c.id as cid
      from public.companies c
     where c.suspend_reason = app.statement_suspend_reason()
       and c.suspended_at is not null
       and c.deleted_at is null
       and coalesce((select sum(l.amount) from public.seller_ledger l
                      where l.seller_company_id = c.id), 0) > -v_min
  loop
    update public.companies
       set is_active = true, suspended_at = null,
           suspend_reason = null, suspended_by = null
     where id = r.cid;

    insert into public.audit_log (actor_id, action, entity, entity_id, after)
    values (null, 'unsuspend', 'companies', r.cid::text,
            jsonb_build_object('reason', 'تم سداد المستحقات', 'auto', true));

    insert into public.notifications (user_id, type, title_ar, body_ar, title_en, body_en, data)
    select cm.user_id, 'system', 'رجع عرض منتجاتك',
           'اتسدّدت المستحقات ورجعت منتجاتك تظهر للمشترين.',
           'Listings resumed', 'Your listings are live again.',
           jsonb_build_object('route', '/statement')
      from public.company_members cm
     where cm.company_id = r.cid and cm.status = 'active';

    v_restored := v_restored + 1;
  end loop;

  return jsonb_build_object('paid', v_paid, 'overdue', v_overdue,
                            'suspended', v_suspended, 'restored', v_restored);
end $fn$;

notify pgrst, 'reload schema';
