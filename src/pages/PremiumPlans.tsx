import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Crown,
  Zap,
  ArrowRight,
  Shield,
  Gem,
  TrendingUp,
  ChevronDown,
  Star,
  Sparkles,
  Lock,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { openPaymentLink, formatBRL, PLAN_CATALOG, FOUNDER_PROMO, founderMonthly, isFounderPromoActive, type Plan as BillingPlan } from '../services/billing';
import { getPromoStatus } from '../services/database';
import { useAuth } from '@clerk/clerk-react';
import { cn } from '../lib/utils';
import { useTranslation } from 'react-i18next';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Feature {
  text: string;
  highlight?: boolean;

}
interface Plan {
  id: string;
  tag: string;
  title: string;
  priceMonthly: string;
  priceAnnual: string;
  rawMonthly: number;
  rawAnnual: number;
  desc: string;
  roi?: string;
  roiColor?: string;
  features: Feature[];
  theme: string;
  badgeColor: string;
  btnText?: string;
  popular?: boolean;
  paymentKey?: string;
  storeKey?: string;
  isFree?: boolean;
}

// ─── Plan data ────────────────────────────────────────────────────────────────

const getPlans = (t: (key: string, options?: Record<string, unknown>) => string): Plan[] => [
  {
    id: 'bronze',
    tag: t('plans.bronzeTag'),
    title: t('plans.bronzeTitle'),
    priceMonthly: t('plans.free'),
    priceAnnual: t('plans.free'),
    rawMonthly: 0,
    rawAnnual: 0,
    isFree: true,
    desc: t('plans.bronzeDesc'),
    features: (t('plans.bronzeFeatures', { returnObjects: true }) as unknown as string[]).map(text => ({ text })),
    theme: 'bg-[#0B1C17]/40 border-white/5',
    badgeColor: 'bg-gray-500/20 text-gray-400 border border-gray-500/20',
    btnText: t('plans.currentPlan'),
  },
  {
    id: 'starter',
    tag: t('plans.silverTag'),
    title: t('plans.starterTitle'),
    priceMonthly: formatBRL(PLAN_CATALOG.starter.monthly),
    priceAnnual: formatBRL(PLAN_CATALOG.starter.annual),
    rawMonthly: PLAN_CATALOG.starter.monthly,
    rawAnnual: PLAN_CATALOG.starter.annual,
    desc: t('plans.starterDesc'),
    roi: t('plans.starterRoi'),
    roiColor: 'text-blue-400',
    features: (t('plans.starterFeatures', { returnObjects: true }) as unknown as string[]).map((text, i) => ({ text, highlight: i >= 1 && i <= 3 })),
    theme: 'glass-blue border-blue-500/20',
    badgeColor: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    paymentKey: 'starter',
    storeKey: 'starter',
  },
  {
    id: 'pro',
    tag: t('plans.popularTag'),
    title: t('plans.proTitle'),
    priceMonthly: formatBRL(PLAN_CATALOG.pro.monthly),
    priceAnnual: formatBRL(PLAN_CATALOG.pro.annual),
    rawMonthly: PLAN_CATALOG.pro.monthly,
    rawAnnual: PLAN_CATALOG.pro.annual,
    desc: t('plans.proDesc'),
    roi: t('plans.proRoi'),
    roiColor: 'text-emerald-400',
    popular: true,
    features: (t('plans.proFeatures', { returnObjects: true }) as unknown as string[]).map((text, i) => ({ text, highlight: i >= 1 && i <= 3 })),
    theme: 'glass-emerald border-emerald-500/40',
    badgeColor: 'bg-emerald-400 text-[#020617]',
    paymentKey: 'pro',
    storeKey: 'pro',
  },
  {
    id: 'master',
    tag: t('plans.platinumTag'),
    title: t('plans.masterTitle'),
    priceMonthly: formatBRL(PLAN_CATALOG.master.monthly),
    priceAnnual: formatBRL(PLAN_CATALOG.master.annual),
    rawMonthly: PLAN_CATALOG.master.monthly,
    rawAnnual: PLAN_CATALOG.master.annual,
    desc: t('plans.masterDesc'),
    roi: t('plans.masterRoi'),
    roiColor: 'text-cyan-400',
    features: (t('plans.masterFeatures', { returnObjects: true }) as unknown as string[]).map((text, i) => ({ text, highlight: i >= 1 && i <= 4 })),
    theme: 'glass-blue border-cyan-500/20',
    badgeColor: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
    paymentKey: 'master',
    storeKey: 'master',
  },
  {
    id: 'elite',
    tag: t('plans.diamondTag'),
    title: t('plans.eliteTitle'),
    priceMonthly: formatBRL(PLAN_CATALOG.elite.monthly),
    priceAnnual: formatBRL(PLAN_CATALOG.elite.annual),
    rawMonthly: PLAN_CATALOG.elite.monthly,
    rawAnnual: PLAN_CATALOG.elite.annual,
    desc: t('plans.eliteDesc'),
    roi: t('plans.eliteRoi'),
    roiColor: 'text-purple-400',
    features: (t('plans.eliteFeatures', { returnObjects: true }) as unknown as string[]).map((text, i) => ({ text, highlight: i >= 1 })),
    theme: 'glass-purple border-purple-500/20',
    badgeColor: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
    paymentKey: 'elite',
    storeKey: 'elite',
  },
];

// ─── Comparison table data ────────────────────────────────────────────────────

const getCompareRows = (t: (key: string) => string) => [
  { label: t('plans.cmpMaxAssets'),   values: ['5',    '15',   '30',    '50',    '∞'] },
  { label: t('plans.cmpTxMonth'),         values: ['20',   '200',  '1.000', '5.000', '∞'] },
  { label: t('plans.cmpDashboard'),    values: [true,   true,   true,    true,    true] },
  { label: t('plans.cmpDivCalendar'),   values: [false,  true,   true,    true,    true] },
  { label: t('plans.cmpRebalancer'),              values: [false,  true,   true,    true,    true] },
  { label: t('plans.cmpTutor'),                  values: [false,  false,  true,    true,    true] },
  { label: t('plans.cmpIrCalc'),             values: [false,  false,  true,    true,    true] },
  { label: t('plans.cmpDrip'),             values: [false,  false,   true,    true,    true] },
  { label: t('plans.cmpFxRadar'),    values: [false,  false,  false,   true,    true] },
  { label: t('plans.cmpAutoImport'),      values: [false,  false,  false,   true,    true] },
  { label: t('plans.cmpTaxLoss'),   values: [false,  false,  false,   false,   true] },
  { label: t('plans.cmpHuman'),         values: [false,  false,  false,   false,   true] },
  { label: t('plans.cmpConcierge'),          values: [false,  false,  false,   false,   true] },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

const PlanCard = ({
  plan,
  isAnnual,
  isCurrent,
  founder,
  onAction,
  onDev,
}: {
  plan: Plan;
  isAnnual: boolean;
  isCurrent: boolean;
  founder: boolean;
  onAction: () => void;
  onDev: () => void;
}) => {
  const { t } = useTranslation();
  const displayPrice = isAnnual ? plan.priceAnnual : plan.priceMonthly;

  return (
    <div
      className={cn(
        'relative flex flex-col p-7 rounded-3xl border transition-all h-full',
        plan.theme,
        plan.popular && 'z-10 shadow-2xl shadow-emerald-500/10',
      )}
    >
      {/* Badge */}
      {plan.tag && (
        <div
          className={cn(
            'absolute -top-3.5 left-6 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase',
            plan.badgeColor,
          )}
        >
          {plan.popular && <Star className="w-2.5 h-2.5 fill-current" />}
          {plan.tag}
        </div>
      )}

      {/* Header */}
      <div className="mt-3 mb-5">
        <h3 className="text-lg font-black text-white mb-2">{plan.title}</h3>
        {founder && !plan.isFree ? (
          <div className="flex items-baseline gap-2" title={t('plans.promoBadge')}>
            <span className="text-3xl font-black text-emerald-400">
              {formatBRL(founderMonthly(plan.id as BillingPlan))}
            </span>
            <span className="text-sm text-gray-600 line-through font-bold">{displayPrice}</span>
            <span className="text-gray-500 text-xs">{t('plans.perMonth')}</span>
          </div>
        ) : (
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-black text-white">{displayPrice}</span>
            {!plan.isFree && <span className="text-gray-500 text-xs">{t('plans.perMonth')}</span>}
          </div>
        )}
        {isAnnual && !plan.isFree && (
          <div className="text-[10px] text-emerald-400 font-bold mt-1 flex items-center gap-1">
            <Zap className="w-2.5 h-2.5" /> {t('plans.twoMonthsFree')}
          </div>
        )}
        {!isAnnual && !plan.isFree && (
          <div className="text-[10px] text-gray-600 mt-1">
            {t('plans.orAnnual', { price: plan.priceAnnual })}
          </div>
        )}
      </div>

      {/* Description */}
      <p className="text-gray-500 text-[11px] leading-relaxed mb-4 min-h-[2.5rem]">{plan.desc}</p>

      {/* ROI badge */}
      {plan.roi && (
        <div
          className={cn(
            'flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 mb-5',
            plan.roiColor,
          )}
        >
          <TrendingUp className="w-3 h-3 flex-shrink-0" />
          {plan.roi}
        </div>
      )}

      {/* Features */}
      <ul className="space-y-3 mb-8 flex-grow">
        {plan.features.map((feature, i) => (
          <li key={i} className="flex items-start gap-2.5 text-[11px] leading-snug">
            <CheckCircle2
              className={cn(
                'w-3.5 h-3.5 shrink-0 mt-0.5',
                feature.highlight ? 'text-emerald-400' : 'text-gray-600',
              )}
            />
            <span className={feature.highlight ? 'text-gray-200 font-medium' : 'text-gray-500'}>
              {feature.text}
            </span>
          </li>
        ))}
      </ul>

      {/* Actions */}
      <div className="mt-auto space-y-2">
        {isCurrent ? (
          <button
            disabled
            className="w-full py-3 rounded-xl border border-white/10 text-gray-600 text-sm font-bold cursor-default"
          >
            {t('plans.currentPlan')}
          </button>
        ) : plan.isFree ? (
          <button
            disabled
            className="w-full py-3 rounded-xl border border-white/10 text-gray-600 text-sm font-bold cursor-default"
          >
            {t('plans.freeCta')}
          </button>
        ) : (
          <>
            <button
              onClick={onAction}
              className={cn(
                'w-full py-4 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2 group',
                plan.popular
                  ? 'bg-emerald-400 text-[#020617] hover:bg-emerald-300 shadow-lg shadow-emerald-500/20 active:scale-95'
                  : 'bg-white/5 text-white hover:bg-white/10 border border-white/10 active:scale-95',
              )}
            >
              {plan.btnText ?? (founder ? t('plans.promoCta') : t('plans.startNow'))}
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
            {/* Dev mode — only visible in development */}
            {process.env.NODE_ENV === 'development' && (
              <button
                onClick={onDev}
                className="w-full py-1.5 text-[10px] font-bold text-gray-700 hover:text-gray-500 transition-colors"
              >
                {t('plans.devActivate')}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// ─── Comparison table ─────────────────────────────────────────────────────────

const ComparisonTable = () => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const planNames = t('plans.planNames', { returnObjects: true }) as string[];
  const compareRows = getCompareRows(t);

  return (
    <div className="max-w-[1200px] mx-auto px-4 mt-12">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-center gap-3 py-4 text-sm font-bold text-gray-400 hover:text-white transition-colors group"
      >
        <span>{t('plans.compareToggle')}</span>
        <ChevronDown
          className={cn(
            'w-4 h-4 transition-transform duration-300',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && (
        <div className="mt-4 glass-card rounded-3xl border-white/5 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left py-5 px-6 text-gray-500 text-xs font-bold uppercase tracking-widest w-[30%]">
                    {t('plans.compareFeatureCol')}
                  </th>
                  {planNames.map((name, i) => (
                    <th
                      key={i}
                      className={cn(
                        'py-5 px-4 text-center text-xs font-black uppercase tracking-widest',
                        i === 2 ? 'text-emerald-400' : 'text-gray-400',
                      )}
                    >
                      {name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {compareRows.map((row, ri) => (
                  <tr
                    key={ri}
                    className={cn(
                      'border-b border-white/5 last:border-0 transition-colors',
                      ri % 2 === 0 ? 'bg-white/[0.01]' : '',
                    )}
                  >
                    <td className="py-4 px-6 text-gray-400 text-xs font-medium">{row.label}</td>
                    {row.values.map((val, ci) => (
                      <td key={ci} className="py-4 px-4 text-center">
                        {typeof val === 'boolean' ? (
                          val ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" />
                          ) : (
                            <span className="text-gray-700 text-lg leading-none">—</span>
                          )
                        ) : (
                          <span
                            className={cn(
                              'text-xs font-bold',
                              ci === 2 ? 'text-emerald-400' : 'text-gray-400',
                            )}
                          >
                            {val}
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Trust bar ────────────────────────────────────────────────────────────────

const TrustBar = () => {
  const { t } = useTranslation();
  return (
  <div className="flex flex-wrap justify-center items-center gap-8 md:gap-14 mt-16 mb-4 px-4">
    {[
      { icon: <Lock className="w-4 h-4 text-emerald-400" />,   label: t('plans.trustSsl'),    sub: t('plans.trustSslSub') },
      { icon: <Shield className="w-4 h-4 text-blue-400" />,    label: t('plans.trustGdpr'), sub: t('plans.trustGdprSub') },
      { icon: <Gem className="w-4 h-4 text-purple-400" />,     label: t('plans.trustStripe'), sub: t('plans.trustStripeSub') },
      { icon: <CheckCircle2 className="w-4 h-4 text-cyan-400" />, label: t('plans.trustReadonly'), sub: t('plans.trustReadonlySub') },
    ].map((item, i) => (
      <div key={i} className="flex items-center gap-2.5 text-left">
        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
          {item.icon}
        </div>
        <div>
          <div className="text-xs font-black text-white">{item.label}</div>
          <div className="text-[10px] text-gray-600">{item.sub}</div>
        </div>
      </div>
    ))}
  </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

const PremiumPlans: React.FC = () => {
  const { setPlan, settings } = useStore();
  const { userId } = useAuth();
  const { t } = useTranslation();
  const [isAnnual, setIsAnnual] = useState(false);
  const plans = getPlans(t);
  const currentPlan = settings.plan ?? 'free';

  // Promoção Membro Fundador: janela ativa + elegibilidade (conta free)
  const promoActive = isFounderPromoActive();
  const founderEligible = promoActive && currentPlan === 'free';
  const [promoClaimed, setPromoClaimed] = useState<number | null>(null);

  useEffect(() => {
    if (!promoActive) return;
    let alive = true;
    getPromoStatus().then(s => { if (alive) setPromoClaimed(s?.claimed ?? null); });
    return () => { alive = false; };
  }, [promoActive]);

  const daysLeft = Math.max(0, Math.ceil((new Date(FOUNDER_PROMO.endDate).getTime() - Date.now()) / 86400000));
  const remaining = promoClaimed !== null ? Math.max(0, FOUNDER_PROMO.maxSlots - promoClaimed) : null;

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">

      {/* ── Header ── */}
      <div className="text-center space-y-5 max-w-2xl mx-auto pt-12 px-4">
        <div className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-4 py-1.5 rounded-full border border-emerald-500/20 text-xs font-black uppercase tracking-widest">
          <Crown className="w-3 h-3" /> {t('plans.headerBadge')}
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-[1.1]">
          {t('plans.titleStart')}{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
            {t('plans.titleHighlight')}
          </span>
        </h1>
        <p className="text-gray-400 text-base leading-relaxed">
          {t('plans.subtitle')}
        </p>

        {/* Billing toggle */}
        <div className="inline-flex items-center gap-1 bg-white/5 border border-white/10 rounded-2xl p-1.5 mt-2">
          <button
            onClick={() => setIsAnnual(false)}
            className={cn(
              'px-6 py-2.5 rounded-xl text-sm font-black transition-all',
              !isAnnual ? 'bg-emerald-500 text-black shadow-md' : 'text-gray-400 hover:text-white',
            )}
          >
            {t('plans.monthly')}
          </button>
          <button
            onClick={() => setIsAnnual(true)}
            className={cn(
              'px-5 py-2.5 rounded-xl text-sm font-black transition-all flex items-center gap-2',
              isAnnual ? 'bg-emerald-500 text-black shadow-md' : 'text-gray-400 hover:text-white',
            )}
          >
            {t('plans.annual')}
            <span
              className={cn(
                'text-[10px] px-2 py-0.5 rounded-full font-black transition-all',
                isAnnual ? 'bg-black/20 text-black' : 'bg-emerald-500/20 text-emerald-400',
              )}
            >
              −17%
            </span>
          </button>
        </div>
      </div>

      {/* ── Banner Membro Fundador ── */}
      {founderEligible && (
        <div className="max-w-[900px] mx-auto px-4">
          <div className="glass-emerald border border-emerald-500/30 rounded-2xl px-6 py-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-center">
            <span className="inline-flex items-center gap-1.5 bg-emerald-400 text-[#020617] px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase">
              <Crown className="w-3 h-3" /> {t('plans.promoBadge')}
            </span>
            <span className="text-sm font-black text-white">{t('plans.promoTitle')}</span>
            <span className="text-xs text-emerald-300 font-bold">{t('plans.promoEndsIn', { days: daysLeft })}</span>
            {remaining !== null && (
              <span className="text-xs text-gray-400 font-bold">
                {t('plans.promoSlots', { remaining, total: FOUNDER_PROMO.maxSlots })}
              </span>
            )}
            <span className="w-full text-[10px] text-gray-500">{t('plans.promoTerms')}</span>
          </div>
        </div>
      )}

      {/* ── Cards ── */}
      <div className="relative">
        {/* Glow behind featured card */}
        <div className="absolute left-1/2 -translate-x-1/2 top-0 w-72 h-full pointer-events-none">
          <div className="absolute inset-0 bg-emerald-500/10 blur-[80px] rounded-full" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-5 max-w-[1400px] mx-auto px-4 items-stretch relative z-10">
          {plans.map(plan => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isAnnual={isAnnual}
              isCurrent={currentPlan === (plan.isFree ? 'free' : plan.id)}
              founder={founderEligible && !plan.isFree}
              onAction={() =>
                plan.paymentKey &&
                openPaymentLink(
                  plan.paymentKey as BillingPlan,
                  founderEligible && !plan.isFree
                    ? { interval: 'monthly', userId: userId ?? undefined, promo: 'founder' }
                    : { interval: isAnnual ? 'annual' : 'monthly', userId: userId ?? undefined },
                )
              }
              onDev={() => plan.storeKey && setPlan(plan.storeKey as any)}
            />
          ))}
        </div>
      </div>

      {/* ── Annual savings callout ── */}
      {isAnnual && (
        <div className="text-center animate-in fade-in slide-in-from-top-2 duration-300">
          <p className="text-sm text-emerald-400 font-bold">
            {t('plans.annualSavingsStart')}{' '}
            <span className="text-white">{t('plans.annualSavingsValue')}</span> {t('plans.annualSavingsEnd')}
          </p>
        </div>
      )}

      {/* ── Comparison table ── */}
      <ComparisonTable />

      {/* ── Trust bar ── */}
      <TrustBar />

      {/* ── Guarantee ── */}
      <div className="text-center px-4">
        <div className="inline-flex items-center gap-3 glass-card px-6 py-4 rounded-2xl border-white/5 max-w-md">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-xs text-gray-400 text-left leading-relaxed">
            <span className="text-white font-bold">{t('plans.guaranteeBold')}</span>{' '}
            {t('plans.guaranteeText')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PremiumPlans;
