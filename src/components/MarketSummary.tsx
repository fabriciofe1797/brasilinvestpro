/**
 * MarketSummary — Resumo Classificado de Dados
 * 
 * Mostra os "melhores" e "piores" em cada categoria:
 * - Top 3 maiores DY
 * - Top 3 maiores altas do dia
 * - Top 3 melhores oportunidades (preco teto / upside)
 * - Top 3 FIIs com melhor P/VP
 * - Top 3 cripto com maior variacao
 * 
 * Ordenado do melhor para o pior com indicadores visuais.
 */

import React, { useMemo } from 'react';
import { Flame, TrendingUp, Target, Building2, Bitcoin } from 'lucide-react';
import { cn } from '../lib/utils';
import { MOCK_ASSETS } from '../data/mockData';
import { calculateClassicCeiling } from '../lib/formulas';
import { useMarketOverview } from '../hooks/useMarketOverview';
import { useTranslation } from 'react-i18next';

interface MarketSummaryProps {
  compact?: boolean;
  className?: string;
}

interface SummaryRowProps {
  rank: number;
  ticker: string;
  value: string;
  isPositive: boolean;
}

const SummaryRow: React.FC<SummaryRowProps> = ({ rank, ticker, value, isPositive }) => (
  <div className="flex items-center gap-2 py-1.5">
    <span className={cn(
      'w-4 h-4 rounded flex items-center justify-center text-[8px] font-black',
      rank === 1 ? 'bg-amber-500/20 text-amber-400' :
      rank === 2 ? 'bg-gray-400/10 text-gray-400' :
      'bg-white/5 text-gray-600'
    )}>
      {rank}
    </span>
    <span className="text-[11px] font-bold text-white flex-1">{ticker}</span>
    <span className={cn(
      'text-[11px] font-black font-mono',
      isPositive ? 'text-emerald-400' : 'text-red-400'
    )}>
      {value}
    </span>
  </div>
);

const MarketSummary: React.FC<MarketSummaryProps> = ({ compact = false, className }) => {
  const { data: marketData } = useMarketOverview();
  const { t } = useTranslation();
  const maxItems = compact ? 3 : 3;

  const summary = useMemo(() => {
    const assets = MOCK_ASSETS;

    // Top 3 DY
    const topDY = [...assets]
      .filter(a => a.dividendYield > 0)
      .sort((a, b) => b.dividendYield - a.dividendYield)
      .slice(0, maxItems);

    // Top 3 Upside (preco teto)
    const withUpside = assets
      .map(a => {
        const annualDiv = a.price * (a.dividendYield / 100);
        const ceiling = calculateClassicCeiling(annualDiv);
        const upside = ceiling ? ((ceiling - a.price) / a.price) * 100 : 0;
        return { ...a, upside };
      })
      .filter(a => a.upside > 0)
      .sort((a, b) => b.upside - a.upside)
      .slice(0, maxItems);

    // Top 3 FIIs P/VP
    const topPVP = assets
      .filter(a => a.category.includes('FII') && a.pvp && a.pvp > 0)
      .sort((a, b) => (a.pvp ?? 99) - (b.pvp ?? 99))
      .slice(0, maxItems);

    // Top 3 Cripto (by 24h change from market data or mock)
    const cryptoItems = [
      { ticker: 'BTC', change: marketData.crypto.BTC?.usd24hChange ?? 0 },
      { ticker: 'ETH', change: marketData.crypto.ETH?.usd24hChange ?? 0 },
      { ticker: 'SOL', change: marketData.crypto.SOL?.usd24hChange ?? 0 },
    ].sort((a, b) => b.change - a.change).slice(0, maxItems);

    // Maiores altas (simulado com lastClose vs price dos mocks)
    const withChange = assets
      .filter(a => a.lastClose > 0)
      .map(a => ({
        ticker: a.ticker,
        change: ((a.price - a.lastClose) / a.lastClose) * 100,
      }))
      .sort((a, b) => b.change - a.change)
      .slice(0, maxItems);

    return { topDY, withUpside, topPVP, cryptoItems, withChange };
  }, [marketData, maxItems]);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <Flame className="w-5 h-5 text-orange-400" />
        <h3 className="text-sm font-black text-white uppercase tracking-widest">
          {t('marketSummary.title')}
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Top DY */}
        <div className="glass-card rounded-xl p-4 border-white/5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-3 h-3 text-emerald-400" />
            <span className="text-[9px] font-black text-gray-500 uppercase tracking-wider">{t('marketSummary.topDY')}</span>
          </div>
          {summary.topDY.map((a, i) => (
            <SummaryRow key={a.ticker} rank={i + 1} ticker={a.ticker} value={`${a.dividendYield.toFixed(1)}%`} isPositive />
          ))}
        </div>

        {/* Maiores Altas */}
        <div className="glass-card rounded-xl p-4 border-white/5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-3 h-3 text-green-400" />
            <span className="text-[9px] font-black text-gray-500 uppercase tracking-wider">{t('marketSummary.topGainers')}</span>
          </div>
          {summary.withChange.map((item, i) => (
            <SummaryRow key={item.ticker} rank={i + 1} ticker={item.ticker} value={`+${item.change.toFixed(1)}%`} isPositive />
          ))}
        </div>

        {/* Melhor Upside */}
        <div className="glass-card rounded-xl p-4 border-white/5">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-3 h-3 text-purple-400" />
            <span className="text-[9px] font-black text-gray-500 uppercase tracking-wider">{t('marketSummary.bestUpside')}</span>
          </div>
          {summary.withUpside.map((a, i) => (
            <SummaryRow key={a.ticker} rank={i + 1} ticker={a.ticker} value={`+${a.upside.toFixed(1)}%`} isPositive />
          ))}
        </div>

        {/* Melhor P/VP (FIIs) */}
        <div className="glass-card rounded-xl p-4 border-white/5">
          <div className="flex items-center gap-2 mb-3">
            <Building2 className="w-3 h-3 text-cyan-400" />
            <span className="text-[9px] font-black text-gray-500 uppercase tracking-wider">{t('marketSummary.bestPVP')}</span>
          </div>
          {summary.topPVP.map((a, i) => (
            <SummaryRow key={a.ticker} rank={i + 1} ticker={a.ticker} value={`${a.pvp?.toFixed(2)}`} isPositive={false} />
          ))}
        </div>

        {/* Cripto */}
        <div className="glass-card rounded-xl p-4 border-white/5">
          <div className="flex items-center gap-2 mb-3">
            <Bitcoin className="w-3 h-3 text-orange-400" />
            <span className="text-[9px] font-black text-gray-500 uppercase tracking-wider">{t('marketSummary.crypto24h')}</span>
          </div>
          {summary.cryptoItems.map((item, i) => (
            <SummaryRow
              key={item.ticker}
              rank={i + 1}
              ticker={item.ticker}
              value={`${item.change >= 0 ? '+' : ''}${item.change.toFixed(1)}%`}
              isPositive={item.change >= 0}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default MarketSummary;
