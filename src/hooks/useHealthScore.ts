import { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { usePortfolioMetrics } from './usePortfolioMetrics';
import { useContributionStreak } from './useContributionStreak';
import { calculateClassicCeiling } from '../lib/formulas';

export interface HealthScoreResult {
  score: number;             // 0-100
  diversification: number;   // 0-100
  yield: number;             // 0-100
  valuation: number;         // 0-100
  discipline: number;        // 0-100
  label: string;
  color: string;
  recommendations: string[];
}

/**
 * Health Score da Carteira — score 0-100 baseado em 4 pilares:
 * - Diversificacao (25%): numero de ativos e distribuicao por categoria
 * - Rendimento (25%): DY medio da carteira
 * - Valuation (25%): % ativos abaixo do preco teto
 * - Disciplina (25%): regularidade de aportes (streak)
 */
export const useHealthScore = (): HealthScoreResult => {
  const { portfolio, assets, transactions } = useStore();
  const metrics = usePortfolioMetrics();
  const { streak } = useContributionStreak();

  return useMemo(() => {
    const recommendations: string[] = [];

    // ─── 1. Diversificacao (0-100) ───────────────────────────────────────
    let diversification = 0;
    if (portfolio.length > 0) {
      const numAssets = portfolio.length;
      const numCategories = metrics.categoryBreakdown.length;
      const topWeight = metrics.categoryBreakdown.length > 0 ? metrics.categoryBreakdown[0].weight : 100;

      // Number of assets score (ideal: 5-15)
      const assetScore = Math.min(100, numAssets * 15);
      // Category diversity (ideal: 3+)
      const categoryScore = Math.min(100, numCategories * 25);
      // Concentration penalty (top category > 50% is bad)
      const concentrationScore = topWeight <= 30 ? 100 : topWeight <= 50 ? 70 : topWeight <= 70 ? 40 : 15;

      diversification = Math.round(assetScore * 0.4 + categoryScore * 0.3 + concentrationScore * 0.3);

      if (numAssets < 3) recommendations.push('Diversifique: tenha pelo menos 3 ativos distintos.');
      if (topWeight > 50) recommendations.push(`Atencao: ${metrics.categoryBreakdown[0]?.category} representa ${topWeight.toFixed(0)}% da carteira.`);
      if (numCategories < 3) recommendations.push('Considere adicionar mais categorias (FIIs, Acoes, Renda Fixa).');
    }

    // ─── 2. Rendimento (0-100) ───────────────────────────────────────────
    let yieldScore = 0;
    if (portfolio.length > 0) {
      const weightedDY = metrics.assets.reduce((sum, a) => sum + a.dividendYield * (a.weight / 100), 0);
      // DY ideal: 6%+ = 100, 4% = 70, 2% = 40, 0% = 0
      yieldScore = Math.min(100, Math.round((weightedDY / 8) * 100));

      if (weightedDY < 2) recommendations.push('DY medio abaixo de 2%. Foque em ativos mais dividendeiros.');
      if (weightedDY >= 6) recommendations.push('Excelente rendimento! DY medio acima de 6%.');
    }

    // ─── 3. Valuation (0-100) ────────────────────────────────────────────
    let valuation = 0;
    if (portfolio.length > 0) {
      let belowCeiling = 0;
      let totalWeight = 0;

      metrics.assets.forEach(a => {
        const asset = assets.find(x => x.id === a.assetId || x.ticker === a.assetId);
        if (!asset) return;
        const annualDiv = asset.price * (asset.dividendYield / 100);
        const ceiling = calculateClassicCeiling(annualDiv);
        if (ceiling && ceiling > 0) {
          totalWeight += a.weight;
          if (asset.price <= ceiling) {
            belowCeiling += a.weight;
          }
        }
      });

      valuation = totalWeight > 0 ? Math.round((belowCeiling / totalWeight) * 100) : 50;

      if (valuation < 50) recommendations.push('Mais da metade dos ativos estao acima do preco teto. Considere reduzir posicoes.');
      if (valuation >= 80) recommendations.push('Otimo valuation! Maioria dos ativos abaixo do preco teto.');
    }

    // ─── 4. Disciplina (0-100) ───────────────────────────────────────────
    let discipline = 0;
    if (transactions.filter(t => t.type === 'BUY').length > 0) {
      // streak: 0 = 10, 1 = 30, 3 = 60, 6+ = 85, 12+ = 100
      if (streak === 0) discipline = 10;
      else if (streak === 1) discipline = 30;
      else if (streak <= 3) discipline = 50 + (streak - 1) * 10;
      else if (streak <= 6) discipline = 70 + (streak - 3) * 5;
      else if (streak <= 12) discipline = 85 + (streak - 6) * 2.5;
      else discipline = 100;
      discipline = Math.round(discipline);

      if (streak === 0) recommendations.push('Sem aportes recentes. Retome a consistencia!');
      if (streak >= 6) recommendations.push(`Parabens! ${streak} meses consecutivos de aportes.`);
    }

    // ─── Score Final ─────────────────────────────────────────────────────
    const hasPortfolio = portfolio.length > 0;
    const score = hasPortfolio
      ? Math.round(diversification * 0.25 + yieldScore * 0.25 + valuation * 0.25 + discipline * 0.25)
      : 0;

    let label: string;
    let color: string;
    if (score >= 80) { label = 'Excelente'; color = '#10b981'; }
    else if (score >= 60) { label = 'Saudavel'; color = '#3b82f6'; }
    else if (score >= 40) { label = 'Atencao'; color = '#f59e0b'; }
    else if (score > 0) { label = 'Critico'; color = '#ef4444'; }
    else { label = 'Sem Dados'; color = '#6b7280'; }

    return {
      score,
      diversification,
      yield: yieldScore,
      valuation,
      discipline,
      label,
      color,
      recommendations: recommendations.slice(0, 4),
    };
  }, [portfolio, assets, transactions, metrics, streak]);
};
