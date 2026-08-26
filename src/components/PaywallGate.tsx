/**
 * PaywallGate — Componente de paywall com preview de conteúdo bloqueado
 * 
 * Quando o usuário tenta acessar feature premium, mostra:
 * 1. O que está bloqueado (preview)
 * 2. O valor que está perdendo
 * 3. CTA de upgrade com plano recomendado
 */

import React from 'react';
import { Lock, Crown, ArrowRight, Check, Sparkles } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface PaywallGateProps {
  requiredPlan: 'starter' | 'pro' | 'master' | 'elite';
  featureName: string;
  description: string;
  benefits: string[];
  children: React.ReactNode;
}

const PLAN_CONFIG = {
  starter: { label: 'Starter', price: 'R$19', color: 'emerald', nextPlan: 'starter' },
  pro: { label: 'Ouro Pro', price: 'R$39', color: 'amber', nextPlan: 'pro' },
  master: { label: 'Platina', price: 'R$69', color: 'cyan', nextPlan: 'master' },
  elite: { label: 'Diamante', price: 'R$129', color: 'purple', nextPlan: 'elite' },
};

const PLAN_ORDER = ['free', 'starter', 'pro', 'master', 'elite'];

export default function PaywallGate({ requiredPlan, featureName, description, benefits, children }: PaywallGateProps) {
  const { settings } = useStore();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const currentPlan = settings.plan ?? 'free';
  const currentIdx = PLAN_ORDER.indexOf(currentPlan);
  const requiredIdx = PLAN_ORDER.indexOf(requiredPlan);

  // User has access
  if (currentIdx >= requiredIdx) {
    return <>{children}</>;
  }

  const config = PLAN_CONFIG[requiredPlan];

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="max-w-lg w-full space-y-6">
        {/* Lock Icon */}
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-500/5 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-amber-400" />
          </div>
          <h2 className="text-2xl font-black text-white mb-2">{featureName}</h2>
          <p className="text-gray-400 text-sm">{description}</p>
        </div>

        {/* Benefits */}
        <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-5 space-y-3">
          <h3 className="text-white font-bold text-xs uppercase tracking-wider">{t('paywall.benefitsTitle')}</h3>
          {benefits.map((benefit, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                <Check className="w-3 h-3 text-emerald-400" />
              </div>
              <span className="text-gray-300 text-sm">{benefit}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="space-y-3">
          <button
            onClick={() => navigate('/premium')}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-black font-black text-sm uppercase tracking-wider hover:from-emerald-400 hover:to-emerald-500 transition-all shadow-[0_0_30px_rgba(16,185,129,0.2)] hover:shadow-[0_0_40px_rgba(16,185,129,0.3)]"
          >
            <Crown className="w-4 h-4" />
            {t('paywall.upgradeTo', { plano: t(`layout.planFooter.${requiredPlan}`) })}
            <ArrowRight className="w-4 h-4" />
          </button>
          <p className="text-center text-gray-500 text-xs">
            {t('paywall.fromPrice', { preco: config.price })}
          </p>
        </div>

        {/* Current Plan */}
        <div className="text-center">
          <p className="text-gray-600 text-xs">
            {t('paywall.currentPlan')} <span className="text-gray-400 font-bold capitalize">{currentPlan}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * FeaturePreview — Mini preview de feature bloqueada (blur + lock)
 */
export function FeaturePreview({ children, requiredPlan }: { children: React.ReactNode; requiredPlan: string }) {
  const { t } = useTranslation();
  return (
    <div className="relative">
      {/* Blurred Content */}
      <div className="filter blur-sm opacity-30 pointer-events-none select-none">
        {children}
      </div>
      {/* Overlay */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto">
            <Sparkles className="w-5 h-5 text-amber-400" />
          </div>
          <p className="text-white font-bold text-sm">{t('paywall.previewContent', { plano: requiredPlan })}</p>
          <button
            onClick={() => window.location.href = '/premium'}
            className="text-amber-400 text-xs font-bold hover:text-amber-300 transition-colors"
          >
            {t('paywall.previewUnlock')}
          </button>
        </div>
      </div>
    </div>
  );
}
