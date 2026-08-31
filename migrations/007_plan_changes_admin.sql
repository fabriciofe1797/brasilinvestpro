-- ============================================================
-- 007: identifica o administrador nas mudanças de plano manuais
-- executadas pelo painel administrativo (action admin_set_plan).
--
-- EXECUTAR NO SQL EDITOR DO SUPABASE.
-- ============================================================

alter table plan_changes add column if not exists admin_id text;
