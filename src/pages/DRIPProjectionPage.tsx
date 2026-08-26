import React, { useState, useMemo } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, Legend } from 'recharts';
import { TrendingUp, Target, Zap, ArrowRight, RotateCcw, DollarSign } from 'lucide-react';
import { useDRIP } from '../hooks/useDRIP';
import { formatCurrency } from '../lib/utils';

const HORIZON_OPTIONS = [
  { value: 24, label: '2 anos' },
  { value: 60, label: '5 anos' },
  { value: 120, label: '10 anos' },
  { value: 180, label: '15 anos' },
  { value: 240, label: '20 anos' },
  { value: 360, label: '30 anos' },
];

const DY_OPTIONS = [4, 6, 8, 10, 12, 15];
const GROWTH_OPTIONS = [0, 3, 5, 7, 10];

export default function DRIPProjectionPage() {
  const { config, setConfig, result, portfolioMetrics, monthsToGoal, suggestion, targetIncome } = useDRIP();
  const [showConfig, setShowConfig] = useState(false);

  const chartData = useMemo(() => {
    // Sample every N months to avoid too many data points
    const step = result.projections.length > 120 ? 3 : result.projections.length > 60 ? 2 : 1;
    return result.projections
      .filter((_, i) => i % step === 0 || i === result.projections.length - 1)
      .map(p => ({
        label: p.label,
        month: p.month,
        portfolio: Math.round(p.portfolioValue),
        income: Math.round(p.monthlyIncome),
        reinvested: Math.round(p.dividendsReinvested),
        contribution: p.monthlyContribution,
      }));
  }, [result]);

  const incomeChartData = useMemo(() => {
    const step = result.projections.length > 120 ? 6 : result.projections.length > 60 ? 3 : 1;
    return result.projections
      .filter((_, i) => i % step === 0 || i === result.projections.length - 1)
      .map(p => ({
        label: p.label,
        income: Math.round(p.monthlyIncome),
        target: targetIncome,
      }));
  }, [result, targetIncome]);

  const years = Math.floor(result.totalMonths / 12);
  const remainingMonths = result.totalMonths % 12;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Projeção de Dividendos</h1>
          <p className="text-gray-400 text-sm mt-1">Simulação composta com reinvestimento (DRIP)</p>
        </div>
        <button
          onClick={() => setShowConfig(!showConfig)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 transition-all text-sm font-bold"
        >
          <RotateCcw className="w-4 h-4" />
          {showConfig ? 'Ocultar Config' : 'Ajustar Parâmetros'}
        </button>
      </div>

      {/* Configuration Panel */}
      {showConfig && (
        <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 space-y-6">
          <h3 className="text-white font-bold text-sm uppercase tracking-wider">Parâmetros da Simulação</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Monthly Contribution */}
            <div className="space-y-2">
              <label className="text-gray-400 text-xs font-bold uppercase">Aporte Mensal</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">R$</span>
                <input
                  type="number"
                  value={config.monthlyContribution ?? 1000}
                  onChange={e => setConfig(c => ({ ...c, monthlyContribution: Number(e.target.value) }))}
                  className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm focus:border-emerald-500/50 focus:outline-none"
                />
              </div>
            </div>

            {/* Dividend Yield */}
            <div className="space-y-2">
              <label className="text-gray-400 text-xs font-bold uppercase">DY Anual</label>
              <div className="flex gap-1">
                {DY_OPTIONS.map(dy => (
                  <button
                    key={dy}
                    onClick={() => setConfig(c => ({ ...c, annualDividendYield: dy }))}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                      (config.annualDividendYield ?? 8) === dy
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-white/5 text-gray-500 hover:text-white border border-transparent'
                    }`}
                  >
                    {dy}%
                  </button>
                ))}
              </div>
            </div>

            {/* Growth Rate */}
            <div className="space-y-2">
              <label className="text-gray-400 text-xs font-bold uppercase">Valorização/ano</label>
              <div className="flex gap-1">
                {GROWTH_OPTIONS.map(g => (
                  <button
                    key={g}
                    onClick={() => setConfig(c => ({ ...c, annualGrowthRate: g }))}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                      (config.annualGrowthRate ?? 5) === g
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        : 'bg-white/5 text-gray-500 hover:text-white border border-transparent'
                    }`}
                  >
                    {g}%
                  </button>
                ))}
              </div>
            </div>

            {/* Horizon */}
            <div className="space-y-2">
              <label className="text-gray-400 text-xs font-bold uppercase">Horizonte</label>
              <select
                value={config.months ?? 120}
                onChange={e => setConfig(c => ({ ...c, months: Number(e.target.value) }))}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-emerald-500/50 focus:outline-none"
              >
                {HORIZON_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Reinvest Toggle */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setConfig(c => ({ ...c, reinvestDividends: !c.reinvestDividends }))}
              className={`relative w-12 h-6 rounded-full transition-all ${
                config.reinvestDividends ? 'bg-emerald-500' : 'bg-gray-700'
              }`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                config.reinvestDividends ? 'left-7' : 'left-1'
              }`} />
            </button>
            <span className="text-gray-300 text-sm font-bold">Reinvestir dividendos (juros compostos)</span>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <span className="text-gray-400 text-xs font-bold uppercase">Patrimônio Final</span>
          </div>
          <p className="text-2xl font-black text-white">{formatCurrency(result.finalPortfolioValue, 'BRL')}</p>
          <p className="text-emerald-400 text-xs mt-1 font-bold">em {years}a {remainingMonths}m</p>
        </div>

        <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-blue-400" />
            <span className="text-gray-400 text-xs font-bold uppercase">Renda Mensal</span>
          </div>
          <p className="text-2xl font-black text-white">{formatCurrency(result.finalMonthlyIncome, 'BRL')}</p>
          <p className="text-blue-400 text-xs mt-1 font-bold">projeção final</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-purple-400" />
            <span className="text-gray-400 text-xs font-bold uppercase">Meta: {formatCurrency(targetIncome, 'BRL')}/mês</span>
          </div>
          {monthsToGoal ? (
            <>
              <p className="text-2xl font-black text-white">{Math.floor(monthsToGoal / 12)}a {monthsToGoal % 12}m</p>
              <p className="text-purple-400 text-xs mt-1 font-bold">para atingir meta</p>
            </>
          ) : (
            <>
              <p className="text-lg font-black text-amber-400">Aumente aporte</p>
              <p className="text-gray-500 text-xs mt-1 font-bold">meta inatingível no horizonte</p>
            </>
          )}
        </div>

        <div className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/20 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="text-gray-400 text-xs font-bold uppercase">Milhas</span>
          </div>
          <p className="text-2xl font-black text-white">{result.milestones.length}</p>
          <p className="text-amber-400 text-xs mt-1 font-bold">marcos atingidos</p>
        </div>
      </div>

      {/* Portfolio Evolution Chart */}
      <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6">
        <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-4">Evolução do Patrimônio</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="portfolioGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="label" tick={{ fill: '#6b7280', fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                formatter={(value: number) => [formatCurrency(value, 'BRL')]}
              />
              <Area type="monotone" dataKey="portfolio" stroke="#10b981" fill="url(#portfolioGrad)" strokeWidth={2} name="Patrimônio" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Income vs Target Chart */}
      <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6">
        <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-4">Renda Mensal vs Meta</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={incomeChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="label" tick={{ fill: '#6b7280', fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(1)}k`} />
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                formatter={(value: number) => [formatCurrency(value, 'BRL')]}
              />
              <Legend />
              <Line type="monotone" dataKey="income" stroke="#3b82f6" strokeWidth={2} dot={false} name="Renda Mensal" />
              <Line type="monotone" dataKey="target" stroke="#f59e0b" strokeWidth={1} strokeDasharray="5 5" dot={false} name="Meta" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Monthly Breakdown Chart */}
      <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6">
        <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-4">Composição Mensal: Aporte + Dividendos Reinvestidos</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="label" tick={{ fill: '#6b7280', fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                formatter={(value: number) => [formatCurrency(value, 'BRL')]}
              />
              <Legend />
              <Bar dataKey="contribution" fill="#6366f1" name="Aporte" radius={[2, 2, 0, 0]} />
              <Bar dataKey="reinvested" fill="#10b981" name="Div. Reinvestidos" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Milestones Timeline */}
      {result.milestones.length > 0 && (
        <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6">
          <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-4">Marcos da Jornada</h3>
          <div className="space-y-3">
            {result.milestones.map((ms, idx) => (
              <div key={idx} className="flex items-center gap-4 p-3 bg-white/[0.02] rounded-xl border border-white/5">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                  <Target className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="flex-1">
                  <p className="text-white font-bold text-sm">{ms.label}</p>
                  <p className="text-gray-400 text-xs">{ms.description}</p>
                </div>
                <div className="text-right">
                  <p className="text-emerald-400 font-bold text-sm">
                    Mês {ms.month}
                  </p>
                  <p className="text-gray-500 text-xs">
                    {Math.floor(ms.month / 12)}a {ms.month % 12}m
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suggestion Card */}
      <div className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/20 rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
            <Zap className="w-6 h-6 text-emerald-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-white font-bold text-sm mb-2">Recomendação Personalizada</h3>
            <p className="text-gray-300 text-sm leading-relaxed">{suggestion.suggestion}</p>
            {suggestion.amountNeeded > 0 && (
              <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
                <ArrowRight className="w-3 h-3" />
                <span>Faltam {formatCurrency(suggestion.amountNeeded, 'BRL')} em patrimônio para a meta</span>
                {suggestion.monthsAtCurrentPace && (
                  <span className="text-emerald-400 font-bold">
                    (~{Math.floor(suggestion.monthsAtCurrentPace / 12)}a {suggestion.monthsAtCurrentPace % 12}m no ritmo atual)
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Current Portfolio Context */}
      <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6">
        <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-4">Contexto Atual do Portfólio</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-gray-500 text-xs uppercase font-bold">Patrimônio Atual</p>
            <p className="text-white font-bold text-lg">{formatCurrency(portfolioMetrics.totalValue, 'BRL')}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs uppercase font-bold">Renda Mensal Atual</p>
            <p className="text-white font-bold text-lg">{formatCurrency(portfolioMetrics.monthlyIncome, 'BRL')}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs uppercase font-bold">DY Ponderado</p>
            <p className="text-white font-bold text-lg">{portfolioMetrics.weightedDY.toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs uppercase font-bold">Aporte Configurado</p>
            <p className="text-white font-bold text-lg">{formatCurrency(config.monthlyContribution ?? 1000, 'BRL')}/mês</p>
          </div>
        </div>
      </div>
    </div>
  );
}
