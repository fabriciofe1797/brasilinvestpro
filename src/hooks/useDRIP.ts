/**
 * useDRIP — Hook de Projeção Composta de Dividendos
 * 
 * Integra o motor DRIP com dados reais do portfólio do usuário.
 */

import { useMemo, useState } from 'react';
import { useStore } from '../store/useStore';
import { calculateDRIP, monthsToIncomeGoal, suggestNextContribution } from '../services/drip';
import type { DRIPConfig, DRIPResult } from '../types';

export function useDRIP() {
  const { portfolio, assets, settings } = useStore();

  const [config, setConfig] = useState<Partial<DRIPConfig>>({
    monthlyContribution: settings.monthlyContribution || 1000,
    annualDividendYield: 8,
    annualGrowthRate: 5,
    reinvestDividends: true,
    months: 120,
    exchangeRate: settings.exchangeRate || 6.2,
    currency: settings.baseCurrency || 'BRL',
  });

  // Calculate real portfolio metrics
  const portfolioMetrics = useMemo(() => {
    let totalValue = 0;
    let totalAnnualDividends = 0;
    let weightedDY = 0;

    portfolio.forEach(item => {
      const asset = assets.find(a => a.id === item.assetId);
      if (!asset) return;
      const value = asset.price * item.quantity;
      const annualDiv = value * (asset.dividendYield / 100);
      totalValue += value;
      totalAnnualDividends += annualDiv;
    });

    weightedDY = totalValue > 0 ? (totalAnnualDividends / totalValue) * 100 : 0;
    const monthlyIncome = totalAnnualDividends / 12;

    return { totalValue, totalAnnualDividends, weightedDY, monthlyIncome };
  }, [portfolio, assets]);

  // Run DRIP projection
  const result: DRIPResult = useMemo(() => {
    return calculateDRIP({
      initialCapital: config.initialCapital ?? portfolioMetrics.totalValue,
      monthlyContribution: config.monthlyContribution ?? settings.monthlyContribution ?? 1000,
      annualDividendYield: config.annualDividendYield ?? portfolioMetrics.weightedDY ?? 8,
      annualGrowthRate: config.annualGrowthRate ?? 5,
      reinvestDividends: config.reinvestDividends ?? true,
      months: config.months ?? 120,
      exchangeRate: config.exchangeRate ?? settings.exchangeRate ?? 6.2,
      currency: config.currency ?? settings.baseCurrency ?? 'BRL',
    });
  }, [config, portfolioMetrics, settings]);

  // Months to reach income goal
  const targetIncome = settings.targetDividend || 500;
  const monthsToGoal = useMemo(() => {
    return monthsToIncomeGoal(
      portfolioMetrics.totalValue,
      config.monthlyContribution ?? settings.monthlyContribution ?? 1000,
      config.annualDividendYield ?? portfolioMetrics.weightedDY ?? 8,
      targetIncome,
      config.reinvestDividends ?? true,
    );
  }, [portfolioMetrics, config, settings, targetIncome]);

  // Next contribution suggestion
  const suggestion = useMemo(() => {
    return suggestNextContribution(
      portfolioMetrics.totalValue,
      portfolioMetrics.monthlyIncome,
      targetIncome,
      config.annualDividendYield ?? portfolioMetrics.weightedDY ?? 8,
      config.monthlyContribution ?? settings.monthlyContribution ?? 1000,
    );
  }, [portfolioMetrics, targetIncome, config, settings]);

  return {
    config,
    setConfig,
    result,
    portfolioMetrics,
    monthsToGoal,
    suggestion,
    targetIncome,
  };
}
