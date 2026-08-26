/**
 * AssetRankings — Cards de ranking de ativos
 * 
 * Exibe top 5 em cada categoria:
 * - Maiores Dividend Yield
 * - Melhor Score (calculateRanking)
 * - Maior Upside (Preco Teto)
 * - Melhor P/VP (para FIIs)
 * 
 * Usado na LandingPage e Dashboard.
 */

import React, { useMemo } from 'react';
import { Trophy, TrendingUp, ArrowUpCircle, ArrowDownCircle, BarChart3 } from 'lucide-react';
import { cn } from '../lib/utils';
import { useStore } from '../store/useStore';
import { MOCK_ASSETS } from '../data/mockData';
import { calculateRanking, calculateClassicCeiling } from '../lib/formulas';
import type { Asset } from '../types';

interface AssetRankingsProps {
  compact?: boolean;
  className?: string;
}

interface RankingRowProps {
  rank: number;
  ticker: string;
  name: string;
  value: string;
  isPositive?: boolean;
}

const RankingRow: React.FC<RankingRowProps> = ({ rank, ticker, name, value, isPositive }) => (
  <div className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
    <span className={cn(
      'w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black',
      rank === 1 ? 'bg-amber-500/20 text-amber-400' :
      rank === 2 ? 'bg-gray-400/20 text-gray-300' :
      rank === 3 ? 'bg-orange-500/20 text-orange-400' :
      'bg-white/5 text-gray-500'
    )}>
      {rank}
    </span>
    <div className="flex-1 min-w-0">
      <p className="text-xs font-black text-white truncate">{ticker}</p>
      <p className="text-[9px] text-gray-500 truncate">{name}</p>
    </div>
    <span className={cn(
      'text-xs font-black font-mono',
      isPositive === undefined ? 'text-emerald-400' : isPositive ? 'text-emerald-400' : 'text-red-400'
    )}>
      {value}
    </span>
  </div>
);

const AssetRankings: React.FC<AssetRankingsProps> = ({ compact = false, className }) => {
  const { portfolio } = useStore();

  // Combinar MOCK_ASSETS com assets do store
  const allAssets = useMemo(() => {
    const storeAssets = useStore.getState().assets;
    const combined = new Map<string, Asset>();
    for (const a of MOCK_ASSETS) combined.set(a.ticker, a);
    for (const a of storeAssets) {
      if (!combined.has(a.ticker)) combined.set(a.ticker, a as Asset);
    }
    return Array.from(combined.values());
  }, []);

  // Rankings
  const rankings = useMemo(() => {
    // Top DY
    const topDY = [...allAssets]
      .filter(a => a.dividendYield > 0)
      .sort((a, b) => b.dividendYield - a.dividendYield)
      .slice(0, 5);

    // Score (usando calculateRanking)
    const scored = calculateRanking(allAssets, portfolio);
    const topScore = scored.slice(0, 5);

    // Maior Upside
    const withUpside = allAssets
      .map(a => {
        const annualDiv = a.price * (a.dividendYield / 100);
        const ceiling = calculateClassicCeiling(annualDiv);
        const upside = ceiling ? ((ceiling - a.price) / a.price) * 100 : 0;
        return { ...a, upside };
      })
      .filter(a => a.upside > 0)
      .sort((a, b) => b.upside - a.upside)
      .slice(0, 5);

    // Melhor P/VP (FIIs apenas)
    const topPVP = allAssets
      .filter(a => a.category.includes('FII') && a.pvp && a.pvp > 0)
      .sort((a, b) => (a.pvp ?? 99) - (b.pvp ?? 99))
      .slice(0, 5);

    return { topDY, topScore, withUpside, topPVP };
  }, [allAssets, portfolio]);

  const maxItems = compact ? 3 : 5;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Trophy className="w-5 h-5 text-amber-400" />
          <h3 className="text-sm font-black text-white uppercase tracking-widest">
            Rankings de Ativos
          </h3>
        </div>
      </div>

      <div className={cn('grid gap-4', compact ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4')}>
        {/* Top DY */}
        <div className="glass-card rounded-2xl p-5 border-white/5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Maiores DY</span>
          </div>
          <div className="space-y-1">
            {rankings.topDY.slice(0, maxItems).map((a, i) => (
              <RankingRow
                key={a.ticker}
                rank={i + 1}
                ticker={a.ticker}
                name={a.name}
                value={`${a.dividendYield.toFixed(1)}%`}
              />
            ))}
          </div>
        </div>

        {/* Top Score */}
        <div className="glass-card rounded-2xl p-5 border-white/5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-blue-400" />
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Melhor Score</span>
          </div>
          <div className="space-y-1">
            {rankings.topScore.slice(0, maxItems).map((entry, i) => (
              <RankingRow
                key={entry.ticker}
                rank={i + 1}
                ticker={entry.ticker}
                name={entry.name}
                value={`${entry.score}`}
              />
            ))}
          </div>
        </div>

        {/* Maior Upside */}
        <div className="glass-card rounded-2xl p-5 border-white/5">
          <div className="flex items-center gap-2 mb-4">
            <ArrowUpCircle className="w-4 h-4 text-purple-400" />
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Maior Upside</span>
          </div>
          <div className="space-y-1">
            {rankings.withUpside.slice(0, maxItems).map((a, i) => (
              <RankingRow
                key={a.ticker}
                rank={i + 1}
                ticker={a.ticker}
                name={a.name}
                value={`+${a.upside.toFixed(1)}%`}
                isPositive
              />
            ))}
          </div>
        </div>

        {/* Melhor P/VP (FIIs) */}
        <div className="glass-card rounded-2xl p-5 border-white/5">
          <div className="flex items-center gap-2 mb-4">
            <ArrowDownCircle className="w-4 h-4 text-cyan-400" />
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Melhor P/VP</span>
          </div>
          <div className="space-y-1">
            {rankings.topPVP.slice(0, maxItems).map((a, i) => (
              <RankingRow
                key={a.ticker}
                rank={i + 1}
                ticker={a.ticker}
                name={a.name}
                value={`${a.pvp?.toFixed(2) ?? '---'}`}
                isPositive={false}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssetRankings;
