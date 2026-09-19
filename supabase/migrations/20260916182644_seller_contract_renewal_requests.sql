-- تجديد عقد البائع: طلب من البائع ← إشعار ← موافقة/رفض ← تمديد أو إيقاف.
--
-- **اللي كان موجود**: `billing_plans.ends_on` لكل بائع، وكرون
-- `suspend-expired-subscriptions` بيوقف الشركة أول ما العقد يخلص،
-- و`admin_set_billing_plan` بتفك الإيقاف لوحدها لما التاريخ يتمدّ.
-- **اللي كان ناقص**: البائع مش عارف إن عقده قرب يخلص (ما بيوصلوش إشعار)،
-- ومفيش طريقة يطلب بيها التجديد، وإنت مالكش صندوق طلبات تراجعه.
--
-- **عقد البائع مش زي اشتراك المشتري**: ده اتفاق لكل بائع على حدة — النِسب
-- عندك دلوقتي 5% · 1% · 5% مختلفة فعلاً — فبيفضل في `billing_plans` زي ما هو.
-- اللي بنضيفه هو **مسار الطلب والموافقة** فوقه.
--
-- العقد المفتوح (`ends_on is null`) مش داخل في ده خالص: مالوش نهاية فمالوش
-- تجديد. تلات بائعين من الأربعة عندك كده دلوقتي.

create table if not exists public.seller_renewal_requests (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.companies(id) on delete cascade,
  requested_by uuid references public.profiles(id),
  status       text not null default 'pending'
                 check (status in ('pending', 'approved', 'rejected')),
  -- `ends_on` وقت الطلب: عشان الطلب يفضل مقروء بعد ما الخطة تتغيّر.
  ends_on_at_request date,
  note         text,
  admin_note   text,
  new_ends_on  date,
  requested_at timestamptz not null default now(),
  decided_at   timestamptz,
  decided_by   uuid references public.profiles(id)
);

comment on table public.seller_renewal_requests is
  'طلبات تجديد عقود البائعين. التمديد نفسه بيتسجّل في billing_plans.';

-- طلب معلّق واحد لكل شركة — ضغط الزرار مرتين مابيعملش طلبين في الصندوق.
create unique index if not exists seller_renewal_one_pending
  on public.seller_renewal_requests (company_id)
  where status = 'pending';

create index if not exists seller_renewal_status_idx
  on public.seller_renewal_requests (status, requested_at desc);

alter table public.seller_renewal_requests enable row level security;

drop policy if exists seller_renewal_read on public.seller_renewal_requests;
create policy seller_renewal_read on public.seller_renewal_requests
  for select to authenticated
  using (company_id in (select app.seller_company_ids()) or app.is_admin());

drop policy if exists seller_renewal_admin on public.seller_renewal_requests;
create policy seller_renewal_admin on public.seller_renewal_requests
  for all to authenticated
  using (app.is_admin()) with check (app.is_admin());

-- الكتابة للبائع بتمرّ من `seller_request_renewal` (security definer) بس —
-- مفيش سياسة insert عشان مايقدرش يكتب حالة أو تاريخ بإيده.

-- ---------------------------------------------------------------------------
-- البائع: يقرا عقده ويطلب التجديد
--
-- `billing_plans` مقفولة على الأدمن في الـRLS، فالبائع محتاج دالة تجمّعله
-- عقده وحالة طلبه في نداء واحد.

create or replace function public.my_seller_contract()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $fn$
declare
  v_company uuid;
  v_plan    record;
  v_req     record;
  v_co      record;
begin
  select x.id into v_company from (select app.seller_company_ids() as id) x limit 1;
  if v_company is null then
    raise exception 'هذه الشاشة للبائعين فقط' using errcode = '42501';
  end if;

  select c.name_ar, c.is_active, c.suspended_at, c.suspend_reason
    into v_co from public.companies c where c.id = v_company;

  select bp.kind::text as kind, bp.rate, bp.fee, bp.starts_on, bp.ends_on
    into v_plan
    from public.billing_plans bp
   where bp.subject_type = 'seller' and bp.subject_id = v_company and bp.is_active
   order by bp.created_at desc limit 1;

  select r.id, r.status, r.requested_at, r.decided_at, r.admin_note, r.new_ends_on
    into v_req
    from public.seller_renewal_requests r
   where r.company_id = v_company
   order by r.requested_at desc limit 1;

  return jsonb_build_object(
    'company_id',   v_company,
    'company_name', v_co.name_ar,
    'suspended',    v_co.suspended_at is not null or not v_co.is_active,
    'suspend_reason', v_co.suspend_reason,
    'kind',       v_plan.kind,
    'rate',       v_plan.rate::text,
    'fee',        v_plan.fee::text,
    'starts_on',  v_plan.starts_on,
    'ends_on',    v_plan.ends_on,
    -- null = عقد مفتوح بلا نهاية ⇒ مفيش تجديد أصلاً، والشاشة بتقول كده.
    'days_left',  case when v_plan.ends_on is null then null
                       else v_plan.ends_on - current_date end,
    'request', case when v_req.id is null then null else jsonb_build_object(
      'id', v_req.id, 'status', v_req.status, 'requested_at', v_req.requested_at,
      'decided_at', v_req.decided_at, 'admin_note', v_req.admin_note,
      'new_ends_on', v_req.new_ends_on) end);
end $fn$;

create or replace function public.seller_request_renewal(p_note text default null)
returns uuid
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $fn$
declare
  v_company uuid;
  v_ends    date;
  v_id      uuid;
  v_name    text;
begin
  select x.id into v_company from (select app.seller_company_ids() as id) x limit 1;
  if v_company is null then
    raise exception 'هذه العملية للبائعين فقط' using errcode = '42501';
  end if;

  select bp.ends_on into v_ends
    from public.billing_plans bp
   where bp.subject_type = 'seller' and bp.subject_id = v_company and bp.is_active
   order by bp.created_at desc limit 1;

  if exists (select 1 from public.seller_renewal_requests r
              where r.company_id = v_company and r.status = 'pending') then
    raise exception 'عندك طلب تجديد قيد المراجعة بالفعل' using errcode = '23505';
  end if;

  insert into public.seller_renewal_requests
    (company_id, requested_by, ends_on_at_request, note)
  values (v_company, auth.uid(), v_ends, nullif(trim(coalesce(p_note, '')), ''))
  returning id into v_id;

  select c.name_ar into v_name from public.companies c where c.id = v_company;

  -- إشعار لكل أدمن: الصندوق في اللوحة، والإشعار عشان محدش يستنى أسبوع.
  insert into public.notifications (user_id, type, title_ar, body_ar, title_en, body_en, data)
  select p.id, 'system', 'طلب تجديد عقد',
         v_name || ' طلب تجديد العقد.',
         'Contract renewal request',
         v_name || ' requested a contract renewal.',
         jsonb_build_object('route', '/companies/' || v_company, 'renewal_id', v_id)
    from public.profiles p
   where p.role = 'admin' and p.deleted_at is null and p.status = 'active';

  return v_id;
end $fn$;

-- ---------------------------------------------------------------------------
-- الأدمن: الصندوق والقرار

create or replace function public.admin_seller_renewals_list(
  p_status text default 'pending'
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
  if p_status not in ('all', 'pending', 'approved', 'rejected') then
    raise exception 'حالة غير معروفة: %', p_status using errcode = '22023';
  end if;

  select coalesce(jsonb_agg(t order by t.requested_at desc), '[]'::jsonb) into v
    from (
      select r.id, r.company_id, r.status, r.note, r.admin_note,
             r.ends_on_at_request, r.new_ends_on, r.requested_at, r.decided_at,
             c.name_ar as company_name,
             (c.suspended_at is not null or not c.is_active) as suspended,
             b.full_name as requested_by_name,
             bp.kind::text as kind, bp.rate::text as rate, bp.fee::text as fee,
             bp.ends_on as current_ends_on
        from public.seller_renewal_requests r
        join public.companies c on c.id = r.company_id
        left join public.profiles b on b.id = r.requested_by
        left join public.billing_plans bp
               on bp.subject_type = 'seller' and bp.subject_id = r.company_id and bp.is_active
       where p_status = 'all' or r.status = p_status
    ) t;

  return v;
end $fn$;

/**
 * قرار على طلب التجديد.
 *
 * الموافقة بتعدّي على `admin_set_billing_plan` بنفس شروط العقد الحالية وتاريخ
 * جديد — ودي اللي **بتفك إيقاف الشركة لوحدها** لو كانت متوقفة لعدم التجديد،
 * فمفيش خطوة تانية تتنسى.
 *
 * الرفض مابيوقفش الشركة: الإيقاف بيحصل لوحده من الكرون لما التاريخ يعدّي.
 */
create or replace function public.admin_decide_renewal(
  p_id       uuid,
  p_approve  boolean,
  p_ends_on  date default null,
  p_note     text default null
) returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $fn$
declare
  v_req     record;
  v_plan    record;
  v_rate    numeric;
begin
  if not app.is_admin() then
    raise exception 'غير مصرح: هذه العملية للأدمن فقط' using errcode = '42501';
  end if;

  select * into v_req from public.seller_renewal_requests where id = p_id for update;
  if v_req.id is null then
    raise exception 'الطلب غير موجود' using errcode = 'P0002';
  end if;
  if v_req.status <> 'pending' then
    raise exception 'الطلب تم البت فيه بالفعل' using errcode = '22023';
  end if;

  if p_approve then
    if p_ends_on is null then
      raise exception 'حدّد تاريخ نهاية العقد الجديد' using errcode = '22023';
    end if;
    if p_ends_on < current_date then
      raise exception 'تاريخ النهاية لا يمكن أن يكون في الماضي' using errcode = '22023';
    end if;

    select bp.kind::text as kind, bp.rate, bp.fee, bp.starts_on
      into v_plan
      from public.billing_plans bp
     where bp.subject_type = 'seller' and bp.subject_id = v_req.company_id and bp.is_active
     order by bp.created_at desc limit 1;

    -- مفيش خطة سارية ⇒ بنكمل بنسبة الشركة الحالية بدل ما نرفض الطلب.
    if v_plan.kind is null then
      select c.commission_rate into v_rate from public.companies c where c.id = v_req.company_id;
      perform public.admin_set_billing_plan(
        'seller', v_req.company_id, 'commission', coalesce(v_rate, 5), 0,
        current_date, p_ends_on, null, 'تجديد عقد');
    else
      perform public.admin_set_billing_plan(
        'seller', v_req.company_id, v_plan.kind, v_plan.rate, v_plan.fee,
        coalesce(v_plan.starts_on, current_date), p_ends_on, null, 'تجديد عقد');
    end if;
  end if;

  update public.seller_renewal_requests
     set status = case when p_approve then 'approved' else 'rejected' end,
         admin_note = nullif(trim(coalesce(p_note, '')), ''),
         new_ends_on = case when p_approve then p_ends_on end,
         decided_at = now(), decided_by = auth.uid()
   where id = p_id;

  insert into public.notifications (user_id, type, title_ar, body_ar, title_en, body_en, data)
  select cm.user_id, 'system',
         case when p_approve then 'تم تجديد عقدك' else 'طلب التجديد مرفوض' end,
         case when p_approve
              then 'عقدك سارٍ حتى ' || to_char(p_ends_on, 'YYYY-MM-DD') || '.'
              else coalesce(nullif(trim(coalesce(p_note, '')), ''),
                            'تواصل مع الدعم لمعرفة التفاصيل.') end,
         case when p_approve then 'Contract renewed' else 'Renewal rejected' end,
         case when p_approve
              then 'Your contract is active until ' || to_char(p_ends_on, 'YYYY-MM-DD') || '.'
              else 'Contact support for details.' end,
         jsonb_build_object('route', '/contract')
    from public.company_members cm
   where cm.company_id = v_req.company_id and cm.status = 'active';

  return jsonb_build_object('status', case when p_approve then 'approved' else 'rejected' end,
                            'ends_on', p_ends_on);
end $fn$;

-- ---------------------------------------------------------------------------
-- التذكير قبل نهاية العقد
--
-- من غيره البائع بيعرف إن عقده خلص لما شركته تقف — وده أسوأ وقت يعرف فيه.
-- نفس مفتاح `subscription_reminder_days` عشان مانكترش أرقام الإعدادات.

create or replace function app.notify_expiring_seller_contracts()
returns integer
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $fn$
declare
  v_days int := app.setting_int('subscription_reminder_days', 3);
  v_n    int := 0;
  r      record;
begin
  for r in
    select bp.subject_id as company_id, bp.ends_on, c.name_ar
      from public.billing_plans bp
      join public.companies c on c.id = bp.subject_id
     where bp.subject_type = 'seller' and bp.is_active
       and bp.ends_on = current_date + v_days
       and c.deleted_at is null and c.is_active and c.suspended_at is null
       -- عنده طلب معلّق خلاص ⇒ مايتزنّقش تاني
       and not exists (select 1 from public.seller_renewal_requests sr
                        where sr.company_id = c.id and sr.status = 'pending')
  loop
    insert into public.notifications (user_id, type, title_ar, body_ar, title_en, body_en, data)
    select cm.user_id, 'system', 'عقدك قارب على الانتهاء',
           'عقدك ينتهي في ' || to_char(r.ends_on, 'YYYY-MM-DD')
             || '. اطلب التجديد قبل التاريخ ده عشان حسابك ما يتوقفش.',
           'Contract ending soon',
           'Your contract ends on ' || to_char(r.ends_on, 'YYYY-MM-DD') || '.',
           jsonb_build_object('route', '/contract')
      from public.company_members cm
     where cm.company_id = r.company_id and cm.status = 'active';
    v_n := v_n + 1;
  end loop;

  return v_n;
end $fn$;

select cron.schedule('notify-expiring-seller-contracts', '40 0 * * *',
                     'select app.notify_expiring_seller_contracts()');

notify pgrst, 'reload schema';
