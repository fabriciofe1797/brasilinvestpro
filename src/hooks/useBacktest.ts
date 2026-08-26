import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useStore } from '../store/useStore';
import { getUserData, setUserData } from '../services/userData';
import i18n from '../i18n';

export interface BacktestInput {
  ticker: string;
  startDate: string; // ISO date
  investedAmount: number;
}

export interface BacktestResult {
  ticker: string;
  startDate: string;
  endDate: string;
  daysElapsed: number;
  sharesBought: number;
  avgPricePaid: number;
  currentValue: number;
  profitLoss: number;
  profitLossPct: number;
  dividendsReceived: number;
  totalReturn: number;
  totalReturnPct: number;
  cdiRate: number;
  cdiValue: number;
  cdiProfit: number;
  cdiProfitPct: number;
  ibovRate: number;
  ibovValue: number;
  ibovProfit: number;
  ibovProfitPct: number;
  beatCDI: boolean;
  beatIBOV: boolean;
}

export interface BacktestHistory {
  id: string;
  input: BacktestInput;
  result: BacktestResult;
  createdAt: string;
}

const SELIC_ANNUAL = 0.1325;
const IBovespa_ANNUAL = 0.10;
const DATA_KEY = 'backtest_history';
const MAX_HISTORY = 20;

export const useBacktest = () => {
  const { assets } = useStore();
  const { getToken, isSignedIn } = useAuth();
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<BacktestHistory[]>([]);
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
          setHistory(data[DATA_KEY] as BacktestHistory[]);
        }
      } catch { /* start empty */ }
    })();
    return () => { cancelled = true; };
  }, [isSignedIn, getToken]);

  const scheduleSave = useCallback((h: BacktestHistory[]) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        const token = await getToken({ template: 'supabase' });
        if (!token) return;
        await setUserData(token, [{ data_key: DATA_KEY, data_value: h }]);
      } catch { /* ignore */ }
    }, 1000);
  }, [getToken]);

  useEffect(() => {
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, []);

  const runBacktest = useCallback((input: BacktestInput) => {
    setIsLoading(true);

    try {
      const asset = assets.find(a => a.ticker === input.ticker.toUpperCase() || a.id === input.ticker);
      if (!asset) {
        throw new Error(i18n.t('backtest.errAssetNotFound', { ticker: input.ticker }));
      }

      const startDate = new Date(input.startDate);
      const endDate = new Date();
      const daysElapsed = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysElapsed <= 0) {
        throw new Error(i18n.t('backtest.errInitialDate'));
      }

      const yearsElapsed = daysElapsed / 365.25;
      const estimatedHistoricalPrice = asset.price * 0.7;
      const sharesBought = Math.floor(input.investedAmount / estimatedHistoricalPrice);
      const avgPricePaid = input.investedAmount / sharesBought;
      const currentValue = sharesBought * asset.price;
      const profitLoss = currentValue - input.investedAmount;
      const profitLossPct = (profitLoss / input.investedAmount) * 100;
      const annualDividendYield = asset.dividendYield / 100;
      const dividendsReceived = input.investedAmount * annualDividendYield * yearsElapsed * 0.8;
      const totalReturn = currentValue + dividendsReceived;
      const totalReturnPct = ((totalReturn - input.investedAmount) / input.investedAmount) * 100;

      const cdiRate = SELIC_ANNUAL;
      const cdiFactor = Math.pow(1 + cdiRate, yearsElapsed);
      const cdiValue = input.investedAmount * cdiFactor;
      const cdiProfit = cdiValue - input.investedAmount;
      const cdiProfitPct = (cdiProfit / input.investedAmount) * 100;

      const ibovRate = IBovespa_ANNUAL;
      const ibovFactor = Math.pow(1 + ibovRate, yearsElapsed);
      const ibovValue = input.investedAmount * ibovFactor;
      const ibovProfit = ibovValue - input.investedAmount;
      const ibovProfitPct = (ibovProfit / input.investedAmount) * 100;

      const backtestResult: BacktestResult = {
        ticker: asset.ticker,
        startDate: input.startDate,
        endDate: endDate.toISOString().split('T')[0],
        daysElapsed,
        sharesBought,
        avgPricePaid,
        currentValue,
        profitLoss,
        profitLossPct,
        dividendsReceived,
        totalReturn,
        totalReturnPct,
        cdiRate,
        cdiValue,
        cdiProfit,
        cdiProfitPct,
        ibovRate,
        ibovValue,
        ibovProfit,
        ibovProfitPct,
        beatCDI: totalReturn > cdiValue,
        beatIBOV: totalReturn > ibovValue,
      };

      setResult(backtestResult);

      const historyEntry: BacktestHistory = {
        id: Date.now().toString(),
        input,
        result: backtestResult,
        createdAt: new Date().toISOString(),
      };
      const newHistory = [historyEntry, ...history].slice(0, MAX_HISTORY);
      setHistory(newHistory);
      scheduleSave(newHistory);

      setIsLoading(false);
      return backtestResult;
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  }, [assets, history, scheduleSave]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    getToken({ template: 'supabase' }).then(token => {
      if (token) setUserData(token, [{ data_key: DATA_KEY, data_value: [] }]).catch(() => {});
    }).catch(() => {});
  }, [getToken]);

  const removeFromHistory = useCallback((id: string) => {
    const newHistory = history.filter(h => h.id !== id);
    setHistory(newHistory);
    scheduleSave(newHistory);
  }, [history, scheduleSave]);

  return {
    result,
    isLoading,
    history,
    runBacktest,
    clearHistory,
    removeFromHistory,
  };
};
