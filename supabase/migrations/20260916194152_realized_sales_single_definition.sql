create or replace view app.realized_sales as
  select i.id                        as invoice_id,
         i.order_id,
         i.issued_at,
         i.total::numeric            as total,
         o.commission_amount::numeric as commission_amount,
         o.seller_company_id,
         o.buyer_id,
         o.placed_at
    from public.invoices i
    join public.orders   o on o.id = i.order_id
   where o.status <> 'cancelled';

comment on view app.realized_sales is
  'البيعة الفعلية = فاتورة صادرة على طلب مش ملغي. المصدر الوحيد لكل أرقام المبيعات.';

do $mig$
declare
  v_def text;
  v_comm_from constant text :=
    '  select coalesce(sum(o.commission_amount), 0) into v_commission' || chr(10) ||
    '    from public.orders o' || chr(10) ||
    '   where o.status <> ''cancelled'' and o.placed_at >= v_from and o.placed_at < v_to;';
  v_comm_to constant text :=
    '  -- العمولة على البيعات اللي اتمّت فعلًا. طلب لسه بيتراجع عمولته لسه' || chr(10) ||
    '  -- ما اتكسبتش.' || chr(10) ||
    '  select coalesce(sum(s.commission_amount), 0) into v_commission' || chr(10) ||
    '    from app.realized_sales s' || chr(10) ||
    '   where s.issued_at >= v_from and s.issued_at < v_to;';
  v_sales_from constant text :=
    '    ''n_sales'',    (select count(*) from public.orders o' || chr(10) ||
    '                    where o.status <> ''cancelled'' and o.placed_at >= v_from and o.placed_at < v_to),' || chr(10) ||
    '    ''sales_value'',(select coalesce(sum(o.grand_total), 0) from public.orders o' || chr(10) ||
    '                    where o.status <> ''cancelled'' and o.placed_at >= v_from and o.placed_at < v_to)::text,';
  v_sales_to constant text :=
    '    ''n_sales'',    (select count(*) from app.realized_sales s' || chr(10) ||
    '                    where s.issued_at >= v_from and s.issued_at < v_to),' || chr(10) ||
    '    ''sales_value'',(select coalesce(sum(s.total), 0) from app.realized_sales s' || chr(10) ||
    '                    where s.issued_at >= v_from and s.issued_at < v_to)::text,';
begin
  v_def := pg_get_functiondef('public.admin_finance_stats(date,date)'::regprocedure);

  if (length(v_def) - length(replace(v_def, v_comm_from, ''))) / length(v_comm_from) <> 1 then
    raise exception 'مرساة العمولة مش موجودة مرة واحدة في admin_finance_stats';
  end if;
  if (length(v_def) - length(replace(v_def, v_sales_from, ''))) / length(v_sales_from) <> 1 then
    raise exception 'مرساة المبيعات مش موجودة مرة واحدة في admin_finance_stats';
  end if;

  execute replace(replace(v_def, v_comm_from, v_comm_to), v_sales_from, v_sales_to);
end $mig$;

do $mig$
declare
  v_def text;
  v_period_from constant text :=
    '  select coalesce(sum(o.commission_amount), 0) into v_commission' || chr(10) ||
    '    from public.orders o' || chr(10) ||
    '   where o.status <> ''cancelled'' and o.placed_at >= v_from and o.placed_at < v_to;';
  v_period_to constant text :=
    '  select coalesce(sum(s.commission_amount), 0) into v_commission' || chr(10) ||
    '    from app.realized_sales s' || chr(10) ||
    '   where s.issued_at >= v_from and s.issued_at < v_to;';
  v_all_from constant text :=
    '  select coalesce(sum(o.commission_amount), 0) into v_all_comm' || chr(10) ||
    '    from public.orders o where o.status <> ''cancelled'';';
  v_all_to constant text :=
    '  -- على البيعات اللي اتمّت بس: الرصيد ده بيتسحب على حساب بنكي، فما ينفعش' || chr(10) ||
    '  -- يشيل عمولة طلب لسه البائع بيراجعه وممكن يتلغي.' || chr(10) ||
    '  select coalesce(sum(s.commission_amount), 0) into v_all_comm' || chr(10) ||
    '    from app.realized_sales s;';
begin
  v_def := pg_get_functiondef('public.admin_platform_balance(date,date)'::regprocedure);

  if (length(v_def) - length(replace(v_def, v_period_from, ''))) / length(v_period_from) <> 1 then
    raise exception 'مرساة عمولة الفترة مش موجودة مرة واحدة في admin_platform_balance';
  end if;
  if (length(v_def) - length(replace(v_def, v_all_from, ''))) / length(v_all_from) <> 1 then
    raise exception 'مرساة العمولة التراكمية مش موجودة مرة واحدة في admin_platform_balance';
  end if;

  execute replace(replace(v_def, v_period_from, v_period_to), v_all_from, v_all_to);
end $mig$;

create or replace function public.admin_sales_range(
  p_from date default null,
  p_to   date default null
) returns jsonb
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
  if p_from is not null and p_to is not null and p_to < p_from then
    raise exception 'نطاق تاريخ غير صالح' using errcode = '22007';
  end if;

  select jsonb_build_object(
           'n', count(*),
           'total', coalesce(sum(s.total), 0)::text,
           'commission', coalesce(sum(s.commission_amount), 0)::text)
    into v
    from app.realized_sales s
   where (p_from is null or s.issued_at >= app.kw_start(p_from))
     and (p_to   is null or s.issued_at <  app.kw_start(p_to + 1));

  return v;
end $fn$;

create or replace function public.admin_sales_series(p_from date, p_to date)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $fn$
declare
  v_bucket text;
  v_step   interval;
  v_points jsonb;
begin
  if not app.is_admin() then
    raise exception 'غير مصرح: هذه العملية للأدمن فقط' using errcode = '42501';
  end if;
  if p_from is null or p_to is null or p_to < p_from then
    raise exception 'نطاق تاريخ غير صالح' using errcode = '22007';
  end if;

  if (p_to - p_from) <= 62 then
    v_bucket := 'day';   v_step := interval '1 day';
  else
    v_bucket := 'month'; v_step := interval '1 month';
  end if;

  select coalesce(
           jsonb_agg(jsonb_build_object(
             'day',   to_char(g.d, 'YYYY-MM-DD'),
             'total', coalesce(x.t, 0)::text,
             'n',     coalesce(x.n, 0)
           ) order by g.d), '[]'::jsonb)
    into v_points
    from generate_series(
           date_trunc(v_bucket, p_from::timestamp),
           date_trunc(v_bucket, p_to::timestamp),
           v_step) g(d)
    left join (
      select date_trunc(v_bucket, s.issued_at at time zone 'Asia/Kuwait') d,
             sum(s.total) t,
             count(*) n
        from app.realized_sales s
       where s.issued_at >= app.kw_start(p_from)
         and s.issued_at <  app.kw_start(p_to + 1)
       group by 1
    ) x on x.d = g.d;

  return jsonb_build_object('bucket', v_bucket, 'points', v_points);
end $fn$;

notify pgrst, 'reload schema';
