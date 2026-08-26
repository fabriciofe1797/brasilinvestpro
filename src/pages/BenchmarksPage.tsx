/**
 * BenchmarksPage — Central de Benchmarks
 *
 * Compara a carteira com os principais índices e taxas do mercado
 * (CDI, SELIC, IPCA, Poupança, IBOVESPA, IFIX) usando dados oficiais
 * do Banco Central e da B3 via BrAPI.
 */

import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts';
import { RefreshCw, TrendingUp, Scale, Landmark, Flame, PiggyBank, LineChart } from 'lucide-react';
import { fetchBenchmarks, BenchmarkData, BenchmarkKey } from '../services/benchmarks';
import { useStore } from '../store/useStore';
import FreshnessBadge from '../components/FreshnessBadge';
import { cn } from '../lib/utils';

const ICONS: Record<BenchmarkKey, React.ComponentType<{ className?: string }>> = {
  cdi: Landmark,
  selic: Flame,
  ipca: TrendingUp,
  poupanca: PiggyBank,
  ibovespa: LineChart,
  ifix: Scale,
};

const BenchmarksPage: React.FC = () => {
  const { assets, portfolio } = useStore();
  const [benchmarks, setBenchmarks] = useState<BenchmarkData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = async () => {
    setIsLoading(true);
    try {
      const data = await fetchBenchmarks();
      setBenchmarks(data);
    } catch {
      // mantém estado vazio — UI exibe indisponível
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // DY estimado da carteira (renda anual / valor de mercado)
  const portfolioStats = (() => {
    let invested = 0;
    let marketValue = 0;
    let annualIncome = 0;
    for (const pos of portfolio) {
      const asset = assets.find(a => a.id === pos.assetId);
      if (!asset) continue;
      invested += pos.quantity * pos.averagePrice;
      marketValue += pos.quantity * asset.price;
      annualIncome += pos.quantity * asset.price * (asset.dividendYield / 100);
    }
    const dy = marketValue > 0 ? (annualIncome / marketValue) * 100 : 0;
    return { invested, marketValue, annualIncome, dy };
  })();

  const cdi = benchmarks.find(b => b.key === 'cdi');
  const dyVsCdi = cdi?.twelveMonthPct != null && portfolioStats.dy > 0
    ? portfolioStats.dy - cdi.twelveMonthPct
    : null;

  // Dados do gráfico: acumulado 12 meses (taxas) — portfólio entra como referência de DY
  const chartData = benchmarks
    .filter(b => b.unit === 'rate' && b.twelveMonthPct != null)
    .map(b => ({
      name: b.name,
      valor: Number(b.twelveMonthPct!.toFixed(2)),
    }));
  if (portfolioStats.dy > 0) {
    chartData.push({ name: 'Sua Carteira (DY)', valor: Number(portfolioStats.dy.toFixed(2)) });
  }

  const formatValue = (b: BenchmarkData): string => {
    if (b.currentValue == null) return '—';
    if (b.unit === 'rate') return `${b.currentValue.toFixed(2)}% a.a.`;
    return b.currentValue.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
  };

  const formatPct = (v: number | null): string => (v == null ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`);

  return (
    <div className="bg-premium min-h-screen">
      <div className="premium-glow-1" />
      <div className="premium-glow-2" />

      <div className="relative z-10 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 pt-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white uppercase underline decoration-emerald-500 decoration-4 underline-offset-8">
              Central de <span className="text-emerald-500">Benchmarks</span>
            </h1>
            <p className="text-gray-500 text-sm font-bold uppercase mt-4 tracking-widest">
              Sua carteira contra CDI, SELIC, IPCA, Poupança, IBOVESPA e IFIX — dados oficiais.
            </p>
          </div>
          <button type="button" onClick={load} disabled={isLoading}
            className="self-start md:self-auto px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-emerald-400 hover:bg-emerald-500/10 transition-all disabled:opacity-50 flex items-center gap-2">
            <RefreshCw className={cn("w-3 h-3", isLoading && "animate-spin")} />
            {isLoading ? 'Atualizando...' : 'Atualizar'}
          </button>
        </div>

        {/* Carteira vs CDI — destaque */}
        <div className="glass-card rounded-2xl p-6 border-white/5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-widest mb-2">Sua Carteira vs CDI (12 meses)</h3>
              <p className="text-[11px] text-gray-500 font-bold max-w-xl leading-relaxed">
                O dividend yield da sua carteira supera o CDI? Se o DY ficar abaixo do CDI por muito tempo,
                vale reavaliar a alocação — renda fixa pós-fixada entrega o benchmark sem risco de mercado.
              </p>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-1">DY da Carteira</span>
                <span className="text-2xl font-black text-emerald-400">
                  {portfolioStats.dy > 0 ? `${portfolioStats.dy.toFixed(2)}%` : '—'}
                </span>
              </div>
              <div className="text-center">
                <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-1">CDI (12M)</span>
                <span className="text-2xl font-black text-white">
                  {cdi?.twelveMonthPct != null ? `${cdi.twelveMonthPct.toFixed(2)}%` : '—'}
                </span>
              </div>
              <div className="text-center">
                <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-1">Diferença</span>
                <span className={cn("text-2xl font-black", (dyVsCdi ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                  {dyVsCdi == null ? '—' : `${dyVsCdi >= 0 ? '+' : ''}${dyVsCdi.toFixed(2)} p.p.`}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Cards de benchmarks */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {benchmarks.map(b => {
            const Icon = ICONS[b.key];
            return (
              <div key={b.key} className="glass-card rounded-2xl p-6 border-white/5 hover:border-emerald-500/20 transition-all">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                      <Icon className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white tracking-tight">{b.name}</h3>
                      <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest">{b.description}</p>
                    </div>
                  </div>
                </div>

                <div className="text-3xl font-black text-white tracking-tighter mb-4">
                  {formatValue(b)}
                  {b.dailyChangePct != null && (
                    <span className={cn("ml-3 text-sm font-black", b.dailyChangePct >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                      {formatPct(b.dailyChangePct)}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-white/[0.03] rounded-xl p-3 border border-white/5 text-center">
                    <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest block mb-1">No ano (YTD)</span>
                    <span className="text-sm font-black text-emerald-400">{formatPct(b.ytdPct)}</span>
                  </div>
                  <div className="bg-white/[0.03] rounded-xl p-3 border border-white/5 text-center">
                    <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest block mb-1">12 Meses</span>
                    <span className="text-sm font-black text-blue-400">{formatPct(b.twelveMonthPct)}</span>
                  </div>
                </div>

                <FreshnessBadge source={b.source} lastUpdatedAt={b.lastUpdatedAt} compact />
              </div>
            );
          })}
        </div>

        {/* Gráfico comparativo 12 meses */}
        {chartData.length > 0 && (
          <div className="glass-card rounded-2xl p-6 border-white/5">
            <h3 className="text-sm font-black text-white uppercase tracking-widest mb-6">
              Acumulado 12 Meses — Taxas vs Sua Carteira (DY)
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} unit="%" />
                  <Tooltip
                    formatter={(value) => [`${Number(value).toFixed(2)}%`, 'Acumulado']}
                    contentStyle={{ background: '#030816', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }}
                    labelStyle={{ color: '#fff', fontWeight: 700 }}
                  />
                  {cdi?.twelveMonthPct != null && (
                    <ReferenceLine y={Number(cdi.twelveMonthPct.toFixed(2))} stroke="#f59e0b" strokeDasharray="4 4" />
                  )}
                  <Bar dataKey="valor" radius={[8, 8, 0, 0]}>
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={entry.name.includes('Carteira') ? '#10b981' : 'rgba(255,255,255,0.25)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest mt-3">
              Linha tracejada = CDI (benchmark da renda fixa). DY da carteira é estimado pelos proventos dos últimos 12 meses.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BenchmarksPage;
