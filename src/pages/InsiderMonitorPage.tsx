import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
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
  const { t } = useTranslation();

  const [filterTicker, setFilterTicker] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'buy' | 'sell'>('all');
  const [filterPeriod, setFilterPeriod] = useState<'7d' | '30d' | 'all'>('30d');
  const [showPortfolioOnly, setShowPortfolioOnly] = useState(false);
  const [expandedSection, setExpandedSection] = useState<'relevant' | 'portfolio' | 'radar' | 'all'>('relevant');

  const formatBRL = (v: number) => formatCurrency(v, 'BRL');
  const formatDate = (d: string) => new Date(d).toLocaleDateString(i18n.language, { day: '2-digit', month: '2-digit' });

  const signalLabel = (signal: string) =>
    signal === 'bullish' ? t('insider.sigBullish') : signal === 'bearish' ? t('insider.sigBearish') : t('insider.sigNeutral');

  const isRecent = (date: string) => {
    const diff = (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24);
    return diff <= 1;
  };

  // Filter transactions
  const filteredTransactions = transactions.filter(tx => {
    if (filterTicker && tx.ticker.toUpperCase() !== filterTicker.toUpperCase()) return false;
    if (filterType !== 'all' && tx.type !== filterType) return false;
    if (filterPeriod === '7d') {
      const d = new Date(tx.date);
      const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 7);
      return d >= cutoff;
    }
    if (filterPeriod === '30d') {
      const d = new Date(tx.date);
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
            {t('insider.title')}
          </h1>
          <p className="text-gray-500 text-sm font-medium mt-1">
            {t('insider.subtitle')}
          </p>
        </div>
        <button
          onClick={refreshData}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all text-xs font-bold"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          {t('insider.refresh')}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#0B1C17] border border-white/5 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-[10px] font-bold text-gray-500 uppercase">{t('insider.last24h')}</span>
          </div>
          <p className="text-2xl font-black text-white">{stats.total24h}</p>
          <p className="text-[10px] text-gray-500">{t('insider.movements')}</p>
        </div>
        <div className="bg-[#0B1C17] border border-white/5 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-[10px] font-bold text-gray-500 uppercase">{t('insider.last7d')}</span>
          </div>
          <p className="text-2xl font-black text-white">{stats.total7d}</p>
          <p className="text-[10px] text-gray-500">{t('insider.movements')}</p>
        </div>
        <div className="bg-[#0B1C17] border border-white/5 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[10px] font-bold text-gray-500 uppercase">{t('insider.buys30d')}</span>
          </div>
          <p className="text-2xl font-black text-emerald-400">{formatBRL(stats.buyVolume30d)}</p>
        </div>
        <div className="bg-[#0B1C17] border border-white/5 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-3.5 h-3.5 text-red-400" />
            <span className="text-[10px] font-bold text-gray-500 uppercase">{t('insider.sells30d')}</span>
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
              {t('insider.signalLabel')} {signalLabel(stats.netSignal)}
            </p>
            <p className="text-[10px] text-gray-500">
              {stats.netSignal === 'bullish' ? t('insider.descBullish') : stats.netSignal === 'bearish' ? t('insider.descBearish') : t('insider.descNeutral')}
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
            <h3 className="text-lg font-bold text-white">{t('insider.relevantTitle')}</h3>
            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-black border border-amber-500/30">
              {relevantMovements.length}
            </span>
          </div>
          {expandedSection === 'relevant' ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
        </button>

        {expandedSection === 'relevant' && (
          <div className="px-6 pb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {relevantMovements.slice(0, 6).map(tx => (
                <div key={tx.id} className={`p-4 rounded-xl border ${tx.type === 'buy' ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-white">{tx.ticker}</span>
                      {isRecent(tx.date) && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[8px] font-black uppercase">{t('insider.newBadge')}</span>
                      )}
                    </div>
                    <span className={`text-[10px] font-black uppercase ${tx.type === 'buy' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {tx.type === 'buy' ? t('insider.buy') : t('insider.sell')}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 font-bold">{tx.insider} — {tx.role}</p>
                  <div className="flex justify-between mt-2">
                    <span className="text-xs font-bold text-white">{formatBRL(tx.value)}</span>
                    <span className="text-[10px] text-gray-500">{t('insider.sharesAt', { qty: tx.quantity.toLocaleString(), price: formatBRL(tx.price) })}</span>
                  </div>
                  <p className="text-[9px] text-gray-600 mt-1">{formatDate(tx.date)}</p>
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
              <h3 className="text-lg font-bold text-white">{t('insider.portfolioTitle')}</h3>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black border border-emerald-500/30">
                {portfolioSignals.length}
              </span>
            </div>
            {expandedSection === 'portfolio' ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
          </button>

          {expandedSection === 'portfolio' && (
            <div className="px-6 pb-6 space-y-2">
              {portfolioSignals.map(tx => (
                <div key={tx.id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tx.type === 'buy' ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                      {tx.type === 'buy' ? <TrendingUp className="w-4 h-4 text-emerald-400" /> : <TrendingDown className="w-4 h-4 text-red-400" />}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">{tx.ticker} — {tx.type === 'buy' ? t('insider.buyLower') : t('insider.sellLower')}</p>
                      <p className="text-[10px] text-gray-500">{tx.insider} ({tx.role})</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-xs font-bold ${tx.type === 'buy' ? 'text-emerald-400' : 'text-red-400'}`}>{formatBRL(tx.value)}</p>
                    <p className="text-[9px] text-gray-500">{formatDate(tx.date)}</p>
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
            <h3 className="text-lg font-bold text-white">{t('insider.radarTitle')}</h3>
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
                      {signalLabel(s.signal)}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-500 mb-2">{s.company}</p>
                  <div className="flex justify-between">
                    <span className="text-[10px] text-gray-400">{t('insider.movementsCount', { count: s.movements })}</span>
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
          <h3 className="text-lg font-bold text-white mb-4">{t('insider.allTitle')}</h3>
          <div className="flex flex-wrap gap-3">
            <input
              type="text"
              placeholder={t('insider.filterPlaceholder')}
              value={filterTicker}
              onChange={(e) => setFilterTicker(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 w-32"
            />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as 'all' | 'buy' | 'sell')}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500/50"
            >
              <option value="all">{t('insider.optAll')}</option>
              <option value="buy">{t('insider.optBuys')}</option>
              <option value="sell">{t('insider.optSells')}</option>
            </select>
            <select
              value={filterPeriod}
              onChange={(e) => setFilterPeriod(e.target.value as '7d' | '30d' | 'all')}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500/50"
            >
              <option value="7d">{t('insider.opt7d')}</option>
              <option value="30d">{t('insider.opt30d')}</option>
              <option value="all">{t('insider.optAll')}</option>
            </select>
            <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={showPortfolioOnly}
                onChange={(e) => setShowPortfolioOnly(e.target.checked)}
                className="rounded border-white/20"
              />
              {t('insider.onlyPortfolio')}
            </label>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-white/5">
                <th className="px-4 py-3">{t('insider.colDate')}</th>
                <th className="px-4 py-3">{t('insider.colTicker')}</th>
                <th className="px-4 py-3">{t('insider.colInsider')}</th>
                <th className="px-4 py-3">{t('insider.colRole')}</th>
                <th className="px-4 py-3">{t('insider.colType')}</th>
                <th className="px-4 py-3 text-right">{t('insider.colQty')}</th>
                <th className="px-4 py-3 text-right">{t('insider.colPrice')}</th>
                <th className="px-4 py-3 text-right">{t('insider.colValue')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.02]">
              {displayTransactions.slice(0, 30).map(tx => (
                <tr key={tx.id} className="group hover:bg-white/[0.02] transition-all">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-gray-400">{formatDate(tx.date)}</span>
                      {isRecent(tx.date) && (
                        <span className="px-1 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[7px] font-black uppercase">{t('insider.newBadge')}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-bold text-white">{tx.ticker}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[11px] text-gray-300">{tx.insider}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] text-gray-500">{tx.role}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                      tx.type === 'buy' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                    }`}>
                      {tx.type === 'buy' ? t('insider.buyLower') : t('insider.sellLower')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-[11px] text-gray-400 font-mono">
                    {tx.quantity.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-[11px] text-gray-400 font-mono">
                    {formatBRL(tx.price)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`text-xs font-bold ${tx.type === 'buy' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {formatBRL(tx.value)}
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
              {t('insider.showing', { total: displayTransactions.length })}
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center">
        <p className="text-[10px] text-gray-600">
          {t('insider.footer')}
        </p>
      </div>
    </div>
  );
};

export default InsiderMonitorPage;
