-- CORREÇÃO DE POLÍTICAS DE SEGURANÇA (RLS)
-- O Supabase por padrão espera que IDs de usuários sejam UUIDs.
-- O Clerk usa IDs de texto (ex: user_2...).
-- Este script substitui as regras antigas por regras que aceitam texto.

-- 1. Remover políticas antigas (que podem estar falhando)
drop policy if exists "Users can insert own transactions" on public.transactions;
drop policy if exists "Users can view own transactions" on public.transactions;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;

-- 2. Criar novas políticas usando auth.jwt() ->> 'sub'
-- Isso extrai o ID diretamente do Token do Clerk como texto, evitando erro de UUID.

-- Tabela TRANSACTIONS
create policy "Users can insert own transactions" on public.transactions
  for insert with check ( (select auth.jwt() ->> 'sub') = user_id );

create policy "Users can view own transactions" on public.transactions
  for select using ( (select auth.jwt() ->> 'sub') = user_id );

-- Tabela PROFILES
create policy "Users can insert own profile" on public.profiles
  for insert with check ( (select auth.jwt() ->> 'sub') = id );

create policy "Users can view own profile" on public.profiles
  for select using ( (select auth.jwt() ->> 'sub') = id );

create policy "Users can update own profile" on public.profiles
  for update using ( (select auth.jwt() ->> 'sub') = id );
