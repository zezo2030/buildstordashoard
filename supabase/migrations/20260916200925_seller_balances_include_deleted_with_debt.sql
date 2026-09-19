-- البائع المحذوف اللي عليه فلوس لازم يفضل ظاهر.
--
-- أول تشغيل للقائمة طلّع 104.389 د.ك بس من أصل 1,173.639. الباقي —
-- **1,069.250 د.ك، يعني 91%** — كان على «مؤسسة الخليج للتكييف والسباكة»
-- وهي محذوفة (`deleted_at`)، والفلتر كان بيشيلها.
--
-- الحذف بيوقف التعامل مع البائع، **ما بيلغيش مديونيته**. فالمحذوف بيفضل ظاهر
-- طول ما رصيده مش صفر، ومعلّم عشان الأدمن يعرف إنه مش هيلاقيه في قائمة
-- البائعين العادية.

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

  select coalesce(jsonb_agg(t order by t.balance_sort), '[]'::jsonb) into v
    from (
      select c.id,
             c.name_ar                        as name,
             c.is_active,
             c.deleted_at is not null          as deleted,
             coalesce(sum(l.amount), 0)::text  as balance,
             coalesce(-sum(l.amount) filter (where l.kind in ('commission','subscription')), 0)::text as charged,
             coalesce(sum(l.amount) filter (where l.kind = 'settlement'), 0)::text as settled,
             max(l.entry_date)                 as last_entry,
             count(l.id)                       as n_entries,
             coalesce(sum(l.amount), 0)        as balance_sort
        from public.companies c
        join public.seller_ledger l on l.seller_company_id = c.id
       where c.type = 'seller'
         and (v_q is null or c.name_ar ilike '%' || v_q || '%')
         -- المحذوف بيظهر بس لو لسه عليه أو ليه فلوس
         and (c.deleted_at is null
              or (select coalesce(sum(l2.amount), 0) from public.seller_ledger l2
                   where l2.seller_company_id = c.id) <> 0)
       group by c.id, c.name_ar, c.is_active, c.deleted_at
    ) t;

  return v;
end $fn$;

notify pgrst, 'reload schema';
