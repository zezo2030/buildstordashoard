alter table public.payments drop constraint if exists payments_target_ck;

alter table public.payments add constraint payments_target_ck check (
  (order_group_id          is not null)::int
+ (wallet_id               is not null)::int
+ (subscription_profile_id is not null)::int = 1
);

comment on constraint payments_target_ck on public.payments is
  'هدف واحد بالظبط لكل دفعة: طلب أو شحن محفظة أو اشتراك.';

notify pgrst, 'reload schema';
