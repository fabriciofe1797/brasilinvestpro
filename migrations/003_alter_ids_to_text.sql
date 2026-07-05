-- Align user identifiers to text to support providers como Clerk (ex.: "user_xxx")
-- Convert columns from uuid -> text mantendo chaves primárias

alter table if exists licenses
  alter column user_id type text using user_id::text;

alter table if exists plan_changes
  alter column user_id type text using user_id::text;

alter table if exists email_queue
  alter column user_id type text using user_id::text;

-- Opcional: simplificar políticas removendo casts (se desejar, reexecute 002 com igualdade direta)
