import React, { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { generatePrescriptiveActions } from '../services/decisionEngine';
import { formatCurrency } from '../lib/utils';
import { 
  TrendingUp, AlertTriangle, Target, ArrowRight, Shield, 
  Zap, Calendar, DollarSign, Scale, Lightbulb, CheckCircle2 
} from 'lucide-react';

const PRIORITY_CONFIG = {
  critical: { color: 'border-red-500/30 bg-red-500/5', icon: AlertTriangle, iconColor: 'text-red-400', badge: 'bg-red-500/20 text-red-400 border-red-500/30', label: 'Crítico' },
  high: { color: 'border-amber-500/30 bg-amber-500/5', icon: Zap, iconColor: 'text-amber-400', badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30', label: 'Alto' },
  medium: { color: 'border-blue-500/30 bg-blue-500/5', icon: Lightbulb, iconColor: 'text-blue-400', badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30', label: 'Médio' },
  low: { color: 'border-gray-500/30 bg-gray-500/5', icon: CheckCircle2, iconColor: 'text-gray-400', badge: 'bg-gray-500/20 text-gray-400 border-gray-500/30', label: 'Baixo' },
};

const CATEGORY_CONFIG: Record<string, { icon: React.ElementType; color: string }> = {
  aporte: { icon: DollarSign, color: 'text-emerald-400' },
  fiscal: { icon: Shield, color: 'text-red-400' },
  rebalanceamento: { icon: Scale, color: 'text-blue-400' },
  oportunidade: { icon: Target, color: 'text-amber-400' },
  meta: { icon: TrendingUp, color: 'text-purple-400' },
  câmbio: { icon: ArrowRight, color: 'text-cyan-400' },
};

export default function DecisionCockpitPage() {
  const { portfolio, assets, transactions, settings } = useStore();

  const decisions = useMemo(() => {
    return generatePrescriptiveActions(portfolio, assets, transactions, settings);
  }, [portfolio, assets, transactions, settings]);

  const { summary } = decisions;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">Cockpit de Decisão</h1>
            <p className="text-gray-400 text-sm">O que fazer agora — {decisions.monthLabel}</p>
          </div>
        </div>
      </div>

      {/* Summary Bar */}
      <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-gray-500 text-xs uppercase font-bold">Ações do Mês</p>
            <p className="text-white font-black text-2xl">{summary.totalActions}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs uppercase font-bold">Críticas</p>
            <p className={`font-black text-2xl ${summary.criticalCount > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
              {summary.criticalCount}
            </p>
          </div>
          <div>
            <p className="text-gray-500 text-xs uppercase font-bold">Alta Prioridade</p>
            <p className={`font-black text-2xl ${summary.highCount > 0 ? 'text-amber-400' : 'text-gray-400'}`}>
              {summary.highCount}
            </p>
          </div>
          <div>
            <p className="text-gray-500 text-xs uppercase font-bold">Investimento Total</p>
            <p className="text-white font-black text-xl">{formatCurrency(summary.totalInvestmentNeeded, 'BRL')}</p>
          </div>
        </div>
      </div>

      {/* Top Priority */}
      {summary.topPriority && summary.topPriority !== 'Nenhuma ação pendente' && (
        <div className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/20 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
              <Target className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <p className="text-gray-400 text-xs font-bold uppercase mb-1">Prioridade #1</p>
              <p className="text-white font-bold text-lg">{summary.topPriority}</p>
            </div>
          </div>
        </div>
      )}

      {/* All Clear State */}
      {summary.totalActions === 0 && (
        <div className="text-center py-16">
          <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
          <h3 className="text-white font-bold text-xl mb-2">Tudo em ordem!</h3>
          <p className="text-gray-400 text-sm max-w-md mx-auto">
            Nenhuma ação crítica pendente. Seu portfólio está equilibrado e no caminho certo. Continue com os aportes mensais.
          </p>
        </div>
      )}

      {/* Action Cards */}
      <div className="space-y-4">
        {decisions.actions.map((action, idx) => {
          const priorityCfg = PRIORITY_CONFIG[action.priority];
          const categoryCfg = CATEGORY_CONFIG[action.category] || CATEGORY_CONFIG.aporte;
          const PriorityIcon = priorityCfg.icon;
          const CategoryIcon = categoryCfg.icon;

          return (
            <div
              key={action.id}
              className={`border rounded-2xl p-5 transition-all hover:border-white/20 ${priorityCfg.color}`}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    action.priority === 'critical' ? 'bg-red-500/20' :
                    action.priority === 'high' ? 'bg-amber-500/20' :
                    action.priority === 'medium' ? 'bg-blue-500/20' : 'bg-gray-500/20'
                  }`}>
                    <PriorityIcon className={`w-4 h-4 ${priorityCfg.iconColor}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-white font-bold text-sm">{action.title}</h3>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase ${priorityCfg.badge}`}>
                        {priorityCfg.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <CategoryIcon className={`w-3 h-3 ${categoryCfg.color}`} />
                      <span className="text-gray-500 text-xs capitalize">{action.category}</span>
                      {action.deadline && (
                        <>
                          <span className="text-gray-700">&middot;</span>
                          <Calendar className="w-3 h-3 text-gray-500" />
                          <span className="text-gray-500 text-xs">{action.deadline}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <span className="text-gray-600 text-xs font-bold">#{idx + 1}</span>
              </div>

              {/* Description */}
              <p className="text-gray-300 text-sm leading-relaxed mb-3">{action.description}</p>

              {/* Impact + Reason */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-white/[0.02] rounded-xl p-3 border border-white/5">
                  <p className="text-gray-500 text-[10px] font-bold uppercase mb-1">Por quê</p>
                  <p className="text-gray-300 text-xs">{action.reason}</p>
                </div>
                <div className="bg-emerald-500/5 rounded-xl p-3 border border-emerald-500/10">
                  <p className="text-emerald-400 text-[10px] font-bold uppercase mb-1">Impacto</p>
                  <p className="text-gray-300 text-xs">{action.impact}</p>
                </div>
              </div>

              {/* Amount */}
              {action.amount && action.amount > 0 && (
                <div className="mt-3 flex items-center gap-2">
                  <DollarSign className="w-3 h-3 text-gray-500" />
                  <span className="text-gray-400 text-xs">
                    Valor sugerido: <span className="text-white font-bold">{formatCurrency(action.amount, action.currency || 'BRL')}</span>
                  </span>
                  {action.ticker && (
                    <span className="text-emerald-400 text-xs font-bold ml-2">({action.ticker})</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer Note */}
      <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 text-center">
        <p className="text-gray-500 text-xs">
          Decisões geradas com base no seu portfólio, metas, alocação-alvo e contexto fiscal.
          <br />
          <span className="text-gray-600">Atualizado em {new Date(decisions.generatedAt).toLocaleString('pt-BR')}</span>
        </p>
      </div>
    </div>
  );
}
