-- تنبيه اقتراب انتهاء الاشتراك + رقم الطلب في صفوف مرتجعات «المال».
--
-- خطة الرسوم ليها `ends_on` من زمان لكن محدش كان بيسأل عليه، فالأدمن كان
-- بيكتشف الاشتراك المنتهي من الحساب اللي وقف. الدالة دي بترجّع اللي قرب
-- يخلص واللي خلص فعلاً في قايمة واحدة مرتّبة بالأقرب.

create or replace function public.admin_expiring_billing_plans(p_days integer default 30)
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
  if p_days is null or p_days < 0 or p_days > 365 then
    raise exception 'عدد الأيام يجب أن يكون بين 0 و 365' using errcode = '22023';
  end if;

  select coalesce(jsonb_agg(t.obj order by t.ends_on), '[]'::jsonb)
    into v
    from (
      select bp.ends_on,
             jsonb_build_object(
               'id',        bp.subject_id,
               'subject',   bp.subject_type::text,
               'name',      case when bp.subject_type = 'seller'
                                 then c.name_ar else p.full_name end,
               'kind',      bp.kind::text,
               'fee',       round(coalesce(bp.fee, 0)::numeric, 3)::text,
               'rate',      bp.rate::text,
               'ends_on',   bp.ends_on,
               'days_left', (bp.ends_on - current_date),
               -- الحساب الموقوف أصلاً مش تنبيه، بس بيفضل في القايمة عشان
               -- الأدمن يعرف إن سبب الوقف هو الاشتراك.
               'suspended', case when bp.subject_type = 'seller'
                                 then not c.is_active else p.status <> 'active' end
             ) as obj
        from public.billing_plans bp
        left join public.companies c
               on bp.subject_type = 'seller' and c.id = bp.subject_id
        left join public.profiles p
               on bp.subject_type <> 'seller' and p.id = bp.subject_id
       where bp.is_active
         and bp.ends_on is not null
         and bp.ends_on <= (current_date + p_days)
         and (bp.subject_type <> 'seller' or (c.id is not null and c.deleted_at is null))
         and (bp.subject_type =  'seller' or (p.id is not null and p.deleted_at is null))
    ) t;

  return v;
end $fn$;

comment on function public.admin_expiring_billing_plans(integer) is
  'خطط الرسوم اللي بتنتهي خلال p_days يوم أو انتهت — للتنبيه في لوحة الأدمن';

-- صف المرتجع في «المال» كان مالوش معرف طلب، فما كانش ينفع يفتح تفاصيله
create or replace function public.admin_finance_returns(
  p_from date default null,
  p_to date default null,
  p_search text default null,
  p_limit integer default 25,
  p_offset integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $fn$
declare v_rows jsonb; v_total bigint; v_sum jsonb; v_q text;
begin
  if not app.is_admin() then
    raise exception 'غير مصرح: هذه العملية للأدمن فقط' using errcode = '42501';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 200 then
    raise exception 'حجم الصفحة يجب أن يكون بين 1 و 200' using errcode = '22023';
  end if;
  v_q := nullif(trim(coalesce(p_search, '')), '');

  with rows as (
    select r.id,
           r.return_number,
           o.id                              as order_id,
           o.order_number,
           b.full_name                       as buyer_name,
           s.name_ar                         as seller_name,
           r.status::text                    as status,
           r.refund_amount::text             as refund_amount,
           coalesce(pf.amount, 0)::text      as fees_refunded,
           coalesce(r.refunded_at, r.received_at, r.requested_at) as executed_at,
           (select coalesce(sum(ri.qty_accepted), 0) from public.return_items ri
             where ri.return_id = r.id)::text as n_items
      from public.return_requests r
      join public.orders o    on o.id = r.order_id
      join public.profiles b  on b.id = r.buyer_id
      join public.companies s on s.id = r.seller_company_id
      left join public.platform_fees pf
             on pf.return_id = r.id and pf.kind = 'commission_refund'
     where (p_from is null or r.requested_at >= app.kw_start(p_from))
       and (p_to   is null or r.requested_at <  app.kw_start(p_to + 1))
       and (v_q is null
            or r.return_number ilike '%' || v_q || '%'
            or o.order_number  ilike '%' || v_q || '%'
            or b.full_name     ilike '%' || v_q || '%'
            or s.name_ar       ilike '%' || v_q || '%')
  )
  select coalesce(jsonb_agg(to_jsonb(t) order by t.executed_at desc), '[]'::jsonb),
         (select count(*) from rows),
         (select jsonb_build_object(
                   'n_returns', count(*),
                   'refund',    coalesce(sum(refund_amount::numeric), 0)::text,
                   'fees',      coalesce(sum(fees_refunded::numeric), 0)::text)
            from rows)
    into v_rows, v_total, v_sum
    from (select * from rows order by executed_at desc
           limit p_limit offset greatest(coalesce(p_offset, 0), 0)) t;

  return jsonb_build_object('rows', v_rows, 'total', v_total, 'summary', v_sum);
end $fn$;
