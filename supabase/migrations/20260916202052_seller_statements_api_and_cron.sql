/** إصدار يدوي — الأدمن عايز يقفل الشهر دلوقتي مش يستنى الكرون. */
create or replace function public.admin_issue_seller_statements(p_period_end date default null)
returns int
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $fn$
declare v_n int;
begin
  if not app.is_admin() then
    raise exception 'غير مصرح: هذه العملية للأدمن فقط' using errcode = '42501';
  end if;
  if p_period_end is not null and p_period_end >= current_date then
    raise exception 'الفترة لازم تكون منتهية' using errcode = '22023';
  end if;

  v_n := app.issue_seller_statements(p_period_end);

  insert into public.audit_log (actor_id, action, entity, entity_id, after)
  values (auth.uid(), 'issue_statements', 'seller_statements', null,
          jsonb_build_object('period_end', p_period_end, 'issued', v_n));

  return v_n;
end $fn$;

/** الكشوف المفتوحة/المتأخرة — شريط المتابعة في اللوحة. */
create or replace function public.admin_seller_statements(p_status text default 'due')
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
  if p_status not in ('due', 'all', 'open', 'overdue', 'paid', 'waived') then
    raise exception 'حالة غير معروفة' using errcode = '22023';
  end if;

  select coalesce(jsonb_agg(t order by t.due_date), '[]'::jsonb) into v
    from (
      select s.id, s.seller_company_id, c.name_ar as name,
             s.period_start, s.period_end, s.due_date, s.status,
             s.amount_due::text as amount_due,
             s.charged::text    as charged,
             s.settled::text    as settled,
             (s.due_date - current_date) as days_left,
             c.suspended_at is not null  as suspended,
             coalesce((select -sum(l.amount) from public.seller_ledger l
                        where l.seller_company_id = s.seller_company_id), 0)::text as balance_now
        from public.seller_statements s
        join public.companies c on c.id = s.seller_company_id
       where (p_status = 'all'
              or (p_status = 'due' and s.status in ('open', 'overdue'))
              or s.status = p_status)
    ) t;

  return v;
end $fn$;

/** إسقاط مطالبة — الدفتر ما بيتلمسش، الكشف بس بيتقفل. */
create or replace function public.admin_waive_statement(p_id uuid, p_note text default null)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $fn$
begin
  if not app.is_admin() then
    raise exception 'غير مصرح: هذه العملية للأدمن فقط' using errcode = '42501';
  end if;

  update public.seller_statements
     set status = 'waived', closed_at = now(),
         note = nullif(trim(coalesce(p_note, '')), '')
   where id = p_id and status in ('open', 'overdue');
  if not found then
    raise exception 'الكشف غير موجود أو مقفول بالفعل' using errcode = 'P0002';
  end if;

  insert into public.audit_log (actor_id, action, entity, entity_id, after)
  values (auth.uid(), 'waive_statement', 'seller_statements', p_id::text,
          jsonb_build_object('note', p_note));
end $fn$;

/** كشف البائع لنفسه في التطبيق. */
create or replace function public.my_seller_statement()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $fn$
declare v_co uuid; v_bal numeric; v_open jsonb;
begin
  select x.id into v_co from (select app.seller_company_ids() as id) x limit 1;
  if v_co is null then
    raise exception 'هذه الشاشة للبائعين فقط' using errcode = '42501';
  end if;

  select coalesce(sum(l.amount), 0) into v_bal
    from public.seller_ledger l where l.seller_company_id = v_co;

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', s.id, 'period_end', s.period_end, 'due_date', s.due_date,
           'amount_due', s.amount_due::text, 'status', s.status,
           'days_left', (s.due_date - current_date)) order by s.due_date), '[]'::jsonb)
    into v_open
    from public.seller_statements s
   where s.seller_company_id = v_co and s.status in ('open', 'overdue');

  return jsonb_build_object(
    'company_id', v_co,
    'balance',    v_bal::text,
    'owed',       greatest(-v_bal, 0)::text,
    'suspended',  (select c.suspended_at is not null from public.companies c where c.id = v_co),
    'statements', v_open);
end $fn$;

select cron.schedule('issue-seller-statements', '0 1 1 * *',
                     $$select app.issue_seller_statements();$$);
select cron.schedule('enforce-seller-statements', '30 1 * * *',
                     $$select app.enforce_seller_statements();$$);

notify pgrst, 'reload schema';
