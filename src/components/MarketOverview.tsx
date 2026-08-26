/**
 * MarketOverview — Painel de indices de mercado
 * 
 * Exibe IBOVESPA, moedas (Dolar, Euro, Yuan), indices macro (Selic, CDI, IPCA)
 * e criptomoedas (BTC, ETH, SOL) em um layout compacto e elegante.
 * 
 * Usado na LandingPage (apos hero) e como widget no Dashboard.
 */

import React from 'react';
import { TrendingUp, TrendingDown, RefreshCw, DollarSign, Coins, Bitcoin, BarChart3 } from 'lucide-react';
import { cn } from '../lib/utils';
import { useMarketOverview } from '../hooks/useMarketOverview';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';

interface MarketOverviewProps {
  compact?: boolean;
  className?: string;
}

function formatBRL(n: number): string {
  return n.toLocaleString(i18n.language, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatUSD(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatPct(n: number | null): string {
  if (n === null || n === undefined) return '---';
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
}

function ChangeBadge({ value }: { value: number | null }) {
  if (value === null) return <span className="text-gray-600 text-xs">---</span>;
  const isUp = value >= 0;
  return (
    <span className={cn(
      'text-xs font-black flex items-center gap-1',
      isUp ? 'text-emerald-400' : 'text-red-400'
    )}>
      {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {formatPct(value)}
    </span>
  );
}

const MarketOverview: React.FC<MarketOverviewProps> = ({ compact = false, className }) => {
  const { data, isLoading, lastUpdated, refetch, error } = useMarketOverview();
  const { t } = useTranslation();

  const ibov = data.ibovespa;

  // Fallback estatico quando APIs falham
  const hasExchangeData = !!(data.exchange.USDBRL || data.exchange.EURBRL);
  const hasCryptoData = !!(data.crypto.BTC || data.crypto.ETH || data.crypto.SOL);
  const hasIbovData = !!(data.ibovespa && data.ibovespa.value > 0);

  // Usar dataQuality do servidor se disponivel, senao detectar localmente
  const dq = data.dataQuality;
  const isStale = dq
    ? (!dq.fx || !dq.crypto)
    : (!hasExchangeData || !hasCryptoData);

  const fallbackExchange = {
    USDBRL: { bid: 5.72, pctChange: -0.3 },
    EURBRL: { bid: 6.21, pctChange: 0.1 },
    CNYBRL: { bid: 0.79, pctChange: 0.05 },
  };

  const fallbackCrypto = {
    BTC: { usd: 104500, brl: 598000, usd24hChange: 1.2, marketCap: 2070000000000 },
    ETH: { usd: 2520, brl: 14400, usd24hChange: -0.8, marketCap: 303000000000 },
    SOL: { usd: 168, brl: 960, usd24hChange: 2.5, marketCap: 82000000000 },
  };

  const exchange = hasExchangeData ? data.exchange : fallbackExchange;
  const crypto = hasCryptoData ? data.crypto : fallbackCrypto;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-5 h-5 text-emerald-400" />
          <h3 className="text-sm font-black text-white uppercase tracking-widest">
            {t('marketOverview.title')}
          </h3>
          {isStale && (
            <span className="text-[9px] font-bold text-amber-400/80 bg-amber-400/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
              {t('marketOverview.estimatedData')}
            </span>
          )}
          {error && (
            <span className="text-[9px] font-bold text-red-400/80 bg-red-400/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
              {t('marketOverview.apiOffline')}
            </span>
          )}
        </div>
        <button
          onClick={refetch}
          disabled={isLoading}
          className="flex items-center gap-2 text-[10px] font-black text-gray-500 hover:text-emerald-400 transition-colors uppercase tracking-wider disabled:opacity-50"
        >
          <RefreshCw className={cn('w-3 h-3', isLoading && 'animate-spin')} />
          {lastUpdated
            ? new Date(lastUpdated).toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' })
            : isLoading ? t('common.loading') : t('marketOverview.refresh')}
        </button>
      </div>

      {/* IBOVESPA Highlight */}
      {(ibov?.value > 0 || !hasIbovData) && (
        <div className="glass-card rounded-2xl p-6 border-white/5 bg-gradient-to-r from-emerald-500/5 to-transparent">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">IBOVESPA</p>
              {ibov?.value > 0 ? (
                <p className="text-3xl font-black text-white tracking-tighter">
                  {ibov.value.toLocaleString(i18n.language, { minimumFractionDigits: 0 })}
                </p>
              ) : (
                <p className="text-3xl font-black text-white/40 tracking-tighter">---</p>
              )}
            </div>
            {ibov?.value > 0 ? (
              <div className="text-right">
                <p className={cn(
                  'text-lg font-black',
                  ibov.change >= 0 ? 'text-emerald-400' : 'text-red-400'
                )}>
                  {ibov.change >= 0 ? '+' : ''}{ibov.change.toFixed(0)} pts
                </p>
                <ChangeBadge value={ibov.changePercent} />
              </div>
            ) : (
              <span className="text-[9px] font-bold text-gray-600 uppercase tracking-wider">{t('marketOverview.unavailable')}</span>
            )}
          </div>
        </div>
      )}

      {/* Grid: Moedas + Macro + Cripto */}
      <div className={cn('grid gap-4', compact ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-3')}>
        {/* Moedas */}
        <div className="glass-card rounded-2xl p-5 border-white/5">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-4 h-4 text-blue-400" />
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('marketOverview.currencies')}</span>
          </div>
          <div className="space-y-3">
            {Object.entries(exchange).map(([key, val]) => {
              if (!val) return null;
              const labels: Record<string, string> = { USDBRL: 'USD/BRL', EURBRL: 'EUR/BRL', CNYBRL: 'CNY/BRL' };
              return (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-300">{labels[key] || key}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-black text-white font-mono">{formatBRL(val.bid)}</span>
                    <ChangeBadge value={val.pctChange} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Indices Macro */}
        <div className="glass-card rounded-2xl p-5 border-white/5">
          <div className="flex items-center gap-2 mb-4">
            <Coins className="w-4 h-4 text-amber-400" />
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('marketOverview.indicators')}</span>
          </div>
          <div className="space-y-3">
            {data.macroIndices.length > 0 ? (
              data.macroIndices.map((idx) => (
                <div key={idx.label} className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-300">{idx.label}</span>
                  <span className="text-sm font-black text-white font-mono">{idx.value}</span>
                </div>
              ))
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-300">Selic</span>
                  <span className="text-sm font-black text-white font-mono">14.75%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-300">CDI</span>
                  <span className="text-sm font-black text-white font-mono">14.65%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-300">IPCA</span>
                  <span className="text-sm font-black text-white font-mono">4.50%</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Cripto */}
        <div className="glass-card rounded-2xl p-5 border-white/5">
          <div className="flex items-center gap-2 mb-4">
            <Bitcoin className="w-4 h-4 text-orange-400" />
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('marketOverview.crypto')}</span>
          </div>
          <div className="space-y-3">
            {Object.entries(crypto).map(([key, val]) => {
              if (!val) return null;
              return (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-300">{key}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-black text-white font-mono">${formatUSD(val.usd)}</span>
                    <ChangeBadge value={val.usd24hChange} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketOverview;
