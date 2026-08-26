import { useMemo } from 'react';
import { useStore } from '../store/useStore';
import i18n from '../i18n';
import {
  calculateGrahamPrice,
  calculateBazinPrice,
  calculateClassicCeiling,
} from '../lib/formulas';

export interface TitanAnalystResult {
  assetId: string;
  ticker: string;
  name: string;
  score: number; // 0-100
  verdict: 'COMPRAR' | 'MANTER' | 'VENDER';
  pillars: {
    dividendos: number; // 0-100
    valuation: number;
    crescimento: number;
    solidez: number;
    momentum: number;
  };
  strengths: string[];
  weaknesses: string[];
  sectorComparison: {
    dy: number;
    sectorDY: number;
    pl: number;
    sectorPL: number;
    pvp: number;
    sectorPVP: number;
  };
  narrative: string;
}

/**
 * Titan Analyst — Análise profunda de um ativo com Score Titan (0-100)
 * 5 pilares: Dividendos, Valuation, Crescimento, Solidez, Momentum
 */
export const useTitanAnalyst = (assetId: string): TitanAnalystResult | null => {
  const { assets, portfolio } = useStore();

  return useMemo(() => {
    const asset = assets.find(a => a.id === assetId || a.ticker === assetId);
    if (!asset) return null;

    const position = portfolio.find(p => p.assetId === asset.id || p.assetId === asset.ticker);
    const isFII = asset.category.includes('FII');

    // ─── 1. Pilar Dividendos (0-100) ─────────────────────────────────────
    let dividendos = 0;
    const dy = asset.dividendYield;
    if (dy >= 12) dividendos = 100;
    else if (dy >= 10) dividendos = 90;
    else if (dy >= 8) dividendos = 80;
    else if (dy >= 6) dividendos = 70;
    else if (dy >= 4) dividendos = 55;
    else if (dy >= 2) dividendos = 35;
    else dividendos = 15;

    // Bônus se tem dividendos recorrentes (proxy: lastDividend > 0)
    if (asset.lastDividend > 0) dividendos = Math.min(100, dividendos + 10);

    // ─── 2. Pilar Valuation (0-100) ──────────────────────────────────────
    let valuation = 50;
    const annualDivPerShare = asset.price * (dy / 100);
    const grahamPrice = !isFII ? calculateGrahamPrice(asset.price, asset.pl, asset.pvp) : null;
    const bazinPrice = calculateBazinPrice(annualDivPerShare);
    const classicCeiling = calculateClassicCeiling(annualDivPerShare);

    let upsideGraham = 0;
    let upsideBazin = 0;
    let upsideClassic = 0;

    if (grahamPrice && grahamPrice > 0) {
      upsideGraham = ((grahamPrice - asset.price) / asset.price) * 100;
    }
    if (bazinPrice > 0) {
      upsideBazin = ((bazinPrice - asset.price) / asset.price) * 100;
    }
    if (classicCeiling && classicCeiling > 0) {
      upsideClassic = ((classicCeiling - asset.price) / asset.price) * 100;
    }

    // Média dos upsides
    const validUpsides = [upsideGraham, upsideBazin, upsideClassic].filter(u => u !== 0);
    const avgUpside = validUpsides.length > 0 ? validUpsides.reduce((a, b) => a + b, 0) / validUpsides.length : 0;

    if (avgUpside >= 30) valuation = 100;
    else if (avgUpside >= 20) valuation = 90;
    else if (avgUpside >= 10) valuation = 80;
    else if (avgUpside >= 0) valuation = 65;
    else if (avgUpside >= -10) valuation = 45;
    else if (avgUpside >= -20) valuation = 30;
    else valuation = 15;

    // P/VP bônus para FIIs
    if (isFII && asset.pvp !== undefined) {
      if (asset.pvp <= 0.85) valuation = Math.min(100, valuation + 15);
      else if (asset.pvp <= 1.0) valuation = Math.min(100, valuation + 10);
      else if (asset.pvp > 1.2) valuation = Math.max(0, valuation - 10);
    }

    // ─── 3. Pilar Crescimento (0-100) ────────────────────────────────────
    // Proxy: tendência de dividendos (lastDividend vs histórico)
    let crescimento = 50;
    if (asset.lastDividend > 0) {
      // Simulamos crescimento baseado no último dividendo vs média
      const proxyPreviousDiv = annualDivPerShare / 12; // média mensal
      if (asset.lastDividend > proxyPreviousDiv * 1.1) crescimento = 85;
      else if (asset.lastDividend > proxyPreviousDiv) crescimento = 70;
      else if (asset.lastDividend > proxyPreviousDiv * 0.9) crescimento = 55;
      else crescimento = 35;
    }

    // Bônus se P/L indica crescimento (P/L alto pode indicar expectativas)
    if (!isFII && asset.pl !== undefined) {
      if (asset.pl > 0 && asset.pl < 10) crescimento = Math.min(100, crescimento + 10);
      else if (asset.pl > 25) crescimento = Math.max(0, crescimento - 10);
    }

    // ─── 4. Pilar Solidez (0-100) ────────────────────────────────────────
    let solidez = 60;
    if (!isFII) {
      // P/L razoável indica solidez
      if (asset.pl !== undefined) {
        if (asset.pl > 0 && asset.pl <= 8) solidez += 20;
        else if (asset.pl <= 15) solidez += 10;
        else if (asset.pl > 30) solidez -= 15;
      }
      // P/VP razoável
      if (asset.pvp !== undefined) {
        if (asset.pvp > 0 && asset.pvp <= 1.5) solidez += 15;
        else if (asset.pvp > 3) solidez -= 10;
      }
    } else {
      // FIIs: P/VP é mais importante
      if (asset.pvp !== undefined) {
        if (asset.pvp > 0 && asset.pvp <= 1.0) solidez += 25;
        else if (asset.pvp <= 1.1) solidez += 15;
        else if (asset.pvp > 1.3) solidez -= 10;
      }
    }
    solidez = Math.max(0, Math.min(100, solidez));

    // ─── 5. Pilar Momentum (0-100) ───────────────────────────────────────
    // Proxy: variação recente de preço (lastClose vs currentPrice)
    let momentum = 50;
    const priceChange = ((asset.price - asset.lastClose) / asset.lastClose) * 100;
    if (priceChange >= 5) momentum = 90;
    else if (priceChange >= 2) momentum = 75;
    else if (priceChange >= 0) momentum = 60;
    else if (priceChange >= -2) momentum = 45;
    else if (priceChange >= -5) momentum = 30;
    else momentum = 15;

    // ─── Score Titan (média ponderada) ───────────────────────────────────
    const score = Math.round(
      dividendos * 0.30 +
      valuation * 0.25 +
      crescimento * 0.15 +
      solidez * 0.15 +
      momentum * 0.15
    );

    // ─── Veredito ─────────────────────────────────────────────────────────
    let verdict: 'COMPRAR' | 'MANTER' | 'VENDER';
    if (score >= 75 && valuation >= 70) verdict = 'COMPRAR';
    else if (score >= 50) verdict = 'MANTER';
    else verdict = 'VENDER';

    // ─── Pontos Fortes / Fracos ───────────────────────────────────────────
    const strengths: string[] = [];
    const weaknesses: string[] = [];

    if (dividendos >= 70) strengths.push(i18n.t('titanGen.strengthDy', { value: dy.toFixed(2) }));
    if (valuation >= 70) strengths.push(i18n.t('titanGen.strengthValuation'));
    if (crescimento >= 70) strengths.push(i18n.t('titanGen.strengthGrowth'));
    if (solidez >= 75) strengths.push(i18n.t('titanGen.strengthSolidity'));
    if (momentum >= 70) strengths.push(i18n.t('titanGen.strengthMomentum'));

    if (dividendos < 40) weaknesses.push(i18n.t('titanGen.weaknessDy'));
    if (valuation < 40) weaknesses.push(i18n.t('titanGen.weaknessValuation'));
    if (crescimento < 40) weaknesses.push(i18n.t('titanGen.weaknessGrowth'));
    if (solidez < 50) weaknesses.push(i18n.t('titanGen.weaknessSolidity'));
    if (momentum < 40) weaknesses.push(i18n.t('titanGen.weaknessMomentum'));

    // ─── Comparação com Setor (proxy) ─────────────────────────────────────
    // Setor proxy baseado em categoria
    const sectorDY = isFII ? 5.5 : 4.0;
    const sectorPL = isFII ? 0 : 12;
    const sectorPVP = isFII ? 1.0 : 1.5;

    const sectorComparison = {
      dy,
      sectorDY,
      pl: asset.pl || 0,
      sectorPL,
      pvp: asset.pvp || 0,
      sectorPVP,
    };

    // ─── Narrativa ────────────────────────────────────────────────────────
    let narrative = i18n.t('titanGen.narrativeStart', {
      ticker: asset.ticker,
      dy: dy.toFixed(2),
      position: dy > sectorDY ? i18n.t('titanGen.narrativeAbove') : i18n.t('titanGen.narrativeBelow'),
      sectorDy: sectorDY.toFixed(2),
    });

    if (verdict === 'COMPRAR') {
      narrative += i18n.t('titanGen.narrativeBuy', { score });
    } else if (verdict === 'MANTER') {
      narrative += i18n.t('titanGen.narrativeHold', { score });
    } else {
      narrative += i18n.t('titanGen.narrativeSell', { score });
    }

    if (position) {
      narrative += i18n.t('titanGen.narrativePosition', { qty: position.quantity, price: position.averagePrice.toFixed(2) });
    }

    return {
      assetId: asset.id,
      ticker: asset.ticker,
      name: asset.name,
      score,
      verdict,
      pillars: {
        dividendos,
        valuation,
        crescimento,
        solidez,
        momentum,
      },
      strengths,
      weaknesses,
      sectorComparison,
      narrative,
    };
  }, [assetId, assets, portfolio, i18n.language]);
};
