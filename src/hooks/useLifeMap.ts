/**
 * useLifeMap — Hook do Mapa de Vida em Dividendos
 * 
 * Conecta despesas reais do usuário à renda de dividendos.
 * Dados persistidos no Supabase (user_data table).
 */

import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useStore } from '../store/useStore';
import { calculateLifeMap } from '../services/lifeMap';
import { getUserData, setUserData } from '../services/userData';
import type { LifeExpense } from '../types';

const DEFAULT_EXPENSES: LifeExpense[] = [
  { id: '1', name: 'Aluguel', category: 'moradia', monthlyAmount: 3500, currency: 'EUR', priority: 'essential' },
  { id: '2', name: 'Supermercado', category: 'alimentacao', monthlyAmount: 1500, currency: 'BRL', priority: 'essential' },
  { id: '3', name: 'Transporte', category: 'transporte', monthlyAmount: 400, currency: 'EUR', priority: 'important' },
  { id: '4', name: 'Escola', category: 'educacao', monthlyAmount: 2000, currency: 'BRL', priority: 'essential' },
  { id: '5', name: 'Lazer', category: 'lazer', monthlyAmount: 500, currency: 'EUR', priority: 'optional' },
];

const DATA_KEY = 'life_expenses';

export function useLifeMap() {
  const { portfolio, assets, settings } = useStore();
  const { getToken, isSignedIn } = useAuth();
  const [expenses, setExpenses] = useState<LifeExpense[]>(DEFAULT_EXPENSES);
  const [loaded, setLoaded] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load from Supabase on mount
  useEffect(() => {
    if (!isSignedIn) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken({ template: 'supabase' });
        if (!token) return;
        const data = await getUserData(token, [DATA_KEY]);
        if (!cancelled && data[DATA_KEY] && Array.isArray(data[DATA_KEY])) {
          setExpenses(data[DATA_KEY] as LifeExpense[]);
        }
      } catch { /* use defaults */ }
      finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [isSignedIn, getToken]);

  // Debounced save to Supabase
  const scheduleSave = useCallback((next: LifeExpense[]) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        const token = await getToken({ template: 'supabase' });
        if (!token) return;
        await setUserData(token, [{ data_key: DATA_KEY, data_value: next }]);
      } catch { /* ignore */ }
    }, 1000);
  }, [getToken]);

  // Cleanup
  useEffect(() => {
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, []);

  const addExpense = useCallback((expense: Omit<LifeExpense, 'id'>) => {
    setExpenses(prev => {
      const next = [...prev, { ...expense, id: crypto.randomUUID() }];
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave]);

  const removeExpense = useCallback((id: string) => {
    setExpenses(prev => {
      const next = prev.filter(e => e.id !== id);
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave]);

  const updateExpense = useCallback((id: string, updates: Partial<LifeExpense>) => {
    setExpenses(prev => {
      const next = prev.map(e => e.id === id ? { ...e, ...updates } : e);
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave]);

  const result = useMemo(() => {
    return calculateLifeMap(
      expenses,
      portfolio,
      assets,
      settings.exchangeRate || 6.2,
      settings.monthlyContribution || 1000,
    );
  }, [expenses, portfolio, assets, settings.exchangeRate, settings.monthlyContribution]);

  return {
    expenses,
    loaded,
    addExpense,
    removeExpense,
    updateExpense,
    items: result.items,
    summary: result.summary,
  };
}
