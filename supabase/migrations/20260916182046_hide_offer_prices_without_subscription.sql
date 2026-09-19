-- الاشتراك خلص ⇒ مفيش أسعار.
--
-- المشتري بيقرا الأسعار من `seller_products` مباشرة بالصلاحيات (مش عبر دالة):
-- أقل سعر في قايمة المنتجات، عروض الموردين في صفحة المنتج، كتالوج الشركة،
-- البحث، التخصصات. عشان كده المنع اتحط في صلاحية القراءة نفسها بدل ما يتحط في
-- كل شاشة — كده مفيش مسار منسي يسرّب سعر.
--
-- بيتخفي **صف العرض كله** مش عمود السعر: بوستجرس صلاحياته على الصفوف مش على
-- الأعمدة، والعرض من غير سعره مالوش معنى أصلاً.
--
-- اللي ما اتأثرش:
--   البائع بيشوف عروضه هو (الفرع التاني) · الأدمن (التالت) · الزائر `anon`
--   بسياسته المنفصلة · فواتير المشتري وطلباته القديمة — دي سجلاته هو،
--   والأسعار فيها اتثبتت وقت الشراء.
--
-- `app.subscription_active()` بترجّع `true` لأي دور مش مشتري، فالبائع اللي
-- بيتفرّج على السوق ما بيتأثرش. وملفوفة في `(select ...)` عشان تتحسب مرة
-- واحدة للاستعلام كله مش صف صف — نفس أسلوب `app.account_user_id()` في باقي
-- السياسات.

drop policy if exists seller_products_read on public.seller_products;

create policy seller_products_read on public.seller_products
  for select to authenticated
  using (
    (is_active
     and app.company_visible_to_buyers(seller_company_id)
     and (select app.subscription_active()))
    or (seller_company_id in (select app.seller_company_ids()))
    or app.is_admin()
  );
