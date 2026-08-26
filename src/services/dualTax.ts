// ─── Tipos ───────────────────────────────────────────────────────────────────

import i18n from '../i18n';

export type TaxCountry = 'BR' | 'PT';
export type ResidenceStatus = 'resident' | 'non-resident';

export interface TaxResidence {
  country: TaxCountry;
  status: ResidenceStatus;
}

export interface DualTaxConfig {
  brResidence: TaxResidence;
  ptResidence: TaxResidence;
  nhrRegime: boolean;
  nhrType?: 'old' | 'new'; // old = regime antigo (0%), new = 2024+ (20%)
}

export interface CategoryTax {
  category: string;
  sales: number;
  profit: number;
  dividends: number;
  taxRate: number;
  taxDue: number;
  exempt: boolean;
  exemptionReason?: string;
}

export interface TaxCredit {
  incomeType: string;
  brTaxPaid: number;
  ptTaxDue: number;
  creditAllowed: number;
  netPT: number;
}

export interface DualTaxResult {
  month: string;
  brazil: {
    taxByCategory: CategoryTax[];
    totalTax: number;
    darf: number;
    exemptions: string[];
  };
  portugal: {
    taxByCategory: CategoryTax[];
    totalTax: number;
    irs: number;
    exemptions: string[];
  };
  treaty: {
    credits: TaxCredit[];
    doubleTaxRelief: number;
    netLiability: number;
  };
  totalBurden: number;
  effectiveRate: number;
  optimization: { suggestion: string; savings: number }[];
}

export interface DualTaxSummary {
  totalBrazil: number;
  totalPortugal: number;
  totalCredits: number;
  totalBurden: number;
  effectiveRate: number;
  withoutTreaty: number;
  savings: number;
  monthlyResults: DualTaxResult[];
}

export interface DeclarationItem {
  country: TaxCountry;
  form: string;
  deadline: string;
  items: { description: string; required: boolean; details: string }[];
}

// ─── Constantes Fiscais ──────────────────────────────────────────────────────

// Brasil
const BR_STOCK_EXEMPTION = 20000; // Isenção ações vendas ≤ R$20k/mês
const BR_CRYPTO_EXEMPTION = 35000; // Isenção cripto vendas ≤ R$35k/mês
const BR_STOCK_RATE = 0.15;
const BR_FII_RATE = 0.20;
const BR_CRYPTO_RATE = 0.15;
const BR_FIXED_INCOME_RATE = 0.15; // Simplificado (regressiva 15-22.5%)

// Portugal
const PT_FLAT_RATE = 0.28;
const PT_CRYPTO_HOLD_EXEMPTION = 365; // dias
const PT_NHR_FLAT_RATE = 0.20;

// Tratado BR-PT
const TREATY_DIVIDEND_WHT = 0.15; // 15% withholding no BR
const TREATY_CAPITAL_GAINS_RESIDENCE = true; // Tributado no país de residência

// ─── Cálculo Brasil ──────────────────────────────────────────────────────────

export const calculateBrazilTax = (
  salesByCategory: Record<string, { sales: number; profit: number; dividends: number }>,
  accumulatedLoss: number
): { taxByCategory: CategoryTax[]; totalTax: number; exemptions: string[]; lossUsed: number } => {
  const taxByCategory: CategoryTax[] = [];
  let totalTax = 0;
  const exemptions: string[] = [];
  let lossUsed = 0;

  let remainingLoss = accumulatedLoss;

  for (const [category, data] of Object.entries(salesByCategory)) {
    let taxRate = BR_STOCK_RATE;
    let exempt = false;
    let exemptionReason: string | undefined;

    // Determinar alíquota e isenção por categoria
    if (category.includes('FII')) {
      taxRate = BR_FII_RATE;
    } else if (category === 'Renda Fixa' || category === 'Renda Fixa ETF') {
      taxRate = BR_FIXED_INCOME_RATE;
    } else if (category === 'Cripto') {
      taxRate = BR_CRYPTO_RATE;
      if (data.sales <= BR_CRYPTO_EXEMPTION) {
        exempt = true;
        exemptionReason = i18n.t('taxGen.exemptSalesMonth', { value: BR_CRYPTO_EXEMPTION.toLocaleString(i18n.language) });
        exemptions.push(i18n.t('taxGen.brCryptoExemption', { value: data.sales.toLocaleString(i18n.language, { style: 'currency', currency: 'BRL' }) }));
      }
    } else {
      // Ações
      taxRate = BR_STOCK_RATE;
      if (data.sales <= BR_STOCK_EXEMPTION) {
        exempt = true;
        exemptionReason = i18n.t('taxGen.exemptSalesMonth', { value: BR_STOCK_EXEMPTION.toLocaleString(i18n.language) });
        exemptions.push(i18n.t('taxGen.brStockExemption', { value: data.sales.toLocaleString(i18n.language, { style: 'currency', currency: 'BRL' }) }));
      }
    }

    // Aplicar prejuízo acumulado
    let taxableProfit = data.profit;
    if (remainingLoss > 0 && taxableProfit > 0) {
      const lossToUse = Math.min(remainingLoss, taxableProfit);
      taxableProfit -= lossToUse;
      remainingLoss -= lossToUse;
      lossUsed += lossToUse;
    }

    const taxDue = exempt ? 0 : Math.max(0, taxableProfit * taxRate);
    totalTax += taxDue;

    taxByCategory.push({
      category,
      sales: data.sales,
      profit: data.profit,
      dividends: data.dividends,
      taxRate,
      taxDue,
      exempt,
      exemptionReason,
    });
  }

  // Dividendos (isentos no BR para PF)
  const totalDividends = Object.values(salesByCategory).reduce((s, d) => s + d.dividends, 0);
  if (totalDividends > 0) {
    taxByCategory.push({
      category: 'Dividendos',
      sales: 0,
      profit: 0,
      dividends: totalDividends,
      taxRate: 0,
      taxDue: 0,
      exempt: true,
      exemptionReason: i18n.t('taxGen.brDividendReason'),
    });
    exemptions.push(i18n.t('taxGen.brDividendExemption'));
  }

  return { taxByCategory, totalTax, exemptions, lossUsed };
};

// ─── Cálculo Portugal ────────────────────────────────────────────────────────

export const calculatePortugalTax = (
  salesByCategory: Record<string, { sales: number; profit: number; dividends: number; holdingDays?: number }>,
  config: DualTaxConfig
): { taxByCategory: CategoryTax[]; totalTax: number; exemptions: string[] } => {
  const taxByCategory: CategoryTax[] = [];
  let totalTax = 0;
  const exemptions: string[] = [];

  const flatRate = config.nhrRegime
    ? (config.nhrType === 'old' ? 0 : PT_NHR_FLAT_RATE)
    : PT_FLAT_RATE;

  for (const [category, data] of Object.entries(salesByCategory)) {
    let taxRate = flatRate;
    let exempt = false;
    let exemptionReason: string | undefined;

    // Regras específicas de Portugal
    if (category === 'Cripto') {
      if (data.holdingDays && data.holdingDays > PT_CRYPTO_HOLD_EXEMPTION) {
        exempt = true;
        exemptionReason = i18n.t('taxGen.ptCryptoHoldReason');
        exemptions.push(i18n.t('taxGen.ptCryptoHoldExemption'));
      } else {
        taxRate = PT_FLAT_RATE;
      }
    }

    // NHR regime antigo: dividendos e juros 0%
    if (config.nhrRegime && config.nhrType === 'old') {
      if (category === 'Dividendos') {
        exempt = true;
        exemptionReason = i18n.t('taxGen.ptNhrDivReason');
        exemptions.push(i18n.t('taxGen.ptNhrDivExemption'));
      }
    }

    // Ganho de capital: tributado no país de residência (PT) se tratado aplica
    const capitalGainsTax = exempt ? 0 : Math.max(0, data.profit * taxRate);
    const dividendsTax = (category === 'Dividendos' && exempt) ? 0 : data.dividends * taxRate;

    totalTax += capitalGainsTax + dividendsTax;

    taxByCategory.push({
      category,
      sales: data.sales,
      profit: data.profit,
      dividends: data.dividends,
      taxRate,
      taxDue: capitalGainsTax + dividendsTax,
      exempt,
      exemptionReason,
    });
  }

  return { taxByCategory, totalTax, exemptions };
};

// ─── Cálculo do Tratado ──────────────────────────────────────────────────────

export const calculateTreatyCredit = (
  brTax: CategoryTax[],
  ptTax: CategoryTax[],
  config: DualTaxConfig
): { credits: TaxCredit[]; doubleTaxRelief: number; netLiability: number } => {
  const credits: TaxCredit[] = [];
  let doubleTaxRelief = 0;

  for (const brCat of brTax) {
    if (brCat.taxDue <= 0 && brCat.dividends <= 0) continue;

    const ptCat = ptTax.find(p => p.category === brCat.category);
    if (!ptCat) continue;

    // Para ganhos de capital: tributado no país de residência
    if (!brCat.category.includes('Dividendos') && TREATY_CAPITAL_GAINS_RESIDENCE) {
      if (config.ptResidence.status === 'resident') {
        // Residente em PT: PT tributa, BR só tributa se não-isento
        const credit = Math.min(brCat.taxDue, ptCat.taxDue);
        if (credit > 0) {
          credits.push({
            incomeType: brCat.category,
            brTaxPaid: brCat.taxDue,
            ptTaxDue: ptCat.taxDue,
            creditAllowed: credit,
            netPT: ptCat.taxDue - credit,
          });
          doubleTaxRelief += credit;
        }
      }
    }

    // Para dividendos: crédito do withholding brasileiro
    if (brCat.category === 'Dividendos' && brCat.dividends > 0) {
      const brWithholding = brCat.dividends * TREATY_DIVIDEND_WHT;
      const ptDue = ptCat.taxDue;
      const credit = Math.min(brWithholding, ptDue);

      credits.push({
        incomeType: 'Dividendos',
        brTaxPaid: brWithholding,
        ptTaxDue: ptDue,
        creditAllowed: credit,
        netPT: ptDue - credit,
      });
      doubleTaxRelief += credit;
    }
  }

  const totalPT = ptTax.reduce((s, c) => s + c.taxDue, 0);
  const netLiability = totalPT - doubleTaxRelief;

  return { credits, doubleTaxRelief, netLiability: Math.max(0, netLiability) };
};

// ─── Cálculo Dual Completo ───────────────────────────────────────────────────

interface TransactionInput {
  date: string;
  assetId: string;
  type: 'BUY' | 'SELL' | 'DIVIDEND';
  quantity: number;
  price: number;
  fees: number;
  total: number;
}

interface AssetInput {
  id: string;
  ticker: string;
  category: string;
  price: number;
}

export const calculateDualTax = (
  transactions: TransactionInput[],
  assets: AssetInput[],
  config: DualTaxConfig
): DualTaxResult[] => {
  // Agrupar transações por mês
  const monthlyData: Record<string, {
    salesByCategory: Record<string, { sales: number; profit: number; dividends: number; holdingDays?: number }>;
  }> = {};

  const positions: Record<string, { quantity: number; totalCost: number; firstBuyDate: string }> = {};
  const sortedTxs = [...transactions].sort((a, b) => a.date.localeCompare(b.date));

  sortedTxs.forEach(tx => {
    const month = tx.date.substring(0, 7);
    if (!monthlyData[month]) {
      monthlyData[month] = { salesByCategory: {} };
    }

    const asset = assets.find(a => a.id === tx.assetId || a.ticker === tx.assetId);
    const category = asset?.category || 'Ações Dividendos';

    if (!positions[tx.assetId]) {
      positions[tx.assetId] = { quantity: 0, totalCost: 0, firstBuyDate: tx.date };
    }

    if (tx.type === 'BUY') {
      positions[tx.assetId].quantity += tx.quantity;
      positions[tx.assetId].totalCost += tx.total;
      if (!positions[tx.assetId].firstBuyDate) {
        positions[tx.assetId].firstBuyDate = tx.date;
      }
    } else if (tx.type === 'SELL') {
      const pos = positions[tx.assetId];
      if (pos.quantity > 0) {
        const avgPrice = pos.totalCost / pos.quantity;
        const costOfSold = avgPrice * tx.quantity;
        const netProceeds = (tx.price * tx.quantity) - tx.fees;
        const profit = netProceeds - costOfSold;
        const salesValue = tx.price * tx.quantity;

        // Calcular holding period para cripto
        const holdingDays = Math.floor(
          (new Date(tx.date).getTime() - new Date(pos.firstBuyDate).getTime()) / (1000 * 60 * 60 * 24)
        );

        const key = category;
        if (!monthlyData[month].salesByCategory[key]) {
          monthlyData[month].salesByCategory[key] = { sales: 0, profit: 0, dividends: 0 };
        }
        monthlyData[month].salesByCategory[key].sales += salesValue;
        monthlyData[month].salesByCategory[key].profit += profit;
        if (category === 'Cripto') {
          monthlyData[month].salesByCategory[key].holdingDays = holdingDays;
        }

        pos.quantity -= tx.quantity;
        pos.totalCost -= costOfSold;
      }
    } else if (tx.type === 'DIVIDEND') {
      const key = 'Dividendos';
      if (!monthlyData[month].salesByCategory[key]) {
        monthlyData[month].salesByCategory[key] = { sales: 0, profit: 0, dividends: 0 };
      }
      monthlyData[month].salesByCategory[key].dividends += tx.total;
    }
  });

  // Calcular mês a mês
  let accumulatedLossBR = 0;
  const results: DualTaxResult[] = [];

  for (const [month, data] of Object.entries(monthlyData).sort(([a], [b]) => a.localeCompare(b))) {
    // Brasil
    const brResult = calculateBrazilTax(data.salesByCategory, accumulatedLossBR);
    accumulatedLossBR -= brResult.lossUsed;
    if (brResult.taxByCategory.some(c => c.profit < 0)) {
      accumulatedLossBR += Math.abs(brResult.taxByCategory.filter(c => c.profit < 0).reduce((s, c) => s + c.profit, 0));
    }

    // Portugal
    const ptResult = calculatePortugalTax(data.salesByCategory, config);

    // Tratado
    const treatyResult = calculateTreatyCredit(brResult.taxByCategory, ptResult.taxByCategory, config);

    const totalSales = Object.values(data.salesByCategory).reduce((s, d) => s + d.sales, 0);
    const totalBurden = brResult.totalTax + treatyResult.netLiability;
    const effectiveRate = totalSales > 0 ? (totalBurden / totalSales) * 100 : 0;

    // Otimizações
    const optimization = getOptimizationSuggestions(data.salesByCategory, brResult, ptResult);

    results.push({
      month,
      brazil: {
        taxByCategory: brResult.taxByCategory,
        totalTax: brResult.totalTax,
        darf: brResult.totalTax,
        exemptions: brResult.exemptions,
      },
      portugal: {
        taxByCategory: ptResult.taxByCategory,
        totalTax: ptResult.totalTax,
        irs: treatyResult.netLiability,
        exemptions: ptResult.exemptions,
      },
      treaty: treatyResult,
      totalBurden,
      effectiveRate,
      optimization,
    });
  }

  return results.reverse();
};

// ─── Otimizações ─────────────────────────────────────────────────────────────

const getOptimizationSuggestions = (
  salesByCategory: Record<string, { sales: number; profit: number; dividends: number; holdingDays?: number }>,
  _brResult: { taxByCategory: CategoryTax[]; totalTax: number },
  _ptResult: { taxByCategory: CategoryTax[]; totalTax: number }
): { suggestion: string; savings: number }[] => {
  const suggestions: { suggestion: string; savings: number }[] = [];

  // Verificar isenção de ações no BR
  for (const [cat, data] of Object.entries(salesByCategory)) {
    if (!cat.includes('FII') && cat !== 'Renda Fixa' && cat !== 'Renda Fixa ETF' && cat !== 'Cripto' && cat !== 'Dividendos') {
      if (data.sales > BR_STOCK_EXEMPTION) {
        const excess = data.sales - BR_STOCK_EXEMPTION;
        const savings = excess * BR_STOCK_RATE;
        suggestions.push({
          suggestion: i18n.t('taxGen.optStockExemption', { value: excess.toLocaleString(i18n.language) }),
          savings,
        });
      }
    }

    // Cripto: manter >365 dias para isenção PT
    if (cat === 'Cripto' && data.holdingDays !== undefined && data.holdingDays <= PT_CRYPTO_HOLD_EXEMPTION) {
      const daysLeft = PT_CRYPTO_HOLD_EXEMPTION - data.holdingDays;
      const savings = data.profit * PT_FLAT_RATE;
      suggestions.push({
        suggestion: i18n.t('taxGen.optCryptoHold', { days: daysLeft }),
        savings,
      });
    }
  }

  return suggestions;
};

// ─── Guia de Declaração ──────────────────────────────────────────────────────

export const generateDeclarationGuide = (config: DualTaxConfig): DeclarationItem[] => {
  const guide: DeclarationItem[] = [];

  // Brasil - DIRPF
  guide.push({
    country: 'BR',
    form: i18n.t('taxGen.brForm'),
    deadline: i18n.t('taxGen.brDeadline'),
    items: [
      { description: i18n.t('taxGen.brItem1Desc'), required: true, details: i18n.t('taxGen.brItem1Details') },
      { description: i18n.t('taxGen.brItem2Desc'), required: true, details: i18n.t('taxGen.brItem2Details') },
      { description: i18n.t('taxGen.brItem3Desc'), required: true, details: i18n.t('taxGen.brItem3Details') },
      { description: i18n.t('taxGen.brItem4Desc'), required: true, details: i18n.t('taxGen.brItem4Details') },
      { description: i18n.t('taxGen.brItem5Desc'), required: config.ptResidence.status === 'resident', details: i18n.t('taxGen.brItem5Details') },
      { description: i18n.t('taxGen.brItem6Desc'), required: config.ptResidence.status === 'resident', details: i18n.t('taxGen.brItem6Details') },
    ],
  });

  // Portugal - IRS
  guide.push({
    country: 'PT',
    form: i18n.t('taxGen.ptForm'),
    deadline: i18n.t('taxGen.ptDeadline'),
    items: [
      { description: i18n.t('taxGen.ptItem1Desc'), required: true, details: i18n.t('taxGen.ptItem1Details') },
      { description: i18n.t('taxGen.ptItem2Desc'), required: true, details: i18n.t('taxGen.ptItem2Details') },
      { description: i18n.t('taxGen.ptItem3Desc'), required: true, details: i18n.t('taxGen.ptItem3Details') },
      { description: i18n.t('taxGen.ptItem4Desc'), required: true, details: i18n.t('taxGen.ptItem4Details') },
      { description: i18n.t('taxGen.ptItem5Desc'), required: config.nhrRegime, details: i18n.t('taxGen.ptItem5Details') },
      { description: i18n.t('taxGen.ptItem6Desc'), required: config.nhrRegime && config.nhrType === 'old', details: i18n.t('taxGen.ptItem6Details') },
    ],
  });

  return guide;
};

// ─── Comparativo Sem Tratado ─────────────────────────────────────────────────

export const calculateWithoutTreaty = (results: DualTaxResult[]): number => {
  // Sem tratado: soma simples de BR + PT sem créditos
  return results.reduce((sum, r) => sum + r.brazil.totalTax + r.portugal.totalTax, 0);
};

// ─── Configuração Padrão ─────────────────────────────────────────────────────

import { getUserData, setUserData } from './userData';

export const getDefaultConfig = (): DualTaxConfig => ({
  brResidence: { country: 'BR', status: 'non-resident' },
  ptResidence: { country: 'PT', status: 'resident' },
  nhrRegime: false,
  nhrType: 'new',
});

const DUAL_TAX_KEY = 'dual_tax_config';

export const loadDualTaxConfig = async (token: string): Promise<DualTaxConfig> => {
  try {
    const data = await getUserData(token, [DUAL_TAX_KEY]);
    if (data[DUAL_TAX_KEY]) {
      return data[DUAL_TAX_KEY] as DualTaxConfig;
    }
  } catch { /* ignore */ }
  return getDefaultConfig();
};

export const saveDualTaxConfig = async (token: string, config: DualTaxConfig): Promise<void> => {
  await setUserData(token, [{ data_key: DUAL_TAX_KEY, data_value: config }]);
};
