import React, { useState, useMemo } from 'react';
import { Target, TrendingUp, DollarSign, Calendar, ArrowRight, Sparkles } from 'lucide-react';
import { useStore } from '../store/useStore';
import { formatCurrency, formatPercent } from '../lib/utils';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Link } from 'react-router-dom';

const FinancialIndependenceSimulator: React.FC = () => {
  const { portfolio, assets, settings } = useStore();
  const [monthlyExpenseTarget, setMonthlyExpenseTarget] = useState<number>(5000);
  const [targetDate, setTargetDate] = useState<string>('');

  const monthlyIncomeBRL = useMemo(() => {
    return portfolio.reduce((acc, item) => {
      const asset = assets.find(a => a.id === item.assetId);
      if (!asset) return acc;
      const annualDividend = asset.price * (asset.dividendYield / 100);
      const monthly = annualDividend / 12;
      return acc + (monthly * item.quantity);
    }, 0);
  }, [portfolio, assets]);

  const coveragePct = monthlyExpenseTarget > 0 
    ? (monthlyIncomeBRL / monthlyExpenseTarget) * 100 
    : 0;

  const projectedIncome = useMemo(() => {
    if (monthlyIncomeBRL <= 0) return 0;
    const monthsToTarget = monthlyExpenseTarget / monthlyIncomeBRL;
    const years = monthsToTarget * 20;
    
    // Projeção com aportes mensal (assumindo R$1000/mês)
    const monthlyContrib = 1000;
    let currentIncome = monthlyIncomeBRL;
    let months = 0;
    
    while (currentIncome < monthlyExpenseTarget && months < 360) {
      currentIncome += (monthlyContrib * 0.08) / 12; // 8% annual return
      months++;
    }
    
    return months > 0 ? months : 'N/A';
  }, [monthlyIncomeBRL, monthlyExpenseTarget]);

  const chartData = useMemo(() => {
    const data = [];
    let income = monthlyIncomeBRL;
    const monthlyContrib = 1000;
    
    for (let year = 0; year <= 10; year++) {
      data.push({
        year: `Ano ${year}`,
        income: Math.round(income),
        target: monthlyExpenseTarget
      });
      for (let m = 0; m < 12; m++) {
        income += (monthlyContrib * 0.08) / 12;
      }
    }
    return data;
  }, [monthlyIncomeBRL, monthlyExpenseTarget]);

  return (
    <div className="bg-[#0B1C17] border border-white/10 rounded-3xl p-8 shadow-2xl">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-xl font-black text-white uppercase tracking-widest flex items-center gap-3">
          <Sparkles className="w-6 h-6 text-purple-400" />
          Simulador de Independência
        </h3>
        <Link to="/advisor" className="text-sm font-bold text-purple-400 hover:text-purple-300">
          Falar com AI →
        </Link>
      </div>

      {/* Input */}
      <div className="mb-8">
        <label className="text-sm text-gray-500 font-bold uppercase tracking-wider mb-2 block">
          Despesa Mensal Alvo (BRL)
        </label>
        <div className="flex gap-4">
          {[3000, 5000, 10000, 15000].map(amount => (
            <button
              key={amount}
              onClick={() => setMonthlyExpenseTarget(amount)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                monthlyExpenseTarget === amount 
                  ? 'bg-purple-500 text-white' 
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              {formatCurrency(amount, 'BRL')}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="bg-white/5 rounded-2xl p-6 border border-white/5">
          <div className="flex items-center gap-2 text-gray-500 mb-2">
            <DollarSign className="w-4 h-4" />
            <span className="text-xs font-bold uppercase">Renda Atual</span>
          </div>
          <div className="text-2xl font-black text-white">
            {formatCurrency(monthlyIncomeBRL, 'BRL')}
          </div>
          <div className="text-xs text-gray-500 mt-1">por mês</div>
        </div>

        <div className="bg-white/5 rounded-2xl p-6 border border-white/5">
          <div className="flex items-center gap-2 text-gray-500 mb-2">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs font-bold uppercase">Cobertura</span>
          </div>
          <div className={`text-2xl font-black ${
            coveragePct >= 100 ? 'text-emerald-400' : 
            coveragePct >= 50 ? 'text-amber-400' : 'text-red-400'
          }`}>
            {coveragePct.toFixed(0)}%
          </div>
          <div className="text-xs text-gray-500 mt-1">da meta</div>
        </div>

        <div className="bg-white/5 rounded-2xl p-6 border border-white/5">
          <div className="flex items-center gap-2 text-gray-500 mb-2">
            <Calendar className="w-4 h-4" />
            <span className="text-xs font-bold uppercase">Anos Restantes</span>
          </div>
          <div className="text-2xl font-black text-purple-400">
            {typeof projectedIncome === 'number' ? projectedIncome : projectedIncome}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {typeof projectedIncome === 'number' ? 'anos' : 'insuficiente'}
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-500">Progresso</span>
          <span className="font-bold text-white">{coveragePct.toFixed(1)}%</span>
        </div>
        <div className="h-3 bg-white/10 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all ${
              coveragePct >= 100 ? 'bg-emerald-500' : 
              coveragePct >= 50 ? 'bg-amber-500' : 'bg-red-500'
            }`}
            style={{ width: `${Math.min(100, coveragePct)}%` }}
          />
        </div>
      </div>

      {/* CTA */}
      {coveragePct < 100 && (
        <div className="text-center">
          <p className="text-gray-500 text-sm mb-4">
            Precisa de mais {formatCurrency(monthlyExpenseTarget - monthlyIncomeBRL, 'BRL')} por mês para atingir a independência.
          </p>
          <Link 
            to="/advisor"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-purple-500 hover:bg-purple-400 text-white font-bold rounded-xl transition-all"
          >
            <Sparkles className="w-4 h-4" />
            Ver Plano de Ação com AI
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {coveragePct >= 100 && (
        <div className="text-center p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
          <p className="text-emerald-400 font-bold">
            🎉 Parabéns! Já tens renda passiva para cobrir esta despesa!
          </p>
        </div>
      )}
    </div>
  );
};

export default FinancialIndependenceSimulator;