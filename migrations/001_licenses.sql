create table if not exists licenses (
  user_id uuid primary key,
  plan_type text not null check (plan_type in ('free','starter','pro','elite')),
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  payment_status text not null default 'active' check (payment_status in ('active','past_due','expired')),
  last_payment_date timestamp with time zone,
  auto_renew_flag boolean not null default false,
  updated_at timestamp with time zone not null default now()
);

create table if not exists plan_changes (
  id bigserial primary key,
  user_id uuid not null,
  from_plan text not null,
  to_plan text not null,
  reason text,
  changed_at timestamp with time zone not null default now()
);

create table if not exists email_queue (
  id bigserial primary key,
  user_id uuid not null,
  template text not null,
  metadata jsonb,
  queued_at timestamp with time zone not null default now(),
  sent_at timestamp with time zone
);
