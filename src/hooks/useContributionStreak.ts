import { useMemo } from 'react';
import { useStore } from '../store/useStore';

/**
 * Calcula a sequência de meses consecutivos com aportes (BUY) realizados.
 * Hook compartilhado entre Dashboard, AIAdvisor e Health Score.
 */
export const useContributionStreak = () => {
  const { transactions } = useStore();

  const result = useMemo(() => {
    const buyTxs = transactions.filter(t => t.type === 'BUY');

    // Collect unique months with buys
    const monthsWithBuys = new Set<string>();
    buyTxs.forEach(tx => {
      const d = new Date(tx.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthsWithBuys.add(key);
    });

    const now = new Date();
    let year = now.getFullYear();
    let month = now.getMonth();
    let streak = 0;

    // Walk backwards from current month
    for (;;) {
      const key = `${year}-${String(month + 1).padStart(2, '0')}`;
      if (monthsWithBuys.has(key)) {
        streak += 1;
        month -= 1;
        if (month < 0) {
          month = 11;
          year -= 1;
        }
      } else {
        break;
      }
    }

    // Total months with contributions (all-time)
    const totalMonthsContributed = monthsWithBuys.size;

    // Last contribution date
    const sortedBuys = [...buyTxs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const lastContributionDate = sortedBuys.length > 0 ? sortedBuys[0].date : null;

    // Monthly contribution amounts (last 12 months)
    const monthlyAmounts: { month: string; amount: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthTxs = buyTxs.filter(tx => tx.date.startsWith(key));
      const amount = monthTxs.reduce((sum, tx) => sum + tx.total, 0);
      monthlyAmounts.push({ month: key, amount });
    }

    return {
      streak,
      totalMonthsContributed,
      lastContributionDate,
      monthlyAmounts,
    };
  }, [transactions]);

  return result;
};
