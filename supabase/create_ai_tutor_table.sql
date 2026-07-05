-- Tabela para Armazenar Perfil de Investidor e Planos (Feature Premium: AI Tutor)

-- 1. Criar Tabela
CREATE TABLE IF NOT EXISTS public.investment_profiles (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id text NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    -- Dados do Questionário (Etapa 1)
    risk_tolerance text CHECK (risk_tolerance IN ('Conservador', 'Moderado', 'Agressivo')),
    main_goal text, -- Reserva, Renda Passiva, etc.
    time_horizon text, -- Curto, Médio, Longo
    monthly_contribution numeric(10, 2),
    knowledge_level text, -- Iniciante, Intermediário, Avançado
    
    -- Preferências (JSONB para flexibilidade futura)
    preferences jsonb DEFAULT '{}'::jsonb, -- { crypto: boolean, volatility: boolean, passive_income: boolean }
    
    -- Plano Gerado (Cache do resultado para não recalcular sempre)
    generated_plan jsonb, -- Estrutura completa do plano sugerido
    
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    UNIQUE(user_id) -- Um perfil por usuário
);

-- 2. Habilitar RLS
ALTER TABLE public.investment_profiles ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de Segurança (Baseadas no ID de texto do Clerk, conforme fix anterior)
-- Reutiliza a função request_user_id() criada anteriormente

DROP POLICY IF EXISTS "Users can view own investment profile" ON public.investment_profiles;
DROP POLICY IF EXISTS "Users can insert own investment profile" ON public.investment_profiles;
DROP POLICY IF EXISTS "Users can update own investment profile" ON public.investment_profiles;

CREATE POLICY "Users can view own investment profile"
ON public.investment_profiles FOR SELECT
USING (user_id = request_user_id());

CREATE POLICY "Users can insert own investment profile"
ON public.investment_profiles FOR INSERT
WITH CHECK (user_id = request_user_id());

CREATE POLICY "Users can update own investment profile"
ON public.investment_profiles FOR UPDATE
USING (user_id = request_user_id());

-- 4. Permissões
GRANT ALL ON public.investment_profiles TO authenticated;
