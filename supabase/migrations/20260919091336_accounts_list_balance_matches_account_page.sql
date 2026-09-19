-- عمود «الرصيد» في قايمة المشترين كان بيقرا محفظة تانية غير اللي في صفحة
-- الحساب، فشركة الفاروق بتبان 0.000 في القايمة و10.483 لما تدوس عليها.
--
-- القايمة كانت بتقول: المشتري تابع لشركة ⇒ اقرا **محفظة الشركة**.
-- وصفحة الحساب (`/users/:id`) بتقرا **محفظة المستخدم**.
--
-- ومحفظة المستخدم هي الصح، لأنها هي اللي الفلوس بتتحرك فيها فعلًا:
--   • `place_order` بتاخد `p_company_id` من التطبيق، والتطبيق
--     (`checkout.tsx`) ما بيبعتهاش خالص ⇒ `buyer_company_id` = null في
--     **43 مجموعة طلب و21 مرتجع**، يعني في كل الداتا من غير استثناء.
--   • فرع «محفظة الشركة» في `pay_order` و`receive_return` عمره ما اشتغل،
--     ومحفظتين شركات المشترين الاتنين فاضيتين.
--   • قيود محفظة الفاروق نفسها بتثبت ده: `return_credit` داخل و
--     `order_payment` خارج، كلهم على محفظة المستخدم.
--
-- فالقايمة كانت بتوري صفر لمشتري معاه فلوس وبيشتري بيها.
--
-- محفظة الشركة للمشتري ميزة متبنية في الداتابيز بس التطبيق مش بينده عليها.
-- الهجرة دي ما بتقفلهاش — بتخلي القايمة تقرا من نفس مكان صفحة الحساب بس.

do $mig$
declare
  v_def  text;
  v_from constant text :=
    '    left join lateral (' || chr(10) ||
    '      select wa.balance from public.wallets wa' || chr(10) ||
    '       where (comp.cid is not null and wa.owner_type = ''company'' and wa.owner_id = comp.cid)' || chr(10) ||
    '          or (comp.cid is null     and wa.owner_type = ''user''    and wa.owner_id = b.id)' || chr(10) ||
    '       limit 1' || chr(10) ||
    '    ) w on true';
  v_to constant text :=
    '    left join lateral (' || chr(10) ||
    '      -- محفظة الحساب نفسه — نفس اللي بتعرضها صفحة الحساب، ونفس اللي' || chr(10) ||
    '      -- الفلوس بتتحرك فيها: `buyer_company_id` مابيتبعتش من التطبيق' || chr(10) ||
    '      -- فمحافظ الشركات للمشترين فاضية دايمًا.' || chr(10) ||
    '      select wa.balance from public.wallets wa' || chr(10) ||
    '       where wa.owner_type = ''user'' and wa.owner_id = b.id' || chr(10) ||
    '       limit 1' || chr(10) ||
    '    ) w on true';
begin
  v_def := pg_get_functiondef('app.accounts_rows(text, date, date, text, text)'::regprocedure);

  if (length(v_def) - length(replace(v_def, v_from, ''))) / length(v_from) <> 1 then
    raise exception 'مرساة محفظة المشتري مش موجودة مرة واحدة بالظبط';
  end if;

  execute replace(v_def, v_from, v_to);
end $mig$;

notify pgrst, 'reload schema';
