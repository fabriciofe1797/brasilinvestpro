-- Safely alter user_id columns to TEXT by dropping dependent policies first,
-- then recreating them with auth.uid()::text comparisons.
-- Run this after 001_licenses.sql and 002_policies.sql.

-- LICENSES: drop policies that reference user_id
drop policy if exists "licenses_select_own" on licenses;
drop policy if exists "licenses_insert_free_self" on licenses;
drop policy if exists "licenses_update_service" on licenses;

-- PLAN_CHANGES: drop select policy (references user_id)
drop policy if exists "plan_changes_select_own" on plan_changes;
drop policy if exists "plan_changes_insert_service" on plan_changes;

-- EMAIL_QUEUE: policy does not reference user_id semantically, but drop to be safe
drop policy if exists "email_queue_service_rw" on email_queue;

-- ALTER COLUMNS (uuid -> text)
alter table if exists licenses
  alter column user_id type text using user_id::text;

alter table if exists plan_changes
  alter column user_id type text using user_id::text;

alter table if exists email_queue
  alter column user_id type text using user_id::text;

-- Recreate policies (using auth.uid()::text)
-- LICENSES
create policy "licenses_select_own" on licenses for select using (user_id = auth.uid()::text);
create policy "licenses_insert_free_self" on licenses for insert
  with check (user_id = auth.uid()::text and plan_type = 'free');
create policy "licenses_update_service" on licenses for update using (false) with check (false);

-- PLAN_CHANGES
create policy "plan_changes_select_own" on plan_changes for select using (user_id = auth.uid()::text);
create policy "plan_changes_insert_service" on plan_changes for insert with check (false);

-- EMAIL_QUEUE
create policy "email_queue_service_rw" on email_queue for all using (false) with check (false);

