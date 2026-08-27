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
const clerkSecretKey = Deno.env.get("CLERK_SECRET_KEY");

const BRAPI = "https://brapi.dev/api";
const COINGECKO = "https://api.coingecko.com/api/v3";
const AWESOME = "https://economia.awesomeapi.com.br/last";

// Rate limiting: 60 requisicoes por minuto por usuario (em memoria)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 60;
const RATE_LIMIT_WINDOW_MS = 60_000;

function checkRateLimit(userId: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1 };
  }
  if (entry.count >= RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0 };
  }
  entry.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX - entry.count };
}

// Cache in-memory com TTL para dados de mercado
// Reduz chamadas externas redundantes quando multiplos clientes consultam ao mesmo tempo
interface CacheEntry<T = unknown> {
  data: T;
  expiresAt: number;
}
const marketCache = new Map<string, CacheEntry>();

// TTLs diferentes por tipo de dado
const CACHE_TTL = {
  ticker: 60 * 1000,       // 1 min para ticker (dados mais volateis)
  overview: 90 * 1000,     // 1.5 min para overview
  quotes: 120 * 1000,      // 2 min para cotacoes de portfolio
  exchange: 5 * 60 * 1000, // 5 min para cambio (menos volatil)
};

function getCached<T>(key: string): T | null {
  const entry = marketCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    marketCache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache<T>(key: string, data: T, ttlMs: number): void {
  marketCache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

// Limpar cache expirado a cada 2 min
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of marketCache) {
    if (now > v.expiresAt) marketCache.delete(k);
  }
}, 2 * 60_000);

// Retry com backoff exponencial para chamadas externas
// Tenta até 2 vezes com delay crescente (1s, 2s)
async function fetchWithRetry(url: string, options: RequestInit = {}, maxRetries = 2): Promise<Response | null> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const r = await fetch(url, options);
      if (r.ok) return r;
      // Se é erro de rate limit (429), esperar mais
      if (r.status === 429 && attempt < maxRetries) {
        const retryAfter = Number(r.headers.get('retry-after') || 2);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        continue;
      }
      return r; // Retorna mesmo com erro HTTP para o caller tratar
    } catch {
      if (attempt < maxRetries) {
        // Backoff exponencial: 1s, 2s
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        continue;
      }
      return null;
    }
  }
  return null;
}

// Limpar rate limits expirados periodicamente (a cada 5 min)
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of rateLimitMap) {
    if (now > v.resetAt) rateLimitMap.delete(k);
  }
}, 5 * 60_000);

// Validacao de input
function sanitizeString(s: unknown, maxLen = 256): string | null {
  if (typeof s !== "string") return null;
  const trimmed = s.trim();
  if (trimmed.length === 0 || trimmed.length > maxLen) return null;
  return trimmed;
}

function validatePositiveNumber(n: unknown): number | null {
  if (typeof n !== "number" || !Number.isFinite(n) || n <= 0) return null;
  return n;
}

function validateDate(d: unknown): string | null {
  if (typeof d !== "string") return null;
  const parsed = new Date(d);
  if (Number.isNaN(parsed.getTime())) return null;
  return d;
}

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
  // Try to find exact match by kid first
  let jwk = keys.find((k: any) => k.kid === kid);
  // Fallback: find by algorithm compatibility
  if (!jwk && keys.length) jwk = keys[0];
  if (!jwk) throw new Error("jwk_not_found");
  return jwk;
};
async function verifyToken(req: Request) {
  const token = getBearer(req);
  if (!token) throw new Error("missing_bearer");
  const { header, payload, signature, signingInput } = parseJwtParts(token);

  const alg = header.alg;
  console.log(`[verifyToken] alg=${alg}, kid=${header.kid || 'n/a'}`);

  let valid = false;

  if (alg === "HS256") {
    // HS256 = HMAC-SHA256 (simetrico) — usa a Clerk secret key
    if (!clerkSecretKey) throw new Error("missing_clerk_secret_for_hs256");
    const encoder = new TextEncoder();
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      encoder.encode(clerkSecretKey),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    valid = await crypto.subtle.verify("HMAC", cryptoKey, signature, signingInput);
  } else if (alg === "RS256" || alg === "ES256") {
    // RS256 (RSA) ou ES256 (ECDSA) — usa JWKS (chave publica)
    const jwk = await getJwk(header.kid);
    console.log(`[verifyToken] kty=${jwk.kty}`);
    const isRSA = alg === "RS256";
    const cryptoKey = await crypto.subtle.importKey(
      "jwk",
      jwk,
      isRSA
        ? { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }
        : { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["verify"]
    );
    valid = await crypto.subtle.verify(
      isRSA ? "RSASSA-PKCS1-v1_5" : { name: "ECDSA", hash: "SHA-256" },
      cryptoKey,
      signature,
      signingInput
    );
  } else {
    throw new Error(`unsupported_alg: ${alg}`);
  }

  if (!valid) throw new Error("invalid_signature");

  // Verificar expiracao
  if (typeof payload.exp === "number" && Date.now() / 1000 > payload.exp + 60) throw new Error("token_expired");
  // Verificar not-before
  if (typeof payload.nbf === "number" && Date.now() / 1000 < payload.nbf - 30) throw new Error("token_not_active");
  // Verificar subject
  const sub = payload.sub as string | undefined;
  if (!sub) throw new Error("missing_sub");
  // Verificar issuer
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
  const monthlyLimit: number | null = PLAN_LIMITS[plan]?.maxTransactions ?? PLAN_LIMITS.free.maxTransactions;
  if (monthlyLimit !== null && ctx?.type !== "SELL") {
    const count = await getMonthlyTransactionCount(userId);
    if (count >= monthlyLimit) {
      return { ok: false, statusCode: 402, error: "limit_exceeded_transactions" as const };
    }
  }

  // 2. Check Asset limits
  const assetLimit: number | null = PLAN_LIMITS[plan]?.maxAssets ?? PLAN_LIMITS.free.maxAssets;
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
  const apiKey = Deno.env.get("BRAPI_API_KEY");
  const headers: Record<string, string> = {};
  if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;
  
  // Plano gratuito: 1 ativo por requisição - PARALELIZAR com Promise.allSettled
  const results = await Promise.allSettled(
    tickers.map(async (ticker) => {
      const r = await fetchWithRetry(`${BRAPI}/v2/stocks/quote?symbols=${ticker}`, { headers });
      if (!r?.ok) return null;
      const j = await r.json().catch(() => ({} as any));
      const items = Array.isArray(j?.results) ? j.results : [];
      for (const it of items) {
        const sym = String(it?.symbol || it?.requestedSymbol || "");
        const price = Number(it?.data?.regularMarketPrice ?? it?.data?.price ?? it?.data?.close ?? 0);
        if (sym && price > 0) return { sym, price };
      }
      return null;
    })
  );

  const out: Record<string, number> = {};
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) {
      out[result.value.sym] = result.value.price;
    }
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
      // PRIORITY 2a: BrAPI Funds (FIAGRO, FIDC, FIP, FI-Infra)
      try {
        const brapiKey2 = Deno.env.get("BRAPI_API_KEY");
        const fundHeaders: Record<string, string> = {};
        if (brapiKey2) fundHeaders["Authorization"] = `Bearer ${brapiKey2}`;
        const fundUrl = `${BRAPI}/v2/funds/indicators?symbols=${encodeURIComponent(remaining.join(","))}`;
        const fr = await fetchWithRetry(fundUrl, { headers: fundHeaders });
        if (fr?.ok) {
          const fd = await fr.json().catch(() => ({} as any));
          // Nova BrAPI: retorna funds[]/fiis[] direto (antes era results[].data)
          const fundResults = Array.isArray(fd?.funds) ? fd.funds
            : Array.isArray(fd?.fiis) ? fd.fiis
            : Array.isArray(fd?.results) ? fd.results : [];
          for (const it of fundResults) {
            const d = it?.data || it;
            const sym = normalizeTicker(String(d?.symbol || d?.ticker || ""));
            const price = Number(d?.regularMarketPrice ?? d?.price ?? 0);
            if (sym && price > 0) bySymbol[sym] = { price, source: "brapi-funds", updatedAt: new Date().toISOString() };
          }
        }
      } catch { /* funds fallback optional */ }

      // PRIORITY 2b: B3 API (only if configured and still remaining)
      const fetchedAfterFunds = new Set(Object.keys(bySymbol).map(normalizeTicker));
      const stillRemaining = remaining.filter((t) => !fetchedAfterFunds.has(normalizeTicker(t)));
      if (stillRemaining.length) {
        const b3 = await fetchB3Quotes(stillRemaining);
        for (const [t, p] of Object.entries(b3)) {
          if (typeof p === "number" && p > 0) bySymbol[normalizeTicker(t)] = { price: p, source: "b3", updatedAt: new Date().toISOString() };
        }
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
    const body_peek = (await req.clone().json().catch(() => ({}))) as { action?: string };
    const action_peek = body_peek.action as string | undefined;

    // get_ticker_data nao precisa de autenticacao (dados publicos de mercado)
    if (action_peek === "get_ticker_data") {
      // Verificar cache primeiro
      const cached = getCached<{ ok: boolean; exchange: any; crypto: any; stocks: Record<string, { price: number; prevClose: number }> }>("ticker_data");
      if (cached) {
        console.log('[get_ticker_data] Cache hit');
        return json(cached);
      }

      const [fxData, cryptoData] = await Promise.all([
        fetchWithRetry(`${AWESOME}/EUR-BRL,USD-BRL`).then(r => r?.ok ? r.json() : {}).catch(() => ({})),
        fetchWithRetry(`${COINGECKO}/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=brl,usd&include_24hr_change=true`).then(r => r?.ok ? r.json() : {}).catch(() => ({})),
      ]);
      // Stocks via BrAPI (server-side, tem API key)
      // IMPORTANTE: Plano gratuito = 1 ticker por req. Usar Promise.all para PARALELIZAR.
      const stockTickers = ["BTLG11", "HGLG11", "PETR4", "VALE3", "IVVB11", "ITUB4", "BBAS3", "WEGE3", "KLBN11", "TAEE11"];
      const brapiKey = Deno.env.get("BRAPI_API_KEY");
      const stockHeaders: Record<string, string> = {};
      if (brapiKey) stockHeaders["Authorization"] = `Bearer ${brapiKey}`;

      // PARALELIZAR todas as chamadas BrAPI (10 reqs simultaneas)
      const stockResults = await Promise.allSettled(
        stockTickers.map(async (t) => {
          try {
            const r = await fetchWithRetry(`${BRAPI}/v2/stocks/quote?symbols=${t}`, { headers: stockHeaders });
            if (!r?.ok) return null;
            const j = await r.json().catch(() => ({} as any));
            const results = Array.isArray(j?.results) ? j.results : [];
            for (const it of results) {
              const price = Number(it?.data?.regularMarketPrice ?? 0);
              const prev = Number(it?.data?.regularMarketPreviousClose ?? 0);
              if (price > 0) return { ticker: t, price, prevClose: prev || price };
            }
            return null;
          } catch { return null; }
        })
      );

      const stockPrices: Record<string, { price: number; prevClose: number }> = {};
      for (const result of stockResults) {
        if (result.status === 'fulfilled' && result.value) {
          stockPrices[result.value.ticker] = { price: result.value.price, prevClose: result.value.prevClose };
        }
      }
      const eur = fxData?.EURBRL;
      const usd = fxData?.USDBRL;
      const btc = cryptoData?.bitcoin;
      const eth = cryptoData?.ethereum;
      const sol = cryptoData?.solana;
      const response = {
        ok: true,
        exchange: {
          EURBRL: eur ? { bid: Number(eur.bid), pctChange: Number(eur.pctChange ?? 0) } : null,
          USDBRL: usd ? { bid: Number(usd.bid), pctChange: Number(usd.pctChange ?? 0) } : null,
        },
        crypto: {
          BTC: btc ? { usd: Number(btc.usd), brl: Number(btc.brl), usd24hChange: Number(btc.usd_24h_change ?? 0) } : null,
          ETH: eth ? { usd: Number(eth.usd), brl: Number(eth.brl), usd24hChange: Number(eth.usd_24h_change ?? 0) } : null,
          SOL: sol ? { usd: Number(sol.usd), brl: Number(sol.brl), usd24hChange: Number(sol.usd_24h_change ?? 0) } : null,
        },
        stocks: stockPrices,
      };
      setCache("ticker_data", response, CACHE_TTL.ticker);
      return json(response);
    }

    // get_market_overview nao precisa de autenticacao (dados publicos de mercado)
    if (action_peek === "get_market_overview") {
      // Verificar cache primeiro
      const cached = getCached<{ ok: boolean; ibovespa: any; exchange: any; crypto: any; macroIndices: any; dataQuality: any }>("market_overview");
      if (cached) {
        console.log('[get_market_overview] Cache hit');
        return json(cached);
      }

      const brapiKey = Deno.env.get("BRAPI_API_KEY");
      const headers: Record<string, string> = {};
      if (brapiKey) headers["Authorization"] = `Bearer ${brapiKey}`;

      // Buscar dados em paralelo com tracking de sucesso/falha
      const [fxResult, cryptoResult, ibovResult] = await Promise.allSettled([
        fetchWithRetry(`${AWESOME}/EUR-BRL,USD-BRL,CNY-BRL`).then(async r => {
          if (!r || !r.ok) throw new Error(`AwesomeAPI HTTP ${r?.status || 'network_error'}`);
          return await r.json();
        }),
        fetchWithRetry(`${COINGECKO}/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=brl,usd&include_24hr_change=true&include_market_cap=true`).then(async r => {
          if (!r || !r.ok) throw new Error(`CoinGecko HTTP ${r?.status || 'network_error'}`);
          return await r.json();
        }),
        fetchWithRetry(`${BRAPI}/v2/stocks/quote?symbols=^BVSP`, { headers }).then(async r => {
          if (!r || !r.ok) throw new Error(`BrAPI HTTP ${r?.status || 'network_error'}`);
          return await r.json();
        }),
      ]);

      // Log de status das APIs para debug
      console.log(`[get_market_overview] FX: ${fxResult.status}, Crypto: ${cryptoResult.status}, IBOV: ${ibovResult.status}`);
      if (fxResult.status === 'rejected') console.error('[get_market_overview] FX error:', fxResult.reason);
      if (cryptoResult.status === 'rejected') console.error('[get_market_overview] Crypto error:', cryptoResult.reason);
      if (ibovResult.status === 'rejected') console.error('[get_market_overview] IBOV error:', ibovResult.reason);

      const fxData = fxResult.status === 'fulfilled' ? fxResult.value : {};
      const cryptoData = cryptoResult.status === 'fulfilled' ? cryptoResult.value : {};
      const ibovData = ibovResult.status === 'fulfilled' ? ibovResult.value : {};

      // IBOVESPA
      const ibovResults = Array.isArray(ibovData?.results) ? ibovData.results : [];
      const ibov = ibovResults[0]?.data ? {
        value: Number(ibovResults[0].data.regularMarketPrice ?? 0),
        prevClose: Number(ibovResults[0].data.regularMarketPreviousClose ?? 0),
        change: Number(ibovResults[0].data.regularMarketChange ?? 0),
        changePercent: Number(ibovResults[0].data.regularMarketChangePercent ?? 0),
      } : null;

      // Exchange rates
      const eur = fxData?.EURBRL;
      const usd = fxData?.USDBRL;
      const cny = fxData?.CNYBRL;

      // Crypto
      const btc = cryptoData?.bitcoin;
      const eth = cryptoData?.ethereum;
      const sol = cryptoData?.solana;

      // Indices estaticos (Selic, CDI, IPCA) — atualizados manualmente
      const macroIndices = [
        { label: 'Selic', value: '14.75%', change: null },
        { label: 'CDI', value: '14.65%', change: null },
        { label: 'IPCA', value: '4.50%', change: null },
      ];

      const response = {
        ok: true,
        ibovespa: ibov,
        exchange: {
          EURBRL: eur ? { bid: Number(eur.bid), pctChange: Number(eur.pctChange ?? 0) } : null,
          USDBRL: usd ? { bid: Number(usd.bid), pctChange: Number(usd.pctChange ?? 0) } : null,
          CNYBRL: cny ? { bid: Number(cny.bid), pctChange: Number(cny.pctChange ?? 0) } : null,
        },
        crypto: {
          BTC: btc ? { usd: Number(btc.usd), brl: Number(btc.brl), usd24hChange: Number(btc.usd_24h_change ?? 0), marketCap: Number(btc.usd_market_cap ?? 0) } : null,
          ETH: eth ? { usd: Number(eth.usd), brl: Number(eth.brl), usd24hChange: Number(eth.usd_24h_change ?? 0), marketCap: Number(eth.usd_market_cap ?? 0) } : null,
          SOL: sol ? { usd: Number(sol.usd), brl: Number(sol.brl), usd24hChange: Number(sol.usd_24h_change ?? 0), marketCap: Number(sol.usd_market_cap ?? 0) } : null,
        },
        macroIndices,
        dataQuality: {
          fx: fxResult.status === 'fulfilled',
          crypto: cryptoResult.status === 'fulfilled',
          ibov: ibovResult.status === 'fulfilled',
        },
      };
      setCache("market_overview", response, CACHE_TTL.overview);
      return json(response);
    }

    // ─── Busca de Ativos (publico, nao precisa auth) ───────────────────────
    // search_brapi: busca acoes/FIIs/ETFs na BrAPI por ticker ou nome
    if (action_peek === "search_brapi") {
      const body_s = (await req.clone().json().catch(() => ({}))) as { query?: string; limit?: number };
      const query = String(body_s.query || "").trim().slice(0, 50);
      const limit = Math.min(Number(body_s.limit) || 20, 50);
      if (!query || query.length < 2) {
        return json({ ok: true, results: [] });
      }
      const cacheKey = `search_brapi_${query.toLowerCase()}_${limit}`;
      const cached = getCached<{ ok: boolean; results: any[] }>(cacheKey);
      if (cached) {
        console.log(`[search_brapi] Cache hit para "${query}"`);
        return json(cached);
      }
      try {
        const brapiKey = Deno.env.get("BRAPI_API_KEY");
        const headers: Record<string, string> = {};
        if (brapiKey) headers["Authorization"] = `Bearer ${brapiKey}`;

        // Busca stocks/FIIs tradicionais
        const r = await fetchWithRetry(`${BRAPI}/quote/list?search=${encodeURIComponent(query)}&limit=${limit}&fundamental=true`);
        const stocks = r?.ok ? (Array.isArray((await r.json().catch(() => ({} as any))).stocks) ? (await r.json().catch(() => ({} as any))).stocks : []) : [];

        // Busca fundos estruturados (FIAGRO, FIDC, FIP, FI-Infra)
        let funds: any[] = [];
        try {
          const fr = await fetchWithRetry(`${BRAPI}/v2/funds/list?symbols=${encodeURIComponent(query)}&limit=${limit}`, { headers });
          if (fr?.ok) {
            const fd = await fr.json().catch(() => ({} as any));
            funds = Array.isArray(fd?.results) ? fd.results : [];
          }
        } catch { /* fundos opcionais */ }

        const stockResults = stocks.map((s: any) => ({
          ticker: s.stock || s.symbol || "",
          name: s.name || "",
          price: Number(s.regularMarketPrice ?? s.close ?? 0),
          change: Number(s.regularMarketChangePercent ?? s.pctChange ?? 0),
          logo: s.logo || null,
          type: (s.stock || "").endsWith("11") ? "fii" : "stock",
          currency: "BRL",
        }));

        const fundResults = funds.map((f: any) => {
          const d = f?.data || f;
          const sym = String(d?.symbol || d?.ticker || "");
          const fundTypeVal = String(d?.fundType || d?.type || "").toUpperCase();
          let mappedType = "fiagro";
          if (fundTypeVal.includes("FIDC")) mappedType = "fidc";
          else if (fundTypeVal.includes("FIP")) mappedType = "fip";
          else if (fundTypeVal.includes("INFRA") || fundTypeVal.includes("FIF")) mappedType = "fiinfra";
          else if (fundTypeVal.includes("FII")) mappedType = "fii";
          return {
            ticker: sym,
            name: String(d?.name || d?.longName || ""),
            price: Number(d?.regularMarketPrice ?? d?.price ?? 0),
            change: Number(d?.regularMarketChangePercent ?? 0),
            logo: d?.logoURL || d?.logo || null,
            type: mappedType,
            fundType: mappedType,
            cnpj: String(d?.cnpj || ""),
            currency: "BRL",
          };
        });

        // Remover duplicados (ticker)
        const seen = new Set<string>();
        const results = [...stockResults, ...fundResults].filter(r => {
          if (seen.has(r.ticker)) return false;
          seen.add(r.ticker);
          return true;
        });

        const response = { ok: true, results };
        setCache(cacheKey, response, 5 * 60 * 1000); // 5 min cache para buscas
        return json(response);
      } catch (e) {
        console.error("[search_brapi] Erro:", e);
        return json({ ok: true, results: [] });
      }
    }

    // search_coingecko: busca criptomoedas no CoinGecko
    if (action_peek === "search_coingecko") {
      const body_s = (await req.clone().json().catch(() => ({}))) as { query?: string; limit?: number };
      const query = String(body_s.query || "").trim().slice(0, 50);
      const limit = Math.min(Number(body_s.limit) || 20, 50);
      if (!query || query.length < 2) {
        return json({ ok: true, results: [] });
      }
      const cacheKey = `search_cg_${query.toLowerCase()}_${limit}`;
      const cached = getCached<{ ok: boolean; results: any[] }>(cacheKey);
      if (cached) {
        console.log(`[search_coingecko] Cache hit para "${query}"`);
        return json(cached);
      }
      try {
        const r = await fetchWithRetry(`${COINGECKO}/search?query=${encodeURIComponent(query)}`);
        if (!r?.ok) {
          console.log(`[search_coingecko] CoinGecko HTTP ${r?.status}`);
          return json({ ok: true, results: [] });
        }
        const data = await r.json().catch(() => ({} as any));
        const coins = Array.isArray(data.coins) ? data.coins : [];
        const results = coins.slice(0, limit).map((c: any) => ({
          id: c.id || "",
          ticker: (c.symbol || "").toUpperCase(),
          name: c.name || "",
          logo: c.thumb || null,
          type: "crypto",
          marketCapRank: c.market_cap_rank || null,
          currency: "USD",
        }));
        const response = { ok: true, results };
        setCache(cacheKey, response, 5 * 60 * 1000);
        return json(response);
      } catch (e) {
        console.error("[search_coingecko] Erro:", e);
        return json({ ok: true, results: [] });
      }
    }

    // get_top_cryptos: lista as top criptomoedas por market cap
    if (action_peek === "get_top_cryptos") {
      const body_s = (await req.clone().json().catch(() => ({}))) as { limit?: number; category?: string };
      const limit = Math.min(Number(body_s.limit) || 30, 100);
      const category = body_s.category || "";
      const cacheKey = `top_crypto_${limit}_${category}`;
      const cached = getCached<{ ok: boolean; results: any[] }>(cacheKey);
      if (cached) return json(cached);
      try {
        const url = category
          ? `${COINGECKO}/coins/markets?vs_currency=usd&category=${category}&order=market_cap_desc&per_page=${limit}&page=1&sparkline=false&price_change_percentage=24h`
          : `${COINGECKO}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${limit}&page=1&sparkline=false&price_change_percentage=24h`;
        const r = await fetchWithRetry(url);
        if (!r?.ok) return json({ ok: true, results: [] });
        const data = await r.json().catch(() => [] as any[]);
        const results = (Array.isArray(data) ? data : []).map((c: any) => ({
          id: c.id || "",
          ticker: (c.symbol || "").toUpperCase(),
          name: c.name || "",
          logo: c.image || null,
          type: "crypto",
          price: Number(c.current_price ?? 0),
          change24h: Number(c.price_change_percentage_24h ?? 0),
          marketCap: Number(c.market_cap ?? 0),
          marketCapRank: c.market_cap_rank || null,
          currency: "USD",
        }));
        const response = { ok: true, results };
        setCache(cacheKey, response, 3 * 60 * 1000); // 3 min
        return json(response);
      } catch (e) {
        console.error("[get_top_cryptos] Erro:", e);
        return json({ ok: true, results: [] });
      }
    }

    // get_popular_stocks: lista acoes populares da B3 (pre-curated + BrAPI)
    if (action_peek === "get_popular_stocks") {
      const body_s = (await req.clone().json().catch(() => ({}))) as { category?: string };
      const category = body_s.category || "all";
      const cacheKey = `popular_stocks_${category}`;
      const cached = getCached<{ ok: boolean; results: any[] }>(cacheKey);
      if (cached) return json(cached);

      // Lista curada de ativos populares por categoria
      const popularTickers: Record<string, string[]> = {
        all: ["PETR4", "VALE3", "ITUB4", "BBAS3", "WEGE3", "BBSE3", "TAEE11", "CPLE6", "KLBN11", "CXSE3", "HGLG11", "MXRF11", "KNCR11", "BTLG11", "XPML11"],
        acoes: ["PETR4", "VALE3", "ITUB4", "BBAS3", "WEGE3", "BBSE3", "TAEE11", "CPLE6", "KLBN11", "CXSE3", "SAPR11", "SUZB3", "JBSS3", "MGLU3", "B3SA3"],
        fii: ["HGLG11", "MXRF11", "KNCR11", "BTLG11", "XPML11", "HGRU11", "KNCA11", "VISC11", "TRXF11", "IRDM11", "HGCR11", "ALZR11", "GGRC11", "CPTS11", "PVBI11"],
        fiagro: ["SNAG11", "VGIA11", "RURA11", "FGAA11", "AGRO11", "HGBS11", "CNES11", "FGAG11", "RBRR11", "JURO11"],
        fiinfra: ["XPCA11", "IRFM11", "BCFF11", "GGRC11", "HGRU11"],
        fidc: ["JURO11", "CRED11", "RBDD11", "RVIR11", "RBRF11"],
        fip: ["BRIA11", "TOP11", "TEPP11", "SHPH11", "XPLG11"],
      };
      const tickers = popularTickers[category] || popularTickers.all;

      try {
        const brapiKey = Deno.env.get("BRAPI_API_KEY");
        const headers: Record<string, string> = {};
        if (brapiKey) headers["Authorization"] = `Bearer ${brapiKey}`;
        const results = await Promise.allSettled(
          tickers.map(async (t) => {
            try {
              const r = await fetchWithRetry(`${BRAPI}/v2/stocks/quote?symbols=${t}`, { headers });
              if (!r?.ok) return null;
              const j = await r.json().catch(() => ({} as any));
              const items = Array.isArray(j?.results) ? j.results : [];
              for (const it of items) {
                const price = Number(it?.data?.regularMarketPrice ?? it?.data?.price ?? it?.data?.close ?? 0);
                const change = Number(it?.data?.regularMarketChangePercent ?? 0);
                const name = String(it?.data?.shortName ?? it?.data?.longName ?? "");
                const logo = it?.data?.logoURL || it?.data?.logo || null;
                const isFii = t.endsWith("11");
                // Para FIIs, busca dados complementares no endpoint dedicado /v2/fii/*
                let patrimonioLiquido = 0, liquidity = 0, variacao12m = undefined as number | undefined;
                if (isFii) {
                  try {
                    const v1Headers: Record<string, string> = {};
                    if (brapiKey) v1Headers["Authorization"] = `Bearer ${brapiKey}`;
                    const r1 = await fetchWithRetry(`${BRAPI}/v2/fii/indicators?symbols=${t}`, { headers: v1Headers });
                    if (r1?.ok) {
                      const j1 = await r1.json().catch(() => ({} as any));
                      const q = (Array.isArray(j1?.fiis) ? j1.fiis : [])[0] || {};
                      patrimonioLiquido = Number(q?.equity ?? q?.patrimony ?? q?.patrimonioLiquido ?? 0);
                    }
                    const rq = await fetchWithRetry(`${BRAPI}/v2/stocks/quote?symbols=${t}`, { headers: v1Headers });
                    if (rq?.ok) {
                      const jq = await rq.json().catch(() => ({} as any));
                      const first = Array.isArray(jq?.results) && jq.results.length > 0 ? jq.results[0] : null;
                      const q = first?.data || {};
                      const avgVol = Number(q?.averageDailyVolume3Month ?? q?.avgVolume50d ?? 0);
                      if (avgVol && price > 0) liquidity = (avgVol * price) / 1000000;
                      const range = String(q?.fiftyTwoWeekRange || "");
                      const rangeMatch = range.match(/([\d.]+)\s*-\s*([\d.]+)/);
                      if (rangeMatch && price > 0) {
                        const low52 = parseFloat(rangeMatch[1]);
                        if (low52 > 0) variacao12m = ((price - low52) / low52) * 100;
                      }
                    }
                  } catch { /* complementar, ignora falha */ }
                }
                return {
                  ticker: t,
                  name,
                  price,
                  change,
                  logo,
                  type: isFii ? "fii" : "stock",
                  patrimonioLiquido,
                  liquidezDiaria: liquidity,
                  variacao12m,
                  currency: "BRL",
                };
              }
              return null;
            } catch { return null; }
          })
        );
        const filtered = results
          .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled" && r.value !== null)
          .map(r => r.value);
        const response = { ok: true, results: filtered };
        setCache(cacheKey, response, 2 * 60 * 1000); // 2 min
        return json(response);
      } catch (e) {
        console.error("[get_popular_stocks] Erro:", e);
        return json({ ok: true, results: [] });
      }
    }

    // ─── BrAPI Funds API — Fundos Estruturados (FIAGRO, FIDC, FIP, FI-Infra) ───

    // search_funds: busca fundos estruturados na BrAPI por simbolo, CNPJ ou nome
    if (action_peek === "search_funds") {
      const body_s = (await req.clone().json().catch(() => ({}))) as { query?: string; limit?: number; fundType?: string };
      const query = String(body_s.query || "").trim().slice(0, 50);
      const limit = Math.min(Number(body_s.limit) || 20, 50);
      const fundType = body_s.fundType || "";
      if (!query || query.length < 2) {
        return json({ ok: true, results: [] });
      }
      const cacheKey = `search_funds_${query.toLowerCase()}_${limit}_${fundType}`;
      const cached = getCached<{ ok: boolean; results: any[] }>(cacheKey);
      if (cached) return json(cached);
      try {
        const brapiKey = Deno.env.get("BRAPI_API_KEY");
        const headers: Record<string, string> = {};
        if (brapiKey) headers["Authorization"] = `Bearer ${brapiKey}`;
        let url = `${BRAPI}/v2/funds/list?symbols=${encodeURIComponent(query)}&limit=${limit}`;
        if (fundType) url += `&type=${encodeURIComponent(fundType)}`;
        const r = await fetchWithRetry(url, { headers });
        if (!r?.ok) {
          console.log(`[search_funds] BrAPI HTTP ${r?.status}`);
          return json({ ok: true, results: [] });
        }
        const data = await r.json().catch(() => ({} as any));
        const funds = Array.isArray(data?.results) ? data.results : [];
        const results = funds.map((f: any) => {
          const d = f?.data || f;
          const sym = String(d?.symbol || d?.ticker || "");
          const fundTypeVal = String(d?.fundType || d?.type || "").toUpperCase();
          let mappedType = "fiagro";
          if (fundTypeVal.includes("FIDC")) mappedType = "fidc";
          else if (fundTypeVal.includes("FIP")) mappedType = "fip";
          else if (fundTypeVal.includes("INFRA") || fundTypeVal.includes("FIF")) mappedType = "fiinfra";
          else if (fundTypeVal.includes("FII")) mappedType = "fii";
          return {
            ticker: sym,
            cnpj: String(d?.cnpj || ""),
            name: String(d?.name || d?.longName || d?.shortName || ""),
            fundType: mappedType,
            price: Number(d?.regularMarketPrice ?? d?.price ?? d?.nav ?? 0),
            change: Number(d?.regularMarketChangePercent ?? d?.pctChange ?? 0),
            logo: d?.logoURL || d?.logo || null,
            currency: "BRL",
          };
        });
        const response = { ok: true, results };
        setCache(cacheKey, response, 5 * 60 * 1000);
        return json(response);
      } catch (e) {
        console.error("[search_funds] Erro:", e);
        return json({ ok: true, results: [] });
      }
    }

    // get_fund_indicators: indicadores de fundos (preco, VP/cota, PL, patrimonio, cotistas)
    if (action_peek === "get_fund_indicators") {
      const body_s = (await req.clone().json().catch(() => ({}))) as { symbols?: string[]; cnpjs?: string[] };
      const symbols = Array.isArray(body_s.symbols) ? body_s.symbols.map(String).filter(Boolean) : [];
      const cnpjs = Array.isArray(body_s.cnpjs) ? body_s.cnpjs.map(String).filter(Boolean) : [];
      if (!symbols.length && !cnpjs.length) return json({ ok: true, results: [] });
      const cacheKey = `fund_indicators_${symbols.join(",")}_${cnpjs.join(",")}`;
      const cached = getCached<{ ok: boolean; results: any[] }>(cacheKey);
      if (cached) return json(cached);
      try {
        const brapiKey = Deno.env.get("BRAPI_API_KEY");
        const headers: Record<string, string> = {};
        if (brapiKey) headers["Authorization"] = `Bearer ${brapiKey}`;
        let url = `${BRAPI}/v2/funds/indicators?`;
        const params: string[] = [];
        if (symbols.length) params.push(`symbols=${encodeURIComponent(symbols.join(","))}`);
        if (cnpjs.length) params.push(`cnpjs=${encodeURIComponent(cnpjs.join(","))}`);
        url += params.join("&");
        const r = await fetchWithRetry(url, { headers });
        if (!r?.ok) return json({ ok: true, results: [] });
        const data = await r.json().catch(() => ({} as any));
        // Nova BrAPI: retorna funds[]/fiis[] direto (antes era results[].data)
        const rawList = Array.isArray(data?.funds) ? data.funds
          : Array.isArray(data?.fiis) ? data.fiis
          : Array.isArray(data?.results) ? data.results : [];
        const results = rawList.map((f: any) => {
          const d = f?.data || f;
          const fundTypeVal = String(d?.assetType || d?.fundType || d?.type || "").toUpperCase();
          let mappedType = "fiagro";
          if (fundTypeVal.includes("FIDC")) mappedType = "fidc";
          else if (fundTypeVal.includes("FIP")) mappedType = "fip";
          else if (fundTypeVal.includes("INFRA") || fundTypeVal.includes("FIF")) mappedType = "fiinfra";
          else if (fundTypeVal.includes("FII")) mappedType = "fii";
          return {
            symbol: String(d?.symbol || d?.ticker || ""),
            cnpj: String(d?.cnpj || ""),
            name: String(d?.name || d?.longName || ""),
            fundType: mappedType,
            price: Number(d?.regularMarketPrice ?? d?.price ?? 0),
            navPerShare: Number(d?.navPerShare ?? d?.netAssetValuePerShare ?? d?.vpCota ?? 0),
            patrimony: Number(d?.patrimony ?? d?.netAssets ?? d?.patrimonioLiquido ?? 0),
            totalAssets: Number(d?.totalAssets ?? d?.ativos ?? 0),
            shareholders: Number(d?.shareholders ?? d?.cotistas ?? d?.quotaHolders ?? 0),
            changePercent: Number(d?.regularMarketChangePercent ?? d?.pctChange ?? 0),
            currency: "BRL" as const,
          };
        });
        const response = { ok: true, results };
        setCache(cacheKey, response, 2 * 60 * 1000);
        return json(response);
      } catch (e) {
        console.error("[get_fund_indicators] Erro:", e);
        return json({ ok: true, results: [] });
      }
    }

    // get_fund_dividends: dividendos oficiais de fundos nao-FII
    if (action_peek === "get_fund_dividends") {
      const body_s = (await req.clone().json().catch(() => ({}))) as { symbols?: string[]; cnpjs?: string[] };
      const symbols = Array.isArray(body_s.symbols) ? body_s.symbols.map(String).filter(Boolean) : [];
      const cnpjs = Array.isArray(body_s.cnpjs) ? body_s.cnpjs.map(String).filter(Boolean) : [];
      if (!symbols.length && !cnpjs.length) return json({ ok: true, results: [] });
      const cacheKey = `fund_divs_${symbols.join(",")}_${cnpjs.join(",")}`;
      const cached = getCached<{ ok: boolean; results: any[] }>(cacheKey);
      if (cached) return json(cached);
      try {
        const brapiKey = Deno.env.get("BRAPI_API_KEY");
        const headers: Record<string, string> = {};
        if (brapiKey) headers["Authorization"] = `Bearer ${brapiKey}`;
        let url = `${BRAPI}/v2/funds/dividends?`;
        const params: string[] = [];
        if (symbols.length) params.push(`symbols=${encodeURIComponent(symbols.join(","))}`);
        if (cnpjs.length) params.push(`cnpjs=${encodeURIComponent(cnpjs.join(","))}`);
        url += params.join("&");
        const r = await fetchWithRetry(url, { headers });
        if (!r?.ok) return json({ ok: true, results: [] });
        const data = await r.json().catch(() => ({} as any));
        const dividends = Array.isArray(data?.results) ? data.results : [];
        const results = dividends.map((d: any) => ({
          symbol: String(d?.symbol || d?.ticker || ""),
          cnpj: String(d?.cnpj || ""),
          name: String(d?.name || ""),
          dividendType: String(d?.dividendType || d?.type || "Rendimento"),
          valuePerShare: Number(d?.valuePerShare ?? d?.value ?? 0),
          exDate: String(d?.exDate || d?.dataCom || ""),
          paymentDate: String(d?.paymentDate || d?.dataPagamento || ""),
          recordDate: String(d?.recordDate || d?.dataRegistro || ""),
        }));
        const response = { ok: true, results };
        setCache(cacheKey, response, 5 * 60 * 1000);
        return json(response);
      } catch (e) {
        console.error("[get_fund_dividends] Erro:", e);
        return json({ ok: true, results: [] });
      }
    }

    // get_fund_nav_history: historico do valor da cota
    if (action_peek === "get_fund_nav_history") {
      const body_s = (await req.clone().json().catch(() => ({}))) as { symbols?: string[]; cnpjs?: string[]; startDate?: string; endDate?: string };
      const symbols = Array.isArray(body_s.symbols) ? body_s.symbols.map(String).filter(Boolean) : [];
      const cnpjs = Array.isArray(body_s.cnpjs) ? body_s.cnpjs.map(String).filter(Boolean) : [];
      if (!symbols.length && !cnpjs.length) return json({ ok: true, results: [] });
      const cacheKey = `fund_nav_${symbols.join(",")}_${cnpjs.join(",")}`;
      const cached = getCached<{ ok: boolean; results: any[] }>(cacheKey);
      if (cached) return json(cached);
      try {
        const brapiKey = Deno.env.get("BRAPI_API_KEY");
        const headers: Record<string, string> = {};
        if (brapiKey) headers["Authorization"] = `Bearer ${brapiKey}`;
        let url = `${BRAPI}/v2/funds/nav/history?`;
        const params: string[] = [];
        if (symbols.length) params.push(`symbols=${encodeURIComponent(symbols.join(","))}`);
        if (cnpjs.length) params.push(`cnpjs=${encodeURIComponent(cnpjs.join(","))}`);
        if (body_s.startDate) params.push(`startDate=${encodeURIComponent(body_s.startDate)}`);
        if (body_s.endDate) params.push(`endDate=${encodeURIComponent(body_s.endDate)}`);
        url += params.join("&");
        const r = await fetchWithRetry(url, { headers });
        if (!r?.ok) return json({ ok: true, results: [] });
        const data = await r.json().catch(() => ({} as any));
        const results = Array.isArray(data?.results) ? data.results : [];
        const response = { ok: true, results };
        setCache(cacheKey, response, 5 * 60 * 1000);
        return json(response);
      } catch (e) {
        console.error("[get_fund_nav_history] Erro:", e);
        return json({ ok: true, results: [] });
      }
    }

    // get_fund_portfolio: carteira do fundo (posicoes CVM CDA)
    if (action_peek === "get_fund_portfolio") {
      const body_s = (await req.clone().json().catch(() => ({}))) as { symbols?: string[]; cnpjs?: string[] };
      const symbols = Array.isArray(body_s.symbols) ? body_s.symbols.map(String).filter(Boolean) : [];
      const cnpjs = Array.isArray(body_s.cnpjs) ? body_s.cnpjs.map(String).filter(Boolean) : [];
      if (!symbols.length && !cnpjs.length) return json({ ok: true, results: [] });
      const cacheKey = `fund_portfolio_${symbols.join(",")}_${cnpjs.join(",")}`;
      const cached = getCached<{ ok: boolean; results: any[] }>(cacheKey);
      if (cached) return json(cached);
      try {
        const brapiKey = Deno.env.get("BRAPI_API_KEY");
        const headers: Record<string, string> = {};
        if (brapiKey) headers["Authorization"] = `Bearer ${brapiKey}`;
        let url = `${BRAPI}/v2/funds/portfolio?`;
        const params: string[] = [];
        if (symbols.length) params.push(`symbols=${encodeURIComponent(symbols.join(","))}`);
        if (cnpjs.length) params.push(`cnpjs=${encodeURIComponent(cnpjs.join(","))}`);
        url += params.join("&");
        const r = await fetchWithRetry(url, { headers });
        if (!r?.ok) return json({ ok: true, results: [] });
        const data = await r.json().catch(() => ({} as any));
        const results = Array.isArray(data?.results) ? data.results : [];
        const response = { ok: true, results };
        setCache(cacheKey, response, 5 * 60 * 1000);
        return json(response);
      } catch (e) {
        console.error("[get_fund_portfolio] Erro:", e);
        return json({ ok: true, results: [] });
      }
    }

    // get_popular_funds: lista fundos estruturados populares por tipo
    if (action_peek === "get_popular_funds") {
      const body_s = (await req.clone().json().catch(() => ({}))) as { fundType?: string };
      const fundType = body_s.fundType || "fiagro";
      const cacheKey = `popular_funds_${fundType}`;
      const cached = getCached<{ ok: boolean; results: any[] }>(cacheKey);
      if (cached) return json(cached);

      const popularFunds: Record<string, string[]> = {
        fii: ["HGLG11", "MXRF11", "KNCR11", "BTLG11", "XPML11", "HGRU11", "KNCA11", "VISC11", "TRXF11", "IRDM11", "HGCR11", "ALZR11", "GGRC11", "CPTS11", "PVBI11"],
        fiagro: ["SNAG11", "VGIA11", "RURA11", "FGAA11", "AGRO11", "HGBS11", "CNES11", "FGAG11", "RBRR11", "JURO11"],
        fiinfra: ["XPCA11", "IRFM11", "BCFF11", "GGRC11", "HGRU11"],
        fidc: ["JURO11", "CRED11", "RBDD11", "RVIR11", "RBRF11"],
        fip: ["BRIA11", "TOP11", "TEPP11", "SHPH11", "XPLG11"],
      };
      const tickers = popularFunds[fundType] || popularFunds.fiagro;

      try {
        const brapiKey = Deno.env.get("BRAPI_API_KEY");
        const headers: Record<string, string> = {};
        if (brapiKey) headers["Authorization"] = `Bearer ${brapiKey}`;

        // BrAPI reestruturou a API (2026): tudo sob /api, FIIs tem namespace
        // proprio /v2/fii/* e as respostas nao usam mais results[].data
        const asPct = (v: unknown) => {
          const n = Number(v ?? 0);
          if (!Number.isFinite(n)) return 0;
          return n <= 1 ? n * 100 : n; // API devolve fracao (0.1238 = 12.38%)
        };
        const mapAssetType = (raw: unknown) => {
          const v = String(raw || "").toLowerCase();
          if (v.includes("fii")) return "fii";
          if (v.includes("fiagro")) return "fiagro";
          if (v.includes("fidc")) return "fidc";
          if (v.includes("fip")) return "fip";
          if (v.includes("infra") || v.includes("fif")) return "fiinfra";
          return "fiagro";
        };

        // Chamada unica em batch com todos os tickers do tipo
        const url = fundType === "fii"
          ? `${BRAPI}/v2/fii/indicators?symbols=${encodeURIComponent(tickers.join(","))}`
          : `${BRAPI}/v2/funds/indicators?symbols=${encodeURIComponent(tickers.join(","))}`;
        const r = await fetchWithRetry(url, { headers });
        let funds: any[] = [];
        if (r?.ok) {
          const j = await r.json().catch(() => ({} as any));
          if (Array.isArray(j?.fiis)) funds = j.fiis;
          else if (Array.isArray(j?.funds)) funds = j.funds;
          else if (Array.isArray(j?.results)) funds = j.results.map((it: any) => it?.data || it);
        }

        const results = funds
          .filter((d: any) => d && (d?.symbol || d?.ticker))
          .map((d: any) => ({
            ticker: String(d?.symbol || d?.ticker || ""),
            name: String(d?.name || d?.longName || ""),
            price: Number(d?.price ?? d?.regularMarketPrice ?? 0),
            change: Number(d?.regularMarketChangePercent ?? 0),
            logo: d?.logoURL || d?.logo || null,
            fundType: fundType === "fii" ? "fii" : mapAssetType(d?.assetType || d?.fundType || d?.type || fundType),
            segmentType: String(d?.segmentType || ""),
            dividendYield: asPct(d?.dividendYield12m ?? d?.dividendYield),
            navPerShare: Number(d?.navPerShare ?? d?.vpCota ?? 0),
            patrimonioLiquido: Number(d?.equity ?? d?.patrimony ?? d?.patrimonioLiquido ?? 0),
            shareholders: Number(d?.totalInvestors ?? d?.shareholders ?? d?.cotistas ?? 0),
            liquidezDiaria: 0,
            variacao12m: undefined as number | undefined,
            currency: "BRL",
          }));

        // Complemento opcional (variacao do dia, liquidez, variacao 12M)
        // via stocks/quote em batch unico — nao bloqueia se falhar
        if (results.length) {
          try {
            const rq = await fetchWithRetry(
              `${BRAPI}/v2/stocks/quote?symbols=${encodeURIComponent(results.map(f => f.ticker).join(","))}`,
              { headers }
            );
            if (rq?.ok) {
              const jq = await rq.json().catch(() => ({} as any));
              const items = Array.isArray(jq?.results) ? jq.results : [];
              const bySym = new Map<string, any>();
              for (const it of items) {
                const d = it?.data || it;
                const s = String(d?.symbol || d?.ticker || "");
                if (s) bySym.set(s, d);
              }
              for (const f of results) {
                const q = bySym.get(f.ticker);
                if (!q) continue;
                if (!f.change) f.change = Number(q?.regularMarketChangePercent ?? 0);
                const avgVol = Number(q?.averageDailyVolume3Month ?? q?.avgVolume50d ?? 0);
                if (avgVol > 0 && f.price > 0) f.liquidezDiaria = (avgVol * f.price) / 1000000; // em milhoes
                const range = String(q?.fiftyTwoWeekRange || "");
                const rangeMatch = range.match(/([\d.]+)\s*-\s*([\d.]+)/);
                if (rangeMatch && f.price > 0) {
                  const low52 = parseFloat(rangeMatch[1]);
                  if (low52 > 0) f.variacao12m = ((f.price - low52) / low52) * 100;
                }
              }
            }
          } catch { /* complemento opcional, ignora falha */ }
        }

        const response = { ok: true, results };
        setCache(cacheKey, response, 2 * 60 * 1000);
        return json(response);
      } catch (e) {
        console.error("[get_popular_funds] Erro:", e);
        return json({ ok: true, results: [] });
      }
    }

    // get_watchlist_quotes: busca cotacoes para uma lista mista de tickers B3 + cripto
    // Diferente de get_quotes, aceita crypto IDs e retorna dados completos
    if (action_peek === "get_watchlist_quotes") {
      const body_s = (await req.clone().json().catch(() => ({}))) as { tickers?: string[]; cryptoIds?: string[] };
      const tickers = Array.isArray(body_s.tickers) ? body_s.tickers.map(String).filter(Boolean) : [];
      const cryptoIds = Array.isArray(body_s.cryptoIds) ? body_s.cryptoIds.map(String).filter(Boolean) : [];

      if (!tickers.length && !cryptoIds.length) {
        return json({ ok: true, prices: {}, changes: {} });
      }

      const cacheKey = `wl_quotes_${[...tickers, ...cryptoIds].sort().join(",")}`;
      const cached = getCached<{ ok: boolean; prices: Record<string, any>; changes: Record<string, number> }>(cacheKey);
      if (cached) return json(cached);

      const prices: Record<string, any> = {};
      const changes: Record<string, number> = {};

      // Buscar stocks B3 via BrAPI (paralelo)
      if (tickers.length > 0) {
        const brapiKey = Deno.env.get("BRAPI_API_KEY");
        const headers: Record<string, string> = {};
        if (brapiKey) headers["Authorization"] = `Bearer ${brapiKey}`;
        await Promise.allSettled(
          tickers.map(async (t) => {
            const r = await fetchWithRetry(`${BRAPI}/v2/stocks/quote?symbols=${t}`, { headers });
            if (!r?.ok) return null;
            const j = await r.json().catch(() => ({} as any));
            const items = Array.isArray(j?.results) ? j.results : [];
            for (const it of items) {
              const price = Number(it?.data?.regularMarketPrice ?? it?.data?.price ?? it?.data?.close ?? 0);
              const change = Number(it?.data?.regularMarketChangePercent ?? 0);
              if (price > 0) {
                prices[t] = price;
                changes[t] = change;
              }
            }
            return null;
          })
        );

        // Fallback: tickers sem preco via stocks -> tentar funds/indicators
        const missingTickers = tickers.filter(t => !prices[t]);
        if (missingTickers.length > 0) {
          try {
            const fundUrl = `${BRAPI}/v2/funds/indicators?symbols=${encodeURIComponent(missingTickers.join(","))}`;
            const fr = await fetchWithRetry(fundUrl, { headers });
            if (fr?.ok) {
              const fd = await fr.json().catch(() => ({} as any));
              // Nova BrAPI: retorna funds[]/fiis[] direto (antes era results[].data)
              const fundResults = Array.isArray(fd?.funds) ? fd.funds
                : Array.isArray(fd?.fiis) ? fd.fiis
                : Array.isArray(fd?.results) ? fd.results : [];
              for (const it of fundResults) {
                const d = it?.data || it;
                const sym = String(d?.symbol || d?.ticker || "");
                const price = Number(d?.regularMarketPrice ?? d?.price ?? 0);
                const change = Number(d?.regularMarketChangePercent ?? 0);
                if (sym && price > 0) {
                  prices[sym] = price;
                  changes[sym] = change;
                }
              }
            }
          } catch { /* funds fallback optional */ }
        }
      }

      // Buscar crypto via CoinGecko (uma unica chamada)
      if (cryptoIds.length > 0) {
        try {
          const r = await fetchWithRetry(
            `${COINGECKO}/simple/price?ids=${cryptoIds.join(",")}&vs_currencies=brl,usd&include_24hr_change=true`
          );
          if (r?.ok) {
            const data = await r.json().catch(() => ({} as any));
            for (const id of cryptoIds) {
              const coin = data[id];
              if (coin) {
                const ticker = id.toUpperCase().slice(0, 5);
                prices[ticker] = { brl: Number(coin.brl ?? 0), usd: Number(coin.usd ?? 0) };
                changes[ticker] = Number(coin.brl_24h_change ?? coin.usd_24h_change ?? 0);
              }
            }
          }
        } catch (e) {
          console.error("[get_watchlist_quotes] CoinGecko error:", e);
        }
      }

      const response = { ok: true, prices, changes };
      setCache(cacheKey, response, CACHE_TTL.ticker);
      return json(response);
    }

    const { sub } = await verifyToken(req);

    // Rate limiting por usuario
    const rateCheck = checkRateLimit(sub);
    if (!rateCheck.allowed) {
      return json({ ok: false, error: "rate_limit_exceeded", retryAfter: 60 }, 429);
    }

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
      // Cache key baseado nos tickers ordenados
      const cacheKey = "quotes_" + [...tickers].sort().join(",");
      const cached = getCached<{ ok: boolean; prices: Record<string, number>; sources: Record<string, string>; updatedAt: Record<string, string> }>(cacheKey);
      if (cached) {
        console.log(`[get_quotes] Cache hit para ${tickers.length} tickers`);
        return json(cached);
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
      const response = { ok: true, prices, sources, updatedAt };
      setCache(cacheKey, response, CACHE_TTL.quotes);
      return json(response);
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

      // Validacao rigorosa de input
      const assetId = sanitizeString(payload?.assetId, 50);
      if (!assetId) return json({ ok: false, error: "invalid_asset_id" }, 200);

      const type = payload?.type;
      if (type !== "BUY" && type !== "SELL") return json({ ok: false, error: "invalid_type" }, 200);

      const quantity = validatePositiveNumber(payload?.quantity);
      if (quantity === null) return json({ ok: false, error: "invalid_quantity" }, 200);

      const price = validatePositiveNumber(payload?.price);
      if (price === null) return json({ ok: false, error: "invalid_price" }, 200);

      const date = validateDate(payload?.date);
      if (!date) return json({ ok: false, error: "invalid_date" }, 200);

      const fees = typeof payload?.fees === "number" && payload.fees >= 0 ? payload.fees : 0;
      const licenseCheck = await ensureCanWriteTransaction(sub, { assetId, type, date });
      if (!licenseCheck.ok) {
        return json({ ok: false, error: licenseCheck.error }, 200);
      }
      const total = price * quantity + fees;

      let cost_basis: number | null = null;
      let realized_pnl: number | null = null;

      if (type === "SELL") {
        const q = encodeURIComponent(assetId);
        const upTo = encodeURIComponent(date);
        const r = await rest("GET", `/transactions?select=type,quantity,price,fees,date&user_id=eq.${encodeURIComponent(sub)}&asset_ticker=eq.${q}&date=lte.${upTo}&order=date.asc`);
        if (!r.ok) {
          const errText = await r.text().catch(() => "fetch_error");
          return json({ ok: false, error: `inventory_fetch_failed:${errText}` }, 200);
        }
        const rows = await r.json();
        const lots: Array<{ qty: number; unit: number }> = [];
        for (const t of rows || []) {
          const qty = Number(t.quantity) || 0;
          const unit = Number(t.price) || 0;
          const tFees = Number(t.fees) || 0;
          if (t.type === "BUY") {
            const effUnit = qty > 0 ? unit + (tFees / qty) : unit;
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
        let need = quantity;
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
        realized_pnl = quantity * price - basis - fees;
      }

      const insert: Record<string, unknown> = {
        user_id: sub,
        asset_ticker: assetId,
        type,
        quantity,
        price,
        total,
        date,
        fees,
      };
      if (type === "SELL") {
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

    // ─── User Data (generic key-value store replacing localStorage) ───

    if (action === "get_user_data") {
      const keysInput = body.data_keys;
      const keys = Array.isArray(keysInput)
        ? (keysInput as unknown[]).map((k) => sanitizeString(k, 64)).filter(Boolean)
        : [];
      if (!keys.length) return json({ ok: true, data: {} });

      const inList = keys.map((k) => `'${k.replace(/'/g, "''")}'`).join(",");
      const r = await rest("GET", `/user_data?select=data_key,data_value&user_id=eq.${encodeURIComponent(sub)}&data_key=in.(${inList})`);
      if (!r.ok) {
        const errText = await r.text().catch(() => "fetch_error");
        return json({ ok: false, error: `user_data_fetch_failed:${errText}` }, 200);
      }
      const rows = await r.json();
      const data: Record<string, unknown> = {};
      for (const row of (rows || [])) {
        data[String(row.data_key)] = row.data_value;
      }
      return json({ ok: true, data });
    }

    if (action === "set_user_data") {
      const itemsInput = body.items;
      if (!Array.isArray(itemsInput)) return json({ ok: false, error: "invalid_items" }, 200);

      const items: Array<{ data_key: string; data_value: unknown }> = [];
      for (const item of itemsInput) {
        const key = sanitizeString((item as any)?.data_key, 64);
        if (!key) continue;
        const value = (item as any)?.data_value;
        if (value === undefined) continue;
        items.push({ data_key: key, data_value: value });
      }
      if (!items.length) return json({ ok: false, error: "no_valid_items" }, 200);

      // UPSERT cada item
      for (const item of items) {
        const payload = {
          user_id: sub,
          data_key: item.data_key,
          data_value: item.data_value,
        };
        const r = await rest("POST", `/user_data?on_conflict=user_id,data_key`, {
          headers: { Prefer: "resolution=merge-duplicates" },
          body: JSON.stringify(payload),
        });
        if (!r.ok) {
          const errText = await r.text().catch(() => "fetch_error");
          return json({ ok: false, error: `user_data_upsert_failed:${errText}` }, 200);
        }
      }
      return json({ ok: true });
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
