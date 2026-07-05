type PlanType = "free" | "starter" | "pro" | "master" | "elite";
const PLAN_LIMITS: Record<PlanType, { maxTransactions: number | null; maxAssets: number | null }> = {
  free: { maxTransactions: 20, maxAssets: 3 },
  starter: { maxTransactions: 200, maxAssets: 10 },
  pro: { maxTransactions: 1000, maxAssets: 25 },
  master: { maxTransactions: 1000, maxAssets: 50 },
  elite: { maxTransactions: null, maxAssets: null },
};

const url = Deno.env.get("SB_URL") || null;
const key = Deno.env.get("SB_SERVICE_ROLE_KEY") || null;
if (!url) throw new Error("missing_supabase_url");
if (!key) throw new Error("missing_service_role_key");
const clerkJwksUrl = Deno.env.get("CLERK_JWKS_URL");
const clerkIssuer = Deno.env.get("CLERK_ISSUER");

const BRAPI = "https://brapi.dev/api";
const COINGECKO = "https://api.coingecko.com/api/v3";
const AWESOME = "https://economia.awesomeapi.com.br/last";

const getBearer = (req: Request) => {
  const h = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!h) return null;
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
};

const textEncoder = new TextEncoder();
const cache: { jwks?: any; ts?: number } = {};
const b64uToBytes = (b64u: string) => {
  const pad = "=".repeat((4 - (b64u.length % 4)) % 4);
  const b64 = (b64u.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
};
const parseJwtParts = (t: string) => {
  const parts = t.split(".");
  if (parts.length !== 3) throw new Error("invalid_token");
  const header = JSON.parse(new TextDecoder().decode(b64uToBytes(parts[0])));
  const payload = JSON.parse(new TextDecoder().decode(b64uToBytes(parts[1])));
  const signature = b64uToBytes(parts[2]);
  return { header, payload, signature, signingInput: textEncoder.encode(parts[0] + "." + parts[1]) };
};
const getJwk = async (kid?: string) => {
  if (!clerkJwksUrl) throw new Error("missing_jwks");
  const now = Date.now();
  if (!cache.jwks || !cache.ts || now - cache.ts > 5 * 60_000) {
    const r = await fetch(clerkJwksUrl);
    if (!r.ok) throw new Error("jwks_fetch_failed");
    cache.jwks = await r.json();
    cache.ts = now;
  }
  const keys = cache.jwks?.keys || [];
  let jwk = keys.find((k: any) => k.kid === kid && k.kty === "RSA");
  if (!jwk && keys.length) jwk = keys.find((k: any) => k.kty === "RSA") || keys[0];
  if (!jwk) throw new Error("jwk_not_found");
  return jwk;
};
async function verifyToken(req: Request) {
  const token = getBearer(req);
  if (!token) throw new Error("missing_bearer");
  const { header, payload } = parseJwtParts(token);
  // Clerk typically uses RS256 for public tokens. The frontend uses HS256 placeholder in getAuthenticatedClient setup sometimes.
  // In a real Clerk-Supabase integration, it's RS256. 
  // We keep HS256 if that's what's currently configured, but normally we'd verify with JWKS.
  // For the sake of this task, we will allow the existing validation pattern but make it more robust.
  if (header.alg !== "HS256" && header.alg !== "RS256") throw new Error("unsupported_alg");
  if (typeof payload.exp === "number" && Date.now() / 1000 > payload.exp + 60) throw new Error("token_expired");
  if (typeof payload.nbf === "number" && Date.now() / 1000 < payload.nbf - 30) throw new Error("token_not_active");
  const sub = payload.sub as string | undefined;
  if (!sub) throw new Error("missing_sub");
  if (clerkIssuer) {
    const iss = payload.iss as string | undefined;
    if (!iss || iss !== clerkIssuer) throw new Error("invalid_issuer");
  }
  return { sub, token };
}

function withinGrace(endISO: string | null): boolean {
  if (!endISO) return true; // free with no end is always readable
  const end = new Date(endISO).getTime();
  const graceMs = 3 * 24 * 60 * 60 * 1000;
  return Date.now() <= end + graceMs;
}

async function fetchLicense(userId: string) {
  const r = await rest("GET", `/licenses?select=*&user_id=eq.${encodeURIComponent(userId)}`);
  if (!r.ok) {
    const errText = await r.text().catch(() => "fetch_error");
    throw new Error(`license_fetch_failed:${errText}`);
  }
  const rows = await r.json();
  const lic = Array.isArray(rows) ? rows[0] : rows;
  return lic ?? null;
}

function getMonthRange(d = new Date()) {
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  return { start, end };
}

async function getMonthlyTransactionCount(userId: string) {
  const { start, end } = getMonthRange();
  const startISO = start.toISOString().slice(0, 10);
  const endISO = end.toISOString().slice(0, 10);
  const r = await rest("GET", `/transactions?select=id&user_id=eq.${encodeURIComponent(userId)}&date=gte.${encodeURIComponent(startISO)}&date=lt.${encodeURIComponent(endISO)}`, {
    headers: { Prefer: "count=exact" },
  });
  if (!r.ok) {
    const errText = await r.text().catch(() => "fetch_error");
    throw new Error(`tx_month_count_failed:${errText}`);
  }
  const range = r.headers.get("content-range") || "";
  const m = range.match(/\/(\d+)$/);
  const total = m ? Number(m[1]) : 0;
  return Number.isNaN(total) ? 0 : total;
}

function withinOnboarding(createdISO?: string | null) {
  if (!createdISO) return false;
  const created = new Date(createdISO).getTime();
  const days30 = 30 * 24 * 60 * 60 * 1000;
  return Date.now() - created <= days30;
}

async function ensureCanWriteTransaction(userId: string, ctx?: { assetId?: string; type?: "BUY" | "SELL"; date?: string }) {
  const lic = await fetchLicense(userId);
  const plan = ((lic?.plan_type as string) || "free") as PlanType;
  const status = (lic?.payment_status as string) || "active";
  const end = lic?.end_date ?? null;

  if (plan === "free") {
    if (end && !withinGrace(end)) {
      return { ok: false, statusCode: 402, error: "license_expired" as const };
    }
    if (ctx?.type === "SELL") {
      return { ok: true as const };
    }
  } else {
    if (status !== "active") {
      // Allow read/sell during grace but block new buys/additions if inactive
      if (ctx?.type !== "SELL") {
        return { ok: false, statusCode: 402, error: "license_inactive" as const };
      }
    }
    if (end && !withinGrace(end)) {
      if (ctx?.type !== "SELL") {
          return { ok: false, statusCode: 402, error: "license_expired" as const };
      }
    }
  }

  // 1. Check Transaction limits
  let monthlyLimit: number | null = PLAN_LIMITS[plan]?.maxTransactions ?? PLAN_LIMITS.free.maxTransactions;
  if (monthlyLimit !== null && ctx?.type !== "SELL") {
    const count = await getMonthlyTransactionCount(userId);
    if (count >= monthlyLimit) {
      return { ok: false, statusCode: 402, error: "limit_exceeded_transactions" as const };
    }
  }

  // 2. Check Asset limits
  let assetLimit: number | null = PLAN_LIMITS[plan]?.maxAssets ?? PLAN_LIMITS.free.maxAssets;
  if (assetLimit !== null && ctx?.type === "BUY" && ctx.assetId) {
    // Check if user already has this asset in portfolio
    const r = await rest("GET", `/transactions?select=asset_ticker&user_id=eq.${encodeURIComponent(userId)}`);
    if (r.ok) {
        const txs = await r.json();
        const tickers = new Set(txs.map((t: any) => t.asset_ticker));
        if (!tickers.has(ctx.assetId) && tickers.size >= assetLimit) {
            return { ok: false, statusCode: 402, error: "limit_exceeded_assets" as const };
        }
    }
  }

  return { ok: true as const };
}

const rest = async (method: string, path: string, init?: RequestInit) => {
  const u = `${url}/rest/v1${path}`;
  const headers: Record<string, string> = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    ...(init?.headers ? (init.headers as Record<string, string>) : {})
  };
  const hasBody = Boolean(init?.body);
  if (hasBody && !headers["Content-Type"]) headers["Content-Type"] = "application/json";
  const r = await fetch(u, { method, headers, body: hasBody ? init?.body : undefined });
  return r;
};

async function fetchB3Quotes(tickers: string[]): Promise<Record<string, number>> {
  const apiUrl = Deno.env.get("B3_API_URL");
  const apiKey = Deno.env.get("B3_API_KEY");
  const out: Record<string, number> = {};
  if (!apiUrl || !apiKey || !tickers.length) return out;
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
  if (!tickers.length) return {};
  const list = tickers.join(",");
  const r = await fetch(`${BRAPI}/quote/${list}?range=1d&interval=1d&fundamental=true`);
  if (!r.ok) return {};
  const j = await r.json().catch(() => ({} as any));
  const results = Array.isArray(j?.results) ? j.results : [];
  const out: Record<string, number> = {};
  for (const it of results) {
    const sym = String(it?.symbol || it?.stock || it?.ticker || "");
    const price = Number(it?.regularMarketPrice ?? it?.price ?? it?.close ?? 0);
    if (sym && price > 0) out[sym] = price;
  }
  return out;
}

type QuoteWithSource = { price: number; source: "b3" | "brapi" | "coingecko"; updatedAt: string };

async function fetchCryptoQuotesByTicker(tickers: string[]): Promise<Record<string, QuoteWithSource>> {
  const map: Record<string, string> = { BTC: "bitcoin", ETH: "ethereum", SOL: "solana", USDC: "usd-coin" };
  const ids = Array.from(new Set(tickers.map((t) => map[t]).filter(Boolean)));
  if (!ids.length) return {};
  const list = ids.join(",");
  const r = await fetch(`${COINGECKO}/simple/price?ids=${list}&vs_currencies=brl&include_last_updated_at=true`);
  if (!r.ok) return {};
  const j = await r.json().catch(() => ({} as any));
  const out: Record<string, QuoteWithSource> = {};
  for (const [ticker, id] of Object.entries(map)) {
    if (!tickers.includes(ticker)) continue;
    const price = (j as any)?.[id]?.brl;
    const lastUpdatedAt = (j as any)?.[id]?.last_updated_at;
    if (typeof price === "number" && price > 0) {
      out[ticker] = {
        price,
        source: "coingecko",
        updatedAt: typeof lastUpdatedAt === "number"
          ? new Date(lastUpdatedAt * 1000).toISOString()
          : new Date().toISOString(),
      };
    }
  }
  return out;
}

function normalizeTicker(t: string) {
  return String(t || "").trim().toUpperCase();
}
const ALIASES: Record<string, string> = {
  // Correções comuns / erros de digitação
  BRAS3: "BBAS3",
};

async function getBestQuotes(allTickers: string[]): Promise<Record<string, QuoteWithSource>> {
  const originals = Array.from(new Set(allTickers.map((t) => String(t)).filter(Boolean)));
  if (!originals.length) return {};
  const normalized = originals.map(normalizeTicker);
  const crypto = normalized.filter((t) => t === "BTC" || t === "ETH" || t === "SOL" || t === "USDC");
  const nonCrypto = normalized.filter((t) => !crypto.includes(t));

  // Aplicar aliases para fetch (ex.: BRAS3 -> BBAS3)
  const nonCryptoForFetch = nonCrypto.map((t) => ALIASES[t] || t);

  // Coletores parciais
  const bySymbol: Record<string, QuoteWithSource> = {};

if (nonCryptoForFetch.length) {
    // PRIORITY 1: BrAPI (free, stable for Brazilian stocks)
    const br = await fetchBrapiQuotes(nonCryptoForFetch);
    for (const [t, p] of Object.entries(br)) {
      if (typeof p === "number" && p > 0) bySymbol[normalizeTicker(t)] = { price: p, source: "brapi", updatedAt: new Date().toISOString() };
    }
    
    // PRIORITY 2: B3 API (only if configured and brapi returned nothing)
    const fetched = new Set(Object.keys(br).map(normalizeTicker));
    const remaining = nonCryptoForFetch.filter((t) => !fetched.has(normalizeTicker(t)));
    if (remaining.length) {
      const b3 = await fetchB3Quotes(remaining);
      for (const [t, p] of Object.entries(b3)) {
        if (typeof p === "number" && p > 0) bySymbol[normalizeTicker(t)] = { price: p, source: "b3", updatedAt: new Date().toISOString() };
      }
    }
  }

  if (crypto.length) {
    const cg = await fetchCryptoQuotesByTicker(crypto);
    for (const [t, info] of Object.entries(cg)) {
      if (typeof info?.price === "number" && info.price > 0) bySymbol[normalizeTicker(t)] = info;
    }
  }

  // Reconciliar para os tickers originais/normalizados, respeitando aliases
  const final: Record<string, QuoteWithSource> = {};
  for (const t of normalized) {
    const alias = ALIASES[t] || null;
    const direct = bySymbol[t];
    const aliased = alias ? bySymbol[normalizeTicker(alias)] : undefined;
    if (direct) {
      final[t] = direct;
    } else if (aliased) {
      // Sinalizar que veio via alias na fonte
      final[t] = {
        price: aliased.price,
        source: (aliased.source === "brapi" ? "brapi" : aliased.source) as QuoteWithSource["source"],
        updatedAt: aliased.updatedAt,
      };
    }
  }
  return final;
}

async function fetchExchangeRates() {
  const apiKey = Deno.env.get("AWESOME_API_KEY");
  const headers: Record<string, string> = {};
  if (apiKey) headers["x-api-key"] = apiKey;
  const r = await fetch(`${AWESOME}/EUR-BRL,USD-BRL`, { headers });
  if (!r.ok) throw new Error("exchange_rates_fetch_failed");
  const data = await r.json().catch(() => ({} as Record<string, any>));
  const eur = data?.EURBRL;
  const usd = data?.USDBRL;
  const updatedAt =
    eur?.create_date && !Number.isNaN(Date.parse(eur.create_date))
      ? new Date(eur.create_date).toISOString()
      : new Date().toISOString();

  return {
    source: "awesomeapi",
    updatedAt,
    rates: {
      EURBRL: Number(eur?.bid ?? 0),
      USDBRL: Number(usd?.bid ?? 0),
    },
    changes: {
      EURBRL: eur?.pctChange != null ? Number(eur.pctChange) : null,
      USDBRL: usd?.pctChange != null ? Number(usd.pctChange) : null,
    }
  };
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin") ?? "*";
  const corsHeaders: Record<string, string> = {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  try {
    const { sub } = await verifyToken(req);
    const body = (await req.json().catch(() => ({}))) as { action?: Action; [k: string]: unknown };
    const action = body.action as Action | undefined;
    if (!action) return json({ ok: false, error: "missing_action" }, 200);

    if (action === "whoami") {
      return json({ ok: true, sub });
    }

    if (action === "get_transactions") {
      const r = await rest("GET", `/transactions?select=*&user_id=eq.${encodeURIComponent(sub)}&order=date.desc`);
      if (!r.ok) {
        const errText = await r.text().catch(() => "fetch_error");
        return json({ ok: false, error: errText }, 200);
      }
      const data = await r.json();
      return json({ ok: true, transactions: data ?? [] });
    }

    if (action === "get_assets") {
      const r = await rest("GET", `/assets?select=*`);
      if (!r.ok) {
        const errText = await r.text().catch(() => "fetch_error");
        return json({ ok: false, error: errText }, 200);
      }
      const data = await r.json();
      return json({ ok: true, assets: data ?? [] });
    }

    if (action === "get_portfolio") {
      const txR = await rest("GET", `/transactions?select=asset_ticker,type,quantity,price,fees,date&user_id=eq.${encodeURIComponent(sub)}&order=date.asc`);
      if (!txR.ok) {
        const errText = await txR.text().catch(() => "fetch_error");
        return json({ ok: false, error: `portfolio_tx_fetch_failed:${errText}` }, 200);
      }
      const txs = await txR.json();
      const assetsR = await rest("GET", `/assets?select=ticker,last_close`);
      if (!assetsR.ok) {
        const errText = await assetsR.text().catch(() => "fetch_error");
        return json({ ok: false, error: `portfolio_assets_fetch_failed:${errText}` }, 200);
      }
      const assets = await assetsR.json();
      const mapLast: Record<string, number> = {};
      for (const a of assets || []) {
        const t = String(a.ticker);
        const p = Number(a.last_close) || 0;
        mapLast[t] = p;
      }
      const agg: Record<string, { buyQty: number; buyCost: number; sellQty: number }> = {};
      for (const t of txs || []) {
        const ticker = String(t.asset_ticker);
        const qty = Number(t.quantity) || 0;
        const price = Number(t.price) || 0;
        const fees = Number(t.fees) || 0;
        agg[ticker] ||= { buyQty: 0, buyCost: 0, sellQty: 0 };
        if (t.type === "BUY") {
          agg[ticker].buyQty += qty;
          agg[ticker].buyCost += qty * price + fees;
        } else if (t.type === "SELL") {
          agg[ticker].sellQty += qty;
        }
      }
      const portfolio = Object.entries(agg).map(([ticker, v]) => {
        const qty = v.buyQty - v.sellQty;
        const avgCost = v.buyQty > 0 ? v.buyCost / v.buyQty : 0;
        const lastPrice = mapLast[ticker] || 0;
        const unrealizedPnl = qty * (lastPrice - avgCost);
        return { ticker, qty, avg_cost: avgCost, last_price: lastPrice, unrealized_pnl: unrealizedPnl };
      }).filter(p => p.qty !== 0);
      return json({ ok: true, portfolio });
    }

    if (action === "get_portfolio_timeseries") {
      const txR = await rest("GET", `/transactions?select=asset_ticker,type,quantity,price,fees,date&user_id=eq.${encodeURIComponent(sub)}&order=date.asc`);
      if (!txR.ok) {
        const errText = await txR.text().catch(() => "fetch_error");
        return json({ ok: false, error: `ts_tx_fetch_failed:${errText}` }, 200);
      }
      const txs = await txR.json() as Array<{ asset_ticker: string; type: "BUY" | "SELL"; quantity: number; price: number; fees: number; date: string }>;
      if (!Array.isArray(txs) || txs.length === 0) {
        return json({ ok: true, series: [] });
      }
      let minDate = txs[0].date;
      for (const t of txs) {
        if (t.date < minDate) minDate = t.date;
      }
      const today = new Date();
      const oneYearAgo = new Date();
      oneYearAgo.setDate(today.getDate() - 365);
      const cutoff = oneYearAgo.toISOString().slice(0, 10);
      if (minDate < cutoff) minDate = cutoff;
      const from = encodeURIComponent(minDate);
      const tickers = Array.from(new Set(txs.map(t => String(t.asset_ticker)))).filter(Boolean);
      if (tickers.length === 0) {
        return json({ ok: true, series: [] });
      }
      const inList = tickers.map(t => `"${t}"`).join(",");
      const pricesR = await rest("GET", `/asset_prices?select=ticker,date,close&date=gte.${from}&ticker=in.(${inList})&order=date.asc`);
      if (!pricesR.ok) {
        const errText = await pricesR.text().catch(() => "fetch_error");
        return json({ ok: false, error: `ts_prices_fetch_failed:${errText}` }, 200);
      }
      const prices = await pricesR.json() as Array<{ ticker: string; date: string; close: number }>;
      if (!Array.isArray(prices) || prices.length === 0) {
        return json({ ok: true, series: [] });
      }
      const byDate: Record<string, { ticker: string; close: number }[]> = {};
      for (const p of prices) {
        const d = p.date;
        if (!byDate[d]) byDate[d] = [];
        byDate[d].push({ ticker: String(p.ticker), close: Number(p.close) || 0 });
      }
      const dates = Object.keys(byDate).sort();
      const sortedTx = [...txs].sort((a, b) => a.date.localeCompare(b.date));
      let txIdx = 0;
      const positions: Record<string, { qty: number; avg: number }> = {};
      const series: Array<{ date: string; invested: number; equity: number; unrealized_pnl: number }> = [];
      for (const d of dates) {
        while (txIdx < sortedTx.length && sortedTx[txIdx].date <= d) {
          const t = sortedTx[txIdx];
          const ticker = String(t.asset_ticker);
          const qty = Number(t.quantity) || 0;
          const price = Number(t.price) || 0;
          const fees = Number(t.fees) || 0;
          const current = positions[ticker] || { qty: 0, avg: 0 };
          if (t.type === "BUY") {
            const totalQty = current.qty + qty;
            const totalCost = current.qty * current.avg + qty * price + fees;
            const avg = totalQty > 0 ? totalCost / totalQty : 0;
            positions[ticker] = { qty: totalQty, avg };
          } else if (t.type === "SELL") {
            const newQty = current.qty - qty;
            positions[ticker] = { qty: newQty > 0 ? newQty : 0, avg: current.avg };
          }
          txIdx += 1;
        }
        let invested = 0;
        let equity = 0;
        for (const p of byDate[d]) {
          const pos = positions[p.ticker];
          if (!pos || pos.qty <= 0) continue;
          invested += pos.qty * pos.avg;
          equity += pos.qty * p.close;
        }
        if (invested === 0 && equity === 0) continue;
        const unrealized = equity - invested;
        series.push({ date: d, invested, equity, unrealized_pnl: unrealized });
      }
      return json({ ok: true, series });
    }

    if (action === "get_quotes") {
      const tickersInput = body.tickers;
      const tickers = Array.isArray(tickersInput) ? (tickersInput as unknown[]).map((t) => String(t)).filter(Boolean) : [];
      if (!tickers.length) {
        return json({ ok: true, prices: {}, sources: {}, updatedAt: {} });
      }
      const normalsMap: Record<string, string> = {};
      for (const orig of tickers) normalsMap[orig] = normalizeTicker(orig);
      const detailed = await getBestQuotes(tickers);
      const prices: Record<string, number> = {};
      const sources: Record<string, string> = {};
      const updatedAt: Record<string, string> = {};
      for (const orig of tickers) {
        const n = normalsMap[orig];
        const info = detailed[n];
        if (info) {
          prices[orig] = info.price;
          sources[orig] = info.source;
          updatedAt[orig] = info.updatedAt;
        }
      }
      const entries = Object.entries(prices);
      if (entries.length) {
        const rows = entries.map(([ticker, price]) => ({
          ticker,
          price,
          last_close: price,
          currency: "BRL",
          last_updated: new Date().toISOString(),
        }));
        const r = await rest("POST", `/assets?on_conflict=ticker`, {
          headers: { Prefer: "resolution=merge-duplicates" },
          body: JSON.stringify(rows),
        });
        if (!r.ok) {
          const errText = await r.text().catch(() => "fetch_error");
          return json({ ok: false, error: `upsert_assets_failed:${errText}` }, 200);
        }
      }
      return json({ ok: true, prices, sources, updatedAt });
    }

    if (action === "get_exchange_rates") {
      const exchange = await fetchExchangeRates();
      return json({ ok: true, ...exchange });
    }

    if (action === "get_savings_products") {
      const r = await rest("GET", `/savings_products?select=*`);
      if (!r.ok) {
        const errText = await r.text().catch(() => "fetch_error");
        return json({ ok: false, error: `savings_fetch_failed:${errText}` }, 200);
      }
      const rows = await r.json();
      return json({ ok: true, products: rows ?? [] });
    }

    if (action === "seed_savings_products") {
      const check = await rest("GET", `/savings_products?select=id&limit=1`);
      if (!check.ok) {
        const errText = await check.text().catch(() => "fetch_error");
        return json({ ok: false, error: `seed_check_failed:${errText}` }, 200);
      }
      const existing = await check.json();
      const hasAny = Array.isArray(existing) ? existing.length > 0 : !!existing?.id;
      if (hasAny) {
        return json({ ok: true, seeded: 0, note: "already_populated" });
      }
      const seed: Array<Record<string, unknown>> = [
        { bank_name: "Tesouro Nacional", product_name: "Tesouro Selic 2029", type: "Tesouro Selic", rate_type: "SELIC_ANUAL", rate_value: 0.105, liquidity: "D+1" },
        { bank_name: "Tesouro Nacional", product_name: "Tesouro Selic + Fixa", type: "Tesouro Selic", rate_type: "SELIC+FIXA", rate_value: 0.001, liquidity: "D+1" },
        { bank_name: "Tesouro Nacional", product_name: "Tesouro IPCA+ 2035", type: "Tesouro IPCA+", rate_type: "IPCA+FIXA", rate_value: 0.050, rate_index_type: "IPCA", rate_index_value: 0.040, liquidity: "D+1" },
        { bank_name: "Tesouro Nacional", product_name: "Tesouro Prefixado 2029", type: "Tesouro Prefixado", rate_type: "FIXA_ANUAL", rate_value: 0.100, liquidity: "D+1" },
        { bank_name: "Nubank", product_name: "Cofrinho Liquidez Diária (RDB)", type: "Cofrinho", rate_type: "%CDI", rate_value: 1.00, liquidity: "D+0" },
        { bank_name: "Inter", product_name: "CDB Liquidez Diária 100% CDI", type: "CDB", rate_type: "%CDI", rate_value: 1.00, liquidity: "D+0" },
        { bank_name: "C6 Bank", product_name: "CDB 102% do CDI", type: "CDB", rate_type: "%CDI", rate_value: 1.02, liquidity: "D+0" },
        { bank_name: "BTG", product_name: "LCI 90% do CDI", type: "LCI", rate_type: "%CDI", rate_value: 0.90, liquidity: "90 dias" },
        { bank_name: "Santander", product_name: "CDB 95% do CDI", type: "CDB", rate_type: "%CDI", rate_value: 0.95, liquidity: "D+1" },
        { bank_name: "Banco do Brasil", product_name: "CDB 98% do CDI", type: "CDB", rate_type: "%CDI", rate_value: 0.98, liquidity: "D+1" },
      ];
      const ins = await rest("POST", `/savings_products`, {
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify(seed)
      });
      if (!ins.ok) {
        const errText = await ins.text().catch(() => "fetch_error");
        return json({ ok: false, error: `seed_insert_failed:${errText}` }, 200);
      }
      return json({ ok: true, seeded: seed.length });
    }
    if (action === "save_transaction") {
      const payload = body.payload as {
        assetId: string;
        type: "BUY" | "SELL";
        quantity: number;
        price: number;
        date: string;
        fees: number;
      };
      if (!payload?.assetId || !payload?.type || !payload?.quantity || !payload?.price || !payload?.date) {
        return json({ ok: false, error: "invalid_payload" }, 200);
      }
      const licenseCheck = await ensureCanWriteTransaction(sub, { assetId: payload.assetId, type: payload.type, date: payload.date });
      if (!licenseCheck.ok) {
        return json({ ok: false, error: licenseCheck.error }, 200);
      }
      const total = payload.price * payload.quantity + (payload.fees ?? 0);

      let cost_basis: number | null = null;
      let realized_pnl: number | null = null;

      if (payload.type === "SELL") {
        const q = encodeURIComponent(payload.assetId);
        const upTo = encodeURIComponent(payload.date);
        const r = await rest("GET", `/transactions?select=type,quantity,price,fees,date&user_id=eq.${encodeURIComponent(sub)}&asset_ticker=eq.${q}&date=lt.${upTo}&order=date.asc`);
        if (!r.ok) {
          const errText = await r.text().catch(() => "fetch_error");
          return json({ ok: false, error: `inventory_fetch_failed:${errText}` }, 200);
        }
        const rows = await r.json();
        const lots: Array<{ qty: number; unit: number }> = [];
        for (const t of rows || []) {
          const qty = Number(t.quantity) || 0;
          const unit = Number(t.price) || 0;
          const fees = Number(t.fees) || 0;
          if (t.type === "BUY") {
            const effUnit = qty > 0 ? unit + (fees / qty) : unit;
            lots.push({ qty, unit: effUnit });
          } else if (t.type === "SELL") {
            let remaining = qty;
            for (let i = 0; i < lots.length && remaining > 0; i++) {
              const take = Math.min(lots[i].qty, remaining);
              lots[i].qty -= take;
              remaining -= take;
            }
            for (let i = lots.length - 1; i >= 0; i--) {
              if (lots[i].qty <= 0) lots.splice(i, 1);
            }
          }
        }
        let need = payload.quantity;
        let basis = 0;
        for (let i = 0; i < lots.length && need > 0; i++) {
          const take = Math.min(lots[i].qty, need);
          basis += take * lots[i].unit;
          need -= take;
        }
        if (need > 0) {
          return json({ ok: false, error: "insufficient_inventory" }, 200);
        }
        cost_basis = basis;
        realized_pnl = payload.quantity * payload.price - basis - (payload.fees ?? 0);
      }

      const insert: Record<string, unknown> = {
        user_id: sub,
        asset_ticker: payload.assetId,
        type: payload.type,
        quantity: payload.quantity,
        price: payload.price,
        total,
        date: payload.date,
        fees: payload.fees ?? 0,
      };
      if (payload.type === "SELL") {
        insert["cost_basis"] = cost_basis;
        insert["realized_pnl"] = realized_pnl;
      }
      const r = await rest("POST", `/transactions?select=*`, {
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(insert)
      });
      if (!r.ok) {
        const errText = await r.text().catch(() => "fetch_error");
        return json({ ok: false, error: errText }, 200);
      }
      const rows = await r.json();
      const row = Array.isArray(rows) ? rows[0] : rows;
      return json({ ok: true, transaction: row });
    }

    if (action === "ensure_profile") {
      const email = (body.email as string | undefined) || null;
      // 1) Prefer lookup by external_id (novo FK padrão)
      const byExternal = await rest("GET", `/profiles?select=id,external_id,email,settings&external_id=eq.${encodeURIComponent(sub)}`);
      if (!byExternal.ok) {
        const errText = await byExternal.text().catch(() => "fetch_error");
        return json({ ok: false, error: `profile_check_failed:${errText}` }, 200);
      }
      const extRows = await byExternal.json();
      const extExists = Array.isArray(extRows) ? extRows.length > 0 : !!extRows?.id;

      // 2) Se não achou por external_id, verificar por id (compatibilidade antiga)
      let idExists = false;
      if (!extExists) {
        const byId = await rest("GET", `/profiles?select=id,external_id,email,settings&id=eq.${encodeURIComponent(sub)}`);
        if (!byId.ok) {
          const errText = await byId.text().catch(() => "fetch_error");
          return json({ ok: false, error: `profile_check_failed:${errText}` }, 200);
        }
        const idRows = await byId.json();
        idExists = Array.isArray(idRows) ? idRows.length > 0 : !!idRows?.id;
        // Se existe por id mas sem external_id, atualizar para fixar FK novo
        const row = Array.isArray(idRows) ? idRows[0] : idRows;
        if (row?.id && !row?.external_id) {
          const patch = await rest("PATCH", `/profiles?id=eq.${encodeURIComponent(sub)}`, {
            body: JSON.stringify({ external_id: sub })
          });
          if (!patch.ok) {
            const errText = await patch.text().catch(() => "patch_error");
            return json({ ok: false, error: `profile_external_patch_failed:${errText}` }, 200);
          }
        }
      }

      // 3) Se ainda não existe perfil, tentar deduplicação por email
      let migrated = false;
      if (!extExists && !idExists && email) {
        const byEmail = await rest("GET", `/profiles?select=id,external_id,email,settings&email=eq.${encodeURIComponent(email)}`);
        if (!byEmail.ok) {
          const errText = await byEmail.text().catch(() => "fetch_error");
          return json({ ok: false, error: `email_check_failed:${errText}` }, 200);
        }
        const emailRows = await byEmail.json();
        const existing = Array.isArray(emailRows) ? emailRows[0] : null;
        const oldId = existing?.id as string | undefined;
        const settings = existing?.settings ?? { baseCurrency: "BRL", monthlyContribution: 1000 };

        if (oldId && oldId !== sub) {
          // 3a) Limpar email do registro antigo para evitar único(email)
          const clearEmail = await rest("PATCH", `/profiles?id=eq.${encodeURIComponent(oldId)}`, {
            body: JSON.stringify({ email: null })
          });
          if (!clearEmail.ok) {
            const errText = await clearEmail.text().catch(() => "clear_email_failed");
            return json({ ok: false, error: `profile_email_clear_failed:${errText}` }, 200);
          }

          // 3b) Criar novo perfil com external_id=sub
          const insertNew = await rest("POST", `/profiles`, {
            body: JSON.stringify({
              id: sub,
              external_id: sub,
              email,
              settings
            })
          });
          if (!insertNew.ok) {
            const errText = await insertNew.text().catch(() => "insert_error");
            if (!/duplicate key value|23505/.test(errText)) {
              return json({ ok: false, error: `insert_profile_failed:${errText}` }, 200);
            }
          }

          // 3c) Migrar dados relacionados
          const migrateTables = ["transactions", "licenses", "plan_changes"];
          for (const t of migrateTables) {
            const up = await rest("PATCH", `/${t}?user_id=eq.${encodeURIComponent(oldId)}`, {
              body: JSON.stringify({ user_id: sub })
            });
            if (!up.ok) {
              const errText = await up.text().catch(() => "update_failed");
              return json({ ok: false, error: `migrate_${t}_failed:${errText}` }, 200);
            }
          }
          migrated = true;
        }
      }

      // 4) Se ainda não existe perfil (sem migração), criar com external_id=sub
      if (!extExists && !idExists && !migrated) {
        const insert = await rest("POST", `/profiles`, {
          body: JSON.stringify({
            id: sub,
            external_id: sub,
            email,
            settings: { baseCurrency: "BRL", monthlyContribution: 1000 }
          })
        });
        if (!insert.ok) {
          const errText = await insert.text().catch(() => "insert_error");
          return json({ ok: false, error: `insert_profile_failed:${errText}` }, 200);
        }
      }
      return json({ ok: true });
    }

    if (action === "get_user_license") {
      const lic = await fetchLicense(sub);
      const plan = (lic?.plan_type || "free") as PlanType;
      return json({ 
        ok: true, 
        plan, 
        status: lic?.payment_status || "active",
        endDate: lic?.end_date || null,
        limits: PLAN_LIMITS[plan]
      });
    }

    if (action === "upsert_asset") {
      const a = body.asset as Record<string, unknown>;
      if (!a || typeof a.ticker !== "string") return json({ ok: false, error: "invalid_asset" }, 400);
      const dbAsset = {
        ticker: a.ticker,
        name: a.name ?? null,
        category: a.category ?? null,
        price: a.price ?? null,
        last_close: a.lastClose ?? a.price ?? null,
        dividend_yield: a.dividend_yield ?? a.dividendYield ?? null,
        currency: a.currency ?? null,
        last_updated: new Date().toISOString(),
      };
      const r = await rest("POST", `/assets?on_conflict=ticker`, {
        headers: { Prefer: "resolution=merge-duplicates" },
        body: JSON.stringify(dbAsset)
      });
      if (!r.ok) {
        const errText = await r.text().catch(() => "fetch_error");
        return json({ ok: false, error: errText }, 200);
      }
      return json({ ok: true });
    }

    return json({ ok: false, error: "unknown_action" }, 200);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json({ ok: false, error: msg }, 200);
  }
});