import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useCeilingPrice } from '../hooks/useCeilingPrice';
import { formatCurrency, formatPercent, cn } from '../lib/utils';
import {
  TrendingUp, Target, Award, AlertTriangle,
  BarChart3, DollarSign, Eye, ArrowUpRight, ArrowDownRight,
  Info, ChevronDown, ChevronUp, Filter
} from 'lucide-react';

type SortField = 'score' | 'ticker' | 'dy' | 'upside' | 'yoc' | 'price';
type SortDir = 'asc' | 'desc';
type FilterType = 'all' | 'buy' | 'hold' | 'sell';

const CeilingPricePage: React.FC = () => {
  const {
    ranking,
    portfolioYieldOnCost,
    getCeilingPrice,
    topOpportunities,
    topYieldOnCost,
    belowCeiling,
    aboveCeiling,
  } = useCeilingPrice();

  const [sortField, setSortField] = useState<SortField>('score');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [search, setSearch] = useState('');
  const [expandedTicker, setExpandedTicker] = useState<string | null>(null);

  // Filter + Sort ranking
  const filteredRanking = useMemo(() => {
    let data = [...ranking];

    // Search filter
    if (search) {
      const s = search.toLowerCase();
      data = data.filter(r => r.ticker.toLowerCase().includes(s) || r.name.toLowerCase().includes(s));
    }

    // Verdict filter
    if (filterType !== 'all') {
      data = data.filter(r => {
        const cp = getCeilingPrice(r.ticker);
        if (!cp) return false;
        if (filterType === 'buy') return cp.verdict === 'buy';
        if (filterType === 'hold') return cp.verdict === 'hold';
        if (filterType === 'sell') return cp.verdict === 'sell';
        return true;
      });
    }

    // Sort
    data.sort((a, b) => {
      let va = 0, vb = 0;
      switch (sortField) {
        case 'ticker': va = a.ticker.localeCompare(b.ticker); return sortDir === 'asc' ? va : -va;
        case 'dy': va = a.dividendYield; vb = b.dividendYield; break;
        case 'upside': va = a.upsideClassic; vb = b.upsideClassic; break;
        case 'yoc': va = a.yieldOnCost || 0; vb = b.yieldOnCost || 0; break;
        case 'price': va = a.price; vb = b.price; break;
        default: va = a.score; vb = b.score;
      }
      return sortDir === 'asc' ? va - vb : vb - va;
    });

    return data;
  }, [ranking, search, filterType, sortField, sortDir, getCeilingPrice]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const SortHeader = ({ field, label }: { field: SortField; label: string }) => (
    <th
      className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-gray-500 cursor-pointer hover:text-emerald-400 transition-colors select-none"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        {sortField === field && (
          sortDir === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />
        )}
      </div>
    </th>
  );

  const yoc = portfolioYieldOnCost;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white uppercase underline decoration-emerald-500 decoration-4 underline-offset-8">
            Preço <span className="text-emerald-500">Teto</span> & Ranking
          </h1>
          <p className="text-gray-500 text-sm font-bold uppercase mt-4 tracking-widest">
            Análise de valuation com métodos Bazin, Graham e Consenso.
          </p>
        </div>
        <div className="flex gap-2">
          {(['all', 'buy', 'hold', 'sell'] as FilterType[]).map(f => (
            <button
              key={f}
              onClick={() => setFilterType(f)}
              className={cn(
                "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                filterType === f
                  ? f === 'buy' ? "bg-emerald-500 text-black border-emerald-500"
                    : f === 'hold' ? "bg-amber-500 text-black border-amber-500"
                    : f === 'sell' ? "bg-red-500 text-white border-red-500"
                    : "bg-emerald-500 text-black border-emerald-500"
                  : "bg-white/5 border-white/5 text-gray-500 hover:border-emerald-500/30"
              )}
            >
              {f === 'all' ? 'Todos' : f === 'buy' ? 'Compra' : f === 'hold' ? 'Manter' : 'Venda'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#0B1C17] border border-white/5 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="w-4 h-4 text-emerald-500" />
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">YoC Carteira</span>
          </div>
          <div className="text-2xl font-black text-emerald-400">{yoc.yieldOnCost.toFixed(2)}%</div>
          <div className="text-[10px] text-gray-500 mt-1">
            {formatCurrency(yoc.monthlyIncome, 'BRL')}/mês em dividendos
          </div>
        </div>

        <div className="bg-[#0B1C17] border border-white/5 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-4 h-4 text-blue-500" />
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Total Investido</span>
          </div>
          <div className="text-2xl font-black text-white">{formatCurrency(yoc.totalInvested, 'BRL')}</div>
          <div className="text-[10px] text-gray-500 mt-1">
            {yoc.perAsset.length} ativos na carteira
          </div>
        </div>

        <div className="bg-[#0B1C17] border border-white/5 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <ArrowUpRight className="w-4 h-4 text-emerald-500" />
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Oportunidades</span>
          </div>
          <div className="text-2xl font-black text-emerald-400">{belowCeiling.length}</div>
          <div className="text-[10px] text-gray-500 mt-1">ativos abaixo do preço-teto</div>
        </div>

        <div className="bg-[#0B1C17] border border-white/5 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Sobrevalorizados</span>
          </div>
          <div className="text-2xl font-black text-red-400">{aboveCeiling.length}</div>
          <div className="text-[10px] text-gray-500 mt-1">ativos acima do preço-teto</div>
        </div>
      </div>

      {/* Top Opportunities + Top YoC */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 5 Opportunities */}
        <div className="bg-[#0B1C17] border border-white/5 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
            Top 5 Oportunidades (Preço Teto)
          </h3>
          {topOpportunities.length > 0 ? (
            <div className="space-y-3">
              {topOpportunities.map((item, idx) => (
                <Link
                  key={item.ticker}
                  to={`/assets/${item.ticker}`}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:border-emerald-500/30 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black text-gray-600 w-5">#{idx + 1}</span>
                    <div>
                      <div className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">{item.ticker}</div>
                      <div className="text-[10px] text-gray-500">{item.name}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-emerald-400">+{item.upsideClassic.toFixed(1)}%</div>
                    <div className="text-[10px] text-gray-500">
                      Teto: {item.ceilingClassic ? formatCurrency(item.ceilingClassic, 'BRL') : 'N/A'}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 text-sm">
              Nenhuma oportunidade identificada no momento.
            </div>
          )}
        </div>

        {/* Top 5 YoC */}
        <div className="bg-[#0B1C17] border border-white/5 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
            <Award className="w-5 h-5 text-amber-500" />
            Top 5 Yield on Cost (Sua Carteira)
          </h3>
          {topYieldOnCost.length > 0 ? (
            <div className="space-y-3">
              {topYieldOnCost.map((item, idx) => (
                <Link
                  key={item.assetId}
                  to={`/assets/${item.assetId}`}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:border-amber-500/30 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black text-gray-600 w-5">#{idx + 1}</span>
                    <div>
                      <div className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors">{item.ticker}</div>
                      <div className="text-[10px] text-gray-500">
                        PM: {formatCurrency(item.averagePrice, 'BRL')} | {item.quantity} cotas
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-amber-400">{item.yieldOnCost.toFixed(2)}%</div>
                    <div className="text-[10px] text-gray-500">
                      {formatCurrency(item.annualIncome / 12, 'BRL')}/mês
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 text-sm">
              Adicione ativos à carteira para ver o YoC.
            </div>
          )}
        </div>
      </div>

      {/* Ranking Table */}
      <div className="bg-[#0B1C17] border border-white/5 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-500" />
            Ranking de Ativos
          </h3>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
            <input
              type="text"
              placeholder="Buscar ticker..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-10 rounded-xl bg-white/5 border border-white/10 pl-10 pr-4 text-sm text-white placeholder:text-gray-600 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10 outline-none transition-all w-full md:w-64"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-gray-500">#</th>
                <SortHeader field="ticker" label="Ticker" />
                <SortHeader field="price" label="Preço" />
                <SortHeader field="dy" label="DY (12M)" />
                <SortHeader field="upside" label="Margem Teto" />
                <SortHeader field="yoc" label="YoC" />
                <SortHeader field="score" label="Score" />
                <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-gray-500">Veredito</th>
              </tr>
            </thead>
            <tbody>
              {filteredRanking.slice(0, 30).map((item, idx) => {
                const cp = getCeilingPrice(item.ticker);
                const isExpanded = expandedTicker === item.ticker;
                const verdictColor = cp?.verdict === 'buy' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                  : cp?.verdict === 'hold' ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                  : cp?.verdict === 'sell' ? 'text-red-400 bg-red-500/10 border-red-500/20'
                  : 'text-gray-400 bg-white/5 border-white/10';

                return (
                  <React.Fragment key={item.ticker}>
                    <tr
                      className={cn(
                        "border-b border-white/5 hover:bg-white/[0.02] cursor-pointer transition-colors",
                        isExpanded && "bg-white/[0.02]"
                      )}
                      onClick={() => setExpandedTicker(isExpanded ? null : item.ticker)}
                    >
                      <td className="px-4 py-3 text-xs font-bold text-gray-600">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <Link to={`/assets/${item.ticker}`} className="hover:text-emerald-400 transition-colors" onClick={e => e.stopPropagation()}>
                          <div className="text-sm font-bold text-white">{item.ticker}</div>
                          <div className="text-[10px] text-gray-500">{item.name}</div>
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-white">{formatCurrency(item.price, item.currency)}</td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-bold text-emerald-400">{formatPercent(item.dividendYield)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className={cn("text-sm font-bold flex items-center gap-1", item.upsideClassic > 0 ? "text-emerald-400" : "text-red-400")}>
                          {item.upsideClassic > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          {Math.abs(item.upsideClassic).toFixed(1)}%
                        </div>
                        {item.ceilingClassic && (
                          <div className="text-[10px] text-gray-500">Teto: {formatCurrency(item.ceilingClassic, 'BRL')}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {item.yieldOnCost !== null ? (
                          <span className="text-sm font-bold text-amber-400">{item.yieldOnCost.toFixed(1)}%</span>
                        ) : (
                          <span className="text-xs text-gray-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "text-sm font-black",
                          item.score >= 70 ? "text-emerald-400" : item.score >= 50 ? "text-blue-400" : item.score >= 30 ? "text-amber-400" : "text-red-400"
                        )}>
                          {item.score}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("text-[10px] font-black uppercase px-2 py-1 rounded border", verdictColor)}>
                          {cp?.verdict === 'buy' ? 'Compra' : cp?.verdict === 'hold' ? 'Manter' : cp?.verdict === 'sell' ? 'Venda' : 'Neutro'}
                        </span>
                      </td>
                    </tr>
                    {/* Expanded Detail Row */}
                    {isExpanded && cp && (
                      <tr className="border-b border-white/5">
                        <td colSpan={8} className="px-4 py-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5">
                            <div>
                              <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Preço Teto Clássico (Bazin)</div>
                              <div className="text-lg font-bold text-white">
                                {cp.classicCeiling ? formatCurrency(cp.classicCeiling, 'BRL') : 'N/A'}
                              </div>
                              <div className={cn("text-xs font-bold", cp.upsideClassic > 0 ? "text-emerald-400" : "text-red-400")}>
                                {cp.upsideClassic > 0 ? '+' : ''}{cp.upsideClassic.toFixed(1)}%
                              </div>
                            </div>
                            <div>
                              <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Preço Teto Projetivo</div>
                              <div className="text-lg font-bold text-white">
                                {cp.projectiveCeiling ? formatCurrency(cp.projectiveCeiling, 'BRL') : 'N/A'}
                              </div>
                              <div className={cn("text-xs font-bold", cp.upsideProjective > 0 ? "text-emerald-400" : "text-red-400")}>
                                {cp.upsideProjective > 0 ? '+' : ''}{cp.upsideProjective.toFixed(1)}%
                              </div>
                            </div>
                            <div>
                              <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Preço de Graham</div>
                              <div className="text-lg font-bold text-white">
                                {cp.grahamPrice ? formatCurrency(cp.grahamPrice, 'BRL') : 'N/A'}
                              </div>
                              <div className={cn("text-xs font-bold", cp.upsideGraham > 0 ? "text-emerald-400" : "text-red-400")}>
                                {cp.upsideGraham > 0 ? '+' : ''}{cp.upsideGraham.toFixed(1)}%
                              </div>
                            </div>
                            <div>
                              <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Preço de Consenso</div>
                              <div className="text-lg font-bold text-white">
                                {cp.consensusCeiling ? formatCurrency(cp.consensusCeiling, 'BRL') : 'N/A'}
                              </div>
                              <div className={cn("text-xs font-bold", cp.upsideConsensus > 0 ? "text-emerald-400" : "text-red-400")}>
                                {cp.upsideConsensus > 0 ? '+' : ''}{cp.upsideConsensus.toFixed(1)}%
                              </div>
                            </div>
                          </div>
                          <div className="mt-3 flex items-center gap-2">
                            <Info className="w-3 h-3 text-gray-500" />
                            <span className="text-[10px] text-gray-500">{cp.verdictLabel}</span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredRanking.length === 0 && (
          <div className="text-center py-12 text-gray-500 text-sm">
            Nenhum ativo encontrado com os filtros selecionados.
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="bg-[#0B1C17] border border-white/5 rounded-2xl p-6">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
          <Eye className="w-4 h-4 text-gray-500" />
          Metodologia
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-gray-400 leading-relaxed">
          <div>
            <div className="text-white font-bold mb-1">Preço Teto Clássico (Bazin)</div>
            <p>DJA ÷ 6%. Preço máximo para garantir 6% de retorno anual em dividendos. Metodologia de Décio Bazin / Luiz Barsi.</p>
          </div>
          <div>
            <div className="text-white font-bold mb-1">Preço Teto Projetivo</div>
            <p>Estende o clássico aplicando fator de crescimento baseado na tendência dos últimos dividendos. Antecipa aumentos/cortes.</p>
          </div>
          <div>
            <div className="text-white font-bold mb-1">Preço de Graham</div>
            <p>√(22.5 × LPA × VPA). Fórmula de Benjamin Graham para ações de valor. Considera lucro e valor patrimonial.</p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-white/5">
          <div className="text-xs text-gray-400 leading-relaxed">
            <span className="text-white font-bold">Score</span> = DY (35%) + Margem Teto (30%) + YoC (20%) + Valuation P/VP ou P/L (15%).
            <span className="text-white font-bold ml-2">YoC</span> = Dividendo Anual ÷ Preço Médio de Compra. Mostra a rentabilidade real sobre o capital investido.
          </div>
        </div>
      </div>
    </div>
  );
};

export default CeilingPricePage;
