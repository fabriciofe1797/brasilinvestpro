import type { UserSettings } from '../types';
export type Plan = NonNullable<UserSettings['plan']> extends string ? Exclude<NonNullable<UserSettings['plan']>, 'free'> : 'starter' | 'pro' | 'master' | 'elite';

export function getPaymentLink(plan: Plan): string | null {
  const links: Record<Plan, string | undefined> = {
    starter: import.meta.env.VITE_STRIPE_LINK_STARTER,
    pro: import.meta.env.VITE_STRIPE_LINK_PRO,
    master: import.meta.env.VITE_STRIPE_LINK_MASTER,
    elite: import.meta.env.VITE_STRIPE_LINK_ELITE,
  };
  return links[plan] || null;
}

export function openPaymentLink(plan: Plan, userId?: string) {
  const url = getPaymentLink(plan);
  if (!url) {
    alert('Link de pagamento não configurado. Defina as variáveis VITE_STRIPE_LINK_* no .env');
    return;
  }
  
  // Append client_reference_id for secure webhook attribution if userId is provided
  const finalUrl = userId 
    ? `${url}${url.includes('?') ? '&' : '?'}client_reference_id=${encodeURIComponent(userId)}`
    : url;

  window.location.href = finalUrl;
}

export function getPlanLimits(plan: NonNullable<UserSettings['plan']>) {
  return {
    assets:
      plan === 'free'
        ? 3
        : plan === 'starter'
        ? 10
        : plan === 'pro'
        ? 25
        : plan === 'master'
        ? 50
        : null,
    transactions:
      plan === 'free'
        ? 20
        : plan === 'starter'
        ? 200
        : plan === 'pro'
        ? 1000
        : plan === 'master'
        ? 1000
        : null,
  } as { assets: number | null; transactions: number | null };
}
