import { useMemo } from 'react';
import { useStore } from '../store/useStore';
import type { QuoteSource } from '../types';

export interface AssetMetric {
  assetId: string;
  ticker: string;
  name: string;
  category: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  investedValue: number;
  marketValue: number;
  profitLoss: number;       // R$ P/L
  profitLossPct: number;    // % P/L
  dividendYield: number;
  weight: number;           // % of total portfolio
  quoteSource: QuoteSource;
  quoteUpdatedAt: string | null;
}

export interface PortfolioMetrics {
  totalInvested: number;
  totalMarketValue: number;
  totalProfitLoss: number;
  totalProfitLossPct: number;
  totalDividendsReceived: number;
  monthlyIncome: number;
  assets: AssetMetric[];
  categoryBreakdown: { category: string; value: number; weight: number }[];
  dataConfidence: 'high' | 'medium' | 'low';
}

/**
 * Centraliza todas as metricas reais do portfolio para o Dashboard.
 */
export const usePortfolioMetrics = (): PortfolioMetrics => {
  const { portfolio, assets, transactions } = useStore();

  return useMemo(() => {
    const totalMarketValue = portfolio.reduce((acc, item) => {
      const asset = assets.find(a => a.id === item.assetId || a.ticker === item.assetId);
      return acc + (asset ? asset.price * item.quantity : 0);
    }, 0);

    const totalInvested = portfolio.reduce((acc, item) => {
      return acc + item.averagePrice * item.quantity;
    }, 0);

    const totalProfitLoss = totalMarketValue - totalInvested;
    const totalProfitLossPct = totalInvested > 0 ? (totalProfitLoss / totalInvested) * 100 : 0;

    // Dividends received (from transactions)
    const totalDividendsReceived = transactions
      .filter(tx => tx.type === 'DIVIDEND')
      .reduce((sum, tx) => sum + tx.total, 0);

    // Monthly income estimate
    const monthlyIncome = portfolio.reduce((acc, item) => {
      const asset = assets.find(a => a.id === item.assetId || a.ticker === item.assetId);
      if (!asset) return acc;
      const annualDivPerShare = asset.price * (asset.dividendYield / 100);
      return acc + annualDivPerShare * item.quantity / 12;
    }, 0);

    // Per-asset metrics
    const assetMetrics: AssetMetric[] = portfolio.map(item => {
      const asset = assets.find(a => a.id === item.assetId || a.ticker === item.assetId);
      const currentPrice = asset?.price || item.averagePrice;
      const investedValue = item.averagePrice * item.quantity;
      const marketValue = currentPrice * item.quantity;
      const profitLoss = marketValue - investedValue;
      const profitLossPct = investedValue > 0 ? (profitLoss / investedValue) * 100 : 0;
      const weight = totalMarketValue > 0 ? (marketValue / totalMarketValue) * 100 : 0;

      return {
        assetId: item.assetId,
        ticker: asset?.ticker || item.assetId,
        name: asset?.name || item.assetId,
        category: asset?.category || 'Outros',
        quantity: item.quantity,
        averagePrice: item.averagePrice,
        currentPrice,
        investedValue,
        marketValue,
        profitLoss,
        profitLossPct,
        dividendYield: asset?.dividendYield || 0,
        weight,
        quoteSource: 'mock' as QuoteSource,
        quoteUpdatedAt: null,
      };
    });

    // Sort by weight descending
    assetMetrics.sort((a, b) => b.weight - a.weight);

    // Category breakdown
    const categoryMap: Record<string, number> = {};
    assetMetrics.forEach(a => {
      categoryMap[a.category] = (categoryMap[a.category] || 0) + a.marketValue;
    });
    const categoryBreakdown = Object.entries(categoryMap)
      .map(([category, value]) => ({
        category,
        value,
        weight: totalMarketValue > 0 ? (value / totalMarketValue) * 100 : 0,
      }))
      .sort((a, b) => b.weight - a.weight);

    return {
      totalInvested,
      totalMarketValue,
      totalProfitLoss,
      totalProfitLossPct,
      totalDividendsReceived,
      monthlyIncome,
      assets: assetMetrics,
      categoryBreakdown,
      dataConfidence: 'low' as const, // Default: store doesn't track quote metadata yet
    };
  }, [portfolio, assets, transactions]);
};
