create or replace function public.admin_launch_readiness()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $fn$
declare
  v_checks     jsonb := '[]'::jsonb;
  v_n          bigint;
  v_amount     numeric;
  v_names      text;
begin
  if not app.is_admin() then
    raise exception 'غير مصرح: هذه العملية للأدمن فقط' using errcode = '42501';
  end if;

  select count(*),
         string_agg(c.name_ar, ' · ' order by c.name_ar)
    into v_n, v_names
    from public.companies c
   where c.deleted_at is null and c.type = 'seller' and c.is_active
     and not exists (select 1 from public.company_members m
                      where m.company_id = c.id and m.status = 'active');
  if v_n > 0 then
    v_checks := v_checks || jsonb_build_object(
      'key', 'sellers_without_users', 'level', 'blocker',
      'title', 'بائعون نشطون من غير مستخدمين',
      'detail', v_names,
      'hint', 'المشتري يقدر يطلب منهم، وهما مش قادرين يدخلوا يشوفوا الطلب ولا يجددوا العقد.',
      'count', v_n, 'route', '/companies');
  end if;

  select coalesce(sum(w.balance), 0), count(*)
    into v_amount, v_n
    from app.customer_wallets w
   where w.balance >= 1000000;
  if v_n > 0 then
    v_checks := v_checks || jsonb_build_object(
      'key', 'unreal_balances', 'level', 'blocker',
      'title', 'أرصدة غير واقعية في المحافظ',
      'detail', trim(to_char(v_amount, 'FM999999999990.000')) || ' د.ك في ' || v_n || ' محفظة',
      'hint', 'شحنة تجريبية. هتظهر في «أموال العملاء» وتبوّظ كل أرقام الخزنة.',
      'count', v_n, 'route', '/wallets');
  end if;

  select count(*) into v_n from public.payments where gateway = 'mock';
  if v_n > 0 then
    v_checks := v_checks || jsonb_build_object(
      'key', 'mock_payments', 'level', 'blocker',
      'title', 'دفعات وهمية مسجّلة',
      'detail', v_n || ' دفعة',
      'hint', 'الوضع الوهمي بيشتغل لوحده طول ما مفتاح البوابة ناقص. اضبط '
              || 'MYFATOORAH_API_KEY أو PAYMENT_MOCK=false قبل أول مستخدم حقيقي.',
      'count', v_n, 'route', '/finance');
  end if;

  select count(*) into v_n
    from public.profiles p
   where p.deleted_at is null
     and (p.email like '%@buildstore.test' or p.full_name like '%تجريبي%');
  if v_n > 0 then
    v_checks := v_checks || jsonb_build_object(
      'key', 'test_accounts', 'level', 'warning',
      'title', 'حسابات تجريبية',
      'detail', v_n || ' حساب',
      'hint', 'حسابات بإيميلات ‎@buildstore.test أو اسمها فيه «تجريبي».',
      'count', v_n, 'route', '/users');
  end if;

  select count(*) into v_n
    from public.companies c
   where c.deleted_at is null and c.name_ar like '%تجريبي%';
  if v_n > 0 then
    v_checks := v_checks || jsonb_build_object(
      'key', 'test_companies', 'level', 'warning',
      'title', 'شركات تجريبية',
      'detail', v_n || ' شركة',
      'hint', 'اسمها فيه «تجريبي» — تتشال أو يتغيّر اسمها قبل الإطلاق.',
      'count', v_n, 'route', '/companies');
  end if;

  select coalesce(sum(s.commission_amount), 0) into v_amount from app.realized_sales s;
  if v_amount > 0
     and not exists (select 1 from public.platform_fees where kind = 'commission') then
    v_checks := v_checks || jsonb_build_object(
      'key', 'commission_uncollected', 'level', 'warning',
      'title', 'عمولة محسوبة وما اتحصّلتش',
      'detail', trim(to_char(v_amount, 'FM999999990.000')) || ' د.ك',
      'hint', 'العمولة رقم على الطلب — مفيش قيد تحصيل ولا خصم من البائع. '
              || 'معظم البيع كاش عند الاستلام فالفلوس بتروح للبائع مباشرة.',
      'count', 0, 'route', '/finance');
  end if;

  select count(*) into v_n
    from public.seller_products sp
    join public.companies c on c.id = sp.seller_company_id
   where sp.is_active and c.deleted_at is null
     and not app.company_visible_to_buyers(sp.seller_company_id);
  if v_n > 0 then
    v_checks := v_checks || jsonb_build_object(
      'key', 'offers_of_hidden_sellers', 'level', 'warning',
      'title', 'عروض شغّالة لبائعين مخفيين',
      'detail', v_n || ' عرض',
      'hint', 'العرض مفعّل والبائع مش ظاهر للمشترين — يتقفل عشان ما يفضلش في العربات.',
      'count', v_n, 'route', '/products');
  end if;

  return jsonb_build_object(
    'checked_at', now(),
    'blockers',   (select count(*) from jsonb_array_elements(v_checks) c
                    where c->>'level' = 'blocker'),
    'warnings',   (select count(*) from jsonb_array_elements(v_checks) c
                    where c->>'level' = 'warning'),
    'checks',     v_checks);
end $fn$;

comment on function public.admin_launch_readiness() is
  'فحص جاهزية الإطلاق — بيقرا بس، وبيختفي من اللوحة لما كل بند يتظبط.';

notify pgrst, 'reload schema';
