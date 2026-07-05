-- ============================================================
-- RLS Policies Completas — AutoInvest SaaS
-- ============================================================
-- Camada de defesa extra: protege contra acesso direto via anon key.
-- O Edge Function usa Service Role Key (ignora RLS) + JWT verification.
-- O frontend NUNCA acessa tabelas diretamente (apenas via Edge Function).
-- ============================================================

-- 1. Habilitar RLS em todas as tabelas com dados de usuario
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investment_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investment_plan_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;

-- 2. Remover politicas antigas para evitar conflitos
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can update own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can delete own transactions" ON public.transactions;

-- 3. Funcao auxiliar para extrair user_id do JWT (Supabase Auth)
-- NOTA: O app usa Clerk, entao auth.jwt() nao retorna o Clerk sub.
-- Estas policies bloqueiam acesso direto via anon key (comportamento desejado).
-- Todo acesso real passa pelo Edge Function (Service Role Key, ignora RLS).
CREATE OR REPLACE FUNCTION request_user_id()
RETURNS text AS $$
  SELECT auth.jwt() ->> 'sub';
$$ LANGUAGE sql STABLE;

-- ============================================================
-- PROFILES
-- ============================================================
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT
  USING (id = request_user_id() OR external_id = request_user_id());

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT
  WITH CHECK (id = request_user_id());

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE
  USING (id = request_user_id() OR external_id = request_user_id());

-- ============================================================
-- TRANSACTIONS
-- ============================================================
DROP POLICY IF EXISTS "transactions_select_own" ON public.transactions;
CREATE POLICY "transactions_select_own" ON public.transactions FOR SELECT
  USING (user_id = request_user_id());

DROP POLICY IF EXISTS "transactions_insert_own" ON public.transactions;
CREATE POLICY "transactions_insert_own" ON public.transactions FOR INSERT
  WITH CHECK (user_id = request_user_id());

DROP POLICY IF EXISTS "transactions_update_own" ON public.transactions;
CREATE POLICY "transactions_update_own" ON public.transactions FOR UPDATE
  USING (user_id = request_user_id());

DROP POLICY IF EXISTS "transactions_delete_own" ON public.transactions;
CREATE POLICY "transactions_delete_own" ON public.transactions FOR DELETE
  USING (user_id = request_user_id());

-- ============================================================
-- LICENSES
-- ============================================================
DROP POLICY IF EXISTS "licenses_select_own" ON public.licenses;
CREATE POLICY "licenses_select_own" ON public.licenses FOR SELECT
  USING (user_id = request_user_id());

DROP POLICY IF EXISTS "licenses_insert_own" ON public.licenses;
CREATE POLICY "licenses_insert_own" ON public.licenses FOR INSERT
  WITH CHECK (user_id = request_user_id());

DROP POLICY IF EXISTS "licenses_update_own" ON public.licenses;
CREATE POLICY "licenses_update_own" ON public.licenses FOR UPDATE
  USING (user_id = request_user_id());

-- ============================================================
-- INVESTMENT_PROFILES
-- ============================================================
DROP POLICY IF EXISTS "inv_profiles_select_own" ON public.investment_profiles;
CREATE POLICY "inv_profiles_select_own" ON public.investment_profiles FOR SELECT
  USING (user_id = request_user_id());

DROP POLICY IF EXISTS "inv_profiles_insert_own" ON public.investment_profiles;
CREATE POLICY "inv_profiles_insert_own" ON public.investment_profiles FOR INSERT
  WITH CHECK (user_id = request_user_id());

DROP POLICY IF EXISTS "inv_profiles_update_own" ON public.investment_profiles;
CREATE POLICY "inv_profiles_update_own" ON public.investment_profiles FOR UPDATE
  USING (user_id = request_user_id());

-- ============================================================
-- INVESTMENT_PLAN_VERSIONS
-- ============================================================
DROP POLICY IF EXISTS "inv_plan_versions_select_own" ON public.investment_plan_versions;
CREATE POLICY "inv_plan_versions_select_own" ON public.investment_plan_versions FOR SELECT
  USING (user_id = request_user_id());

DROP POLICY IF EXISTS "inv_plan_versions_insert_own" ON public.investment_plan_versions;
CREATE POLICY "inv_plan_versions_insert_own" ON public.investment_plan_versions FOR INSERT
  WITH CHECK (user_id = request_user_id());

-- ============================================================
-- PLAN_CHANGES (apenas leitura pelo proprio usuario)
-- ============================================================
DROP POLICY IF EXISTS "plan_changes_select_own" ON public.plan_changes;
CREATE POLICY "plan_changes_select_own" ON public.plan_changes FOR SELECT
  USING (user_id = request_user_id());

-- ============================================================
-- EMAIL_QUEUE (apenas leitura pelo proprio usuario)
-- ============================================================
DROP POLICY IF EXISTS "email_queue_select_own" ON public.email_queue;
CREATE POLICY "email_queue_select_own" ON public.email_queue FOR SELECT
  USING (user_id = request_user_id());

DROP POLICY IF EXISTS "email_queue_insert_own" ON public.email_queue;
CREATE POLICY "email_queue_insert_own" ON public.email_queue FOR INSERT
  WITH CHECK (user_id = request_user_id());

-- ============================================================
-- ASSETS (catalogo global — leitura publica, escrita restrita)
-- ============================================================
-- Assets e um catalogo publico compartilhado entre todos os usuarios.
-- Leitura liberada para todos (anon + authenticated).
-- Escrita deve passar pelo Edge Function (Service Role Key).
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "assets_public_read" ON public.assets;
CREATE POLICY "assets_public_read" ON public.assets FOR SELECT
  USING (true);

-- ============================================================
-- ASSET_PRICES (dados de mercado — leitura publica)
-- ============================================================
ALTER TABLE public.asset_prices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "asset_prices_public_read" ON public.asset_prices;
CREATE POLICY "asset_prices_public_read" ON public.asset_prices FOR SELECT
  USING (true);

-- ============================================================
-- SAVINGS_PRODUCTS (catalogo publico)
-- ============================================================
-- Verificar se a tabela existe antes de aplicar RLS
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'savings_products') THEN
    ALTER TABLE public.savings_products ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "savings_public_read" ON public.savings_products;
    CREATE POLICY "savings_public_read" ON public.savings_products FOR SELECT
      USING (true);
  END IF;
END $$;

-- ============================================================
-- Permissoes basicas para roles
-- ============================================================
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.transactions TO authenticated;
GRANT ALL ON public.licenses TO authenticated;
GRANT ALL ON public.investment_profiles TO authenticated;
GRANT ALL ON public.investment_plan_versions TO authenticated;
GRANT SELECT ON public.plan_changes TO authenticated;
GRANT SELECT ON public.email_queue TO authenticated;
GRANT ALL ON public.assets TO authenticated;
GRANT SELECT ON public.asset_prices TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
