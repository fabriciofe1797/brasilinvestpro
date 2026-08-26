/**
 * Decision Engine Service — Motor de Decisão Prescritiva
 * 
 * Analisa portfólio, metas, mercado e fiscal para gerar
 * até 5 ações concretas e priorizadas para o mês.
 */

import type { Asset, PortfolioItem, Transaction, UserSettings } from '../types';
import { calculateAssetScore } from '../lib/utils';
import { formatCurrency } from '../lib/utils';
import i18n from '../i18n';

export interface PrescriptiveAction {
  id: string;
  type: 'buy' | 'sell' | 'hold' | 'rebalance' | 'tax' | 'exchange' | 'milestone';
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  ticker?: string;
  amount?: number;
  currency?: 'BRL' | 'EUR';
  reason: string;
  impact: string;           // What happens if user follows this
  deadline?: string;        // "Até dia 15" or "Este mês"
  category: 'aporte' | 'fiscal' | 'rebalanceamento' | 'oportunidade' | 'meta' | 'câmbio';
}

export interface DecisionResult {
  actions: PrescriptiveAction[];
  summary: {
    totalActions: number;
    criticalCount: number;
    highCount: number;
    totalInvestmentNeeded: number;
    topPriority: string;
  };
  monthLabel: string;
  generatedAt: string;
}

/**
 * Gera decisões prescritivas baseadas no estado completo do portfólio
 */
export function generatePrescriptiveActions(
  portfolio: PortfolioItem[],
  assets: Asset[],
  transactions: Transaction[],
  settings: UserSettings,
): DecisionResult {
  const actions: PrescriptiveAction[] = [];
  const now = new Date();
  const monthLabel = now.toLocaleDateString(i18n.language, { month: 'long', year: 'numeric' });
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthlyBudget = settings.monthlyContribution || 1000;

  // 1. Check if monthly contribution was made
  const hasContributionThisMonth = transactions.some(
    tx => tx.type === 'BUY' && new Date(tx.date) >= startOfMonth
  );

  if (!hasContributionThisMonth) {
    const daysLeft = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate();
    actions.push({
      id: 'monthly-contribution',
      type: 'buy',
      priority: 'critical',
      title: i18n.t('decisionEngine.contribTitle', { value: formatCompact(monthlyBudget) }),
      description: i18n.t('decisionEngine.contribDesc'),
      amount: monthlyBudget,
      currency: 'BRL',
      reason: i18n.t('decisionEngine.contribReason'),
      impact: i18n.t('decisionEngine.contribImpact'),
      deadline: i18n.t('decisionEngine.contribDeadline', { days: daysLeft }),
      category: 'aporte',
    });
  }

  // 2. Allocation drift — detect imbalances and suggest specific actions
  if (settings.allocationTargets.length > 0 && portfolio.length > 0) {
    const totalValue = portfolio.reduce((acc, item) => {
      const asset = assets.find(a => a.id === item.assetId);
      return acc + (asset ? asset.price * item.quantity : 0);
    }, 0);

    if (totalValue > 0) {
      const currentAllocation: Record<string, number> = {};
      portfolio.forEach(item => {
        const asset = assets.find(a => a.id === item.assetId);
        if (asset) {
          const value = asset.price * item.quantity;
          currentAllocation[asset.category] = (currentAllocation[asset.category] || 0) + value / totalValue;
        }
      });

      settings.allocationTargets.forEach(target => {
        const current = currentAllocation[target.category] || 0;
        const targetPct = target.targetPercentage / 100;
        const drift = current - targetPct;

        if (drift > 0.15) {
          const excessValue = drift * totalValue;
          actions.push({
            id: `reduce-${target.category}`,
            type: 'sell',
            priority: 'high',
            title: i18n.t('decisionEngine.reduceTitle', { category: target.category, current: (current * 100).toFixed(0), target: (targetPct * 100).toFixed(0) }),
            description: i18n.t('decisionEngine.reduceDesc', { category: target.category, drift: (drift * 100).toFixed(0), value: formatCompact(excessValue) }),
            amount: excessValue,
            currency: 'BRL',
            reason: i18n.t('decisionEngine.reduceReason', { drift: (drift * 100).toFixed(0) }),
            impact: i18n.t('decisionEngine.rebalanceImpact'),
            category: 'rebalanceamento',
          });
        } else if (drift < -0.15 && hasContributionThisMonth) {
          const neededValue = Math.abs(drift) * totalValue;
          actions.push({
            id: `increase-${target.category}`,
            type: 'buy',
            priority: 'medium',
            title: i18n.t('decisionEngine.increaseTitle', { category: target.category, current: (current * 100).toFixed(0), target: (targetPct * 100).toFixed(0) }),
            description: i18n.t('decisionEngine.increaseDesc', { category: target.category, value: formatCompact(neededValue) }),
            amount: neededValue,
            currency: 'BRL',
            reason: i18n.t('decisionEngine.increaseReason', { drift: (Math.abs(drift) * 100).toFixed(0) }),
            impact: i18n.t('decisionEngine.increaseImpact'),
            category: 'rebalanceamento',
          });
        }
      });
    }
  }

  // 3. High-scoring opportunities not in portfolio
  if (hasContributionThisMonth) {
    const portfolioTickers = new Set(portfolio.map(p => p.assetId));
    const opportunities = assets
      .filter(a => !portfolioTickers.has(a.id) && a.dividendYield >= 6)
      .map(a => ({
        asset: a,
        score: calculateAssetScore({
          dividendYield: a.dividendYield,
          price: a.price,
          lastClose: a.lastClose,
          pvp: a.pvp,
          pl: a.pl,
          category: a.category,
        }),
      }))
      .filter(o => o.score.total >= 60)
      .sort((a, b) => b.score.total - a.score.total)
      .slice(0, 2);

    opportunities.forEach((opp, idx) => {
      const affordableQty = Math.floor(monthlyBudget / opp.asset.price);
      if (affordableQty > 0) {
        actions.push({
          id: `opportunity-${opp.asset.ticker}`,
          type: 'buy',
          priority: idx === 0 ? 'high' : 'medium',
          title: i18n.t('decisionEngine.oppTitle', { ticker: opp.asset.ticker, score: opp.score.total, label: opp.score.label }),
          description: i18n.t('decisionEngine.oppDesc', { dy: opp.asset.dividendYield.toFixed(1), label: opp.score.label, reasons: opp.score.reasons.join('. '), qty: affordableQty, value: formatCompact(affordableQty * opp.asset.price) }),
          ticker: opp.asset.ticker,
          amount: affordableQty * opp.asset.price,
          currency: 'BRL',
          reason: i18n.t('decisionEngine.oppReason', { score: opp.score.total, reasons: opp.score.reasons.slice(0, 2).join(', ') }),
          impact: i18n.t('decisionEngine.oppImpact', { value: formatCompact(affordableQty * opp.asset.price), monthly: formatCompact((affordableQty * opp.asset.price * opp.asset.dividendYield / 100) / 12) }),
          category: 'oportunidade',
        });
      }
    });
  }

  // 4. Exchange rate opportunity
  if (settings.exchangeRateChangePct !== undefined && settings.exchangeRateChangePct < -3) {
    actions.push({
      id: 'exchange-opportunity',
      type: 'exchange',
      priority: 'medium',
      title: i18n.t('decisionEngine.fxTitle', { pct: Math.abs(settings.exchangeRateChangePct).toFixed(1) }),
      description: i18n.t('decisionEngine.fxDesc'),
      reason: i18n.t('decisionEngine.fxReason', { pct: settings.exchangeRateChangePct.toFixed(1) }),
      impact: i18n.t('decisionEngine.fxImpact'),
      category: 'câmbio',
    });
  }

  // 5. Tax awareness — approaching exemption limit
  const thisMonthSales = transactions
    .filter(tx => tx.type === 'SELL' && new Date(tx.date) >= startOfMonth)
    .reduce((acc, tx) => acc + tx.total, 0);

  if (thisMonthSales > 15000 && thisMonthSales < 20000) {
    const remaining = 20000 - thisMonthSales;
    actions.push({
      id: 'tax-exemption-warning',
      type: 'tax',
      priority: 'high',
      title: i18n.t('decisionEngine.taxTitle'),
      description: i18n.t('decisionEngine.taxDesc', { sold: formatCompact(thisMonthSales), remaining: formatCompact(remaining) }),
      amount: remaining,
      currency: 'BRL',
      reason: i18n.t('decisionEngine.taxReason', { sold: formatCompact(thisMonthSales) }),
      impact: i18n.t('decisionEngine.taxImpact'),
      deadline: i18n.t('decisionEngine.taxDeadline'),
      category: 'fiscal',
    });
  }

  // 6. Dividend milestone approaching
  const monthlyIncome = portfolio.reduce((acc, item) => {
    const asset = assets.find(a => a.id === item.assetId);
    if (!asset) return acc;
    return acc + (asset.price * (asset.dividendYield / 100) / 12) * item.quantity;
  }, 0);

  const milestones = [100, 500, 1000, 2000, 5000];
  for (const ms of milestones) {
    if (monthlyIncome < ms && monthlyIncome >= ms * 0.8) {
      const gap = ms - monthlyIncome;
      const neededCapital = gap / (0.08 / 12); // Assuming 8% DY
      actions.push({
        id: `milestone-${ms}`,
        type: 'milestone',
        priority: 'medium',
        title: i18n.t('decisionEngine.milestoneTitle', { value: ms.toLocaleString(i18n.language) }),
        description: i18n.t('decisionEngine.milestoneDesc', { income: formatCurrency(monthlyIncome, 'BRL'), gap: formatCompact(gap), capital: formatCompact(neededCapital) }),
        amount: neededCapital,
        currency: 'BRL',
        reason: i18n.t('decisionEngine.milestoneReason', { income: formatCurrency(monthlyIncome, 'BRL'), value: ms.toLocaleString(i18n.language) }),
        impact: i18n.t('decisionEngine.milestoneImpact', { value: ms.toLocaleString(i18n.language) }),
        category: 'meta',
      });
      break; // Only show the nearest milestone
    }
  }

  // Sort by priority
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  actions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  // Limit to 5 actions
  const topActions = actions.slice(0, 5);

  const criticalCount = topActions.filter(a => a.priority === 'critical').length;
  const highCount = topActions.filter(a => a.priority === 'high').length;
  const totalInvestment = topActions.reduce((acc, a) => acc + (a.amount || 0), 0);

  return {
    actions: topActions,
    summary: {
      totalActions: topActions.length,
      criticalCount,
      highCount,
      totalInvestmentNeeded: totalInvestment,
      topPriority: topActions[0]?.title || i18n.t('decisionEngine.noPending'),
    },
    monthLabel,
    generatedAt: new Date().toISOString(),
  };
}

function formatCompact(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `R$${(value / 1000).toFixed(0)}k`;
  return `R$${value.toFixed(0)}`;
}
