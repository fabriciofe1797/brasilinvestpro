/**
 * useMarketOverview — Hook para painel de indices de mercado
 * 
 * Busca dados do IBOVESPA, cambio, cripto e indices macroeconomicos.
 * Usa o app-proxy como fonte primaria (server-side, sem CORS).
 * 
 * Polling a cada 3 minutos com retry em caso de falha.
 */

import { useEffect, useRef, useCallback, useState } from 'react';

const POLL_INTERVAL = 3 * 60 * 1000; // 3 minutos
const RETRY_DELAY = 30 * 1000; // 30 segundos para retry apos falha

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const EDGE_FN_URL = `${SUPABASE_URL}/functions/v1/app-proxy`;

export interface IbovespaData {
  value: number;
  prevClose: number;
  change: number;
  changePercent: number;
}

export interface ExchangeOverview {
  EURBRL: { bid: number; pctChange: number } | null;
  USDBRL: { bid: number; pctChange: number } | null;
  CNYBRL: { bid: number; pctChange: number } | null;
}

export interface CryptoOverviewItem {
  usd: number;
  brl: number;
  usd24hChange: number;
  marketCap: number;
}

export interface MacroIndex {
  label: string;
  value: string;
  change: number | null;
}

export interface MarketOverviewData {
  ibovespa: IbovespaData | null;
  exchange: ExchangeOverview;
  crypto: {
    BTC: CryptoOverviewItem | null;
    ETH: CryptoOverviewItem | null;
    SOL: CryptoOverviewItem | null;
  };
  macroIndices: MacroIndex[];
  dataQuality?: {
    fx: boolean;
    crypto: boolean;
    ibov: boolean;
  };
}

const EMPTY_DATA: MarketOverviewData = {
  ibovespa: null,
  exchange: { EURBRL: null, USDBRL: null, CNYBRL: null },
  crypto: { BTC: null, ETH: null, SOL: null },
  macroIndices: [],
};

export const useMarketOverview = () => {
  const [data, setData] = useState<MarketOverviewData>(EMPTY_DATA);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchOverview = useCallback(async () => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      setError('Supabase nao configurado');
      setIsLoading(false);
      return;
    }

    // Limpar retry anterior se existir
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    try {
      const r = await fetch(EDGE_FN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ action: 'get_market_overview' }),
      });

      if (!r.ok) {
        const errText = await r.text().catch(() => 'unknown');
        console.error('[useMarketOverview] HTTP error:', r.status, errText);
        setError(`HTTP ${r.status}`);
        if (mountedRef.current) setIsLoading(false);
        // Retry apos falha HTTP
        retryTimeoutRef.current = setTimeout(() => {
          if (mountedRef.current) fetchOverview();
        }, RETRY_DELAY);
        return;
      }

      const json = await r.json();

      if (!mountedRef.current) return;

      if (!json?.ok) {
        console.error('[useMarketOverview] API returned ok=false:', json?.error);
        setError(json?.error || 'Dados indisponiveis');
        setIsLoading(false);
        // Retry apos erro da API
        retryTimeoutRef.current = setTimeout(() => {
          if (mountedRef.current) fetchOverview();
        }, RETRY_DELAY);
        return;
      }

      // Sucesso — limpar erro
      setError(null);
      setData({
        ibovespa: json.ibovespa ?? null,
        exchange: json.exchange ?? EMPTY_DATA.exchange,
        crypto: json.crypto ?? EMPTY_DATA.crypto,
        macroIndices: json.macroIndices ?? EMPTY_DATA.macroIndices,
        dataQuality: json.dataQuality ?? undefined,
      });
      setLastUpdated(new Date().toISOString());
      setIsLoading(false);
    } catch (e) {
      console.error('[useMarketOverview] Fetch failed:', e);
      if (mountedRef.current) {
        setError('Falha de conexao');
        setIsLoading(false);
        // Retry apos erro de rede
        retryTimeoutRef.current = setTimeout(() => {
          if (mountedRef.current) fetchOverview();
        }, RETRY_DELAY);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchOverview();
    const interval = setInterval(fetchOverview, POLL_INTERVAL);
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [fetchOverview]);

  return { data, isLoading, lastUpdated, refetch: fetchOverview, error };
};
