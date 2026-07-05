-- Atualização de Políticas RLS para Compatibilidade com Clerk (IDs de Texto)

-- 1. Habilitar RLS nas tabelas (caso não esteja)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- 2. Remover políticas antigas para evitar conflitos
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can update own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can delete own transactions" ON public.transactions;

-- 3. Criar função auxiliar para pegar o ID do usuário do JWT de forma segura (Texto)
-- O Clerk envia o ID no campo 'sub' do JWT. Como o ID do Clerk não é UUID, usamos auth.jwt() ->> 'sub'
CREATE OR REPLACE FUNCTION request_user_id()
RETURNS text AS $$
  SELECT auth.jwt() ->> 'sub';
$$ LANGUAGE sql STABLE;

-- 4. Novas Políticas para PROFILES
-- Visualizar: Usuário pode ver apenas seu perfil
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
USING (user_id = request_user_id());

-- Inserir: Usuário pode criar seu perfil (ID deve bater com o Token)
CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
WITH CHECK (user_id = request_user_id());

-- Atualizar: Usuário pode editar seu perfil
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (user_id = request_user_id());

-- 5. Novas Políticas para TRANSACTIONS
-- Visualizar: Ver apenas suas transações
CREATE POLICY "Users can view own transactions"
ON public.transactions FOR SELECT
USING (user_id = request_user_id());

-- Inserir: Criar transação apenas para si mesmo
CREATE POLICY "Users can insert own transactions"
ON public.transactions FOR INSERT
WITH CHECK (user_id = request_user_id());

-- Atualizar: Editar apenas suas transações
CREATE POLICY "Users can update own transactions"
ON public.transactions FOR UPDATE
USING (user_id = request_user_id());

-- Deletar: Apagar apenas suas transações
CREATE POLICY "Users can delete own transactions"
ON public.transactions FOR DELETE
USING (user_id = request_user_id());

-- 6. Garantir permissões básicas para o role 'authenticated' (usuários logados)
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.transactions TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
