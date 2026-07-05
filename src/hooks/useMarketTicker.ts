/**
 * useMarketTicker — Hook para carrossel de mercado em tempo real
 * 
 * Busca dados de indices, cambio, cripto e acoes populares.
 * 
 * Estrategia em camadas:
 * 1. Edge Function app-proxy (get_ticker_data) — server-side, sem CORS, com BRAPI_API_KEY
 * 2. APIs diretas como fallback (AwesomeAPI + CoinGecko)
 * 
 * Faz polling a cada 2 minutos para manter dados atualizados.
 */

import { useEffect, useRef, useCallback, useState } from 'react';

export interface TickerItem {
  label: string;
  value: string;
  change: string;
  up: boolean;
  source: string;
}

const TICKER_POLL_INTERVAL = 2 * 60 * 1000; // 2 minutos

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const EDGE_FN_URL = `${SUPABASE_URL}/functions/v1/app-proxy`;

// Dados estaticos de fallback (indices nao disponiveis via API publica gratuita)
const STATIC_INDICES: Record<string, { value: string; change: string; up: boolean }> = {
  IBOVESPA: { value: '128.450', change: '+1.2%', up: true },
  IFIX:     { value: '3.340',   change: '+0.5%', up: true },
};

// Fallback estatico para stocks quando proxy e APIs diretas falham
const STATIC_STOCKS: Record<string, { price: number; prevClose: number }> = {
  BTLG11: { price: 101.20, prevClose: 100.90 },
  HGLG11: { price: 162.50, prevClose: 161.80 },
  PETR4:  { price: 38.20,  prevClose: 37.90 },
  VALE3:  { price: 68.50,  prevClose: 69.10 },
  IVVB11: { price: 300.00, prevClose: 298.00 },
  ITUB4:  { price: 33.40,  prevClose: 33.10 },
  BBAS3:  { price: 28.50,  prevClose: 28.10 },
  WEGE3:  { price: 45.60,  prevClose: 45.20 },
  KLBN11: { price: 22.10,  prevClose: 22.00 },
  TAEE11: { price: 36.80,  prevClose: 36.50 },
};

// ─── Camada 1: Edge Function (server-side, sem CORS) ────────────────────────

interface TickerProxyResponse {
  ok: boolean;
  exchange: {
    EURBRL: { bid: number; pctChange: number } | null;
    USDBRL: { bid: number; pctChange: number } | null;
  };
  crypto: {
    BTC: { usd: number; brl: number; usd24hChange: number } | null;
    ETH: { usd: number; brl: number; usd24hChange: number } | null;
    SOL: { usd: number; brl: number; usd24hChange: number } | null;
  };
  stocks: Record<string, { price: number; prevClose: number }>;
}

async function fetchFromProxy(): Promise<TickerProxyResponse | null> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  try {
    const r = await fetch(EDGE_FN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ action: 'get_ticker_data' }),
    });
    if (!r.ok) return null;
    const data = await r.json();
    if (!data?.ok) return null;
    return data as TickerProxyResponse;
  } catch {
    return null;
  }
}

// ─── Camada 2: APIs diretas (fallback) ──────────────────────────────────────

async function fetchExchangeRatesDirect(): Promise<{ EURBRL?: { bid: string; pctChange: string }; USDBRL?: { bid: string; pctChange: string } }> {
  try {
    const r = await fetch('https://economia.awesomeapi.com.br/last/EUR-BRL,USD-BRL');
    if (!r.ok) return {};
    return await r.json();
  } catch {
    return {};
  }
}

async function fetchCryptoDirect(): Promise<{ BTC?: { usd: number; brl: number; usd24hChange: number }; ETH?: { usd: number; brl: number; usd24hChange: number }; SOL?: { usd: number; brl: number; usd24hChange: number } }> {
  try {
    const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=brl,usd&include_24hr_change=true');
    if (!r.ok) return {};
    const j = await r.json().catch(() => ({} as any));
    const result: any = {};
    if (j?.bitcoin) result.BTC = { brl: Number(j.bitcoin.brl ?? 0), usd: Number(j.bitcoin.usd ?? 0), usd24hChange: Number(j.bitcoin.usd_24h_change ?? 0) };
    if (j?.ethereum) result.ETH = { brl: Number(j.ethereum.brl ?? 0), usd: Number(j.ethereum.usd ?? 0), usd24hChange: Number(j.ethereum.usd_24h_change ?? 0) };
    if (j?.solana) result.SOL = { brl: Number(j.solana.brl ?? 0), usd: Number(j.solana.usd ?? 0), usd24hChange: Number(j.solana.usd_24h_change ?? 0) };
    return result;
  } catch {
    return {};
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatBRL(n: number): string {
  if (n >= 1000) return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return n.toFixed(2).replace('.', ',');
}

function calcChange(current: number, previous: number): { change: string; up: boolean } {
  if (!previous || previous <= 0) return { change: '0.0%', up: true };
  const pct = ((current - previous) / previous) * 100;
  return {
    change: `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`,
    up: pct >= 0,
  };
}

// ─── Hook principal ──────────────────────────────────────────────────────────

export const useMarketTicker = () => {
  const [items, setItems] = useState<TickerItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const mountedRef = useRef(true);

  const buildItems = (
    exchange: { EURBRL: { bid: number; pctChange: number } | null; USDBRL: { bid: number; pctChange: number } | null },
    crypto: { BTC: { usd: number; brl: number; usd24hChange: number } | null; ETH: { usd: number; brl: number; usd24hChange: number } | null; SOL: { usd: number; brl: number; usd24hChange: number } | null },
    stocks: Record<string, { price: number; prevClose: number }>,
    stockSource: 'brapi' | 'static' = 'brapi',
  ): TickerItem[] => {
    const newItems: TickerItem[] = [];

    // Indices estaticos
    for (const [label, data] of Object.entries(STATIC_INDICES)) {
      newItems.push({ label, value: data.value, change: data.change, up: data.up, source: 'market' });
    }

    // EUR/BRL
    if (exchange.EURBRL?.bid) {
      const pct = exchange.EURBRL.pctChange;
      newItems.push({
        label: 'EUR/BRL',
        value: formatBRL(exchange.EURBRL.bid),
        change: `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`,
        up: pct >= 0,
        source: 'awesomeapi',
      });
    }

    // USD/BRL
    if (exchange.USDBRL?.bid) {
      const pct = exchange.USDBRL.pctChange;
      newItems.push({
        label: 'USD/BRL',
        value: formatBRL(exchange.USDBRL.bid),
        change: `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`,
        up: pct >= 0,
        source: 'awesomeapi',
      });
    }

    // BTC/USD
    if (crypto.BTC?.usd) {
      const pct = crypto.BTC.usd24hChange;
      newItems.push({
        label: 'BTC/USD',
        value: crypto.BTC.usd.toLocaleString('pt-BR', { maximumFractionDigits: 0 }),
        change: `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`,
        up: pct >= 0,
        source: 'coingecko',
      });
    }

    // ETH/USD
    if (crypto.ETH?.usd) {
      const pct = crypto.ETH.usd24hChange;
      newItems.push({
        label: 'ETH/USD',
        value: crypto.ETH.usd.toLocaleString('pt-BR', { maximumFractionDigits: 0 }),
        change: `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`,
        up: pct >= 0,
        source: 'coingecko',
      });
    }

    // SOL/USD
    if (crypto.SOL?.usd) {
      const pct = crypto.SOL.usd24hChange;
      newItems.push({
        label: 'SOL/USD',
        value: crypto.SOL.usd.toLocaleString('pt-BR', { maximumFractionDigits: 0 }),
        change: `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`,
        up: pct >= 0,
        source: 'coingecko',
      });
    }

    // Acoes
    const stockOrder = ['BTLG11', 'HGLG11', 'PETR4', 'VALE3', 'IVVB11', 'ITUB4', 'BBAS3', 'WEGE3', 'KLBN11', 'TAEE11'];
    for (const ticker of stockOrder) {
      const s = stocks[ticker];
      if (s?.price) {
        const { change, up } = calcChange(s.price, s.prevClose);
        newItems.push({
          label: ticker,
          value: formatBRL(s.price),
          change,
          up,
          source: stockSource,
        });
      }
    }

    return newItems;
  };

  const fetchAll = useCallback(async () => {
    try {
      // Tentar via Edge Function (proxy server-side) primeiro
      const proxyData = await fetchFromProxy();

      if (proxyData && mountedRef.current) {
        const newItems = buildItems(proxyData.exchange, proxyData.crypto, proxyData.stocks);
        const hasRealData = newItems.some(i => i.source !== 'market');
        if (hasRealData) {
          setItems(newItems);
          setIsLoading(false);
          return;
        }
      }

      // Fallback: APIs diretas (pode falhar por CORS no browser)
      if (!mountedRef.current) return;

      const [fxData, cryptoData] = await Promise.all([
        fetchExchangeRatesDirect(),
        fetchCryptoDirect(),
      ]);

      if (!mountedRef.current) return;

      const exchange = {
        EURBRL: fxData.EURBRL ? { bid: Number(fxData.EURBRL.bid), pctChange: Number(fxData.EURBRL.pctChange ?? 0) } : null,
        USDBRL: fxData.USDBRL ? { bid: Number(fxData.USDBRL.bid), pctChange: Number(fxData.USDBRL.pctChange ?? 0) } : null,
      };
      const crypto = {
        BTC: cryptoData.BTC || null,
        ETH: cryptoData.ETH || null,
        SOL: cryptoData.SOL || null,
      };

      const newItems = buildItems(exchange, crypto, {});
      const hasRealData = newItems.some(i => i.source !== 'market');

      setItems(prev => {
        if (hasRealData || prev.length === 0) {
          // Se nao tem dados reais de stocks, usar fallback estatico
          const finalItems = hasRealData ? newItems : buildItems(exchange, crypto, STATIC_STOCKS, 'static');
          return finalItems;
        }
        return prev;
      });
      setIsLoading(false);
    } catch {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchAll();
    const interval = setInterval(fetchAll, TICKER_POLL_INTERVAL);
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [fetchAll]);

  return { items, isLoading, refetch: fetchAll };
};
