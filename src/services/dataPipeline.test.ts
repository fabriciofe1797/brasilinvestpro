import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  getFreshnessStatus,
  getFreshnessLabel,
  getSourceLabel,
  normalizeBrapiQuote,
  normalizeCoinGeckoQuote,
  createFallbackQuote,
  getCachedQuote,
  setCachedQuote,
  getCachedExchange,
  setCachedExchange,
  formatLastUpdated,
  getConfidenceLabel,
} from './dataPipeline';
import type { MarketQuote } from '../types';

afterEach(() => {
  vi.useRealTimers();
});

describe('getFreshnessStatus', () => {
  it('retorna unavailable sem timestamp', () => {
    expect(getFreshnessStatus(null)).toBe('unavailable');
  });

  it('classifica por idade do dado', () => {
    const now = Date.now();
    expect(getFreshnessStatus(new Date(now - 1 * 60 * 1000).toISOString())).toBe('live');
    expect(getFreshnessStatus(new Date(now - 10 * 60 * 1000).toISOString())).toBe('delayed');
    expect(getFreshnessStatus(new Date(now - 2 * 60 * 60 * 1000).toISOString())).toBe('stale');
    expect(getFreshnessStatus(new Date(now - 48 * 60 * 60 * 1000).toISOString())).toBe('unavailable');
  });
});

describe('rótulos de status e fonte', () => {
  it('getFreshnessLabel cobre todos os estados', () => {
    expect(getFreshnessLabel('live')).toBe('Tempo real');
    expect(getFreshnessLabel('unavailable')).toBe('Indisponível');
  });

  it('getSourceLabel inclui fonte BCB', () => {
    expect(getSourceLabel('bcb')).toBe('Banco Central');
    expect(getSourceLabel('brapi')).toBe('BrAPI');
    expect(getSourceLabel('mock')).toBe('Estimado');
  });
});

describe('normalizeBrapiQuote', () => {
  it('normaliza preço e variação percentual', () => {
    const quote = normalizeBrapiQuote({
      symbol: 'PETR4',
      regularMarketPrice: 38.5,
      regularMarketPreviousClose: 38.0,
    });
    expect(quote.ticker).toBe('PETR4');
    expect(quote.price).toBe(38.5);
    expect(quote.changePercent).toBeCloseTo(1.32, 2);
    expect(quote.source).toBe('brapi');
    expect(quote.currency).toBe('BRL');
    expect(quote.confidenceLevel).toBe('high');
  });

  it('tolera payload incompleto', () => {
    const quote = normalizeBrapiQuote({ symbol: 'VALE3' });
    expect(quote.price).toBeNull();
    expect(quote.changePercent).toBeNull();
  });
});

describe('normalizeCoinGeckoQuote', () => {
  it('deriva previousClose a partir da variação 24h', () => {
    const quote = normalizeCoinGeckoQuote('bitcoin', 'BTC', {
      bitcoin: { brl: 550000, brl_24h_change: 10 },
    });
    expect(quote.price).toBe(550000);
    expect(quote.changePercent).toBeCloseTo(10, 2);
    // previousClose = 550000 / 1.10 = 500000
    expect(quote.previousClose).toBeCloseTo(500000, 0);
    expect(quote.source).toBe('coingecko');
  });

  it('retorna preço null sem dados da moeda', () => {
    const quote = normalizeCoinGeckoQuote('bitcoin', 'BTC', {});
    expect(quote.price).toBeNull();
    expect(quote.previousClose).toBeNull();
  });
});

describe('createFallbackQuote', () => {
  it('marca fallback como estimado e indisponível', () => {
    const quote = createFallbackQuote('XYZ', 42);
    expect(quote.price).toBe(42);
    expect(quote.source).toBe('mock');
    expect(quote.status).toBe('unavailable');
    expect(quote.confidenceLevel).toBe('low');
    expect(quote.lastUpdatedAt).toBeNull();
  });
});

describe('cache com TTL', () => {
  it('armazena e recupera quote de mercado', () => {
    const quote: MarketQuote = {
      ticker: 'CACHE11',
      price: 10,
      previousClose: 10,
      changePercent: 0,
      currency: 'BRL',
      source: 'brapi',
      lastUpdatedAt: new Date().toISOString(),
      status: 'live',
      confidenceLevel: 'high',
    };
    setCachedQuote(quote);
    expect(getCachedQuote('CACHE11')).toEqual(quote);
    expect(getCachedQuote('OUTRO')).toBeNull();
  });

  it('expira quote após TTL (5 min)', () => {
    vi.useFakeTimers();
    const quote: MarketQuote = {
      ticker: 'TTL11',
      price: 10,
      previousClose: 10,
      changePercent: 0,
      currency: 'BRL',
      source: 'brapi',
      lastUpdatedAt: new Date().toISOString(),
      status: 'live',
      confidenceLevel: 'high',
    };
    setCachedQuote(quote);
    vi.advanceTimersByTime(5 * 60 * 1000 + 1);
    expect(getCachedQuote('TTL11')).toBeNull();
  });

  it('cache de câmbio funciona e expira (3 min)', () => {
    vi.useFakeTimers();
    setCachedExchange({
      pair: 'USD-BRL',
      rate: 5.5,
      source: 'awesomeapi',
      lastUpdatedAt: new Date().toISOString(),
      status: 'live',
      changePercent24h: 0.1,
    });
    expect(getCachedExchange('USD-BRL')?.rate).toBe(5.5);
    vi.advanceTimersByTime(3 * 60 * 1000 + 1);
    expect(getCachedExchange('USD-BRL')).toBeNull();
  });
});

describe('formatLastUpdated', () => {
  it('retorna mensagem relativa ao tempo', () => {
    const now = Date.now();
    expect(formatLastUpdated(null)).toBe('Nunca atualizado');
    expect(formatLastUpdated(new Date(now - 10 * 1000).toISOString())).toBe('Agora mesmo');
    expect(formatLastUpdated(new Date(now - 10 * 60 * 1000).toISOString())).toBe('10 min atrás');
    expect(formatLastUpdated(new Date(now - 5 * 60 * 60 * 1000).toISOString())).toBe('5h atrás');
  });
});

describe('getConfidenceLabel', () => {
  it('mapeia níveis de confiança', () => {
    expect(getConfidenceLabel('high')).toBe('Alta confiança');
    expect(getConfidenceLabel('low')).toBe('Dado estimado');
  });
});
