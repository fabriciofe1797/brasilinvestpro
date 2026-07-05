import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { getPortfolio, getPortfolioTimeseries, getQuotesDetailed } from '../services/database';
import { formatCurrency, applyTickerAlias } from '../lib/utils';
import { BarChart3, TrendingUp, TrendingDown, PieChart, Crown, Clock } from 'lucide-react';
import { useStore } from '../store/useStore';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { fetchBatchQuotes } from '../services/api';

const PremiumAnalytics: React.FC = () => {
  const { getToken } = useAuth();
  const { settings } = useStore();
  const [data, setData] = useState<Array<{ ticker: string; qty: number; avg_cost: number; last_price: number; unrealized_pnl: number }>>([]);
  const [tsData, setTsData] = useState<Array<{ date: string; invested: number; equity: number; unrealized_pnl: number }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshed, setRefreshed] = useState(false);
  const [quoteSources, setQuoteSources] = useState<Record<string, string>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastQuotesUpdate, setLastQuotesUpdate] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = await getToken({ template: 'supabase' });
        if (!token) throw new Error('token_missing');
        const [portfolio, timeseries] = await Promise.all([
          getPortfolio(token),
          getPortfolioTimeseries(token)
        ]);
        setData(portfolio);
        setTsData(timeseries);
      } catch (e: any) {
        setError(e?.message || 'failed');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [getToken]);

  useEffect(() => {
    const refreshQuotes = async () => {
      try {
        setIsRefreshing(true);
        const token = await getToken({ template: 'supabase' });
        if (!token) return;
        const tickersToRefresh = Array.from(
          new Set(
            data
              .filter(d => d.last_price === 0)
              .map(d => applyTickerAlias(d.ticker))
          )
        );
        if (tickersToRefresh.length === 0) {
          setRefreshed(true);
          return;
        }
        const { prices, sources, updatedAt } = await getQuotesDetailed(tickersToRefresh, token);
        let next = data.map(p => {
          const key = applyTickerAlias(p.ticker);
          const newPrice = prices[key] ?? prices[p.ticker];
          if (typeof newPrice === 'number' && newPrice > 0) {
            const invested = p.qty * p.avg_cost;
            const market = p.qty * newPrice;
            const pnl = market - invested;
            return { ...p, last_price: newPrice, unrealized_pnl: pnl };
          }
          return p;
        });
        const stillZero = next.filter(n => n.last_price === 0).map(n => n.ticker);
        if (stillZero.length > 0) {
          const mapped = stillZero.map(t => applyTickerAlias(t));
          const batch = await fetchBatchQuotes(mapped);
          const bySymbol: Record<string, number> = {};
          for (const it of batch || []) {
            const sym = String(it?.ticker || '').toUpperCase();
            const px = Number(it?.price ?? 0);
            if (sym && px > 0) bySymbol[sym] = px;
          }
          next = next.map(p => {
            if (p.last_price > 0) return p;
            const look = applyTickerAlias(p.ticker);
            const newPx = bySymbol[look];
            if (typeof newPx === 'number' && newPx > 0) {
              const invested = p.qty * p.avg_cost;
              const market = p.qty * newPx;
              const pnl = market - invested;
              return { ...p, last_price: newPx, unrealized_pnl: pnl };
            }
            return p;
          });
          const newSources: Record<string, string> = { ...(sources || {}) };
          for (const t of stillZero) {
            const s = applyTickerAlias(t);
            if (bySymbol[s] != null) newSources[t] = 'brapi';
          }
          setQuoteSources(newSources);
        } else {
          setQuoteSources(sources || {});
        }
        setData(next);
        const latestUpdate = Object.values(updatedAt || {}).sort().at(-1) || new Date().toISOString();
        setLastQuotesUpdate(latestUpdate);
      } catch {
        console.warn('Falha ao atualizar cotações do portfólio');
      }
      finally {
        setRefreshed(true);
        setIsRefreshing(false);
      }
    };
    if (!refreshed && data.length > 0) {
      refreshQuotes();
    }
  }, [data, refreshed, getToken]);

  const totals = useMemo(() => {
    const invested = data.reduce((acc, p) => acc + p.qty * p.avg_cost, 0);
    const market = data.reduce((acc, p) => acc + p.qty * p.last_price, 0);
    const pnl = market - invested;
    return { invested, market, pnl };
  }, [data]);

  const topWinners = useMemo(() => {
    return [...data].sort((a, b) => b.unrealized_pnl - a.unrealized_pnl).slice(0, 5);
  }, [data]);

  const topLosers = useMemo(() => {
    return [...data].sort((a, b) => a.unrealized_pnl - b.unrealized_pnl).slice(0, 5);
  }, [data]);

  const concentration = useMemo(() => {
    const total = data.reduce((acc, p) => acc + p.qty * p.last_price, 0);
    return data.map(p => ({
      ticker: p.ticker,
      weight: total > 0 ? (p.qty * p.last_price) / total : 0
    })).sort((a, b) => b.weight - a.weight).slice(0, 5);
  }, [data]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Insights Premium</h1>
          <p className="text-gray-400 text-sm">Visão analítica do portfólio com P/L não realizado.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (data.length === 0) return;
              setRefreshed(false);
              setIsRefreshing(true);
            }}
            disabled={isRefreshing || data.length === 0}
            className="px-4 py-2 rounded-xl border border-emerald-500/60 text-xs font-bold text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isRefreshing ? 'Atualizando cotações...' : 'Atualizar cotações'}
          </button>
          {lastQuotesUpdate && (
            <div className="flex items-center gap-1 text-[10px] text-gray-500">
              <Clock className="w-3 h-3" />
              <span>
                Atualizado em {new Date(lastQuotesUpdate).toLocaleString('pt-BR')}
              </span>
            </div>
          )}
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <Crown className="w-5 h-5" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#0B1C17] border border-white/5 rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20">
            <BarChart3 className="w-16 h-16 text-emerald-500" />
          </div>
          <div className="relative z-10">
            <div className="text-xs text-gray-400 font-bold uppercase">Investido</div>
            <div className="text-2xl font-bold text-white">{formatCurrency(totals.invested, settings.baseCurrency)}</div>
          </div>
        </div>
        <div className="bg-[#0B1C17] border border-white/5 rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20">
            <PieChart className="w-16 h-16 text-blue-500" />
          </div>
          <div className="relative z-10">
            <div className="text-xs text-gray-400 font-bold uppercase">Valor de Mercado</div>
            <div className="text-2xl font-bold text-white">{formatCurrency(totals.market, settings.baseCurrency)}</div>
          </div>
        </div>
        <div className="bg-[#0B1C17] border border-white/5 rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20">
            {totals.pnl >= 0 ? <TrendingUp className="w-16 h-16 text-emerald-500" /> : <TrendingDown className="w-16 h-16 text-red-500" />}
          </div>
          <div className="relative z-10">
            <div className="text-xs text-gray-400 font-bold uppercase">P/L Não Realizado</div>
            <div className={`text-2xl font-bold ${totals.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {formatCurrency(totals.pnl, settings.baseCurrency)}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl">
          {error}
        </div>
      )}

      <div className="bg-[#0B1C17] border border-white/5 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 bg-[#0F2922] border-b border-white/5 text-white font-bold">Evolução do P/L Não Realizado</div>
        <div className="p-4 h-64 md:h-80">
          {tsData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-500 text-sm">Sem dados suficientes para histórico.</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={tsData}>
                <defs>
                  <linearGradient id="equityColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.6}/>
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="pnlColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.6}/>
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickFormatter={(v) => formatCurrency(v, settings.baseCurrency)} />
                <Tooltip
                  formatter={(value: any) => formatCurrency(Number(value), settings.baseCurrency)}
                  labelFormatter={(label) => new Date(label).toLocaleDateString('pt-BR')}
                  contentStyle={{ backgroundColor: '#020617', borderRadius: 12, border: '1px solid rgba(148,163,184,0.4)' }}
                  labelStyle={{ color: '#e5e7eb' }}
                />
                <Legend />
                <Area type="monotone" dataKey="equity" name="Valor de Mercado" stroke="#22c55e" fill="url(#equityColor)" strokeWidth={2} />
                <Area type="monotone" dataKey="unrealized_pnl" name="P/L Não Realizado" stroke="#38bdf8" fill="url(#pnlColor)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[#0B1C17] border border-white/5 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 bg-[#0F2922] border-b border-white/5 text-white font-bold">Top Ganhadores</div>
          <div className="p-4 space-y-2">
            {topWinners.map(w => (
              <div key={w.ticker} className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">{w.ticker.slice(0,2)}</div>
                  <div className="text-sm text-white font-bold">{w.ticker}</div>
                </div>
                <div className="text-xs text-gray-400">
                  {w.qty} @ {formatCurrency(w.avg_cost, settings.baseCurrency)}
                </div>
                <div className="text-sm font-bold text-emerald-400">
                  {formatCurrency(w.unrealized_pnl, settings.baseCurrency)}
                </div>
              </div>
            ))}
            {topWinners.length === 0 && <div className="text-gray-500 text-sm">Sem dados.</div>}
          </div>
        </div>
        <div className="bg-[#0B1C17] border border-white/5 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 bg-[#0F2922] border-b border-white/5 text-white font-bold">Top Perdas</div>
          <div className="p-4 space-y-2">
            {topLosers.map(w => (
              <div key={w.ticker} className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center font-bold">{w.ticker.slice(0,2)}</div>
                  <div className="text-sm text-white font-bold">{w.ticker}</div>
                </div>
                <div className="text-xs text-gray-400">
                  {w.qty} @ {formatCurrency(w.avg_cost, settings.baseCurrency)}
                </div>
                <div className="text-sm font-bold text-red-400">
                  {formatCurrency(w.unrealized_pnl, settings.baseCurrency)}
                </div>
              </div>
            ))}
            {topLosers.length === 0 && <div className="text-gray-500 text-sm">Sem dados.</div>}
          </div>
        </div>
      </div>

      <div className="bg-[#0B1C17] border border-white/5 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 bg-[#0F2922] border-b border-white/5 text-white font-bold">Concentração</div>
        <div className="p-6 space-y-3">
          {concentration.map(c => (
            <div key={c.ticker}>
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span className="font-bold text-white">{c.ticker}</span>
                <span>{(c.weight * 100).toFixed(1)}%</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500" style={{ width: `${c.weight * 100}%` }} />
              </div>
            </div>
          ))}
          {concentration.length === 0 && <div className="text-gray-500 text-sm">Sem dados.</div>}
        </div>
      </div>

      <div className="bg-[#0B1C17] border border-white/5 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 bg-[#0F2922] border-b border-white/5 text-white font-bold">Tabela Detalhada</div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#0F2922] border-b border-white/5">
              <tr>
                <th className="py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider">Ticker</th>
                <th className="py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Qtd</th>
                <th className="py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">PM</th>
                <th className="py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Preço</th>
                <th className="py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Fonte</th>
                <th className="py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">P/L Não Realizado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {data.map(p => (
                <tr key={p.ticker} className="hover:bg-white/5 transition-colors">
                  <td className="py-4 px-6 text-white font-bold">{p.ticker}</td>
                  <td className="py-4 px-6 text-right text-gray-300 font-mono">{p.qty}</td>
                  <td className="py-4 px-6 text-right text-gray-300 font-mono">{formatCurrency(p.avg_cost, settings.baseCurrency)}</td>
                  <td className="py-4 px-6 text-right text-gray-300 font-mono">{formatCurrency(p.last_price, settings.baseCurrency)}</td>
                  <td className="py-4 px-6 text-right text-gray-500 text-[10px] font-bold">{quoteSources[p.ticker]?.toUpperCase() || '-'}</td>
                  <td className="py-4 px-6 text-right font-mono font-bold">
                    <span className={p.unrealized_pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                      {formatCurrency(p.unrealized_pnl, settings.baseCurrency)}
                    </span>
                  </td>
                </tr>
              ))}
              {data.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">Sem dados</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PremiumAnalytics;
