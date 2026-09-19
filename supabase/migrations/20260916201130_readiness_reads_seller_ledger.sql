-- فحص الجاهزية يقرا من دفتر البائع بدل ما يخمّن.
--
-- البند كان بيقول «عمولة محسوبة وما اتحصّلتش» طول ما مافيش سطر `commission` في
-- `platform_fees` — تخمين، وكان هيفضل شغّال للأبد لأن العمولة عمرها ما هتتقيّد
-- هناك. دلوقتي `seller_ledger` بيقول **بالظبط** كام مستحق وعلى كام بائع،
-- والبند بيختفي لوحده أول ما الأرصدة تتقفل.
do $mig$
declare
  v_def text;
  v_from constant text :=
    '  select coalesce(sum(s.commission_amount), 0) into v_amount from app.realized_sales s;' || chr(10) ||
    '  if v_amount > 0' || chr(10) ||
    '     and not exists (select 1 from public.platform_fees where kind = ''commission'') then';
  v_to constant text :=
    '  select coalesce(-sum(l.amount), 0), count(distinct l.seller_company_id)' || chr(10) ||
    '    into v_amount, v_n' || chr(10) ||
    '    from public.seller_ledger l' || chr(10) ||
    '   where l.seller_company_id in (' || chr(10) ||
    '     select l2.seller_company_id from public.seller_ledger l2' || chr(10) ||
    '      group by l2.seller_company_id having sum(l2.amount) < 0);' || chr(10) ||
    '  if v_amount > 0 then';
  v_detail_from constant text :=
    '      ''detail'', trim(to_char(v_amount, ''FM999999990.000'')) || '' د.ك'',' || chr(10) ||
    '      ''hint'', ''العمولة رقم على الطلب — مفيش قيد تحصيل ولا خصم من البائع. ''' || chr(10) ||
    '              || ''معظم البيع كاش عند الاستلام فالفلوس بتروح للبائع مباشرة.'',' || chr(10) ||
    '      ''count'', 0, ''route'', ''/finance'');';
  v_detail_to constant text :=
    '      ''detail'', trim(to_char(v_amount, ''FM999999990.000'')) || '' د.ك على '' || v_n || '' بائع'',' || chr(10) ||
    '      ''hint'', ''أرصدة مفتوحة في حساب البائعين الجاري — سجّل التحصيل من تاب «٧. حساب البائعين».'',' || chr(10) ||
    '      ''count'', v_n, ''route'', ''/finance'');';
begin
  v_def := pg_get_functiondef('public.admin_launch_readiness()'::regprocedure);

  if (length(v_def) - length(replace(v_def, v_from, ''))) / length(v_from) <> 1 then
    raise exception 'مرساة شرط العمولة مش موجودة مرة واحدة';
  end if;
  if (length(v_def) - length(replace(v_def, v_detail_from, ''))) / length(v_detail_from) <> 1 then
    raise exception 'مرساة نص البند مش موجودة مرة واحدة';
  end if;

  execute replace(replace(v_def, v_from, v_to), v_detail_from, v_detail_to);
end $mig$;

notify pgrst, 'reload schema';
