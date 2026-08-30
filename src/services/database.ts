import { createClient } from '@supabase/supabase-js';
import { Transaction } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const EDGE_FUNCTION_NAME = 'app-proxy';

export interface QuoteDetailsResponse {
  prices: Record<string, number>;
  sources: Record<string, string>;
  updatedAt: Record<string, string>;
  changes: Record<string, number>;
}

export interface ExchangeRatesResponse {
  EUR: number;
  USD: number;
  source: string;
  updatedAt: string;          // momento da consulta bem-sucedida (usado para frescor)
  sourceUpdatedAt?: string;   // ultimo timestamp de mercado informado pela fonte
  changes: {
    EUR: number | null;
    USD: number | null;
  };
}

// Cache de clients por token: evita criar uma nova instância Supabase/GoTrueClient
// a cada chamada (o console era inundado de "Multiple GoTrueClient instances")
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const clientCache = new Map<string, any>();

export const getAuthenticatedClient = (token: string) => {
  if (!supabaseUrl || !supabaseAnonKey) throw new Error("Supabase config missing");

  const cached = clientCache.get(token);
  if (cached) return cached;

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });
  if (clientCache.size >= 10) clientCache.clear();
  clientCache.set(token, client);
  return client;
};

/**
 * Ensures the user profile exists in Supabase.
 * If not, creates it using the ID from the token.
 * Returns true if profile exists or was created, false otherwise.
 */
export const ensureUserProfile = async (token: string, email?: string): Promise<boolean> => {
  const client = getAuthenticatedClient(token);
  const { data, error } = await client.functions.invoke(EDGE_FUNCTION_NAME, {
    body: { action: 'ensure_profile', email }
  });
  if (error) {
    console.error('ensure_profile invoke error:', error);
    throw error;
  }
  if (!data?.ok) {
    const msg = (data as any)?.error || 'ensure_profile_failed';
    console.error('ensure_profile error payload:', msg);
    throw new Error(msg);
  }
  return true;
};

export const getTransactions = async (token: string) => {
  const client = getAuthenticatedClient(token);
  const { data, error } = await client.functions.invoke(EDGE_FUNCTION_NAME, {
    body: { action: 'get_transactions' }
  });
  if (error || !data?.ok) {
    const msg = error?.message || data?.error || 'invoke_failed';
    console.error('Failed to fetch transactions:', msg);
    throw new Error(msg);
  }
  const rows = data.transactions || [];
  return rows.map((t: any) => ({
    id: t.id,
    assetId: t.asset_ticker, 
    type: t.type,
    quantity: Number(t.quantity),
    price: Number(t.price),
    total: Number(t.total),
    date: t.date,
    fees: Number(t.fees),
    realizedPnl: t.realized_pnl != null ? Number(t.realized_pnl) : null,
    costBasis: t.cost_basis != null ? Number(t.cost_basis) : null
  })) as Transaction[];
};

export const saveTransaction = async (transaction: Omit<Transaction, 'id' | 'total'>, token: string) => {
  const client = getAuthenticatedClient(token);
  const { data, error } = await client.functions.invoke(EDGE_FUNCTION_NAME, {
    body: { action: 'save_transaction', payload: {
      assetId: transaction.assetId,
      type: transaction.type,
      quantity: transaction.quantity,
      price: transaction.price,
      date: transaction.date,
      fees: transaction.fees
    } }
  });
  if (error || !data?.ok) {
    const msg = data?.error || (error as any)?.message || 'invoke_failed';
    throw new Error(msg);
  }
  return data.transaction;
};

// Deprecated: No longer needed with new per-request client pattern
export const setAuthToken = (_token: string) => {
  // No-op
};

/**
 * Fetches all assets from the public assets table
 */
export const getAssets = async (token: string) => {
  const client = getAuthenticatedClient(token);
  const { data, error } = await client.functions.invoke(EDGE_FUNCTION_NAME, {
    body: { action: 'get_assets' }
  });
  if (error || !data?.ok) {
    const msg = error?.message || data?.error || 'invoke_failed';
    console.error('Failed to fetch assets:', msg);
    throw new Error(msg);
  }
  return data.assets || [];
};

/**
 * Inserts or Updates an asset in the public assets table
 */
export const upsertAsset = async (asset: any, token: string) => {
  const client = getAuthenticatedClient(token);
  const { data, error } = await client.functions.invoke(EDGE_FUNCTION_NAME, {
    body: { action: 'upsert_asset', asset }
  });
  if (error || !data?.ok) {
    console.error('Failed to upsert asset:', error || data?.error);
  }
};

export const getPortfolio = async (token: string) => {
  const client = getAuthenticatedClient(token);
  const { data, error } = await client.functions.invoke(EDGE_FUNCTION_NAME, {
    body: { action: 'get_portfolio' }
  });
  if (error || !data?.ok) {
    console.error('Failed to fetch portfolio:', error || data?.error);
    return [];
  }
  return data.portfolio || [];
};

export const getPortfolioTimeseries = async (token: string) => {
  const client = getAuthenticatedClient(token);
  const { data, error } = await client.functions.invoke(EDGE_FUNCTION_NAME, {
    body: { action: 'get_portfolio_timeseries' }
  });
  if (error || !data?.ok) {
    console.error('Failed to fetch portfolio timeseries:', error || data?.error);
    return [];
  }
  return data.series || [];
};

export const getQuotes = async (tickers: string[], token: string): Promise<Record<string, number>> => {
  if (!tickers.length) return {};
  const client = getAuthenticatedClient(token);
  const { data, error } = await client.functions.invoke(EDGE_FUNCTION_NAME, {
    body: { action: 'get_quotes', tickers }
  });
  if (error || !data?.ok) {
    console.error('Failed to fetch quotes:', error || data?.error);
    return {};
  }
  return (data.prices as Record<string, number>) || {};
};

export const getQuotesDetailed = async (tickers: string[], token: string): Promise<QuoteDetailsResponse> => {
  if (!tickers.length) return { prices: {}, sources: {}, updatedAt: {}, changes: {} };
  const client = getAuthenticatedClient(token);
  console.log('🔍 getQuotesDetailed - requesting tickers:', tickers);
  const { data, error } = await client.functions.invoke(EDGE_FUNCTION_NAME, {
    body: { action: 'get_quotes', tickers }
  });
  if (error || !data?.ok) {
    console.error('❌ Failed to fetch detailed quotes:', error || data?.error);
    console.error('❌ Full response data:', data);
    return { prices: {}, sources: {}, updatedAt: {}, changes: {} };
  }
  console.log('✅ getQuotesDetailed - response prices:', data.prices);
  console.log('✅ getQuotesDetailed - response sources:', data.sources);
  return {
    prices: (data.prices as Record<string, number>) || {},
    sources: (data.sources as Record<string, string>) || {},
    updatedAt: (data.updatedAt as Record<string, string>) || {},
    changes: (data.changes as Record<string, number>) || {}
  };
};

export const getExchangeRates = async (token: string): Promise<ExchangeRatesResponse | null> => {
  // Try edge function first (AwesomeAPI via Supabase, com fallbacks server-side)
  try {
    const client = getAuthenticatedClient(token);
    const { data, error } = await client.functions.invoke(EDGE_FUNCTION_NAME, {
      body: { action: 'get_exchange_rates' }
    });
    if (!error && data?.ok) {
      const eurRate = Number(data.rates?.EURBRL ?? 0);
      if (eurRate > 0) {
        console.debug('[getExchangeRates] edge function ok — fonte:', data.source);
        return {
          EUR: eurRate,
          USD: Number(data.rates?.USDBRL ?? 0),
          source: String(data.source || 'awesomeapi'),
          updatedAt: String(data.updatedAt || new Date().toISOString()),
          sourceUpdatedAt: data.sourceUpdatedAt ? String(data.sourceUpdatedAt) : undefined,
          changes: {
            EUR: data.changes?.EURBRL != null ? Number(data.changes.EURBRL) : null,
            USD: data.changes?.USDBRL != null ? Number(data.changes.USDBRL) : null,
          }
        };
      }
      console.warn('[getExchangeRates] edge function retornou taxa invalida:', data);
    } else {
      console.warn('[getExchangeRates] edge function falhou:', error || data?.error, '— tentando fallback direto');
    }
  } catch (err) { console.warn('[getExchangeRates] erro na edge function:', err); }

  // Fallback 1: AwesomeAPI direto (sem auth necessaria para consulta basica)
  try {
    const response = await fetch('https://economia.awesomeapi.com.br/last/EUR-BRL,USD-BRL');
    if (response.ok) {
      const data = await response.json();
      const eur = data?.EURBRL;
      const usd = data?.USDBRL;
      if (eur?.bid && usd?.bid) {
        console.debug('[getExchangeRates] fallback direto AwesomeAPI ok');
        return {
          EUR: Number(eur.bid),
          USD: Number(usd.bid),
          source: 'awesomeapi-direct',
          updatedAt: new Date().toISOString(),
          sourceUpdatedAt: eur.create_date && !Number.isNaN(Date.parse(eur.create_date))
            ? new Date(eur.create_date).toISOString()
            : undefined,
          changes: {
            EUR: eur.pctChange != null ? Number(eur.pctChange) : null,
            USD: usd.pctChange != null ? Number(usd.pctChange) : null,
          }
        };
      }
    }
    console.warn('[getExchangeRates] AwesomeAPI direto falhou (HTTP', response.status, ')');
  } catch (err) { console.warn('[getExchangeRates] AwesomeAPI direto erro:', err); }

  // Fallback 2: open.er-api.com (atualizacao diaria, sem chave)
  try {
    const response = await fetch('https://open.er-api.com/v6/latest/EUR');
    const json = await response.json();
    const eurBrl = Number(json?.rates?.BRL);
    const eurUsd = Number(json?.rates?.USD);
    if (json?.result === 'success' && eurBrl > 0) {
      console.debug('[getExchangeRates] fallback open.er-api.com ok');
      return {
        EUR: eurBrl,
        USD: eurUsd > 0 ? eurBrl / eurUsd : 0,
        source: 'exchangerate',
        updatedAt: new Date().toISOString(),
        sourceUpdatedAt: json.time_last_update_utc && !Number.isNaN(Date.parse(json.time_last_update_utc))
          ? new Date(json.time_last_update_utc).toISOString()
          : undefined,
        changes: { EUR: null, USD: null }
      };
    }
    console.warn('[getExchangeRates] open.er-api.com retornou payload invalido');
  } catch (err) { console.warn('[getExchangeRates] open.er-api.com erro:', err); }

  // Fallback 3: frankfurter.app (taxas de referencia do BCE, sem chave)
  try {
    const response = await fetch('https://api.frankfurter.app/latest?from=EUR&to=BRL,USD');
    const json = await response.json();
    const eurBrl = Number(json?.rates?.BRL);
    const eurUsd = Number(json?.rates?.USD);
    if (eurBrl > 0) {
      console.debug('[getExchangeRates] fallback frankfurter.app (BCE) ok');
      return {
        EUR: eurBrl,
        USD: eurUsd > 0 ? eurBrl / eurUsd : 0,
        source: 'ecb',
        updatedAt: new Date().toISOString(),
        sourceUpdatedAt: json.date && !Number.isNaN(Date.parse(json.date))
          ? new Date(`${json.date}T17:00:00Z`).toISOString()
          : undefined,
        changes: { EUR: null, USD: null }
      };
    }
    console.warn('[getExchangeRates] frankfurter.app retornou payload invalido');
  } catch (err) { console.warn('[getExchangeRates] frankfurter.app erro:', err); }

  console.error('[getExchangeRates] todas as fontes de cambio falharam');
  return null;
};

export const getSavingsProducts = async (token: string) => {
  const client = getAuthenticatedClient(token);
  const { data, error } = await client.functions.invoke(EDGE_FUNCTION_NAME, {
    body: { action: 'get_savings_products' }
  });
  if (error || !data?.ok) {
    console.error('Failed to fetch savings products:', error || data?.error);
    return [];
  }
  return data.products || [];
};

export const seedSavingsProducts = async (token: string): Promise<{ ok: boolean; seeded: number }> => {
  const client = getAuthenticatedClient(token);
  const { data, error } = await client.functions.invoke(EDGE_FUNCTION_NAME, {
    body: { action: 'seed_savings_products' }
  });
  if (error || !data?.ok) {
    console.error('Failed to seed savings products:', error || data?.error);
    return { ok: false, seeded: 0 };
  }
  return { ok: true, seeded: data.seeded || 0 };
};

export const getUserLicense = async (token: string) => {
  const client = getAuthenticatedClient(token);
  const { data, error } = await client.functions.invoke(EDGE_FUNCTION_NAME, {
    body: { action: 'get_user_license' }
  });
  if (error || !data?.ok) {
    const msg = error?.message || data?.error || 'invoke_failed';
    console.error('Failed to fetch license:', msg);
    throw new Error(msg);
  }
  return data;
};
