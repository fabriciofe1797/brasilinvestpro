[
  {
    "?column?": "CREATE TABLE auth.audit_log_entries (\n  instance_id uuid,\n  ip_address character varying(64) NOT NULL,\n  created_at timestamp with time zone,\n  payload json,\n  id uuid NOT NULL\n);\n"
  },
  {
    "?column?": "CREATE TABLE auth.flow_state (\n  linking_target_id uuid,\n  auth_code text,\n  code_challenge_method auth.code_challenge_method,\n  code_challenge text,\n  provider_type text NOT NULL,\n  provider_access_token text,\n  provider_refresh_token text,\n  created_at timestamp with time zone,\n  updated_at timestamp with time zone,\n  authentication_method text NOT NULL,\n  auth_code_issued_at timestamp with time zone,\n  invite_token text,\n  referrer text,\n  oauth_client_state_id uuid,\n  email_optional boolean NOT NULL,\n  id uuid NOT NULL,\n  user_id uuid\n);\n"
  },
  {
    "?column?": "CREATE TABLE auth.identities (\n  provider text NOT NULL,\n  email text,\n  id uuid NOT NULL,\n  provider_id text NOT NULL,\n  user_id uuid NOT NULL,\n  identity_data jsonb NOT NULL,\n  last_sign_in_at timestamp with time zone,\n  created_at timestamp with time zone,\n  updated_at timestamp with time zone\n);\n"
  },
  {
    "?column?": "CREATE TABLE auth.instances (\n  created_at timestamp with time zone,\n  id uuid NOT NULL,\n  raw_base_config text,\n  uuid uuid,\n  updated_at timestamp with time zone\n);\n"
  },
  {
    "?column?": "CREATE TABLE auth.mfa_amr_claims (\n  created_at timestamp with time zone NOT NULL,\n  id uuid NOT NULL,\n  authentication_method text NOT NULL,\n  updated_at timestamp with time zone NOT NULL,\n  session_id uuid NOT NULL\n);\n"
  },
  {
    "?column?": "CREATE TABLE auth.mfa_challenges (\n  created_at timestamp with time zone NOT NULL,\n  verified_at timestamp with time zone,\n  ip_address inet NOT NULL,\n  otp_code text,\n  web_authn_session_data jsonb,\n  id uuid NOT NULL,\n  factor_id uuid NOT NULL\n);\n"
  },
  {
    "?column?": "CREATE TABLE auth.mfa_factors (\n  secret text,\n  phone text,\n  last_challenged_at timestamp with time zone,\n  web_authn_credential jsonb,\n  web_authn_aaguid uuid,\n  status auth.factor_status NOT NULL,\n  last_webauthn_challenge_data jsonb,\n  user_id uuid NOT NULL,\n  id uuid NOT NULL,\n  factor_type auth.factor_type NOT NULL,\n  created_at timestamp with time zone NOT NULL,\n  updated_at timestamp with time zone NOT NULL,\n  friendly_name text\n);\n"
  },
  {
    "?column?": "CREATE TABLE auth.oauth_authorizations (\n  resource text,\n  nonce text,\n  approved_at timestamp with time zone,\n  expires_at timestamp with time zone NOT NULL,\n  client_id uuid NOT NULL,\n  authorization_id text NOT NULL,\n  created_at timestamp with time zone NOT NULL,\n  authorization_code text,\n  status auth.oauth_authorization_status NOT NULL,\n  response_type auth.oauth_response_type NOT NULL,\n  code_challenge_method auth.code_challenge_method,\n  code_challenge text,\n  id uuid NOT NULL,\n  state text,\n  scope text NOT NULL,\n  redirect_uri text NOT NULL,\n  user_id uuid\n);\n"
  },
  {
    "?column?": "CREATE TABLE auth.oauth_client_states (\n  provider_type text NOT NULL,\n  id uuid NOT NULL,\n  code_verifier text,\n  created_at timestamp with time zone NOT NULL\n);\n"
  },
  {
    "?column?": "CREATE TABLE auth.oauth_clients (\n  redirect_uris text NOT NULL,\n  grant_types text NOT NULL,\n  client_name text,\n  client_uri text,\n  token_endpoint_auth_method text NOT NULL,\n  created_at timestamp with time zone NOT NULL,\n  updated_at timestamp with time zone NOT NULL,\n  deleted_at timestamp with time zone,\n  client_type auth.oauth_client_type NOT NULL,\n  logo_uri text,\n  id uuid NOT NULL,\n  client_secret_hash text,\n  registration_type auth.oauth_registration_type NOT NULL\n);\n"
  },
  {
    "?column?": "CREATE TABLE auth.oauth_consents (\n  granted_at timestamp with time zone NOT NULL,\n  revoked_at timestamp with time zone,\n  id uuid NOT NULL,\n  user_id uuid NOT NULL,\n  client_id uuid NOT NULL,\n  scopes text NOT NULL\n);\n"
  },
  {
    "?column?": "CREATE TABLE auth.one_time_tokens (\n  id uuid NOT NULL,\n  user_id uuid NOT NULL,\n  token_type auth.one_time_token_type NOT NULL,\n  token_hash text NOT NULL,\n  relates_to text NOT NULL,\n  created_at timestamp without time zone NOT NULL,\n  updated_at timestamp without time zone NOT NULL\n);\n"
  },
  {
    "?column?": "CREATE TABLE auth.refresh_tokens (\n  updated_at timestamp with time zone,\n  created_at timestamp with time zone,\n  revoked boolean,\n  user_id character varying(255),\n  token character varying(255),\n  id bigint NOT NULL,\n  instance_id uuid,\n  session_id uuid,\n  parent character varying(255)\n);\n"
  },
  {
    "?column?": "CREATE TABLE auth.saml_providers (\n  name_id_format text,\n  attribute_mapping jsonb,\n  metadata_url text,\n  entity_id text NOT NULL,\n  metadata_xml text NOT NULL,\n  id uuid NOT NULL,\n  sso_provider_id uuid NOT NULL,\n  created_at timestamp with time zone,\n  updated_at timestamp with time zone\n);\n"
  },
  {
    "?column?": "CREATE TABLE auth.saml_relay_states (\n  id uuid NOT NULL,\n  flow_state_id uuid,\n  updated_at timestamp with time zone,\n  created_at timestamp with time zone,\n  redirect_to text,\n  for_email text,\n  request_id text NOT NULL,\n  sso_provider_id uuid NOT NULL\n);\n"
  },
  {
    "?column?": "CREATE TABLE auth.schema_migrations (\n  version character varying(255) NOT NULL\n);\n"
  },
  {
    "?column?": "CREATE TABLE auth.sessions (\n  refresh_token_counter bigint,\n  scopes text,\n  ip inet,\n  user_agent text,\n  refreshed_at timestamp without time zone,\n  not_after timestamp with time zone,\n  aal auth.aal_level,\n  factor_id uuid,\n  updated_at timestamp with time zone,\n  created_at timestamp with time zone,\n  user_id uuid NOT NULL,\n  id uuid NOT NULL,\n  refresh_token_hmac_key text,\n  oauth_client_id uuid,\n  tag text\n);\n"
  },
  {
    "?column?": "CREATE TABLE auth.sso_domains (\n  sso_provider_id uuid NOT NULL,\n  updated_at timestamp with time zone,\n  id uuid NOT NULL,\n  created_at timestamp with time zone,\n  domain text NOT NULL\n);\n"
  },
  {
    "?column?": "CREATE TABLE auth.sso_providers (\n  updated_at timestamp with time zone,\n  resource_id text,\n  disabled boolean,\n  created_at timestamp with time zone,\n  id uuid NOT NULL\n);\n"
  },
  {
    "?column?": "CREATE TABLE auth.users (\n  encrypted_password character varying(255),\n  instance_id uuid,\n  id uuid NOT NULL,\n  aud character varying(255),\n  role character varying(255),\n  email character varying(255),\n  email_confirmed_at timestamp with time zone,\n  invited_at timestamp with time zone,\n  confirmation_token character varying(255),\n  confirmation_sent_at timestamp with time zone,\n  recovery_token character varying(255),\n  recovery_sent_at timestamp with time zone,\n  email_change_token_new character varying(255),\n  email_change character varying(255),\n  email_change_sent_at timestamp with time zone,\n  last_sign_in_at timestamp with time zone,\n  raw_app_meta_data jsonb,\n  raw_user_meta_data jsonb,\n  is_super_admin boolean,\n  created_at timestamp with time zone,\n  updated_at timestamp with time zone,\n  phone text,\n  phone_confirmed_at timestamp with time zone,\n  phone_change text,\n  phone_change_token character varying(255),\n  phone_change_sent_at timestamp with time zone,\n  confirmed_at timestamp with time zone,\n  email_change_token_current character varying(255),\n  email_change_confirm_status smallint,\n  banned_until timestamp with time zone,\n  reauthentication_token character varying(255),\n  reauthentication_sent_at timestamp with time zone,\n  is_sso_user boolean NOT NULL,\n  deleted_at timestamp with time zone,\n  is_anonymous boolean NOT NULL\n);\n"
  },
  {
    "?column?": "CREATE TABLE public.asset_prices (\n  ticker text NOT NULL,\n  close numeric NOT NULL,\n  created_at timestamp with time zone NOT NULL,\n  source text,\n  date date NOT NULL\n);\n"
  },
  {
    "?column?": "CREATE TABLE public.assets (\n  price numeric(10,2) NOT NULL,\n  currency text,\n  last_updated timestamp with time zone NOT NULL,\n  dividend_yield numeric(5,2),\n  id uuid NOT NULL,\n  ticker text NOT NULL,\n  name text,\n  category text,\n  last_close numeric(10,2)\n);\n"
  },
  {
    "?column?": "CREATE TABLE public.email_queue (\n  id bigint NOT NULL,\n  sent_at timestamp with time zone,\n  metadata jsonb,\n  queued_at timestamp with time zone NOT NULL,\n  template text NOT NULL,\n  user_id text NOT NULL\n);\n"
  },
  {
    "?column?": "CREATE TABLE public.licenses (\n  end_date timestamp with time zone,\n  start_date timestamp with time zone,\n  plan_type text NOT NULL,\n  user_id text NOT NULL,\n  updated_at timestamp with time zone NOT NULL,\n  auto_renew_flag boolean NOT NULL,\n  last_payment_date timestamp with time zone,\n  payment_status text NOT NULL\n);\n"
  },
  {
    "?column?": "CREATE TABLE public.plan_changes (\n  user_id text NOT NULL,\n  from_plan text NOT NULL,\n  to_plan text NOT NULL,\n  reason text,\n  changed_at timestamp with time zone NOT NULL,\n  id bigint NOT NULL\n);\n"
  },
  {
    "?column?": "CREATE TABLE public.profiles (\n  email text,\n  settings jsonb,\n  created_at timestamp with time zone NOT NULL,\n  id text NOT NULL\n);\n"
  },
  {
    "?column?": "CREATE TABLE public.transactions (\n  user_id text NOT NULL,\n  asset_ticker text NOT NULL,\n  id uuid NOT NULL,\n  realized_pnl numeric,\n  cost_basis numeric,\n  created_at timestamp with time zone NOT NULL,\n  fees numeric(10,2),\n  date date NOT NULL,\n  total numeric(12,2) NOT NULL,\n  price numeric(10,2) NOT NULL,\n  quantity numeric(10,2) NOT NULL,\n  type text NOT NULL\n);\n"
  },
  {
    "?column?": "CREATE TABLE realtime.schema_migrations (\n  inserted_at timestamp(0) without time zone,\n  version bigint NOT NULL\n);\n"
  },
  {
    "?column?": "CREATE TABLE realtime.subscription (\n  action_filter text,\n  id bigint NOT NULL,\n  subscription_id uuid NOT NULL,\n  entity regclass NOT NULL,\n  filters realtime.user_defined_filter[] NOT NULL,\n  claims jsonb NOT NULL,\n  claims_role regrole NOT NULL,\n  created_at timestamp without time zone NOT NULL\n);\n"
  },
  {
    "?column?": "CREATE TABLE storage.buckets (\n  owner uuid,\n  updated_at timestamp with time zone,\n  public boolean,\n  avif_autodetection boolean,\n  file_size_limit bigint,\n  allowed_mime_types text[],\n  owner_id text,\n  type storage.buckettype NOT NULL,\n  id text NOT NULL,\n  name text NOT NULL,\n  created_at timestamp with time zone\n);\n"
  },
  {
    "?column?": "CREATE TABLE storage.buckets_analytics (\n  deleted_at timestamp with time zone,\n  created_at timestamp with time zone NOT NULL,\n  updated_at timestamp with time zone NOT NULL,\n  id uuid NOT NULL,\n  name text NOT NULL,\n  type storage.buckettype NOT NULL,\n  format text NOT NULL\n);\n"
  },
  {
    "?column?": "CREATE TABLE storage.buckets_vectors (\n  type storage.buckettype NOT NULL,\n  created_at timestamp with time zone NOT NULL,\n  updated_at timestamp with time zone NOT NULL,\n  id text NOT NULL\n);\n"
  },
  {
    "?column?": "CREATE TABLE storage.migrations (\n  name character varying(100) NOT NULL,\n  id integer NOT NULL,\n  hash character varying(40) NOT NULL,\n  executed_at timestamp without time zone\n);\n"
  },
  {
    "?column?": "CREATE TABLE storage.objects (\n  owner_id text,\n  user_metadata jsonb,\n  bucket_id text,\n  name text,\n  owner uuid,\n  created_at timestamp with time zone,\n  updated_at timestamp with time zone,\n  last_accessed_at timestamp with time zone,\n  metadata jsonb,\n  path_tokens text[],\n  version text,\n  id uuid NOT NULL\n);\n"
  },
  {
    "?column?": "CREATE TABLE storage.s3_multipart_uploads (\n  user_metadata jsonb,\n  created_at timestamp with time zone NOT NULL,\n  owner_id text,\n  version text NOT NULL,\n  in_progress_size bigint NOT NULL,\n  upload_signature text NOT NULL,\n  bucket_id text NOT NULL,\n  key text NOT NULL,\n  id text NOT NULL\n);\n"
  },
  {
    "?column?": "CREATE TABLE storage.s3_multipart_uploads_parts (\n  bucket_id text NOT NULL,\n  created_at timestamp with time zone NOT NULL,\n  version text NOT NULL,\n  owner_id text,\n  etag text NOT NULL,\n  key text NOT NULL,\n  part_number integer NOT NULL,\n  size bigint NOT NULL,\n  upload_id text NOT NULL,\n  id uuid NOT NULL\n);\n"
  },
  {
    "?column?": "CREATE TABLE storage.vector_indexes (\n  dimension integer NOT NULL,\n  distance_metric text NOT NULL,\n  metadata_configuration jsonb,\n  created_at timestamp with time zone NOT NULL,\n  updated_at timestamp with time zone NOT NULL,\n  data_type text NOT NULL,\n  bucket_id text NOT NULL,\n  name text NOT NULL,\n  id text NOT NULL\n);\n"
  },
  {
    "?column?": "CREATE TABLE vault.secrets (\n  updated_at timestamp with time zone NOT NULL,\n  id uuid NOT NULL,\n  name text,\n  description text NOT NULL,\n  secret text NOT NULL,\n  key_id uuid,\n  nonce bytea,\n  created_at timestamp with time zone NOT NULL\n);\n"
  }
]

[
  {
    "ddl": "ALTER TABLE auth.audit_log_entries ADD CONSTRAINT audit_log_entries_pkey PRIMARY KEY (id);"
  },
  {
    "ddl": "ALTER TABLE auth.flow_state ADD CONSTRAINT flow_state_pkey PRIMARY KEY (id);"
  },
  {
    "ddl": "ALTER TABLE auth.identities ADD CONSTRAINT identities_pkey PRIMARY KEY (id);"
  },
  {
    "ddl": "ALTER TABLE auth.identities ADD CONSTRAINT identities_provider_id_provider_unique UNIQUE (provider_id, provider);"
  },
  {
    "ddl": "ALTER TABLE auth.instances ADD CONSTRAINT instances_pkey PRIMARY KEY (id);"
  },
  {
    "ddl": "ALTER TABLE auth.mfa_amr_claims ADD CONSTRAINT mfa_amr_claims_session_id_authentication_method_pkey UNIQUE (session_id, authentication_method);"
  },
  {
    "ddl": "ALTER TABLE auth.mfa_amr_claims ADD CONSTRAINT amr_id_pk PRIMARY KEY (id);"
  },
  {
    "ddl": "ALTER TABLE auth.mfa_challenges ADD CONSTRAINT mfa_challenges_pkey PRIMARY KEY (id);"
  },
  {
    "ddl": "ALTER TABLE auth.mfa_factors ADD CONSTRAINT mfa_factors_pkey PRIMARY KEY (id);"
  },
  {
    "ddl": "ALTER TABLE auth.mfa_factors ADD CONSTRAINT mfa_factors_last_challenged_at_key UNIQUE (last_challenged_at);"
  },
  {
    "ddl": "ALTER TABLE auth.oauth_authorizations ADD CONSTRAINT oauth_authorizations_authorization_code_key UNIQUE (authorization_code);"
  },
  {
    "ddl": "ALTER TABLE auth.oauth_authorizations ADD CONSTRAINT oauth_authorizations_pkey PRIMARY KEY (id);"
  },
  {
    "ddl": "ALTER TABLE auth.oauth_authorizations ADD CONSTRAINT oauth_authorizations_authorization_id_key UNIQUE (authorization_id);"
  },
  {
    "ddl": "ALTER TABLE auth.oauth_client_states ADD CONSTRAINT oauth_client_states_pkey PRIMARY KEY (id);"
  },
  {
    "ddl": "ALTER TABLE auth.oauth_clients ADD CONSTRAINT oauth_clients_pkey PRIMARY KEY (id);"
  },
  {
    "ddl": "ALTER TABLE auth.oauth_consents ADD CONSTRAINT oauth_consents_user_client_unique UNIQUE (user_id, client_id);"
  },
  {
    "ddl": "ALTER TABLE auth.oauth_consents ADD CONSTRAINT oauth_consents_pkey PRIMARY KEY (id);"
  },
  {
    "ddl": "ALTER TABLE auth.one_time_tokens ADD CONSTRAINT one_time_tokens_pkey PRIMARY KEY (id);"
  },
  {
    "ddl": "ALTER TABLE auth.refresh_tokens ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);"
  },
  {
    "ddl": "ALTER TABLE auth.refresh_tokens ADD CONSTRAINT refresh_tokens_token_unique UNIQUE (token);"
  },
  {
    "ddl": "ALTER TABLE auth.saml_providers ADD CONSTRAINT saml_providers_entity_id_key UNIQUE (entity_id);"
  },
  {
    "ddl": "ALTER TABLE auth.saml_providers ADD CONSTRAINT saml_providers_pkey PRIMARY KEY (id);"
  },
  {
    "ddl": "ALTER TABLE auth.saml_relay_states ADD CONSTRAINT saml_relay_states_pkey PRIMARY KEY (id);"
  },
  {
    "ddl": "ALTER TABLE auth.schema_migrations ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);"
  },
  {
    "ddl": "ALTER TABLE auth.sessions ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);"
  },
  {
    "ddl": "ALTER TABLE auth.sso_domains ADD CONSTRAINT sso_domains_pkey PRIMARY KEY (id);"
  },
  {
    "ddl": "ALTER TABLE auth.sso_providers ADD CONSTRAINT sso_providers_pkey PRIMARY KEY (id);"
  },
  {
    "ddl": "ALTER TABLE auth.users ADD CONSTRAINT users_phone_key UNIQUE (phone);"
  },
  {
    "ddl": "ALTER TABLE auth.users ADD CONSTRAINT users_pkey PRIMARY KEY (id);"
  },
  {
    "ddl": "ALTER TABLE public.asset_prices ADD CONSTRAINT asset_prices_pk PRIMARY KEY (ticker, date);"
  },
  {
    "ddl": "ALTER TABLE public.assets ADD CONSTRAINT assets_pkey PRIMARY KEY (id);"
  },
  {
    "ddl": "ALTER TABLE public.assets ADD CONSTRAINT assets_ticker_key UNIQUE (ticker);"
  },
  {
    "ddl": "ALTER TABLE public.email_queue ADD CONSTRAINT email_queue_pkey PRIMARY KEY (id);"
  },
  {
    "ddl": "ALTER TABLE public.licenses ADD CONSTRAINT licenses_pkey PRIMARY KEY (user_id);"
  },
  {
    "ddl": "ALTER TABLE public.plan_changes ADD CONSTRAINT plan_changes_pkey PRIMARY KEY (id);"
  },
  {
    "ddl": "ALTER TABLE public.profiles ADD CONSTRAINT profiles_email_unique UNIQUE (email);"
  },
  {
    "ddl": "ALTER TABLE public.profiles ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);"
  },
  {
    "ddl": "ALTER TABLE public.transactions ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);"
  },
  {
    "ddl": "ALTER TABLE realtime.messages ADD CONSTRAINT messages_pkey PRIMARY KEY (id, inserted_at);"
  },
  {
    "ddl": "ALTER TABLE realtime.schema_migrations ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);"
  },
  {
    "ddl": "ALTER TABLE realtime.subscription ADD CONSTRAINT pk_subscription PRIMARY KEY (id);"
  },
  {
    "ddl": "ALTER TABLE storage.buckets ADD CONSTRAINT buckets_pkey PRIMARY KEY (id);"
  },
  {
    "ddl": "ALTER TABLE storage.buckets_analytics ADD CONSTRAINT buckets_analytics_pkey PRIMARY KEY (id);"
  },
  {
    "ddl": "ALTER TABLE storage.buckets_vectors ADD CONSTRAINT buckets_vectors_pkey PRIMARY KEY (id);"
  },
  {
    "ddl": "ALTER TABLE storage.migrations ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);"
  },
  {
    "ddl": "ALTER TABLE storage.migrations ADD CONSTRAINT migrations_name_key UNIQUE (name);"
  },
  {
    "ddl": "ALTER TABLE storage.objects ADD CONSTRAINT objects_pkey PRIMARY KEY (id);"
  },
  {
    "ddl": "ALTER TABLE storage.s3_multipart_uploads ADD CONSTRAINT s3_multipart_uploads_pkey PRIMARY KEY (id);"
  },
  {
    "ddl": "ALTER TABLE storage.s3_multipart_uploads_parts ADD CONSTRAINT s3_multipart_uploads_parts_pkey PRIMARY KEY (id);"
  },
  {
    "ddl": "ALTER TABLE storage.vector_indexes ADD CONSTRAINT vector_indexes_pkey PRIMARY KEY (id);"
  },
  {
    "ddl": "ALTER TABLE vault.secrets ADD CONSTRAINT secrets_pkey PRIMARY KEY (id);"
  }
]

[
  {
    "ddl": "ALTER TABLE auth.identities ADD CONSTRAINT identities_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;"
  },
  {
    "ddl": "ALTER TABLE auth.mfa_amr_claims ADD CONSTRAINT mfa_amr_claims_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;"
  },
  {
    "ddl": "ALTER TABLE auth.mfa_challenges ADD CONSTRAINT mfa_challenges_auth_factor_id_fkey FOREIGN KEY (factor_id) REFERENCES auth.mfa_factors(id) ON DELETE CASCADE;"
  },
  {
    "ddl": "ALTER TABLE auth.mfa_factors ADD CONSTRAINT mfa_factors_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;"
  },
  {
    "ddl": "ALTER TABLE auth.oauth_authorizations ADD CONSTRAINT oauth_authorizations_client_id_fkey FOREIGN KEY (client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;"
  },
  {
    "ddl": "ALTER TABLE auth.oauth_authorizations ADD CONSTRAINT oauth_authorizations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;"
  },
  {
    "ddl": "ALTER TABLE auth.oauth_consents ADD CONSTRAINT oauth_consents_client_id_fkey FOREIGN KEY (client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;"
  },
  {
    "ddl": "ALTER TABLE auth.oauth_consents ADD CONSTRAINT oauth_consents_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;"
  },
  {
    "ddl": "ALTER TABLE auth.one_time_tokens ADD CONSTRAINT one_time_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;"
  },
  {
    "ddl": "ALTER TABLE auth.refresh_tokens ADD CONSTRAINT refresh_tokens_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;"
  },
  {
    "ddl": "ALTER TABLE auth.saml_providers ADD CONSTRAINT saml_providers_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;"
  },
  {
    "ddl": "ALTER TABLE auth.saml_relay_states ADD CONSTRAINT saml_relay_states_flow_state_id_fkey FOREIGN KEY (flow_state_id) REFERENCES auth.flow_state(id) ON DELETE CASCADE;"
  },
  {
    "ddl": "ALTER TABLE auth.saml_relay_states ADD CONSTRAINT saml_relay_states_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;"
  },
  {
    "ddl": "ALTER TABLE auth.sessions ADD CONSTRAINT sessions_oauth_client_id_fkey FOREIGN KEY (oauth_client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;"
  },
  {
    "ddl": "ALTER TABLE auth.sessions ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;"
  },
  {
    "ddl": "ALTER TABLE auth.sso_domains ADD CONSTRAINT sso_domains_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;"
  },
  {
    "ddl": "ALTER TABLE public.asset_prices ADD CONSTRAINT asset_prices_ticker_fkey FOREIGN KEY (ticker) REFERENCES assets(ticker) ON UPDATE CASCADE ON DELETE CASCADE;"
  },
  {
    "ddl": "ALTER TABLE public.transactions ADD CONSTRAINT transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id);"
  },
  {
    "ddl": "ALTER TABLE storage.objects ADD CONSTRAINT \"objects_bucketId_fkey\" FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);"
  },
  {
    "ddl": "ALTER TABLE storage.s3_multipart_uploads ADD CONSTRAINT s3_multipart_uploads_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);"
  },
  {
    "ddl": "ALTER TABLE storage.s3_multipart_uploads_parts ADD CONSTRAINT s3_multipart_uploads_parts_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);"
  },
  {
    "ddl": "ALTER TABLE storage.s3_multipart_uploads_parts ADD CONSTRAINT s3_multipart_uploads_parts_upload_id_fkey FOREIGN KEY (upload_id) REFERENCES storage.s3_multipart_uploads(id) ON DELETE CASCADE;"
  },
  {
    "ddl": "ALTER TABLE storage.vector_indexes ADD CONSTRAINT vector_indexes_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets_vectors(id);"
  }
]

[
  {
    "?column?": "CREATE OR REPLACE FUNCTION auth.email()\nRETURNS text\nAS $$CREATE OR REPLACE FUNCTION auth.email()\n RETURNS text\n LANGUAGE sql\n STABLE\nAS $function$\n  select \n  coalesce(\n    nullif(current_setting('request.jwt.claim.email', true), ''),\n    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email')\n  )::text\n$function$\n$$ LANGUAGE sql;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION auth.jwt()\nRETURNS jsonb\nAS $$CREATE OR REPLACE FUNCTION auth.jwt()\n RETURNS jsonb\n LANGUAGE sql\n STABLE\nAS $function$\n  select \n    coalesce(\n        nullif(current_setting('request.jwt.claim', true), ''),\n        nullif(current_setting('request.jwt.claims', true), '')\n    )::jsonb\n$function$\n$$ LANGUAGE sql;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION auth.role()\nRETURNS text\nAS $$CREATE OR REPLACE FUNCTION auth.role()\n RETURNS text\n LANGUAGE sql\n STABLE\nAS $function$\n  select \n  coalesce(\n    nullif(current_setting('request.jwt.claim.role', true), ''),\n    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')\n  )::text\n$function$\n$$ LANGUAGE sql;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION auth.uid()\nRETURNS uuid\nAS $$CREATE OR REPLACE FUNCTION auth.uid()\n RETURNS uuid\n LANGUAGE sql\n STABLE\nAS $function$\n  select \n  coalesce(\n    nullif(current_setting('request.jwt.claim.sub', true), ''),\n    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')\n  )::uuid\n$function$\n$$ LANGUAGE sql;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION extensions.armor(bytea)\nRETURNS text\nAS $$CREATE OR REPLACE FUNCTION extensions.armor(bytea)\n RETURNS text\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pg_armor$function$\n$$ LANGUAGE c;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION extensions.armor(bytea, text[], text[])\nRETURNS text\nAS $$CREATE OR REPLACE FUNCTION extensions.armor(bytea, text[], text[])\n RETURNS text\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pg_armor$function$\n$$ LANGUAGE c;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION extensions.crypt(text, text)\nRETURNS text\nAS $$CREATE OR REPLACE FUNCTION extensions.crypt(text, text)\n RETURNS text\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pg_crypt$function$\n$$ LANGUAGE c;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION extensions.dearmor(text)\nRETURNS bytea\nAS $$CREATE OR REPLACE FUNCTION extensions.dearmor(text)\n RETURNS bytea\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pg_dearmor$function$\n$$ LANGUAGE c;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION extensions.decrypt(bytea, bytea, text)\nRETURNS bytea\nAS $$CREATE OR REPLACE FUNCTION extensions.decrypt(bytea, bytea, text)\n RETURNS bytea\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pg_decrypt$function$\n$$ LANGUAGE c;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION extensions.decrypt_iv(bytea, bytea, bytea, text)\nRETURNS bytea\nAS $$CREATE OR REPLACE FUNCTION extensions.decrypt_iv(bytea, bytea, bytea, text)\n RETURNS bytea\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pg_decrypt_iv$function$\n$$ LANGUAGE c;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION extensions.digest(text, text)\nRETURNS bytea\nAS $$CREATE OR REPLACE FUNCTION extensions.digest(text, text)\n RETURNS bytea\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pg_digest$function$\n$$ LANGUAGE c;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION extensions.digest(bytea, text)\nRETURNS bytea\nAS $$CREATE OR REPLACE FUNCTION extensions.digest(bytea, text)\n RETURNS bytea\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pg_digest$function$\n$$ LANGUAGE c;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION extensions.encrypt(bytea, bytea, text)\nRETURNS bytea\nAS $$CREATE OR REPLACE FUNCTION extensions.encrypt(bytea, bytea, text)\n RETURNS bytea\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pg_encrypt$function$\n$$ LANGUAGE c;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION extensions.encrypt_iv(bytea, bytea, bytea, text)\nRETURNS bytea\nAS $$CREATE OR REPLACE FUNCTION extensions.encrypt_iv(bytea, bytea, bytea, text)\n RETURNS bytea\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pg_encrypt_iv$function$\n$$ LANGUAGE c;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION extensions.gen_random_bytes(integer)\nRETURNS bytea\nAS $$CREATE OR REPLACE FUNCTION extensions.gen_random_bytes(integer)\n RETURNS bytea\n LANGUAGE c\n PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pg_random_bytes$function$\n$$ LANGUAGE c;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION extensions.gen_random_uuid()\nRETURNS uuid\nAS $$CREATE OR REPLACE FUNCTION extensions.gen_random_uuid()\n RETURNS uuid\n LANGUAGE c\n PARALLEL SAFE\nAS '$libdir/pgcrypto', $function$pg_random_uuid$function$\n$$ LANGUAGE c;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION extensions.gen_salt(text)\nRETURNS text\nAS $$CREATE OR REPLACE FUNCTION extensions.gen_salt(text)\n RETURNS text\n LANGUAGE c\n PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pg_gen_salt$function$\n$$ LANGUAGE c;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION extensions.gen_salt(text, integer)\nRETURNS text\nAS $$CREATE OR REPLACE FUNCTION extensions.gen_salt(text, integer)\n RETURNS text\n LANGUAGE c\n PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pg_gen_salt_rounds$function$\n$$ LANGUAGE c;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION extensions.grant_pg_cron_access()\nRETURNS event_trigger\nAS $$CREATE OR REPLACE FUNCTION extensions.grant_pg_cron_access()\n RETURNS event_trigger\n LANGUAGE plpgsql\nAS $function$\nBEGIN\n  IF EXISTS (\n    SELECT\n    FROM pg_event_trigger_ddl_commands() AS ev\n    JOIN pg_extension AS ext\n    ON ev.objid = ext.oid\n    WHERE ext.extname = 'pg_cron'\n  )\n  THEN\n    grant usage on schema cron to postgres with grant option;\n\n    alter default privileges in schema cron grant all on tables to postgres with grant option;\n    alter default privileges in schema cron grant all on functions to postgres with grant option;\n    alter default privileges in schema cron grant all on sequences to postgres with grant option;\n\n    alter default privileges for user supabase_admin in schema cron grant all\n        on sequences to postgres with grant option;\n    alter default privileges for user supabase_admin in schema cron grant all\n        on tables to postgres with grant option;\n    alter default privileges for user supabase_admin in schema cron grant all\n        on functions to postgres with grant option;\n\n    grant all privileges on all tables in schema cron to postgres with grant option;\n    revoke all on table cron.job from postgres;\n    grant select on table cron.job to postgres with grant option;\n  END IF;\nEND;\n$function$\n$$ LANGUAGE plpgsql;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION extensions.grant_pg_graphql_access()\nRETURNS event_trigger\nAS $$CREATE OR REPLACE FUNCTION extensions.grant_pg_graphql_access()\n RETURNS event_trigger\n LANGUAGE plpgsql\nAS $function$\nDECLARE\n    func_is_graphql_resolve bool;\nBEGIN\n    func_is_graphql_resolve = (\n        SELECT n.proname = 'resolve'\n        FROM pg_event_trigger_ddl_commands() AS ev\n        LEFT JOIN pg_catalog.pg_proc AS n\n        ON ev.objid = n.oid\n    );\n\n    IF func_is_graphql_resolve\n    THEN\n        -- Update public wrapper to pass all arguments through to the pg_graphql resolve func\n        DROP FUNCTION IF EXISTS graphql_public.graphql;\n        create or replace function graphql_public.graphql(\n            \"operationName\" text default null,\n            query text default null,\n            variables jsonb default null,\n            extensions jsonb default null\n        )\n            returns jsonb\n            language sql\n        as $$\n            select graphql.resolve(\n                query := query,\n                variables := coalesce(variables, '{}'),\n                \"operationName\" := \"operationName\",\n                extensions := extensions\n            );\n        $$;\n\n        -- This hook executes when `graphql.resolve` is created. That is not necessarily the last\n        -- function in the extension so we need to grant permissions on existing entities AND\n        -- update default permissions to any others that are created after `graphql.resolve`\n        grant usage on schema graphql to postgres, anon, authenticated, service_role;\n        grant select on all tables in schema graphql to postgres, anon, authenticated, service_role;\n        grant execute on all functions in schema graphql to postgres, anon, authenticated, service_role;\n        grant all on all sequences in schema graphql to postgres, anon, authenticated, service_role;\n        alter default privileges in schema graphql grant all on tables to postgres, anon, authenticated, service_role;\n        alter default privileges in schema graphql grant all on functions to postgres, anon, authenticated, service_role;\n        alter default privileges in schema graphql grant all on sequences to postgres, anon, authenticated, service_role;\n\n        -- Allow postgres role to allow granting usage on graphql and graphql_public schemas to custom roles\n        grant usage on schema graphql_public to postgres with grant option;\n        grant usage on schema graphql to postgres with grant option;\n    END IF;\n\nEND;\n$function$\n$$ LANGUAGE plpgsql;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION extensions.grant_pg_net_access()\nRETURNS event_trigger\nAS $$CREATE OR REPLACE FUNCTION extensions.grant_pg_net_access()\n RETURNS event_trigger\n LANGUAGE plpgsql\nAS $function$\nBEGIN\n  IF EXISTS (\n    SELECT 1\n    FROM pg_event_trigger_ddl_commands() AS ev\n    JOIN pg_extension AS ext\n    ON ev.objid = ext.oid\n    WHERE ext.extname = 'pg_net'\n  )\n  THEN\n    IF NOT EXISTS (\n      SELECT 1\n      FROM pg_roles\n      WHERE rolname = 'supabase_functions_admin'\n    )\n    THEN\n      CREATE USER supabase_functions_admin NOINHERIT CREATEROLE LOGIN NOREPLICATION;\n    END IF;\n\n    GRANT USAGE ON SCHEMA net TO supabase_functions_admin, postgres, anon, authenticated, service_role;\n\n    IF EXISTS (\n      SELECT FROM pg_extension\n      WHERE extname = 'pg_net'\n      -- all versions in use on existing projects as of 2025-02-20\n      -- version 0.12.0 onwards don't need these applied\n      AND extversion IN ('0.2', '0.6', '0.7', '0.7.1', '0.8', '0.10.0', '0.11.0')\n    ) THEN\n      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;\n      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;\n\n      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;\n      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;\n\n      REVOKE ALL ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;\n      REVOKE ALL ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;\n\n      GRANT EXECUTE ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;\n      GRANT EXECUTE ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;\n    END IF;\n  END IF;\nEND;\n$function$\n$$ LANGUAGE plpgsql;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION extensions.hmac(bytea, bytea, text)\nRETURNS bytea\nAS $$CREATE OR REPLACE FUNCTION extensions.hmac(bytea, bytea, text)\n RETURNS bytea\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pg_hmac$function$\n$$ LANGUAGE c;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION extensions.hmac(text, text, text)\nRETURNS bytea\nAS $$CREATE OR REPLACE FUNCTION extensions.hmac(text, text, text)\n RETURNS bytea\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pg_hmac$function$\n$$ LANGUAGE c;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION extensions.pg_stat_statements(showtext boolean, OUT userid oid, OUT dbid oid, OUT toplevel boolean, OUT queryid bigint, OUT query text, OUT plans bigint, OUT total_plan_time double precision, OUT min_plan_time double precision, OUT max_plan_time double precision, OUT mean_plan_time double precision, OUT stddev_plan_time double precision, OUT calls bigint, OUT total_exec_time double precision, OUT min_exec_time double precision, OUT max_exec_time double precision, OUT mean_exec_time double precision, OUT stddev_exec_time double precision, OUT rows bigint, OUT shared_blks_hit bigint, OUT shared_blks_read bigint, OUT shared_blks_dirtied bigint, OUT shared_blks_written bigint, OUT local_blks_hit bigint, OUT local_blks_read bigint, OUT local_blks_dirtied bigint, OUT local_blks_written bigint, OUT temp_blks_read bigint, OUT temp_blks_written bigint, OUT shared_blk_read_time double precision, OUT shared_blk_write_time double precision, OUT local_blk_read_time double precision, OUT local_blk_write_time double precision, OUT temp_blk_read_time double precision, OUT temp_blk_write_time double precision, OUT wal_records bigint, OUT wal_fpi bigint, OUT wal_bytes numeric, OUT jit_functions bigint, OUT jit_generation_time double precision, OUT jit_inlining_count bigint, OUT jit_inlining_time double precision, OUT jit_optimization_count bigint, OUT jit_optimization_time double precision, OUT jit_emission_count bigint, OUT jit_emission_time double precision, OUT jit_deform_count bigint, OUT jit_deform_time double precision, OUT stats_since timestamp with time zone, OUT minmax_stats_since timestamp with time zone)\nRETURNS SETOF record\nAS $$CREATE OR REPLACE FUNCTION extensions.pg_stat_statements(showtext boolean, OUT userid oid, OUT dbid oid, OUT toplevel boolean, OUT queryid bigint, OUT query text, OUT plans bigint, OUT total_plan_time double precision, OUT min_plan_time double precision, OUT max_plan_time double precision, OUT mean_plan_time double precision, OUT stddev_plan_time double precision, OUT calls bigint, OUT total_exec_time double precision, OUT min_exec_time double precision, OUT max_exec_time double precision, OUT mean_exec_time double precision, OUT stddev_exec_time double precision, OUT rows bigint, OUT shared_blks_hit bigint, OUT shared_blks_read bigint, OUT shared_blks_dirtied bigint, OUT shared_blks_written bigint, OUT local_blks_hit bigint, OUT local_blks_read bigint, OUT local_blks_dirtied bigint, OUT local_blks_written bigint, OUT temp_blks_read bigint, OUT temp_blks_written bigint, OUT shared_blk_read_time double precision, OUT shared_blk_write_time double precision, OUT local_blk_read_time double precision, OUT local_blk_write_time double precision, OUT temp_blk_read_time double precision, OUT temp_blk_write_time double precision, OUT wal_records bigint, OUT wal_fpi bigint, OUT wal_bytes numeric, OUT jit_functions bigint, OUT jit_generation_time double precision, OUT jit_inlining_count bigint, OUT jit_inlining_time double precision, OUT jit_optimization_count bigint, OUT jit_optimization_time double precision, OUT jit_emission_count bigint, OUT jit_emission_time double precision, OUT jit_deform_count bigint, OUT jit_deform_time double precision, OUT stats_since timestamp with time zone, OUT minmax_stats_since timestamp with time zone)\n RETURNS SETOF record\n LANGUAGE c\n PARALLEL SAFE STRICT\nAS '$libdir/pg_stat_statements', $function$pg_stat_statements_1_11$function$\n$$ LANGUAGE c;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION extensions.pg_stat_statements_info(OUT dealloc bigint, OUT stats_reset timestamp with time zone)\nRETURNS record\nAS $$CREATE OR REPLACE FUNCTION extensions.pg_stat_statements_info(OUT dealloc bigint, OUT stats_reset timestamp with time zone)\n RETURNS record\n LANGUAGE c\n PARALLEL SAFE STRICT\nAS '$libdir/pg_stat_statements', $function$pg_stat_statements_info$function$\n$$ LANGUAGE c;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION extensions.pg_stat_statements_reset(userid oid DEFAULT 0, dbid oid DEFAULT 0, queryid bigint DEFAULT 0, minmax_only boolean DEFAULT false)\nRETURNS timestamp with time zone\nAS $$CREATE OR REPLACE FUNCTION extensions.pg_stat_statements_reset(userid oid DEFAULT 0, dbid oid DEFAULT 0, queryid bigint DEFAULT 0, minmax_only boolean DEFAULT false)\n RETURNS timestamp with time zone\n LANGUAGE c\n PARALLEL SAFE STRICT\nAS '$libdir/pg_stat_statements', $function$pg_stat_statements_reset_1_11$function$\n$$ LANGUAGE c;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION extensions.pgp_armor_headers(text, OUT key text, OUT value text)\nRETURNS SETOF record\nAS $$CREATE OR REPLACE FUNCTION extensions.pgp_armor_headers(text, OUT key text, OUT value text)\n RETURNS SETOF record\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pgp_armor_headers$function$\n$$ LANGUAGE c;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION extensions.pgp_key_id(bytea)\nRETURNS text\nAS $$CREATE OR REPLACE FUNCTION extensions.pgp_key_id(bytea)\n RETURNS text\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pgp_key_id_w$function$\n$$ LANGUAGE c;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION extensions.pgp_pub_decrypt(bytea, bytea)\nRETURNS text\nAS $$CREATE OR REPLACE FUNCTION extensions.pgp_pub_decrypt(bytea, bytea)\n RETURNS text\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pgp_pub_decrypt_text$function$\n$$ LANGUAGE c;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text)\nRETURNS text\nAS $$CREATE OR REPLACE FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text)\n RETURNS text\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pgp_pub_decrypt_text$function$\n$$ LANGUAGE c;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text, text)\nRETURNS text\nAS $$CREATE OR REPLACE FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text, text)\n RETURNS text\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pgp_pub_decrypt_text$function$\n$$ LANGUAGE c;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea)\nRETURNS bytea\nAS $$CREATE OR REPLACE FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea)\n RETURNS bytea\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pgp_pub_decrypt_bytea$function$\n$$ LANGUAGE c;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text, text)\nRETURNS bytea\nAS $$CREATE OR REPLACE FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text, text)\n RETURNS bytea\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pgp_pub_decrypt_bytea$function$\n$$ LANGUAGE c;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text)\nRETURNS bytea\nAS $$CREATE OR REPLACE FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text)\n RETURNS bytea\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pgp_pub_decrypt_bytea$function$\n$$ LANGUAGE c;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION extensions.pgp_pub_encrypt(text, bytea)\nRETURNS bytea\nAS $$CREATE OR REPLACE FUNCTION extensions.pgp_pub_encrypt(text, bytea)\n RETURNS bytea\n LANGUAGE c\n PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pgp_pub_encrypt_text$function$\n$$ LANGUAGE c;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION extensions.pgp_pub_encrypt(text, bytea, text)\nRETURNS bytea\nAS $$CREATE OR REPLACE FUNCTION extensions.pgp_pub_encrypt(text, bytea, text)\n RETURNS bytea\n LANGUAGE c\n PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pgp_pub_encrypt_text$function$\n$$ LANGUAGE c;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea, text)\nRETURNS bytea\nAS $$CREATE OR REPLACE FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea, text)\n RETURNS bytea\n LANGUAGE c\n PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pgp_pub_encrypt_bytea$function$\n$$ LANGUAGE c;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea)\nRETURNS bytea\nAS $$CREATE OR REPLACE FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea)\n RETURNS bytea\n LANGUAGE c\n PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pgp_pub_encrypt_bytea$function$\n$$ LANGUAGE c;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION extensions.pgp_sym_decrypt(bytea, text)\nRETURNS text\nAS $$CREATE OR REPLACE FUNCTION extensions.pgp_sym_decrypt(bytea, text)\n RETURNS text\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pgp_sym_decrypt_text$function$\n$$ LANGUAGE c;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION extensions.pgp_sym_decrypt(bytea, text, text)\nRETURNS text\nAS $$CREATE OR REPLACE FUNCTION extensions.pgp_sym_decrypt(bytea, text, text)\n RETURNS text\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pgp_sym_decrypt_text$function$\n$$ LANGUAGE c;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text)\nRETURNS bytea\nAS $$CREATE OR REPLACE FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text)\n RETURNS bytea\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pgp_sym_decrypt_bytea$function$\n$$ LANGUAGE c;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text, text)\nRETURNS bytea\nAS $$CREATE OR REPLACE FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text, text)\n RETURNS bytea\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pgp_sym_decrypt_bytea$function$\n$$ LANGUAGE c;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION extensions.pgp_sym_encrypt(text, text)\nRETURNS bytea\nAS $$CREATE OR REPLACE FUNCTION extensions.pgp_sym_encrypt(text, text)\n RETURNS bytea\n LANGUAGE c\n PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pgp_sym_encrypt_text$function$\n$$ LANGUAGE c;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION extensions.pgp_sym_encrypt(text, text, text)\nRETURNS bytea\nAS $$CREATE OR REPLACE FUNCTION extensions.pgp_sym_encrypt(text, text, text)\n RETURNS bytea\n LANGUAGE c\n PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pgp_sym_encrypt_text$function$\n$$ LANGUAGE c;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text)\nRETURNS bytea\nAS $$CREATE OR REPLACE FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text)\n RETURNS bytea\n LANGUAGE c\n PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pgp_sym_encrypt_bytea$function$\n$$ LANGUAGE c;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text, text)\nRETURNS bytea\nAS $$CREATE OR REPLACE FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text, text)\n RETURNS bytea\n LANGUAGE c\n PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pgp_sym_encrypt_bytea$function$\n$$ LANGUAGE c;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION extensions.pgrst_ddl_watch()\nRETURNS event_trigger\nAS $$CREATE OR REPLACE FUNCTION extensions.pgrst_ddl_watch()\n RETURNS event_trigger\n LANGUAGE plpgsql\nAS $function$\nDECLARE\n  cmd record;\nBEGIN\n  FOR cmd IN SELECT * FROM pg_event_trigger_ddl_commands()\n  LOOP\n    IF cmd.command_tag IN (\n      'CREATE SCHEMA', 'ALTER SCHEMA'\n    , 'CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO', 'ALTER TABLE'\n    , 'CREATE FOREIGN TABLE', 'ALTER FOREIGN TABLE'\n    , 'CREATE VIEW', 'ALTER VIEW'\n    , 'CREATE MATERIALIZED VIEW', 'ALTER MATERIALIZED VIEW'\n    , 'CREATE FUNCTION', 'ALTER FUNCTION'\n    , 'CREATE TRIGGER'\n    , 'CREATE TYPE', 'ALTER TYPE'\n    , 'CREATE RULE'\n    , 'COMMENT'\n    )\n    -- don't notify in case of CREATE TEMP table or other objects created on pg_temp\n    AND cmd.schema_name is distinct from 'pg_temp'\n    THEN\n      NOTIFY pgrst, 'reload schema';\n    END IF;\n  END LOOP;\nEND; $function$\n$$ LANGUAGE plpgsql;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION extensions.pgrst_drop_watch()\nRETURNS event_trigger\nAS $$CREATE OR REPLACE FUNCTION extensions.pgrst_drop_watch()\n RETURNS event_trigger\n LANGUAGE plpgsql\nAS $function$\nDECLARE\n  obj record;\nBEGIN\n  FOR obj IN SELECT * FROM pg_event_trigger_dropped_objects()\n  LOOP\n    IF obj.object_type IN (\n      'schema'\n    , 'table'\n    , 'foreign table'\n    , 'view'\n    , 'materialized view'\n    , 'function'\n    , 'trigger'\n    , 'type'\n    , 'rule'\n    )\n    AND obj.is_temporary IS false -- no pg_temp objects\n    THEN\n      NOTIFY pgrst, 'reload schema';\n    END IF;\n  END LOOP;\nEND; $function$\n$$ LANGUAGE plpgsql;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION extensions.set_graphql_placeholder()\nRETURNS event_trigger\nAS $$CREATE OR REPLACE FUNCTION extensions.set_graphql_placeholder()\n RETURNS event_trigger\n LANGUAGE plpgsql\nAS $function$\n    DECLARE\n    graphql_is_dropped bool;\n    BEGIN\n    graphql_is_dropped = (\n        SELECT ev.schema_name = 'graphql_public'\n        FROM pg_event_trigger_dropped_objects() AS ev\n        WHERE ev.schema_name = 'graphql_public'\n    );\n\n    IF graphql_is_dropped\n    THEN\n        create or replace function graphql_public.graphql(\n            \"operationName\" text default null,\n            query text default null,\n            variables jsonb default null,\n            extensions jsonb default null\n        )\n            returns jsonb\n            language plpgsql\n        as $$\n            DECLARE\n                server_version float;\n            BEGIN\n                server_version = (SELECT (SPLIT_PART((select version()), ' ', 2))::float);\n\n                IF server_version >= 14 THEN\n                    RETURN jsonb_build_object(\n                        'errors', jsonb_build_array(\n                            jsonb_build_object(\n                                'message', 'pg_graphql extension is not enabled.'\n                            )\n                        )\n                    );\n                ELSE\n                    RETURN jsonb_build_object(\n                        'errors', jsonb_build_array(\n                            jsonb_build_object(\n                                'message', 'pg_graphql is only available on projects running Postgres 14 onwards.'\n                            )\n                        )\n                    );\n                END IF;\n            END;\n        $$;\n    END IF;\n\n    END;\n$function$\n$$ LANGUAGE plpgsql;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION extensions.uuid_generate_v1()\nRETURNS uuid\nAS $$CREATE OR REPLACE FUNCTION extensions.uuid_generate_v1()\n RETURNS uuid\n LANGUAGE c\n PARALLEL SAFE STRICT\nAS '$libdir/uuid-ossp', $function$uuid_generate_v1$function$\n$$ LANGUAGE c;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION extensions.uuid_generate_v1mc()\nRETURNS uuid\nAS $$CREATE OR REPLACE FUNCTION extensions.uuid_generate_v1mc()\n RETURNS uuid\n LANGUAGE c\n PARALLEL SAFE STRICT\nAS '$libdir/uuid-ossp', $function$uuid_generate_v1mc$function$\n$$ LANGUAGE c;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION extensions.uuid_generate_v3(namespace uuid, name text)\nRETURNS uuid\nAS $$CREATE OR REPLACE FUNCTION extensions.uuid_generate_v3(namespace uuid, name text)\n RETURNS uuid\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/uuid-ossp', $function$uuid_generate_v3$function$\n$$ LANGUAGE c;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION extensions.uuid_generate_v4()\nRETURNS uuid\nAS $$CREATE OR REPLACE FUNCTION extensions.uuid_generate_v4()\n RETURNS uuid\n LANGUAGE c\n PARALLEL SAFE STRICT\nAS '$libdir/uuid-ossp', $function$uuid_generate_v4$function$\n$$ LANGUAGE c;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION extensions.uuid_generate_v5(namespace uuid, name text)\nRETURNS uuid\nAS $$CREATE OR REPLACE FUNCTION extensions.uuid_generate_v5(namespace uuid, name text)\n RETURNS uuid\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/uuid-ossp', $function$uuid_generate_v5$function$\n$$ LANGUAGE c;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION extensions.uuid_nil()\nRETURNS uuid\nAS $$CREATE OR REPLACE FUNCTION extensions.uuid_nil()\n RETURNS uuid\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/uuid-ossp', $function$uuid_nil$function$\n$$ LANGUAGE c;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION extensions.uuid_ns_dns()\nRETURNS uuid\nAS $$CREATE OR REPLACE FUNCTION extensions.uuid_ns_dns()\n RETURNS uuid\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/uuid-ossp', $function$uuid_ns_dns$function$\n$$ LANGUAGE c;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION extensions.uuid_ns_oid()\nRETURNS uuid\nAS $$CREATE OR REPLACE FUNCTION extensions.uuid_ns_oid()\n RETURNS uuid\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/uuid-ossp', $function$uuid_ns_oid$function$\n$$ LANGUAGE c;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION extensions.uuid_ns_url()\nRETURNS uuid\nAS $$CREATE OR REPLACE FUNCTION extensions.uuid_ns_url()\n RETURNS uuid\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/uuid-ossp', $function$uuid_ns_url$function$\n$$ LANGUAGE c;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION extensions.uuid_ns_x500()\nRETURNS uuid\nAS $$CREATE OR REPLACE FUNCTION extensions.uuid_ns_x500()\n RETURNS uuid\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/uuid-ossp', $function$uuid_ns_x500$function$\n$$ LANGUAGE c;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION graphql._internal_resolve(query text, variables jsonb DEFAULT '{}'::jsonb, \"operationName\" text DEFAULT NULL::text, extensions jsonb DEFAULT NULL::jsonb)\nRETURNS jsonb\nAS $$CREATE OR REPLACE FUNCTION graphql._internal_resolve(query text, variables jsonb DEFAULT '{}'::jsonb, \"operationName\" text DEFAULT NULL::text, extensions jsonb DEFAULT NULL::jsonb)\n RETURNS jsonb\n LANGUAGE c\nAS '$libdir/pg_graphql', $function$resolve_wrapper$function$\n$$ LANGUAGE c;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION graphql.comment_directive(comment_ text)\nRETURNS jsonb\nAS $$CREATE OR REPLACE FUNCTION graphql.comment_directive(comment_ text)\n RETURNS jsonb\n LANGUAGE sql\n IMMUTABLE\nAS $function$\n    /*\n    comment on column public.account.name is '@graphql.name: myField'\n    */\n    select\n        coalesce(\n            (\n                regexp_match(\n                    comment_,\n                    '@graphql\\((.+)\\)'\n                )\n            )[1]::jsonb,\n            jsonb_build_object()\n        )\n$function$\n$$ LANGUAGE sql;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION graphql.exception(message text)\nRETURNS text\nAS $$CREATE OR REPLACE FUNCTION graphql.exception(message text)\n RETURNS text\n LANGUAGE plpgsql\nAS $function$\nbegin\n    raise exception using errcode='22000', message=message;\nend;\n$function$\n$$ LANGUAGE plpgsql;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION graphql.get_schema_version()\nRETURNS integer\nAS $$CREATE OR REPLACE FUNCTION graphql.get_schema_version()\n RETURNS integer\n LANGUAGE sql\n SECURITY DEFINER\nAS $function$\n    select last_value from graphql.seq_schema_version;\n$function$\n$$ LANGUAGE sql;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION graphql.increment_schema_version()\nRETURNS event_trigger\nAS $$CREATE OR REPLACE FUNCTION graphql.increment_schema_version()\n RETURNS event_trigger\n LANGUAGE plpgsql\n SECURITY DEFINER\nAS $function$\nbegin\n    perform pg_catalog.nextval('graphql.seq_schema_version');\nend;\n$function$\n$$ LANGUAGE plpgsql;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION graphql.resolve(query text, variables jsonb DEFAULT '{}'::jsonb, \"operationName\" text DEFAULT NULL::text, extensions jsonb DEFAULT NULL::jsonb)\nRETURNS jsonb\nAS $$CREATE OR REPLACE FUNCTION graphql.resolve(query text, variables jsonb DEFAULT '{}'::jsonb, \"operationName\" text DEFAULT NULL::text, extensions jsonb DEFAULT NULL::jsonb)\n RETURNS jsonb\n LANGUAGE plpgsql\nAS $function$\ndeclare\n    res jsonb;\n    message_text text;\nbegin\n  begin\n    select graphql._internal_resolve(\"query\" := \"query\",\n                                     \"variables\" := \"variables\",\n                                     \"operationName\" := \"operationName\",\n                                     \"extensions\" := \"extensions\") into res;\n    return res;\n  exception\n    when others then\n    get stacked diagnostics message_text = message_text;\n    return\n    jsonb_build_object('data', null,\n                       'errors', jsonb_build_array(jsonb_build_object('message', message_text)));\n  end;\nend;\n$function$\n$$ LANGUAGE plpgsql;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION graphql_public.graphql(\"operationName\" text DEFAULT NULL::text, query text DEFAULT NULL::text, variables jsonb DEFAULT NULL::jsonb, extensions jsonb DEFAULT NULL::jsonb)\nRETURNS jsonb\nAS $$CREATE OR REPLACE FUNCTION graphql_public.graphql(\"operationName\" text DEFAULT NULL::text, query text DEFAULT NULL::text, variables jsonb DEFAULT NULL::jsonb, extensions jsonb DEFAULT NULL::jsonb)\n RETURNS jsonb\n LANGUAGE sql\nAS $function$\n            select graphql.resolve(\n                query := query,\n                variables := coalesce(variables, '{}'),\n                \"operationName\" := \"operationName\",\n                extensions := extensions\n            );\n        $function$\n$$ LANGUAGE sql;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION pgbouncer.get_auth(p_usename text)\nRETURNS TABLE(username text, password text)\nAS $$CREATE OR REPLACE FUNCTION pgbouncer.get_auth(p_usename text)\n RETURNS TABLE(username text, password text)\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO ''\nAS $function$\n  BEGIN\n      RAISE DEBUG 'PgBouncer auth request: %', p_usename;\n\n      RETURN QUERY\n      SELECT\n          rolname::text,\n          CASE WHEN rolvaliduntil < now()\n              THEN null\n              ELSE rolpassword::text\n          END\n      FROM pg_authid\n      WHERE rolname=$1 and rolcanlogin;\n  END;\n  $function$\n$$ LANGUAGE plpgsql;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION public.request_user_id()\nRETURNS text\nAS $$CREATE OR REPLACE FUNCTION public.request_user_id()\n RETURNS text\n LANGUAGE sql\n STABLE\nAS $function$\r\n  SELECT auth.jwt() ->> 'sub';\r\n$function$\n$$ LANGUAGE sql;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer DEFAULT (1024 * 1024))\nRETURNS SETOF realtime.wal_rls\nAS $$CREATE OR REPLACE FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer DEFAULT (1024 * 1024))\n RETURNS SETOF realtime.wal_rls\n LANGUAGE plpgsql\nAS $function$\ndeclare\n-- Regclass of the table e.g. public.notes\nentity_ regclass = (quote_ident(wal ->> 'schema') || '.' || quote_ident(wal ->> 'table'))::regclass;\n\n-- I, U, D, T: insert, update ...\naction realtime.action = (\n    case wal ->> 'action'\n        when 'I' then 'INSERT'\n        when 'U' then 'UPDATE'\n        when 'D' then 'DELETE'\n        else 'ERROR'\n    end\n);\n\n-- Is row level security enabled for the table\nis_rls_enabled bool = relrowsecurity from pg_class where oid = entity_;\n\nsubscriptions realtime.subscription[] = array_agg(subs)\n    from\n        realtime.subscription subs\n    where\n        subs.entity = entity_\n        -- Filter by action early - only get subscriptions interested in this action\n        -- action_filter column can be: '*' (all), 'INSERT', 'UPDATE', or 'DELETE'\n        and (subs.action_filter = '*' or subs.action_filter = action::text);\n\n-- Subscription vars\nroles regrole[] = array_agg(distinct us.claims_role::text)\n    from\n        unnest(subscriptions) us;\n\nworking_role regrole;\nclaimed_role regrole;\nclaims jsonb;\n\nsubscription_id uuid;\nsubscription_has_access bool;\nvisible_to_subscription_ids uuid[] = '{}';\n\n-- structured info for wal's columns\ncolumns realtime.wal_column[];\n-- previous identity values for update/delete\nold_columns realtime.wal_column[];\n\nerror_record_exceeds_max_size boolean = octet_length(wal::text) > max_record_bytes;\n\n-- Primary jsonb output for record\noutput jsonb;\n\nbegin\nperform set_config('role', null, true);\n\ncolumns =\n    array_agg(\n        (\n            x->>'name',\n            x->>'type',\n            x->>'typeoid',\n            realtime.cast(\n                (x->'value') #>> '{}',\n                coalesce(\n                    (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4\n                    (x->>'type')::regtype\n                )\n            ),\n            (pks ->> 'name') is not null,\n            true\n        )::realtime.wal_column\n    )\n    from\n        jsonb_array_elements(wal -> 'columns') x\n        left join jsonb_array_elements(wal -> 'pk') pks\n            on (x ->> 'name') = (pks ->> 'name');\n\nold_columns =\n    array_agg(\n        (\n            x->>'name',\n            x->>'type',\n            x->>'typeoid',\n            realtime.cast(\n                (x->'value') #>> '{}',\n                coalesce(\n                    (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4\n                    (x->>'type')::regtype\n                )\n            ),\n            (pks ->> 'name') is not null,\n            true\n        )::realtime.wal_column\n    )\n    from\n        jsonb_array_elements(wal -> 'identity') x\n        left join jsonb_array_elements(wal -> 'pk') pks\n            on (x ->> 'name') = (pks ->> 'name');\n\nfor working_role in select * from unnest(roles) loop\n\n    -- Update `is_selectable` for columns and old_columns\n    columns =\n        array_agg(\n            (\n                c.name,\n                c.type_name,\n                c.type_oid,\n                c.value,\n                c.is_pkey,\n                pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')\n            )::realtime.wal_column\n        )\n        from\n            unnest(columns) c;\n\n    old_columns =\n            array_agg(\n                (\n                    c.name,\n                    c.type_name,\n                    c.type_oid,\n                    c.value,\n                    c.is_pkey,\n                    pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')\n                )::realtime.wal_column\n            )\n            from\n                unnest(old_columns) c;\n\n    if action <> 'DELETE' and count(1) = 0 from unnest(columns) c where c.is_pkey then\n        return next (\n            jsonb_build_object(\n                'schema', wal ->> 'schema',\n                'table', wal ->> 'table',\n                'type', action\n            ),\n            is_rls_enabled,\n            -- subscriptions is already filtered by entity\n            (select array_agg(s.subscription_id) from unnest(subscriptions) as s where claims_role = working_role),\n            array['Error 400: Bad Request, no primary key']\n        )::realtime.wal_rls;\n\n    -- The claims role does not have SELECT permission to the primary key of entity\n    elsif action <> 'DELETE' and sum(c.is_selectable::int) <> count(1) from unnest(columns) c where c.is_pkey then\n        return next (\n            jsonb_build_object(\n                'schema', wal ->> 'schema',\n                'table', wal ->> 'table',\n                'type', action\n            ),\n            is_rls_enabled,\n            (select array_agg(s.subscription_id) from unnest(subscriptions) as s where claims_role = working_role),\n            array['Error 401: Unauthorized']\n        )::realtime.wal_rls;\n\n    else\n        output = jsonb_build_object(\n            'schema', wal ->> 'schema',\n            'table', wal ->> 'table',\n            'type', action,\n            'commit_timestamp', to_char(\n                ((wal ->> 'timestamp')::timestamptz at time zone 'utc'),\n                'YYYY-MM-DD\"T\"HH24:MI:SS.MS\"Z\"'\n            ),\n            'columns', (\n                select\n                    jsonb_agg(\n                        jsonb_build_object(\n                            'name', pa.attname,\n                            'type', pt.typname\n                        )\n                        order by pa.attnum asc\n                    )\n                from\n                    pg_attribute pa\n                    join pg_type pt\n                        on pa.atttypid = pt.oid\n                where\n                    attrelid = entity_\n                    and attnum > 0\n                    and pg_catalog.has_column_privilege(working_role, entity_, pa.attname, 'SELECT')\n            )\n        )\n        -- Add \"record\" key for insert and update\n        || case\n            when action in ('INSERT', 'UPDATE') then\n                jsonb_build_object(\n                    'record',\n                    (\n                        select\n                            jsonb_object_agg(\n                                -- if unchanged toast, get column name and value from old record\n                                coalesce((c).name, (oc).name),\n                                case\n                                    when (c).name is null then (oc).value\n                                    else (c).value\n                                end\n                            )\n                        from\n                            unnest(columns) c\n                            full outer join unnest(old_columns) oc\n                                on (c).name = (oc).name\n                        where\n                            coalesce((c).is_selectable, (oc).is_selectable)\n                            and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))\n                    )\n                )\n            else '{}'::jsonb\n        end\n        -- Add \"old_record\" key for update and delete\n        || case\n            when action = 'UPDATE' then\n                jsonb_build_object(\n                        'old_record',\n                        (\n                            select jsonb_object_agg((c).name, (c).value)\n                            from unnest(old_columns) c\n                            where\n                                (c).is_selectable\n                                and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))\n                        )\n                    )\n            when action = 'DELETE' then\n                jsonb_build_object(\n                    'old_record',\n                    (\n                        select jsonb_object_agg((c).name, (c).value)\n                        from unnest(old_columns) c\n                        where\n                            (c).is_selectable\n                            and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))\n                            and ( not is_rls_enabled or (c).is_pkey ) -- if RLS enabled, we can't secure deletes so filter to pkey\n                    )\n                )\n            else '{}'::jsonb\n        end;\n\n        -- Create the prepared statement\n        if is_rls_enabled and action <> 'DELETE' then\n            if (select 1 from pg_prepared_statements where name = 'walrus_rls_stmt' limit 1) > 0 then\n                deallocate walrus_rls_stmt;\n            end if;\n            execute realtime.build_prepared_statement_sql('walrus_rls_stmt', entity_, columns);\n        end if;\n\n        visible_to_subscription_ids = '{}';\n\n        for subscription_id, claims in (\n                select\n                    subs.subscription_id,\n                    subs.claims\n                from\n                    unnest(subscriptions) subs\n                where\n                    subs.entity = entity_\n                    and subs.claims_role = working_role\n                    and (\n                        realtime.is_visible_through_filters(columns, subs.filters)\n                        or (\n                          action = 'DELETE'\n                          and realtime.is_visible_through_filters(old_columns, subs.filters)\n                        )\n                    )\n        ) loop\n\n            if not is_rls_enabled or action = 'DELETE' then\n                visible_to_subscription_ids = visible_to_subscription_ids || subscription_id;\n            else\n                -- Check if RLS allows the role to see the record\n                perform\n                    -- Trim leading and trailing quotes from working_role because set_config\n                    -- doesn't recognize the role as valid if they are included\n                    set_config('role', trim(both '\"' from working_role::text), true),\n                    set_config('request.jwt.claims', claims::text, true);\n\n                execute 'execute walrus_rls_stmt' into subscription_has_access;\n\n                if subscription_has_access then\n                    visible_to_subscription_ids = visible_to_subscription_ids || subscription_id;\n                end if;\n            end if;\n        end loop;\n\n        perform set_config('role', null, true);\n\n        return next (\n            output,\n            is_rls_enabled,\n            visible_to_subscription_ids,\n            case\n                when error_record_exceeds_max_size then array['Error 413: Payload Too Large']\n                else '{}'\n            end\n        )::realtime.wal_rls;\n\n    end if;\nend loop;\n\nperform set_config('role', null, true);\nend;\n$function$\n$$ LANGUAGE plpgsql;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text DEFAULT 'ROW'::text)\nRETURNS void\nAS $$CREATE OR REPLACE FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text DEFAULT 'ROW'::text)\n RETURNS void\n LANGUAGE plpgsql\nAS $function$\nDECLARE\n    -- Declare a variable to hold the JSONB representation of the row\n    row_data jsonb := '{}'::jsonb;\nBEGIN\n    IF level = 'STATEMENT' THEN\n        RAISE EXCEPTION 'function can only be triggered for each row, not for each statement';\n    END IF;\n    -- Check the operation type and handle accordingly\n    IF operation = 'INSERT' OR operation = 'UPDATE' OR operation = 'DELETE' THEN\n        row_data := jsonb_build_object('old_record', OLD, 'record', NEW, 'operation', operation, 'table', table_name, 'schema', table_schema);\n        PERFORM realtime.send (row_data, event_name, topic_name);\n    ELSE\n        RAISE EXCEPTION 'Unexpected operation type: %', operation;\n    END IF;\nEXCEPTION\n    WHEN OTHERS THEN\n        RAISE EXCEPTION 'Failed to process the row: %', SQLERRM;\nEND;\n\n$function$\n$$ LANGUAGE plpgsql;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[])\nRETURNS text\nAS $$CREATE OR REPLACE FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[])\n RETURNS text\n LANGUAGE sql\nAS $function$\n      /*\n      Builds a sql string that, if executed, creates a prepared statement to\n      tests retrive a row from *entity* by its primary key columns.\n      Example\n          select realtime.build_prepared_statement_sql('public.notes', '{\"id\"}'::text[], '{\"bigint\"}'::text[])\n      */\n          select\n      'prepare ' || prepared_statement_name || ' as\n          select\n              exists(\n                  select\n                      1\n                  from\n                      ' || entity || '\n                  where\n                      ' || string_agg(quote_ident(pkc.name) || '=' || quote_nullable(pkc.value #>> '{}') , ' and ') || '\n              )'\n          from\n              unnest(columns) pkc\n          where\n              pkc.is_pkey\n          group by\n              entity\n      $function$\n$$ LANGUAGE sql;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION realtime.cast(val text, type_ regtype)\nRETURNS jsonb\nAS $$CREATE OR REPLACE FUNCTION realtime.\"cast\"(val text, type_ regtype)\n RETURNS jsonb\n LANGUAGE plpgsql\n IMMUTABLE\nAS $function$\n    declare\n      res jsonb;\n    begin\n      execute format('select to_jsonb(%L::'|| type_::text || ')', val)  into res;\n      return res;\n    end\n    $function$\n$$ LANGUAGE plpgsql;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text)\nRETURNS boolean\nAS $$CREATE OR REPLACE FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text)\n RETURNS boolean\n LANGUAGE plpgsql\n IMMUTABLE\nAS $function$\n      /*\n      Casts *val_1* and *val_2* as type *type_* and check the *op* condition for truthiness\n      */\n      declare\n          op_symbol text = (\n              case\n                  when op = 'eq' then '='\n                  when op = 'neq' then '!='\n                  when op = 'lt' then '<'\n                  when op = 'lte' then '<='\n                  when op = 'gt' then '>'\n                  when op = 'gte' then '>='\n                  when op = 'in' then '= any'\n                  else 'UNKNOWN OP'\n              end\n          );\n          res boolean;\n      begin\n          execute format(\n              'select %L::'|| type_::text || ' ' || op_symbol\n              || ' ( %L::'\n              || (\n                  case\n                      when op = 'in' then type_::text || '[]'\n                      else type_::text end\n              )\n              || ')', val_1, val_2) into res;\n          return res;\n      end;\n      $function$\n$$ LANGUAGE plpgsql;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[])\nRETURNS boolean\nAS $$CREATE OR REPLACE FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[])\n RETURNS boolean\n LANGUAGE sql\n IMMUTABLE\nAS $function$\n    /*\n    Should the record be visible (true) or filtered out (false) after *filters* are applied\n    */\n        select\n            -- Default to allowed when no filters present\n            $2 is null -- no filters. this should not happen because subscriptions has a default\n            or array_length($2, 1) is null -- array length of an empty array is null\n            or bool_and(\n                coalesce(\n                    realtime.check_equality_op(\n                        op:=f.op,\n                        type_:=coalesce(\n                            col.type_oid::regtype, -- null when wal2json version <= 2.4\n                            col.type_name::regtype\n                        ),\n                        -- cast jsonb to text\n                        val_1:=col.value #>> '{}',\n                        val_2:=f.value\n                    ),\n                    false -- if null, filter does not match\n                )\n            )\n        from\n            unnest(filters) f\n            join unnest(columns) col\n                on f.column_name = col.name;\n    $function$\n$$ LANGUAGE sql;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer)\nRETURNS SETOF realtime.wal_rls\nAS $$CREATE OR REPLACE FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer)\n RETURNS SETOF realtime.wal_rls\n LANGUAGE sql\n SET log_min_messages TO 'fatal'\nAS $function$\n      with pub as (\n        select\n          concat_ws(\n            ',',\n            case when bool_or(pubinsert) then 'insert' else null end,\n            case when bool_or(pubupdate) then 'update' else null end,\n            case when bool_or(pubdelete) then 'delete' else null end\n          ) as w2j_actions,\n          coalesce(\n            string_agg(\n              realtime.quote_wal2json(format('%I.%I', schemaname, tablename)::regclass),\n              ','\n            ) filter (where ppt.tablename is not null and ppt.tablename not like '% %'),\n            ''\n          ) w2j_add_tables\n        from\n          pg_publication pp\n          left join pg_publication_tables ppt\n            on pp.pubname = ppt.pubname\n        where\n          pp.pubname = publication\n        group by\n          pp.pubname\n        limit 1\n      ),\n      w2j as (\n        select\n          x.*, pub.w2j_add_tables\n        from\n          pub,\n          pg_logical_slot_get_changes(\n            slot_name, null, max_changes,\n            'include-pk', 'true',\n            'include-transaction', 'false',\n            'include-timestamp', 'true',\n            'include-type-oids', 'true',\n            'format-version', '2',\n            'actions', pub.w2j_actions,\n            'add-tables', pub.w2j_add_tables\n          ) x\n      )\n      select\n        xyz.wal,\n        xyz.is_rls_enabled,\n        xyz.subscription_ids,\n        xyz.errors\n      from\n        w2j,\n        realtime.apply_rls(\n          wal := w2j.data::jsonb,\n          max_record_bytes := max_record_bytes\n        ) xyz(wal, is_rls_enabled, subscription_ids, errors)\n      where\n        w2j.w2j_add_tables <> ''\n        and xyz.subscription_ids[1] is not null\n    $function$\n$$ LANGUAGE sql;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION realtime.quote_wal2json(entity regclass)\nRETURNS text\nAS $$CREATE OR REPLACE FUNCTION realtime.quote_wal2json(entity regclass)\n RETURNS text\n LANGUAGE sql\n IMMUTABLE STRICT\nAS $function$\n      select\n        (\n          select string_agg('' || ch,'')\n          from unnest(string_to_array(nsp.nspname::text, null)) with ordinality x(ch, idx)\n          where\n            not (x.idx = 1 and x.ch = '\"')\n            and not (\n              x.idx = array_length(string_to_array(nsp.nspname::text, null), 1)\n              and x.ch = '\"'\n            )\n        )\n        || '.'\n        || (\n          select string_agg('' || ch,'')\n          from unnest(string_to_array(pc.relname::text, null)) with ordinality x(ch, idx)\n          where\n            not (x.idx = 1 and x.ch = '\"')\n            and not (\n              x.idx = array_length(string_to_array(nsp.nspname::text, null), 1)\n              and x.ch = '\"'\n            )\n          )\n      from\n        pg_class pc\n        join pg_namespace nsp\n          on pc.relnamespace = nsp.oid\n      where\n        pc.oid = entity\n    $function$\n$$ LANGUAGE sql;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean DEFAULT true)\nRETURNS void\nAS $$CREATE OR REPLACE FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean DEFAULT true)\n RETURNS void\n LANGUAGE plpgsql\nAS $function$\nDECLARE\n  generated_id uuid;\n  final_payload jsonb;\nBEGIN\n  BEGIN\n    -- Generate a new UUID for the id\n    generated_id := gen_random_uuid();\n\n    -- Check if payload has an 'id' key, if not, add the generated UUID\n    IF payload ? 'id' THEN\n      final_payload := payload;\n    ELSE\n      final_payload := jsonb_set(payload, '{id}', to_jsonb(generated_id));\n    END IF;\n\n    -- Set the topic configuration\n    EXECUTE format('SET LOCAL realtime.topic TO %L', topic);\n\n    -- Attempt to insert the message\n    INSERT INTO realtime.messages (id, payload, event, topic, private, extension)\n    VALUES (generated_id, final_payload, event, topic, private, 'broadcast');\n  EXCEPTION\n    WHEN OTHERS THEN\n      -- Capture and notify the error\n      RAISE WARNING 'ErrorSendingBroadcastMessage: %', SQLERRM;\n  END;\nEND;\n$function$\n$$ LANGUAGE plpgsql;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION realtime.subscription_check_filters()\nRETURNS trigger\nAS $$CREATE OR REPLACE FUNCTION realtime.subscription_check_filters()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\n    /*\n    Validates that the user defined filters for a subscription:\n    - refer to valid columns that the claimed role may access\n    - values are coercable to the correct column type\n    */\n    declare\n        col_names text[] = coalesce(\n                array_agg(c.column_name order by c.ordinal_position),\n                '{}'::text[]\n            )\n            from\n                information_schema.columns c\n            where\n                format('%I.%I', c.table_schema, c.table_name)::regclass = new.entity\n                and pg_catalog.has_column_privilege(\n                    (new.claims ->> 'role'),\n                    format('%I.%I', c.table_schema, c.table_name)::regclass,\n                    c.column_name,\n                    'SELECT'\n                );\n        filter realtime.user_defined_filter;\n        col_type regtype;\n\n        in_val jsonb;\n    begin\n        for filter in select * from unnest(new.filters) loop\n            -- Filtered column is valid\n            if not filter.column_name = any(col_names) then\n                raise exception 'invalid column for filter %', filter.column_name;\n            end if;\n\n            -- Type is sanitized and safe for string interpolation\n            col_type = (\n                select atttypid::regtype\n                from pg_catalog.pg_attribute\n                where attrelid = new.entity\n                      and attname = filter.column_name\n            );\n            if col_type is null then\n                raise exception 'failed to lookup type for column %', filter.column_name;\n            end if;\n\n            -- Set maximum number of entries for in filter\n            if filter.op = 'in'::realtime.equality_op then\n                in_val = realtime.cast(filter.value, (col_type::text || '[]')::regtype);\n                if coalesce(jsonb_array_length(in_val), 0) > 100 then\n                    raise exception 'too many values for `in` filter. Maximum 100';\n                end if;\n            else\n                -- raises an exception if value is not coercable to type\n                perform realtime.cast(filter.value, col_type);\n            end if;\n\n        end loop;\n\n        -- Apply consistent order to filters so the unique constraint on\n        -- (subscription_id, entity, filters) can't be tricked by a different filter order\n        new.filters = coalesce(\n            array_agg(f order by f.column_name, f.op, f.value),\n            '{}'\n        ) from unnest(new.filters) f;\n\n        return new;\n    end;\n    $function$\n$$ LANGUAGE plpgsql;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION realtime.to_regrole(role_name text)\nRETURNS regrole\nAS $$CREATE OR REPLACE FUNCTION realtime.to_regrole(role_name text)\n RETURNS regrole\n LANGUAGE sql\n IMMUTABLE\nAS $function$ select role_name::regrole $function$\n$$ LANGUAGE sql;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION realtime.topic()\nRETURNS text\nAS $$CREATE OR REPLACE FUNCTION realtime.topic()\n RETURNS text\n LANGUAGE sql\n STABLE\nAS $function$\nselect nullif(current_setting('realtime.topic', true), '')::text;\n$function$\n$$ LANGUAGE sql;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION storage.can_insert_object(bucketid text, name text, owner uuid, metadata jsonb)\nRETURNS void\nAS $$CREATE OR REPLACE FUNCTION storage.can_insert_object(bucketid text, name text, owner uuid, metadata jsonb)\n RETURNS void\n LANGUAGE plpgsql\nAS $function$\nBEGIN\n  INSERT INTO \"storage\".\"objects\" (\"bucket_id\", \"name\", \"owner\", \"metadata\") VALUES (bucketid, name, owner, metadata);\n  -- hack to rollback the successful insert\n  RAISE sqlstate 'PT200' using\n  message = 'ROLLBACK',\n  detail = 'rollback successful insert';\nEND\n$function$\n$$ LANGUAGE plpgsql;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION storage.delete_leaf_prefixes(bucket_ids text[], names text[])\nRETURNS void\nAS $$CREATE OR REPLACE FUNCTION storage.delete_leaf_prefixes(bucket_ids text[], names text[])\n RETURNS void\n LANGUAGE plpgsql\n SECURITY DEFINER\nAS $function$\nDECLARE\n    v_rows_deleted integer;\nBEGIN\n    LOOP\n        WITH candidates AS (\n            SELECT DISTINCT\n                t.bucket_id,\n                unnest(storage.get_prefixes(t.name)) AS name\n            FROM unnest(bucket_ids, names) AS t(bucket_id, name)\n        ),\n        uniq AS (\n             SELECT\n                 bucket_id,\n                 name,\n                 storage.get_level(name) AS level\n             FROM candidates\n             WHERE name <> ''\n             GROUP BY bucket_id, name\n        ),\n        leaf AS (\n             SELECT\n                 p.bucket_id,\n                 p.name,\n                 p.level\n             FROM storage.prefixes AS p\n                  JOIN uniq AS u\n                       ON u.bucket_id = p.bucket_id\n                           AND u.name = p.name\n                           AND u.level = p.level\n             WHERE NOT EXISTS (\n                 SELECT 1\n                 FROM storage.objects AS o\n                 WHERE o.bucket_id = p.bucket_id\n                   AND o.level = p.level + 1\n                   AND o.name COLLATE \"C\" LIKE p.name || '/%'\n             )\n             AND NOT EXISTS (\n                 SELECT 1\n                 FROM storage.prefixes AS c\n                 WHERE c.bucket_id = p.bucket_id\n                   AND c.level = p.level + 1\n                   AND c.name COLLATE \"C\" LIKE p.name || '/%'\n             )\n        )\n        DELETE\n        FROM storage.prefixes AS p\n            USING leaf AS l\n        WHERE p.bucket_id = l.bucket_id\n          AND p.name = l.name\n          AND p.level = l.level;\n\n        GET DIAGNOSTICS v_rows_deleted = ROW_COUNT;\n        EXIT WHEN v_rows_deleted = 0;\n    END LOOP;\nEND;\n$function$\n$$ LANGUAGE plpgsql;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION storage.enforce_bucket_name_length()\nRETURNS trigger\nAS $$CREATE OR REPLACE FUNCTION storage.enforce_bucket_name_length()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\nbegin\n    if length(new.name) > 100 then\n        raise exception 'bucket name \"%\" is too long (% characters). Max is 100.', new.name, length(new.name);\n    end if;\n    return new;\nend;\n$function$\n$$ LANGUAGE plpgsql;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION storage.extension(name text)\nRETURNS text\nAS $$CREATE OR REPLACE FUNCTION storage.extension(name text)\n RETURNS text\n LANGUAGE plpgsql\n IMMUTABLE\nAS $function$\nDECLARE\n    _parts text[];\n    _filename text;\nBEGIN\n    SELECT string_to_array(name, '/') INTO _parts;\n    SELECT _parts[array_length(_parts,1)] INTO _filename;\n    RETURN reverse(split_part(reverse(_filename), '.', 1));\nEND\n$function$\n$$ LANGUAGE plpgsql;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION storage.filename(name text)\nRETURNS text\nAS $$CREATE OR REPLACE FUNCTION storage.filename(name text)\n RETURNS text\n LANGUAGE plpgsql\nAS $function$\nDECLARE\n_parts text[];\nBEGIN\n\tselect string_to_array(name, '/') into _parts;\n\treturn _parts[array_length(_parts,1)];\nEND\n$function$\n$$ LANGUAGE plpgsql;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION storage.foldername(name text)\nRETURNS text[]\nAS $$CREATE OR REPLACE FUNCTION storage.foldername(name text)\n RETURNS text[]\n LANGUAGE plpgsql\n IMMUTABLE\nAS $function$\nDECLARE\n    _parts text[];\nBEGIN\n    -- Split on \"/\" to get path segments\n    SELECT string_to_array(name, '/') INTO _parts;\n    -- Return everything except the last segment\n    RETURN _parts[1 : array_length(_parts,1) - 1];\nEND\n$function$\n$$ LANGUAGE plpgsql;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION storage.get_common_prefix(p_key text, p_prefix text, p_delimiter text)\nRETURNS text\nAS $$CREATE OR REPLACE FUNCTION storage.get_common_prefix(p_key text, p_prefix text, p_delimiter text)\n RETURNS text\n LANGUAGE sql\n IMMUTABLE\nAS $function$\nSELECT CASE\n    WHEN position(p_delimiter IN substring(p_key FROM length(p_prefix) + 1)) > 0\n    THEN left(p_key, length(p_prefix) + position(p_delimiter IN substring(p_key FROM length(p_prefix) + 1)))\n    ELSE NULL\nEND;\n$function$\n$$ LANGUAGE sql;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION storage.get_level(name text)\nRETURNS integer\nAS $$CREATE OR REPLACE FUNCTION storage.get_level(name text)\n RETURNS integer\n LANGUAGE sql\n IMMUTABLE STRICT\nAS $function$\nSELECT array_length(string_to_array(\"name\", '/'), 1);\n$function$\n$$ LANGUAGE sql;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION storage.get_prefix(name text)\nRETURNS text\nAS $$CREATE OR REPLACE FUNCTION storage.get_prefix(name text)\n RETURNS text\n LANGUAGE sql\n IMMUTABLE STRICT\nAS $function$\nSELECT\n    CASE WHEN strpos(\"name\", '/') > 0 THEN\n             regexp_replace(\"name\", '[\\/]{1}[^\\/]+\\/?$', '')\n         ELSE\n             ''\n        END;\n$function$\n$$ LANGUAGE sql;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION storage.get_prefixes(name text)\nRETURNS text[]\nAS $$CREATE OR REPLACE FUNCTION storage.get_prefixes(name text)\n RETURNS text[]\n LANGUAGE plpgsql\n IMMUTABLE STRICT\nAS $function$\nDECLARE\n    parts text[];\n    prefixes text[];\n    prefix text;\nBEGIN\n    -- Split the name into parts by '/'\n    parts := string_to_array(\"name\", '/');\n    prefixes := '{}';\n\n    -- Construct the prefixes, stopping one level below the last part\n    FOR i IN 1..array_length(parts, 1) - 1 LOOP\n            prefix := array_to_string(parts[1:i], '/');\n            prefixes := array_append(prefixes, prefix);\n    END LOOP;\n\n    RETURN prefixes;\nEND;\n$function$\n$$ LANGUAGE plpgsql;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION storage.get_size_by_bucket()\nRETURNS TABLE(size bigint, bucket_id text)\nAS $$CREATE OR REPLACE FUNCTION storage.get_size_by_bucket()\n RETURNS TABLE(size bigint, bucket_id text)\n LANGUAGE plpgsql\n STABLE\nAS $function$\nBEGIN\n    return query\n        select sum((metadata->>'size')::bigint) as size, obj.bucket_id\n        from \"storage\".objects as obj\n        group by obj.bucket_id;\nEND\n$function$\n$$ LANGUAGE plpgsql;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION storage.list_multipart_uploads_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, next_key_token text DEFAULT ''::text, next_upload_token text DEFAULT ''::text)\nRETURNS TABLE(key text, id text, created_at timestamp with time zone)\nAS $$CREATE OR REPLACE FUNCTION storage.list_multipart_uploads_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, next_key_token text DEFAULT ''::text, next_upload_token text DEFAULT ''::text)\n RETURNS TABLE(key text, id text, created_at timestamp with time zone)\n LANGUAGE plpgsql\nAS $function$\nBEGIN\n    RETURN QUERY EXECUTE\n        'SELECT DISTINCT ON(key COLLATE \"C\") * from (\n            SELECT\n                CASE\n                    WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN\n                        substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1)))\n                    ELSE\n                        key\n                END AS key, id, created_at\n            FROM\n                storage.s3_multipart_uploads\n            WHERE\n                bucket_id = $5 AND\n                key ILIKE $1 || ''%'' AND\n                CASE\n                    WHEN $4 != '''' AND $6 = '''' THEN\n                        CASE\n                            WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN\n                                substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1))) COLLATE \"C\" > $4\n                            ELSE\n                                key COLLATE \"C\" > $4\n                            END\n                    ELSE\n                        true\n                END AND\n                CASE\n                    WHEN $6 != '''' THEN\n                        id COLLATE \"C\" > $6\n                    ELSE\n                        true\n                    END\n            ORDER BY\n                key COLLATE \"C\" ASC, created_at ASC) as e order by key COLLATE \"C\" LIMIT $3'\n        USING prefix_param, delimiter_param, max_keys, next_key_token, bucket_id, next_upload_token;\nEND;\n$function$\n$$ LANGUAGE plpgsql;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION storage.list_objects_with_delimiter(_bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, start_after text DEFAULT ''::text, next_token text DEFAULT ''::text, sort_order text DEFAULT 'asc'::text)\nRETURNS TABLE(name text, id uuid, metadata jsonb, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone)\nAS $$CREATE OR REPLACE FUNCTION storage.list_objects_with_delimiter(_bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, start_after text DEFAULT ''::text, next_token text DEFAULT ''::text, sort_order text DEFAULT 'asc'::text)\n RETURNS TABLE(name text, id uuid, metadata jsonb, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone)\n LANGUAGE plpgsql\n STABLE\nAS $function$\nDECLARE\n    v_peek_name TEXT;\n    v_current RECORD;\n    v_common_prefix TEXT;\n\n    -- Configuration\n    v_is_asc BOOLEAN;\n    v_prefix TEXT;\n    v_start TEXT;\n    v_upper_bound TEXT;\n    v_file_batch_size INT;\n\n    -- Seek state\n    v_next_seek TEXT;\n    v_count INT := 0;\n\n    -- Dynamic SQL for batch query only\n    v_batch_query TEXT;\n\nBEGIN\n    -- ========================================================================\n    -- INITIALIZATION\n    -- ========================================================================\n    v_is_asc := lower(coalesce(sort_order, 'asc')) = 'asc';\n    v_prefix := coalesce(prefix_param, '');\n    v_start := CASE WHEN coalesce(next_token, '') <> '' THEN next_token ELSE coalesce(start_after, '') END;\n    v_file_batch_size := LEAST(GREATEST(max_keys * 2, 100), 1000);\n\n    -- Calculate upper bound for prefix filtering (bytewise, using COLLATE \"C\")\n    IF v_prefix = '' THEN\n        v_upper_bound := NULL;\n    ELSIF right(v_prefix, 1) = delimiter_param THEN\n        v_upper_bound := left(v_prefix, -1) || chr(ascii(delimiter_param) + 1);\n    ELSE\n        v_upper_bound := left(v_prefix, -1) || chr(ascii(right(v_prefix, 1)) + 1);\n    END IF;\n\n    -- Build batch query (dynamic SQL - called infrequently, amortized over many rows)\n    IF v_is_asc THEN\n        IF v_upper_bound IS NOT NULL THEN\n            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||\n                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE \"C\" >= $2 ' ||\n                'AND o.name COLLATE \"C\" < $3 ORDER BY o.name COLLATE \"C\" ASC LIMIT $4';\n        ELSE\n            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||\n                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE \"C\" >= $2 ' ||\n                'ORDER BY o.name COLLATE \"C\" ASC LIMIT $4';\n        END IF;\n    ELSE\n        IF v_upper_bound IS NOT NULL THEN\n            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||\n                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE \"C\" < $2 ' ||\n                'AND o.name COLLATE \"C\" >= $3 ORDER BY o.name COLLATE \"C\" DESC LIMIT $4';\n        ELSE\n            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||\n                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE \"C\" < $2 ' ||\n                'ORDER BY o.name COLLATE \"C\" DESC LIMIT $4';\n        END IF;\n    END IF;\n\n    -- ========================================================================\n    -- SEEK INITIALIZATION: Determine starting position\n    -- ========================================================================\n    IF v_start = '' THEN\n        IF v_is_asc THEN\n            v_next_seek := v_prefix;\n        ELSE\n            -- DESC without cursor: find the last item in range\n            IF v_upper_bound IS NOT NULL THEN\n                SELECT o.name INTO v_next_seek FROM storage.objects o\n                WHERE o.bucket_id = _bucket_id AND o.name COLLATE \"C\" >= v_prefix AND o.name COLLATE \"C\" < v_upper_bound\n                ORDER BY o.name COLLATE \"C\" DESC LIMIT 1;\n            ELSIF v_prefix <> '' THEN\n                SELECT o.name INTO v_next_seek FROM storage.objects o\n                WHERE o.bucket_id = _bucket_id AND o.name COLLATE \"C\" >= v_prefix\n                ORDER BY o.name COLLATE \"C\" DESC LIMIT 1;\n            ELSE\n                SELECT o.name INTO v_next_seek FROM storage.objects o\n                WHERE o.bucket_id = _bucket_id\n                ORDER BY o.name COLLATE \"C\" DESC LIMIT 1;\n            END IF;\n\n            IF v_next_seek IS NOT NULL THEN\n                v_next_seek := v_next_seek || delimiter_param;\n            ELSE\n                RETURN;\n            END IF;\n        END IF;\n    ELSE\n        -- Cursor provided: determine if it refers to a folder or leaf\n        IF EXISTS (\n            SELECT 1 FROM storage.objects o\n            WHERE o.bucket_id = _bucket_id\n              AND o.name COLLATE \"C\" LIKE v_start || delimiter_param || '%'\n            LIMIT 1\n        ) THEN\n            -- Cursor refers to a folder\n            IF v_is_asc THEN\n                v_next_seek := v_start || chr(ascii(delimiter_param) + 1);\n            ELSE\n                v_next_seek := v_start || delimiter_param;\n            END IF;\n        ELSE\n            -- Cursor refers to a leaf object\n            IF v_is_asc THEN\n                v_next_seek := v_start || delimiter_param;\n            ELSE\n                v_next_seek := v_start;\n            END IF;\n        END IF;\n    END IF;\n\n    -- ========================================================================\n    -- MAIN LOOP: Hybrid peek-then-batch algorithm\n    -- Uses STATIC SQL for peek (hot path) and DYNAMIC SQL for batch\n    -- ========================================================================\n    LOOP\n        EXIT WHEN v_count >= max_keys;\n\n        -- STEP 1: PEEK using STATIC SQL (plan cached, very fast)\n        IF v_is_asc THEN\n            IF v_upper_bound IS NOT NULL THEN\n                SELECT o.name INTO v_peek_name FROM storage.objects o\n                WHERE o.bucket_id = _bucket_id AND o.name COLLATE \"C\" >= v_next_seek AND o.name COLLATE \"C\" < v_upper_bound\n                ORDER BY o.name COLLATE \"C\" ASC LIMIT 1;\n            ELSE\n                SELECT o.name INTO v_peek_name FROM storage.objects o\n                WHERE o.bucket_id = _bucket_id AND o.name COLLATE \"C\" >= v_next_seek\n                ORDER BY o.name COLLATE \"C\" ASC LIMIT 1;\n            END IF;\n        ELSE\n            IF v_upper_bound IS NOT NULL THEN\n                SELECT o.name INTO v_peek_name FROM storage.objects o\n                WHERE o.bucket_id = _bucket_id AND o.name COLLATE \"C\" < v_next_seek AND o.name COLLATE \"C\" >= v_prefix\n                ORDER BY o.name COLLATE \"C\" DESC LIMIT 1;\n            ELSIF v_prefix <> '' THEN\n                SELECT o.name INTO v_peek_name FROM storage.objects o\n                WHERE o.bucket_id = _bucket_id AND o.name COLLATE \"C\" < v_next_seek AND o.name COLLATE \"C\" >= v_prefix\n                ORDER BY o.name COLLATE \"C\" DESC LIMIT 1;\n            ELSE\n                SELECT o.name INTO v_peek_name FROM storage.objects o\n                WHERE o.bucket_id = _bucket_id AND o.name COLLATE \"C\" < v_next_seek\n                ORDER BY o.name COLLATE \"C\" DESC LIMIT 1;\n            END IF;\n        END IF;\n\n        EXIT WHEN v_peek_name IS NULL;\n\n        -- STEP 2: Check if this is a FOLDER or FILE\n        v_common_prefix := storage.get_common_prefix(v_peek_name, v_prefix, delimiter_param);\n\n        IF v_common_prefix IS NOT NULL THEN\n            -- FOLDER: Emit and skip to next folder (no heap access needed)\n            name := rtrim(v_common_prefix, delimiter_param);\n            id := NULL;\n            updated_at := NULL;\n            created_at := NULL;\n            last_accessed_at := NULL;\n            metadata := NULL;\n            RETURN NEXT;\n            v_count := v_count + 1;\n\n            -- Advance seek past the folder range\n            IF v_is_asc THEN\n                v_next_seek := left(v_common_prefix, -1) || chr(ascii(delimiter_param) + 1);\n            ELSE\n                v_next_seek := v_common_prefix;\n            END IF;\n        ELSE\n            -- FILE: Batch fetch using DYNAMIC SQL (overhead amortized over many rows)\n            -- For ASC: upper_bound is the exclusive upper limit (< condition)\n            -- For DESC: prefix is the inclusive lower limit (>= condition)\n            FOR v_current IN EXECUTE v_batch_query USING _bucket_id, v_next_seek,\n                CASE WHEN v_is_asc THEN COALESCE(v_upper_bound, v_prefix) ELSE v_prefix END, v_file_batch_size\n            LOOP\n                v_common_prefix := storage.get_common_prefix(v_current.name, v_prefix, delimiter_param);\n\n                IF v_common_prefix IS NOT NULL THEN\n                    -- Hit a folder: exit batch, let peek handle it\n                    v_next_seek := v_current.name;\n                    EXIT;\n                END IF;\n\n                -- Emit file\n                name := v_current.name;\n                id := v_current.id;\n                updated_at := v_current.updated_at;\n                created_at := v_current.created_at;\n                last_accessed_at := v_current.last_accessed_at;\n                metadata := v_current.metadata;\n                RETURN NEXT;\n                v_count := v_count + 1;\n\n                -- Advance seek past this file\n                IF v_is_asc THEN\n                    v_next_seek := v_current.name || delimiter_param;\n                ELSE\n                    v_next_seek := v_current.name;\n                END IF;\n\n                EXIT WHEN v_count >= max_keys;\n            END LOOP;\n        END IF;\n    END LOOP;\nEND;\n$function$\n$$ LANGUAGE plpgsql;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION storage.operation()\nRETURNS text\nAS $$CREATE OR REPLACE FUNCTION storage.operation()\n RETURNS text\n LANGUAGE plpgsql\n STABLE\nAS $function$\nBEGIN\n    RETURN current_setting('storage.operation', true);\nEND;\n$function$\n$$ LANGUAGE plpgsql;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION storage.protect_delete()\nRETURNS trigger\nAS $$CREATE OR REPLACE FUNCTION storage.protect_delete()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\nBEGIN\n    -- Check if storage.allow_delete_query is set to 'true'\n    IF COALESCE(current_setting('storage.allow_delete_query', true), 'false') != 'true' THEN\n        RAISE EXCEPTION 'Direct deletion from storage tables is not allowed. Use the Storage API instead.'\n            USING HINT = 'This prevents accidental data loss from orphaned objects.',\n                  ERRCODE = '42501';\n    END IF;\n    RETURN NULL;\nEND;\n$function$\n$$ LANGUAGE plpgsql;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION storage.search(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text)\nRETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)\nAS $$CREATE OR REPLACE FUNCTION storage.search(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text)\n RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)\n LANGUAGE plpgsql\n STABLE\nAS $function$\nDECLARE\n    v_peek_name TEXT;\n    v_current RECORD;\n    v_common_prefix TEXT;\n    v_delimiter CONSTANT TEXT := '/';\n\n    -- Configuration\n    v_limit INT;\n    v_prefix TEXT;\n    v_prefix_lower TEXT;\n    v_is_asc BOOLEAN;\n    v_order_by TEXT;\n    v_sort_order TEXT;\n    v_upper_bound TEXT;\n    v_file_batch_size INT;\n\n    -- Dynamic SQL for batch query only\n    v_batch_query TEXT;\n\n    -- Seek state\n    v_next_seek TEXT;\n    v_count INT := 0;\n    v_skipped INT := 0;\nBEGIN\n    -- ========================================================================\n    -- INITIALIZATION\n    -- ========================================================================\n    v_limit := LEAST(coalesce(limits, 100), 1500);\n    v_prefix := coalesce(prefix, '') || coalesce(search, '');\n    v_prefix_lower := lower(v_prefix);\n    v_is_asc := lower(coalesce(sortorder, 'asc')) = 'asc';\n    v_file_batch_size := LEAST(GREATEST(v_limit * 2, 100), 1000);\n\n    -- Validate sort column\n    CASE lower(coalesce(sortcolumn, 'name'))\n        WHEN 'name' THEN v_order_by := 'name';\n        WHEN 'updated_at' THEN v_order_by := 'updated_at';\n        WHEN 'created_at' THEN v_order_by := 'created_at';\n        WHEN 'last_accessed_at' THEN v_order_by := 'last_accessed_at';\n        ELSE v_order_by := 'name';\n    END CASE;\n\n    v_sort_order := CASE WHEN v_is_asc THEN 'asc' ELSE 'desc' END;\n\n    -- ========================================================================\n    -- NON-NAME SORTING: Use path_tokens approach (unchanged)\n    -- ========================================================================\n    IF v_order_by != 'name' THEN\n        RETURN QUERY EXECUTE format(\n            $sql$\n            WITH folders AS (\n                SELECT path_tokens[$1] AS folder\n                FROM storage.objects\n                WHERE objects.name ILIKE $2 || '%%'\n                  AND bucket_id = $3\n                  AND array_length(objects.path_tokens, 1) <> $1\n                GROUP BY folder\n                ORDER BY folder %s\n            )\n            (SELECT folder AS \"name\",\n                   NULL::uuid AS id,\n                   NULL::timestamptz AS updated_at,\n                   NULL::timestamptz AS created_at,\n                   NULL::timestamptz AS last_accessed_at,\n                   NULL::jsonb AS metadata FROM folders)\n            UNION ALL\n            (SELECT path_tokens[$1] AS \"name\",\n                   id, updated_at, created_at, last_accessed_at, metadata\n             FROM storage.objects\n             WHERE objects.name ILIKE $2 || '%%'\n               AND bucket_id = $3\n               AND array_length(objects.path_tokens, 1) = $1\n             ORDER BY %I %s)\n            LIMIT $4 OFFSET $5\n            $sql$, v_sort_order, v_order_by, v_sort_order\n        ) USING levels, v_prefix, bucketname, v_limit, offsets;\n        RETURN;\n    END IF;\n\n    -- ========================================================================\n    -- NAME SORTING: Hybrid skip-scan with batch optimization\n    -- ========================================================================\n\n    -- Calculate upper bound for prefix filtering\n    IF v_prefix_lower = '' THEN\n        v_upper_bound := NULL;\n    ELSIF right(v_prefix_lower, 1) = v_delimiter THEN\n        v_upper_bound := left(v_prefix_lower, -1) || chr(ascii(v_delimiter) + 1);\n    ELSE\n        v_upper_bound := left(v_prefix_lower, -1) || chr(ascii(right(v_prefix_lower, 1)) + 1);\n    END IF;\n\n    -- Build batch query (dynamic SQL - called infrequently, amortized over many rows)\n    IF v_is_asc THEN\n        IF v_upper_bound IS NOT NULL THEN\n            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||\n                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE \"C\" >= $2 ' ||\n                'AND lower(o.name) COLLATE \"C\" < $3 ORDER BY lower(o.name) COLLATE \"C\" ASC LIMIT $4';\n        ELSE\n            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||\n                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE \"C\" >= $2 ' ||\n                'ORDER BY lower(o.name) COLLATE \"C\" ASC LIMIT $4';\n        END IF;\n    ELSE\n        IF v_upper_bound IS NOT NULL THEN\n            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||\n                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE \"C\" < $2 ' ||\n                'AND lower(o.name) COLLATE \"C\" >= $3 ORDER BY lower(o.name) COLLATE \"C\" DESC LIMIT $4';\n        ELSE\n            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||\n                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE \"C\" < $2 ' ||\n                'ORDER BY lower(o.name) COLLATE \"C\" DESC LIMIT $4';\n        END IF;\n    END IF;\n\n    -- Initialize seek position\n    IF v_is_asc THEN\n        v_next_seek := v_prefix_lower;\n    ELSE\n        -- DESC: find the last item in range first (static SQL)\n        IF v_upper_bound IS NOT NULL THEN\n            SELECT o.name INTO v_peek_name FROM storage.objects o\n            WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE \"C\" >= v_prefix_lower AND lower(o.name) COLLATE \"C\" < v_upper_bound\n            ORDER BY lower(o.name) COLLATE \"C\" DESC LIMIT 1;\n        ELSIF v_prefix_lower <> '' THEN\n            SELECT o.name INTO v_peek_name FROM storage.objects o\n            WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE \"C\" >= v_prefix_lower\n            ORDER BY lower(o.name) COLLATE \"C\" DESC LIMIT 1;\n        ELSE\n            SELECT o.name INTO v_peek_name FROM storage.objects o\n            WHERE o.bucket_id = bucketname\n            ORDER BY lower(o.name) COLLATE \"C\" DESC LIMIT 1;\n        END IF;\n\n        IF v_peek_name IS NOT NULL THEN\n            v_next_seek := lower(v_peek_name) || v_delimiter;\n        ELSE\n            RETURN;\n        END IF;\n    END IF;\n\n    -- ========================================================================\n    -- MAIN LOOP: Hybrid peek-then-batch algorithm\n    -- Uses STATIC SQL for peek (hot path) and DYNAMIC SQL for batch\n    -- ========================================================================\n    LOOP\n        EXIT WHEN v_count >= v_limit;\n\n        -- STEP 1: PEEK using STATIC SQL (plan cached, very fast)\n        IF v_is_asc THEN\n            IF v_upper_bound IS NOT NULL THEN\n                SELECT o.name INTO v_peek_name FROM storage.objects o\n                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE \"C\" >= v_next_seek AND lower(o.name) COLLATE \"C\" < v_upper_bound\n                ORDER BY lower(o.name) COLLATE \"C\" ASC LIMIT 1;\n            ELSE\n                SELECT o.name INTO v_peek_name FROM storage.objects o\n                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE \"C\" >= v_next_seek\n                ORDER BY lower(o.name) COLLATE \"C\" ASC LIMIT 1;\n            END IF;\n        ELSE\n            IF v_upper_bound IS NOT NULL THEN\n                SELECT o.name INTO v_peek_name FROM storage.objects o\n                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE \"C\" < v_next_seek AND lower(o.name) COLLATE \"C\" >= v_prefix_lower\n                ORDER BY lower(o.name) COLLATE \"C\" DESC LIMIT 1;\n            ELSIF v_prefix_lower <> '' THEN\n                SELECT o.name INTO v_peek_name FROM storage.objects o\n                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE \"C\" < v_next_seek AND lower(o.name) COLLATE \"C\" >= v_prefix_lower\n                ORDER BY lower(o.name) COLLATE \"C\" DESC LIMIT 1;\n            ELSE\n                SELECT o.name INTO v_peek_name FROM storage.objects o\n                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE \"C\" < v_next_seek\n                ORDER BY lower(o.name) COLLATE \"C\" DESC LIMIT 1;\n            END IF;\n        END IF;\n\n        EXIT WHEN v_peek_name IS NULL;\n\n        -- STEP 2: Check if this is a FOLDER or FILE\n        v_common_prefix := storage.get_common_prefix(lower(v_peek_name), v_prefix_lower, v_delimiter);\n\n        IF v_common_prefix IS NOT NULL THEN\n            -- FOLDER: Handle offset, emit if needed, skip to next folder\n            IF v_skipped < offsets THEN\n                v_skipped := v_skipped + 1;\n            ELSE\n                name := split_part(rtrim(storage.get_common_prefix(v_peek_name, v_prefix, v_delimiter), v_delimiter), v_delimiter, levels);\n                id := NULL;\n                updated_at := NULL;\n                created_at := NULL;\n                last_accessed_at := NULL;\n                metadata := NULL;\n                RETURN NEXT;\n                v_count := v_count + 1;\n            END IF;\n\n            -- Advance seek past the folder range\n            IF v_is_asc THEN\n                v_next_seek := lower(left(v_common_prefix, -1)) || chr(ascii(v_delimiter) + 1);\n            ELSE\n                v_next_seek := lower(v_common_prefix);\n            END IF;\n        ELSE\n            -- FILE: Batch fetch using DYNAMIC SQL (overhead amortized over many rows)\n            -- For ASC: upper_bound is the exclusive upper limit (< condition)\n            -- For DESC: prefix_lower is the inclusive lower limit (>= condition)\n            FOR v_current IN EXECUTE v_batch_query\n                USING bucketname, v_next_seek,\n                    CASE WHEN v_is_asc THEN COALESCE(v_upper_bound, v_prefix_lower) ELSE v_prefix_lower END, v_file_batch_size\n            LOOP\n                v_common_prefix := storage.get_common_prefix(lower(v_current.name), v_prefix_lower, v_delimiter);\n\n                IF v_common_prefix IS NOT NULL THEN\n                    -- Hit a folder: exit batch, let peek handle it\n                    v_next_seek := lower(v_current.name);\n                    EXIT;\n                END IF;\n\n                -- Handle offset skipping\n                IF v_skipped < offsets THEN\n                    v_skipped := v_skipped + 1;\n                ELSE\n                    -- Emit file\n                    name := split_part(v_current.name, v_delimiter, levels);\n                    id := v_current.id;\n                    updated_at := v_current.updated_at;\n                    created_at := v_current.created_at;\n                    last_accessed_at := v_current.last_accessed_at;\n                    metadata := v_current.metadata;\n                    RETURN NEXT;\n                    v_count := v_count + 1;\n                END IF;\n\n                -- Advance seek past this file\n                IF v_is_asc THEN\n                    v_next_seek := lower(v_current.name) || v_delimiter;\n                ELSE\n                    v_next_seek := lower(v_current.name);\n                END IF;\n\n                EXIT WHEN v_count >= v_limit;\n            END LOOP;\n        END IF;\n    END LOOP;\nEND;\n$function$\n$$ LANGUAGE plpgsql;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION storage.search_by_timestamp(p_prefix text, p_bucket_id text, p_limit integer, p_level integer, p_start_after text, p_sort_order text, p_sort_column text, p_sort_column_after text)\nRETURNS TABLE(key text, name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)\nAS $$CREATE OR REPLACE FUNCTION storage.search_by_timestamp(p_prefix text, p_bucket_id text, p_limit integer, p_level integer, p_start_after text, p_sort_order text, p_sort_column text, p_sort_column_after text)\n RETURNS TABLE(key text, name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)\n LANGUAGE plpgsql\n STABLE\nAS $function$\nDECLARE\n    v_cursor_op text;\n    v_query text;\n    v_prefix text;\nBEGIN\n    v_prefix := coalesce(p_prefix, '');\n\n    IF p_sort_order = 'asc' THEN\n        v_cursor_op := '>';\n    ELSE\n        v_cursor_op := '<';\n    END IF;\n\n    v_query := format($sql$\n        WITH raw_objects AS (\n            SELECT\n                o.name AS obj_name,\n                o.id AS obj_id,\n                o.updated_at AS obj_updated_at,\n                o.created_at AS obj_created_at,\n                o.last_accessed_at AS obj_last_accessed_at,\n                o.metadata AS obj_metadata,\n                storage.get_common_prefix(o.name, $1, '/') AS common_prefix\n            FROM storage.objects o\n            WHERE o.bucket_id = $2\n              AND o.name COLLATE \"C\" LIKE $1 || '%%'\n        ),\n        -- Aggregate common prefixes (folders)\n        -- Both created_at and updated_at use MIN(obj_created_at) to match the old prefixes table behavior\n        aggregated_prefixes AS (\n            SELECT\n                rtrim(common_prefix, '/') AS name,\n                NULL::uuid AS id,\n                MIN(obj_created_at) AS updated_at,\n                MIN(obj_created_at) AS created_at,\n                NULL::timestamptz AS last_accessed_at,\n                NULL::jsonb AS metadata,\n                TRUE AS is_prefix\n            FROM raw_objects\n            WHERE common_prefix IS NOT NULL\n            GROUP BY common_prefix\n        ),\n        leaf_objects AS (\n            SELECT\n                obj_name AS name,\n                obj_id AS id,\n                obj_updated_at AS updated_at,\n                obj_created_at AS created_at,\n                obj_last_accessed_at AS last_accessed_at,\n                obj_metadata AS metadata,\n                FALSE AS is_prefix\n            FROM raw_objects\n            WHERE common_prefix IS NULL\n        ),\n        combined AS (\n            SELECT * FROM aggregated_prefixes\n            UNION ALL\n            SELECT * FROM leaf_objects\n        ),\n        filtered AS (\n            SELECT *\n            FROM combined\n            WHERE (\n                $5 = ''\n                OR ROW(\n                    date_trunc('milliseconds', %I),\n                    name COLLATE \"C\"\n                ) %s ROW(\n                    COALESCE(NULLIF($6, '')::timestamptz, 'epoch'::timestamptz),\n                    $5\n                )\n            )\n        )\n        SELECT\n            split_part(name, '/', $3) AS key,\n            name,\n            id,\n            updated_at,\n            created_at,\n            last_accessed_at,\n            metadata\n        FROM filtered\n        ORDER BY\n            COALESCE(date_trunc('milliseconds', %I), 'epoch'::timestamptz) %s,\n            name COLLATE \"C\" %s\n        LIMIT $4\n    $sql$,\n        p_sort_column,\n        v_cursor_op,\n        p_sort_column,\n        p_sort_order,\n        p_sort_order\n    );\n\n    RETURN QUERY EXECUTE v_query\n    USING v_prefix, p_bucket_id, p_level, p_limit, p_start_after, p_sort_column_after;\nEND;\n$function$\n$$ LANGUAGE plpgsql;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION storage.search_legacy_v1(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text)\nRETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)\nAS $$CREATE OR REPLACE FUNCTION storage.search_legacy_v1(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text)\n RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)\n LANGUAGE plpgsql\n STABLE\nAS $function$\ndeclare\n    v_order_by text;\n    v_sort_order text;\nbegin\n    case\n        when sortcolumn = 'name' then\n            v_order_by = 'name';\n        when sortcolumn = 'updated_at' then\n            v_order_by = 'updated_at';\n        when sortcolumn = 'created_at' then\n            v_order_by = 'created_at';\n        when sortcolumn = 'last_accessed_at' then\n            v_order_by = 'last_accessed_at';\n        else\n            v_order_by = 'name';\n        end case;\n\n    case\n        when sortorder = 'asc' then\n            v_sort_order = 'asc';\n        when sortorder = 'desc' then\n            v_sort_order = 'desc';\n        else\n            v_sort_order = 'asc';\n        end case;\n\n    v_order_by = v_order_by || ' ' || v_sort_order;\n\n    return query execute\n        'with folders as (\n           select path_tokens[$1] as folder\n           from storage.objects\n             where objects.name ilike $2 || $3 || ''%''\n               and bucket_id = $4\n               and array_length(objects.path_tokens, 1) <> $1\n           group by folder\n           order by folder ' || v_sort_order || '\n     )\n     (select folder as \"name\",\n            null as id,\n            null as updated_at,\n            null as created_at,\n            null as last_accessed_at,\n            null as metadata from folders)\n     union all\n     (select path_tokens[$1] as \"name\",\n            id,\n            updated_at,\n            created_at,\n            last_accessed_at,\n            metadata\n     from storage.objects\n     where objects.name ilike $2 || $3 || ''%''\n       and bucket_id = $4\n       and array_length(objects.path_tokens, 1) = $1\n     order by ' || v_order_by || ')\n     limit $5\n     offset $6' using levels, prefix, search, bucketname, limits, offsets;\nend;\n$function$\n$$ LANGUAGE plpgsql;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION storage.search_v2(prefix text, bucket_name text, limits integer DEFAULT 100, levels integer DEFAULT 1, start_after text DEFAULT ''::text, sort_order text DEFAULT 'asc'::text, sort_column text DEFAULT 'name'::text, sort_column_after text DEFAULT ''::text)\nRETURNS TABLE(key text, name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)\nAS $$CREATE OR REPLACE FUNCTION storage.search_v2(prefix text, bucket_name text, limits integer DEFAULT 100, levels integer DEFAULT 1, start_after text DEFAULT ''::text, sort_order text DEFAULT 'asc'::text, sort_column text DEFAULT 'name'::text, sort_column_after text DEFAULT ''::text)\n RETURNS TABLE(key text, name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)\n LANGUAGE plpgsql\n STABLE\nAS $function$\nDECLARE\n    v_sort_col text;\n    v_sort_ord text;\n    v_limit int;\nBEGIN\n    -- Cap limit to maximum of 1500 records\n    v_limit := LEAST(coalesce(limits, 100), 1500);\n\n    -- Validate and normalize sort_order\n    v_sort_ord := lower(coalesce(sort_order, 'asc'));\n    IF v_sort_ord NOT IN ('asc', 'desc') THEN\n        v_sort_ord := 'asc';\n    END IF;\n\n    -- Validate and normalize sort_column\n    v_sort_col := lower(coalesce(sort_column, 'name'));\n    IF v_sort_col NOT IN ('name', 'updated_at', 'created_at') THEN\n        v_sort_col := 'name';\n    END IF;\n\n    -- Route to appropriate implementation\n    IF v_sort_col = 'name' THEN\n        -- Use list_objects_with_delimiter for name sorting (most efficient: O(k * log n))\n        RETURN QUERY\n        SELECT\n            split_part(l.name, '/', levels) AS key,\n            l.name AS name,\n            l.id,\n            l.updated_at,\n            l.created_at,\n            l.last_accessed_at,\n            l.metadata\n        FROM storage.list_objects_with_delimiter(\n            bucket_name,\n            coalesce(prefix, ''),\n            '/',\n            v_limit,\n            start_after,\n            '',\n            v_sort_ord\n        ) l;\n    ELSE\n        -- Use aggregation approach for timestamp sorting\n        -- Not efficient for large datasets but supports correct pagination\n        RETURN QUERY SELECT * FROM storage.search_by_timestamp(\n            prefix, bucket_name, v_limit, levels, start_after,\n            v_sort_ord, v_sort_col, sort_column_after\n        );\n    END IF;\nEND;\n$function$\n$$ LANGUAGE plpgsql;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION storage.update_updated_at_column()\nRETURNS trigger\nAS $$CREATE OR REPLACE FUNCTION storage.update_updated_at_column()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\nBEGIN\n    NEW.updated_at = now();\n    RETURN NEW; \nEND;\n$function$\n$$ LANGUAGE plpgsql;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION vault._crypto_aead_det_decrypt(message bytea, additional bytea, key_id bigint, context bytea DEFAULT '\\x7067736f6469756d'::bytea, nonce bytea DEFAULT NULL::bytea)\nRETURNS bytea\nAS $$CREATE OR REPLACE FUNCTION vault._crypto_aead_det_decrypt(message bytea, additional bytea, key_id bigint, context bytea DEFAULT '\\x7067736f6469756d'::bytea, nonce bytea DEFAULT NULL::bytea)\n RETURNS bytea\n LANGUAGE c\n IMMUTABLE\nAS '$libdir/supabase_vault', $function$pgsodium_crypto_aead_det_decrypt_by_id$function$\n$$ LANGUAGE c;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION vault._crypto_aead_det_encrypt(message bytea, additional bytea, key_id bigint, context bytea DEFAULT '\\x7067736f6469756d'::bytea, nonce bytea DEFAULT NULL::bytea)\nRETURNS bytea\nAS $$CREATE OR REPLACE FUNCTION vault._crypto_aead_det_encrypt(message bytea, additional bytea, key_id bigint, context bytea DEFAULT '\\x7067736f6469756d'::bytea, nonce bytea DEFAULT NULL::bytea)\n RETURNS bytea\n LANGUAGE c\n IMMUTABLE\nAS '$libdir/supabase_vault', $function$pgsodium_crypto_aead_det_encrypt_by_id$function$\n$$ LANGUAGE c;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION vault._crypto_aead_det_noncegen()\nRETURNS bytea\nAS $$CREATE OR REPLACE FUNCTION vault._crypto_aead_det_noncegen()\n RETURNS bytea\n LANGUAGE c\n IMMUTABLE\nAS '$libdir/supabase_vault', $function$pgsodium_crypto_aead_det_noncegen$function$\n$$ LANGUAGE c;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION vault.create_secret(new_secret text, new_name text DEFAULT NULL::text, new_description text DEFAULT ''::text, new_key_id uuid DEFAULT NULL::uuid)\nRETURNS uuid\nAS $$CREATE OR REPLACE FUNCTION vault.create_secret(new_secret text, new_name text DEFAULT NULL::text, new_description text DEFAULT ''::text, new_key_id uuid DEFAULT NULL::uuid)\n RETURNS uuid\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO ''\nAS $function$\nDECLARE\n  rec record;\nBEGIN\n  INSERT INTO vault.secrets (secret, name, description)\n  VALUES (\n    new_secret,\n    new_name,\n    new_description\n  )\n  RETURNING * INTO rec;\n  UPDATE vault.secrets s\n  SET secret = encode(vault._crypto_aead_det_encrypt(\n    message := convert_to(rec.secret, 'utf8'),\n    additional := convert_to(s.id::text, 'utf8'),\n    key_id := 0,\n    context := 'pgsodium'::bytea,\n    nonce := rec.nonce\n  ), 'base64')\n  WHERE id = rec.id;\n  RETURN rec.id;\nEND\n$function$\n$$ LANGUAGE plpgsql;"
  },
  {
    "?column?": "CREATE OR REPLACE FUNCTION vault.update_secret(secret_id uuid, new_secret text DEFAULT NULL::text, new_name text DEFAULT NULL::text, new_description text DEFAULT NULL::text, new_key_id uuid DEFAULT NULL::uuid)\nRETURNS void\nAS $$CREATE OR REPLACE FUNCTION vault.update_secret(secret_id uuid, new_secret text DEFAULT NULL::text, new_name text DEFAULT NULL::text, new_description text DEFAULT NULL::text, new_key_id uuid DEFAULT NULL::uuid)\n RETURNS void\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO ''\nAS $function$\nDECLARE\n  decrypted_secret text := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE id = secret_id);\nBEGIN\n  UPDATE vault.secrets s\n  SET\n    secret = CASE WHEN new_secret IS NULL THEN s.secret\n                  ELSE encode(vault._crypto_aead_det_encrypt(\n                    message := convert_to(new_secret, 'utf8'),\n                    additional := convert_to(s.id::text, 'utf8'),\n                    key_id := 0,\n                    context := 'pgsodium'::bytea,\n                    nonce := s.nonce\n                  ), 'base64') END,\n    name = coalesce(new_name, s.name),\n    description = coalesce(new_description, s.description),\n    updated_at = now()\n  WHERE s.id = secret_id;\nEND\n$function$\n$$ LANGUAGE plpgsql;"
  }
]

