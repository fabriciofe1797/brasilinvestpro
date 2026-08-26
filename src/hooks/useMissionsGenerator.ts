import { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { usePortfolioMetrics } from './usePortfolioMetrics';
import { useContributionStreak } from './useContributionStreak';
import type { PlanMission } from '../types';
import i18n from '../i18n';

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

    // 1. Missão: Aporte mensal
    const hasContributionThisMonth = missions.some(
      m => m.id === 'monthly-total' && m.status === 'completed'
    );
    generated.push({
      id: 'monthly-total',
      title: hasContributionThisMonth ? i18n.t('missions.contribDoneTitle') : i18n.t('missions.contribTodoTitle'),
      description: hasContributionThisMonth
        ? i18n.t('missions.contribDoneDesc', { count: streak })
        : i18n.t('missions.contribTodoDesc', { value: settings.monthlyContribution.toLocaleString(i18n.language), date: lastContributionDate ? new Date(lastContributionDate).toLocaleDateString(i18n.language) : i18n.t('missions.never') }),
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
      title: incomeCompleted ? i18n.t('missions.incomeDoneTitle') : i18n.t('missions.incomeTodoTitle', { current: monthlyIncome.toFixed(0), target: targetDividend }),
      description: incomeCompleted
        ? i18n.t('missions.incomeDoneDesc', { current: monthlyIncome.toFixed(0), target: targetDividend })
        : i18n.t('missions.incomeTodoDesc', { gap: (targetDividend - monthlyIncome).toFixed(0) }),
      status: incomeCompleted ? 'completed' : 'pending',
      category: 'aporte',
    });

    // 3. Missão: Diversificação (se portfolio tem poucos ativos)
    const diversificationId = 'diversification';
    const uniqueAssets = portfolio.length;
    const diversificationCompleted = uniqueAssets >= 5;
    generated.push({
      id: diversificationId,
      title: diversificationCompleted ? i18n.t('missions.divDoneTitle') : i18n.t('missions.divTodoTitle', { count: uniqueAssets }),
      description: diversificationCompleted
        ? i18n.t('missions.divDoneDesc', { count: uniqueAssets })
        : i18n.t('missions.divTodoDesc'),
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
        title: rebalanceCompleted ? i18n.t('missions.rebDoneTitle') : i18n.t('missions.rebTodoTitle'),
        description: rebalanceCompleted
          ? i18n.t('missions.rebDoneDesc', { deviation: maxDeviation.toFixed(1) })
          : i18n.t('missions.rebTodoDesc', { deviation: maxDeviation.toFixed(1) }),
        status: rebalanceCompleted ? 'completed' : 'pending',
        category: 'rebalanceamento',
      });
    }

    // 5. Missão: Estudar/educacao (sempre pendente, rotativa)
    const educationId = 'education-monthly';
    generated.push({
      id: educationId,
      title: i18n.t('missions.eduTitle'),
      description: i18n.t('missions.eduDesc'),
      status: 'pending' as const,
      category: 'educacao',
    });

    return generated;
  }, [portfolio, assets, settings, missions, metrics, streak, lastContributionDate, i18n.language]);
};
