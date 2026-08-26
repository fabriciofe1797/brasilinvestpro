export type AssetCategory = 
  | 'FII Tijolo' 
  | 'FII Papel' 
  | 'FII Agro' 
  | 'FIAGRO'
  | 'FI-Infra'
  | 'FIDC'
  | 'FIP'
  | 'Ações Dividendos' 
  | 'Cripto'
  | 'Renda Fixa'
  | 'Renda Fixa ETF'
  | 'Ações Internacional';

export type AssetSubCategory = 
  | 'Logística' 
  | 'Shopping' 
  | 'Renda Urbana' 
  | 'Papel' 
  | 'Agro' 
  | 'Bancos' 
  | 'Elétricas' 
  | 'Seguradoras' 
  | 'Commodities'
  | 'Híbrido'
  | 'Varejo'
  | 'Logística/Ind'
  | 'Saneamento'
  | 'Petróleo'
  | 'Indústria'
  | 'Papel e Celulose'
  | 'Moeda Digital'
  | 'Smart Contracts'
  | 'Bitcoin'
  | 'Altcoins'
  | 'Stablecoins'
  | 'Stablecoin'
  | 'Tesouro Selic'
  | 'Tesouro IPCA'
  | 'ETF Internacional'
  | 'Geral';

export type FundType = 'FIAGRO' | 'FI-Infra' | 'FIDC' | 'FIP' | 'FIF' | 'FII';

export interface FundIndicator {
  symbol: string;
  cnpj?: string;
  name: string;
  fundType: FundType;
  price: number;           // Preço de mercado
  navPerShare: number;     // Valor patrimonial por cota (VP/cota)
  patrimony: number;       // Patrimônio líquido (R$)
  totalAssets: number;     // Total de ativos (R$)
  shareholders: number;    // Número de cotistas
  changePercent: number;   // Variação %
  currency: 'BRL';
}

export interface FundDividend {
  symbol: string;
  cnpj?: string;
  name: string;
  dividendType: string;    // 'Rendimento' | 'Amortização' | etc.
  valuePerShare: number;
  exDate: string;          // Data-com
  paymentDate: string;     // Data de pagamento
  recordDate?: string;     // Data de registro
}

export interface FundNavPoint {
  date: string;
  nav: number;             // Valor da cota
  return?: number;         // Rentabilidade (%)
}

export interface FundPortfolioHolding {
  issuer?: string;
  assetType?: string;
  quantity?: number;
  unitValue?: number;
  totalValue?: number;
  percentage?: number;
  description?: string;
}

export interface Asset {
  id: string;
  ticker: string;
  name: string;
  category: AssetCategory;
  subCategory: AssetSubCategory;
  price: number;
  lastClose: number;
  dividendYield: number; // Annualized %
  lastDividend: number;
  pvp?: number; // For FIIs
  pl?: number; // For Stocks
  magicNumber: number; // Number of shares to buy 1 share with dividends
  currency: 'BRL' | 'EUR';
  logo?: string;
  quoteSource?: QuoteSource;
  quoteUpdatedAt?: string | null;
  patrimonioLiquido?: number; // Em milhoes (opcional, para FIIs)
  liquidezDiaria?: number; // Em milhoes (opcional, para FIIs)
  variacao12m?: number; // % variacao 12 meses (opcional)
  fundType?: FundType; // Tipo do fundo estruturado (FIAGRO, FIDC, FIP, FI-Infra)
  cnpj?: string; // CNPJ do fundo
  navPerShare?: number; // VP/cota para fundos
  shareholders?: number; // Número de cotistas
}

export type MissionStatus = 'pending' | 'completed';

export interface PlanMission {
  id: string;
  title: string;
  description: string;
  status: MissionStatus;
  dueDate?: string;
  category?: 'aporte' | 'rebalanceamento' | 'educacao';
}

export type PortfolioAlertType = 'allocation_drift' | 'contribution_gap' | 'price_event' | 'exchange_alert' | 'dividend_drop';

export interface PortfolioAlert {
  id: string;
  type: PortfolioAlertType;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
}

export interface Transaction {
  id: string;
  assetId: string;
  type: 'BUY' | 'SELL' | 'DIVIDEND';
  quantity: number;
  price: number;
  date: string; // ISO String
  fees: number; // Taxas (Corretagem/B3)
  total: number;
  realizedPnl?: number | null;
  costBasis?: number | null;
}

export interface PortfolioItem {
  assetId: string;
  quantity: number;
  averagePrice: number;
}

export interface AllocationTarget {
  category: AssetCategory;
  targetPercentage: number;
}

export interface UserSettings {
  baseCurrency: 'EUR' | 'BRL';
  exchangeRate: number; // EUR to BRL
  exchangeRateSource?: string;
  exchangeRateUpdatedAt?: string;
  exchangeRateChangePct?: number;
  monthlyContribution: number;
  targetDividend: number;
  allocationTargets: AllocationTarget[];
  plan?: 'free' | 'starter' | 'pro' | 'master' | 'elite';
  custodyRate?: number;
  selicCustodyThreshold?: number;
}

// ─── Ceiling Price (Preço Teto) ──────────────────────────────────────────────
export interface CeilingPriceData {
  ticker: string;
  classicCeiling: number | null;   // Bazin: DJA / 0.06
  projectiveCeiling: number | null; // Based on analyst projections
  consensusCeiling: number | null;  // Market consensus
  grahamPrice: number | null;       // Graham: Sqrt(22.5 * LPA * VPA)
  currentPrice: number;
  upsideClassic: number;            // % below/above classic ceiling
  upsideProjective: number;
  upsideConsensus: number;
  upsideGraham: number;
  verdict: 'buy' | 'hold' | 'sell' | 'neutral';
  verdictLabel: string;
}

export interface RankingEntry {
  ticker: string;
  name: string;
  category: AssetCategory;
  price: number;
  dividendYield: number;
  ceilingClassic: number | null;
  upsideClassic: number;
  yieldOnCost: number | null;
  pvp: number | undefined;
  pl: number | undefined;
  score: number;
  currency: 'BRL' | 'EUR';
}

export interface DividendHistoryEntry {
  ticker: string;
  year: number;
  month: number;
  valuePerShare: number;
  type: 'dividendo' | 'jcp' | 'rendimento';
  isRecurring: boolean;
  paymentDate: string;
}

export interface PortfolioYieldOnCost {
  totalInvested: number;
  annualDividends: number;
  yieldOnCost: number;           // % weighted average
  monthlyIncome: number;
  perAsset: {
    assetId: string;
    ticker: string;
    name: string;
    averagePrice: number;
    quantity: number;
    annualDivPerShare: number;
    annualIncome: number;
    yieldOnCost: number;
    invested: number;
  }[];
}

// ─── Data Pipeline (Fase 5 — Confiança de Dados) ─────────────────────────────
export type QuoteSource = 'brapi' | 'brapi-funds' | 'coingecko' | 'awesomeapi' | 'awesomeapi-direct' | 'exchangerate' | 'bcb' | 'manual' | 'derived' | 'mock';
export type FreshnessStatus = 'live' | 'delayed' | 'stale' | 'unavailable';

export interface MarketQuote {
  ticker: string;
  price: number | null;
  previousClose: number | null;
  changePercent: number | null;
  currency: 'BRL' | 'USD' | 'EUR';
  source: QuoteSource;
  lastUpdatedAt: string | null;   // ISO string
  status: FreshnessStatus;
  confidenceLevel: 'high' | 'medium' | 'low';
}

export interface ExchangeQuote {
  pair: string;                    // 'EUR-BRL', 'USD-BRL'
  rate: number;
  source: QuoteSource;
  lastUpdatedAt: string | null;
  status: FreshnessStatus;
  changePercent24h: number | null;
}

// ─── Projeção Composta de Dividendos (DRIP) ──────────────────────────────────
export interface DRIPProjection {
  month: number;
  year: number;
  label: string;                   // "Jan/2027"
  portfolioValue: number;
  monthlyIncome: number;
  monthlyContribution: number;
  dividendsReinvested: number;
  totalCotas: number;
  milestones: string[];            // ["R$1.000/mês atingido"]
}

export interface DRIPResult {
  projections: DRIPProjection[];
  totalMonths: number;
  finalPortfolioValue: number;
  finalMonthlyIncome: number;
  milestones: { month: number; label: string; description: string }[];
  monthlyBreakdown: { month: number; income: number; reinvested: number; contribution: number }[];
}

export interface DRIPConfig {
  initialCapital: number;
  monthlyContribution: number;
  annualDividendYield: number;     // % (e.g., 8 = 8%)
  annualGrowthRate: number;        // % price appreciation
  reinvestDividends: boolean;
  months: number;                  // projection horizon
  exchangeRate: number;            // for BRL→EUR conversion
  currency: 'BRL' | 'EUR';
}

// ─── Life Map (Mapa de Vida em Dividendos) ────────────────────────────────────
export interface LifeExpense {
  id: string;
  name: string;
  category: 'moradia' | 'transporte' | 'alimentacao' | 'educacao' | 'lazer' | 'saude' | 'outros';
  monthlyAmount: number;
  currency: 'BRL' | 'EUR';
  priority: 'essential' | 'important' | 'optional';
}

export interface LifeCoverageItem {
  expense: LifeExpense;
  expenseBRL: number;
  coveredBy: { ticker: string; monthlyIncome: number }[];
  totalCoveredBRL: number;
  coveragePct: number;
  monthsToFullCoverage: number | null;
  suggestion: string;
}

export interface LifeMapSummary {
  totalExpensesBRL: number;
  totalExpensesEUR: number;
  totalDividendIncomeBRL: number;
  overallCoveragePct: number;
  fullyCoveredExpenses: number;
  partiallyCoveredExpenses: number;
  uncoveredExpenses: number;
  monthsToFullIndependence: number | null;
  nextMilestone: string | null;
}
