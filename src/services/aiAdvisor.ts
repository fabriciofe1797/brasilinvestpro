import { MOCK_ASSETS } from '../data/mockData';

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
            rationale = 'Segurança e liquidez são prioridade aqui. Como seu horizonte é curto, privilegiamos mais Selic (IRFM11) e menos IPCA (IMAB11).';
        } else if (profile.timeHorizon === 'Longo (5+ anos)') {
            rationale = 'Segurança continua importante, mas como seu horizonte é longo, aumentamos a fatia em IPCA (IMAB11) para reforçar a proteção contra a inflação.';
        } else {
            rationale = 'Equilíbrio entre liquidez e proteção. Com horizonte médio, dividimos Renda Fixa entre Selic (IRFM11) e IPCA (IMAB11).';
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
                reason: 'Exposição a títulos públicos de renda fixa para reserva e colchão de segurança.',
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
                reason: 'Proteção contra inflação usando ETF de títulos indexados ao IPCA.',
                type: 'FixedIncome'
            });
        }
    }
    
    // 2. FIIs (Tijolo/Papel/Agro)
    else if (assetClass.includes('FII')) {
        rationale = 'Seleção dos melhores Fundos Imobiliários com foco em P/VP justo e dividendos consistentes.';
        
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
                    reason: `DY: ${asset.dividendYield}% | Setor: ${asset.subCategory}`,
                    type: 'FII'
                });
            }
        });
    }

    // 3. Ações
    else if (assetClass.includes('Ações')) {
        rationale = 'Empresas perenes (Bancos, Elétricas, Seguradoras) que pagam bons dividendos e têm lucro consistente.';
        
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
                    reason: `Setor Perene (${asset.subCategory}). Foco em Dividendos.`,
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
                    reason: `Aguarde acumular ~${asset.price.toFixed(2)} para comprar 1 unidade. (${asset.subCategory})`,
                    type: 'Stock'
                });
            }
        });
    }

    // 4. Cripto
    else if (assetClass.includes('Cripto')) {
        rationale = 'Exposição assimétrica. Apenas Bitcoin e Ethereum para segurança, fugindo de "shitcoins".';
        
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
                reason: 'Ouro digital. Reserva de valor descentralizada.',
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
                reason: 'Plataforma de contratos inteligentes.',
                type: 'Crypto'
            });
        }
    }

    // 5. Internacional
    else if (assetClass.includes('Internacional')) {
        rationale = 'Diversificação global via BDRs de ETFs para dolarizar o patrimônio.';
        const amount = budget;
        suggestions.push({
            ticker: 'IVVB11',
            name: 'iShares S&P 500',
            price: 300, // Approx
            quantity: Math.max(1, Math.floor(amount / 300)),
            total: amount,
            reason: 'Exposição às 500 maiores empresas dos EUA (S&P 500).',
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
    plan.profileAnalysis.title = 'Preservação de Capital';
    plan.profileAnalysis.description = 'Seu foco principal é não perder dinheiro. Você prioriza segurança sobre rentabilidade explosiva.';
    plan.profileAnalysis.warnings = ['Cuidado com a inflação corroendo seu poder de compra no longo prazo.', 'Evite produtos complexos que você não entende.'];
  } else if (profile.riskTolerance === 'Moderado') {
    plan.profileAnalysis.title = 'Equilíbrio Inteligente';
    plan.profileAnalysis.description = 'Você aceita oscilações moderadas em troca de retornos acima da inflação. Busca o meio-termo entre segurança e crescimento.';
    plan.profileAnalysis.warnings = ['Não se assuste com quedas pontuais do mercado.', 'Mantenha a disciplina nos aportes.'];
  } else {
    plan.profileAnalysis.title = 'Crescimento Agressivo';
    plan.profileAnalysis.description = 'Você tem estômago para volatilidade e foco total no longo prazo. Aceita ver seu patrimônio cair temporariamente para buscar multiplicação futura.';
    plan.profileAnalysis.warnings = ['Alta volatilidade é garantida. Não venda no fundo.', 'Diversificação é sua única proteção real.'];
  }

  // --- Etapa 3: Estratégia de Alocação ---
  let allocation = [];
  
  if (profile.riskTolerance === 'Conservador') {
    allocation = [
      { assetClass: 'Renda Fixa / Caixa', percentage: 60, reason: 'Bloco de segurança e liquidez imediata.', color: '#10B981' },
      { assetClass: 'FIIs (Tijolo/Papel)', percentage: 20, reason: 'Renda recorrente com volatilidade moderada.', color: '#3B82F6' },
      { assetClass: 'Ações Dividendos', percentage: 10, reason: 'Exposição controlada a empresas sólidas que pagam proventos.', color: '#F59E0B' },
      { assetClass: 'Internacional', percentage: 10, reason: 'Proteção cambial e diversificação geográfica.', color: '#8B5CF6' },
    ];
  } else if (profile.riskTolerance === 'Moderado') {
    allocation = [
      { assetClass: 'Renda Fixa / Caixa', percentage: 40, reason: 'Estabilidade e colchão para oportunidades.', color: '#10B981' },
      { assetClass: 'FIIs', percentage: 25, reason: 'Motor de renda passiva mensal.', color: '#3B82F6' },
      { assetClass: 'Ações', percentage: 25, reason: 'Crescimento do patrimônio com dividendos.', color: '#F59E0B' },
      { assetClass: 'Internacional/Stocks', percentage: 10, reason: 'Exposição às maiores empresas do mundo.', color: '#8B5CF6' },
    ];
  } else {
    allocation = [
      { assetClass: 'Renda Fixa / Caixa', percentage: 20, reason: 'Reserva tática para volatilidade e oportunidades.', color: '#10B981' },
      { assetClass: 'FIIs', percentage: 25, reason: 'Renda para reinvestimento e efeito bola de neve.', color: '#3B82F6' },
      { assetClass: 'Ações Valor/Crescimento', percentage: 35, reason: 'Principal motor de multiplicação de capital.', color: '#F59E0B' },
      { assetClass: 'Internacional', percentage: 20, reason: 'Diversificação geográfica obrigatória e proteção cambial.', color: '#8B5CF6' },
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
        reason: 'Assimetria de risco (alto potencial/alto risco).', 
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
      { order: 1, title: 'Focar na Renda Fixa', description: 'Seu objetivo nº 1 é ter 6 meses de custo de vida em liquidez diária (CDB, Tesouro Selic).' },
      { order: 2, title: 'Começar FIIs devagar', description: 'Apenas após ter 3 meses de reserva, inicie aportes em FIIs de tijolo para sentir o mercado.' },
      { order: 3, title: 'Estudo Contínuo', description: 'Enquanto monta a reserva, estude sobre ações para a próxima fase.' }
    ];
  } else if (profile.mainGoal === 'Renda Passiva') {
    plan.steps = [
      { order: 1, title: 'Base de FIIs', description: 'Priorize FIIs de Tijolo e Papel High Grade para gerar fluxo de caixa mensal imediato.' },
      { order: 2, title: 'Reinvestimento', description: 'Use os dividendos recebidos para comprar mais cotas (Bola de Neve).' },
      { order: 3, title: 'Ações de Dividendos', description: 'Adicione empresas perenes (Bancos, Elétricas) para diversificar a fonte de renda.' }
    ];
  } else {
    plan.steps = [
      { order: 1, title: 'Diversificação Estrutural', description: 'Monte a carteira comprando um pouco de cada classe todos os meses.' },
      { order: 2, title: 'Aportes Constantes', description: 'Não tente acertar o "timing". O tempo de mercado ganha do timing de mercado.' },
      { order: 3, title: 'Rebalanceamento', description: 'A cada 6 meses, venda o que subiu demais e compre o que ficou para trás.' }
    ];
  }

  // --- Etapa 6: Educação ---
  plan.education = [
    { title: 'Diversificação', content: 'É o único "almoço grátis" do mercado. Nunca coloque todos os ovos na mesma cesta.' },
    { title: 'Juros Compostos', content: 'Seu dinheiro trabalha para você. No começo é lento, mas após 5-10 anos a curva se torna exponencial.' },
    { title: 'Risco vs Retorno', content: 'Não existe retorno alto sem risco alto. Se alguém prometer lucro garantido, é golpe.' }
  ];

  return plan;
};
