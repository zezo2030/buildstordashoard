-- ترحيل التاريخ: نفس القواعد بالظبط، بنفس المراجع فما ينفعش يتكرر.
insert into public.seller_ledger
  (seller_company_id, amount, kind, ref_type, ref_id, description_ar, entry_date)
select o.seller_company_id, -o.commission_amount::numeric, 'commission', 'order', o.id,
       'عمولة الطلب ' || o.order_number, s.issued_at::date
  from app.realized_sales s
  join public.orders o on o.id = s.order_id
 where coalesce(o.commission_amount, 0) <> 0
on conflict do nothing;

insert into public.seller_ledger
  (seller_company_id, amount, kind, ref_type, ref_id, description_ar, entry_date)
select o.seller_company_id, o.grand_total::numeric, 'sale_proceeds', 'order', o.id,
       'حصيلة الطلب ' || o.order_number, s.issued_at::date
  from app.realized_sales s
  join public.orders o on o.id = s.order_id
 where o.payment_status = 'paid'
   and o.payment_method <> 'cash_on_delivery'
   and coalesce(o.grand_total, 0) <> 0
on conflict do nothing;

insert into public.seller_ledger
  (seller_company_id, amount, kind, ref_type, ref_id, description_ar, entry_date)
select r.seller_company_id, pf.amount::numeric, 'commission_refund', 'return', r.id,
       'استرداد عمولة المرتجع ' || r.return_number, pf.collected_at::date
  from public.platform_fees pf
  join public.return_requests r on r.id = pf.return_id
 where pf.kind = 'commission_refund' and coalesce(pf.amount, 0) <> 0
on conflict do nothing;

insert into public.seller_ledger
  (seller_company_id, amount, kind, ref_type, ref_id, description_ar, entry_date)
select r.seller_company_id, -r.refund_amount::numeric, 'sale_reversal', 'return', r.id,
       'سحب حصيلة المرتجع ' || r.return_number, pf.collected_at::date
  from public.platform_fees pf
  join public.return_requests r on r.id = pf.return_id
  join public.orders o on o.id = r.order_id
 where pf.kind = 'commission_refund'
   and o.payment_method <> 'cash_on_delivery'
   and o.payment_status in ('paid', 'refunded', 'partially_refunded')
   and coalesce(r.refund_amount, 0) <> 0
on conflict do nothing;

insert into public.seller_ledger
  (seller_company_id, amount, kind, ref_type, ref_id, description_ar, entry_date)
select pf.subject_id, -pf.amount::numeric, 'subscription', 'fee', pf.id,
       'رسوم اشتراك', pf.collected_at::date
  from public.platform_fees pf
 where pf.kind = 'subscription' and pf.subject_type = 'seller'
   and coalesce(pf.amount, 0) <> 0
on conflict do nothing;

-- ---------------------------------------------------------------------------
/** أرصدة كل البائعين — الشاشة الرئيسية للتحصيل. */
create or replace function public.admin_seller_balances(p_search text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $fn$
declare v jsonb; v_q text := nullif(trim(coalesce(p_search, '')), '');
begin
  if not app.is_admin() then
    raise exception 'غير مصرح: هذه العملية للأدمن فقط' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(t order by t.balance), '[]'::jsonb) into v
    from (
      select c.id,
             c.name_ar                                  as name,
             c.is_active,
             coalesce(sum(l.amount), 0)::text           as balance,
             coalesce(-sum(l.amount) filter (where l.kind in ('commission','subscription')), 0)::text as charged,
             coalesce(sum(l.amount) filter (where l.kind = 'settlement'), 0)::text as settled,
             max(l.entry_date)                          as last_entry,
             count(l.id)                                as n_entries,
             coalesce(sum(l.amount), 0)                 as balance_sort
        from public.companies c
        left join public.seller_ledger l on l.seller_company_id = c.id
       where c.type = 'seller' and c.deleted_at is null
         and (v_q is null or c.name_ar ilike '%' || v_q || '%')
       group by c.id, c.name_ar, c.is_active
      having count(l.id) > 0
    ) t;

  return v;
end $fn$;

/** كشف حساب بائع واحد. */
create or replace function public.admin_seller_statement(
  p_company uuid,
  p_from    date default null,
  p_to      date default null,
  p_limit   int  default 200
) returns jsonb
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $fn$
declare
  v_rows    jsonb;
  v_opening numeric;
  v_name    text;
begin
  if not app.is_admin()
     and not exists (select 1 from public.company_members m
                      where m.company_id = p_company and m.user_id = auth.uid()
                        and m.status = 'active') then
    raise exception 'غير مصرح' using errcode = '42501';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 500 then
    raise exception 'حجم الصفحة يجب أن يكون بين 1 و 500' using errcode = '22023';
  end if;

  select c.name_ar into v_name from public.companies c where c.id = p_company;

  -- رصيد ما قبل الفترة عشان الكشف يقفل صح.
  select coalesce(sum(l.amount), 0) into v_opening
    from public.seller_ledger l
   where l.seller_company_id = p_company
     and (p_from is null or l.entry_date < p_from);

  select coalesce(jsonb_agg(t order by t.entry_date desc, t.created_at desc), '[]'::jsonb)
    into v_rows
    from (
      select l.id, l.amount::text as amount, l.kind, l.ref_type, l.ref_id,
             l.description_ar, l.entry_date, l.created_at
        from public.seller_ledger l
       where l.seller_company_id = p_company
         and (p_from is null or l.entry_date >= p_from)
         and (p_to   is null or l.entry_date <= p_to)
       order by l.entry_date desc, l.created_at desc
       limit p_limit
    ) t;

  return jsonb_build_object(
    'company_id', p_company,
    'name',       v_name,
    'opening',    v_opening::text,
    'balance',    (select coalesce(sum(l.amount), 0)::text from public.seller_ledger l
                    where l.seller_company_id = p_company),
    'rows',       v_rows);
end $fn$;

/**
 * تحصيل من البائع أو تحويل ليه.
 *
 * الاتنين في دالة واحدة لأنهم نفس الحركة بإشارة مختلفة، والفصل بينهم كان
 * هيسيب احتمال إن حد يسجّل تحصيل بإشارة تحويل.
 */
create or replace function public.admin_seller_settle(
  p_company uuid,
  p_amount  numeric,
  p_kind    text,                      -- 'settlement' تحصيل · 'payout' تحويل
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
                  where id = p_company and type = 'seller' and deleted_at is null) then
    raise exception 'البائع غير موجود' using errcode = 'P0002';
  end if;

  -- التحصيل بيقلّل مديونية البائع (موجب) · التحويل بيقلّل اللي المنصة عليها (سالب)
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

notify pgrst, 'reload schema';
