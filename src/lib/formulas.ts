import { Asset, PortfolioItem, CeilingPriceData, RankingEntry, PortfolioYieldOnCost } from '../types';

/**
 * Fórmula de Benjamin Graham
 * Preço Justo = RaizQuadrada(22.5 * LPA * VPA)
 * 
 * Como o sistema tem PL e PVP, derivamos:
 * LPA (Lucro por Ação) = Preço Atual / PL
 * VPA (Valor Patrimonial por Ação) = Preço Atual / PVP
 */
export const calculateGrahamPrice = (currentPrice: number, pl?: number, pvp?: number): number | null => {
  if (!pl || !pvp || pl <= 0 || pvp <= 0) return null;

  const lpa = currentPrice / pl;
  const vpa = currentPrice / pvp;
  
  // Graham Number = Sqrt(22.5 * Earnings Per Share * Book Value Per Share)
  return Math.sqrt(22.5 * lpa * vpa);
};

/**
 * Método de Décio Bazin
 * Preço Justo = Dividendos Anuais / Taxa de Retorno Mínima (geralmente 6%)
 */
export const calculateBazinPrice = (annualDividends: number, minRate: number = 0.06): number => {
  if (annualDividends <= 0) return 0;
  return annualDividends / minRate;
};

/**
 * Calcula o Yield on Cost
 * @param annualDividends - Valor total de proventos pagos por ação no ano
 * @param averagePrice - Seu preço médio de compra
 */
export const calculateYieldOnCost = (annualDividends: number, averagePrice: number): number => {
  if (averagePrice === 0) return 0;
  return (annualDividends / averagePrice) * 100;
};

// ─── PREÇO TETO (CEILING PRICE) ──────────────────────────────────────────────

/**
 * Preço Teto Clássico (Método Bazin / Barsi)
 * = DJA (Dividendo por Ação nos últimos 12 meses) / 0.06
 * 
 * O preço máximo a pagar para garantir 6% de retorno em dividendos.
 */
export const calculateClassicCeiling = (dividendPerShareAnnual: number, minRate: number = 0.06): number | null => {
  if (!dividendPerShareAnnual || dividendPerShareAnnual <= 0) return null;
  return dividendPerShareAnnual / minRate;
};

/**
 * Preço Teto Projetivo
 * Usa projeções de analistas para o próximo ano fiscal.
 * 
 * Fórmula: (Dividendo Projetado para próximos 12M) / 0.06
 * 
 * Como não temos dados reais de analistas, estimamos via:
 * - Último DY anual * fator de crescimento (baseado em tendência dos últimos dividendos)
 * - Se o ativo tem histórico de crescimento, aplica um fator de 1.05-1.15
 * - Se está em declínio, aplica fator de 0.85-0.95
 */
export const calculateProjectiveCeiling = (
  dividendPerShareAnnual: number,
  lastDividend: number,
  previousDividend?: number,
  minRate: number = 0.06
): number | null => {
  if (!dividendPerShareAnnual || dividendPerShareAnnual <= 0) return null;
  
  let growthFactor = 1.0;
  
  // Estima tendência baseado nos últimos dividendos
  if (previousDividend && previousDividend > 0 && lastDividend > 0) {
    const growth = (lastDividend - previousDividend) / previousDividend;
    // Limita o fator entre 0.85 e 1.20
    growthFactor = Math.max(0.85, Math.min(1.20, 1 + growth));
  }
  
  const projectedAnnual = dividendPerShareAnnual * growthFactor;
  return projectedAnnual / minRate;
};

/**
 * Preço Teto de Consenso (Market Consensus)
 * Baseado na média de múltiplas fontes:
 * - Preço Teto Clássico (Bazin)
 * - Preço de Graham
 * - P/VP justo = 1.0 (para FIIs)
 * 
 * É uma média ponderada dos métodos disponíveis.
 */
export const calculateConsensusCeiling = (
  classicCeiling: number | null,
  grahamPrice: number | null,
  pvp: number | undefined,
  currentPrice: number,
  isFII: boolean
): number | null => {
  const values: number[] = [];
  const weights: number[] = [];
  
  if (classicCeiling && classicCeiling > 0) {
    values.push(classicCeiling);
    weights.push(0.40); // Bazin tem maior peso para dividendos
  }
  
  if (grahamPrice && grahamPrice > 0) {
    values.push(grahamPrice);
    weights.push(0.30); // Graham complementa
  }
  
  if (isFII && pvp !== undefined) {
    // Para FIIs: preço justo = VPA (P/VP = 1.0)
    // VPA = Preço / PVP
    const fairValue = currentPrice / pvp;
    values.push(fairValue);
    weights.push(0.30);
  }
  
  if (values.length === 0) return null;
  
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const weightedSum = values.reduce((sum, v, i) => sum + v * weights[i], 0);
  
  return weightedSum / totalWeight;
};

/**
 * Calcula todos os preços-teto de uma vez
 */
export const calculateAllCeilingPrices = (asset: Asset): CeilingPriceData => {
  const annualDivPerShare = asset.price * (asset.dividendYield / 100);
  const isFII = asset.category.includes('FII');
  
  // Clássico (Bazin)
  const classicCeiling = calculateClassicCeiling(annualDivPerShare);
  
  // Graham (apenas para ações com PL e PVP)
  const grahamPrice = !isFII ? calculateGrahamPrice(asset.price, asset.pl, asset.pvp) : null;
  
  // Projetivo (usa último dividendo como proxy para tendência)
  const projectiveCeiling = calculateProjectiveCeiling(
    annualDivPerShare,
    asset.lastDividend,
    asset.lastDividend * 0.9, // Assume dividendo anterior 10% menor como proxy
  );
  
  // Consenso
  const consensusCeiling = calculateConsensusCeiling(
    classicCeiling,
    grahamPrice,
    asset.pvp,
    asset.price,
    isFII
  );
  
  // Upsides
  const upsideClassic = classicCeiling ? ((classicCeiling - asset.price) / asset.price) * 100 : 0;
  const upsideProjective = projectiveCeiling ? ((projectiveCeiling - asset.price) / asset.price) * 100 : 0;
  const upsideConsensus = consensusCeiling ? ((consensusCeiling - asset.price) / asset.price) * 100 : 0;
  const upsideGraham = grahamPrice ? ((grahamPrice - asset.price) / asset.price) * 100 : 0;
  
  // Veredito baseado na média dos upsides disponíveis
  const validUpsides = [upsideClassic, upsideProjective, upsideGraham].filter(u => u !== 0);
  const avgUpside = validUpsides.length > 0 
    ? validUpsides.reduce((a, b) => a + b, 0) / validUpsides.length 
    : 0;
  
  let verdict: CeilingPriceData['verdict'];
  let verdictLabel: string;
  
  if (avgUpside >= 15) {
    verdict = 'buy';
    verdictLabel = 'ceilingVerdict.buy';
  } else if (avgUpside >= -5) {
    verdict = 'hold';
    verdictLabel = 'ceilingVerdict.hold';
  } else if (avgUpside >= -20) {
    verdict = 'neutral';
    verdictLabel = 'ceilingVerdict.neutral';
  } else {
    verdict = 'sell';
    verdictLabel = 'ceilingVerdict.sell';
  }
  
  return {
    ticker: asset.ticker,
    classicCeiling,
    projectiveCeiling,
    consensusCeiling,
    grahamPrice,
    currentPrice: asset.price,
    upsideClassic,
    upsideProjective,
    upsideConsensus,
    upsideGraham,
    verdict,
    verdictLabel,
  };
};

// ─── YIELD ON COST (YoC) PORTFOLIO ──────────────────────────────────────────

/**
 * Calcula o Yield on Cost de toda a carteira
 */
export const calculatePortfolioYieldOnCost = (
  portfolio: PortfolioItem[],
  assets: Asset[]
): PortfolioYieldOnCost => {
  const perAsset: PortfolioYieldOnCost['perAsset'] = [];
  let totalInvested = 0;
  let totalAnnualDividends = 0;
  
  for (const item of portfolio) {
    const asset = assets.find(a => a.id === item.assetId || a.ticker === item.assetId);
    if (!asset) continue;
    
    const annualDivPerShare = asset.price * (asset.dividendYield / 100);
    const annualIncome = annualDivPerShare * item.quantity;
    const invested = item.averagePrice * item.quantity;
    const yoc = calculateYieldOnCost(annualDivPerShare, item.averagePrice);
    
    perAsset.push({
      assetId: item.assetId,
      ticker: asset.ticker,
      name: asset.name,
      averagePrice: item.averagePrice,
      quantity: item.quantity,
      annualDivPerShare,
      annualIncome,
      yieldOnCost: yoc,
      invested,
    });
    
    totalInvested += invested;
    totalAnnualDividends += annualIncome;
  }
  
  // Ordena por YoC decrescente
  perAsset.sort((a, b) => b.yieldOnCost - a.yieldOnCost);
  
  const yieldOnCost = totalInvested > 0 ? (totalAnnualDividends / totalInvested) * 100 : 0;
  const monthlyIncome = totalAnnualDividends / 12;
  
  return {
    totalInvested,
    annualDividends: totalAnnualDividends,
    yieldOnCost,
    monthlyIncome,
    perAsset,
  };
};

// ─── RANKING ─────────────────────────────────────────────────────────────────

/**
 * Gera ranking de ativos ordenados por score combinado
 * Score = DY (35%) + Upside Preço Teto (30%) + YoC (20%) + P/VP (15%)
 */
export const calculateRanking = (
  assets: Asset[],
  portfolio: PortfolioItem[]
): RankingEntry[] => {
  return assets
    .filter(a => a.dividendYield > 0 || a.category.includes('FII') || a.category === 'Ações Dividendos')
    .map(asset => {
      const position = portfolio.find(p => p.assetId === asset.id || p.assetId === asset.ticker);
      const annualDivPerShare = asset.price * (asset.dividendYield / 100);
      
      // Ceiling price
      const classicCeiling = calculateClassicCeiling(annualDivPerShare);
      const upsideClassic = classicCeiling ? ((classicCeiling - asset.price) / asset.price) * 100 : 0;
      
      // YoC
      const yoc = position ? calculateYieldOnCost(annualDivPerShare, position.averagePrice) : null;
      
      // Score components (0-100 each)
      const dyScore = Math.min(100, asset.dividendYield * 8); // DY 12.5% = 100
      const upsideScore = Math.max(0, Math.min(100, 50 + upsideClassic)); // -50% to +50% mapped to 0-100
      const yocScore = yoc ? Math.min(100, yoc * 5) : 0;
      
      let valuationScore = 50;
      if (asset.pvp !== undefined) {
        if (asset.pvp <= 0.85) valuationScore = 100;
        else if (asset.pvp <= 1.0) valuationScore = 80;
        else if (asset.pvp <= 1.1) valuationScore = 60;
        else if (asset.pvp > 1.3) valuationScore = 20;
      } else if (asset.pl !== undefined) {
        if (asset.pl > 0 && asset.pl <= 5) valuationScore = 100;
        else if (asset.pl <= 10) valuationScore = 80;
        else if (asset.pl <= 15) valuationScore = 60;
        else if (asset.pl > 25) valuationScore = 20;
      }
      
      const score = Math.round(
        dyScore * 0.35 +
        upsideScore * 0.30 +
        yocScore * 0.20 +
        valuationScore * 0.15
      );
      
      return {
        ticker: asset.ticker,
        name: asset.name,
        category: asset.category,
        price: asset.price,
        dividendYield: asset.dividendYield,
        ceilingClassic: classicCeiling,
        upsideClassic,
        yieldOnCost: yoc,
        pvp: asset.pvp,
        pl: asset.pl,
        score: Math.max(0, Math.min(100, score)),
        currency: asset.currency,
      };
    })
    .sort((a, b) => b.score - a.score);
};
