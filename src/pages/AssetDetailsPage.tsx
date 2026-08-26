import React from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useStore } from '../store/useStore';
import { formatCurrency, formatPercent, calculateAssetScore } from '../lib/utils';
import { calculateGrahamPrice, calculateBazinPrice, calculateYieldOnCost, calculateAllCeilingPrices } from '../lib/formulas';
import { ArrowLeft, CheckCircle2, AlertTriangle, TrendingUp, Info, Target, Award, Shield, Zap, History, Banknote } from 'lucide-react';
import { cn } from '../lib/utils';
import AddInvestmentModal from '../components/AddInvestmentModal';
import { useAuth } from '@clerk/clerk-react';
import { getQuotesDetailed } from '../services/database';
import { fetchAssetHistory, fetchAssetDividends, PricePoint, DividendEvent } from '../services/api';
import FreshnessBadge from '../components/FreshnessBadge';
import TermHint from '../components/TermHint';
import type { QuoteSource } from '../types';

const formatDateBR = (iso: string): string => {
  const [y, m, d] = iso.split('T')[0].split('-');
  return d && m && y ? `${d}/${m}/${y}` : iso;
};

const DIVIDEND_TYPE_LABELS: Record<string, string> = {
  dividend: 'Dividendo',
  'interest-on-capital': 'JCP',
  'income-fund': 'Rendimento',
  subscription: 'Subscrição',
  'stock-dividend': 'Bonificação',
};

const AssetDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { assets, portfolio } = useStore();
  const { getToken } = useAuth();
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [quoteSource, setQuoteSource] = React.useState<QuoteSource>('mock');
  const [quoteUpdatedAt, setQuoteUpdatedAt] = React.useState<string | null>(null);
  const [history, setHistory] = React.useState<PricePoint[]>([]);
  const [dividends, setDividends] = React.useState<DividendEvent[]>([]);
  const [loadingHistory, setLoadingHistory] = React.useState(true);

  const asset = assets.find(a => a.id === id);
  const position = portfolio.find(p => p.assetId === id);

  React.useEffect(() => {
    if (!asset) return;
    const run = async () => {
      try {
        const token = await getToken({ template: 'supabase' });
        if (!token) return;
        const { prices, sources, updatedAt } = await getQuotesDetailed([asset.ticker], token);
        const p = prices[asset.ticker];
        if (typeof p === 'number' && p > 0) {
          useStore.getState().updateAssetPrice(asset.ticker, p, p);
        }
        const src = sources[asset.ticker];
        if (typeof src === 'string' && src) setQuoteSource(src.toLowerCase() as QuoteSource);
        const refreshedAt = updatedAt[asset.ticker];
        if (typeof refreshedAt === 'string' && refreshedAt) setQuoteUpdatedAt(refreshedAt);
      } catch {
        console.warn('Falha ao atualizar cotação do ativo');
      }
    };
    run();
  }, [asset, getToken]);

  // Histórico de preço + dividendos reais (BrAPI, com fallback gracioso)
  React.useEffect(() => {
    if (!asset) return;
    let cancelled = false;
    setLoadingHistory(true);
    Promise.all([
      fetchAssetHistory(asset.ticker),
      asset.category === 'Cripto' ? Promise.resolve([] as DividendEvent[]) : fetchAssetDividends(asset.ticker),
    ]).then(([h, d]) => {
      if (cancelled) return;
      setHistory(h);
      setDividends(d);
      setLoadingHistory(false);
    });
    return () => { cancelled = true; };
  }, [asset]);

  // Métricas de dividendos dos últimos 12 meses
  const dividendStats = React.useMemo(() => {
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 1);
    const recent = dividends.filter(d => new Date(d.date) >= cutoff);
    const totalPerShare = recent.reduce((acc, d) => acc + d.valuePerShare, 0);
    return {
      recent,
      totalPerShare,
      receivedLast12m: position ? totalPerShare * position.quantity : 0,
    };
  }, [dividends, position]);

  // Dados do gráfico de preço (normaliza variação vs primeiro ponto)
  const chartData = React.useMemo(() => {
    if (history.length === 0) return [];
    const base = history[0].close;
    return history.map(p => ({
      label: p.date.slice(0, 7),
      preco: Number(p.close.toFixed(2)),
      variacao: base > 0 ? Number((((p.close - base) / base) * 100).toFixed(2)) : 0,
    }));
  }, [history]);

  // Ceiling Price (Preço Teto) - 3 métodos
  // (hooks antes do early return para respeitar as regras de hooks)
  const ceilingData = React.useMemo(() => (asset ? calculateAllCeilingPrices(asset) : null), [asset]);

  // Score Inteligente
  const score = React.useMemo(() => {
    if (!asset) return null;
    return calculateAssetScore({
      dividendYield: asset.dividendYield,
      price: asset.price,
      lastClose: asset.lastClose,
      pvp: asset.pvp,
      pl: asset.pl,
      category: asset.category,
    });
  }, [asset]);

  if (!asset) {
    return <Navigate to="/market" replace />;
  }

  // Calculations
  const grahamPrice = calculateGrahamPrice(asset.price, asset.pl, asset.pvp);
  const bazinPrice = calculateBazinPrice(asset.price * (asset.dividendYield / 100)); // Using current yield as proxy for annual dividends
  
  const annualDividends = asset.price * (asset.dividendYield / 100);
  const yieldOnCost = position ? calculateYieldOnCost(annualDividends, position.averagePrice) : 0;
  
  const upsideGraham = grahamPrice ? ((grahamPrice - asset.price) / asset.price) * 100 : 0;
  const upsideBazin = ((bazinPrice - asset.price) / asset.price) * 100;

  // Checklist Logic
  const checklist = [
    { 
      label: 'Paga Dividendos Recorrentes?', 
      passed: asset.dividendYield > 5, 
      detail: `DY Atual: ${formatPercent(asset.dividendYield)}` 
    },
    { 
      label: 'Preço Justo (Bazin)', 
      passed: upsideBazin > 0, 
      detail: `Margem: ${upsideBazin.toFixed(1)}%` 
    },
    { 
      label: 'Preço Justo (Graham)', 
      passed: grahamPrice ? upsideGraham > 0 : false, 
      detail: grahamPrice ? `Margem: ${upsideGraham.toFixed(1)}%` : 'N/A' 
    },
    { 
      label: 'P/VP Atrativo', 
      passed: asset.pvp ? asset.pvp <= 1.05 : true, 
      detail: asset.pvp ? `P/VP: ${asset.pvp}` : 'N/A' 
    }
  ];

  const scoreColor = score.total >= 75 ? 'text-emerald-400' : score.total >= 55 ? 'text-blue-400' : score.total >= 35 ? 'text-amber-400' : 'text-red-400';

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/market" className="p-2 hover:bg-white/5 rounded-full text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold text-white tracking-tight">{asset.ticker}</h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/10 text-gray-400 border border-white/5 uppercase">
              {asset.category}
            </span>
          </div>
          <p className="text-gray-400">{asset.name}</p>
        </div>
        <div className="ml-auto text-right">
          <div className="text-2xl font-bold text-white">{formatCurrency(asset.price, asset.currency)}</div>
          <div className="text-sm font-medium text-emerald-400">Cotação Atual</div>
          <div className="mt-1">
            <FreshnessBadge source={quoteSource} lastUpdatedAt={quoteUpdatedAt} />
          </div>
        </div>
        <div className="ml-4 text-right">
          <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">Score</div>
          <div className={cn("text-2xl font-black tracking-tighter", scoreColor)}>
            {score.total}
          </div>
          <div className={cn("text-[10px] font-bold uppercase", scoreColor)}>
            {score.label}
          </div>
        </div>
        <Link
          to={`/titan/${asset.id}`}
          className="ml-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-blue-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 hover:opacity-90 transition-opacity"
        >
          <Zap className="w-4 h-4" />
          Titan Analyst
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Info Card */}
        <div className="lg:col-span-2 space-y-6">

          {/* Histórico de Preço */}
          <div className="bg-[#0B1C17] border border-white/5 rounded-2xl p-6 shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <History className="w-5 h-5 text-blue-500" />
                Histórico de Preço (12 meses)
              </h3>
              {history.length > 1 && (
                <span className={cn(
                  "text-xs font-black px-2 py-1 rounded-lg",
                  chartData[chartData.length - 1].variacao >= 0 ? "text-emerald-400 bg-emerald-500/10" : "text-red-400 bg-red-500/10"
                )}>
                  {chartData[chartData.length - 1].variacao >= 0 ? '+' : ''}{chartData[chartData.length - 1].variacao}% no período
                </span>
              )}
            </div>
            {loadingHistory ? (
              <div className="h-48 flex items-center justify-center text-gray-500 text-sm">Carregando histórico...</div>
            ) : chartData.length > 1 ? (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                    <defs>
                      <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="label" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={24} />
                    <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} domain={['auto', 'auto']} width={64} />
                    <RechartsTooltip
                      formatter={(value, name) => [formatCurrency(Number(value), asset.currency), name === 'preco' ? 'Preço' : name]}
                      contentStyle={{ background: '#030816', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }}
                      labelStyle={{ color: '#fff', fontWeight: 700 }}
                    />
                    <Area type="monotone" dataKey="preco" stroke="#10b981" strokeWidth={2} fill="url(#priceGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-24 flex items-center justify-center text-gray-500 text-sm bg-white/5 rounded-xl border border-dashed border-white/10">
                Histórico indisponível para este ativo.
              </div>
            )}
          </div>

          {/* Dividendos Reais */}
          {asset.category !== 'Cripto' && (
            <div className="bg-[#0B1C17] border border-white/5 rounded-2xl p-6 shadow-lg">
              <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                <Banknote className="w-5 h-5 text-emerald-500" />
                Dividendos Reais (últimos 12 meses)
              </h3>

              {loadingHistory ? (
                <div className="py-6 text-center text-gray-500 text-sm">Carregando proventos...</div>
              ) : dividendStats.recent.length > 0 ? (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-5">
                    <div className="bg-white/5 rounded-xl p-3">
                      <span className="text-xs text-gray-400 block mb-1">Por cota (12M)</span>
                      <span className="text-xl font-bold text-emerald-400">{formatCurrency(dividendStats.totalPerShare, 'BRL')}</span>
                    </div>
                    <div className="bg-white/5 rounded-xl p-3">
                      <span className="text-xs text-gray-400 block mb-1">Eventos (12M)</span>
                      <span className="text-xl font-bold text-white">{dividendStats.recent.length}</span>
                    </div>
                    {position && (
                      <div className="bg-white/5 rounded-xl p-3">
                        <span className="text-xs text-gray-400 block mb-1">Você recebeu (est.)</span>
                        <span className="text-xl font-bold text-emerald-400">{formatCurrency(dividendStats.receivedLast12m, 'BRL')}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {dividendStats.recent.slice(0, 12).map((d, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            {DIVIDEND_TYPE_LABELS[d.type] || d.type}
                          </span>
                          <span className="text-sm text-gray-400">{formatDateBR(d.date)}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold text-white">{formatCurrency(d.valuePerShare, 'BRL')}</span>
                          <span className="text-[10px] text-gray-500">/cota</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="py-6 text-center text-gray-500 text-sm bg-white/5 rounded-xl border border-dashed border-white/10">
                  Histórico de proventos indisponível para este ativo.
                </div>
              )}
            </div>
          )}

          {/* My Position */}
          <div className="bg-[#0B1C17] border border-white/5 rounded-2xl p-6 shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-500" />
                Minha Posição
              </h3>
              <button 
                onClick={() => setIsAddModalOpen(true)}
                className="text-xs font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20"
              >
                + Novo Aporte
              </button>
            </div>

            {position ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/5 rounded-xl p-3">
                  <span className="text-xs text-gray-400 block mb-1">Quantidade</span>
                  <span className="text-xl font-bold text-white">{position.quantity}</span>
                </div>
                <div className="bg-white/5 rounded-xl p-3">
                  <span className="text-xs text-gray-400 block mb-1">Preço Médio</span>
                  <span className="text-xl font-bold text-white">{formatCurrency(position.averagePrice, 'BRL')}</span>
                </div>
                <div className="bg-white/5 rounded-xl p-3">
                  <span className="text-xs text-gray-400 block mb-1"><TermHint term="yoc">Yield on Cost</TermHint></span>
                  <div className="flex items-end gap-1">
                    <span className="text-xl font-bold text-emerald-400">{yieldOnCost.toFixed(2)}%</span>
                    <span className="text-[10px] text-gray-500 mb-1">vs {formatPercent(asset.dividendYield)} (Atual)</span>
                  </div>
                </div>
                <div className="bg-white/5 rounded-xl p-3">
                  <span className="text-xs text-gray-400 block mb-1">Total Investido</span>
                  <span className="text-xl font-bold text-white">
                    {formatCurrency(position.quantity * position.averagePrice, 'BRL')}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500 text-sm bg-white/5 rounded-xl border border-dashed border-white/10">
                Você ainda não possui este ativo em carteira.
              </div>
            )}
          </div>

          {/* Fair Price Analysis */}
          <div className="bg-[#0B1C17] border border-white/5 rounded-2xl p-6 shadow-lg">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <Info className="w-5 h-5 text-blue-500" />
              Valuation (Preço Justo)
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Graham */}
              <div className="relative p-5 rounded-xl bg-gradient-to-br from-white/5 to-transparent border border-white/10 overflow-hidden">
                 <div className="absolute top-0 right-0 p-3 opacity-10">
                   <span className="text-4xl font-serif font-bold text-white">G</span>
                 </div>
                 <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-2"><TermHint term="graham">Método de Graham</TermHint></h4>
                 
                 {grahamPrice ? (
                   <>
                     <div className="text-3xl font-bold text-white mb-1">{formatCurrency(grahamPrice, 'BRL')}</div>
                     <div className={cn("text-sm font-bold flex items-center gap-1", upsideGraham > 0 ? "text-emerald-400" : "text-red-400")}>
                        {upsideGraham > 0 ? "Margem de Segurança:" : "Sobrevalorizado:"} {Math.abs(upsideGraham).toFixed(1)}%
                     </div>
                   </>
                 ) : (
                   <span className="text-gray-500 text-sm">Não aplicável (FII ou Prejuízo)</span>
                 )}
              </div>

              {/* Bazin */}
              <div className="relative p-5 rounded-xl bg-gradient-to-br from-white/5 to-transparent border border-white/10 overflow-hidden">
                 <div className="absolute top-0 right-0 p-3 opacity-10">
                   <span className="text-4xl font-serif font-bold text-white">B</span>
                 </div>
                 <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-2"><TermHint term="bazin">Método de Bazin (6%)</TermHint></h4>
                 
                 <div className="text-3xl font-bold text-white mb-1">{formatCurrency(bazinPrice, 'BRL')}</div>
                 <div className={cn("text-sm font-bold flex items-center gap-1", upsideBazin > 0 ? "text-emerald-400" : "text-red-400")}>
                    {upsideBazin > 0 ? "Margem de Segurança:" : "Sobrevalorizado:"} {Math.abs(upsideBazin).toFixed(1)}%
                 </div>
              </div>
            </div>
            
            <p className="text-xs text-gray-500 mt-4 leading-relaxed">
              * Graham: Ideal para ações de valor. Considera Lucro e Valor Patrimonial. <br/>
              * Bazin: Ideal para dividendos. Considera o teto de preço para garantir 6% de retorno em proventos.
            </p>
          </div>

          {/* Ceiling Price (Preço Teto) - 3 Métodos */}
          <div className="bg-[#0B1C17] border border-white/5 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Target className="w-5 h-5 text-emerald-500" />
                Preço Teto (3 Métodos)
              </h3>
              <span className={cn(
                "text-[10px] font-black uppercase px-3 py-1 rounded-lg border",
                ceilingData.verdict === 'buy' ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                  : ceilingData.verdict === 'hold' ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
                  : ceilingData.verdict === 'sell' ? "text-red-400 bg-red-500/10 border-red-500/20"
                  : "text-gray-400 bg-white/5 border-white/10"
              )}>
                {ceilingData.verdictLabel}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Clássico (Bazin) */}
              <div className="relative p-4 rounded-xl bg-gradient-to-br from-emerald-500/5 to-transparent border border-emerald-500/10">
                <div className="absolute top-0 right-0 p-2 opacity-10">
                  <Shield className="w-8 h-8 text-emerald-500" />
                </div>
                <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2">Clássico (Bazin)</h4>
                {ceilingData.classicCeiling ? (
                  <>
                    <div className="text-2xl font-black text-white mb-1">{formatCurrency(ceilingData.classicCeiling, 'BRL')}</div>
                    <div className={cn("text-xs font-bold flex items-center gap-1", ceilingData.upsideClassic > 0 ? "text-emerald-400" : "text-red-400")}>
                      {ceilingData.upsideClassic > 0 ? '↑' : '↓'} {Math.abs(ceilingData.upsideClassic).toFixed(1)}% do preço atual
                    </div>
                  </>
                ) : (
                  <span className="text-gray-500 text-sm">N/A</span>
                )}
              </div>

              {/* Projetivo */}
              <div className="relative p-4 rounded-xl bg-gradient-to-br from-blue-500/5 to-transparent border border-blue-500/10">
                <div className="absolute top-0 right-0 p-2 opacity-10">
                  <TrendingUp className="w-8 h-8 text-blue-500" />
                </div>
                <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">Projetivo</h4>
                {ceilingData.projectiveCeiling ? (
                  <>
                    <div className="text-2xl font-black text-white mb-1">{formatCurrency(ceilingData.projectiveCeiling, 'BRL')}</div>
                    <div className={cn("text-xs font-bold flex items-center gap-1", ceilingData.upsideProjective > 0 ? "text-emerald-400" : "text-red-400")}>
                      {ceilingData.upsideProjective > 0 ? '↑' : '↓'} {Math.abs(ceilingData.upsideProjective).toFixed(1)}% do preço atual
                    </div>
                  </>
                ) : (
                  <span className="text-gray-500 text-sm">N/A</span>
                )}
              </div>

              {/* Consenso */}
              <div className="relative p-4 rounded-xl bg-gradient-to-br from-purple-500/5 to-transparent border border-purple-500/10">
                <div className="absolute top-0 right-0 p-2 opacity-10">
                  <Award className="w-8 h-8 text-purple-500" />
                </div>
                <h4 className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-2">Consenso</h4>
                {ceilingData.consensusCeiling ? (
                  <>
                    <div className="text-2xl font-black text-white mb-1">{formatCurrency(ceilingData.consensusCeiling, 'BRL')}</div>
                    <div className={cn("text-xs font-bold flex items-center gap-1", ceilingData.upsideConsensus > 0 ? "text-emerald-400" : "text-red-400")}>
                      {ceilingData.upsideConsensus > 0 ? '↑' : '↓'} {Math.abs(ceilingData.upsideConsensus).toFixed(1)}% do preço atual
                    </div>
                  </>
                ) : (
                  <span className="text-gray-500 text-sm">N/A</span>
                )}
              </div>
            </div>

            <p className="text-xs text-gray-500 mt-4 leading-relaxed">
              * Clássico: DJA ÷ 6% (Bazin). Projetivo: ajusta por tendência de dividendos. Consenso: média ponderada (Bazin 40% + Graham 30% + P/VP justo 30%).
            </p>
          </div>

          {/* Fundamentos / Dados do Ativo */}
          <div className="bg-[#0B1C17] border border-white/5 rounded-2xl p-6 shadow-lg">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <Info className="w-5 h-5 text-blue-500" />
              Dados do Ativo
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-white/5 rounded-xl p-3">
                <span className="text-xs text-gray-400 block mb-1">Setor</span>
                <span className="text-sm font-bold text-white">{asset.subCategory}</span>
              </div>
              <div className="bg-white/5 rounded-xl p-3">
                <span className="text-xs text-gray-400 block mb-1">Último Fechamento</span>
                <span className="text-sm font-bold text-white">{formatCurrency(asset.lastClose, asset.currency)}</span>
              </div>
              <div className="bg-white/5 rounded-xl p-3">
                <span className="text-xs text-gray-400 block mb-1"><TermHint term="pvp">P/VP</TermHint></span>
                <span className="text-sm font-bold text-white">{asset.pvp?.toFixed(2) || 'N/A'}</span>
              </div>
              <div className="bg-white/5 rounded-xl p-3">
                <span className="text-xs text-gray-400 block mb-1"><TermHint term="pl">P/L</TermHint></span>
                <span className="text-sm font-bold text-white">{asset.pl?.toFixed(1) || 'N/A'}</span>
              </div>
              <div className="bg-white/5 rounded-xl p-3">
                <span className="text-xs text-gray-400 block mb-1"><TermHint term="dividend">Último Dividendo</TermHint></span>
                <span className="text-sm font-bold text-white">{formatCurrency(asset.lastDividend, asset.currency)}</span>
              </div>
              <div className="bg-white/5 rounded-xl p-3">
                <span className="text-xs text-gray-400 block mb-1"><TermHint term="magicNumber">Magic Number</TermHint></span>
                <span className="text-sm font-bold text-emerald-400">{asset.magicNumber}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Checklist */}
        <div className="space-y-6">
           <div className="bg-[#0B1C17] border border-white/5 rounded-2xl p-6 shadow-lg h-full">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              Checklist Fundamentalista
            </h3>

            <div className="space-y-4">
              {checklist.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                  <div className={cn(
                    "mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0",
                    item.passed ? "bg-emerald-500/20 text-emerald-500" : "bg-red-500/20 text-red-500"
                  )}>
                    {item.passed ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">{item.label}</div>
                    <div className="text-xs text-gray-400">{item.detail}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
               <h4 className="text-sm font-bold text-blue-400 mb-1">Veredito do GPS</h4>
               <p className="text-xs text-gray-300 leading-relaxed">
                 {checklist.filter(i => i.passed).length >= 3 
                   ? "Este ativo atende à maioria dos critérios de qualidade e preço. Considere para aporte se estiver dentro da sua alocação ideal."
                   : "Atenção: Este ativo falha em critérios importantes de segurança ou preço. Avalie com cautela."}
               </p>
            </div>
           </div>
        </div>
      </div>

      <AddInvestmentModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)}
        preSelectedAssetId={asset.id}
      />
    </div>
  );
};

export default AssetDetailsPage;
