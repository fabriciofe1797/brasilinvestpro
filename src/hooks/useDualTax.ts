import { useMemo, useState, useCallback, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useStore } from '../store/useStore';
import {
  DualTaxConfig,
  DualTaxResult,
  DualTaxSummary,
  DeclarationItem,
  calculateDualTax,
  calculateWithoutTreaty,
  generateDeclarationGuide,
  getDefaultConfig,
  loadDualTaxConfig,
  saveDualTaxConfig,
} from '../services/dualTax';

interface UseDualTaxResult {
  config: DualTaxConfig;
  setConfig: (config: DualTaxConfig) => void;
  results: DualTaxResult[];
  summary: DualTaxSummary;
  declarationGuide: DeclarationItem[];
  comparison: {
    withoutTreaty: number;
    withTreaty: number;
    savings: number;
  };
}

export const useDualTax = (): UseDualTaxResult => {
  const { transactions, assets } = useStore();
  const { getToken, isSignedIn } = useAuth();
  const [config, setConfigState] = useState<DualTaxConfig>(getDefaultConfig());

  // Load config from Supabase on mount
  useEffect(() => {
    if (!isSignedIn) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken({ template: 'supabase' });
        if (!token) return;
        const cfg = await loadDualTaxConfig(token);
        if (!cancelled) setConfigState(cfg);
      } catch { /* use default */ }
    })();
    return () => { cancelled = true; };
  }, [isSignedIn, getToken]);

  const setConfig = useCallback((newConfig: DualTaxConfig) => {
    setConfigState(newConfig);
    getToken({ template: 'supabase' }).then(token => {
      if (token) saveDualTaxConfig(token, newConfig).catch(() => {});
    }).catch(() => {});
  }, [getToken]);

  // Converter dados do store para formato do serviço
  const txInputs = useMemo(() => {
    return transactions.map(tx => ({
      date: tx.date,
      assetId: tx.assetId,
      type: tx.type,
      quantity: tx.quantity,
      price: tx.price,
      fees: tx.fees,
      total: tx.total,
    }));
  }, [transactions]);

  const assetInputs = useMemo(() => {
    return assets.map(a => ({
      id: a.id,
      ticker: a.ticker,
      category: a.category,
      price: a.price,
    }));
  }, [assets]);

  // Calcular resultados
  const results = useMemo(() => {
    return calculateDualTax(txInputs, assetInputs, config);
  }, [txInputs, assetInputs, config]);

  // Resumo
  const summary = useMemo((): DualTaxSummary => {
    const totalBrazil = results.reduce((s, r) => s + r.brazil.totalTax, 0);
    const totalPortugal = results.reduce((s, r) => s + r.treaty.netLiability, 0);
    const totalCredits = results.reduce((s, r) => s + r.treaty.doubleTaxRelief, 0);
    const totalBurden = results.reduce((s, r) => s + r.totalBurden, 0);
    const totalSales = results.reduce((s, r) => {
      const monthSales = r.brazil.taxByCategory.reduce((ms, c) => ms + c.sales, 0);
      return s + monthSales;
    }, 0);
    const effectiveRate = totalSales > 0 ? (totalBurden / totalSales) * 100 : 0;

    const withoutTreaty = calculateWithoutTreaty(results);
    const withTreaty = totalBurden;
    const savings = withoutTreaty - withTreaty;

    return {
      totalBrazil,
      totalPortugal,
      totalCredits,
      totalBurden,
      effectiveRate,
      withoutTreaty,
      savings,
      monthlyResults: results,
    };
  }, [results]);

  // Comparativo
  const comparison = useMemo(() => ({
    withoutTreaty: summary.withoutTreaty,
    withTreaty: summary.totalBurden,
    savings: summary.savings,
  }), [summary]);

  // Guia de declaração
  const declarationGuide = useMemo(() => {
    return generateDeclarationGuide(config);
  }, [config]);

  return {
    config,
    setConfig,
    results,
    summary,
    declarationGuide,
    comparison,
  };
};
