import { Asset, MarketQuote } from '../types';
import {
  normalizeBrapiQuote,
  normalizeCoinGeckoQuote,
  createFallbackQuote,
  getFreshnessStatus,
  getCachedQuote,
  setCachedQuote,
} from './dataPipeline';

const BRAPI_BASE_URL = 'https://brapi.dev/api';
const AWESOME_API_BASE_URL = 'https://economia.awesomeapi.com.br/last';
const COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3';

// Cache Duration: 15 minutes (in milliseconds)
const CACHE_DURATION = 15 * 60 * 1000;
const SEARCH_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours for search results

interface CacheItem<T> {
  data: T;
  timestamp: number;
}

// Helper to handle LocalStorage Cache
const getCachedData = <T>(key: string): T | null => {
  const cached = localStorage.getItem(key);
  if (!cached) return null;

  try {
    const item: CacheItem<T> = JSON.parse(cached);
    const now = Date.now();
    if (now - item.timestamp > CACHE_DURATION) {
      localStorage.removeItem(key);
      return null;
    }
    return item.data;
  } catch {
    return null;
  }
};

const setCachedData = <T>(key: string, data: T) => {
  const item: CacheItem<T> = {
    data,
    timestamp: Date.now(),
  };
  localStorage.setItem(key, JSON.stringify(item));
};

// --- Search Interface ---
export interface SearchResult {
  ticker: string; // Symbol (e.g., PETR4, BTC)
  name: string;
  logo?: string;
  type: 'stock' | 'fii' | 'fiagro' | 'fiinfra' | 'fidc' | 'fip' | 'crypto';
  fundType?: string; // Tipo do fundo estruturado
  cnpj?: string; // CNPJ do fundo
  id?: string; // ID for CoinGecko (e.g., bitcoin)
}

// --- API Functions ---

/**
 * Searches for assets (Stocks, FIIs, Cryptos)
 */
export const searchAssets = async (query: string): Promise<SearchResult[]> => {
  if (query.length < 3) return [];

  const cacheKey = `search_${query.toLowerCase()}`;
  const cached = getCachedData<SearchResult[]>(cacheKey);
  // Relaxed cache check for search results
  if (cached) return cached;

  try {
    const results: SearchResult[] = [];

    // 1. Search BRAPI (Stocks & FIIs)
    // Using list endpoint as search if available, or just construct from know patterns?
    // BRAPI free tier list endpoint is good.
    const brapiPromise = fetch(`${BRAPI_BASE_URL}/quote/list?search=${query}&limit=5`)
      .then(res => res.json())
      .then(data => {
        if (data.stocks) {
          return data.stocks.map((stock: any) => ({
            ticker: stock.stock,
            name: stock.name,
            logo: stock.logo,
            type: stock.stock.endsWith('11') ? 'fii' : 'stock'
          }));
        }
        return [];
      })
      .catch(() => []);

    // 2. Search CoinGecko (Cryptos)
    const coingeckoPromise = fetch(`${COINGECKO_BASE_URL}/search?query=${query}`)
      .then(res => res.json())
      .then(data => {
        if (data.coins) {
          return data.coins.slice(0, 5).map((coin: any) => ({
            ticker: coin.symbol.toUpperCase(),
            name: coin.name,
            logo: coin.thumb,
            type: 'crypto',
            id: coin.id
          }));
        }
        return [];
      })
      .catch(() => []);

    const [brapiResults, coingeckoResults] = await Promise.all([brapiPromise, coingeckoPromise]);
    
    const combined = [...brapiResults, ...coingeckoResults];
    
    // Cache search results for longer (they don't change often)
    setCachedData(cacheKey, combined);
    
    return combined;
  } catch (error) {
    console.error('Search failed:', error);
    return [];
  }
};

/**
 * Fetches Crypto Price from CoinGecko — returns MarketQuote
 */
export const fetchCryptoQuote = async (id: string, ticker?: string): Promise<MarketQuote | null> => {
  // Check in-memory cache first
  const memTicker = ticker || id;
  const memCached = getCachedQuote(memTicker);
  if (memCached) return memCached;

  try {
    const response = await fetch(`${COINGECKO_BASE_URL}/simple/price?ids=${id}&vs_currencies=brl&include_24hr_change=true`);
    const data = await response.json();
    
    if (data[id]) {
      const quote = normalizeCoinGeckoQuote(id, ticker || id.toUpperCase(), data);
      setCachedQuote(quote);
      return quote;
    }
    return null;
  } catch (error) {
    console.error(`Failed to fetch crypto ${id}:`, error);
    return null;
  }
};

/**
 * Fetches current exchange rates (EUR-BRL, USD-BRL)
 */
export const fetchExchangeRates = async (): Promise<{ EUR: number; USD: number }> => {
  const cacheKey = 'rates_cache';
  const cached = getCachedData<{ EUR: number; USD: number }>(cacheKey);
  if (cached) return cached;

  try {
    // Fetches EUR-BRL and USD-BRL
    const response = await fetch(`${AWESOME_API_BASE_URL}/EUR-BRL,USD-BRL`);
    const data = await response.json();
    
    const rates = {
      EUR: parseFloat(data.EURBRL.bid),
      USD: parseFloat(data.USDBRL.bid),
    };

    setCachedData(cacheKey, rates);
    return rates;
  } catch (error) {
    console.error('Failed to fetch exchange rates:', error);
    // Fallback to static if offline
    return { EUR: 6.20, USD: 5.80 };
  }
};

/**
 * Fetches stock/FII data from BRAPI — returns MarketQuote
 */
export const fetchAssetQuote = async (ticker: string): Promise<MarketQuote | null> => {
  // Check in-memory cache first
  const memCached = getCachedQuote(ticker);
  if (memCached) return memCached;

  try {
    const response = await fetch(`${BRAPI_BASE_URL}/quote/${ticker}?range=1d&interval=1d&fundamental=true`);
    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      const quote = normalizeBrapiQuote(data.results[0]);
      setCachedQuote(quote);
      return quote;
    }
    return null;
  } catch (error) {
    console.error(`Failed to fetch quote for ${ticker}:`, error);
    return null;
  }
};

/**
 * Batch fetch quotes for portfolio — returns MarketQuote[]
 */
export const fetchBatchQuotes = async (tickers: string[]): Promise<MarketQuote[]> => {
  if (tickers.length === 0) return [];
  
  const tickersString = tickers.join(',');
  
  try {
    const response = await fetch(`${BRAPI_BASE_URL}/quote/${tickersString}?range=1d&interval=1d&fundamental=true`);
    const data = await response.json();
    const results: any[] = data.results || [];
    
    return results.map((raw: any) => {
      const quote = normalizeBrapiQuote(raw);
      setCachedQuote(quote);
      return quote;
    });
  } catch (error) {
    console.error('Batch fetch failed:', error);
    return [];
  }
};
