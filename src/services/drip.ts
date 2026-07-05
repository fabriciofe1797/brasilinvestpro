/**
 * DRIP Service — Dividend Reinvestment Plan (Projeção Composta)
 * 
 * Motor de projeção de dividendos com juros compostos e reinvestimento.
 * Considera: aporte mensal, dividend yield, appreciation, câmbio.
 */

import type { DRIPConfig, DRIPResult, DRIPProjection } from '../types';

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

// Income milestones to track
const INCOME_MILESTONES = [500, 1000, 2000, 3000, 5000, 7500, 10000, 15000, 20000, 30000, 50000];

/**
 * Calcula projeção composta de dividendos com reinvestimento (DRIP)
 */
export function calculateDRIP(config: DRIPConfig): DRIPResult {
  const {
    initialCapital,
    monthlyContribution,
    annualDividendYield,
    annualGrowthRate,
    reinvestDividends,
    months,
  } = config;

  const monthlyDY = annualDividendYield / 100 / 12;
  const monthlyGrowth = Math.pow(1 + annualGrowthRate / 100, 1/12) - 1;

  let portfolioValue = initialCapital;
  let totalCotas = initialCapital > 0 ? 1000 : 0; // Normalized to 1000 units
  const projections: DRIPProjection[] = [];
  const milestones: { month: number; label: string; description: string }[] = [];
  const monthlyBreakdown: { month: number; income: number; reinvested: number; contribution: number }[] = [];
  const reachedMilestones = new Set<number>();

  const startDate = new Date();
  startDate.setDate(1);

  for (let m = 1; m <= months; m++) {
    const currentDate = new Date(startDate);
    currentDate.setMonth(currentDate.getMonth() + m);
    const monthIdx = currentDate.getMonth();
    const year = currentDate.getFullYear();
    const label = `${MONTH_NAMES[monthIdx]}/${year}`;

    // 1. Price appreciation
    const priceGrowth = portfolioValue * monthlyGrowth;
    portfolioValue += priceGrowth;

    // 2. Monthly contribution
    portfolioValue += monthlyContribution;

    // 3. Dividend income
    const monthlyIncome = portfolioValue * monthlyDY;

    // 4. Reinvest dividends (compound effect)
    let dividendsReinvested = 0;
    if (reinvestDividends && monthlyIncome > 0) {
      dividendsReinvested = monthlyIncome;
      portfolioValue += dividendsReinvested;
    }

    // Track cotas (normalized units)
    if (reinvestDividends && monthlyIncome > 0) {
      const pricePerCota = portfolioValue / totalCotas;
      const newCotas = monthlyIncome / pricePerCota;
      totalCotas += newCotas;
    } else if (monthlyContribution > 0) {
      const pricePerCota = portfolioValue / Math.max(totalCotas, 1);
      totalCotas += monthlyContribution / pricePerCota;
    }

    // Check income milestones
    const monthlyIncomeBRL = monthlyIncome;
    for (const milestone of INCOME_MILESTONES) {
      if (monthlyIncomeBRL >= milestone && !reachedMilestones.has(milestone)) {
        reachedMilestones.add(milestone);
        const milestoneEntry = {
          month: m,
          label: `R$${milestone.toLocaleString('pt-BR')}/mês`,
          description: `Renda mensal de dividendos atingiu R$${milestone.toLocaleString('pt-BR')} no mês ${m}`,
        };
        milestones.push(milestoneEntry);
      }
    }

    const projectionMilestones: string[] = [];
    for (const milestone of INCOME_MILESTONES) {
      if (reachedMilestones.has(milestone) && milestones.find(ms => ms.month === m && ms.label.includes(milestone.toString()))) {
        projectionMilestones.push(`R$${milestone.toLocaleString('pt-BR')}/mês atingido!`);
      }
    }

    projections.push({
      month: m,
      year,
      label,
      portfolioValue: Math.round(portfolioValue * 100) / 100,
      monthlyIncome: Math.round(monthlyIncome * 100) / 100,
      monthlyContribution,
      dividendsReinvested: Math.round(dividendsReinvested * 100) / 100,
      totalCotas: Math.round(totalCotas * 100) / 100,
      milestones: projectionMilestones,
    });

    monthlyBreakdown.push({
      month: m,
      income: Math.round(monthlyIncome * 100) / 100,
      reinvested: Math.round(dividendsReinvested * 100) / 100,
      contribution: monthlyContribution,
    });
  }

  const lastProjection = projections[projections.length - 1];

  return {
    projections,
    totalMonths: months,
    finalPortfolioValue: lastProjection?.portfolioValue ?? 0,
    finalMonthlyIncome: lastProjection?.monthlyIncome ?? 0,
    milestones,
    monthlyBreakdown,
  };
}

/**
 * Calcula projeção baseada no portfólio real do usuário
 */
export function calculatePortfolioProjection(
  portfolioValue: number,
  monthlyContribution: number,
  weightedDY: number, // % annual
  months: number,
  reinvestDividends: boolean,
): DRIPResult {
  return calculateDRIP({
    initialCapital: portfolioValue,
    monthlyContribution,
    annualDividendYield: weightedDY,
    annualGrowthRate: 0, // Conservative: no price appreciation for income projection
    reinvestDividends,
    months,
    exchangeRate: 1,
    currency: 'BRL',
  });
}

/**
 * Calcula meses necessários para atingir meta de renda mensal
 */
export function monthsToIncomeGoal(
  portfolioValue: number,
  monthlyContribution: number,
  annualDY: number,
  targetMonthlyIncome: number,
  reinvestDividends: boolean,
): number | null {
  const result = calculateDRIP({
    initialCapital: portfolioValue,
    monthlyContribution,
    annualDividendYield: annualDY,
    annualGrowthRate: 0,
    reinvestDividends,
    months: 600, // 50 years max
    exchangeRate: 1,
    currency: 'BRL',
  });

  const firstMonth = result.projections.find(p => p.monthlyIncome >= targetMonthlyIncome);
  return firstMonth ? firstMonth.month : null;
}

/**
 * Calcula quanto precisa investir para atingir meta de renda mensal
 */
export function capitalNeededForIncome(
  targetMonthlyIncome: number,
  annualDY: number,
): number {
  if (annualDY <= 0) return Infinity;
  const monthlyDY = annualDY / 100 / 12;
  return targetMonthlyIncome / monthlyDY;
}

/**
 * Gera sugestão de próximo aporte baseada na projeção
 */
export function suggestNextContribution(
  portfolioValue: number,
  currentMonthlyIncome: number,
  targetMonthlyIncome: number,
  annualDY: number,
  monthlyContribution: number,
): { suggestion: string; amountNeeded: number; monthsAtCurrentPace: number | null } {
  const capitalNeeded = capitalNeededForIncome(targetMonthlyIncome, annualDY);
  const gap = capitalNeeded - portfolioValue;
  const monthsAtCurrentPace = gap > 0 && monthlyContribution > 0
    ? Math.ceil(gap / monthlyContribution)
    : null;

  let suggestion: string;
  if (gap <= 0) {
    suggestion = 'Parabéns! Sua carteira já gera renda suficiente para sua meta.';
  } else if (monthsAtCurrentPace && monthsAtCurrentPace <= 6) {
    suggestion = `Mantenha o ritmo! Faltam apenas ${monthsAtCurrentPace} meses para atingir sua meta.`;
  } else if (monthsAtCurrentPace && monthsAtCurrentPace <= 24) {
    suggestion = `Continue aportando R$${monthlyContribution.toLocaleString('pt-BR')}/mês. Meta em ${monthsAtCurrentPace} meses.`;
  } else {
    const increasedContribution = monthlyContribution * 1.5;
    const monthsWithIncrease = gap > 0 ? Math.ceil(gap / increasedContribution) : null;
    suggestion = monthsWithIncrease
      ? `Aumente o aporte para R$${increasedContribution.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}/mês e alcance a meta em ${monthsWithIncrease} meses.`
      : 'Considere aumentar o aporte mensal para acelerar sua independência.';
  }

  return {
    suggestion,
    amountNeeded: Math.max(0, gap),
    monthsAtCurrentPace,
  };
}
