import { describe, it, expect } from 'vitest';
import {
  calculateGrahamPrice,
  calculateBazinPrice,
  calculateYieldOnCost,
  calculateClassicCeiling,
  calculateProjectiveCeiling,
  calculateConsensusCeiling,
  calculateAllCeilingPrices,
  calculatePortfolioYieldOnCost,
} from './formulas';
import type { Asset, PortfolioItem } from '../types';

// Helper: ativo mínimo para testes
const makeAsset = (overrides: Partial<Asset>): Asset =>
  ({
    id: 'test-id',
    ticker: 'TEST11',
    name: 'Ativo Teste',
    category: 'FII Tijolo',
    subCategory: 'Logística',
    price: 100,
    lastClose: 100,
    lastDividend: 1,
    dividendYield: 12,
    pvp: undefined,
    pl: undefined,
    currency: 'BRL',
    magicNumber: 100,
    ...overrides,
  }) as Asset;

describe('calculateGrahamPrice', () => {
  it('calcula sqrt(22.5 * LPA * VPA) a partir de PL e PVP', () => {
    // preço 100, PL 10 → LPA 10; PVP 1 → VPA 100 → sqrt(22500) = 150
    expect(calculateGrahamPrice(100, 10, 1)).toBeCloseTo(150, 5);
  });

  it('retorna null quando PL ou PVP ausentes/inválidos', () => {
    expect(calculateGrahamPrice(100, undefined, 1)).toBeNull();
    expect(calculateGrahamPrice(100, 10, undefined)).toBeNull();
    expect(calculateGrahamPrice(100, 0, 1)).toBeNull();
  });
});

describe('calculateBazinPrice', () => {
  it('divide dividendos anuais pela taxa mínima (6% default)', () => {
    expect(calculateBazinPrice(6)).toBeCloseTo(100, 5);
  });

  it('retorna 0 para dividendos não positivos', () => {
    expect(calculateBazinPrice(0)).toBe(0);
    expect(calculateBazinPrice(-1)).toBe(0);
  });

  it('aceita taxa customizada', () => {
    expect(calculateBazinPrice(5, 0.05)).toBeCloseTo(100, 5);
  });
});

describe('calculateYieldOnCost', () => {
  it('calcula provento anual sobre preço médio', () => {
    expect(calculateYieldOnCost(6, 50)).toBeCloseTo(12, 5);
  });

  it('protege contra divisão por zero', () => {
    expect(calculateYieldOnCost(6, 0)).toBe(0);
  });
});

describe('calculateClassicCeiling', () => {
  it('DJA ÷ 6%', () => {
    expect(calculateClassicCeiling(6)).toBeCloseTo(100, 5);
  });

  it('retorna null para dividendo zero/negativo', () => {
    expect(calculateClassicCeiling(0)).toBeNull();
    expect(calculateClassicCeiling(-2)).toBeNull();
  });
});

describe('calculateProjectiveCeiling', () => {
  it('sem histórico anterior, usa fator 1.0', () => {
    expect(calculateProjectiveCeiling(6, 1)).toBeCloseTo(100, 5);
  });

  it('aplica fator de crescimento limitado a 1.20', () => {
    // crescimento 100% (0.5 → 1.0) seria fator 2.0, mas clamp em 1.20
    expect(calculateProjectiveCeiling(6, 1, 0.5)).toBeCloseTo(120, 5);
  });

  it('aplica fator de queda limitado a 0.85', () => {
    // queda de 90% (10 → 1) seria fator 0.10, mas clamp em 0.85
    expect(calculateProjectiveCeiling(6, 1, 10)).toBeCloseTo(85, 5);
  });
});

describe('calculateConsensusCeiling', () => {
  it('média ponderada quando todos os métodos disponíveis (FII)', () => {
    // classic 100 (peso 0.4), graham null, VPA = 100/0.8 = 125 (peso 0.3)
    const result = calculateConsensusCeiling(100, null, 0.8, 100, true);
    const expected = (100 * 0.4 + 125 * 0.3) / 0.7;
    expect(result).toBeCloseTo(expected, 5);
  });

  it('inclui Graham para ações', () => {
    const result = calculateConsensusCeiling(100, 150, undefined, 100, false);
    const expected = (100 * 0.4 + 150 * 0.3) / 0.7;
    expect(result).toBeCloseTo(expected, 5);
  });

  it('retorna null sem nenhuma fonte', () => {
    expect(calculateConsensusCeiling(null, null, undefined, 100, false)).toBeNull();
  });
});

describe('calculateAllCeilingPrices', () => {
  it('classifica como buy quando upside médio >= 15%', () => {
    // DY 12% de preço 100 → DJA 12 → teto 200 → upside +100%
    const asset = makeAsset({ price: 100, dividendYield: 12 });
    const result = calculateAllCeilingPrices(asset);
    expect(result.classicCeiling).toBeCloseTo(200, 5);
    expect(result.verdict).toBe('buy');
  });

  it('classifica como sell quando muito sobrevalorizado', () => {
    // DY 3% → DJA 3 → teto 50 → upside -50%
    const asset = makeAsset({ price: 100, dividendYield: 3 });
    const result = calculateAllCeilingPrices(asset);
    expect(result.upsideClassic).toBeLessThan(-20);
    expect(result.verdict).toBe('sell');
  });

  it('inclui Graham apenas para não-FIIs', () => {
    const fii = calculateAllCeilingPrices(makeAsset({ category: 'FII Papel', pl: 10, pvp: 1 }));
    expect(fii.grahamPrice).toBeNull();

    const stock = calculateAllCeilingPrices(
      makeAsset({ category: 'Ações Dividendos', pl: 10, pvp: 1 })
    );
    expect(stock.grahamPrice).toBeCloseTo(150, 5);
  });
});

describe('calculatePortfolioYieldOnCost', () => {
  it('agrega renda anual e YoC da carteira', () => {
    const assets = [makeAsset({ id: 'a1', ticker: 'TEST11', price: 100, dividendYield: 12 })];
    const portfolio = [{ assetId: 'a1', quantity: 10, averagePrice: 80 }] as PortfolioItem[];

    const result = calculatePortfolioYieldOnCost(portfolio, assets);
    expect(result.totalInvested).toBeCloseTo(800, 5);
    expect(result.annualDividends).toBeCloseTo(120, 5); // 10 cotas * 12/cota
    expect(result.yieldOnCost).toBeCloseTo(15, 5);       // 120 / 800
    expect(result.monthlyIncome).toBeCloseTo(10, 5);
    expect(result.perAsset).toHaveLength(1);
  });

  it('ignora posições sem ativo correspondente', () => {
    const portfolio = [{ assetId: 'inexistente', quantity: 10, averagePrice: 80 }] as PortfolioItem[];
    const result = calculatePortfolioYieldOnCost(portfolio, []);
    expect(result.totalInvested).toBe(0);
    expect(result.perAsset).toHaveLength(0);
  });
});
