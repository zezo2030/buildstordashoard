-- `receive_return` كانت بتصرف استرداد العمولة مرتين.
--
-- الدالة كانت بتعمل حاجتين لنفس المبلغ:
--   ١. تقيّد `commission_refund` في `platform_fees` — وده بيولّد قيد في
--      `seller_ledger` عن طريق `tg_ledger_on_fee_refund`، فدَين البائع بيقلّ.
--   ٢. تودّع نفس المبلغ كاش في محفظة البائع.
--
-- الاتنين مع بعض = البائع بياخد المبلغ مرتين: الدَين بيقلّ **وكمان** بياخد
-- فلوس. وده مش خاص بالدفع كاش: التسوية كلها بتمشي على `seller_ledger`
-- (`admin_seller_settle` بتكتب في الدفتر بس، من غير أي حركة محفظة)، فمحفظة
-- البائع مالهاش دور في دورة العمولة أصلًا.
--
-- الإيداع اتشال. القيد في الدفتر هو الاسترداد.
--
-- ملحوظة: `post_wallet_txn` للمشتري فوق في نفس الدالة مالوش علاقة — ده رد
-- قيمة البضاعة للمشتري وده صح ولازم يفضل.

do $mig$
declare
  v_def  text;
  v_from constant text :=
    '    on conflict (return_id) where return_id is not null do nothing;' || chr(10) ||
    '' || chr(10) ||
    '    perform app.post_wallet_txn(' || chr(10) ||
    '      app.ensure_wallet(''company'', v_r.seller_company_id),' || chr(10) ||
    '      ''commission'', v_refund, ''return'', v_r.id,' || chr(10) ||
    '      ''استرداد عمولة مرتجع '' || v_r.return_number);' || chr(10) ||
    '  end if;';
  v_to constant text :=
    '    on conflict (return_id) where return_id is not null do nothing;' || chr(10) ||
    '    -- مفيش إيداع في محفظة البائع: القيد اللي فوق بيولّد' || chr(10) ||
    '    -- `commission_refund` في `seller_ledger` وده هو الاسترداد.' || chr(10) ||
    '    -- إيداع كاش كمان يبقى صرف نفس المبلغ مرتين.' || chr(10) ||
    '  end if;';
begin
  v_def := pg_get_functiondef('public.receive_return(uuid)'::regprocedure);

  if (length(v_def) - length(replace(v_def, v_from, ''))) / length(v_from) <> 1 then
    raise exception 'مرساة إيداع محفظة البائع مش موجودة مرة واحدة بالظبط';
  end if;

  execute replace(v_def, v_from, v_to);
end $mig$;

-- تنضيف الأثر: محفظة شركة العربي مافيهاش غير الإيداعات دي (0.192) وتصحيحاتها
-- (−0.006). المحفظة دفتر جاري بـ`balance_after` فما بتتعدّلش بأثر رجعي —
-- حركة عكسية. قيود الدفتر بتفضل زي ما هي، هي دي السجل الصح.
do $mig$
declare
  rec     record;
  v_actor uuid;
  v_n     int := 0;
begin
  select id into v_actor from public.profiles where role = 'admin' and status = 'active'
   order by created_at limit 1;

  for rec in
    select w.id as wallet_id, w.owner_id, w.balance,
           coalesce(sum(t.amount) filter (
             where t.reference_type = 'return'
               and t.type in ('commission', 'adjustment')), 0) as from_returns
      from public.wallets w
      join public.companies c on c.id = w.owner_id and c.type = 'seller'
      left join public.wallet_transactions t on t.wallet_id = w.id
     where w.owner_type = 'company'
     group by w.id, w.owner_id, w.balance
    having coalesce(sum(t.amount) filter (
             where t.reference_type = 'return'
               and t.type in ('commission', 'adjustment')), 0) > 0
  loop
    -- ما نسحبش أكتر من الرصيد الموجود لو البائع كان عليه حركات تانية
    perform app.post_wallet_txn(
      rec.wallet_id, 'adjustment', (-least(rec.from_returns, rec.balance))::public.money_kwd,
      'return', null,
      'عكس إيداع استرداد العمولة — الاسترداد مقيّد في حساب البائع الجاري');

    insert into public.audit_log (actor_id, action, entity, entity_id, before, after)
    values (v_actor, 'reverse_duplicate_commission_refund', 'wallets', rec.wallet_id::text,
            jsonb_build_object('balance', rec.balance),
            jsonb_build_object('reversed', least(rec.from_returns, rec.balance)));
    v_n := v_n + 1;
  end loop;

  if (select coalesce(sum(w.balance), 0) from public.wallets w
       join public.companies c on c.id = w.owner_id and c.type = 'seller'
      where w.owner_type = 'company') <> 0 then
    raise exception 'لسه فيه رصيد في محافظ البائعين بعد العكس';
  end if;
end $mig$;

notify pgrst, 'reload schema';
