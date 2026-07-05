-- ============================================================
-- user_data: Armazenamento generico de dados do usuario
-- Substitui localStorage para persistencia entre dispositivos
-- ============================================================

-- Drop tabela se existir (remove tabela + policies automaticamente)
DROP TABLE IF EXISTS user_data;

-- Criar tabela
CREATE TABLE user_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  data_key TEXT NOT NULL,
  data_value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, data_key)
);

-- Indices para performance
CREATE INDEX idx_user_data_user_id ON user_data(user_id);
CREATE INDEX idx_user_data_user_key ON user_data(user_id, data_key);

-- Habilitar RLS
ALTER TABLE user_data ENABLE ROW LEVEL SECURITY;

-- Funcao helper para obter user_id do JWT
CREATE OR REPLACE FUNCTION request_user_id()
RETURNS TEXT AS $$
  SELECT auth.jwt() ->> 'sub';
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Politicas RLS: cada usuario ve/apenas seus dados
CREATE POLICY "user_data_select_own" ON user_data
  FOR SELECT
  USING (user_id = request_user_id());

CREATE POLICY "user_data_insert_own" ON user_data
  FOR INSERT
  WITH CHECK (user_id = request_user_id());

CREATE POLICY "user_data_update_own" ON user_data
  FOR UPDATE
  USING (user_id = request_user_id())
  WITH CHECK (user_id = request_user_id());

CREATE POLICY "user_data_delete_own" ON user_data
  FOR DELETE
  USING (user_id = request_user_id());

-- Grants para role authenticated
GRANT SELECT, INSERT, UPDATE, DELETE ON user_data TO authenticated;

-- Comentario para documentacao
COMMENT ON TABLE user_data IS 'Armazenamento generico de dados do usuario (substitui localStorage). data_key identifica o tipo: settings, notifications, missions, alerts, life_expenses, chat_messages, ai_plans, backtest_history, broker_connections, dual_tax_config, alert_read_ids';
