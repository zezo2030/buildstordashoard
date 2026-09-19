-- كرون الإيقاف: يشمل عقود البائعين كلها، ويسيب المشترين نهائيًا.
--
-- **باجّان اتكشفوا وأنا بجرّب تجديد عقد البائع:**
--
-- (١) `suspend_expired_subscriptions` كانت بتقف عند `kind = 'subscription'`
--     بس. عقود البائعين عندك كلها `kind = 'commission'` بنسب مختلفة
--     (5% · 1% · 5%)، يعني **الإيقاف عند عدم التجديد ما كانش بيحصل لأي بائع
--     أصلاً** — العقد يخلص والشركة تفضل بتبيع. متحقَّق: خلّيت عقد بائع ينتهي
--     امبارح وناديت الدالة ⇒ رجّعت **صفر**.
--     نهاية العقد نهاية، سواء الدفع نسبة ولا مبلغ ثابت.
--
-- (٢) وأخطر: الدالة كانت هتقف **حساب مشتري**. لسه فيه صف قديم في
--     `billing_plans` لمشتري فرد بينتهي 2026-10-16، وبعد اشتراك المشتري الجديد
--     الاشتراك بقى في `profiles.subscribed_until` — فالصف القديم كان هيوقف
--     الحساب يوم 16 أكتوبر، والتعليق بيخفي المحفظة و`payment-init` بترفضه،
--     يعني العميل ما كانش هيقدر يجدّد ولا يوصل لفلوسه. المشتري بقى مستثنى
--     بالاسم مش بالصدفة: `subject_type = 'seller'`.
--
-- الصف القديم بيتعطّل هنا كمان عشان ما يفضلش يلخبط قراءة «خطة الحساب».

create or replace function app.suspend_expired_subscriptions()
returns integer
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $fn$
declare v_n integer := 0; r record;
begin
  for r in
    select bp.subject_id, bp.ends_on
      from public.billing_plans bp
     where bp.is_active
       -- البائعين بس. اشتراك المشتري مكانه `profiles.subscribed_until`،
       -- وبيقف الأسعار والعمليات — **ومابيعلّقش الحساب** عشان يفضل قادر يدفع.
       and bp.subject_type = 'seller'
       -- أي عقد ليه نهاية: نسبة أو اشتراك ثابت، الاتنين عقد.
       and bp.ends_on is not null
       and bp.ends_on < current_date
  loop
    if exists (select 1 from public.companies c
                where c.id = r.subject_id and c.deleted_at is null
                  and c.is_active and c.suspended_at is null)
       and app.suspend_company_internal(
             r.subject_id, app.subscription_suspend_reason(r.ends_on), null) then
      v_n := v_n + 1;
    end if;
  end loop;
  return v_n;
end $fn$;

-- الصف القديم: اشتراك مشتري في جدول خطط البائعين. بقى بلا معنى بعد
-- `profiles.subscribed_until`، وتعطيله بيمنع أي قراءة تانية تتلخبط بيه.
update public.billing_plans
   set is_active = false, updated_at = now(),
       note = concat_ws(' — ', note, 'اتعطّل: اشتراك المشتري بقى في profiles.subscribed_until')
 where is_active and kind = 'subscription' and subject_type <> 'seller';
