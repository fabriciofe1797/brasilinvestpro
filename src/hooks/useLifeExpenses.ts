import { useMemo, useState } from 'react';
import { useStore } from '../store/useStore';

export interface LifeExpense {
  id: string;
  name: string;
  category: 'moradia' | 'transporte' | 'alimentacao' | 'educacao' | 'lazer' | 'outros';
  monthlyBRL: number;
  currency: 'BRL' | 'EUR';
}

export interface CoverageResult {
  expense: LifeExpense;
  coveredBy: string[];
  monthlyIncomeBRL: number;
  coveragePct: number;
  monthsToFull: number | null;
}

export function useLifeExpenses() {
  const { portfolio, assets, settings } = useStore();
  const [expenses, setExpenses] = useState<LifeExpense[]>([
    { id: '1', name: 'Aluguel Lisboa', category: 'moradia', monthlyBRL: 3500, currency: 'EUR' },
    { id: '2', name: 'Supermercado', category: 'alimentacao', monthlyBRL: 1500, currency: 'BRL' },
    { id: '3', name: 'Transporte', category: 'transporte', monthlyBRL: 400, currency: 'EUR' },
    { id: '4', name: 'Escola Filhos', category: 'educacao', monthlyBRL: 2000, currency: 'BRL' },
  ]);

  const addExpense = (expense: Omit<LifeExpense, 'id'>) => {
    setExpenses(prev => [...prev, { ...expense, id: crypto.randomUUID() }]);
  };

  const removeExpense = (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
  };

  const totalExpensesBRL = useMemo(() => {
    return expenses.reduce((acc, exp) => {
      const amount = exp.currency === 'EUR' 
        ? exp.monthlyBRL * settings.exchangeRate 
        : exp.monthlyBRL;
      return acc + amount;
    }, 0);
  }, [expenses, settings.exchangeRate]);

  const monthlyIncomeBRL = useMemo(() => {
    return portfolio.reduce((acc, item) => {
      const asset = assets.find(a => a.id === item.assetId);
      if (!asset) return acc;
      const annualDividend = asset.price * (asset.dividendYield / 100);
      const monthlyDividend = annualDividend / 12;
      return acc + (monthlyDividend * item.quantity);
    }, 0);
  }, [portfolio, assets]);

  const coveragePct = totalExpensesBRL > 0 
    ? (monthlyIncomeBRL / totalExpensesBRL) * 100 
    : 0;

  const coverageDetails = useMemo((): CoverageResult[] => {
    return expenses.map(exp => {
      const expBRL = exp.currency === 'EUR'
        ? exp.monthlyBRL * settings.exchangeRate
        : exp.monthlyBRL;
      
      const coveredBy: string[] = [];
      let availableIncome = monthlyIncomeBRL;

      portfolio.forEach(item => {
        const asset = assets.find(a => a.id === item.assetId);
        if (!asset) return;
        const annualDividend = asset.price * (asset.dividendYield / 100);
        const monthly = annualDividend / 12 * item.quantity;
        
        if (availableIncome >= expBRL) {
          coveredBy.push(asset.ticker);
          availableIncome -= monthly;
        }
      });

      const monthsToFull = expBRL > 0 && monthlyIncomeBRL > 0
        ? Math.ceil(expBRL / monthlyIncomeBRL) * 1 // Simplificado
        : null;

      return {
        expense: exp,
        coveredBy,
        monthlyIncomeBRL,
        coveragePct: (monthlyIncomeBRL / expBRL) * 100,
        monthsToFull,
      };
    });
  }, [expenses, portfolio, assets, settings.exchangeRate, monthlyIncomeBRL]);

  return {
    expenses,
    totalExpensesBRL,
    monthlyIncomeBRL,
    coveragePct,
    coverageDetails,
    addExpense,
    removeExpense,
  };
}