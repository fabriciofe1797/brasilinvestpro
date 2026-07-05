import React, { useState } from 'react';
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
import { openPaymentLink } from '../services/billing';
import { cn } from '../lib/utils';

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

const PLANS: Plan[] = [
  {
    id: 'bronze',
    tag: 'BRONZE',
    title: 'Iniciante',
    priceMonthly: 'Grátis',
    priceAnnual: 'Grátis',
    rawMonthly: 0,
    rawAnnual: 0,
    isFree: true,
    desc: 'Organização básica para quem está começando agora.',
    features: [
      { text: 'Dashboard Real-Time' },
      { text: 'Hub de Mercado' },
      { text: 'Extrato de transações' },
      { text: 'Até 5 ativos' },
      { text: 'Simulador Juros Simples' },
      { text: '20 transações / mês' },
    ],
    theme: 'bg-[#0B1C17]/40 border-white/5',
    badgeColor: 'bg-gray-500/20 text-gray-400 border border-gray-500/20',
    btnText: 'Plano Atual',
  },
  {
    id: 'starter',
    tag: 'PRATA',
    title: 'Starter',
    priceMonthly: 'R$ 24,99',
    priceAnnual: 'R$ 20,82',
    rawMonthly: 24.99,
    rawAnnual: 20.82,
    desc: 'Para evoluir com monitoramento de proventos e rebalanceamento.',
    roi: 'Compensa com R$500/mês aportados',
    roiColor: 'text-blue-400',
    features: [
      { text: 'Tudo do Grátis' },
      { text: 'Calendário de Dividendos', highlight: true },
      { text: 'Rebalanceador básico', highlight: true },
      { text: 'Importação Manual (CSV)', highlight: true },
      { text: 'Até 15 ativos' },
      { text: '200 transações / mês' },
    ],
    theme: 'glass-blue border-blue-500/20',
    badgeColor: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    paymentKey: 'starter',
    storeKey: 'starter',
  },
  {
    id: 'pro',
    tag: 'MAIS POPULAR',
    title: 'Pro',
    priceMonthly: 'R$ 39,99',
    priceAnnual: 'R$ 33,25',
    rawMonthly: 39.99,
    rawAnnual: 33.25,
    desc: 'O pacote completo para construir riqueza com inteligência.',
    roi: 'Advisor AI recupera o valor em 1 operação',
    roiColor: 'text-emerald-400',
    popular: true,
    features: [
      { text: 'Tudo do Starter' },
      { text: 'Advisor AI Tutor', highlight: true },
      { text: 'Calculadora IR Completa', highlight: true },
      { text: 'DRIP Simulator Premium', highlight: true },
      { text: 'Até 30 ativos' },
      { text: '1.000 transações / mês' },
    ],
    theme: 'glass-emerald border-emerald-500/40',
    badgeColor: 'bg-emerald-400 text-[#020617]',
    paymentKey: 'pro',
    storeKey: 'pro',
  },
  {
    id: 'master',
    tag: 'PLATINA',
    title: 'Master',
    priceMonthly: 'R$ 50,00',
    priceAnnual: 'R$ 41,66',
    rawMonthly: 50,
    rawAnnual: 41.66,
    desc: 'Aparato profissional para expatriados com foco em Portugal.',
    roi: 'Radar de câmbio poupa +4% por remessa',
    roiColor: 'text-cyan-400',
    features: [
      { text: 'Tudo do Pro' },
      { text: 'Radar de Câmbio EUR/BRL', highlight: true },
      { text: 'Comparador de Ativos Pro', highlight: true },
      { text: 'Comunidade VIP Hub', highlight: true },
      { text: 'Importação Automática', highlight: true },
      { text: 'Até 50 ativos' },
    ],
    theme: 'glass-blue border-cyan-500/20',
    badgeColor: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
    paymentKey: 'master',
    storeKey: 'master',
  },
  {
    id: 'elite',
    tag: 'DIAMANTE',
    title: 'Elite',
    priceMonthly: 'R$ 99,99',
    priceAnnual: 'R$ 83,25',
    rawMonthly: 99.99,
    rawAnnual: 83.25,
    desc: 'Gestão de alto nível com IA avançada e consultoria humana.',
    roi: 'Tax Harvesting economiza R$2k+/ano',
    roiColor: 'text-purple-400',
    features: [
      { text: 'Tudo do Platina' },
      { text: 'Tax Loss Harvesting (IA)', highlight: true },
      { text: 'Consultoria Humana Mensal', highlight: true },
      { text: 'Relatórios Customizados', highlight: true },
      { text: 'Ativos Ilimitados', highlight: true },
      { text: 'VIP Concierge 24h', highlight: true },
    ],
    theme: 'glass-purple border-purple-500/20',
    badgeColor: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
    paymentKey: 'elite',
    storeKey: 'elite',
  },
];

// ─── Comparison table data ────────────────────────────────────────────────────

const COMPARE_ROWS = [
  { label: 'Número máximo de ativos',   values: ['5',    '15',   '30',    '50',    '∞'] },
  { label: 'Transações por mês',         values: ['20',   '200',  '1.000', '5.000', '∞'] },
  { label: 'Dashboard Real-Time',        values: [true,   true,   true,    true,    true] },
  { label: 'Calendário de Dividendos',   values: [false,  true,   true,    true,    true] },
  { label: 'Rebalanceador',              values: [false,  true,   true,    true,    true] },
  { label: 'Advisor AI Tutor',           values: [false,  false,  true,    true,    true] },
  { label: 'Calculadora IR',             values: [false,  false,  true,    true,    true] },
  { label: 'DRIP Simulator',             values: [false,  false,  true,    true,    true] },
  { label: 'Radar de Câmbio EUR/BRL',    values: [false,  false,  false,   true,    true] },
  { label: 'Importação Automática',      values: [false,  false,  false,   true,    true] },
  { label: 'Tax Loss Harvesting (IA)',   values: [false,  false,  false,   false,   true] },
  { label: 'Consultoria Humana',         values: [false,  false,  false,   false,   true] },
  { label: 'VIP Concierge 24h',          values: [false,  false,  false,   false,   true] },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

const PlanCard = ({
  plan,
  isAnnual,
  isCurrent,
  onAction,
  onDev,
}: {
  plan: Plan;
  isAnnual: boolean;
  isCurrent: boolean;
  onAction: () => void;
  onDev: () => void;
}) => {
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
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-black text-white">{displayPrice}</span>
          {!plan.isFree && <span className="text-gray-500 text-xs">/mês</span>}
        </div>
        {isAnnual && !plan.isFree && (
          <div className="text-[10px] text-emerald-400 font-bold mt-1 flex items-center gap-1">
            <Zap className="w-2.5 h-2.5" /> 2 meses grátis incluídos
          </div>
        )}
        {!isAnnual && !plan.isFree && (
          <div className="text-[10px] text-gray-600 mt-1">
            ou {plan.priceAnnual}/mês no anual
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
            Plano Atual
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
              {plan.btnText ?? 'Começar Agora'}
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
            {/* Dev mode — only visible in development */}
            {process.env.NODE_ENV === 'development' && (
              <button
                onClick={onDev}
                className="w-full py-1.5 text-[10px] font-bold text-gray-700 hover:text-gray-500 transition-colors"
              >
                ⚙ Ativar (Dev)
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
  const [open, setOpen] = useState(false);

  return (
    <div className="max-w-[1200px] mx-auto px-4 mt-12">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-center gap-3 py-4 text-sm font-bold text-gray-400 hover:text-white transition-colors group"
      >
        <span>Comparar todos os planos em detalhe</span>
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
                    Funcionalidade
                  </th>
                  {['Iniciante', 'Starter', 'Pro ⭐', 'Master', 'Elite'].map((name, i) => (
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
                {COMPARE_ROWS.map((row, ri) => (
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

const TrustBar = () => (
  <div className="flex flex-wrap justify-center items-center gap-8 md:gap-14 mt-16 mb-4 px-4">
    {[
      { icon: <Lock className="w-4 h-4 text-emerald-400" />,   label: 'SSL 256-bit',    sub: 'Criptografia bancária' },
      { icon: <Shield className="w-4 h-4 text-blue-400" />,    label: 'GDPR Compliant', sub: 'Lei europeia de dados' },
      { icon: <Gem className="w-4 h-4 text-purple-400" />,     label: 'Stripe Verified',sub: 'Pagamento seguro' },
      { icon: <CheckCircle2 className="w-4 h-4 text-cyan-400" />, label: 'Read-only',   sub: 'Nunca acessa sua corretora' },
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

// ─── Main component ───────────────────────────────────────────────────────────

const PremiumPlans: React.FC = () => {
  const { setPlan } = useStore();
  const [isAnnual, setIsAnnual] = useState(false);

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">

      {/* ── Header ── */}
      <div className="text-center space-y-5 max-w-2xl mx-auto pt-12 px-4">
        <div className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-4 py-1.5 rounded-full border border-emerald-500/20 text-xs font-black uppercase tracking-widest">
          <Crown className="w-3 h-3" /> Invista como um Profissional
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-[1.1]">
          Escolha seu caminho para a{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
            Liberdade.
          </span>
        </h1>
        <p className="text-gray-400 text-base leading-relaxed">
          Automatize sua estratégia, otimize seus impostos e deixe a IA cuidar do trabalho pesado.
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
            Mensal
          </button>
          <button
            onClick={() => setIsAnnual(true)}
            className={cn(
              'px-5 py-2.5 rounded-xl text-sm font-black transition-all flex items-center gap-2',
              isAnnual ? 'bg-emerald-500 text-black shadow-md' : 'text-gray-400 hover:text-white',
            )}
          >
            Anual
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

      {/* ── Cards ── */}
      <div className="relative">
        {/* Glow behind featured card */}
        <div className="absolute left-1/2 -translate-x-1/2 top-0 w-72 h-full pointer-events-none">
          <div className="absolute inset-0 bg-emerald-500/10 blur-[80px] rounded-full" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-5 max-w-[1400px] mx-auto px-4 items-stretch relative z-10">
          {PLANS.map(plan => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isAnnual={isAnnual}
              isCurrent={plan.isFree}
              onAction={() => plan.paymentKey && openPaymentLink(plan.paymentKey as any)}
              onDev={() => plan.storeKey && setPlan(plan.storeKey as any)}
            />
          ))}
        </div>
      </div>

      {/* ── Annual savings callout ── */}
      {isAnnual && (
        <div className="text-center animate-in fade-in slide-in-from-top-2 duration-300">
          <p className="text-sm text-emerald-400 font-bold">
            🎉 No plano anual você economiza até{' '}
            <span className="text-white">R$ 199,92/ano</span> no Elite
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
            <span className="text-white font-bold">Cancele quando quiser.</span>{' '}
            Sem multa, sem burocracia. No plano anual, você mantém o acesso até o fim do período.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PremiumPlans;
