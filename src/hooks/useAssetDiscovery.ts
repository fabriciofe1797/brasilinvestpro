/**
 * useAssetDiscovery — Hook para descoberta e watchlist de ativos
 *
 * Funcionalidades:
 * - Busca de acoes/FIIs via BrAPI (search_brapi)
 * - Busca de criptomoedas via CoinGecko (search_coingecko)
 * - Listagem de ativos populares por categoria (get_popular_stocks)
 * - Listagem de top criptos por market cap (get_top_cryptos)
 * - Watchlist persistente no Supabase (user_data)
 * - Cotacoes em tempo real para a watchlist (get_watchlist_quotes)
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const EDGE_FN_URL = `${SUPABASE_URL}/functions/v1/app-proxy`;
const WATCHLIST_KEY = 'watchlist_v1';
const POLL_INTERVAL = 2 * 60 * 1000; // 2 min para cotacoes da watchlist

// ─── Tipos ──────────────────────────────────────────────────────────────

export interface DiscoveredAsset {
  ticker: string;
  name: string;
  price: number;
  change: number;
  logo: string | null;
  type: 'stock' | 'fii' | 'fiagro' | 'fiinfra' | 'fidc' | 'fip' | 'crypto';
  fundType?: string; // Tipo do fundo estruturado
  cnpj?: string; // CNPJ do fundo
  id?: string; // CoinGecko ID para cripto
  marketCapRank?: number | null;
  marketCap?: number;
  currency: 'BRL' | 'USD';
}

export interface WatchlistItem {
  ticker: string;
  name: string;
  type: 'stock' | 'fii' | 'fiagro' | 'fiinfra' | 'fidc' | 'fip' | 'crypto';
  fundType?: string;
  cnpj?: string;
  coinGeckoId?: string; // para cripto
  addedAt: string;
}

export interface WatchlistQuote {
  ticker: string;
  price: number;
  change: number;
  currency: 'BRL' | 'USD';
}

const proxyFetch = async (body: Record<string, unknown>) => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  try {
    const r = await fetch(EDGE_FN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(body),
    });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
};

export const useAssetDiscovery = () => {
  const { getToken } = useAuth();
  const mountedRef = useRef(true);

  // ─── State ──────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<DiscoveredAsset[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [popularStocks, setPopularStocks] = useState<DiscoveredAsset[]>([]);
  const [isLoadingPopular, setIsLoadingPopular] = useState(false);

  const [topCryptos, setTopCryptos] = useState<DiscoveredAsset[]>([]);
  const [isLoadingTopCryptos, setIsLoadingTopCryptos] = useState(false);

  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [isWatchlistLoaded, setIsWatchlistLoaded] = useState(false);
  const [isSavingWatchlist, setIsSavingWatchlist] = useState(false);

  const [watchlistQuotes, setWatchlistQuotes] = useState<Record<string, WatchlistQuote>>({});
  const [isLoadingQuotes, setIsLoadingQuotes] = useState(false);

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Search (debounced) ─────────────────────────────────────────────

  const performSearch = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const [brapiResult, cgResult] = await Promise.all([
        proxyFetch({ action: 'search_brapi', query, limit: 20 }),
        proxyFetch({ action: 'search_coingecko', query, limit: 15 }),
      ]);

      if (!mountedRef.current) return;

      const stocks: DiscoveredAsset[] = brapiResult?.ok
        ? (brapiResult.results || []).map((r: any) => ({
            ticker: r.ticker,
            name: r.name,
            price: r.price || 0,
            change: r.change || 0,
            logo: r.logo || null,
            type: (r.type || 'stock') as DiscoveredAsset['type'],
            fundType: r.fundType || undefined,
            cnpj: r.cnpj || undefined,
            currency: 'BRL' as const,
          }))
        : [];

      const cryptos: DiscoveredAsset[] = cgResult?.ok
        ? (cgResult.results || []).map((r: any) => ({
            ticker: r.ticker,
            name: r.name,
            price: 0,
            change: 0,
            logo: r.logo || null,
            type: 'crypto' as const,
            id: r.id,
            marketCapRank: r.marketCapRank,
            currency: 'USD' as const,
          }))
        : [];

      setSearchResults([...stocks, ...cryptos]);
    } catch {
      // Silently fail
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSearchInput = useCallback((query: string) => {
    setSearchQuery(query);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    searchTimerRef.current = setTimeout(() => performSearch(query), 400);
  }, [performSearch]);

  // ─── Popular Stocks ─────────────────────────────────────────────────

  const loadPopularStocks = useCallback(async (category: string = 'all') => {
    setIsLoadingPopular(true);
    try {
      // Categorias de fundos estruturados
      const fundCategories = ['fiagro', 'fiinfra', 'fidc', 'fip'];
      if (fundCategories.includes(category)) {
        console.log(`[loadPopularStocks] Carregando fundos: ${category}`);
        const result = await proxyFetch({ action: 'get_popular_funds', fundType: category });
        console.log(`[loadPopularStocks] get_popular_funds resultado:`, result?.ok ? `${result.results?.length || 0} resultados` : 'falhou');
        if (!mountedRef.current) return;
        if (result?.ok && Array.isArray(result.results)) {
          setPopularStocks(
            result.results.map((r: any) => ({
              ticker: r.ticker,
              name: r.name,
              price: r.price || 0,
              change: r.change || 0,
              logo: r.logo || null,
              type: (r.fundType || category) as DiscoveredAsset['type'],
              fundType: r.fundType || category,
              cnpj: r.cnpj || undefined,
              currency: 'BRL' as const,
            }))
          );
        } else {
          console.warn(`[loadPopularStocks] Resultado invalido para ${category}:`, result);
          setPopularStocks([]);
        }
        return;
      }
      const result = await proxyFetch({ action: 'get_popular_stocks', category });
      if (!mountedRef.current) return;
      if (result?.ok) {
        setPopularStocks(
          (result.results || []).map((r: any) => ({
            ticker: r.ticker,
            name: r.name,
            price: r.price || 0,
            change: r.change || 0,
            logo: r.logo || null,
            type: (r.type || 'stock') as DiscoveredAsset['type'],
            fundType: r.fundType || undefined,
            currency: 'BRL' as const,
          }))
        );
      }
    } catch {
      // Silently fail
    } finally {
      setIsLoadingPopular(false);
    }
  }, []);

  // ─── Top Cryptos ────────────────────────────────────────────────────

  const loadTopCryptos = useCallback(async (limit: number = 30) => {
    setIsLoadingTopCryptos(true);
    try {
      const result = await proxyFetch({ action: 'get_top_cryptos', limit });
      if (!mountedRef.current) return;
      if (result?.ok) {
        setTopCryptos(
          (result.results || []).map((r: any) => ({
            ticker: r.ticker,
            name: r.name,
            price: r.price || 0,
            change: r.change24h || 0,
            logo: r.logo || null,
            type: 'crypto' as const,
            id: r.id,
            marketCapRank: r.marketCapRank,
            marketCap: r.marketCap,
            currency: 'USD' as const,
          }))
        );
      }
    } catch {
      // Silently fail
    } finally {
      setIsLoadingTopCryptos(false);
    }
  }, []);

  // ─── Watchlist Persistence ──────────────────────────────────────────

  const loadWatchlist = useCallback(async () => {
    try {
      const result = await proxyFetch({ action: 'get_user_data', data_keys: [WATCHLIST_KEY] });
      if (!mountedRef.current) return;
      if (result?.ok && result.data?.[WATCHLIST_KEY]) {
        const saved = result.data[WATCHLIST_KEY];
        if (Array.isArray(saved)) {
          setWatchlist(saved as WatchlistItem[]);
        }
      }
      setIsWatchlistLoaded(true);
    } catch {
      setIsWatchlistLoaded(true);
    }
  }, []);

  const saveWatchlist = useCallback(async (items: WatchlistItem[]) => {
    if (isSavingWatchlist) return;
    setIsSavingWatchlist(true);
    try {
      await proxyFetch({
        action: 'set_user_data',
        items: [{ data_key: WATCHLIST_KEY, data_value: items }],
      });
    } catch {
      // Silently fail
    } finally {
      setIsSavingWatchlist(false);
    }
  }, [isSavingWatchlist]);

  const addToWatchlist = useCallback((item: Omit<WatchlistItem, 'addedAt'>) => {
    setWatchlist(prev => {
      if (prev.some(w => w.ticker === item.ticker)) return prev;
      const next = [...prev, { ...item, addedAt: new Date().toISOString() }];
      saveWatchlist(next);
      return next;
    });
  }, [saveWatchlist]);

  const removeFromWatchlist = useCallback((ticker: string) => {
    setWatchlist(prev => {
      const next = prev.filter(w => w.ticker !== ticker);
      saveWatchlist(next);
      return next;
    });
  }, [saveWatchlist]);

  const isInWatchlist = useCallback((ticker: string) => {
    return watchlist.some(w => w.ticker === ticker);
  }, [watchlist]);

  // ─── Watchlist Quotes ───────────────────────────────────────────────

  const refreshWatchlistQuotes = useCallback(async () => {
    if (watchlist.length === 0) return;
    setIsLoadingQuotes(true);
    try {
      const stockTickers = watchlist.filter(w => w.type !== 'crypto').map(w => w.ticker);
      const cryptoIds = watchlist.filter(w => w.type === 'crypto').map(w => w.coinGeckoId || w.ticker.toLowerCase());

      const result = await proxyFetch({
        action: 'get_watchlist_quotes',
        tickers: stockTickers,
        cryptoIds,
      });

      if (!mountedRef.current) return;

      if (result?.ok) {
        const quotes: Record<string, WatchlistQuote> = {};
        const prices = result.prices || {};
        const changes = result.changes || {};

        for (const item of watchlist) {
          const t = item.ticker;
          const p = prices[t];
          if (p) {
            if (typeof p === 'object') {
              // Crypto with { brl, usd }
              quotes[t] = {
                ticker: t,
                price: p.brl || p.usd || 0,
                change: changes[t] || 0,
                currency: p.brl ? 'BRL' : 'USD',
              };
            } else {
              // Stock with numeric price
              quotes[t] = {
                ticker: t,
                price: Number(p),
                change: changes[t] || 0,
                currency: 'BRL',
              };
            }
          }
        }
        setWatchlistQuotes(quotes);
      }
    } catch {
      // Silently fail
    } finally {
      setIsLoadingQuotes(false);
    }
  }, [watchlist]);

  // ─── Effects ────────────────────────────────────────────────────────

  // Load watchlist on mount
  useEffect(() => {
    mountedRef.current = true;
    loadWatchlist();
    return () => { mountedRef.current = false; };
  }, [loadWatchlist]);

  // Poll watchlist quotes
  useEffect(() => {
    if (!isWatchlistLoaded || watchlist.length === 0) return;
    refreshWatchlistQuotes();
    const interval = setInterval(refreshWatchlistQuotes, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [isWatchlistLoaded, watchlist.length, refreshWatchlistQuotes]);

  // Cleanup search timer
  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, []);

  return {
    // Search
    searchQuery,
    searchResults,
    isSearching,
    handleSearchInput,
    clearSearch: () => { setSearchQuery(''); setSearchResults([]); },

    // Popular stocks
    popularStocks,
    isLoadingPopular,
    loadPopularStocks,

    // Top cryptos
    topCryptos,
    isLoadingTopCryptos,
    loadTopCryptos,

    // Watchlist
    watchlist,
    isWatchlistLoaded,
    isSavingWatchlist,
    addToWatchlist,
    removeFromWatchlist,
    isInWatchlist,

    // Watchlist quotes
    watchlistQuotes,
    isLoadingQuotes,
    refreshWatchlistQuotes,
  };
};
