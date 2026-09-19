create table if not exists public.seller_ledger (
  id                uuid primary key default gen_random_uuid(),
  seller_company_id uuid not null references public.companies(id),
  amount            numeric(14,3) not null check (amount <> 0),
  kind              text not null check (kind in (
                      'commission', 'sale_proceeds', 'commission_refund',
                      'sale_reversal', 'subscription', 'payout',
                      'settlement', 'adjustment')),
  ref_type          text check (ref_type in ('order', 'return', 'fee', 'manual')),
  ref_id            uuid,
  description_ar    text,
  entry_date        date not null default current_date,
  created_by        uuid references public.profiles(id),
  created_at        timestamptz not null default now()
);

comment on table public.seller_ledger is
  'حساب البائع الجاري. موجب = المنصة عليها للبائع · سالب = البائع عليه. دفتر: ما بيتعدلش.';

create unique index if not exists seller_ledger_once
  on public.seller_ledger (kind, ref_type, ref_id)
  where ref_id is not null;

create index if not exists seller_ledger_company_idx
  on public.seller_ledger (seller_company_id, entry_date desc, created_at desc);

alter table public.seller_ledger enable row level security;

drop policy if exists seller_ledger_admin on public.seller_ledger;
create policy seller_ledger_admin on public.seller_ledger
  for all to authenticated
  using (app.is_admin()) with check (app.is_admin());

drop policy if exists seller_ledger_own_read on public.seller_ledger;
create policy seller_ledger_own_read on public.seller_ledger
  for select to authenticated
  using (seller_company_id in (select app.seller_company_ids()));

create or replace function app.seller_ledger_post(
  p_company  uuid,
  p_amount   numeric,
  p_kind     text,
  p_ref_type text default null,
  p_ref_id   uuid default null,
  p_desc     text default null,
  p_date     date default null
) returns uuid
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $fn$
declare v_id uuid;
begin
  if p_company is null or p_amount is null or round(p_amount, 3) = 0 then
    return null;
  end if;

  insert into public.seller_ledger
    (seller_company_id, amount, kind, ref_type, ref_id, description_ar, entry_date, created_by)
  values (p_company, round(p_amount, 3), p_kind, p_ref_type, p_ref_id, p_desc,
          coalesce(p_date, current_date), auth.uid())
  on conflict do nothing
  returning id into v_id;

  return v_id;
end $fn$;

create or replace function app.tg_ledger_on_invoice()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $fn$
declare v_o public.orders;
begin
  select * into v_o from public.orders where id = new.order_id;
  if not found or v_o.status = 'cancelled' then return new; end if;

  perform app.seller_ledger_post(
    v_o.seller_company_id, -coalesce(v_o.commission_amount, 0)::numeric,
    'commission', 'order', v_o.id,
    'عمولة الطلب ' || v_o.order_number, new.issued_at::date);

  if v_o.payment_status = 'paid' and v_o.payment_method <> 'cash_on_delivery' then
    perform app.seller_ledger_post(
      v_o.seller_company_id, coalesce(v_o.grand_total, 0)::numeric,
      'sale_proceeds', 'order', v_o.id,
      'حصيلة الطلب ' || v_o.order_number, new.issued_at::date);
  end if;

  return new;
end $fn$;

drop trigger if exists ledger_on_invoice on public.invoices;
create trigger ledger_on_invoice
  after insert on public.invoices
  for each row execute function app.tg_ledger_on_invoice();

create or replace function app.tg_ledger_on_paid()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $fn$
begin
  if new.payment_status = 'paid'
     and coalesce(old.payment_status::text, '') <> 'paid'
     and new.payment_method <> 'cash_on_delivery'
     and new.status <> 'cancelled'
  then
    perform app.seller_ledger_post(
      new.seller_company_id, coalesce(new.grand_total, 0)::numeric,
      'sale_proceeds', 'order', new.id,
      'حصيلة الطلب ' || new.order_number, current_date);
  end if;
  return new;
end $fn$;

drop trigger if exists ledger_on_paid on public.orders;
create trigger ledger_on_paid
  after update of payment_status on public.orders
  for each row execute function app.tg_ledger_on_paid();

create or replace function app.tg_ledger_on_fee_refund()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $fn$
declare
  v_r public.return_requests;
  v_o public.orders;
begin
  if new.kind <> 'commission_refund' or new.return_id is null then return new; end if;

  select * into v_r from public.return_requests where id = new.return_id;
  if not found then return new; end if;
  select * into v_o from public.orders where id = v_r.order_id;

  perform app.seller_ledger_post(
    v_r.seller_company_id, new.amount::numeric,
    'commission_refund', 'return', v_r.id,
    'استرداد عمولة المرتجع ' || v_r.return_number, new.collected_at::date);

  if v_o.id is not null
     and v_o.payment_method <> 'cash_on_delivery'
     and v_o.payment_status in ('paid', 'refunded', 'partially_refunded')
  then
    perform app.seller_ledger_post(
      v_r.seller_company_id, -coalesce(v_r.refund_amount, 0)::numeric,
      'sale_reversal', 'return', v_r.id,
      'سحب حصيلة المرتجع ' || v_r.return_number, new.collected_at::date);
  end if;

  return new;
end $fn$;

drop trigger if exists ledger_on_fee_refund on public.platform_fees;
create trigger ledger_on_fee_refund
  after insert on public.platform_fees
  for each row execute function app.tg_ledger_on_fee_refund();

create or replace function app.tg_ledger_on_seller_subscription()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $fn$
begin
  if new.kind = 'subscription' and new.subject_type = 'seller' then
    perform app.seller_ledger_post(
      new.subject_id, -new.amount::numeric,
      'subscription', 'fee', new.id,
      'رسوم اشتراك', new.collected_at::date);
  end if;
  return new;
end $fn$;

drop trigger if exists ledger_on_seller_subscription on public.platform_fees;
create trigger ledger_on_seller_subscription
  after insert on public.platform_fees
  for each row execute function app.tg_ledger_on_seller_subscription();

notify pgrst, 'reload schema';
