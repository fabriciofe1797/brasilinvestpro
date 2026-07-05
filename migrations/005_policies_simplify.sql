drop policy if exists "profiles_select_own" on profiles;
drop policy if exists "profiles_insert_self" on profiles;
drop policy if exists "profiles_update_own" on profiles;
drop policy if exists "transactions_select_own" on transactions;
drop policy if exists "transactions_ins_own" on transactions;
drop policy if exists "transactions_upd_own" on transactions;
drop policy if exists "transactions_del_own" on transactions;
drop policy if exists "licenses_select_own" on licenses;
drop policy if exists "licenses_insert_free_self" on licenses;
drop policy if exists "licenses_update_service" on licenses;
drop policy if exists "plan_changes_select_own" on plan_changes;
drop policy if exists "plan_changes_insert_service" on plan_changes;
drop policy if exists "email_queue_service_rw" on email_queue;
drop policy if exists "assets_public_read" on assets;
drop policy if exists "assets_write_service" on assets;

create policy "profiles_select_own" on profiles for select using (id::text = auth.uid()::text);
create policy "profiles_insert_self" on profiles for insert with check (id::text = auth.uid()::text);
create policy "profiles_update_own" on profiles for update using (id::text = auth.uid()::text) with check (id::text = auth.uid()::text);

-- Use casts to garantir compatibilidade mesmo se user_id for text ou uuid
create policy "transactions_select_own" on transactions for select using (user_id::text = auth.uid()::text);
create policy "transactions_ins_own" on transactions for insert with check (user_id::text = auth.uid()::text);
create policy "transactions_upd_own" on transactions for update using (user_id::text = auth.uid()::text) with check (user_id::text = auth.uid()::text);
create policy "transactions_del_own" on transactions for delete using (user_id::text = auth.uid()::text);

create policy "licenses_select_own" on licenses for select using (user_id::text = auth.uid()::text);
create policy "licenses_insert_free_self" on licenses for insert with check (user_id::text = auth.uid()::text and plan_type = 'free');
create policy "licenses_update_service" on licenses for update using (false) with check (false);

create policy "plan_changes_select_own" on plan_changes for select using (user_id::text = auth.uid()::text);
create policy "plan_changes_insert_service" on plan_changes for insert with check (false);

create policy "email_queue_service_rw" on email_queue for all using (false) with check (false);

create policy "assets_public_read" on assets for select using (true);
create policy "assets_write_service" on assets for all using (false) with check (false);
