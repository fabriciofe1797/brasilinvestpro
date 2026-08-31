import { getAuthenticatedClient } from './database';

const EDGE_FUNCTION_NAME = 'app-proxy';

/**
 * Ids Clerk com acesso ao painel administrativo.
 * ATENÇÃO: este gate é apenas de UX — a autorização real é feita
 * server-side no app-proxy (secret ADMIN_USER_IDS). Qualquer chamada
 * de outro usuário retorna "forbidden".
 */
export const ADMIN_USER_IDS = ['user_394MBzljHO6bMEQSQvNqtwFmXSn'];

export const isAdminId = (userId: string | null | undefined): boolean =>
  Boolean(userId) && ADMIN_USER_IDS.includes(userId as string);

// ─── Tipos retornados pelo app-proxy ─────────────────────────────────────────

export type AdminPlan = 'free' | 'starter' | 'pro' | 'master' | 'elite';

export interface AdminLicenseRow {
  user_id: string;
  plan_type: AdminPlan;
  payment_status: 'active' | 'past_due' | 'expired';
  start_date: string | null;
  end_date: string | null;
  billing_interval: 'monthly' | 'annual' | null;
  promo: string | null;
}

export interface AdminPlanChange {
  id: number;
  user_id: string;
  from_plan: string;
  to_plan: string;
  reason: string | null;
  admin_id: string | null;
  changed_at: string;
}

export interface AdminUserSummary {
  id: string;
  email: string | null;
  created_at: string;
  plan: AdminPlan;
  payment_status: string;
  end_date: string | null;
  billing_interval: string | null;
  promo: string | null;
}

export interface AdminUserDetail {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  profile: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  license: any;
  transactionsCount: number;
  planChanges: AdminPlanChange[];
}

const invokeAdmin = async (token: string, action: string, payload?: Record<string, unknown>) => {
  const client = getAuthenticatedClient(token);
  const { data, error } = await client.functions.invoke(EDGE_FUNCTION_NAME, {
    body: { action, payload },
  });
  if (error) throw new Error(error.message || 'admin_request_failed');
  if (!data?.ok) throw new Error(data?.error || 'admin_request_failed');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data as any;
};

export const adminOverview = async (token: string): Promise<{
  licenses: AdminLicenseRow[];
  totalProfiles: number;
  recentPlanChanges: AdminPlanChange[];
}> => {
  const data = await invokeAdmin(token, 'admin_overview');
  return {
    licenses: data.licenses ?? [],
    totalProfiles: data.totalProfiles ?? 0,
    recentPlanChanges: data.recentPlanChanges ?? [],
  };
};

export const adminListUsers = async (
  token: string,
  opts: { query?: string; plan?: AdminPlan | null; limit?: number; offset?: number } = {},
): Promise<{ users: AdminUserSummary[]; total: number }> => {
  const data = await invokeAdmin(token, 'admin_list_users', {
    query: opts.query || undefined,
    plan: opts.plan || undefined,
    limit: opts.limit ?? 25,
    offset: opts.offset ?? 0,
  });
  return { users: data.users ?? [], total: data.total ?? 0 };
};

export const adminGetUser = async (token: string, userId: string): Promise<AdminUserDetail> => {
  const data = await invokeAdmin(token, 'admin_get_user', { user_id: userId });
  return data.user as AdminUserDetail;
};

export const adminSetPlan = async (
  token: string,
  params: { user_id: string; plan: AdminPlan; days: number; reason: string },
): Promise<{ fromPlan: string; toPlan: string; end_date: string }> => {
  const data = await invokeAdmin(token, 'admin_set_plan', { ...params });
  return { fromPlan: data.fromPlan, toPlan: data.toPlan, end_date: data.end_date };
};
