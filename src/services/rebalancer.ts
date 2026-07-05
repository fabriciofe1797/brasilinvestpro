import { InvestmentPlan } from './aiAdvisor';
import { PortfolioItem, Asset } from '../types';
import { applyTickerAlias } from '../lib/utils';

export interface RebalanceSuggestion {
  assetClass: string;
  currentAmount: number;
  currentPercentage: number;
  targetAmount: number;
  targetPercentage: number;
  difference: number; // Value to buy (positive) or sell (negative)
  action: 'BUY' | 'SELL' | 'HOLD';
  status: 'CRITICAL' | 'WARNING' | 'OK'; // Based on drift tolerance
}

export interface RebalanceResult {
  totalPortfolioValue: number;
  suggestions: RebalanceSuggestion[];
  score: number; // 0-100 adherence score
}

export const mapCategoryToClass = (category: string, subCategory?: string): string => {
  const cat = category.toLowerCase();
  const sub = subCategory?.toLowerCase() || '';

  if (cat.includes('fii')) return 'FIIs'; // FIIs (Tijolo/Papel)
  if (cat.includes('cripto') || cat.includes('crypto')) return 'Criptomoedas';
  if (cat.includes('ações') || cat.includes('stock')) {
      if (sub.includes('internacional') || sub.includes('bdr') || sub.includes('etf')) return 'Internacional';
      return 'Ações';
  }
  if (cat.includes('renda fixa') || cat.includes('tesouro') || cat.includes('cdb')) return 'Renda Fixa';
  
  // Default fallback mappings
  if (cat === 'outros') return 'Outros';
  
  return 'Outros'; // Unmapped assets
};

// Fuzzy match for AI Plan categories which might have descriptive names
const findTargetAllocation = (plan: InvestmentPlan, mappedClass: string): number => {
    // Normalize mapped class
    const key = mappedClass.toLowerCase();
    
    // Search in plan
    const target = plan.allocationStrategy.find(s => {
        const stratName = s.assetClass.toLowerCase();
        
        if (key === 'fiis' && stratName.includes('fii')) return true;
        if (key === 'ações' && stratName.includes('ações') && !stratName.includes('internacional')) return true;
        if (key === 'renda fixa' && (stratName.includes('renda fixa') || stratName.includes('caixa'))) return true;
        if (key === 'criptomoedas' && (stratName.includes('cripto'))) return true;
        if (key === 'internacional' && (stratName.includes('internacional') || stratName.includes('stocks'))) return true;
        
        return false;
    });

    return target ? target.percentage : 0;
};

export const calculateRebalancing = (
  portfolio: PortfolioItem[], 
  assets: Asset[],
  plan: InvestmentPlan | null
): RebalanceResult => {
  if (!plan) {
      return { totalPortfolioValue: 0, suggestions: [], score: 0 };
  }

  // 1. Calculate Current Totals by Class
  let totalValue = 0;
  const currentAllocation: Record<string, number> = {};

  portfolio.forEach(item => {
      const canonicalId = applyTickerAlias(item.assetId);
      const asset = assets.find(a => {
        const assetCanonical = applyTickerAlias(a.ticker);
        return a.id === item.assetId || assetCanonical === canonicalId;
      });
      const price = asset?.price || item.averagePrice;
      const value = item.quantity * price;
      
      totalValue += value;

      const mappedClass = mapCategoryToClass(asset?.category || '', asset?.subCategory);
      currentAllocation[mappedClass] = (currentAllocation[mappedClass] || 0) + value;
  });

  // 2. Generate Suggestions
  const suggestions: RebalanceSuggestion[] = [];
  let totalDeviation = 0;

  // Identify all unique classes (from both current and plan)
  const allKnownClasses = new Set<string>([
      'Renda Fixa', 'FIIs', 'Ações', 'Internacional', 'Criptomoedas'
  ]);

  Object.keys(currentAllocation).forEach(cls => {
    if (cls && cls !== 'Outros') {
      allKnownClasses.add(cls);
    }
  });

  allKnownClasses.forEach(assetClass => {
      const currentAmount = currentAllocation[assetClass] || 0;
      const currentPct = totalValue > 0 ? (currentAmount / totalValue) * 100 : 0;
      
      const targetPct = findTargetAllocation(plan, assetClass);
      const targetAmount = (totalValue * targetPct) / 100;
      
      const diff = targetAmount - currentAmount;
      const drift = Math.abs(currentPct - targetPct);

      let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
      if (drift > 2) { // 2% tolerance
          action = diff > 0 ? 'BUY' : 'SELL';
      }

      let status: 'CRITICAL' | 'WARNING' | 'OK' = 'OK';
      if (drift > 10) status = 'CRITICAL';
      else if (drift > 5) status = 'WARNING';

      // Only add suggestion if target is defined or we have holdings (to sell off)
      if (targetPct > 0 || currentAmount > 0) {
          suggestions.push({
              assetClass,
              currentAmount,
              currentPercentage: currentPct,
              targetAmount,
              targetPercentage: targetPct,
              difference: diff,
              action,
              status
          });
          
          totalDeviation += drift;
      }
  });

  // 3. Calculate Score (100 - average deviation)
  // Max deviation is theoretically 200 (100% wrong), but usually sum of diffs is 0% net, sum of abs drifts is max 200.
  // Let's simpler score: 100 - sum(drifts)/2. If sum drifts is 0, score 100. If 100% misplaced, sum drifts 200 -> score 0.
  const score = Math.max(0, 100 - (totalDeviation / 2));

  return {
      totalPortfolioValue: totalValue,
      suggestions,
      score
  };
};
