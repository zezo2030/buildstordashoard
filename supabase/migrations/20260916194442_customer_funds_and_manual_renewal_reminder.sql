create or replace view app.customer_wallets as
  select w.id,
         w.owner_type,
         w.owner_id,
         w.balance::numeric as balance,
         case
           when w.owner_type = 'company' then
             (select c.type::text from public.companies c
               where c.id = w.owner_id and c.deleted_at is null)
           else
             (select case when p.role in ('individual_buyer', 'company_buyer') then 'buyer'
                          when p.role = 'seller'                              then 'seller'
                     end
                from public.profiles p
               where p.id = w.owner_id and p.deleted_at is null)
         end as side
    from public.wallets w
   where not exists (
     select 1 from public.profiles p
      where w.owner_type = 'user' and p.id = w.owner_id and p.role = 'admin');

comment on view app.customer_wallets is
  'محافظ العملاء — أموال المنصة مدينة بيها. أمانة مش ربح، وما تدخلش الرصيد المتاح للسحب.';

do $mig$
declare
  v_def text;
  v_from constant text :=
    '  select coalesce(sum(w.amount), 0) into v_withdrawn from public.platform_withdrawals w;';
  v_to text;
  v_ret_from constant text :=
    '    ''balance'',         (v_all_comm + v_all_subs - v_all_refunds - v_withdrawn)::text);';
  v_ret_to constant text :=
    '    ''balance'',         (v_all_comm + v_all_subs - v_all_refunds - v_withdrawn)::text,' || chr(10) ||
    '    -- أمانة مش ربح: الحساب البنكي شايل ده كمان، وما ينفعش يتسحب.' || chr(10) ||
    '    ''customer_funds'',  v_cust_funds::text,' || chr(10) ||
    '    ''buyer_funds'',     v_buyer_funds::text,' || chr(10) ||
    '    ''seller_funds'',    v_seller_funds::text,' || chr(10) ||
    '    ''customer_topups'', v_cust_topups::text,' || chr(10) ||
    '    ''customer_payouts'',v_cust_payouts::text);';
  v_dec_from constant text := '  v_withdrawn    numeric;';
  v_dec_to   constant text :=
    '  v_withdrawn    numeric;' || chr(10) ||
    '  v_cust_funds   numeric;' || chr(10) ||
    '  v_buyer_funds  numeric;' || chr(10) ||
    '  v_seller_funds numeric;' || chr(10) ||
    '  v_cust_topups  numeric;' || chr(10) ||
    '  v_cust_payouts numeric;';
begin
  v_to := v_from || chr(10) || chr(10) ||
    '  -- أموال العملاء: رقم لحظي (الأمانة دلوقتي كام) مش حركة فترة.' || chr(10) ||
    '  select coalesce(sum(cw.balance), 0),' || chr(10) ||
    '         coalesce(sum(cw.balance) filter (where cw.side = ''buyer''), 0),' || chr(10) ||
    '         coalesce(sum(cw.balance) filter (where cw.side = ''seller''), 0)' || chr(10) ||
    '    into v_cust_funds, v_buyer_funds, v_seller_funds' || chr(10) ||
    '    from app.customer_wallets cw;' || chr(10) || chr(10) ||
    '  -- الحركة بتتبع الفلتر: دخل كام وخرج كام من أموال العملاء في الفترة.' || chr(10) ||
    '  select coalesce(sum(t.amount) filter (where t.amount > 0), 0),' || chr(10) ||
    '         coalesce(-sum(t.amount) filter (where t.amount < 0), 0)' || chr(10) ||
    '    into v_cust_topups, v_cust_payouts' || chr(10) ||
    '    from public.wallet_transactions t' || chr(10) ||
    '    join app.customer_wallets cw on cw.id = t.wallet_id' || chr(10) ||
    '   where t.created_at >= v_from and t.created_at < v_to;';

  v_def := pg_get_functiondef('public.admin_platform_balance(date,date)'::regprocedure);

  if (length(v_def) - length(replace(v_def, v_dec_from, ''))) / length(v_dec_from) <> 1 then
    raise exception 'مرساة التعريفات مش موجودة مرة واحدة في admin_platform_balance';
  end if;
  if (length(v_def) - length(replace(v_def, v_from, ''))) / length(v_from) <> 1 then
    raise exception 'مرساة المسحوب مش موجودة مرة واحدة في admin_platform_balance';
  end if;
  if (length(v_def) - length(replace(v_def, v_ret_from, ''))) / length(v_ret_from) <> 1 then
    raise exception 'مرساة الإرجاع مش موجودة مرة واحدة في admin_platform_balance';
  end if;

  execute replace(replace(replace(v_def, v_dec_from, v_dec_to), v_from, v_to),
                  v_ret_from, v_ret_to);
end $mig$;

create or replace function public.admin_notify_plan_expiry(
  p_subject_type public.billing_subject,
  p_subject_id   uuid
) returns int
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $fn$
declare
  v_ends  date;
  v_name  text;
  v_body  text;
  v_route text;
  v_n     int := 0;
begin
  if not app.is_admin() then
    raise exception 'غير مصرح: هذه العملية للأدمن فقط' using errcode = '42501';
  end if;

  select bp.ends_on into v_ends
    from public.billing_plans bp
   where bp.subject_type = p_subject_type
     and bp.subject_id = p_subject_id
     and bp.is_active
     and bp.ends_on is not null
   order by bp.ends_on
   limit 1;
  if v_ends is null then
    raise exception 'مافيش خطة رسوم سارية بتاريخ انتهاء لهذا الحساب' using errcode = 'P0002';
  end if;

  v_body := case
    when v_ends < current_date then
      'اشتراكك انتهى يوم ' || to_char(v_ends, 'YYYY-MM-DD') || '. جدّد عشان حسابك يرجع يشتغل.'
    else
      'اشتراكك ينتهي في ' || to_char(v_ends, 'YYYY-MM-DD')
        || '. جدّد قبل التاريخ ده عشان حسابك ما يتوقفش.'
  end;

  if p_subject_type = 'seller' then
    select c.name_ar into v_name from public.companies c where c.id = p_subject_id;
    v_route := '/contract';

    insert into public.notifications (user_id, type, title_ar, body_ar, title_en, body_en, data)
    select cm.user_id, 'system', 'تذكير بتجديد الاشتراك', v_body,
           'Renewal reminder',
           'Your subscription ends on ' || to_char(v_ends, 'YYYY-MM-DD') || '.',
           jsonb_build_object('route', v_route)
      from public.company_members cm
     where cm.company_id = p_subject_id and cm.status = 'active';
    get diagnostics v_n = row_count;
  else
    select p.full_name into v_name from public.profiles p where p.id = p_subject_id;
    v_route := '/subscription';

    insert into public.notifications (user_id, type, title_ar, body_ar, title_en, body_en, data)
    values (p_subject_id, 'system', 'تذكير بتجديد الاشتراك', v_body,
            'Renewal reminder',
            'Your subscription ends on ' || to_char(v_ends, 'YYYY-MM-DD') || '.',
            jsonb_build_object('route', v_route));
    get diagnostics v_n = row_count;
  end if;

  if v_n = 0 then
    raise exception 'مافيش مستخدم نشط على هذا الحساب يستقبل الإشعار' using errcode = 'P0002';
  end if;

  insert into public.audit_log (actor_id, action, entity, entity_id, after)
  values (auth.uid(), 'notify_plan_expiry', p_subject_type::text, p_subject_id::text,
          jsonb_build_object('ends_on', v_ends, 'name', v_name, 'recipients', v_n));

  return v_n;
end $fn$;

notify pgrst, 'reload schema';
