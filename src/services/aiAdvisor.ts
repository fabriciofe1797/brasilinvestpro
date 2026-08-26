import { MOCK_ASSETS } from '../data/mockData';
import i18n from '../i18n';

export interface InvestorProfile {
  riskTolerance: 'Conservador' | 'Moderado' | 'Agressivo';
  mainGoal: 'Reserva de Emergência' | 'Renda Passiva' | 'Crescimento Patrimonial' | 'Aposentadoria' | 'Curto Prazo';
  timeHorizon: 'Curto (até 2 anos)' | 'Médio (2 a 5 anos)' | 'Longo (5+ anos)';
  initialCapital: number;
  monthlyContribution: number;
  knowledgeLevel: 'Iniciante' | 'Intermediário' | 'Avançado';
  preferences: {
    wantsCrypto: boolean;
    acceptsVolatility: boolean;
    prefersPassiveIncome: boolean;
  };
}

export interface RecommendedAsset {
  ticker: string;
  name: string;
  price: number;
  quantity: number;
  total: number;
  reason: string;
  type: 'Stock' | 'FII' | 'FixedIncome' | 'Crypto' | 'ETF';
}

export interface AllocationRecommendation {
  assetClass: string;
  totalAmount: number;
  suggestions: RecommendedAsset[];
  rationale: string;
}

export interface InvestmentPlan {
  baseCapital: number;
  initialAllocationPlan: {
    assetClass: string;
    amount: number;
    percentage: number;
  }[];
  profileAnalysis: {
    title: string;
    description: string;
    warnings: string[];
  };
  allocationStrategy: {
    assetClass: string;
    percentage: number;
    reason: string;
    color: string;
  }[];
  monthlyContributionPlan: {
    assetClass: string;
    amount: number;
    percentage: number;
  }[];
  tacticalRecommendations: AllocationRecommendation[];
  steps: {
    order: number;
    title: string;
    description: string;
  }[];
  education: {
    title: string;
    content: string;
  }[];
}

// Helper to select best assets based on criteria
const selectTacticalAssets = (
    assetClass: string, 
    budget: number, 
    profile: InvestorProfile
): AllocationRecommendation => {
    const suggestions: RecommendedAsset[] = [];
    let rationale = '';

    // 1. Renda Fixa / Caixa
    if (assetClass.includes('Renda Fixa') || assetClass.includes('Caixa')) {
        const selicEtf = MOCK_ASSETS.find(a => a.ticker === 'IRFM11');
        const ipcaEtf = MOCK_ASSETS.find(a => a.ticker === 'IMAB11');

        let selicShare = 0.6;
        let ipcaShare = 0.4;

        if (profile.timeHorizon === 'Curto (até 2 anos)') {
            selicShare = 0.8;
            ipcaShare = 0.2;
        } else if (profile.timeHorizon === 'Longo (5+ anos)') {
            selicShare = 0.4;
            ipcaShare = 0.6;
        }

        if (profile.timeHorizon === 'Curto (até 2 anos)') {
            rationale = i18n.t('ai.advisor.tacRationaleShort');
        } else if (profile.timeHorizon === 'Longo (5+ anos)') {
            rationale = i18n.t('ai.advisor.tacRationaleLong');
        } else {
            rationale = i18n.t('ai.advisor.tacRationaleMedium');
        }

        const selicAmount = budget * selicShare;
        if (selicEtf && selicAmount > 0) {
            const qty = Math.max(1, Math.floor(selicAmount / selicEtf.price));
            suggestions.push({
                ticker: selicEtf.ticker,
                name: selicEtf.name,
                price: selicEtf.price,
                quantity: qty,
                total: qty * selicEtf.price,
                reason: i18n.t('ai.advisor.tacReasonSelic'),
                type: 'FixedIncome'
            });
        }

        const ipcaAmount = budget * ipcaShare;
        if (ipcaEtf && ipcaAmount > 0) {
            const qty = Math.max(1, Math.floor(ipcaAmount / ipcaEtf.price));
            suggestions.push({
                ticker: ipcaEtf.ticker,
                name: ipcaEtf.name,
                price: ipcaEtf.price,
                quantity: qty,
                total: qty * ipcaEtf.price,
                reason: i18n.t('ai.advisor.tacReasonIpca'),
                type: 'FixedIncome'
            });
        }
    }
    
    // 2. FIIs (Tijolo/Papel/Agro)
    else if (assetClass.includes('FII')) {
        rationale = i18n.t('ai.advisor.tacRationaleFiis');
        
        // Filter FIIs from Mock
        const candidates = MOCK_ASSETS.filter(a => a.category.includes('FII'));
        
        // Sort by Dividend Yield (Simple heuristic)
        candidates.sort((a, b) => b.dividendYield - a.dividendYield);
        
        // Pick Top 3 mixed (Paper/Brick)
        const topPicks = candidates.slice(0, 3);
        const amountPerAsset = budget / topPicks.length;

        topPicks.forEach(asset => {
            const qtd = Math.floor(amountPerAsset / asset.price);
            if (qtd > 0) {
                suggestions.push({
                    ticker: asset.ticker,
                    name: asset.name,
                    price: asset.price,
                    quantity: qtd,
                    total: qtd * asset.price,
                    reason: i18n.t('ai.advisor.tacReasonFii', { dy: asset.dividendYield, sector: asset.subCategory }),
                    type: 'FII'
                });
            }
        });
    }

    // 3. Ações
    else if (assetClass.includes('Ações')) {
        rationale = i18n.t('ai.advisor.tacRationaleStocks');
        
        let candidates = MOCK_ASSETS.filter(a => a.category.includes('Ações'));
        
        if (profile.riskTolerance === 'Conservador') {
             candidates = candidates.filter(a => ['Bancos', 'Elétricas', 'Seguradoras'].includes(a.subCategory));
        }

        // Priorizar ativos acessíveis para o orçamento atual
        // 1) Ordena por preço ascendente para garantir pelo menos 1 unidade
        candidates.sort((a, b) => a.price - b.price);

        // 2) Seleciona até 3, privilegiando os que cabem no orçamento por ativo
        const amountPerAsset = budget / 3;
        const affordable = candidates.filter(a => a.price <= amountPerAsset);
        const topPicks = (affordable.length > 0 ? affordable : candidates).slice(0, 3);

        topPicks.forEach(asset => {
            const qtd = Math.floor((budget / topPicks.length) / asset.price);
            if (qtd > 0) {
                suggestions.push({
                    ticker: asset.ticker,
                    name: asset.name,
                    price: asset.price,
                    quantity: qtd,
                    total: qtd * asset.price,
                    reason: i18n.t('ai.advisor.tacReasonStock', { sector: asset.subCategory }),
                    type: 'Stock'
                });
            } else {
                // Se o orçamento não permite comprar 1 unidade, sugerimos a "lista de preparação"
                suggestions.push({
                    ticker: asset.ticker,
                    name: asset.name,
                    price: asset.price,
                    quantity: 0,
                    total: 0,
                    reason: i18n.t('ai.advisor.tacReasonStockWait', { value: asset.price.toFixed(2), sector: asset.subCategory }),
                    type: 'Stock'
                });
            }
        });
    }

    // 4. Cripto
    else if (assetClass.includes('Cripto')) {
        rationale = i18n.t('ai.advisor.tacRationaleCrypto');
        
        const btc = MOCK_ASSETS.find(a => a.ticker === 'BTC');
        const eth = MOCK_ASSETS.find(a => a.ticker === 'ETH');
        
        if (btc && budget > 0) {
            const btcAlloc = budget * 0.7; // 70% BTC
            suggestions.push({
                ticker: 'BTC',
                name: 'Bitcoin',
                price: btc.price,
                quantity: Number((btcAlloc / btc.price).toFixed(6)),
                total: btcAlloc,
                reason: i18n.t('ai.advisor.tacReasonBtc'),
                type: 'Crypto'
            });
        }
        if (eth && budget > 0) {
            const ethAlloc = budget * 0.3; // 30% ETH
             suggestions.push({
                ticker: 'ETH',
                name: 'Ethereum',
                price: eth.price,
                quantity: Number((ethAlloc / eth.price).toFixed(6)),
                total: ethAlloc,
                reason: i18n.t('ai.advisor.tacReasonEth'),
                type: 'Crypto'
            });
        }
    }

    // 5. Internacional
    else if (assetClass.includes('Internacional')) {
        rationale = i18n.t('ai.advisor.tacRationaleIntl');
        const amount = budget;
        suggestions.push({
            ticker: 'IVVB11',
            name: 'iShares S&P 500',
            price: 300, // Approx
            quantity: Math.max(1, Math.floor(amount / 300)),
            total: amount,
            reason: i18n.t('ai.advisor.tacReasonSp500'),
            type: 'ETF'
        });
    }

    return {
        assetClass,
        totalAmount: budget,
        suggestions,
        rationale
    };
};

export const generateInvestmentPlan = (profile: InvestorProfile): InvestmentPlan => {
  const plan: InvestmentPlan = {
    baseCapital: profile.initialCapital,
    initialAllocationPlan: [],
    profileAnalysis: { title: '', description: '', warnings: [] },
    allocationStrategy: [],
    monthlyContributionPlan: [],
    tacticalRecommendations: [],
    steps: [],
    education: []
  };

  // --- Etapa 2: Análise do Perfil ---
  if (profile.riskTolerance === 'Conservador') {
    plan.profileAnalysis.title = i18n.t('ai.advisor.profileConservadorTitle');
    plan.profileAnalysis.description = i18n.t('ai.advisor.profileConservadorDesc');
    plan.profileAnalysis.warnings = [i18n.t('ai.advisor.profileConservadorWarn1'), i18n.t('ai.advisor.profileConservadorWarn2')];
  } else if (profile.riskTolerance === 'Moderado') {
    plan.profileAnalysis.title = i18n.t('ai.advisor.profileModeradoTitle');
    plan.profileAnalysis.description = i18n.t('ai.advisor.profileModeradoDesc');
    plan.profileAnalysis.warnings = [i18n.t('ai.advisor.profileModeradoWarn1'), i18n.t('ai.advisor.profileModeradoWarn2')];
  } else {
    plan.profileAnalysis.title = i18n.t('ai.advisor.profileAgressivoTitle');
    plan.profileAnalysis.description = i18n.t('ai.advisor.profileAgressivoDesc');
    plan.profileAnalysis.warnings = [i18n.t('ai.advisor.profileAgressivoWarn1'), i18n.t('ai.advisor.profileAgressivoWarn2')];
  }

  // --- Etapa 3: Estratégia de Alocação ---
  let allocation = [];
  
  if (profile.riskTolerance === 'Conservador') {
    allocation = [
      { assetClass: 'Renda Fixa / Caixa', percentage: 60, reason: i18n.t('ai.advisor.reasonSafetyLiquidity'), color: '#10B981' },
      { assetClass: 'FIIs (Tijolo/Papel)', percentage: 20, reason: i18n.t('ai.advisor.reasonFiiIncome'), color: '#3B82F6' },
      { assetClass: 'Ações Dividendos', percentage: 10, reason: i18n.t('ai.advisor.reasonDivStocks'), color: '#F59E0B' },
      { assetClass: 'Internacional', percentage: 10, reason: i18n.t('ai.advisor.reasonFxProtection'), color: '#8B5CF6' },
    ];
  } else if (profile.riskTolerance === 'Moderado') {
    allocation = [
      { assetClass: 'Renda Fixa / Caixa', percentage: 40, reason: i18n.t('ai.advisor.reasonStability'), color: '#10B981' },
      { assetClass: 'FIIs', percentage: 25, reason: i18n.t('ai.advisor.reasonIncomeEngine'), color: '#3B82F6' },
      { assetClass: 'Ações', percentage: 25, reason: i18n.t('ai.advisor.reasonGrowthDiv'), color: '#F59E0B' },
      { assetClass: 'Internacional/Stocks', percentage: 10, reason: i18n.t('ai.advisor.reasonGlobalCompanies'), color: '#8B5CF6' },
    ];
  } else {
    allocation = [
      { assetClass: 'Renda Fixa / Caixa', percentage: 20, reason: i18n.t('ai.advisor.reasonTacticalReserve'), color: '#10B981' },
      { assetClass: 'FIIs', percentage: 25, reason: i18n.t('ai.advisor.reasonSnowball'), color: '#3B82F6' },
      { assetClass: 'Ações Valor/Crescimento', percentage: 35, reason: i18n.t('ai.advisor.reasonMainEngine'), color: '#F59E0B' },
      { assetClass: 'Internacional', percentage: 20, reason: i18n.t('ai.advisor.reasonGlobalMandatory'), color: '#8B5CF6' },
    ];
  }

  // Ajuste Crypto
  if (profile.preferences.wantsCrypto) {
    const cryptoShare = profile.riskTolerance === 'Agressivo' ? 10 : (profile.riskTolerance === 'Moderado' ? 5 : 2);
    allocation.forEach(a => {
        a.percentage = a.percentage * (1 - (cryptoShare/100));
    });
    allocation.push({ 
        assetClass: 'Criptomoedas', 
        percentage: cryptoShare, 
        reason: i18n.t('ai.advisor.reasonCryptoAsymmetry'), 
        color: '#EC4899' 
    });
  }

  // Normalize percentages
  const totalAlloc = allocation.reduce((sum, a) => sum + a.percentage, 0);
  if (totalAlloc !== 100) {
      allocation[0].percentage += (100 - totalAlloc);
  }
  allocation.forEach(a => a.percentage = Math.round(a.percentage * 10) / 10);

  plan.allocationStrategy = allocation;

  plan.initialAllocationPlan = allocation.map(a => ({
    assetClass: a.assetClass,
    percentage: a.percentage,
    amount: (profile.initialCapital * a.percentage) / 100
  }));

  // --- Etapa 4: Plano de Aportes & Recomendações Táticas ---
  plan.monthlyContributionPlan = allocation.map(a => {
      const amount = (profile.monthlyContribution * a.percentage) / 100;
      
      // Generate Tactical Recommendations for this slice
      const recommendation = selectTacticalAssets(a.assetClass, amount, profile);
      plan.tacticalRecommendations.push(recommendation);

      return {
        assetClass: a.assetClass,
        percentage: a.percentage,
        amount: amount
      };
  });

  // --- Etapa 5: Prioridades ---
  if (profile.mainGoal === 'Reserva de Emergência') {
    plan.steps = [
      { order: 1, title: i18n.t('ai.advisor.stepEmergency1Title'), description: i18n.t('ai.advisor.stepEmergency1Desc') },
      { order: 2, title: i18n.t('ai.advisor.stepEmergency2Title'), description: i18n.t('ai.advisor.stepEmergency2Desc') },
      { order: 3, title: i18n.t('ai.advisor.stepEmergency3Title'), description: i18n.t('ai.advisor.stepEmergency3Desc') }
    ];
  } else if (profile.mainGoal === 'Renda Passiva') {
    plan.steps = [
      { order: 1, title: i18n.t('ai.advisor.stepIncome1Title'), description: i18n.t('ai.advisor.stepIncome1Desc') },
      { order: 2, title: i18n.t('ai.advisor.stepIncome2Title'), description: i18n.t('ai.advisor.stepIncome2Desc') },
      { order: 3, title: i18n.t('ai.advisor.stepIncome3Title'), description: i18n.t('ai.advisor.stepIncome3Desc') }
    ];
  } else {
    plan.steps = [
      { order: 1, title: i18n.t('ai.advisor.stepGrowth1Title'), description: i18n.t('ai.advisor.stepGrowth1Desc') },
      { order: 2, title: i18n.t('ai.advisor.stepGrowth2Title'), description: i18n.t('ai.advisor.stepGrowth2Desc') },
      { order: 3, title: i18n.t('ai.advisor.stepGrowth3Title'), description: i18n.t('ai.advisor.stepGrowth3Desc') }
    ];
  }

  // --- Etapa 6: Educação ---
  plan.education = [
    { title: i18n.t('ai.advisor.eduDivTitle'), content: i18n.t('ai.advisor.eduDivContent') },
    { title: i18n.t('ai.advisor.eduCompoundTitle'), content: i18n.t('ai.advisor.eduCompoundContent') },
    { title: i18n.t('ai.advisor.eduRiskTitle'), content: i18n.t('ai.advisor.eduRiskContent') }
  ];

  return plan;
};
