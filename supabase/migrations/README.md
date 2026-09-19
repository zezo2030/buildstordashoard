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

## هجرات ملاحظات لوحة التحكم 003 — 2026-09-09

| الإصدار | الاسم | اللي بيعمله |
| --- | --- | --- |
| 20260909090000 | `category_delete_return_fee_accrual_and_subscription_suspension` | `admin_delete_category` (حذف التخصص الفرعي) + `app.return_fee_refunds` بقت استحقاق مش تحصيل + تعليق تلقائي للاشتراك المنتهي بيتفكّ بالتجديد |

## اشتراك المشتري وحساب البائع الجاري — 2026-09-16

الجولة دي كبيرة ومترابطة: اشتراك المشتري، عقود البائعين، رصيد المنصة، دفتر
حساب البائع، وكشوف الحساب الشهرية.

| الإصدار | الاسم | اللي بيعمله |
| --- | --- | --- |
| 20260916181331 | `buyer_subscription_settings_and_state` | اشتراك المشتري = إعدادات منصة + `profiles.subscribed_until`. مش خطة في `billing_plans` زي البائع |
| 20260916181428 | `buyer_subscription_gate_operations` | المنع في نقطة واحدة (`app.subscribed_account_user_id`) على ٢٤ دالة — من غير تعليق الحساب عشان يفضل قادر يدفع |
| 20260916181520 | `wallet_txn_type_subscription` | نوع حركة محفظة جديد (في ميجريشن لوحدها لأن `alter type` مينفعش في نفس المعاملة) |
| 20260916181610 | `buyer_subscription_payment_and_renewal` | الدفع من المحفظة/البوابة + كنس يومي بيجدّد ويذكّر |
| 20260916182046 | `hide_offer_prices_without_subscription` | الاشتراك خلص ⇒ صف العرض كله بيتخفي من صلاحية القراءة |
| 20260916182644 | `seller_contract_renewal_requests` | `seller_renewal_requests` + `admin_seller_renewals_list` / `admin_decide_renewal`، والموافقة بتفك الإيقاف |
| 20260916182737 | `fix_contract_expiry_suspension_scope` | كرون الإيقاف كان بيسيب عقود النسبة كلها وبيهدّد حسابات المشترين |
| 20260916185829 | `fix_commission_refund_base_on_refunded_amount` | استرداد العمولة على المبلغ المردود مش على القيمة قبل الخصم |
| 20260916185848 | `platform_balance_and_bank_withdrawals` | `platform_withdrawals` + `admin_platform_balance` — رصيد محسوب مش محفظة |
| 20260916192113 | `payments_allow_subscription_target` | هدف تالت للدفعة: اشتراك |
| 20260916193440 | `enforce_seller_payment_methods` | حارس طرق الدفع في `place_order` و`pay_order` |
| 20260916193501 | `admin_can_upload_company_logos` | صلاحيات رفع شعارات الشركات |
| 20260916194152 | `realized_sales_single_definition` | `app.realized_sales` — المصدر الوحيد لكل أرقام المبيعات (فاتورة على طلب مش ملغي) |
| 20260916194442 | `customer_funds_and_manual_renewal_reminder` | `app.customer_wallets` (أمانة مش ربح) + `admin_notify_plan_expiry` |
| 20260916195102 | `accounts_list_uses_realized_sales` | قايمة الحسابات على البيعات المحققة |
| 20260916200036 | `launch_readiness_checks` | `admin_launch_readiness` — بنود بتتحسب من الداتا الحية |
| 20260916200324 | `overview_and_specialty_use_realized_sales` | نظرة عامة والتخصصات على نفس المصدر |
| 20260916200829 | `seller_ledger` | دفتر حساب البائع الجاري + التريجرات اللي بتولّد قيوده |
| 20260916200848 | `seller_ledger_backfill_and_admin_api` | ترحيل التاريخ + `admin_seller_balances` / `admin_seller_statement` / `admin_seller_settle` |
| 20260916200925 | `seller_balances_include_deleted_with_debt` | البائع المحذوف اللي عليه فلوس يفضل ظاهر (كان 91% من المديونية مخفي) |
| 20260916201130 | `readiness_reads_seller_ledger` | فحص الجاهزية يقرا الأرصدة بدل ما يخمّن |
| 20260916202034 | `seller_statements_and_dunning` | `seller_statements` + إيقاف ناعم بيترفع لوحده بالسداد |
| 20260916202052 | `seller_statements_api_and_cron` | `admin_issue_seller_statements` / `admin_seller_statements` / `admin_waive_statement` + الكرون |
| 20260916205037 | `three_open_decisions` | حذف اقتراح مقفول + لوحات البائع/المشتري/الحسابات على البيعات المحققة |

## المرتجعات ورصيد المنصة والاشتراك — 2026-09-19

| الإصدار | الاسم | اللي بيعمله |
| --- | --- | --- |
| 20260919083156 | `taxonomy_xor_covers_placements` | قاعدة «كل مستوى يا أقسام يا مواد» بقت تشمل الأماكن الإضافية |
| 20260919084024 | `reactivating_product_respects_level_rule` | تشغيل مادة موقوفة بيعدّي على نفس القاعدة |
| 20260919084412 | `platform_balance_matches_returns_ledger` | «العمولات المرتجعة» كانت رقمين في شاشتين — مصدر واحد متقسّم بحالة المرتجع + `admin_customer_wallets` |
| 20260919085548 | `repair_commission_refunds_on_returns` | إصلاح بيانات مرة واحدة: إعادة حساب ٣ قيود + تقييد ٣ مرتجعات خلصت من غير قيد |
| 20260919090128 | `returns_list_shows_fee_refunded_to_seller` | عمود «الرسوم المعادة للبائع» في صفوف المرتجعات |
| 20260919090710 | `receive_return_stops_double_paying_seller` | `receive_return` كانت بتصرف الاسترداد مرتين (قيد + إيداع محفظة) |
| 20260919090854 | `finance_returns_filter_by_status` | فلتر الحالة في تاب مرتجعات المال |
| 20260919091336 | `accounts_list_balance_matches_account_page` | عمود الرصيد كان بيقرا محفظة تانية غير صفحة الحساب |
| 20260919091623 | `seller_pays_own_subscription` | الإيقاف بقى ناعم (كانت العقوبة إنه يتمنع من الدفع) + الدفع من محفظة الشركة |
| 20260919091635 | `my_seller_contract_exposes_payment_state` | شاشة العقد بتعرض المبلغ والرصيد وهل الإيقاف بسبب الاشتراك |
| 20260919093929 | `buyer_subscription_policy_api` | `admin_buyer_subscription_policy` / `admin_set_*` / `admin_grant_subscription_days` |
| 20260919094444 | `seller_subscription_gateway_payment` | دفع اشتراك البائع بالبوابة في خطوة واحدة، والتحصيل في دالة واحدة للمسارين |

> **ملاحظة على الإصدارات:** ملفات الجولات القديمة اتسمّت بأرقام يدوية مختلفة عن
> الإصدار المتسجّل في `supabase_migrations.schema_migrations`. الجولات من
> 2026-09-16 وبعدها بتستخدم **نفس إصدار السيرفر** بالظبط، والمحتوى منسوخ حرفيًا
> ومتحقَّق منه بمقارنة md5.
