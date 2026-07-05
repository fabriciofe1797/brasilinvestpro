import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { PortfolioItem, Asset } from "../types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, currency: 'BRL' | 'EUR') {
  return new Intl.NumberFormat(currency === 'BRL' ? 'pt-BR' : 'pt-PT', {
    style: 'currency',
    currency: currency,
  }).format(value);
}

export function formatPercent(value: number) {
  return new Intl.NumberFormat('pt-PT', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 100);
}

export function normalizeTicker(raw: string) {
  return String(raw || '').trim().toUpperCase();
}

export function applyTickerAlias(ticker: string) {
  const t = normalizeTicker(ticker);
  const aliases: Record<string, string> = {
    BRAS3: 'BBAS3',
  };
  return aliases[t] || t;
}

export function getMagicNumber(dividendYield: number, fallback: number | undefined) {
  if (fallback && fallback > 0) return fallback;
  if (!dividendYield || dividendYield <= 0) return 0;
  return Math.ceil(1200 / dividendYield);
}

export function getMagicStatus(quantity: number, magicNumber: number) {
  if (!magicNumber || magicNumber <= 0) {
    return {
      progress: 0,
      remaining: 0,
      above: 0,
      reached: false,
    };
  }
  const remainingRaw = magicNumber - quantity;
  const remaining = remainingRaw > 0 ? remainingRaw : 0;
  const above = quantity > magicNumber ? quantity - magicNumber : 0;
  const progress = Math.max(0, Math.min(100, (quantity / magicNumber) * 100));
  const reached = quantity >= magicNumber;
  return { progress, remaining, above, reached };
}

export function getMonthlyDividendIncome(portfolio: PortfolioItem[], assets: Asset[]) {
  return portfolio.reduce((acc, item) => {
    const asset = assets.find(a => a.id === item.assetId || a.ticker === item.assetId);
    if (!asset) return acc;
    const perShare = asset.lastDividend || 0;
    if (perShare <= 0) return acc;
    return acc + perShare * item.quantity;
  }, 0);
}

export interface AssetScoreParams {
  dividendYield: number;
  price: number;
  lastClose: number;
  pvp?: number;
  pl?: number;
  category: string;
  monthlyContribution?: number;
}

export interface AssetScore {
  total: number;
  valuation: number;
  dividendScore: number;
  priceScore: number;
  categoryScore: number;
  label: 'Excelente' | 'Bom' | 'Moderado' | 'Baixo';
  reasons: string[];
}

export function calculateAssetScore(params: AssetScoreParams): AssetScore {
  const { dividendYield, price, lastClose, pvp, pl, category, monthlyContribution = 1000 } = params;
  
  const reasons: string[] = [];
  let valuation = 50;
  let dividendScore = 50;
  let priceScore = 50;
  let categoryScore = 50;

  // Valuation Score (Baseado em múltiplos)
  if (pvp !== undefined) {
    if (pvp <= 0.8) {
      valuation += 25;
      reasons.push('P/VP muito abaixo de 1');
    } else if (pvp <= 1.0) {
      valuation += 15;
      reasons.push('P/VP below 1');
    } else if (pvp <= 1.1) {
      valuation += 5;
    } else if (pvp > 1.3) {
      valuation -= 20;
      reasons.push('P/VP elevado');
    }
  } else if (pl !== undefined) {
    if (pl > 0 && pl <= 10) {
      valuation += 20;
      reasons.push('P/L atrativo');
    } else if (pl > 10 && pl <= 15) {
      valuation += 5;
    } else if (pl > 25) {
      valuation -= 20;
      reasons.push('P/L elevado');
    }
  }

  // Dividend Score
  if (dividendYield >= 8) {
    dividendScore += 30;
    reasons.push('DY acima de 8%');
  } else if (dividendYield >= 6) {
    dividendScore += 20;
    reasons.push('DY acima de 6%');
  } else if (dividendYield >= 4) {
    dividendScore += 10;
    reasons.push('DY respeitável');
  } else if (dividendYield < 2) {
    dividendScore -= 20;
    reasons.push('DY baixo');
  }

  // Price Score (Variação do preço)
  const priceChange = ((price - lastClose) / lastClose) * 100;
  if (priceChange < -10) {
    priceScore += 20;
    reasons.push('Queda recente >10%');
  } else if (priceChange < -5) {
    priceScore += 10;
    reasons.push('Queda >5%');
  } else if (priceChange > 15) {
    priceScore -= 15;
    reasons.push('Alta reciente >15%');
  }

  // Category Score (Bônus por tipo)
  const isFII = category.includes('FII');
  const isCrypto = category === 'Cripto';
  if (isFII) {
    categoryScore += 10;
    reasons.push('FII - estável');
  } else if (isCrypto) {
    categoryScore -= 10;
    reasons.push('Cripto - volátil');
  }

  // Cálculo do total (média ponderada)
  const total = Math.round(
    (valuation * 0.25) +
    (dividendScore * 0.35) +
    (priceScore * 0.25) +
    (categoryScore * 0.15)
  );

  let label: AssetScore['label'];
  if (total >= 75) label = 'Excelente';
  else if (total >= 55) label = 'Bom';
  else if (total >= 35) label = 'Moderado';
  else label = 'Baixo';

  return {
    total: Math.max(0, Math.min(100, total)),
    valuation: Math.max(0, Math.min(100, valuation)),
    dividendScore: Math.max(0, Math.min(100, dividendScore)),
    priceScore: Math.max(0, Math.min(100, priceScore)),
    categoryScore: Math.max(0, Math.min(100, categoryScore)),
    label,
    reasons: reasons.slice(0, 4),
  };
}
