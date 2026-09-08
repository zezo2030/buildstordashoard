# الهجرات (migrations)

مصدر الحقيقة لسكيما المشروع هو Supabase نفسه: كل هجرة اتطبّقت متسجّلة في
`supabase_migrations.schema_migrations` على مشروع **Build Store**
(`saiwbrybhtssrzjwavxr`). المجلد ده فيه نسخ من الهجرات المهمة بس — مش أرشيف
كامل. لتصدير السكيما كاملة:

```
supabase link --project-ref saiwbrybhtssrzjwavxr
supabase db pull
```

## هجرات ملاحظات لوحة التحكم — 2026-09-07

| الإصدار | الاسم | اللي بيعمله |
| --- | --- | --- |
| 20260907124709 | `catalog_placements_and_deletes` | جدول `product_placements` (المنتج في أكتر من مكان في الشجرة) + view `v_product_placements` بالمسار الكامل + `admin_delete_products` (حذف جماعي) + `admin_delete_return_reason` |
| 20260907125050 | `billing_plans_seller_profile_and_account_delete` | أعمدة بيانات البائع على `companies` (طرق الدفع، رقم العقد، الرقم الآلي للمحل، `deleted_at`) + `seller_specialties` + `billing_plans` + `platform_fees` + `admin_set_billing_plan` / `admin_collect_subscription` + `admin_delete_account` / `admin_delete_company` |
| 20260907125152 | `accounts_rows_billing_and_return_commission_refund` | `app.accounts_rows` بترجّع خطة الرسوم ومدّتها والرسوم المحصّلة، وبتستبعد المحذوف |
| 20260907125331 | `return_commission_refund_and_finance_rpcs` | `receive_return` بيرجّع عمولة المواد المرتجعة للبائع + `admin_finance_summary` / `admin_finance_returns` / `admin_finance_stats` |
| 20260907125402 | `fix_receive_return_order_lookup` | تصحيح فحص وجود الطلب جوّه `receive_return` |
| 20260907125504 | `backfill_seller_commission_billing_plans` | تحويل `companies.commission_rate` القديمة لخطط رسوم نشطة |
| 20260907130347 | `product_primary_placement_trigger` | تريجر بيضمن إن كل منتج ليه مكان أساسي مهما كان مسار الإضافة |
| 20260907130859 | `returns_stats_add_fees_refunded` | `admin_returns_stats` بترجّع الرسوم المعادة للبائعين |
| 20260907132543 | `invoices_hide_cancelled_orders_by_default` | فواتير الطلبات الملغية مخفية افتراضيًا في `admin_invoices_list` / `admin_invoices_stats` |
| 20260907132604 | `drop_old_invoices_overloads` | حذف التوقيعات القديمة بعد إضافة `p_include_cancelled` |
| 20260907133101 | `clear_placeholder_origin_and_brand` | تفريغ قيم «N/A» من `products.brand` و`origin_country` و`seller_products.origin_country` |

> ملاحظة: إضافة وسيط بقيمة افتراضية لدالة موجودة بتعمل **دالة جديدة** جنب
> القديمة، والاستدعاء بيبقى ملتبس — لازم `drop function` للتوقيع القديم بعدها.

## هجرات ملاحظات لوحة التحكم 002 — 2026-09-08

| الإصدار | الاسم | اللي بيعمله |
| --- | --- | --- |
| 20260908090000 | `admin_catalog_deletes_and_products_list` | `admin_delete_specialty` و`admin_delete_unit` (بيرفضوا الحذف ويقولوا السبب بالعربي) + `admin_products_list` بفلتر عدد عروض البائعين |
| 20260908090500 | `orders_current_scope` | `p_scope` (`current`/`archived`/`all`) في `app.orders_rows` و`admin_orders_list` — الافتراضي «الجاري»، والتوقيعين القدام اتدروبوا |
| 20260908091000 | `account_dashboard_sites_and_reports` | `app.order_site` (الموقع = موقع مسجّل أو عنوان توصيل) + `app.buyer_dashboard_json` و`admin_seller_dashboard` بتقارير المنتجات لكل طرف/موقع وعدد المواد والطلبات والمرتجعات |
| 20260908091500 | `billing_expiry_and_finance_return_order` | `admin_expiring_billing_plans` + `order_id` في صفوف `admin_finance_returns` |
