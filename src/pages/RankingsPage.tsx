/**
 * RankingsPage — Pagina dedicada de rankings
 * 
 * Tabs: Acoes | FIIs | Cripto | Geral
 * Ordenacao por: DY, Score, Upside, P/VP, PL, Variacao
 * Tabela completa com todos os ativos
 * Filtros por segmento
 */

import React, { useState, useMemo } from 'react';
import { Trophy, TrendingUp, TrendingDown, Filter } from 'lucide-react';
import { cn } from '../lib/utils';
import { MOCK_ASSETS } from '../data/mockData';
import { calculateRanking, calculateClassicCeiling } from '../lib/formulas';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';

type TabFilter = 'geral' | 'acoes' | 'fiis' | 'cripto';
type SortField = 'dy' | 'score' | 'upside' | 'pvp' | 'pl' | 'variacao' | 'price';

const TAB_KEYS: TabFilter[] = ['geral', 'acoes', 'fiis', 'cripto'];

const SORT_KEYS: SortField[] = ['score', 'dy', 'upside', 'pvp', 'pl', 'price'];

function formatBRL(n: number): string {
  return n.toLocaleString(i18n.language, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const RankingsPage: React.FC = () => {
  const { t } = useTranslation();
  const [tab, setTab] = useState<TabFilter>('geral');
  const [sortBy, setSortBy] = useState<SortField>('score');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const tabs = useMemo(
    () => (t('rankings.tabs', { returnObjects: true }) as string[]).map((label, i) => ({ key: TAB_KEYS[i], label })),
    [t]
  );
  const sortOptions = useMemo(
    () => (t('rankings.sortOptions', { returnObjects: true }) as string[]).map((label, i) => ({ key: SORT_KEYS[i], label })),
    [t]
  );

  // Filtrar por tab
  const filteredAssets = useMemo(() => {
    let assets = [...MOCK_ASSETS];
    switch (tab) {
      case 'acoes':
        assets = assets.filter(a => a.category === 'Ações Dividendos' || a.category === 'Ações Internacional');
        break;
      case 'fiis':
        assets = assets.filter(a => a.category.includes('FII'));
        break;
      case 'cripto':
        assets = assets.filter(a => a.category === 'Cripto');
        break;
    }
    return assets;
  }, [tab]);

  // Calcular rankings
  const rankedAssets = useMemo(() => {
    const scored = calculateRanking(filteredAssets, []);
    const scoreMap = new Map(scored.map(s => [s.ticker, s]));

    const enriched = filteredAssets.map(a => {
      const annualDiv = a.price * (a.dividendYield / 100);
      const ceiling = calculateClassicCeiling(annualDiv);
      const upside = ceiling ? ((ceiling - a.price) / a.price) * 100 : 0;
      const change = a.lastClose > 0 ? ((a.price - a.lastClose) / a.lastClose) * 100 : 0;
      const entry = scoreMap.get(a.ticker);

      return {
        ...a,
        score: entry?.score ?? 0,
        upside,
        change,
      };
    });

    // Sort
    enriched.sort((a, b) => {
      let valA = 0, valB = 0;
      switch (sortBy) {
        case 'dy': valA = a.dividendYield; valB = b.dividendYield; break;
        case 'score': valA = a.score; valB = b.score; break;
        case 'upside': valA = a.upside; valB = b.upside; break;
        case 'pvp': valA = a.pvp ?? 99; valB = b.pvp ?? 99; break;
        case 'pl': valA = a.pl ?? 99; valB = b.pl ?? 99; break;
        case 'variacao': valA = a.change; valB = b.change; break;
        case 'price': valA = a.price; valB = b.price; break;
      }
      return sortDir === 'desc' ? valB - valA : valA - valB;
    });

    return enriched;
  }, [filteredAssets, sortBy, sortDir]);

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(field);
      setSortDir('desc');
    }
  };

  const SortHeader = ({ field, label }: { field: SortField; label: string }) => (
    <th
      className="px-4 py-4 text-right cursor-pointer hover:text-emerald-400 transition-colors select-none"
      onClick={() => handleSort(field)}
    >
      <span className="flex items-center justify-end gap-1">
        {label}
        {sortBy === field && (
          sortDir === 'desc' ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />
        )}
      </span>
    </th>
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Trophy className="w-6 h-6 text-amber-400" />
        <h1 className="text-2xl font-black text-white tracking-tight">{t('rankings.title')}</h1>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2">
        {tabs.map(tb => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border',
              tab === tb.key
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-white/5 text-gray-500 border-white/5 hover:text-white'
            )}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {/* Sort Options */}
      <div className="flex items-center gap-2">
        <Filter className="w-3 h-3 text-gray-500" />
        <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider">{t('rankings.sortLabel')}</span>
        {sortOptions.map(opt => (
          <button
            key={opt.key}
            onClick={() => handleSort(opt.key)}
            className={cn(
              'px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all border',
              sortBy === opt.key
                ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                : 'bg-white/5 text-gray-600 border-white/5 hover:text-white'
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="glass-card rounded-[2rem] overflow-hidden border-white/5">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-white/5">
                <th className="px-4 py-4">#</th>
                <th className="px-4 py-4">{t('rankings.colAsset')}</th>
                <SortHeader field="price" label={t('rankings.colPrice')} />
                <SortHeader field="dy" label="DY" />
                <SortHeader field="score" label="Score" />
                <SortHeader field="upside" label="Upside" />
                <SortHeader field="pvp" label="P/VP" />
                <SortHeader field="pl" label="P/L" />
                <SortHeader field="variacao" label={t('rankings.colChange')} />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.02]">
              {rankedAssets.map((asset, idx) => (
                <tr key={asset.ticker} className="group hover:bg-white/[0.02] transition-all">
                  <td className="px-4 py-4">
                    <span className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black',
                      idx === 0 ? 'bg-amber-500/20 text-amber-400' :
                      idx === 1 ? 'bg-gray-400/20 text-gray-300' :
                      idx === 2 ? 'bg-orange-500/20 text-orange-400' :
                      'bg-white/5 text-gray-600'
                    )}>
                      {idx + 1}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[9px] font-black text-gray-400">
                        {asset.ticker.substring(0, 2)}
                      </div>
                      <div>
                        <p className="text-xs font-black text-white">{asset.ticker}</p>
                        <p className="text-[9px] text-gray-500">{asset.name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right text-white font-mono text-xs">
                    R$ {formatBRL(asset.price)}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className="text-xs font-black text-emerald-400">{asset.dividendYield.toFixed(1)}%</span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className={cn(
                      'text-xs font-black',
                      asset.score >= 70 ? 'text-emerald-400' :
                      asset.score >= 50 ? 'text-yellow-400' :
                      'text-gray-400'
                    )}>
                      {asset.score}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className={cn(
                      'text-xs font-black',
                      asset.upside > 0 ? 'text-emerald-400' : 'text-red-400'
                    )}>
                      {asset.upside > 0 ? '+' : ''}{asset.upside.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className={cn(
                      'text-xs font-black font-mono',
                      (asset.pvp ?? 1) < 1 ? 'text-emerald-400' : (asset.pvp ?? 1) > 1.1 ? 'text-red-400' : 'text-gray-300'
                    )}>
                      {asset.pvp?.toFixed(2) ?? '---'}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className={cn(
                      'text-xs font-black font-mono',
                      (asset.pl ?? 0) > 0 && (asset.pl ?? 99) <= 5 ? 'text-emerald-400' :
                      (asset.pl ?? 99) > 20 ? 'text-red-400' : 'text-gray-300'
                    )}>
                      {asset.pl?.toFixed(1) ?? '---'}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className={cn(
                      'text-xs font-black',
                      asset.change >= 0 ? 'text-emerald-400' : 'text-red-400'
                    )}>
                      {asset.change >= 0 ? '+' : ''}{asset.change.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rankedAssets.length === 0 && (
          <div className="p-12 text-center">
            <p className="text-gray-500 text-sm">{t('rankings.empty')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RankingsPage;
