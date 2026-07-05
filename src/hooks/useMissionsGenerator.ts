import { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { usePortfolioMetrics } from './usePortfolioMetrics';
import { useContributionStreak } from './useContributionStreak';
import type { PlanMission } from '../types';

/**
 * Gera missions automaticamente baseado no estado da carteira.
 * As missions são dinâmicas e refletem ações sugeridas para o investidor.
 */
export const useMissionsGenerator = (): PlanMission[] => {
  const { portfolio, assets, settings, missions } = useStore();
  const metrics = usePortfolioMetrics();
  const { streak, lastContributionDate } = useContributionStreak();

  return useMemo(() => {
    const generated: PlanMission[] = [];
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // 1. Missão: Aporte mensal
    const hasContributionThisMonth = missions.some(
      m => m.id === 'monthly-total' && m.status === 'completed'
    );
    generated.push({
      id: 'monthly-total',
      title: hasContributionThisMonth ? 'Aporte do mês realizado!' : 'Fazer aporte mensal',
      description: hasContributionThisMonth
        ? `Sequência de ${streak} meses consecutivos. Continue assim!`
        : `Meta: R$ ${settings.monthlyContribution.toLocaleString('pt-BR')}/mês. Último aporte: ${lastContributionDate ? new Date(lastContributionDate).toLocaleDateString('pt-BR') : 'Nunca'}`,
      status: hasContributionThisMonth ? 'completed' : 'pending',
      category: 'aporte',
    });

    // 2. Missão: Renda de dividendos
    const monthlyIncome = metrics.monthlyIncome;
    const targetDividend = settings.targetDividend;
    const incomeProgress = targetDividend > 0 ? (monthlyIncome / targetDividend) * 100 : 0;
    const incomeMissionId = 'dividend-goal';
    const incomeCompleted = incomeProgress >= 100;
    generated.push({
      id: incomeMissionId,
      title: incomeCompleted ? 'Meta de renda atingida!' : `Renda: R$ ${monthlyIncome.toFixed(0)} / R$ ${targetDividend}`,
      description: incomeCompleted
        ? `Parabéns! Sua renda mensal de R$ ${monthlyIncome.toFixed(0)} superou a meta de R$ ${targetDividend}!`
        : `Faltam R$ ${(targetDividend - monthlyIncome).toFixed(0)} para atingir sua meta de renda mensal passiva.`,
      status: incomeCompleted ? 'completed' : 'pending',
      category: 'aporte',
    });

    // 3. Missão: Diversificação (se portfolio tem poucos ativos)
    const diversificationId = 'diversification';
    const uniqueAssets = portfolio.length;
    const diversificationCompleted = uniqueAssets >= 5;
    generated.push({
      id: diversificationId,
      title: diversificationCompleted ? 'Carteira diversificada!' : `Diversificar carteira (${uniqueAssets}/5 ativos)`,
      description: diversificationCompleted
        ? `Sua carteira tem ${uniqueAssets} ativos diferentes. Boa diversificação!`
        : `Adicione mais ativos para reduzir risco. Meta mínima: 5 ativos distintos.`,
      status: diversificationCompleted ? 'completed' : 'pending',
      category: 'aporte',
    });

    // 4. Missão: Rebalanceamento (se allocationTargets definidos e há desvio)
    if (settings.allocationTargets.length > 0 && metrics.categoryBreakdown.length > 0) {
      const maxDeviation = Math.max(
        ...metrics.categoryBreakdown.map(cb => {
          const target = settings.allocationTargets.find(t => t.category === cb.category);
          return target ? Math.abs(cb.weight - target.targetPercentage) : 0;
        })
      );
      const rebalanceId = 'rebalance-check';
      const rebalanceCompleted = maxDeviation <= 5;
      generated.push({
        id: rebalanceId,
        title: rebalanceCompleted ? 'Alocação equilibrada!' : 'Rebalancear carteira',
        description: rebalanceCompleted
          ? `Desvio máximo de ${maxDeviation.toFixed(1)}%. Carteira dentro do esperado.`
          : `Desvio de até ${maxDeviation.toFixed(1)}% detectado. Considere rebalancear para manter suas metas de alocação.`,
        status: rebalanceCompleted ? 'completed' : 'pending',
        category: 'rebalanceamento',
      });
    }

    // 5. Missão: Estudar/educacao (sempre pendente, rotativa)
    const educationId = 'education-monthly';
    generated.push({
      id: educationId,
      title: 'Estudar um ativo novo',
      description: 'Pesquise um ativo que ainda não conhece e avalie se faz sentido para sua carteira.',
      status: 'pending' as const,
      category: 'educacao',
    });

    return generated;
  }, [portfolio, assets, settings, missions, metrics, streak, lastContributionDate]);
};
