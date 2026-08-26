/**
 * Data Pipeline Service — Fase 5
 * 
 * Normaliza todas as fontes de dados (BrAPI, CoinGecko, AwesomeAPI)
 * num schema unificado MarketQuote com source, freshness e confidence.
 */

import type { MarketQuote, ExchangeQuote, QuoteSource, FreshnessStatus } from '../types';
import i18n from '../i18n';

// ─── Freshness Logic ─────────────────────────────────────────────────────────
const FRESHNESS_THRESHOLDS = {
  live: 5 * 60 * 1000,      // < 5 min = live
  delayed: 30 * 60 * 1000,  // < 30 min = delayed
  stale: 24 * 60 * 60 * 1000, // < 24h = stale
  // > 24h = unavailable
};

export function getFreshnessStatus(lastUpdatedAt: string | null): FreshnessStatus {
  if (!lastUpdatedAt) return 'unavailable';
  const age = Date.now() - new Date(lastUpdatedAt).getTime();
  if (age <= FRESHNESS_THRESHOLDS.live) return 'live';
  if (age <= FRESHNESS_THRESHOLDS.delayed) return 'delayed';
  if (age <= FRESHNESS_THRESHOLDS.stale) return 'stale';
  return 'unavailable';
}

export function getFreshnessColor(status: FreshnessStatus): string {
  switch (status) {
    case 'live': return 'text-emerald-400';
    case 'delayed': return 'text-amber-400';
    case 'stale': return 'text-orange-400';
    case 'unavailable': return 'text-red-400';
  }
}

export function getFreshnessLabel(status: FreshnessStatus): string {
  switch (status) {
    case 'live': return i18n.t('freshness.live');
    case 'delayed': return i18n.t('freshness.delayed');
    case 'stale': return i18n.t('freshness.stale');
    case 'unavailable': return i18n.t('freshness.unavailable');
  }
}

export function getSourceLabel(source: QuoteSource): string {
  switch (source) {
    case 'brapi': return i18n.t('freshness.srcBrapi');
    case 'brapi-funds': return i18n.t('freshness.srcBrapiFunds');
    case 'coingecko': return i18n.t('freshness.srcCoinGecko');
    case 'awesomeapi': return i18n.t('freshness.srcAwesomeApi');
    case 'awesomeapi-direct': return i18n.t('freshness.srcAwesomeApi');
    case 'exchangerate': return i18n.t('freshness.srcExchangeRate');
    case 'bcb': return i18n.t('freshness.srcBcb');
    case 'manual': return i18n.t('freshness.srcManual');
    case 'derived': return i18n.t('freshness.srcDerived');
    case 'mock': return i18n.t('freshness.srcMock');
  }
}

export function getSourceColor(source: QuoteSource): string {
  switch (source) {
    case 'brapi': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
    case 'brapi-funds': return 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20';
    case 'coingecko': return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
    case 'awesomeapi': return 'text-green-400 bg-green-500/10 border-green-500/20';
    case 'awesomeapi-direct': return 'text-green-400 bg-green-500/10 border-green-500/20';
    case 'exchangerate': return 'text-teal-400 bg-teal-500/10 border-teal-500/20';
    case 'bcb': return 'text-sky-400 bg-sky-500/10 border-sky-500/20';
    case 'manual': return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
    case 'derived': return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
    case 'mock': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
  }
}

// ─── Quote Normalization ─────────────────────────────────────────────────────

/**
 * Normaliza resultado da BrAPI em MarketQuote
 */
export function normalizeBrapiQuote(raw: any): MarketQuote {
  const now = new Date().toISOString();
  const price = raw.regularMarketPrice ?? null;
  const prevClose = raw.regularMarketPreviousClose ?? null;
  const change = price && prevClose
    ? ((price - prevClose) / prevClose) * 100
    : null;

  return {
    ticker: raw.symbol || raw.ticker || '',
    price,
    previousClose: prevClose,
    changePercent: change ? Math.round(change * 100) / 100 : null,
    currency: 'BRL',
    source: 'brapi',
    lastUpdatedAt: now,
    status: 'live',
    confidenceLevel: 'high',
  };
}

/**
 * Normaliza resultado da CoinGecko em MarketQuote
 */
export function normalizeCoinGeckoQuote(coinId: string, ticker: string, raw: any): MarketQuote {
  const now = new Date().toISOString();
  const price = raw[coinId]?.brl ?? null;
  const change = raw[coinId]?.brl_24h_change ?? null;

  return {
    ticker,
    price,
    previousClose: price && change ? price / (1 + change / 100) : null,
    changePercent: change ? Math.round(change * 100) / 100 : null,
    currency: 'BRL',
    source: 'coingecko',
    lastUpdatedAt: now,
    status: 'live',
    confidenceLevel: 'high',
  };
}

/**
 * Normaliza resultado da AwesomeAPI em ExchangeQuote
 */
export function normalizeExchangeQuote(pair: string, raw: any): ExchangeQuote {
  const now = new Date().toISOString();
  const rate = parseFloat(raw?.bid) || 0;
  const prevClose = parseFloat(raw?.prevClose) || rate;
  const change = prevClose > 0 ? ((rate - prevClose) / prevClose) * 100 : 0;

  return {
    pair,
    rate,
    source: 'awesomeapi',
    lastUpdatedAt: now,
    status: 'live',
    changePercent24h: Math.round(change * 100) / 100,
  };
}

/**
 * Cria MarketQuote de fallback (mock/estimado)
 */
export function createFallbackQuote(ticker: string, price: number, currency: 'BRL' | 'USD' | 'EUR' = 'BRL'): MarketQuote {
  return {
    ticker,
    price,
    previousClose: price,
    changePercent: 0,
    currency,
    source: 'mock',
    lastUpdatedAt: null,
    status: 'unavailable',
    confidenceLevel: 'low',
  };
}

// ─── Cache com TTL ───────────────────────────────────────────────────────────

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  source: QuoteSource;
}

const QUOTE_CACHE_TTL = 5 * 60 * 1000; // 5 min
const EXCHANGE_CACHE_TTL = 3 * 60 * 1000; // 3 min

const quoteCache = new Map<string, CacheEntry<MarketQuote>>();
const exchangeCache = new Map<string, CacheEntry<ExchangeQuote>>();

export function getCachedQuote(ticker: string): MarketQuote | null {
  const entry = quoteCache.get(ticker);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > QUOTE_CACHE_TTL) {
    quoteCache.delete(ticker);
    return null;
  }
  return entry.data;
}

export function setCachedQuote(quote: MarketQuote): void {
  quoteCache.set(quote.ticker, {
    data: quote,
    timestamp: Date.now(),
    source: quote.source,
  });
}

export function getCachedExchange(pair: string): ExchangeQuote | null {
  const entry = exchangeCache.get(pair);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > EXCHANGE_CACHE_TTL) {
    exchangeCache.delete(pair);
    return null;
  }
  return entry.data;
}

export function setCachedExchange(quote: ExchangeQuote): void {
  exchangeCache.set(quote.pair, {
    data: quote,
    timestamp: Date.now(),
    source: quote.source,
  });
}

// ─── Formatação de Freshness ─────────────────────────────────────────────────

export function formatLastUpdated(isoString: string | null): string {
  if (!isoString) return i18n.t('freshness.neverUpdated');
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);

  if (diffSec < 60) return i18n.t('freshness.justNow');
  if (diffMin < 60) return i18n.t('freshness.minAgo', { count: diffMin });
  if (diffHour < 24) return i18n.t('freshness.hourAgo', { count: diffHour });
  return date.toLocaleDateString(i18n.language, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// ─── Confidence Badge ────────────────────────────────────────────────────────

export function getConfidenceLabel(level: 'high' | 'medium' | 'low'): string {
  switch (level) {
    case 'high': return 'Alta confiança';
    case 'medium': return 'Confiança média';
    case 'low': return 'Dado estimado';
  }
}

export function getConfidenceColor(level: 'high' | 'medium' | 'low'): string {
  switch (level) {
    case 'high': return 'text-emerald-400';
    case 'medium': return 'text-amber-400';
    case 'low': return 'text-red-400';
  }
}
