import { useMonthlyDecisions } from '../hooks/useMonthlyDecisions';
import { ArrowUpRight, ArrowDownRight, TrendingUp, Scale, Info, DollarSign, Clock } from 'lucide-react';
import { cn } from '../lib/utils';
import { Link } from 'react-router-dom';

const MonthlyDecisionsWidget: React.FC = () => {
  const { decisions } = useMonthlyDecisions();

  if (decisions.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-6 border border-white/5">
        <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2 mb-4">
          <Scale className="w-4 h-4 text-emerald-500" /> Decisões do Mês
        </h3>
        <div className="text-center py-4 text-gray-500 text-sm">
          <p>Nenhuma ação recomendada no momento.</p>
          <p className="text-xs mt-2">Continue fazendo aportes regulares.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl p-6 border border-white/5">
      <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2 mb-4">
        <Scale className="w-4 h-4 text-emerald-500" /> Decisões do Mês
      </h3>
      <div className="space-y-3">
        {decisions.map((decision) => (
          <div 
            key={decision.id}
            className={cn(
              "p-4 rounded-xl border",
              decision.priority === 'high' ? "bg-emerald-500/5 border-emerald-500/20" :
              decision.priority === 'medium' ? "bg-blue-500/5 border-blue-500/20" :
              "bg-white/5 border-white/5"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {decision.type === 'buy' && <ArrowUpRight className="w-4 h-4 text-emerald-400" />}
                  {decision.type === 'sell' && <ArrowDownRight className="w-4 h-4 text-red-400" />}
                  {decision.type === 'rebalance' && <Scale className="w-4 h-4 text-blue-400" />}
                  {decision.type === 'exchange' && <TrendingUp className="w-4 h-4 text-amber-400" />}
                  <span className={cn(
                    "text-xs font-bold uppercase",
                    decision.priority === 'high' ? "text-emerald-400" :
                    decision.priority === 'medium' ? "text-blue-400" :
                    "text-gray-400"
                  )}>
                    {decision.priority}
                  </span>
                </div>
                <p className="text-sm font-bold text-white">{decision.title}</p>
                <p className="text-xs text-gray-400 mt-1">{decision.description}</p>
              </div>
              {decision.asset && (
                <Link 
                  to={'/market'}
                  className="text-xs font-black text-emerald-400 hover:text-emerald-300 uppercase"
                >
                  Ver no Mercado
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MonthlyDecisionsWidget;