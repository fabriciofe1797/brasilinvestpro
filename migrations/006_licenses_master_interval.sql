-- 006: permite o plano 'master' na licença e registra o intervalo de cobrança.
-- O CHECK original (001) aceitava apenas ('free','starter','pro','elite'),
-- fazendo o webhook falhar ao conceder o plano Master vendido na UI.

alter table licenses drop constraint if exists licenses_plan_type_check;
alter table licenses add constraint licenses_plan_type_check
  check (plan_type in ('free','starter','pro','master','elite'));

-- mensal | anual (preenchido pelo stripe-webhook no checkout/renovação)
alter table licenses add column if not exists billing_interval text;

-- promoção aplicada na compra ('founder' = Membro Fundador); preenchido pelo stripe-webhook
alter table licenses add column if not exists promo text;
