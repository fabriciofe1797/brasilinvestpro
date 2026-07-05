import React, { useState, useMemo, useEffect } from 'react';
import { Search, Star, RefreshCw, TrendingUp, TrendingDown, Loader2, Eye, EyeOff } from 'lucide-react';
import { useStore } from '../store/useStore';
import { MOCK_ASSETS } from '../data/mockData';
import AssetCard from '../components/AssetCard';
import AddInvestmentModal from '../components/AddInvestmentModal';
import { cn } from '../lib/utils';
import { Asset, MarketQuote, QuoteSource } from '../types';
import { useAuth } from '@clerk/clerk-react';
import { getQuotesDetailed } from '../services/database';
import { getFreshnessStatus } from '../services/dataPipeline';
import { useAssetDiscovery, DiscoveredAsset } from '../hooks/useAssetDiscovery';

const CATEGORIES: { label: string; value: string | null }[] = [
  { label: 'Todos', value: null },
  { label: 'Tijolo', value: 'FII Tijolo' },
  { label: 'Papel', value: 'FII Papel' },
  { label: 'Agro', value: 'FII Agro' },
  { label: 'Ações', value: 'Ações Dividendos' },
  { label: 'Renda Fixa', value: 'Renda Fixa' },
  { label: 'Internacional', value: 'Ações Internacional' },
  { label: 'Cripto', value: 'Cripto' },
];

type Tab = 'catalogo' | 'descobrir' | 'watchlist';
type PopularCategory = 'all' | 'acoes' | 'fii' | 'fiagro';

const POPULAR_CATS: { label: string; value: PopularCategory }[] = [
  { label: 'Todos', value: 'all' },
  { label: 'Ações', value: 'acoes' },
  { label: 'FIIs', value: 'fii' },
  { label: 'Fiagros', value: 'fiagro' },
];

const MarketHub: React.FC = () => {
  const { assets, updateAssetsWithQuotes } = useStore();
  const { getToken } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('catalogo');

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [quotesMap, setQuotesMap] = useState<Record<string, MarketQuote>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedAssetForModal, setSelectedAssetForModal] = useState<string | undefined>(undefined);

  const discovery = useAssetDiscovery();
  const [popularCat, setPopularCat] = useState<PopularCategory>('all');

  const allDisplayAssets = useMemo(() => {
    const assetMap = new Map<string, Asset>();
    MOCK_ASSETS.forEach(asset => assetMap.set(asset.id, asset));
    assets.forEach(asset => assetMap.set(asset.id, asset));
    return Array.from(assetMap.values());
  }, [assets]);

  const filteredAssets = useMemo(() => {
    return allDisplayAssets.filter((asset) => {
      const matchesSearch =
        asset.ticker.toLowerCase().includes(search.toLowerCase()) ||
        asset.name.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = selectedCategory
        ? (selectedCategory === 'Renda Fixa'
          ? (asset.category === 'Renda Fixa' || asset.category === 'Renda Fixa ETF')
          : selectedCategory === 'Internacional'
            ? asset.category === 'Ações Internacional'
            : asset.category === selectedCategory)
        : true;
      return matchesSearch && matchesCategory;
    });
  }, [allDisplayAssets, search, selectedCategory]);

  const catalogTickersKey = useMemo(
    () => Array.from(new Set(allDisplayAssets.map(asset => asset.ticker))).sort().join('|'),
    [allDisplayAssets]
  );

  const refreshQuotes = async () => {
    setIsRefreshing(true);
    try {
      const token = await getToken({ template: 'supabase' });
      if (!token) return;
      const tickers = Array.from(new Set(allDisplayAssets.map(a => a.ticker)));
      if (tickers.length === 0) return;
      const { prices, sources, updatedAt } = await getQuotesDetailed(tickers, token);
      const hasRealData = Object.keys(prices).length > 0;
      if (!hasRealData) { setIsRefreshing(false); return; }
      const newQuotesMap: Record<string, MarketQuote> = {};
      const quotesForUpdate: { ticker: string; price: number; source: QuoteSource; updatedAt: string }[] = [];
      for (const [t, p] of Object.entries(prices)) {
        if (typeof p === 'number' && p > 0) {
          const src = (sources[t] || 'brapi') as QuoteSource;
          const updated = updatedAt[t] || new Date().toISOString();
          quotesForUpdate.push({ ticker: t, price: p, source: src, updatedAt: updated });
          newQuotesMap[t] = {
            ticker: t, price: p, previousClose: p, changePercent: null,
            currency: 'BRL', source: src, lastUpdatedAt: updated,
            status: getFreshnessStatus(updated),
            confidenceLevel: src === 'brapi' || src === 'coingecko' ? 'high' : 'medium',
          };
        }
      }
      if (quotesForUpdate.length > 0) updateAssetsWithQuotes(quotesForUpdate);
      setQuotesMap(newQuotesMap);
    } catch (e) {
      console.error('Erro ao buscar cotações:', e);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => { refreshQuotes(); }, [catalogTickersKey]);

  useEffect(() => {
    if (activeTab === 'descobrir') {
      discovery.loadPopularStocks(popularCat);
      discovery.loadTopCryptos(30);
    }
  }, [activeTab, popularCat]);

  const handleAssetClick = (assetId: string) => {
    setSelectedAssetForModal(assetId);
    setIsAddModalOpen(true);
  };

  const formatBRL = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });

  const formatUSD = (v: number) =>
    v >= 1e9 ? `$${(v / 1e9).toFixed(1)}B` : v >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const DiscoveryCard: React.FC<{ item: DiscoveredAsset }> = ({ item }) => {
    const inWatchlist = discovery.isInWatchlist(item.ticker);
    return (
      <div className="glass-card rounded-2xl p-4 border-white/5 hover:border-emerald-500/20 transition-all group flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {item.logo ? (
            <img src={item.logo} alt={item.ticker} className="w-8 h-8 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          ) : (
            <span className="text-[10px] font-black text-gray-500">{item.ticker.slice(0, 3)}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-white tracking-tight">{item.ticker}</span>
            <span className={cn(
              "text-[9px] font-black uppercase px-1.5 py-0.5 rounded",
              item.type === 'crypto' ? 'bg-amber-500/10 text-amber-400' :
              item.type === 'fii' ? 'bg-blue-500/10 text-blue-400' : 'bg-emerald-500/10 text-emerald-400'
            )}>
              {item.type === 'fii' ? 'FII' : item.type === 'crypto' ? 'Cripto' : 'Ação'}
            </span>
            {item.marketCapRank && (
              <span className="text-[9px] font-bold text-gray-600">#{item.marketCapRank}</span>
            )}
          </div>
          <p className="text-[10px] text-gray-500 font-medium truncate">{item.name}</p>
        </div>
        <div className="text-right flex-shrink-0">
          {item.price > 0 ? (
            <p className="text-sm font-black text-white font-mono">
              {item.currency === 'BRL' ? formatBRL(item.price) : formatUSD(item.price)}
            </p>
          ) : (
            <p className="text-xs text-gray-600 font-bold">---</p>
          )}
          {item.change !== 0 && (
            <div className={cn("flex items-center justify-end gap-0.5 text-[10px] font-black",
              item.change >= 0 ? 'text-emerald-400' : 'text-red-500'
            )}>
              {item.change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {item.change >= 0 ? '+' : ''}{item.change.toFixed(2)}%
            </div>
          )}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (inWatchlist) discovery.removeFromWatchlist(item.ticker);
            else discovery.addToWatchlist({ ticker: item.ticker, name: item.name, type: item.type, coinGeckoId: item.id });
          }}
          className={cn(
            "p-2 rounded-xl transition-all flex-shrink-0",
            inWatchlist ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20' : 'bg-white/5 text-gray-600 hover:text-amber-400 hover:bg-amber-500/10'
          )}
          title={inWatchlist ? 'Remover da watchlist' : 'Adicionar à watchlist'}
        >
          <Star className="w-4 h-4" fill={inWatchlist ? 'currentColor' : 'none'} />
        </button>
      </div>
    );
  };

  const WatchlistRow: React.FC<{ item: typeof discovery.watchlist[0] }> = ({ item }) => {
    const quote = discovery.watchlistQuotes[item.ticker];
    return (
      <div className="glass-card rounded-2xl p-4 border-white/5 hover:border-emerald-500/20 transition-all flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-black text-white">{item.ticker.slice(0, 4)}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-white tracking-tight">{item.ticker}</span>
            <span className={cn(
              "text-[9px] font-black uppercase px-1.5 py-0.5 rounded",
              item.type === 'crypto' ? 'bg-amber-500/10 text-amber-400' :
              item.type === 'fii' ? 'bg-blue-500/10 text-blue-400' : 'bg-emerald-500/10 text-emerald-400'
            )}>
              {item.type === 'fii' ? 'FII' : item.type === 'crypto' ? 'Cripto' : 'Ação'}
            </span>
          </div>
          <p className="text-[10px] text-gray-500 font-medium truncate">{item.name}</p>
        </div>
        <div className="text-right flex-shrink-0">
          {quote ? (
            <>
              <p className="text-sm font-black text-white font-mono">
                {quote.currency === 'BRL' ? formatBRL(quote.price) : formatUSD(quote.price)}
              </p>
              {quote.change !== 0 && (
                <div className={cn("flex items-center justify-end gap-0.5 text-[10px] font-black",
                  quote.change >= 0 ? 'text-emerald-400' : 'text-red-500'
                )}>
                  {quote.change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {quote.change >= 0 ? '+' : ''}{quote.change.toFixed(2)}%
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-gray-600 font-bold">
              {discovery.isLoadingQuotes ? 'Atualizando...' : 'Sem dados'}
            </p>
          )}
        </div>
        <button
          onClick={() => discovery.removeFromWatchlist(item.ticker)}
          className="p-2 rounded-xl bg-red-500/5 text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-all flex-shrink-0"
          title="Remover da watchlist"
        >
          <EyeOff className="w-4 h-4" />
        </button>
      </div>
    );
  };

  const TABS: { id: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'catalogo', label: 'Catálogo', icon: <Search className="w-4 h-4" /> },
    { id: 'descobrir', label: 'Descobrir', icon: <Star className="w-4 h-4" /> },
    { id: 'watchlist', label: 'Watchlist', icon: <Eye className="w-4 h-4" />, count: discovery.watchlist.length },
  ];

  return (
    <div className="bg-premium min-h-screen">
      <div className="premium-glow-1" />
      <div className="premium-glow-2" />
      <div className="relative z-10 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 pt-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex flex-col">
            <h1 className="text-3xl font-black tracking-tight text-white uppercase underline decoration-emerald-500 decoration-4 underline-offset-8">
              Hub de <span className="text-emerald-500">Mercado</span>
            </h1>
            <p className="text-gray-500 text-sm font-bold uppercase mt-4 tracking-widest">
              Descubra, acompanhe e monitore todos os ativos disponíveis.
            </p>
          </div>
          {activeTab === 'catalogo' && (
            <button type="button" onClick={refreshQuotes} disabled={isRefreshing}
              className="self-start md:self-auto px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-emerald-400 hover:bg-emerald-500/10 transition-all disabled:opacity-50 flex items-center gap-2">
              <RefreshCw className={cn("w-3 h-3", isRefreshing && "animate-spin")} />
              {isRefreshing ? 'Sincronizando...' : 'Sincronizar Cotações'}
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-white/5 pb-2">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={cn("flex items-center gap-2 px-5 py-3 rounded-t-xl text-[10px] font-black uppercase tracking-widest transition-all border-b-2",
                activeTab === tab.id ? "bg-white/5 text-emerald-400 border-emerald-500" : "text-gray-500 hover:text-white border-transparent hover:border-white/10")}>
              {tab.icon}
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[9px]">{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* ═══ TAB 1: CATÁLOGO ═══ */}
        {activeTab === 'catalogo' && (
          <>
            <div className="space-y-4">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-600 group-focus-within:text-emerald-500 transition-colors" />
                <input type="text" placeholder="Buscar por ticker ou nome (ex: HGLG11, Banco...)"
                  value={search} onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-14 rounded-2xl bg-white/[0.02] border border-white/5 focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/5 pl-12 pr-4 transition-all placeholder:text-gray-600 text-white font-medium" />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide no-scrollbar">
                {CATEGORIES.map((cat) => (
                  <button key={cat.label} onClick={() => setSelectedCategory(cat.value)}
                    className={cn("px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border whitespace-nowrap",
                      selectedCategory === cat.value ? "bg-emerald-500 text-black border-emerald-500 shadow-lg shadow-emerald-500/20" : "bg-white/5 border-white/5 text-gray-500 hover:border-emerald-500/30 hover:text-white")}>
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filteredAssets.length > 0 ? filteredAssets.map((asset) => (
                <AssetCard key={asset.id} asset={asset} quote={quotesMap[asset.ticker]} onClick={() => handleAssetClick(asset.id)} />
              )) : (
                <div className="col-span-full text-center py-20 glass-card rounded-2xl border-dashed border-white/10">
                  <div className="bg-white/5 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-white/5">
                    <Search className="h-8 w-8 text-gray-700" />
                  </div>
                  <p className="text-gray-400 font-bold uppercase text-xs tracking-widest">Nenhum ativo encontrado.</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* ═══ TAB 2: DESCOBRIR ═══ */}
        {activeTab === 'descobrir' && (
          <div className="space-y-8">
            <div className="space-y-3">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-600 group-focus-within:text-emerald-500 transition-colors" />
                <input type="text" placeholder="Buscar qualquer ativo na B3 ou criptomoeda... (ex: PETR4, Apple, SOL)"
                  value={discovery.searchQuery} onChange={(e) => discovery.handleSearchInput(e.target.value)}
                  className="w-full h-14 rounded-2xl bg-white/[0.02] border border-white/5 focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/5 pl-12 pr-12 transition-all placeholder:text-gray-600 text-white font-medium" />
                {discovery.isSearching && (
                  <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-500 animate-spin" />
                )}
              </div>
              {discovery.searchResults.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Resultados ({discovery.searchResults.length})</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {discovery.searchResults.map((item, i) => (
                      <DiscoveryCard key={`${item.ticker}-${i}`} item={item} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-white uppercase tracking-tight">Ativos Populares na B3</h3>
                <button onClick={() => discovery.loadPopularStocks(popularCat)} disabled={discovery.isLoadingPopular}
                  className="p-2 rounded-lg bg-white/5 text-gray-500 hover:text-emerald-400 transition-all">
                  <RefreshCw className={cn("w-4 h-4", discovery.isLoadingPopular && "animate-spin")} />
                </button>
              </div>
              <div className="flex gap-2">
                {POPULAR_CATS.map(cat => (
                  <button key={cat.value} onClick={() => setPopularCat(cat.value)}
                    className={cn("px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all border",
                      popularCat === cat.value ? "bg-emerald-500 text-black border-emerald-500" : "bg-white/5 border-white/5 text-gray-500 hover:text-white hover:border-emerald-500/30")}>
                    {cat.label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {discovery.isLoadingPopular && discovery.popularStocks.length === 0 ? (
                  <div className="col-span-full flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
                    <span className="ml-3 text-sm text-gray-500 font-bold">Carregando ativos...</span>
                  </div>
                ) : discovery.popularStocks.length > 0 ? (
                  discovery.popularStocks.map((item, i) => (
                    <DiscoveryCard key={`pop-${item.ticker}-${i}`} item={item} />
                  ))
                ) : (
                  <p className="col-span-full text-center py-8 text-gray-600 text-sm">Nenhum ativo carregado.</p>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-white uppercase tracking-tight">Top Criptomoedas por Market Cap</h3>
                <button onClick={() => discovery.loadTopCryptos(30)} disabled={discovery.isLoadingTopCryptos}
                  className="p-2 rounded-lg bg-white/5 text-gray-500 hover:text-emerald-400 transition-all">
                  <RefreshCw className={cn("w-4 h-4", discovery.isLoadingTopCryptos && "animate-spin")} />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {discovery.isLoadingTopCryptos && discovery.topCryptos.length === 0 ? (
                  <div className="col-span-full flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
                    <span className="ml-3 text-sm text-gray-500 font-bold">Carregando criptos...</span>
                  </div>
                ) : discovery.topCryptos.length > 0 ? (
                  discovery.topCryptos.map((item, i) => (
                    <DiscoveryCard key={`crypto-${item.id || item.ticker}-${i}`} item={item} />
                  ))
                ) : (
                  <p className="col-span-full text-center py-8 text-gray-600 text-sm">Nenhuma cripto carregada.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══ TAB 3: WATCHLIST ═══ */}
        {activeTab === 'watchlist' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-white">Minha Watchlist</h3>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">
                  {discovery.watchlist.length} ativo{discovery.watchlist.length !== 1 ? 's' : ''} monitorado{discovery.watchlist.length !== 1 ? 's' : ''}
                </p>
              </div>
              <button onClick={() => discovery.refreshWatchlistQuotes()}
                disabled={discovery.isLoadingQuotes || discovery.watchlist.length === 0}
                className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-emerald-400 hover:bg-emerald-500/10 transition-all disabled:opacity-50 flex items-center gap-2">
                <RefreshCw className={cn("w-3 h-3", discovery.isLoadingQuotes && "animate-spin")} />
                Atualizar
              </button>
            </div>
            {discovery.watchlist.length === 0 ? (
              <div className="text-center py-20 glass-card rounded-2xl border-dashed border-white/10">
                <div className="bg-white/5 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-white/5">
                  <Star className="h-8 w-8 text-gray-700" />
                </div>
                <p className="text-gray-400 font-bold uppercase text-xs tracking-widest mb-2">Watchlist vazia</p>
                <p className="text-gray-600 text-sm">Vá para a aba "Descobrir" e adicione ativos para monitorar.</p>
                <button onClick={() => setActiveTab('descobrir')}
                  className="mt-6 px-6 py-2.5 rounded-xl bg-emerald-500 text-black text-[10px] font-black uppercase tracking-widest hover:bg-emerald-400 transition-all">
                  Descobrir Ativos
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {discovery.watchlist.map(item => (
                  <WatchlistRow key={item.ticker} item={item} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <AddInvestmentModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} preSelectedAssetId={selectedAssetForModal} />
    </div>
  );
};

export default MarketHub;
