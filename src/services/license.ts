import { getUserLicense } from './database';

type PlanType = 'free' | 'starter' | 'pro' | 'master' | 'elite';

/**
 * Fetches the user's license from the secure backend proxy.
 * This ensures plan logic and status are controlled by the server.
 */
export const fetchLicense = async (token: string) => {
  const data = await getUserLicense(token);
  if (!data) throw new Error('License not found');
  return data;
};

/**
 * Local check for write permission based on plan.
 * Note: Real enforcement happens on the backend during save.
 */
export const ensureWriteAllowed = async (token: string) => {
  const data = await fetchLicense(token);
  const plan = (data.plan as PlanType) ?? 'free';
  if (plan !== 'free') return { allowed: true, plan };
  
  if (data.status === 'active') return { allowed: true, plan };
  
  const end = data.endDate ? new Date(data.endDate).getTime() : null;
  if (!end) return { allowed: false, plan: 'free' as PlanType };
  
  const graceMs = 3 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  if (now <= end + graceMs) return { allowed: true, plan: 'free' as PlanType };
  
  return { allowed: false, plan: 'free' as PlanType };
};

export const getActivePlanFromLicense = (lic: any): PlanType => {
  return (lic?.plan || 'free') as PlanType;
};

// setUserPlan removed from frontend for security. 
// Plan changes must be handled via Stripe webhooks on the backend.
