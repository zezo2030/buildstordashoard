create or replace function public.admin_delete_product_submission(p_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $fn$
declare v_row public.product_submissions;
begin
  if not app.is_admin() then
    raise exception 'غير مصرح: هذه العملية للأدمن فقط' using errcode = '42501';
  end if;

  select * into v_row from public.product_submissions where id = p_id;
  if not found then
    raise exception 'الاقتراح غير موجود' using errcode = 'P0002';
  end if;
  if v_row.status not in ('added', 'rejected') then
    raise exception 'الاقتراح لسه مفتوح — ارفضه بدل ما تحذفه عشان البائع يعرف'
      using errcode = '22023';
  end if;

  delete from public.product_submissions where id = p_id;

  insert into public.audit_log (actor_id, action, entity, entity_id, before)
  values (auth.uid(), 'delete', 'product_submissions', p_id::text, to_jsonb(v_row));
end $fn$;

create or replace function public.admin_seller_settle(
  p_company uuid,
  p_amount  numeric,
  p_kind    text,
  p_note    text default null,
  p_date    date default null
) returns uuid
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $fn$
declare v_id uuid; v_signed numeric;
begin
  if not app.is_admin() then
    raise exception 'غير مصرح: هذه العملية للأدمن فقط' using errcode = '42501';
  end if;
  if p_kind not in ('settlement', 'payout', 'adjustment') then
    raise exception 'نوع الحركة غير معروف' using errcode = '22023';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'المبلغ يجب أن يكون أكبر من صفر' using errcode = '22023';
  end if;
  if p_date is not null and p_date > current_date then
    raise exception 'التاريخ لا يمكن أن يكون في المستقبل' using errcode = '22023';
  end if;
  if not exists (select 1 from public.companies
                  where id = p_company and type = 'seller') then
    raise exception 'البائع غير موجود' using errcode = 'P0002';
  end if;

  v_signed := case when p_kind = 'payout' then -p_amount else p_amount end;

  insert into public.seller_ledger
    (seller_company_id, amount, kind, ref_type, ref_id, description_ar, entry_date, created_by)
  values (p_company, round(v_signed, 3), p_kind, 'manual', null,
          nullif(trim(coalesce(p_note, '')), ''), coalesce(p_date, current_date), auth.uid())
  returning id into v_id;

  insert into public.audit_log (actor_id, action, entity, entity_id, after)
  values (auth.uid(), 'seller_ledger_' || p_kind, 'seller_ledger', v_id::text,
          jsonb_build_object('company', p_company, 'amount', v_signed, 'note', p_note));

  return v_id;
end $fn$;

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
  v_sent   int;
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
     where c.type = 'seller'
     group by c.id, c.name_ar
    having coalesce(sum(l.amount) filter (where l.entry_date <= v_end), 0) < 0
  loop
    insert into public.seller_statements
      (seller_company_id, period_start, period_end, opening, charged, settled,
       closing, amount_due, due_date)
    values (r.company_id, v_start, v_end, r.opening, r.charged, r.settled,
            r.closing, -r.closing, v_end + v_grace)
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
    get diagnostics v_sent = row_count;

    if v_sent > 0 then
      update public.seller_statements set notified_at = now() where id = v_id;
    end if;

    v_n := v_n + 1;
  end loop;

  return v_n;
end $fn$;

do $mig$
declare
  v_def text;
  v_from constant text :=
    '     where o.seller_company_id = p_company_id' || chr(10) ||
    '       and o.status in (''confirmed'', ''preparing'', ''out_for_delivery'', ''delivered'')' || chr(10) ||
    '       and (p_from is null or o.placed_at >= p_from::timestamptz)' || chr(10) ||
    '       and (p_to   is null or o.placed_at <  (p_to + 1)::timestamptz)';
  v_to constant text :=
    '     where o.seller_company_id = p_company_id' || chr(10) ||
    '       and exists (select 1 from app.realized_sales s' || chr(10) ||
    '                    where s.order_id = o.id' || chr(10) ||
    '                      and (p_from is null or s.issued_at >= app.kw_start(p_from))' || chr(10) ||
    '                      and (p_to   is null or s.issued_at <  app.kw_start(p_to + 1)))';
begin
  v_def := pg_get_functiondef('public.admin_seller_dashboard(uuid,date,date)'::regprocedure);
  if (length(v_def) - length(replace(v_def, v_from, ''))) / length(v_from) <> 1 then
    raise exception 'مرساة تاريخ البائع مش موجودة مرة واحدة';
  end if;
  execute replace(v_def, v_from, v_to);
end $mig$;

do $mig$
declare
  v_def text;
  v_from constant text :=
    '     where o.status in (''confirmed'', ''preparing'', ''out_for_delivery'', ''delivered'')' || chr(10) ||
    '       and (' || chr(10) ||
    '         (p_buyer_id is not null and o.buyer_id = p_buyer_id)' || chr(10) ||
    '         or (p_company_ids is not null and o.buyer_company_id = any (p_company_ids))' || chr(10) ||
    '       )' || chr(10) ||
    '       and (p_from is null or o.placed_at >= p_from::timestamptz)' || chr(10) ||
    '       and (p_to   is null or o.placed_at <  (p_to + 1)::timestamptz)';
  v_to constant text :=
    '     where (' || chr(10) ||
    '         (p_buyer_id is not null and o.buyer_id = p_buyer_id)' || chr(10) ||
    '         or (p_company_ids is not null and o.buyer_company_id = any (p_company_ids))' || chr(10) ||
    '       )' || chr(10) ||
    '       and exists (select 1 from app.realized_sales s' || chr(10) ||
    '                    where s.order_id = o.id' || chr(10) ||
    '                      and (p_from is null or s.issued_at >= app.kw_start(p_from))' || chr(10) ||
    '                      and (p_to   is null or s.issued_at <  app.kw_start(p_to + 1)))';
begin
  v_def := pg_get_functiondef('app.buyer_dashboard_json(uuid,uuid[],date,date)'::regprocedure);
  if (length(v_def) - length(replace(v_def, v_from, ''))) / length(v_from) <> 1 then
    raise exception 'مرساة تاريخ المشتري مش موجودة مرة واحدة';
  end if;
  execute replace(v_def, v_from, v_to);
end $mig$;

do $mig$
declare
  v_def text;
  v_from_a constant text := '(p_from is null or o.placed_at >= app.kw_start(p_from))';
  v_to_a   constant text := '(p_from is null or exists (select 1 from app.realized_sales s'
                            || ' where s.order_id = o.id and s.issued_at >= app.kw_start(p_from)))';
  v_from_b constant text := '(p_to   is null or o.placed_at <  app.kw_start(p_to + 1))';
  v_to_b   constant text := '(p_to   is null or exists (select 1 from app.realized_sales s'
                            || ' where s.order_id = o.id and s.issued_at <  app.kw_start(p_to + 1)))';
  v_a int;
  v_b int;
begin
  v_def := pg_get_functiondef('app.accounts_rows(text,date,date,text,text)'::regprocedure);

  v_a := (length(v_def) - length(replace(v_def, v_from_a, ''))) / length(v_from_a);
  v_b := (length(v_def) - length(replace(v_def, v_from_b, ''))) / length(v_from_b);
  if v_a <> 4 or v_b <> 4 then
    raise exception 'المرساة المفروض 4 و4 في accounts_rows، لقيت % و%', v_a, v_b;
  end if;

  execute replace(replace(v_def, v_from_a, v_to_a), v_from_b, v_to_b);
end $mig$;

notify pgrst, 'reload schema';
