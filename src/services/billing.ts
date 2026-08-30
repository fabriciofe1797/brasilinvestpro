import type { UserSettings } from '../types';

export type Plan = 'starter' | 'pro' | 'master' | 'elite';
export type BillingInterval = 'monthly' | 'annual';
export type PromoId = 'founder';

// ─── Promoção de lançamento: Membro Fundador ─────────────────────────────────
// 50% OFF por 12 meses, vagas limitadas e janela de 45 dias.
// Elegibilidade e vagas também são validadas server-side (stripe-webhook).
export const FOUNDER_PROMO = {
  id: 'founder' as PromoId,
  discountPct: 50,
  maxSlots: 500,
  endDate:
    (import.meta.env.VITE_PROMO_FOUNDER_END as string | undefined) ||
    '2026-10-14T23:59:59-03:00',
};

export function isFounderPromoActive(now: Date = new Date()): boolean {
  const end = new Date(FOUNDER_PROMO.endDate).getTime();
  return Number.isFinite(end) && now.getTime() < end;
}

export function founderMonthly(plan: Plan): number {
  const full = PLAN_CATALOG[plan].monthly;
  return Math.round(full * (100 - FOUNDER_PROMO.discountPct)) / 100;
}

// ─── Catálogo único de planos ────────────────────────────────────────────────
// Fonte de verdade de preços (BRL) e limites aplicados pelo app.
// A página de planos (PremiumPlans) e a aplicação de limites
// (AddInvestmentModal, ImportNotes, SettingsPage) leem daqui —
// nunca duplicar estes valores em outro lugar.
export const PLAN_CATALOG: Record<
  'free' | Plan,
  { monthly: number; annual: number; assets: number | null; transactions: number | null }
> = {
  free:    { monthly: 0,     annual: 0,     assets: 5,    transactions: 20   },
  starter: { monthly: 24.99, annual: 20.82, assets: 15,   transactions: 200  },
  pro:     { monthly: 39.99, annual: 33.25, assets: 30,   transactions: 1000 },
  master:  { monthly: 50,    annual: 41.66, assets: 50,   transactions: 5000 },
  elite:   { monthly: 99.99, annual: 83.25, assets: null, transactions: null },
};

export function formatBRL(value: number): string {
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
}

export function getPaymentLink(plan: Plan, interval: BillingInterval = 'monthly', promo?: PromoId): string | null {
  const env = import.meta.env as Record<string, string | undefined>;
  const base = plan.toUpperCase();
  const url =
    promo === 'founder'
      ? env[`VITE_STRIPE_LINK_${base}_FOUNDER`]
      : interval === 'annual'
        ? env[`VITE_STRIPE_LINK_${base}_ANNUAL`]
        : env[`VITE_STRIPE_LINK_${base}`];
  return url || null;
}

export interface OpenPaymentOptions {
  interval?: BillingInterval;
  userId?: string;
  promo?: PromoId;
}

export function openPaymentLink(plan: Plan, opts: OpenPaymentOptions = {}) {
  const { interval = 'monthly', userId, promo } = opts;
  const url = getPaymentLink(plan, interval, promo);
  if (!url) {
    alert(
      promo === 'founder'
        ? 'Link da oferta Membro Fundador não configurado. Defina as variáveis VITE_STRIPE_LINK_*_FOUNDER no .env'
        : interval === 'annual'
          ? 'Link de pagamento anual não configurado. Defina as variáveis VITE_STRIPE_LINK_*_ANNUAL no .env'
          : 'Link de pagamento não configurado. Defina as variáveis VITE_STRIPE_LINK_* no .env',
    );
    return;
  }

  // Append client_reference_id for secure webhook attribution if userId is provided
  const finalUrl = userId
    ? `${url}${url.includes('?') ? '&' : '?'}client_reference_id=${encodeURIComponent(userId)}`
    : url;

  window.location.href = finalUrl;
}

export function getPlanLimits(plan: NonNullable<UserSettings['plan']>) {
  const entry = PLAN_CATALOG[plan];
  return {
    assets: entry.assets,
    transactions: entry.transactions,
  } as { assets: number | null; transactions: number | null };
}
