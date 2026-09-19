do $mig$
declare
  v_def text;
  v_from constant text :=
    '      select jsonb_build_object(' || chr(10) ||
    '               ''n'', count(*),' || chr(10) ||
    '               ''total'', coalesce(sum(grand_total), 0)::text,' || chr(10) ||
    '               ''commission'', coalesce(sum(commission_amount), 0)::text)' || chr(10) ||
    '      from public.orders where status <> ''cancelled''';
  v_to constant text :=
    '      select jsonb_build_object(' || chr(10) ||
    '               ''n'', count(*),' || chr(10) ||
    '               ''total'', coalesce(sum(s.total), 0)::text,' || chr(10) ||
    '               ''commission'', coalesce(sum(s.commission_amount), 0)::text)' || chr(10) ||
    '      from app.realized_sales s';
begin
  v_def := pg_get_functiondef('public.admin_overview_counts()'::regprocedure);
  if (length(v_def) - length(replace(v_def, v_from, ''))) / length(v_from) <> 1 then
    raise exception 'المرساة مش موجودة مرة واحدة في admin_overview_counts';
  end if;
  execute replace(v_def, v_from, v_to);
end $mig$;

do $mig$
declare
  v_def text;
  v_from constant text :=
    '      from public.order_items oi' || chr(10) ||
    '      join public.orders o on o.id = oi.order_id' || chr(10) ||
    '     where o.status <> ''cancelled''' || chr(10) ||
    '       and (p_from is null or o.placed_at >= app.kw_start(p_from))' || chr(10) ||
    '       and (p_to   is null or o.placed_at <  app.kw_start(p_to + 1))';
  v_to constant text :=
    '      from public.order_items oi' || chr(10) ||
    '      join app.realized_sales s on s.order_id = oi.order_id' || chr(10) ||
    '     where (p_from is null or s.issued_at >= app.kw_start(p_from))' || chr(10) ||
    '       and (p_to   is null or s.issued_at <  app.kw_start(p_to + 1))';
begin
  v_def := pg_get_functiondef('public.admin_sales_by_specialty(date,date)'::regprocedure);
  if (length(v_def) - length(replace(v_def, v_from, ''))) / length(v_from) <> 1 then
    raise exception 'المرساة مش موجودة مرة واحدة في admin_sales_by_specialty';
  end if;
  execute replace(v_def, v_from, v_to);
end $mig$;

notify pgrst, 'reload schema';
