do $mig$
declare
  v_def  text;
  v_from constant text := 'o.status <> ''cancelled''';
  v_to   constant text :=
    'o.status <> ''cancelled''' || chr(10) ||
    '          and exists (select 1 from public.invoices inv where inv.order_id = o.id)';
  v_n    int;
begin
  v_def := pg_get_functiondef('app.accounts_rows(text,date,date,text,text)'::regprocedure);

  v_n := (length(v_def) - length(replace(v_def, v_from, ''))) / length(v_from);
  if v_n <> 4 then
    raise exception 'المرساة المفروض 4 مرات في accounts_rows، لقيت %', v_n;
  end if;

  execute replace(v_def, v_from, v_to);
end $mig$;

notify pgrst, 'reload schema';
