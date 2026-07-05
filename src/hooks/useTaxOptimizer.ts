import { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { Transaction, Asset } from '../types';

export interface TaxAsset {
  ticker: string;
  quantity: number;
  averagePrice: number;
  totalCost: number;
  currentPrice: number;
  unrealizedResult: number;
  category: string;
}

export interface MonthlyTaxBreakdown {
  stocks: { sales: number; profit: number; exempt: boolean; tax: number };
  fiis: { sales: number; profit: number; tax: number };
  fixedIncome: { sales: number; profit: number; tax: number; rate: number };
  crypto: { sales: number; profit: number; exempt: boolean; tax: number };
  dayTrade: { sales: number; profit: number; tax: number };
}

export interface TaxResult {
  month: string;
  salesTotal: number;
  profit: number;
  lossCarriedForward: number;
  taxableGain: number;
  taxDue: number;
  breakdown: MonthlyTaxBreakdown;
  hasExemption: boolean;
  effectiveRate: number;
}

// ─── Tax Rate Helpers ────────────────────────────────────────────────────────

/** Isenção para ações: vendas ≤ R$20.000/mês */
const STOCKS_EXEMPTION_LIMIT = 20000;
/** Isenção para cripto: vendas ≤ R$35.000/mês */
const CRYPTO_EXEMPTION_LIMIT = 35000;

/** Alíquotas por tipo de ativo */
function getTaxRate(category: string, isDayTrade: boolean): number {
  if (isDayTrade) return 0.20; // 20% Day Trade
  if (category.includes('FII')) return 0.20; // 20% FIIs
  if (category === 'Renda Fixa' || category === 'Renda Fixa ETF') return 0.15; // Simplified: 15% (tabela regressiva para prazos longos)
  if (category === 'Cripto') return 0.15; // 15% Cripto
  return 0.15; // 15% Ações (swing trade)
}

/** Verifica se tem isenção no mês */
function isExempt(category: string, monthlySales: number, isDayTrade: boolean): boolean {
  if (isDayTrade) return false;
  if (!category.includes('FII') && (category === 'Ações Dividendos' || category === 'Ações Internacional')) {
    return monthlySales <= STOCKS_EXEMPTION_LIMIT;
  }
  if (category === 'Cripto') {
    return monthlySales <= CRYPTO_EXEMPTION_LIMIT;
  }
  return false;
}

/** Classifica o tipo de operação */
function classifyAsset(asset: Asset | undefined): { category: string; isDayTrade: boolean } {
  if (!asset) return { category: 'Ações Dividendos', isDayTrade: false };
  return {
    category: asset.category,
    isDayTrade: false, // Day trade detection would require same buy+sell same day
  };
}

// ─── Main Hook ───────────────────────────────────────────────────────────────

export const useTaxOptimizer = () => {
  const { transactions, assets } = useStore();

  // 1. Calcular Preço Médio (Weighted Average Price) por ativo
  const assetPositions = useMemo(() => {
    const positions: Record<string, { quantity: number; totalCost: number }> = {};
    const sortedTxs = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    sortedTxs.forEach(tx => {
      if (!positions[tx.assetId]) {
        positions[tx.assetId] = { quantity: 0, totalCost: 0 };
      }
      const pos = positions[tx.assetId];
      if (tx.type === 'BUY') {
        pos.quantity += tx.quantity;
        pos.totalCost += tx.total;
      } else {
        if (pos.quantity > 0) {
          const avgPrice = pos.totalCost / pos.quantity;
          const costOfSold = avgPrice * tx.quantity;
          pos.quantity -= tx.quantity;
          pos.totalCost -= costOfSold;
        }
      }
    });

    return Object.entries(positions).map(([assetId, pos]) => {
      const asset = assets.find(a => a.id === assetId || a.ticker === assetId);
      const avgPrice = pos.quantity > 0 ? pos.totalCost / pos.quantity : 0;
      const currentPrice = asset?.price || avgPrice;
      return {
        ticker: asset?.ticker || assetId,
        quantity: pos.quantity,
        averagePrice: avgPrice,
        totalCost: pos.totalCost,
        currentPrice,
        unrealizedResult: (currentPrice - avgPrice) * pos.quantity,
        category: asset?.category || 'Ações Dividendos',
      } as TaxAsset;
    }).filter(p => p.quantity > 0);
  }, [transactions, assets]);

  // 2. Calcular IR Mensal com regras reais brasileiras
  const monthlyTax = useMemo((): TaxResult[] => {
    const monthlyData: Record<string, {
      salesByCategory: Record<string, { sales: number; profit: number; isDayTrade: boolean }>;
    }> = {};
    
    let accumulatedLoss = 0;
    const sortedTxs = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const positions: Record<string, { quantity: number; totalCost: number }> = {};

    // Replay all transactions to get per-month, per-category data
    sortedTxs.forEach(tx => {
      const month = tx.date.substring(0, 7);
      if (!monthlyData[month]) {
        monthlyData[month] = { salesByCategory: {} };
      }

      if (!positions[tx.assetId]) positions[tx.assetId] = { quantity: 0, totalCost: 0 };
      const pos = positions[tx.assetId];
      const asset = assets.find(a => a.id === tx.assetId || a.ticker === tx.assetId);
      const { category } = classifyAsset(asset);

      if (tx.type === 'BUY') {
        pos.quantity += tx.quantity;
        pos.totalCost += tx.total;
      } else {
        // SELL
        if (pos.quantity > 0) {
          const avgPrice = pos.totalCost / pos.quantity;
          const costOfSold = avgPrice * tx.quantity;
          const netProceeds = (tx.price * tx.quantity) - tx.fees;
          const profit = netProceeds - costOfSold;
          const salesValue = tx.price * tx.quantity;

          // Aggregate by category for the month
          const key = category;
          if (!monthlyData[month].salesByCategory[key]) {
            monthlyData[month].salesByCategory[key] = { sales: 0, profit: 0, isDayTrade: false };
          }
          monthlyData[month].salesByCategory[key].sales += salesValue;
          monthlyData[month].salesByCategory[key].profit += profit;

          pos.quantity -= tx.quantity;
          pos.totalCost -= costOfSold;
        }
      }
    });

    // Calculate tax per month with proper rules
    const results: TaxResult[] = Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => {
        let totalSales = 0;
        let totalProfit = 0;
        let totalTax = 0;
        let hasExemption = false;

        const breakdown: MonthlyTaxBreakdown = {
          stocks: { sales: 0, profit: 0, exempt: false, tax: 0 },
          fiis: { sales: 0, profit: 0, tax: 0 },
          fixedIncome: { sales: 0, profit: 0, tax: 0, rate: 0.15 },
          crypto: { sales: 0, profit: 0, exempt: false, tax: 0 },
          dayTrade: { sales: 0, profit: 0, tax: 0 },
        };

        // Process each category
        Object.entries(data.salesByCategory).forEach(([category, catData]) => {
          totalSales += catData.sales;
          totalProfit += catData.profit;

          if (category.includes('FII')) {
            breakdown.fiis.sales += catData.sales;
            breakdown.fiis.profit += catData.profit;
            if (catData.profit > 0) {
              const tax = catData.profit * 0.20;
              breakdown.fiis.tax += tax;
              totalTax += tax;
            }
          } else if (category === 'Renda Fixa' || category === 'Renda Fixa ETF') {
            breakdown.fixedIncome.sales += catData.sales;
            breakdown.fixedIncome.profit += catData.profit;
            if (catData.profit > 0) {
              const tax = catData.profit * 0.15; // Simplified: 15% (long term)
              breakdown.fixedIncome.tax += tax;
              totalTax += tax;
            }
          } else if (category === 'Cripto') {
            breakdown.crypto.sales += catData.sales;
            breakdown.crypto.profit += catData.profit;
            const exempt = isExempt(category, catData.sales, false);
            breakdown.crypto.exempt = exempt;
            if (catData.profit > 0 && !exempt) {
              const tax = catData.profit * 0.15;
              breakdown.crypto.tax += tax;
              totalTax += tax;
            }
            if (exempt) hasExemption = true;
          } else {
            // Ações (Swing Trade)
            breakdown.stocks.sales += catData.sales;
            breakdown.stocks.profit += catData.profit;
            const exempt = isExempt(category, catData.sales, false);
            breakdown.stocks.exempt = exempt;
            if (catData.profit > 0 && !exempt) {
              const tax = catData.profit * 0.15;
              breakdown.stocks.tax += tax;
              totalTax += tax;
            }
            if (exempt) hasExemption = true;
          }
        });

        // Apply loss carry-forward
        const taxableGain = Math.max(0, totalProfit - accumulatedLoss);
        const lossUsed = Math.min(accumulatedLoss, Math.max(0, totalProfit));
        const remainingLoss = accumulatedLoss - lossUsed;
        
        // Recalculate tax after loss offset (proportional reduction)
        let adjustedTax = totalTax;
        if (totalProfit > 0 && lossUsed > 0) {
          const ratio = 1 - (lossUsed / totalProfit);
          adjustedTax = totalTax * ratio;
        }

        // Update accumulated loss
        if (totalProfit < 0) {
          accumulatedLoss += Math.abs(totalProfit);
        } else if (lossUsed > 0) {
          accumulatedLoss = remainingLoss;
        }

        const effectiveRate = totalSales > 0 ? (adjustedTax / totalSales) * 100 : 0;

        return {
          month,
          salesTotal: totalSales,
          profit: totalProfit,
          lossCarriedForward: accumulatedLoss,
          taxableGain,
          taxDue: Math.max(0, adjustedTax),
          breakdown,
          hasExemption,
          effectiveRate,
        };
      });

    return results.reverse();
  }, [transactions, assets]);

  // Summary KPIs
  const summary = useMemo(() => {
    const totalTaxDue = monthlyTax.reduce((sum, m) => sum + m.taxDue, 0);
    const totalLossCarried = monthlyTax.length > 0 ? monthlyTax[0].lossCarriedForward : 0;
    const totalSales = monthlyTax.reduce((sum, m) => sum + m.salesTotal, 0);
    const totalProfit = monthlyTax.reduce((sum, m) => sum + m.profit, 0);
    const monthsWithExemption = monthlyTax.filter(m => m.hasExemption).length;

    return { totalTaxDue, totalLossCarried, totalSales, totalProfit, monthsWithExemption };
  }, [monthlyTax]);

  return { assetPositions, monthlyTax, summary };
};
