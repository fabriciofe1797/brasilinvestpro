import { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { getFreshnessStatus } from '../services/dataPipeline';
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
  monthlyIncome: number;    // renda mensal estimada (R$/mes)
  changePct: number | null; // variacao do dia (fallback: 12 meses)
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
  portfolioQuoteSource: QuoteSource | null;  // fonte da cotacao mais recente entre os ativos
  portfolioQuoteUpdatedAt: string | null;    // timestamp da cotacao mais recente entre os ativos
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
        monthlyIncome: (currentPrice * ((asset?.dividendYield || 0) / 100) * item.quantity) / 12,
        changePct: asset?.change ?? asset?.variacao12m ?? null,
        quoteSource: asset?.quoteSource ?? ('mock' as QuoteSource),
        quoteUpdatedAt: asset?.quoteUpdatedAt ?? null,
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

    // Metadados de cotacao a nivel de portfolio: timestamp mais recente entre os ativos e sua fonte
    let portfolioQuoteUpdatedAt: string | null = null;
    let portfolioQuoteSource: QuoteSource | null = null;
    assetMetrics.forEach(a => {
      if (a.quoteUpdatedAt && (!portfolioQuoteUpdatedAt || a.quoteUpdatedAt > portfolioQuoteUpdatedAt)) {
        portfolioQuoteUpdatedAt = a.quoteUpdatedAt;
        portfolioQuoteSource = a.quoteSource;
      }
    });
    const freshness = getFreshnessStatus(portfolioQuoteUpdatedAt);
    const dataConfidence: 'high' | 'medium' | 'low' =
      freshness === 'live' ? 'high' : freshness === 'delayed' ? 'medium' : 'low';

    return {
      totalInvested,
      totalMarketValue,
      totalProfitLoss,
      totalProfitLossPct,
      totalDividendsReceived,
      monthlyIncome,
      assets: assetMetrics,
      categoryBreakdown,
      dataConfidence,
      portfolioQuoteSource,
      portfolioQuoteUpdatedAt,
    };
  }, [portfolio, assets, transactions]);
};
