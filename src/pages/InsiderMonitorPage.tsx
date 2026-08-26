import React, { useState } from 'react';
import { useInsiderMonitor } from '../hooks/useInsiderMonitor';
import { formatCurrency } from '../lib/utils';
import {
  Eye,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  AlertTriangle,
  Clock,
  Activity,
  ChevronDown,
  ChevronUp,
  Star,
} from 'lucide-react';

const InsiderMonitorPage: React.FC = () => {
  const {
    transactions,
    relevantMovements,
    portfolioSignals,
    topSignals,
    refreshData,
    stats,
  } = useInsiderMonitor();

  const [filterTicker, setFilterTicker] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'buy' | 'sell'>('all');
  const [filterPeriod, setFilterPeriod] = useState<'7d' | '30d' | 'all'>('30d');
  const [showPortfolioOnly, setShowPortfolioOnly] = useState(false);
  const [expandedSection, setExpandedSection] = useState<'relevant' | 'portfolio' | 'radar' | 'all'>('relevant');

  const formatBRL = (v: number) => formatCurrency(v, 'BRL');
  const formatDate = (d: string) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

  const isRecent = (date: string) => {
    const diff = (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24);
    return diff <= 1;
  };

  // Filter transactions
  const filteredTransactions = transactions.filter(t => {
    if (filterTicker && t.ticker.toUpperCase() !== filterTicker.toUpperCase()) return false;
    if (filterType !== 'all' && t.type !== filterType) return false;
    if (filterPeriod === '7d') {
      const d = new Date(t.date);
      const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 7);
      return d >= cutoff;
    }
    if (filterPeriod === '30d') {
      const d = new Date(t.date);
      const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30);
      return d >= cutoff;
    }
    return true;
  });

  const displayTransactions = showPortfolioOnly ? portfolioSignals : filteredTransactions;

  const signalColor = (signal: string) => {
    if (signal === 'bullish') return 'text-emerald-400';
    if (signal === 'bearish') return 'text-red-400';
    return 'text-gray-400';
  };

  const signalBg = (signal: string) => {
    if (signal === 'bullish') return 'bg-emerald-500/10 border-emerald-500/20';
    if (signal === 'bearish') return 'bg-red-500/10 border-red-500/20';
    return 'bg-white/5 border-white/10';
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <Eye className="w-8 h-8 text-emerald-500" />
            Monitor de Insiders
          </h1>
          <p className="text-gray-500 text-sm font-medium mt-1">
            Rastreamento de movimentacoes de executivos e grandes acionistas (CVM).
          </p>
        </div>
        <button
          onClick={refreshData}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all text-xs font-bold"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Atualizar
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#0B1C17] border border-white/5 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-[10px] font-bold text-gray-500 uppercase">Ultimas 24h</span>
          </div>
          <p className="text-2xl font-black text-white">{stats.total24h}</p>
          <p className="text-[10px] text-gray-500">movimentacoes</p>
        </div>
        <div className="bg-[#0B1C17] border border-white/5 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-[10px] font-bold text-gray-500 uppercase">Ultimos 7 dias</span>
          </div>
          <p className="text-2xl font-black text-white">{stats.total7d}</p>
          <p className="text-[10px] text-gray-500">movimentacoes</p>
        </div>
        <div className="bg-[#0B1C17] border border-white/5 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[10px] font-bold text-gray-500 uppercase">Compras 30d</span>
          </div>
          <p className="text-2xl font-black text-emerald-400">{formatBRL(stats.buyVolume30d)}</p>
        </div>
        <div className="bg-[#0B1C17] border border-white/5 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-3.5 h-3.5 text-red-400" />
            <span className="text-[10px] font-bold text-gray-500 uppercase">Vendas 30d</span>
          </div>
          <p className="text-2xl font-black text-red-400">{formatBRL(stats.sellVolume30d)}</p>
        </div>
      </div>

      {/* Net Signal */}
      <div className={`rounded-2xl border p-4 flex items-center justify-between ${signalBg(stats.netSignal)}`}>
        <div className="flex items-center gap-3">
          {stats.netSignal === 'bullish' ? (
            <TrendingUp className="w-6 h-6 text-emerald-400" />
          ) : stats.netSignal === 'bearish' ? (
            <TrendingDown className="w-6 h-6 text-red-400" />
          ) : (
            <Activity className="w-6 h-6 text-gray-400" />
          )}
          <div>
            <p className={`text-sm font-bold ${signalColor(stats.netSignal)}`}>
              Sinal {stats.netSignal === 'bullish' ? 'ALTISTA' : stats.netSignal === 'bearish' ? 'BAIXISTA' : 'NEUTRO'}
            </p>
            <p className="text-[10px] text-gray-500">
              Volume de compras {stats.netSignal === 'bullish' ? 'supera' : stats.netSignal === 'bearish' ? 'abaixo de' : 'equivalente a'} vendas nos ultimos 30 dias
            </p>
          </div>
        </div>
      </div>

      {/* Relevant Signals */}
      <div className="bg-[#0B1C17] border border-white/5 rounded-2xl overflow-hidden">
        <button
          onClick={() => setExpandedSection(expandedSection === 'relevant' ? 'all' : 'relevant')}
          className="w-full p-6 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h3 className="text-lg font-bold text-white">Sinais Relevantes</h3>
            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-black border border-amber-500/30">
              {relevantMovements.length}
            </span>
          </div>
          {expandedSection === 'relevant' ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
        </button>

        {expandedSection === 'relevant' && (
          <div className="px-6 pb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {relevantMovements.slice(0, 6).map(t => (
                <div key={t.id} className={`p-4 rounded-xl border ${t.type === 'buy' ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-white">{t.ticker}</span>
                      {isRecent(t.date) && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[8px] font-black uppercase">Novo</span>
                      )}
                    </div>
                    <span className={`text-[10px] font-black uppercase ${t.type === 'buy' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {t.type === 'buy' ? 'COMPRA' : 'VENDA'}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 font-bold">{t.insider} — {t.role}</p>
                  <div className="flex justify-between mt-2">
                    <span className="text-xs font-bold text-white">{formatBRL(t.value)}</span>
                    <span className="text-[10px] text-gray-500">{t.quantity.toLocaleString()} cotas @ {formatBRL(t.price)}</span>
                  </div>
                  <p className="text-[9px] text-gray-600 mt-1">{formatDate(t.date)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Portfolio Signals */}
      {portfolioSignals.length > 0 && (
        <div className="bg-[#0B1C17] border border-white/5 rounded-2xl overflow-hidden">
          <button
            onClick={() => setExpandedSection(expandedSection === 'portfolio' ? 'all' : 'portfolio')}
            className="w-full p-6 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
          >
            <div className="flex items-center gap-3">
              <Star className="w-5 h-5 text-emerald-500" />
              <h3 className="text-lg font-bold text-white">Minha Carteira</h3>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black border border-emerald-500/30">
                {portfolioSignals.length}
              </span>
            </div>
            {expandedSection === 'portfolio' ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
          </button>

          {expandedSection === 'portfolio' && (
            <div className="px-6 pb-6 space-y-2">
              {portfolioSignals.map(t => (
                <div key={t.id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${t.type === 'buy' ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                      {t.type === 'buy' ? <TrendingUp className="w-4 h-4 text-emerald-400" /> : <TrendingDown className="w-4 h-4 text-red-400" />}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">{t.ticker} — {t.type === 'buy' ? 'Compra' : 'Venda'}</p>
                      <p className="text-[10px] text-gray-500">{t.insider} ({t.role})</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-xs font-bold ${t.type === 'buy' ? 'text-emerald-400' : 'text-red-400'}`}>{formatBRL(t.value)}</p>
                    <p className="text-[9px] text-gray-500">{formatDate(t.date)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Insider Radar */}
      <div className="bg-[#0B1C17] border border-white/5 rounded-2xl overflow-hidden">
        <button
          onClick={() => setExpandedSection(expandedSection === 'radar' ? 'all' : 'radar')}
          className="w-full p-6 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex items-center gap-3">
            <Eye className="w-5 h-5 text-blue-500" />
            <h3 className="text-lg font-bold text-white">Radar de Insiders</h3>
          </div>
          {expandedSection === 'radar' ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
        </button>

        {expandedSection === 'radar' && (
          <div className="px-6 pb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {topSignals.map((s) => (
                <div key={s.ticker} className={`p-4 rounded-xl border ${signalBg(s.signal)}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black text-white">{s.ticker}</span>
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${signalBg(s.signal)}`}>
                      {s.signal}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-500 mb-2">{s.company}</p>
                  <div className="flex justify-between">
                    <span className="text-[10px] text-gray-400">{s.movements} movimentacoes</span>
                    <span className={`text-[10px] font-bold ${s.netValue >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {s.netValue >= 0 ? '+' : ''}{formatBRL(s.netValue)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Full Table */}
      <div className="bg-[#0B1C17] border border-white/5 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-white/5">
          <h3 className="text-lg font-bold text-white mb-4">Todas as Movimentacoes</h3>
          <div className="flex flex-wrap gap-3">
            <input
              type="text"
              placeholder="Filtrar por ticker..."
              value={filterTicker}
              onChange={(e) => setFilterTicker(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 w-32"
            />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as 'all' | 'buy' | 'sell')}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500/50"
            >
              <option value="all">Todos</option>
              <option value="buy">Compras</option>
              <option value="sell">Vendas</option>
            </select>
            <select
              value={filterPeriod}
              onChange={(e) => setFilterPeriod(e.target.value as '7d' | '30d' | 'all')}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500/50"
            >
              <option value="7d">7 dias</option>
              <option value="30d">30 dias</option>
              <option value="all">Todos</option>
            </select>
            <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={showPortfolioOnly}
                onChange={(e) => setShowPortfolioOnly(e.target.checked)}
                className="rounded border-white/20"
              />
              Apenas minha carteira
            </label>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-white/5">
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Ticker</th>
                <th className="px-4 py-3">Insider</th>
                <th className="px-4 py-3">Cargo</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3 text-right">Qtd</th>
                <th className="px-4 py-3 text-right">Preco</th>
                <th className="px-4 py-3 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.02]">
              {displayTransactions.slice(0, 30).map(t => (
                <tr key={t.id} className="group hover:bg-white/[0.02] transition-all">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-gray-400">{formatDate(t.date)}</span>
                      {isRecent(t.date) && (
                        <span className="px-1 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[7px] font-black uppercase">Novo</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-bold text-white">{t.ticker}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[11px] text-gray-300">{t.insider}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] text-gray-500">{t.role}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                      t.type === 'buy' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                    }`}>
                      {t.type === 'buy' ? 'Compra' : 'Venda'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-[11px] text-gray-400 font-mono">
                    {t.quantity.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-[11px] text-gray-400 font-mono">
                    {formatBRL(t.price)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`text-xs font-bold ${t.type === 'buy' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {formatBRL(t.value)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {displayTransactions.length > 30 && (
          <div className="p-4 border-t border-white/5 text-center">
            <p className="text-[10px] text-gray-500">
              Mostrando 30 de {displayTransactions.length} movimentacoes
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center">
        <p className="text-[10px] text-gray-600">
          Dados simulados para demonstracao. Em producao, integrado via API CVM (Instrucao 358).
        </p>
      </div>
    </div>
  );
};

export default InsiderMonitorPage;
