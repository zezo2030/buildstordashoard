-- إصلاح بيانات مرة واحدة لقيود استرداد عمولة المرتجعات — بقرار المالك.
--
-- (أ) 3 قيود اتحسبت على «قيمة المقبول» قبل الخصم بدل «المبلغ المسترد»، يعني
--     بالمعادلة القديمة اللي اتصلحت في
--     `20260916185829_fix_commission_refund_base_on_refunded_amount`.
--     القيود دي أقدم من الإصلاح فما اتأثرتش بيه.
--       RTN-000018  0.013 → 0.013
--       RTN-000019  0.165 → 0.160
--       RTN-000020  0.014 → 0.013
--     صافي التصحيح −0.006 على شركة العربي للمواد الانشائية.
--
-- (ب) 3 مرتجعات حالتها `refunded` والمشتري استلم فلوسه، ومحصلش عليها قيد
--     استرداد عمولة خالص — اتحطّت `refunded` من غير ما تعدّي على
--     `receive_return` اللي هي اللي بتقيّد.
--       RTN-000001  11.300  مؤسسة الخليج للتكييف والسباكة
--       RTN-000005   0.135  مؤسسة الخليج للتكييف والسباكة
--       RTN-000007  10.400  تجمع مواد البناء
--                  ───────
--                   21.835
--
-- الدفتر بيتظبط لوحده: `tg_ledger_on_fee_refund` على `platform_fees`.
-- والطلبات الستة كلها `cash_on_delivery`، فشرط `sale_reversal` في الترigger
-- مابيتحققش ومافيش قيود سحب حصيلة هتتولد.
--
-- **مافيش إيداع في محافظ البائعين هنا، بعكس `receive_return`.** في الدفع
-- كاش البائع بيقبض من المشتري بنفسه والعمولة دَين في الدفتر — فإلغاء الدَين
-- هو الاسترداد. إيداع كاش كمان يبقى صرف مرتين لنفس المبلغ.

do $mig$
declare
  rec       record;
  v_actor   uuid;
  v_fix     numeric := 0;
  v_added   numeric := 0;
  v_rows    int;
  v_wallet  uuid;
begin
  select id into v_actor from public.profiles where role = 'admin' and status = 'active'
   order by created_at limit 1;

  -- ===== (أ) إعادة الحساب بالمعادلة الحالية =====
  for rec in
    select pf.id as fee_id, pf.amount as old_amt, rq.id as ret_id,
           rq.return_number, rq.seller_company_id,
           round(rq.refund_amount * o.commission_amount
                 / nullif(o.subtotal - o.discount_total, 0), 3) as new_amt
      from public.platform_fees pf
      join public.return_requests rq on rq.id = pf.return_id
      join public.orders o on o.id = rq.order_id
     where pf.kind = 'commission_refund'
  loop
    continue when rec.new_amt is null or rec.new_amt = rec.old_amt;

    update public.platform_fees set amount = rec.new_amt where id = rec.fee_id;

    -- `seller_ledger_once` بيمنع قيد تاني لنفس المرتجع، والقيد ده تصحيح
    -- حساب مش حدث جديد — فبيتظبط في مكانه والأثر في `audit_log`.
    update public.seller_ledger set amount = rec.new_amt
     where kind = 'commission_refund' and ref_type = 'return' and ref_id = rec.ret_id;

    insert into public.audit_log (actor_id, action, entity, entity_id, before, after)
    values (v_actor, 'recompute_commission_refund', 'platform_fees', rec.fee_id::text,
            jsonb_build_object('amount', rec.old_amt, 'return', rec.return_number),
            jsonb_build_object('amount', rec.new_amt, 'basis', 'refund_amount'));

    v_fix := v_fix + (rec.new_amt - rec.old_amt);

    -- المحفظة دفتر جاري بـ`balance_after`، فما بتتعدّلش بأثر رجعي — حركة عكسية.
    if rec.new_amt < rec.old_amt then
      select id into v_wallet from public.wallets
       where owner_type = 'company' and owner_id = rec.seller_company_id;
      if v_wallet is not null then
        perform app.post_wallet_txn(
          v_wallet, 'adjustment', (rec.new_amt - rec.old_amt)::public.money_kwd,
          'return', rec.ret_id,
          'تصحيح استرداد عمولة ' || rec.return_number || ' — احتُسبت قبل الخصم');
      end if;
    end if;
  end loop;

  -- ===== (ب) تقييد المرتجعات اللي خلصت من غير قيد =====
  insert into public.platform_fees
    (subject_type, subject_id, kind, amount, order_id, return_id, note, collected_at)
  select 'seller', rq.seller_company_id, 'commission_refund', round(f.amount, 3),
         rq.order_id, rq.id,
         'استرداد عمولة مرتجع ' || rq.return_number || ' — قيد متأخر',
         coalesce(rq.refunded_at, now())
    from app.return_fee_refunds f
    join public.return_requests rq on rq.id = f.return_id
   where not f.is_posted
     and rq.status = 'refunded'
     and round(f.amount, 3) > 0;
  get diagnostics v_rows = row_count;

  select coalesce(sum(amount), 0) into v_added
    from public.platform_fees where note like '%قيد متأخر%';

  insert into public.audit_log (actor_id, action, entity, entity_id, before, after)
  values (v_actor, 'post_missing_commission_refunds', 'platform_fees', 'bulk',
          jsonb_build_object('posted_total', '0.192'),
          jsonb_build_object('rows', v_rows, 'amount', v_added));

  -- أرقام معروفة قبل التنفيذ — لو اتغيّرت يبقى فيه حاجة اتحركت والهجرة توقف
  if round(v_fix, 3) <> -0.006 then
    raise exception 'التصحيح المتوقع -0.006 والفعلي %', v_fix;
  end if;
  if v_rows <> 3 or round(v_added, 3) <> 21.835 then
    raise exception 'المتوقع 3 قيود بمجموع 21.835 والفعلي % / %', v_rows, v_added;
  end if;
end $mig$;
