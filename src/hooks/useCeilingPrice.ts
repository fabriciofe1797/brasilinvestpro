import { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { MOCK_ASSETS } from '../data/mockData';
import { Asset, CeilingPriceData, RankingEntry, PortfolioYieldOnCost } from '../types';
import {
  calculateAllCeilingPrices,
  calculatePortfolioYieldOnCost,
  calculateRanking,
} from '../lib/formulas';

/**
 * Hook central para cálculos de Preço Teto e Yield on Cost.
 * Usado pela CeilingPricePage, AssetDetailsPage e AssetCard.
 */
export function useCeilingPrice() {
  const { assets, portfolio } = useStore();

  // Merge user assets + mock catalog
  const allAssets = useMemo(() => {
    const map = new Map<string, Asset>();
    MOCK_ASSETS.forEach(a => map.set(a.id, a));
    assets.forEach(a => map.set(a.id, a));
    return Array.from(map.values());
  }, [assets]);

  // Ceiling prices para todos os ativos
  const ceilingPrices = useMemo<Map<string, CeilingPriceData>>(() => {
    const map = new Map<string, CeilingPriceData>();
    allAssets.forEach(asset => {
      map.set(asset.ticker, calculateAllCeilingPrices(asset));
    });
    return map;
  }, [allAssets]);

  // Ranking geral
  const ranking = useMemo<RankingEntry[]>(() => {
    return calculateRanking(allAssets, portfolio);
  }, [allAssets, portfolio]);

  // YoC do portfólio
  const portfolioYieldOnCost = useMemo<PortfolioYieldOnCost>(() => {
    return calculatePortfolioYieldOnCost(portfolio, allAssets);
  }, [portfolio, allAssets]);

  // Helper: obter ceiling de um ativo específico
  const getCeilingPrice = (ticker: string): CeilingPriceData | null => {
    return ceilingPrices.get(ticker) || null;
  };

  // Top 5 oportunidades (maior upside no preço-teto clássico)
  const topOpportunities = useMemo(() => {
    return ranking
      .filter(r => r.upsideClassic > 0)
      .slice(0, 5);
  }, [ranking]);

  // Top 5 por YoC (apenas ativos que o usuário possui)
  const topYieldOnCost = useMemo(() => {
    return portfolioYieldOnCost.perAsset
      .filter(a => a.yieldOnCost > 0)
      .slice(0, 5);
  }, [portfolioYieldOnCost]);

  // Ativos abaixo do preço-teto (oportunidades de compra)
  const belowCeiling = useMemo(() => {
    return Array.from(ceilingPrices.values())
      .filter(cp => cp.upsideClassic > 10)
      .sort((a, b) => b.upsideClassic - a.upsideClassic);
  }, [ceilingPrices]);

  // Ativos acima do preço-teto (sinal de venda)
  const aboveCeiling = useMemo(() => {
    return Array.from(ceilingPrices.values())
      .filter(cp => cp.upsideClassic < -10)
      .sort((a, b) => a.upsideClassic - b.upsideClassic);
  }, [ceilingPrices]);

  return {
    allAssets,
    ceilingPrices,
    ranking,
    portfolioYieldOnCost,
    getCeilingPrice,
    topOpportunities,
    topYieldOnCost,
    belowCeiling,
    aboveCeiling,
  };
}
