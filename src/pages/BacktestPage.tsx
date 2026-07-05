import React, { useState } from 'react';
import { useBacktest, BacktestInput } from '../hooks/useBacktest';
import { formatCurrency } from '../lib/utils';
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  Target,
  BarChart3,
  Clock,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Zap,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const BacktestPage: React.FC = () => {
  const { result, isLoading, history, runBacktest, clearHistory, removeFromHistory } = useBacktest();
  const [input, setInput] = useState<BacktestInput>({
    ticker: '',
    startDate: '',
    investedAmount: 10000,
  });
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!input.ticker || !input.startDate || input.investedAmount <= 0) {
      setError('Preencha todos os campos corretamente.');
      return;
    }

    try {
      runBacktest(input);
    } catch (err) {
      setError((err as Error).message || 'Erro ao executar backtest');
    }
  };

  // Chart data (simulated evolution)
  const chartData = result
    ? Array.from({ length: Math.min(result.daysElapsed, 60) }, (_, i) => {
        const progress = i / (Math.min(result.daysElapsed, 60) - 1);
        const myValue = input.investedAmount + (result.totalReturn - input.investedAmount) * progress;
        const cdiValue = input.investedAmount + result.cdiProfit * progress;
        const ibovValue = input.investedAmount + result.ibovProfit * progress;
        return {
          name: `Dia ${Math.round(progress * result.daysElapsed)}`,
          'Minha Estrategia': Math.round(myValue),
          CDI: Math.round(cdiValue),
          Ibovespa: Math.round(ibovValue),
        };
      })
    : [];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">Backtesting</h1>
            <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
              PRO
            </span>
          </div>
          <p className="text-gray-400 text-sm">
            Simule "E se tivesse comprado X reais em TICKER em DATA?" e compare com CDI e Ibovespa.
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-[#0B1C17] border border-white/10 rounded-2xl p-6 shadow-lg">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-emerald-500" />
          Configurar Backtest
        </h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Ticker
            </label>
            <input
              type="text"
              value={input.ticker}
              onChange={e => setInput({ ...input, ticker: e.target.value.toUpperCase() })}
              placeholder="Ex: PETR4"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Data Inicial
            </label>
            <input
              type="date"
              value={input.startDate}
              onChange={e => setInput({ ...input, startDate: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Valor Investido (R$)
            </label>
            <input
              type="number"
              value={input.investedAmount}
              onChange={e => setInput({ ...input, investedAmount: Number(e.target.value) })}
              min={100}
              step={100}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50"
              required
            />
          </div>
          <div className="md:col-span-3">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Calculando...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Executar Backtest
                </>
              )}
            </button>
          </div>
        </form>
        {error && (
          <div className="mt-4 bg-red-500/10 border border-red-500/20 p-3 rounded-xl flex items-center gap-2 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}
      </div>

      {/* Results */}
      {result && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Minha Estrategia */}
            <div className="bg-[#0B1C17] border border-white/5 rounded-2xl p-6 shadow-lg">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-emerald-500" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Minha Estrategia</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider">Valor Atual</div>
                  <div className="text-2xl font-black text-white">{formatCurrency(result.currentValue, 'BRL')}</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className={result.profitLoss >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                    {result.profitLoss >= 0 ? (
                      <TrendingUp className="w-4 h-4 inline" />
                    ) : (
                      <TrendingDown className="w-4 h-4 inline" />
                    )}
                    <span className="text-sm font-bold ml-1">
                      {formatCurrency(result.profitLoss, 'BRL')} ({result.profitLossPct.toFixed(2)}%)
                    </span>
                  </div>
                </div>
                <div className="pt-3 border-t border-white/5">
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider">Dividendos Recebidos</div>
                  <div className="text-lg font-bold text-emerald-400">
                    {formatCurrency(result.dividendsReceived, 'BRL')}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider">Retorno Total</div>
                  <div className="text-lg font-bold text-white">
                    {formatCurrency(result.totalReturn, 'BRL')}
                    <span className="text-xs text-gray-400 ml-2">({result.totalReturnPct.toFixed(2)}%)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* CDI */}
            <div className="bg-[#0B1C17] border border-white/5 rounded-2xl p-6 shadow-lg">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="w-5 h-5 text-blue-500" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">CDI (Selic)</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider">Valor Corrigido</div>
                  <div className="text-2xl font-black text-white">{formatCurrency(result.cdiValue, 'BRL')}</div>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-400 inline" />
                  <span className="text-sm font-bold text-blue-400 ml-1">
                    +{formatCurrency(result.cdiProfit, 'BRL')} ({result.cdiProfitPct.toFixed(2)}%)
                  </span>
                </div>
                <div className="pt-3 border-t border-white/5">
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider">Taxa Anual</div>
                  <div className="text-lg font-bold text-blue-400">{(result.cdiRate * 100).toFixed(2)}%</div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mt-2">
                    {result.beatCDI ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-400" />
                    )}
                    <span className={`text-xs font-bold ${result.beatCDI ? 'text-emerald-400' : 'text-red-400'}`}>
                      {result.beatCDI ? 'Bateu o CDI' : 'Perdeu para o CDI'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Ibovespa */}
            <div className="bg-[#0B1C17] border border-white/5 rounded-2xl p-6 shadow-lg">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-purple-500" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Ibovespa</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider">Valor Corrigido</div>
                  <div className="text-2xl font-black text-white">{formatCurrency(result.ibovValue, 'BRL')}</div>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-purple-400 inline" />
                  <span className="text-sm font-bold text-purple-400 ml-1">
                    +{formatCurrency(result.ibovProfit, 'BRL')} ({result.ibovProfitPct.toFixed(2)}%)
                  </span>
                </div>
                <div className="pt-3 border-t border-white/5">
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider">Taxa Anual (proxy)</div>
                  <div className="text-lg font-bold text-purple-400">{(result.ibovRate * 100).toFixed(2)}%</div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mt-2">
                    {result.beatIBOV ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-400" />
                    )}
                    <span className={`text-xs font-bold ${result.beatIBOV ? 'text-emerald-400' : 'text-red-400'}`}>
                      {result.beatIBOV ? 'Bateu o IBOV' : 'Perdeu para o IBOV'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="bg-[#0B1C17] border border-white/5 rounded-2xl p-6 shadow-lg">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-500" />
              Evolucao Comparativa
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#9ca3af', fontSize: 10 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                />
                <YAxis
                  tick={{ fill: '#9ca3af', fontSize: 10 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0B1C17',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    color: '#fff',
                  }}
                  formatter={(value: number) => formatCurrency(value, 'BRL')}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="Minha Estrategia"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                />
                <Line type="monotone" dataKey="CDI" stroke="#3b82f6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Ibovespa" stroke="#a855f7" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Details */}
          <div className="bg-[#0B1C17] border border-white/5 rounded-2xl p-6 shadow-lg">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-500" />
              Detalhes do Backtest
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white/5 rounded-xl p-3">
                <span className="text-xs text-gray-400 block mb-1">Ticker</span>
                <span className="text-lg font-bold text-white">{result.ticker}</span>
              </div>
              <div className="bg-white/5 rounded-xl p-3">
                <span className="text-xs text-gray-400 block mb-1">Cotras Compradas</span>
                <span className="text-lg font-bold text-white">{result.sharesBought}</span>
              </div>
              <div className="bg-white/5 rounded-xl p-3">
                <span className="text-xs text-gray-400 block mb-1">Preco Medio Pago</span>
                <span className="text-lg font-bold text-white">
                  {formatCurrency(result.avgPricePaid, 'BRL')}
                </span>
              </div>
              <div className="bg-white/5 rounded-xl p-3">
                <span className="text-xs text-gray-400 block mb-1">Dias Decorridos</span>
                <span className="text-lg font-bold text-white">{result.daysElapsed}</span>
              </div>
              <div className="bg-white/5 rounded-xl p-3">
                <span className="text-xs text-gray-400 block mb-1">Data Inicial</span>
                <span className="text-sm font-bold text-white">
                  {new Date(result.startDate).toLocaleDateString('pt-BR')}
                </span>
              </div>
              <div className="bg-white/5 rounded-xl p-3">
                <span className="text-xs text-gray-400 block mb-1">Data Final</span>
                <span className="text-sm font-bold text-white">
                  {new Date(result.endDate).toLocaleDateString('pt-BR')}
                </span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="bg-[#0B1C17] border border-white/5 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-500" />
              Historico de Backtests
            </h3>
            <button
              onClick={clearHistory}
              className="text-xs text-gray-400 hover:text-red-400 flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              Limpar
            </button>
          </div>
          <div className="space-y-2">
            {history.map(h => (
              <div
                key={h.id}
                className="flex items-center justify-between p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <span className="text-sm font-bold text-white">{h.result.ticker}</span>
                  <span className="text-xs text-gray-400">
                    {new Date(h.input.startDate).toLocaleDateString('pt-BR')}
                  </span>
                  <span className="text-xs text-gray-400">
                    {formatCurrency(h.input.investedAmount, 'BRL')}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span
                    className={`text-sm font-bold ${
                      h.result.totalReturnPct >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {h.result.totalReturnPct.toFixed(2)}%
                  </span>
                  <button
                    onClick={() => removeFromHistory(h.id)}
                    className="text-gray-500 hover:text-red-400"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BacktestPage;
