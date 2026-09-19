alter table public.companies
  alter column payment_methods drop default;

alter table public.companies
  alter column payment_methods type public.payment_method[]
  using payment_methods::public.payment_method[];

alter table public.companies
  alter column payment_methods set default '{}'::public.payment_method[];

comment on column public.companies.payment_methods is
  'طرق الدفع اللي البائع بيقبلها. فاضية = كل الطرق. الأدمن بس بيعدّلها.';

create or replace function app.company_accepts_payment(
  p_company_id uuid,
  p_method     public.payment_method
) returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $fn$
  select coalesce(
    (select cardinality(c.payment_methods) = 0 or p_method = any (c.payment_methods)
       from public.companies c
      where c.id = p_company_id),
    false);
$fn$;

comment on function app.company_accepts_payment(uuid, public.payment_method) is
  'هل البائع بيقبل طريقة الدفع دي؟ قائمة فاضية = كل الطرق.';

do $mig$
declare
  v_def text;
  v_dec_from constant text := '  v_stopped_nm text;';
  v_dec_to   constant text := '  v_stopped_nm text;'  || chr(10) || '  v_nopay_nm   text;';
  v_from constant text :=
    '  if p_payment_method = ''credit_terms'' and p_company_id is null then' || chr(10) ||
    '    raise exception ''الدفع الآجل متاح لحسابات الشركات فقط'' using errcode = ''42501'';' || chr(10) ||
    '  end if;';
  v_to text;
begin
  v_to := v_from || chr(10) || chr(10) ||
    '  -- البائع بيحدد الطرق اللي بيقبلها (فاضية = الكل). الشاشة بتخفي اللي' || chr(10) ||
    '  -- مش مقبول، وده الحارس اللي بيرفض لو الطلب جه من غير الشاشة أو لو' || chr(10) ||
    '  -- الأدمن ضيّق الطرق والعربة كانت مفتوحة من قبلها.' || chr(10) ||
    '  select c.name_ar into v_nopay_nm' || chr(10) ||
    '    from public.cart_items ci' || chr(10) ||
    '    join public.seller_products sp on sp.id = ci.seller_product_id' || chr(10) ||
    '    join public.companies c on c.id = sp.seller_company_id' || chr(10) ||
    '   where ci.cart_id = v_cart.id and ci.is_selected' || chr(10) ||
    '     and (p_seller_company_id is null or sp.seller_company_id = p_seller_company_id)' || chr(10) ||
    '     and not app.company_accepts_payment(sp.seller_company_id, p_payment_method)' || chr(10) ||
    '   limit 1;' || chr(10) ||
    '  if v_nopay_nm is not null then' || chr(10) ||
    '    raise exception ''المورّد % لا يقبل طريقة الدفع المختارة — اختر طريقة تانية'', v_nopay_nm' || chr(10) ||
    '      using errcode = ''23514'';' || chr(10) ||
    '  end if;';

  v_def := pg_get_functiondef(
    'public.place_order(uuid,payment_method,uuid,uuid,text,text,uuid)'::regprocedure);

  if (length(v_def) - length(replace(v_def, v_dec_from, ''))) / length(v_dec_from) <> 1 then
    raise exception 'مرساة التعريفات مش موجودة مرة واحدة في place_order';
  end if;
  if (length(v_def) - length(replace(v_def, v_from, ''))) / length(v_from) <> 1 then
    raise exception 'مرساة حارس الآجل مش موجودة مرة واحدة في place_order';
  end if;

  execute replace(replace(v_def, v_dec_from, v_dec_to), v_from, v_to);
end $mig$;

do $mig$
declare
  v_def text;
  v_dec_from constant text := '  v_bad        int;';
  v_dec_to   constant text := '  v_bad        int;' || chr(10) || '  v_nopay_nm   text;';
  v_from constant text :=
    '    if p_payment_method not in (''knet'', ''credit_card'', ''apple_pay'') then' || chr(10) ||
    '      raise exception ''طريقة الدفع دي مش متاحة لسداد باقي المبلغ''' || chr(10) ||
    '        using errcode = ''22023'';' || chr(10) ||
    '    end if;';
  v_to text;
begin
  v_to := v_from || chr(10) || chr(10) ||
    '    select c.name_ar into v_nopay_nm' || chr(10) ||
    '      from public.orders o' || chr(10) ||
    '      join public.companies c on c.id = o.seller_company_id' || chr(10) ||
    '     where o.order_group_id = p_order_group_id and o.status <> ''cancelled''' || chr(10) ||
    '       and not app.company_accepts_payment(o.seller_company_id, p_payment_method)' || chr(10) ||
    '     limit 1;' || chr(10) ||
    '    if v_nopay_nm is not null then' || chr(10) ||
    '      raise exception ''المورّد % لا يقبل طريقة الدفع دي'', v_nopay_nm' || chr(10) ||
    '        using errcode = ''23514'';' || chr(10) ||
    '    end if;';

  v_def := pg_get_functiondef(
    'public.pay_order(uuid,money_kwd,boolean,payment_method)'::regprocedure);

  if (length(v_def) - length(replace(v_def, v_dec_from, ''))) / length(v_dec_from) <> 1 then
    raise exception 'مرساة التعريفات مش موجودة مرة واحدة في pay_order';
  end if;
  if (length(v_def) - length(replace(v_def, v_from, ''))) / length(v_from) <> 1 then
    raise exception 'مرساة تحويل الطريقة مش موجودة مرة واحدة في pay_order';
  end if;

  execute replace(replace(v_def, v_dec_from, v_dec_to), v_from, v_to);
end $mig$;

notify pgrst, 'reload schema';
