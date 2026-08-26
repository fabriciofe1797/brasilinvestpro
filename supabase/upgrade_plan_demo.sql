-- ============================================================
-- Upgrade de plano para conta pessoal (demonstração a clientes)
-- user_id: user_394MBzljHO6bMEQSQvNqtwFmXSn
-- De: free  ->  Para: elite (melhor plano)
--
-- COMO EXECUTAR:
--   1. Supabase Dashboard do projeto -> SQL Editor
--   2. Cole este script e clique em "Run"
--   3. Confira o SELECT final: plan_type='elite', payment_status='active'
-- ============================================================

begin;

-- Atualiza a licença existente para o melhor plano.
-- end_date em 10 anos evita o rebaixamento automático do cron check-licenses.
update licenses
set plan_type         = 'elite',
    payment_status    = 'active',
    start_date        = now(),
    end_date          = now() + interval '10 years',
    last_payment_date = now(),
    updated_at        = now()
where user_id = 'user_394MBzljHO6bMEQSQvNqtwFmXSn';

-- Trilha de auditoria (mesma tabela usada pelo webhook do Stripe).
insert into plan_changes (user_id, from_plan, to_plan, reason)
values ('user_394MBzljHO6bMEQSQvNqtwFmXSn', 'free', 'elite', 'manual_grant_demo');

commit;

-- ============================================================
-- VERIFICAÇÃO FINAL
-- ============================================================
select user_id, plan_type, payment_status, start_date, end_date, updated_at
from licenses
where user_id = 'user_394MBzljHO6bMEQSQvNqtwFmXSn';
