import { useMemo, useState } from 'react';
import { useStore } from '../store/useStore';

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currency: 'EUR' | 'BRL';
  targetDate: string;
  monthlyContribution: number;
  expectedYield: number; // Annual % from dividends
}

export interface GoalProjection {
  goal: Goal;
  monthsRemaining: number;
  finalAmount: number;
  monthlyIncomeGenerated: number;
  achievable: boolean;
  shortfall: number;
  progressPct: number;
}

export function useGoalSimulator() {
  const { portfolio, assets, settings } = useStore();
  const [goals, setGoals] = useState<Goal[]>([
    {
      id: '1',
      name: 'Reserva Emergência',
      targetAmount: 15000,
      currency: 'EUR',
      targetDate: new Date(new Date().setFullYear(new Date().getFullYear() + 2)).toISOString().split('T')[0],
      monthlyContribution: 500,
      expectedYield: 7,
    },
  ]);

  const currentExchangeRate = settings.exchangeRate;

  const projections = useMemo((): GoalProjection[] => {
    const portfolioYield = useMemo(() => {
      if (portfolio.length === 0) return 0;
      const totalYield = portfolio.reduce((acc, item) => {
        const asset = assets.find(a => a.id === item.assetId);
        return acc + (asset ? asset.dividendYield * item.quantity : 0);
      }, 0);
      const totalValue = portfolio.reduce((acc, item) => {
        const asset = assets.find(a => a.id === item.assetId);
        return acc + (asset ? asset.price * item.quantity : 0);
      }, 0);
      return totalValue > 0 ? totalYield / (totalValue / 100) : 0;
    }, [portfolio, assets]);

    return goals.map(goal => {
      const targetInBRL = goal.currency === 'EUR' 
        ? goal.targetAmount * currentExchangeRate 
        : goal.targetAmount;
      
      const targetDate = new Date(goal.targetDate);
      const now = new Date();
      const monthsRemaining = Math.max(1, (targetDate.getFullYear() - now.getFullYear()) * 12 + (targetDate.getMonth() - now.getMonth()));
      
      // Compound interest calculation with monthly contributions
      const monthlyRate = goal.expectedYield / 100 / 12;
      let futureValue = 0;
      const monthlyContribBRL = goal.currency === 'EUR'
        ? goal.monthlyContribution * currentExchangeRate
        : goal.monthlyContribution;
      
      for (let i = 0; i < monthsRemaining; i++) {
        futureValue = futureValue * (1 + monthlyRate) + monthlyContribBRL;
      }

      const monthlyIncomeGenerated = (futureValue * (goal.expectedYield / 100)) / 12;
      const shortfall = Math.max(0, targetInBRL - futureValue);
      const achievable = futureValue >= targetInBRL * 0.9; // 90% threshold

      // Current progress
      const currentPortfolioValue = portfolio.reduce((acc, item) => {
        const asset = assets.find(a => a.id === item.assetId);
        return acc + (asset ? asset.price * item.quantity : 0);
      }, 0);
      
      const progressPct = targetInBRL > 0 
        ? Math.min(100, (currentPortfolioValue / targetInBRL) * 100) 
        : 0;

      return {
        goal,
        monthsRemaining,
        finalAmount: futureValue,
        monthlyIncomeGenerated: goal.currency === 'BRL' ? monthlyIncomeGenerated : monthlyIncomeGenerated / currentExchangeRate,
        achievable,
        shortfall: goal.currency === 'BRL' ? shortfall : shortfall / currentExchangeRate,
        progressPct,
      };
    });
  }, [goals, portfolio, assets, currentExchangeRate]);

  const addGoal = (goal: Omit<Goal, 'id'>) => {
    setGoals(prev => [...prev, { ...goal, id: crypto.randomUUID() }]);
  };

  const removeGoal = (id: string) => {
    setGoals(prev => prev.filter(g => g.id !== id));
  };

  return {
    goals,
    projections,
    addGoal,
    removeGoal,
  };
}