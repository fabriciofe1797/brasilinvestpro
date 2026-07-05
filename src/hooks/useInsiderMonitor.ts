import { useMemo, useState, useCallback } from 'react';
import { useStore } from '../store/useStore';
import {
  InsiderTransaction,
  InsiderSummary,
  fetchInsiderTransactions,
  getInsiderSummary,
  detectRelevantMovements,
  getTopSignals,
} from '../services/cvmInsiders';

interface UseInsiderMonitorResult {
  transactions: InsiderTransaction[];
  relevantMovements: InsiderTransaction[];
  portfolioSignals: InsiderTransaction[];
  topSignals: ReturnType<typeof getTopSignals>;
  loading: boolean;
  lastUpdate: string;
  refreshData: () => void;
  getSummaryForTicker: (ticker: string) => InsiderSummary | null;
  getAlertsForPortfolio: () => InsiderTransaction[];
  // Stats
  stats: {
    total24h: number;
    total7d: number;
    total30d: number;
    netSignal: 'bullish' | 'bearish' | 'neutral';
    buyVolume30d: number;
    sellVolume30d: number;
  };
}

export const useInsiderMonitor = (): UseInsiderMonitorResult => {
  const { portfolio, assets } = useStore();
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastUpdate] = useState(() => new Date().toISOString());

  const refreshData = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  // All transactions
  const transactions = useMemo(() => {
    void refreshKey; // Trigger re-computation on refresh
    return fetchInsiderTransactions();
  }, [refreshKey]);

  // Relevant movements (>R$1M)
  const relevantMovements = useMemo(() => {
    return detectRelevantMovements(transactions);
  }, [transactions]);

  // Portfolio signals (insider movements in user's assets)
  const portfolioSignals = useMemo(() => {
    const portfolioTickers = new Set(
      portfolio.map(p => {
        const asset = assets.find(a => a.id === p.assetId || a.ticker === p.assetId);
        return asset?.ticker || p.assetId;
      })
    );
    return transactions.filter(t => portfolioTickers.has(t.ticker));
  }, [transactions, portfolio, assets]);

  // Top signals
  const topSignals = useMemo(() => {
    return getTopSignals(10);
  }, [transactions]);

  // Stats
  const stats = useMemo(() => {
    const now = new Date();
    const h24 = new Date(now); h24.setDate(h24.getDate() - 1);
    const d7 = new Date(now); d7.setDate(d7.getDate() - 7);
    const d30 = new Date(now); d30.setDate(d30.getDate() - 30);

    const total24h = transactions.filter(t => new Date(t.date) >= h24).length;
    const total7d = transactions.filter(t => new Date(t.date) >= d7).length;
    const total30d = transactions.filter(t => new Date(t.date) >= d30).length;

    const recent30 = transactions.filter(t => new Date(t.date) >= d30);
    const buyVolume30d = recent30.filter(t => t.type === 'buy').reduce((s, t) => s + t.value, 0);
    const sellVolume30d = recent30.filter(t => t.type === 'sell').reduce((s, t) => s + t.value, 0);

    let netSignal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    if (buyVolume30d > sellVolume30d * 1.5) netSignal = 'bullish';
    else if (sellVolume30d > buyVolume30d * 1.5) netSignal = 'bearish';

    return { total24h, total7d, total30d, netSignal, buyVolume30d, sellVolume30d };
  }, [transactions]);

  const getSummaryForTicker = useCallback((ticker: string) => {
    return getInsiderSummary(ticker);
  }, []);

  const getAlertsForPortfolio = useCallback(() => {
    return portfolioSignals.filter(t => t.isRelevant);
  }, [portfolioSignals]);

  return {
    transactions,
    relevantMovements,
    portfolioSignals,
    topSignals,
    loading: false,
    lastUpdate,
    refreshData,
    getSummaryForTicker,
    getAlertsForPortfolio,
    stats,
  };
};
