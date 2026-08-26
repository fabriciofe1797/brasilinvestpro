/**
 * Benchmarks Service — Comparação com índices de mercado
 *
 * Fontes públicas e oficiais:
 * - Banco Central (SGS): CDI (4389), SELIC (11), IPCA mensal (433), Poupança (195)
 * - BrAPI: IBOVESPA (^BVSP) e IFIX (cotação + variação)
 *
 * Todas as taxas acumuladas são calculadas por capitalização composta
 * a partir dos dados brutos oficiais — nada é hardcoded.
 */

import type { QuoteSource } from '../types';

export type BenchmarkKey = 'cdi' | 'selic' | 'ipca' | 'poupanca' | 'ibovespa' | 'ifix';

export interface BenchmarkData {
  key: BenchmarkKey;
  name: string;
  description: string;
  unit: 'rate' | 'points';
  currentValue: number | null;       // taxa anualizada (%) ou pontos do índice
  dailyChangePct: number | null;     // variação diária (índices)
  ytdPct: number | null;             // acumulado no ano
  twelveMonthPct: number | null;     // acumulado 12 meses
  source: QuoteSource;
  lastUpdatedAt: string | null;
}

// ─── BCB SGS (Sistema Gerenciador de Séries Temporais) ──────────────────────

const BCB_BASE = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs';

interface BcbPoint {
  data: string;  // 'DD/MM/YYYY'
  valor: string; // valor como string
}

function formatDateBR(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

function parseDateBR(br: string): Date {
  const [dd, mm, yyyy] = br.split('/');
  return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
}

/** Busca série do BCB entre duas datas (pública, sem chave) */
export async function fetchBcbSeries(code: number, from: Date, to: Date): Promise<BcbPoint[]> {
  const url = `${BCB_BASE}.${code}/dados?dataInicial=${formatDateBR(from)}&dataFinal=${formatDateBR(to)}&formato=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`bcb_series_${code}_failed`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/** Capitaliza valores diários anualizados (base 252) → % acumulado no período */
function compoundDailyAnnualized(points: BcbPoint[], since: Date): number | null {
  let factor = 1;
  let count = 0;
  for (const p of points) {
    const d = parseDateBR(p.data);
    if (d < since) continue;
    const v = parseFloat(p.valor);
    if (!Number.isFinite(v)) continue;
    factor *= Math.pow(1 + v / 100, 1 / 252);
    count++;
  }
  if (count === 0) return null;
  return (factor - 1) * 100;
}

/** Capitaliza variações mensais (%) → % acumulado no período */
function compoundMonthly(points: BcbPoint[], since: Date): number | null {
  let factor = 1;
  let count = 0;
  for (const p of points) {
    const d = parseDateBR(p.data);
    if (d < since) continue;
    const v = parseFloat(p.valor);
    if (!Number.isFinite(v)) continue;
    factor *= 1 + v / 100;
    count++;
  }
  if (count === 0) return null;
  return (factor - 1) * 100;
}

// ─── Índices via BrAPI ───────────────────────────────────────────────────────

interface IndexQuote {
  value: number | null;
  dailyChangePct: number | null;
  updatedAt: string | null;
}

async function fetchIndexQuotes(): Promise<Record<string, IndexQuote>> {
  const out: Record<string, IndexQuote> = {};
  try {
    const res = await fetch('https://brapi.dev/api/quote/%5EBVSP,IFIX');
    if (!res.ok) return out;
    const data = await res.json();
    const results = Array.isArray(data?.results) ? data.results : [];
    for (const r of results) {
      const symbol = String(r?.symbol || '').toUpperCase();
      if (!symbol) continue;
      out[symbol] = {
        value: typeof r?.regularMarketPrice === 'number' ? r.regularMarketPrice : null,
        dailyChangePct: typeof r?.regularMarketChange === 'number' ? r.regularMarketChange : null,
        updatedAt: r?.regularMarketTime
          ? new Date(r.regularMarketTime * 1000).toISOString()
          : new Date().toISOString(),
      };
    }
  } catch {
    // índices indisponíveis — página exibe estado degradado
  }
  return out;
}

// ─── Agregação principal ─────────────────────────────────────────────────────

/**
 * Busca todos os benchmarks em paralelo (Promise.allSettled para não
 * interromper em caso de falha de uma fonte — mesma prática do dataPipeline).
 */
export async function fetchBenchmarks(): Promise<BenchmarkData[]> {
  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const twelveMonthsAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  // margem extra para garantir cobertura das séries
  const windowStart = new Date(now.getFullYear() - 1, now.getMonth() - 1, 1);

  const [cdiRes, selicRes, ipcaRes, poupancaRes, indicesRes] = await Promise.allSettled([
    fetchBcbSeries(4389, windowStart, now),   // CDI anualizado (diário)
    fetchBcbSeries(11, windowStart, now),     // SELIC diária
    fetchBcbSeries(433, windowStart, now),    // IPCA variação mensal
    fetchBcbSeries(195, windowStart, now),    // Poupança remuneração mensal
    fetchIndexQuotes(),
  ]);

  const cdi = cdiRes.status === 'fulfilled' ? cdiRes.value : [];
  const selic = selicRes.status === 'fulfilled' ? selicRes.value : [];
  const ipca = ipcaRes.status === 'fulfilled' ? ipcaRes.value : [];
  const poupanca = poupancaRes.status === 'fulfilled' ? poupancaRes.value : [];
  const indices = indicesRes.status === 'fulfilled' ? indicesRes.value : {};

  const lastOf = (points: BcbPoint[]): string | null =>
    points.length > 0 ? parseDateBR(points[points.length - 1].data).toISOString() : null;

  const lastDailyRate = (points: BcbPoint[]): number | null => {
    if (points.length === 0) return null;
    const v = parseFloat(points[points.length - 1].valor);
    return Number.isFinite(v) ? v : null;
  };

  const monthlyLast = (points: BcbPoint[]): number | null => lastDailyRate(points);

  const ibov = indices['^BVSP'];
  const ifix = indices['IFIX'];

  return [
    {
      key: 'cdi',
      name: 'CDI',
      description: 'Certificado de Depósito Interbancário — benchmark da renda fixa',
      unit: 'rate',
      currentValue: lastDailyRate(cdi),
      dailyChangePct: null,
      ytdPct: compoundDailyAnnualized(cdi, yearStart),
      twelveMonthPct: compoundDailyAnnualized(cdi, twelveMonthsAgo),
      source: 'bcb',
      lastUpdatedAt: lastOf(cdi),
    },
    {
      key: 'selic',
      name: 'SELIC',
      description: 'Taxa básica de juros da economia',
      unit: 'rate',
      currentValue: lastDailyRate(selic),
      dailyChangePct: null,
      ytdPct: compoundDailyAnnualized(selic, yearStart),
      twelveMonthPct: compoundDailyAnnualized(selic, twelveMonthsAgo),
      source: 'bcb',
      lastUpdatedAt: lastOf(selic),
    },
    {
      key: 'ipca',
      name: 'IPCA',
      description: 'Inflação oficial — corrói o poder de compra da carteira',
      unit: 'rate',
      currentValue: monthlyLast(ipca),
      dailyChangePct: null,
      ytdPct: compoundMonthly(ipca, yearStart),
      twelveMonthPct: compoundMonthly(ipca, twelveMonthsAgo),
      source: 'bcb',
      lastUpdatedAt: lastOf(ipca),
    },
    {
      key: 'poupanca',
      name: 'Poupança',
      description: 'Referência popular — o mínimo que seu dinheiro deveria render',
      unit: 'rate',
      currentValue: monthlyLast(poupanca),
      dailyChangePct: null,
      ytdPct: compoundMonthly(poupanca, yearStart),
      twelveMonthPct: compoundMonthly(poupanca, twelveMonthsAgo),
      source: 'bcb',
      lastUpdatedAt: lastOf(poupanca),
    },
    {
      key: 'ibovespa',
      name: 'IBOVESPA',
      description: 'Principal índice de ações da B3',
      unit: 'points',
      currentValue: ibov?.value ?? null,
      dailyChangePct: ibov?.dailyChangePct ?? null,
      ytdPct: null,
      twelveMonthPct: null,
      source: 'brapi',
      lastUpdatedAt: ibov?.updatedAt ?? null,
    },
    {
      key: 'ifix',
      name: 'IFIX',
      description: 'Índice de Fundos Imobiliários da B3',
      unit: 'points',
      currentValue: ifix?.value ?? null,
      dailyChangePct: ifix?.dailyChangePct ?? null,
      ytdPct: null,
      twelveMonthPct: null,
      source: 'brapi',
      lastUpdatedAt: ifix?.updatedAt ?? null,
    },
  ];
}
