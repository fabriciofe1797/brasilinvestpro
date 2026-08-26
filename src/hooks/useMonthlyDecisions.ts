import { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { calculateAssetScore } from '../lib/utils';
import i18n from '../i18n';

export interface MonthlyDecision {
  id: string;
  type: 'buy' | 'sell' | 'rebalance' | 'dividend' | 'exchange' | 'info';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  asset?: string;
  amount?: number;
  reason: string;
}

export function useMonthlyDecisions() {
  const { portfolio, assets, settings, transactions } = useStore();

  const decisions = useMemo((): MonthlyDecision[] => {
    const recs: MonthlyDecision[] = [];
    const exchangeRate = settings.exchangeRate;
    const monthlyBudget = settings.monthlyContribution || 1000;

    // 1. Check if monthly contribution was made
    const thisMonth = new Date();
    const startOfMonth = new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1);
    const hasContributionThisMonth = transactions.some(
      tx => tx.type === 'BUY' && new Date(tx.date) >= startOfMonth
    );

    if (!hasContributionThisMonth) {
      recs.push({
        id: 'monthly-contribution',
        type: 'buy',
        title: i18n.t('decisionHook.contribTitle'),
        description: i18n.t('decisionHook.contribDesc'),
        priority: 'high',
        amount: monthlyBudget,
        reason: i18n.t('decisionHook.contribReason'),
      });
    }

    // 2. Check allocation drift
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
            const pct = value / totalValue;
            currentAllocation[asset.category] = (currentAllocation[asset.category] || 0) + pct;
          }
        });

        settings.allocationTargets.forEach(target => {
          const current = currentAllocation[target.category] || 0;
          const targetPct = target.targetPercentage / 100;
          const drift = current - targetPct;
          
          if (drift > 0.1) {
            recs.push({
              id: `rebalance-sell-${target.category}`,
              type: 'sell',
              title: i18n.t('decisionHook.reduceTitle', { category: target.category }),
              description: i18n.t('decisionHook.reduceDesc', { category: target.category, current: (current * 100).toFixed(0), target: target.targetPercentage }),
              priority: 'medium',
              reason: i18n.t('decisionHook.reduceReason', { drift: (drift * 100).toFixed(0) }),
            });
          } else if (drift < -0.1) {
            const needed = (targetPct - current) * totalValue;
            recs.push({
              id: `rebalance-buy-${target.category}`,
              type: 'buy',
              title: i18n.t('decisionHook.increaseTitle', { category: target.category }),
              description: i18n.t('decisionHook.increaseDesc', { category: target.category, current: (current * 100).toFixed(0), target: target.targetPercentage, value: (needed / exchangeRate).toFixed(0) }),
              priority: 'medium',
              amount: needed,
              reason: i18n.t('decisionHook.increaseReason', { drift: (Math.abs(drift) * 100).toFixed(0) }),
            });
          }
        });
      }
    }

    // 3. Check for high-scoring opportunities
    const portfolioTickers = new Set(portfolio.map(p => p.assetId));
    const opportunities = assets
      .filter(a => !portfolioTickers.has(a.id) && a.category.includes('FII') && a.dividendYield >= 7)
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

    if (opportunities.length > 0 && hasContributionThisMonth) {
      const top = opportunities[0];
      recs.push({
        id: `opportunity-${top.asset.ticker}`,
        type: 'buy',
        title: i18n.t('decisionHook.oppTitle', { ticker: top.asset.ticker }),
        description: i18n.t('decisionHook.oppDesc', { ticker: top.asset.ticker, dy: top.asset.dividendYield.toFixed(1), label: top.score.label }),
        priority: 'medium',
        asset: top.asset.ticker,
        reason: i18n.t('decisionHook.oppReason', { score: top.score.total }),
      });
    }

    // 4. Check exchange rate opportunity
    if (settings.exchangeRateChangePct !== undefined) {
      if (settings.exchangeRateChangePct < -3) {
        recs.push({
          id: 'exchange-favorable',
          type: 'exchange',
          title: i18n.t('decisionHook.fxTitle'),
          description: i18n.t('decisionHook.fxDesc'),
          priority: 'low',
          reason: i18n.t('decisionHook.fxReason'),
        });
      }
    }

    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    recs.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return recs.slice(0, 5);
  }, [portfolio, assets, settings, transactions, i18n.language]);

  return { decisions };
}