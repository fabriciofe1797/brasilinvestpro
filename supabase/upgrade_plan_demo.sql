-- ============================================================
-- Upgrade de plano MANUAL (demonstração / suporte) — versão robusta
-- user_id: user_394MBzljHO6bMEQSQvNqtwFmXSn
-- De: plano atual (ou inexistente) -> Para: elite
--
-- POR QUE A VERSÃO ANTERIOR NÃO FUNCIONAVA:
--   Usuários free NÃO possuem linha na tabela `licenses` — a linha
--   só é criada pelo stripe-webhook na primeira compra. O UPDATE ...
--   WHERE afetava 0 linhas e nada mudava (o app-proxy trata "sem
--   linha" como plano free). Solução: INSERT ... ON CONFLICT (upsert).
--
-- COMO EXECUTAR:
--   1. Supabase Dashboard do projeto -> SQL Editor
--   2. Cole este script e clique em "Run"
--   3. Confira o SELECT final: plan_type='elite', payment_status='active'
--   4. No app, faça logout/login (ou acione a sincronização) para o
--      frontend buscar a nova licença via get_user_license
-- ============================================================

begin;

do $$
declare
  v_user_id text := 'user_394MBzljHO6bMEQSQvNqtwFmXSn';
  v_prev    text;
begin
  -- 1) Captura o plano atual para a auditoria ('free' se não houver linha)
  select plan_type into v_prev from licenses where user_id = v_user_id;
  v_prev := coalesce(v_prev, 'free');

  -- 2) Cria ou atualiza a licença.
  --    end_date em 10 anos evita o rebaixamento automático do cron check-licenses.
  insert into licenses (user_id, plan_type, payment_status, start_date, end_date, last_payment_date, updated_at)
  values (v_user_id, 'elite', 'active', now(), now() + interval '10 years', now(), now())
  on conflict (user_id) do update
    set plan_type         = excluded.plan_type,
        payment_status    = excluded.payment_status,
        start_date        = excluded.start_date,
        end_date          = excluded.end_date,
        last_payment_date = excluded.last_payment_date,
        updated_at        = now();

  -- 3) Trilha de auditoria (mesma tabela usada pelo webhook do Stripe),
  --    com o plano de origem real, não um valor fixo.
  insert into plan_changes (user_id, from_plan, to_plan, reason)
  values (v_user_id, v_prev, 'elite', 'manual_grant_demo');
end $$;

commit;

-- ============================================================
-- VERIFICAÇÃO FINAL (deve retornar 1 linha com plan_type='elite')
-- ============================================================
select user_id, plan_type, payment_status, start_date, end_date, updated_at
from licenses
where user_id = 'user_394MBzljHO6bMEQSQvNqtwFmXSn';

-- Conferência da auditoria
select changed_at, from_plan, to_plan, reason
from plan_changes
where user_id = 'user_394MBzljHO6bMEQSQvNqtwFmXSn'
order by changed_at desc
limit 5;
