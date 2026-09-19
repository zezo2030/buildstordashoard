drop policy if exists "admins upload company logos" on storage.objects;
create policy "admins upload company logos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'company-logos' and app.is_admin());

drop policy if exists "admins update company logos" on storage.objects;
create policy "admins update company logos" on storage.objects
  for update to authenticated
  using      (bucket_id = 'company-logos' and app.is_admin())
  with check (bucket_id = 'company-logos' and app.is_admin());
