import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const url = Deno.env.get("SUPABASE_URL")!;
const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const client = createClient(url, key);

const BRAPI = "https://brapi.dev/api";
const COINGECKO = "https://api.coingecko.com/api/v3";

async function getTickers(): Promise<string[]> {
  const { data: txs } = await client.from("transactions").select("asset_ticker");
  const { data: assets } = await client.from("assets").select("ticker");
  const set = new Set<string>();
  for (const t of txs || []) {
    const v = String((t as any).asset_ticker || "");
    if (v) set.add(v);
  }
  for (const a of assets || []) {
    const v = String((a as any).ticker || "");
    if (v) set.add(v);
  }
  return Array.from(set);
}

async function fetchB3Quotes(tickers: string[]): Promise<Record<string, number>> {
  const apiUrl = Deno.env.get("B3_API_URL");
  const apiKey = Deno.env.get("B3_API_KEY");
  const out: Record<string, number> = {};
  if (!apiUrl || !apiKey || tickers.length === 0) return out;
  try {
    const list = tickers.join(",");
    const u = `${apiUrl}?tickers=${encodeURIComponent(list)}`;
    const r = await fetch(u, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Accept": "application/json"
      }
    });
    if (!r.ok) return out;
    const j = await r.json().catch(() => ({} as any));
    if (Array.isArray(j?.data)) {
      for (const it of j.data) {
        const sym = String(it?.symbol || it?.ticker || "");
        const price = Number(it?.price ?? it?.last ?? it?.close ?? 0);
        if (sym && price > 0) out[sym] = price;
      }
      return out;
    }
    if (j?.prices && typeof j.prices === "object") {
      for (const [sym, val] of Object.entries(j.prices)) {
        const price = Number(val);
        if (sym && price > 0) out[sym] = price;
      }
      return out;
    }
    if (Array.isArray(j)) {
      for (const it of j) {
        const sym = String(it?.symbol || it?.ticker || "");
        const price = Number(it?.price ?? it?.last ?? it?.close ?? 0);
        if (sym && price > 0) out[sym] = price;
      }
      return out;
    }
    return out;
  } catch {
    return out;
  }
}

async function fetchBrapiQuotes(tickers: string[]): Promise<Record<string, number>> {
  if (tickers.length === 0) return {};
  const list = tickers.join(",");
  const r = await fetch(`${BRAPI}/quote/${list}?range=1d&interval=1d&fundamental=true`);
  if (!r.ok) return {};
  const j = await r.json().catch(() => ({}));
  const results = Array.isArray(j?.results) ? j.results : [];
  const out: Record<string, number> = {};
  for (const it of results) {
    const sym = String(it?.symbol || it?.stock || it?.ticker || "");
    const price = Number(it?.regularMarketPrice ?? it?.price ?? it?.close ?? 0);
    if (sym && price > 0) out[sym] = price;
  }
  return out;
}

async function fetchCryptoQuotes(ids: string[]): Promise<Record<string, number>> {
  if (ids.length === 0) return {};
  const list = ids.join(",");
  const r = await fetch(`${COINGECKO}/simple/price?ids=${list}&vs_currencies=brl`);
  if (!r.ok) return {};
  const j = await r.json().catch(() => ({}));
  const out: Record<string, number> = {};
  for (const id of ids) {
    const v = j?.[id]?.brl;
    if (typeof v === "number" && v > 0) out[id] = v;
  }
  return out;
}

function splitTickers(all: string[]) {
  const cryptoMap: Record<string, string> = {
    BTC: "bitcoin",
    ETH: "ethereum",
    SOL: "solana",
    USDC: "usd-coin",
  };
  const cryptos: string[] = [];
  const nonCrypto: string[] = [];
  for (const t of all) {
    if (cryptoMap[t]) cryptos.push(t);
    else nonCrypto.push(t);
  }
  return { cryptoMap, cryptos, nonCrypto };
}

async function upsertPrices(prices: Record<string, number>) {
  const today = new Date().toISOString().slice(0, 10);
  const rowsAssets = Object.entries(prices).map(([ticker, price]) => ({
    ticker,
    price,
    last_close: price,
    currency: "BRL",
    last_updated: new Date().toISOString(),
  }));
  const rowsTimeseries = Object.entries(prices).map(([ticker, price]) => ({
    ticker,
    date: today,
    close: price,
  }));
  if (rowsAssets.length > 0) {
    await client.from("assets").upsert(rowsAssets, { onConflict: "ticker" });
  }
  if (rowsTimeseries.length > 0) {
    await client.from("asset_prices").upsert(rowsTimeseries, { onConflict: "ticker,date" });
  }
}

serve(async () => {
  try {
    const all = await getTickers();
    if (all.length === 0) {
      return new Response(JSON.stringify({ ok: true, updated: 0 }));
    }
    const { cryptoMap, cryptos, nonCrypto } = splitTickers(all);
    const b3 = await fetchB3Quotes(nonCrypto);
    const remaining = nonCrypto.filter(t => b3[t] == null);
    const brapi = remaining.length ? await fetchBrapiQuotes(remaining) : {};
    const cryptoIds = cryptos.map((t) => cryptoMap[t]).filter(Boolean);
    const cg = await fetchCryptoQuotes(cryptoIds);
    const combined: Record<string, number> = { ...b3, ...brapi };
    for (const [t, id] of Object.entries(cryptoMap)) {
      const p = cg[id];
      if (typeof p === "number" && p > 0) combined[t] = p;
    }
    await upsertPrices(combined);
    return new Response(JSON.stringify({ ok: true, updated: Object.keys(combined).length }));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ ok: false, error: msg }), { status: 500 });
  }
});
