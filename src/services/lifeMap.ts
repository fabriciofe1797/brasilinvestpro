/**
 * Life Map Service — Mapa de Vida em Dividendos
 * 
 * Conecta despesas reais do usuário à renda de dividendos do portfólio.
 * Traduz patrimônio em cobertura de vida concreta.
 */

import type { LifeExpense, LifeCoverageItem, LifeMapSummary, PortfolioItem, Asset } from '../types';

const EXPENSE_CATEGORY_ICONS: Record<LifeExpense['category'], string> = {
  moradia: '🏠',
  transporte: '🚗',
  alimentacao: '🛒',
  educacao: '📚',
  lazer: '🎮',
  saude: '💊',
  outros: '📦',
};

const EXPENSE_CATEGORY_LABELS: Record<LifeExpense['category'], string> = {
  moradia: 'Moradia',
  transporte: 'Transporte',
  alimentacao: 'Alimentação',
  educacao: 'Educação',
  lazer: 'Lazer',
  saude: 'Saúde',
  outros: 'Outros',
};

export function getExpenseIcon(category: LifeExpense['category']): string {
  return EXPENSE_CATEGORY_ICONS[category] || '📦';
}

export function getExpenseLabel(category: LifeExpense['category']): string {
  return EXPENSE_CATEGORY_LABELS[category] || 'Outros';
}

/**
 * Calcula cobertura de uma despesa específica pelos dividendos do portfólio
 */
function calculateExpenseCoverage(
  expense: LifeExpense,
  expenseBRL: number,
  portfolio: PortfolioItem[],
  assets: Asset[],
  monthlyIncomeBRL: number,
  monthlyContribution: number,
): LifeCoverageItem {
  const coveredBy: { ticker: string; monthlyIncome: number }[] = [];
  let remainingExpense = expenseBRL;

  // Allocate dividend income proportionally to cover expenses
  portfolio.forEach(item => {
    if (remainingExpense <= 0) return;
    const asset = assets.find(a => a.id === item.assetId);
    if (!asset || asset.dividendYield <= 0) return;

    const monthlyDiv = (asset.price * (asset.dividendYield / 100) / 12) * item.quantity;
    const allocation = Math.min(monthlyDiv, remainingExpense);
    
    if (allocation > 0) {
      coveredBy.push({ ticker: asset.ticker, monthlyIncome: allocation });
      remainingExpense -= allocation;
    }
  });

  const totalCoveredBRL = expenseBRL - remainingExpense;
  const coveragePct = expenseBRL > 0 ? (totalCoveredBRL / expenseBRL) * 100 : 0;

  // Calculate months to full coverage considering contributions
  let monthsToFullCoverage: number | null = null;
  if (coveragePct < 100 && monthlyContribution > 0) {
    const gap = expenseBRL - totalCoveredBRL;
    // Each contribution increases income proportionally based on weighted DY
    const weightedDY = monthlyIncomeBRL > 0 && portfolio.length > 0
      ? (monthlyIncomeBRL * 12) / portfolio.reduce((acc, item) => {
          const asset = assets.find(a => a.id === item.assetId);
          return acc + (asset ? asset.price * item.quantity : 0);
        }, 0) * 100
      : 8; // Default 8% if can't calculate
    
    const monthlyIncomeFromContribution = monthlyContribution * (weightedDY / 100) / 12;
    if (monthlyIncomeFromContribution > 0) {
      monthsToFullCoverage = Math.ceil(gap / monthlyIncomeFromContribution);
    }
  }

  // Generate suggestion
  let suggestion: string;
  if (coveragePct >= 100) {
    suggestion = `${expense.name} já está totalmente coberta por dividendos!`;
  } else if (coveragePct >= 75) {
    suggestion = `Quase lá! Faltam ${formatCompact(expenseBRL - totalCoveredBRL)} para cobrir ${expense.name}.`;
  } else if (coveragePct >= 50) {
    suggestion = `Metade de ${expense.name} já coberta. Continue aportando para atingir a cobertura total.`;
  } else if (coveragePct >= 25) {
    suggestion = `${expense.name} parcialmente coberta. Priorize ativos de alta renda para acelerar.`;
  } else {
    const capitalNeeded = expenseBRL / (0.08 / 12); // Assuming 8% DY
    suggestion = `Para cobrir ${expense.name} com dividendos, necessitaria ~${formatCompact(capitalNeeded)} investidos.`;
  }

  return {
    expense,
    expenseBRL,
    coveredBy,
    totalCoveredBRL,
    coveragePct: Math.min(100, Math.round(coveragePct)),
    monthsToFullCoverage,
    suggestion,
  };
}

/**
 * Calcula o mapa de vida completo
 */
export function calculateLifeMap(
  expenses: LifeExpense[],
  portfolio: PortfolioItem[],
  assets: Asset[],
  exchangeRate: number,
  monthlyContribution: number,
): { items: LifeCoverageItem[]; summary: LifeMapSummary } {
  // Calculate total monthly dividend income
  const monthlyIncomeBRL = portfolio.reduce((acc, item) => {
    const asset = assets.find(a => a.id === item.assetId);
    if (!asset) return acc;
    const annualDiv = asset.price * (asset.dividendYield / 100);
    return acc + (annualDiv / 12) * item.quantity;
  }, 0);

  // Calculate coverage for each expense
  const items = expenses.map(expense => {
    const expenseBRL = expense.currency === 'EUR' 
      ? expense.monthlyAmount * exchangeRate 
      : expense.monthlyAmount;
    
    return calculateExpenseCoverage(expense, expenseBRL, portfolio, assets, monthlyIncomeBRL, monthlyContribution);
  });

  // Sort by priority (essential first, then by coverage ascending)
  const priorityOrder = { essential: 0, important: 1, optional: 2 };
  items.sort((a, b) => {
    const pDiff = priorityOrder[a.expense.priority] - priorityOrder[b.expense.priority];
    if (pDiff !== 0) return pDiff;
    return a.coveragePct - b.coveragePct;
  });

  // Calculate summary
  const totalExpensesBRL = items.reduce((acc, item) => acc + item.expenseBRL, 0);
  const totalExpensesEUR = exchangeRate > 0 ? totalExpensesBRL / exchangeRate : 0;
  const overallCoveragePct = totalExpensesBRL > 0 ? (monthlyIncomeBRL / totalExpensesBRL) * 100 : 0;

  const fullyCovered = items.filter(i => i.coveragePct >= 100).length;
  const partiallyCovered = items.filter(i => i.coveragePct > 0 && i.coveragePct < 100).length;
  const uncovered = items.filter(i => i.coveragePct === 0).length;

  // Months to full independence
  let monthsToFullIndependence: number | null = null;
  if (overallCoveragePct < 100 && monthlyContribution > 0) {
    const gap = totalExpensesBRL - monthlyIncomeBRL;
    const weightedDY = monthlyIncomeBRL > 0
      ? (monthlyIncomeBRL * 12) / Math.max(
          portfolio.reduce((acc, item) => {
            const asset = assets.find(a => a.id === item.assetId);
            return acc + (asset ? asset.price * item.quantity : 0);
          }, 0), 1
        ) * 100
      : 8;
    
    const monthlyIncomeFromContribution = monthlyContribution * (weightedDY / 100) / 12;
    if (monthlyIncomeFromContribution > 0) {
      monthsToFullIndependence = Math.ceil(gap / monthlyIncomeFromContribution);
    }
  }

  // Next milestone
  let nextMilestone: string | null = null;
  const sortedByCoverage = [...items].sort((a, b) => a.coveragePct - b.coveragePct);
  if (sortedByCoverage.length > 0) {
    const next = sortedByCoverage[0];
    if (next.coveragePct < 100) {
      nextMilestone = `Cubra ${next.expense.name} (atualmente ${next.coveragePct}%)`;
    }
  }

  return {
    items,
    summary: {
      totalExpensesBRL,
      totalExpensesEUR,
      totalDividendIncomeBRL: monthlyIncomeBRL,
      overallCoveragePct: Math.min(100, Math.round(overallCoveragePct)),
      fullyCoveredExpenses: fullyCovered,
      partiallyCoveredExpenses: partiallyCovered,
      uncoveredExpenses: uncovered,
      monthsToFullIndependence,
      nextMilestone,
    },
  };
}

/**
 * Traduz valor em poder de compra concreto
 */
export function getPurchasingPower(valueBRL: number): { item: string; quantity: number; emoji: string }[] {
  const prices = [
    { item: 'cafés em Lisboa', price: 2.5, emoji: '☕' },
    { item: 'almoços', price: 15, emoji: '🍽️' },
    { item: 'passes mensais', price: 40, emoji: '🚌' },
    { item: 'noites de cinema', price: 12, emoji: '🎬' },
    { item: 'mensalidades de ginásio', price: 30, emoji: '💪' },
    { item: 'livros', price: 20, emoji: '📖' },
  ];

  return prices.map(p => ({
    item: p.item,
    quantity: Math.floor(valueBRL / p.price),
    emoji: p.emoji,
  })).filter(p => p.quantity > 0).sort((a, b) => b.quantity - a.quantity).slice(0, 3);
}

function formatCompact(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
  return value.toFixed(0);
}
