/**
 * FIIsPage — Pagina dedicada a Fundos Imobiliarios
 *
 * Inspirada no "Tudo sobre Fundos Imobiliarios" do investidor10.
 * - Catalogo completo de FIIs (BrAPI quote/list — disponivel no plano gratuito)
 * - Busca por ticker/nome, ordenacao e paginacao
 * - Fiagros em destaque
 * - Rankings de FIIs
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Building2, TrendingUp, TrendingDown, Search, Star, BarChart3, Sprout, Loader2 } from 'lucide-react';
import { useAuth } from '@clerk/clerk-react';
import { cn } from '../lib/utils';
import type { Asset } from '../types';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const EDGE_FN_URL = `${SUPABASE_URL}/functions/v1/app-proxy`;

const PAGE_SIZE = 50;

const proxyFetch = async (body: Record<string, unknown>, token?: string | null) => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  try {
    const r = await fetch(EDGE_FN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${token ?? SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(body),
    });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
};

function formatBRL(n: number): string {
  return n.toLocaleString(i18n.language, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatMillions(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}B`;
  return `${n.toFixed(0)}M`;
}

const FIIsPage: React.FC = () => {
  const { t } = useTranslation();
  const { getToken } = useAuth();
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'liquidez' | 'dy' | 'pvp' | 'pl' | 'variacao'>('liquidez');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [fiiAssets, setFiiAssets] = useState<Asset[]>([]);
  const [fiagroAssets, setFiagroAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Busca dados reais da BrAPI (catalogo completo via quote/list no app-proxy)
  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // JWT do Clerk para autenticar no app-proxy (mesmo padrao dos demais servicos)
        const token = await getToken({ template: 'supabase' }).catch(() => null);
        const fiiResult = await proxyFetch({ action: 'get_popular_funds', fundType: 'fii' }, token);
        const fiagroResult = await proxyFetch({ action: 'get_popular_funds', fundType: 'fiagro' }, token);

        if (!mounted) return;

        if (fiiResult?.ok && Array.isArray(fiiResult.results)) {
          const mapped: Asset[] = fiiResult.results.map((r: any) => ({
            id: r.ticker,
            ticker: r.ticker,
            name: r.name,
            category: 'FII',
            price: r.price || 0,
            change: r.change || 0,
            dividendYield: r.dividendYield || 0,
            pvp: r.navPerShare && r.price ? r.price / r.navPerShare : undefined,
            patrimonioLiquido: r.patrimonioLiquido || 0,
            liquidezDiaria: r.liquidezDiaria || 0,
            variacao12m: r.variacao12m,
            currency: 'BRL',
          }));
          setFiiAssets(mapped);
        }

        if (fiagroResult?.ok && Array.isArray(fiagroResult.results)) {
          const mapped: Asset[] = fiagroResult.results.map((r: any) => ({
            id: r.ticker,
            ticker: r.ticker,
            name: r.name,
            category: 'FII Agro',
            price: r.price || 0,
            change: r.change || 0,
            dividendYield: r.dividendYield || 0,
            pvp: r.navPerShare && r.price ? r.price / r.navPerShare : undefined,
            patrimonioLiquido: r.patrimonioLiquido || 0,
            liquidezDiaria: r.liquidezDiaria || 0,
            variacao12m: r.variacao12m,
            currency: 'BRL',
          }));
          setFiagroAssets(mapped);
        }
      } catch (err) {
        console.error('[FIIsPage] Erro ao buscar dados:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    fetchData();
    return () => { mounted = false; };
  }, [getToken]);

  // Reinicia a paginacao quando a busca muda
  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [search]);

  const filteredAssets = useMemo(() => {
    const q = search.trim().toLowerCase();
    let filtered = fiiAssets;
    if (q) {
      filtered = filtered.filter(a =>
        a.ticker.toLowerCase().includes(q) || a.name.toLowerCase().includes(q)
      );
    }
    const sorted = [...filtered].sort((a, b) => {
      let valA = 0, valB = 0;
      switch (sortBy) {
        case 'dy': valA = a.dividendYield; valB = b.dividendYield; break;
        case 'pvp': valA = a.pvp ?? -1; valB = b.pvp ?? -1; break;
        case 'pl': valA = a.patrimonioLiquido ?? 0; valB = b.patrimonioLiquido ?? 0; break;
        case 'liquidez': valA = a.liquidezDiaria ?? 0; valB = b.liquidezDiaria ?? 0; break;
        case 'variacao': valA = a.change ?? 0; valB = b.change ?? 0; break;
      }
      return sortDir === 'desc' ? valB - valA : valA - valB;
    });
    return sorted;
  }, [fiiAssets, search, sortBy, sortDir]);

  const visibleAssets = filteredAssets.slice(0, visibleCount);
  const fiagros = fiagroAssets;

  // Rankings (somente ativos com dado disponivel)
  const topDY = [...fiiAssets].filter(a => a.dividendYield > 0).sort((a, b) => b.dividendYield - a.dividendYield).slice(0, 5);
  const topGainers = [...fiiAssets].filter(a => (a.change ?? 0) !== 0).sort((a, b) => (b.change ?? 0) - (a.change ?? 0)).slice(0, 5);
  const topLiquidez = [...fiiAssets].filter(a => a.liquidezDiaria).sort((a, b) => (b.liquidezDiaria ?? 0) - (a.liquidezDiaria ?? 0)).slice(0, 5);
  const topPVP = [...fiiAssets].filter(a => a.pvp && a.pvp > 0).sort((a, b) => (a.pvp ?? 99) - (b.pvp ?? 99)).slice(0, 5);

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(field);
      setSortDir('desc');
    }
  };

  const SortHeader = ({ field, label }: { field: typeof sortBy; label: string }) => (
    <th
      className="px-4 py-4 text-right cursor-pointer hover:text-emerald-400 transition-colors"
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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Building2 className="w-6 h-6 text-emerald-400" />
          <h1 className="text-2xl font-black text-white tracking-tight">{t('fiis.title')}</h1>
        </div>
        <p className="text-sm text-gray-500">{t('fiis.subtitle')}</p>
      </div>

      {/* Catalogo completo de FIIs — Tabela Principal */}
      <div className="glass-card rounded-[2rem] overflow-hidden border-white/5">
        <div className="p-6 border-b border-white/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-sm font-black text-white uppercase tracking-tight">{t('fiis.allFiis')}</h2>
            <p className="text-[10px] text-gray-500 font-bold uppercase mt-1">
              {isLoading ? t('fiis.loading') : t('fiis.assetsFound', { count: filteredAssets.length })}
            </p>
          </div>
          {/* Busca */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('fiis.searchPlaceholder')}
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/40"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-white/5">
                <th className="px-4 py-4">{t('fiis.colAsset')}</th>
                <th className="px-4 py-4 text-right">{t('fiis.colPrice')}</th>
                <SortHeader field="variacao" label={t('fiis.colChange')} />
                <SortHeader field="dy" label="DY" />
                <SortHeader field="pvp" label="P/VP" />
                <SortHeader field="pl" label={t('fiis.colPatrimony')} />
                <SortHeader field="liquidez" label={t('fiis.colLiquidity')} />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.02]">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="flex items-center justify-center gap-3">
                      <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
                      <span className="text-sm text-gray-500 font-bold">{t('fiis.loadingBrapi')}</span>
                    </div>
                  </td>
                </tr>
              ) : visibleAssets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                    {t('fiis.noAssets')}
                  </td>
                </tr>
              ) : visibleAssets.map(asset => (
                <tr key={asset.ticker} className="group hover:bg-white/[0.02] transition-all">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[9px] font-black text-gray-400">
                        {asset.ticker.substring(0, 2)}
                      </div>
                      <div>
                        <p className="text-xs font-black text-white">{asset.ticker}</p>
                        <p className="text-[9px] text-gray-500 max-w-[220px] truncate">{asset.name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right text-white font-mono text-xs">
                    R$ {formatBRL(asset.price)}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className={cn(
                      'text-xs font-black',
                      (asset.change ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
                    )}>
                      {(asset.change ?? 0) >= 0 ? '+' : ''}{(asset.change ?? 0).toFixed(2)}%
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    {asset.dividendYield > 0 ? (
                      <span className="text-xs font-black text-emerald-400">{asset.dividendYield.toFixed(1)}%</span>
                    ) : (
                      <span className="text-xs text-gray-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className={cn(
                      'text-xs font-black font-mono',
                      (asset.pvp ?? 1) < 1 ? 'text-emerald-400' : (asset.pvp ?? 1) > 1.1 ? 'text-red-400' : 'text-gray-300'
                    )}>
                      {asset.pvp?.toFixed(2) ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right text-gray-400 font-mono text-xs">
                    {asset.patrimonioLiquido ? `R$ ${formatMillions(asset.patrimonioLiquido)}` : '—'}
                  </td>
                  <td className="px-4 py-4 text-right text-gray-400 font-mono text-xs">
                    {asset.liquidezDiaria ? `R$ ${asset.liquidezDiaria.toFixed(1)}M` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginacao */}
        {!isLoading && visibleCount < filteredAssets.length && (
          <div className="p-4 border-t border-white/5 flex justify-center">
            <button
              onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
              className="px-6 py-2.5 rounded-lg bg-white/5 border border-white/10 text-xs font-black text-white uppercase tracking-wider hover:bg-emerald-500/10 hover:border-emerald-500/20 hover:text-emerald-400 transition-all"
            >
              {t('fiis.showMore')} ({filteredAssets.length - visibleCount})
            </button>
          </div>
        )}
      </div>

      {/* Fiagros em Destaque */}
      <div className="glass-card rounded-[2rem] p-6 border-white/5">
        <div className="flex items-center gap-2 mb-6">
          <Sprout className="w-5 h-5 text-green-400" />
          <h2 className="text-sm font-black text-white uppercase tracking-tight">{t('fiis.fiagrosTitle')}</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {isLoading ? (
            <div className="col-span-full flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
              <span className="ml-3 text-sm text-gray-500 font-bold">{t('fiis.loadingFiagros')}</span>
            </div>
          ) : fiagros.length === 0 ? (
            <div className="col-span-full text-center py-8 text-gray-500">{t('fiis.noFiagros')}</div>
          ) : fiagros.slice(0, 10).map(f => (
            <div key={f.ticker} className="p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-green-500/20 transition-all">
              <p className="text-xs font-black text-white">{f.ticker}</p>
              <p className="text-[9px] text-gray-500 mb-3 truncate">{f.name}</p>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-[9px] text-gray-500">{t('fiis.colChange')}</span>
                  <span className={cn('text-[10px] font-black', (f.change ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                    {(f.change ?? 0) >= 0 ? '+' : ''}{(f.change ?? 0).toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[9px] text-gray-500">{t('fiis.colLiquidity')}</span>
                  <span className="text-[10px] font-black text-white">{f.liquidezDiaria ? `R$ ${f.liquidezDiaria.toFixed(1)}M` : '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[9px] text-gray-500">{t('fiis.colPrice')}</span>
                  <span className="text-[10px] font-black text-white">R$ {formatBRL(f.price)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Rankings de FIIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Maiores Altas do dia */}
        <div className="glass-card rounded-2xl p-5 border-white/5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('fiis.topGainers')}</span>
          </div>
          {topGainers.length === 0 ? (
            <p className="text-[10px] text-gray-600">{t('fiis.noData')}</p>
          ) : topGainers.map((a, i) => (
            <div key={a.ticker} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black text-gray-600 w-4">{i + 1}</span>
                <span className="text-xs font-bold text-white">{a.ticker}</span>
              </div>
              <span className="text-xs font-black text-emerald-400">+{(a.change ?? 0).toFixed(2)}%</span>
            </div>
          ))}
        </div>

        {/* Maior Liquidez */}
        <div className="glass-card rounded-2xl p-5 border-white/5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-purple-400" />
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('fiis.topLiquidity')}</span>
          </div>
          {topLiquidez.length === 0 ? (
            <p className="text-[10px] text-gray-600">{t('fiis.noData')}</p>
          ) : topLiquidez.map((a, i) => (
            <div key={a.ticker} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black text-gray-600 w-4">{i + 1}</span>
                <span className="text-xs font-bold text-white">{a.ticker}</span>
              </div>
              <span className="text-xs font-black text-white">R$ {a.liquidezDiaria?.toFixed(1)}M</span>
            </div>
          ))}
        </div>

        {/* Maiores Dividendos */}
        <div className="glass-card rounded-2xl p-5 border-white/5">
          <div className="flex items-center gap-2 mb-4">
            <Star className="w-4 h-4 text-amber-400" />
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('fiis.topDY')}</span>
          </div>
          {topDY.length === 0 ? (
            <p className="text-[10px] text-gray-600">{t('fiis.noData')}</p>
          ) : topDY.map((a, i) => (
            <div key={a.ticker} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black text-gray-600 w-4">{i + 1}</span>
                <span className="text-xs font-bold text-white">{a.ticker}</span>
              </div>
              <span className="text-xs font-black text-emerald-400">{a.dividendYield.toFixed(1)}%</span>
            </div>
          ))}
        </div>

        {/* Melhor P/VP */}
        <div className="glass-card rounded-2xl p-5 border-white/5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-cyan-400" />
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('fiis.topPVP')}</span>
          </div>
          {topPVP.length === 0 ? (
            <p className="text-[10px] text-gray-600">{t('fiis.noData')}</p>
          ) : topPVP.map((a, i) => (
            <div key={a.ticker} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black text-gray-600 w-4">{i + 1}</span>
                <span className="text-xs font-bold text-white">{a.ticker}</span>
              </div>
              <span className="text-xs font-black text-emerald-400">{a.pvp?.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FIIsPage;
