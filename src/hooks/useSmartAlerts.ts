import { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { PortfolioAlert } from '../types';
import { calculateAssetScore } from '../lib/utils';
import i18n from '../i18n';

const ALLOCATION_DRIFT_THRESHOLD = 0.10; // 10% drift triggers alert
const EXCHANGE_MOVE_THRESHOLD = 0.05; // 5% move triggers alert

export function useSmartAlerts() {
  const { portfolio, assets, settings, alerts, addAlert } = useStore();

  const generatedAlerts = useMemo((): Omit<PortfolioAlert, 'id' | 'createdAt' | 'read'>[] => {
    const newAlerts: Omit<PortfolioAlert, 'id' | 'createdAt' | 'read'>[] = [];

    // 1. Check allocation drift
    if (settings.allocationTargets.length > 0 && portfolio.length > 0) {
      const currentAllocation: Record<string, number> = {};
      const totalValue = portfolio.reduce((acc, item) => {
        const asset = assets.find(a => a.id === item.assetId);
        return acc + (asset ? asset.price * item.quantity : 0);
      }, 0);

      if (totalValue > 0) {
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
          const drift = Math.abs(current - target.targetPercentage / 100);
          if (drift > ALLOCATION_DRIFT_THRESHOLD) {
            const direction = current > target.targetPercentage / 100 ? i18n.t('smartAlertsGen.driftAbove') : i18n.t('smartAlertsGen.driftBelow');
            newAlerts.push({
              type: 'allocation_drift',
              title: i18n.t('smartAlertsGen.driftTitle', { category: target.category, direction }),
              message: i18n.t('smartAlertsGen.driftMessage', { category: target.category, pct: (current * 100).toFixed(1), target: target.targetPercentage }),
            });
          }
        });
      }
    }

    // 2. Check for assets with significant price drops
    portfolio.forEach(item => {
      const asset = assets.find(a => a.id === item.assetId);
      if (asset && asset.lastClose > 0) {
        const priceChange = ((asset.price - asset.lastClose) / asset.lastClose) * 100;
        if (priceChange < -15) {
          newAlerts.push({
            type: 'price_event',
            title: i18n.t('smartAlertsGen.dropTitle', { ticker: asset.ticker }),
            message: i18n.t('smartAlertsGen.dropMessage', { ticker: asset.ticker, pct: priceChange.toFixed(1) }),
          });
        }
      }
    });

    // 3. Check exchange rate movement
    if (settings.exchangeRateUpdatedAt && settings.exchangeRateChangePct !== undefined) {
      const changeAbs = Math.abs(settings.exchangeRateChangePct);
      if (changeAbs > EXCHANGE_MOVE_THRESHOLD * 100) {
        newAlerts.push({
          type: 'exchange_alert',
          title: settings.exchangeRateChangePct > 0 ? i18n.t('smartAlertsGen.fxTitleUp') : i18n.t('smartAlertsGen.fxTitleDown'),
          message: i18n.t('smartAlertsGen.fxMessage', {
            pct: (settings.exchangeRateChangePct > 0 ? '+' : '') + settings.exchangeRateChangePct.toFixed(2),
            favorability: settings.exchangeRateChangePct > 0 ? i18n.t('smartAlertsGen.fxUnfavorable') : i18n.t('smartAlertsGen.fxFavorable'),
          }),
        });
      }
    }

    // 4. Check for high-scoring opportunities not in portfolio
    const portfolioTickers = new Set(portfolio.map(p => p.assetId));
    const opportunities = assets
      .filter(a => !portfolioTickers.has(a.id))
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
      .filter(o => o.score.total >= 65)
      .sort((a, b) => b.score.total - a.score.total)
      .slice(0, 3);

    if (opportunities.length > 0) {
      newAlerts.push({
        type: 'price_event',
        title: i18n.t('smartAlertsGen.oppTitle'),
        message: i18n.t('smartAlertsGen.oppMessage', { tickers: opportunities.map(o => o.asset.ticker).join(', '), label: opportunities[0].score.label }),
      });
    }

    return newAlerts.slice(0, 10);
  }, [portfolio, assets, settings, i18n.language]);

  const combinedAlerts = useMemo(() => {
    const existing = alerts.map(a => ({
      ...a,
      source: 'db' as const,
    }));
    const generated = generatedAlerts.map(a => ({
      ...a,
      id: `generated-${a.title}`,
      createdAt: new Date().toISOString(),
      read: false,
      source: 'generated' as const,
    }));
    return [...generated, ...existing].slice(0, 15);
  }, [alerts, generatedAlerts]);

  return {
    alerts: combinedAlerts,
    generateAlert: addAlert,
  };
}