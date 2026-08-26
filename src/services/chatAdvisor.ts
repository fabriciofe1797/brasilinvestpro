import { Asset, PortfolioItem } from '../types';
import { calculateClassicCeiling } from '../lib/formulas';

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  context?: string; // Resumo do contexto usado
}

export interface ChatContext {
  portfolio: PortfolioItem[];
  assets: Asset[];
  totalMarketValue: number;
  totalInvested: number;
  totalProfitLoss: number;
  totalProfitLossPct: number;
  monthlyIncome: number;
  streak: number;
  healthScore: number;
  topAssets: { ticker: string; weight: number; profitLossPct: number; dividendYield: number }[];
  categoryBreakdown: { category: string; weight: number }[];
}

// ─── Intents ─────────────────────────────────────────────────────────────────

type IntentHandler = (ctx: ChatContext, match: RegExpMatchArray) => string;

const formatBRL = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatPct = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;

const intentHandlers: { pattern: RegExp; handler: IntentHandler }[] = [
  // ─── Portfolio Overview ────────────────────────────────────────────────
  {
    pattern: /(?:como\s+(?:esta|vai|anda)|status|resumo|panorama|minha\s+carteira|portfolio)/i,
    handler: (ctx) => {
      if (ctx.portfolio.length === 0) {
        return 'Sua carteira esta vazia no momento. Adicione ativos comecando por um aporte!';
      }
      return `Sua carteira tem **${ctx.portfolio.length} ativos** com valor total de **${formatBRL(ctx.totalMarketValue)}**.\n\n` +
        `P/L Total: **${formatBRL(ctx.totalProfitLoss)}** (${formatPct(ctx.totalProfitLossPct)})\n` +
        `Renda Mensal Projetada: **${formatBRL(ctx.monthlyIncome)}**\n` +
        `Health Score: **${ctx.healthScore}/100**\n` +
        `Streak de Aportes: **${ctx.streak} meses**\n\n` +
        `Top 3 ativos por peso:\n` +
        ctx.topAssets.slice(0, 3).map((a, i) =>
          `${i + 1}. **${a.ticker}** — ${a.weight.toFixed(1)}% | P/L: ${formatPct(a.profitLossPct)} | DY: ${a.dividendYield.toFixed(1)}%`
        ).join('\n');
    },
  },

  // ─── P/L ───────────────────────────────────────────────────────────────
  {
    pattern: /(?:p\/?l|profit|lucro|prejuizo|rentabilidade|performance|resultado)/i,
    handler: (ctx) => {
      if (ctx.portfolio.length === 0) {
        return 'Voce ainda nao tem posicoes para calcular P/L.';
      }
      const emoji = ctx.totalProfitLoss >= 0 ? '📈' : '📉';
      let response = `${emoji} **Resultado da Carteira:**\n\n`;
      response += `Total Investido: ${formatBRL(ctx.totalInvested)}\n`;
      response += `Valor de Mercado: ${formatBRL(ctx.totalMarketValue)}\n`;
      response += `**P/L Total: ${formatBRL(ctx.totalProfitLoss)} (${formatPct(ctx.totalProfitLossPct)})**\n\n`;

      const winners = ctx.topAssets.filter(a => a.profitLossPct > 0).sort((a, b) => b.profitLossPct - a.profitLossPct);
      const losers = ctx.topAssets.filter(a => a.profitLossPct < 0).sort((a, b) => a.profitLossPct - b.profitLossPct);

      if (winners.length > 0) {
        response += `Melhores:\n`;
        response += winners.slice(0, 3).map(a => `  ✅ ${a.ticker}: ${formatPct(a.profitLossPct)}`).join('\n');
        response += '\n';
      }
      if (losers.length > 0) {
        response += `Piores:\n`;
        response += losers.slice(0, 3).map(a => `  ❌ ${a.ticker}: ${formatPct(a.profitLossPct)}`).join('\n');
      }

      return response;
    },
  },

  // ─── Dividendos / Renda ────────────────────────────────────────────────
  {
    pattern: /(?:dividendo|dividendos|dy|yield|renda|rendimento|provento|pagamento)/i,
    handler: (ctx) => {
      if (ctx.portfolio.length === 0) {
        return 'Sem ativos na carteira para gerar dividendos. Foque em FIIs e acoes dividendeiras!';
      }
      const annualIncome = ctx.monthlyIncome * 12;
      const weightedDY = ctx.topAssets.reduce((sum, a) => sum + a.dividendYield * (a.weight / 100), 0);

      let response = `💰 **Resumo de Dividendos:**\n\n`;
      response += `Renda Mensal Projetada: **${formatBRL(ctx.monthlyIncome)}**\n`;
      response += `Renda Anual Projetada: **${formatBRL(annualIncome)}**\n`;
      response += `DY Medio Ponderado: **${weightedDY.toFixed(2)}%**\n\n`;

      response += `Ativos mais dividendendeiros:\n`;
      const divAssets = [...ctx.topAssets].sort((a, b) => b.dividendYield - a.dividendYield);
      response += divAssets.slice(0, 5).map(a =>
        `  • **${a.ticker}**: DY ${a.dividendYield.toFixed(1)}% → ${formatBRL(a.dividendYield / 100 * ctx.totalMarketValue * (a.weight / 100) / 12)}/mes`
      ).join('\n');

      if (weightedDY < 4) {
        response += '\n\n_Dica: Para aumentar sua renda, considere adicionar mais FIIs ou acoes com DY acima de 6%._';
      } else if (weightedDY >= 6) {
        response += '\n\n_Excelente! Seu DY medio esta acima de 6%. Continue reinvestindo para o efeito bola de neve!_';
      }

      return response;
    },
  },

  // ─── Health Score ──────────────────────────────────────────────────────
  {
    pattern: /(?:health\s*score|saude|score|como\s+esta\s+a\s+carteira)/i,
    handler: (ctx) => {
      if (ctx.healthScore === 0) {
        return 'Adicione ativos a carteira para calcular seu Health Score.';
      }
      let label: string;
      let emoji: string;
      if (ctx.healthScore >= 80) { label = 'Excelente'; emoji = '🏆'; }
      else if (ctx.healthScore >= 60) { label = 'Saudavel'; emoji = '✅'; }
      else if (ctx.healthScore >= 40) { label = 'Atencao'; emoji = '⚠️'; }
      else { label = 'Critico'; emoji = '🚨'; }

      let response = `${emoji} **Health Score: ${ctx.healthScore}/100** (${label})\n\n`;
      response += `O score e calculado com base em 4 pilares:\n`;
      response += `• **Diversificacao**: ${ctx.portfolio.length} ativos em ${ctx.categoryBreakdown.length} categorias\n`;
      response += `• **Rendimento**: DY medio ${ctx.topAssets.reduce((s, a) => s + a.dividendYield * (a.weight / 100), 0).toFixed(1)}%\n`;
      response += `• **Valuation**: Analise de preco teto vs preco atual\n`;
      response += `• **Disciplina**: ${ctx.streak} meses consecutivos de aportes\n\n`;

      if (ctx.healthScore < 60) {
        response += `_Dica: Foque em diversificar (minimo 5 ativos em 3+ categorias) e manter aportes mensais regulares._`;
      } else if (ctx.healthScore < 80) {
        response += `_Bom trabalho! Para melhorar, aumente a diversificacao e mantenha a consistencia nos aportes._`;
      } else {
        response += `_Parabens! Sua carteira esta em excelente estado. Continue com a estrategia!_`;
      }

      return response;
    },
  },

  // ─── Sugestao de Aporte ────────────────────────────────────────────────
  {
    pattern: /(?:sugestao|sugerir|onde\s+investir|o\s+que\s+comprar|aporte|recomendacao|dica)/i,
    handler: (ctx) => {
      // Find assets below ceiling price
      const opportunities: { ticker: string; upside: number; dy: number }[] = [];

      for (const asset of ctx.assets) {
        const annualDiv = asset.price * (asset.dividendYield / 100);
        const ceiling = calculateClassicCeiling(annualDiv);
        if (!ceiling) continue;
        const upside = ((ceiling - asset.price) / asset.price) * 100;
        if (upside >= 10) {
          opportunities.push({ ticker: asset.ticker, upside, dy: asset.dividendYield });
        }
      }

      opportunities.sort((a, b) => b.upside - a.upside);

      let response = `💡 **Sugestoes de Aporte:**\n\n`;

      if (opportunities.length === 0) {
        response += 'No momento, nao encontrei ativos com desconto significativo vs preco teto.\n';
        response += '_Dica: Aguarde correcoes do mercado ou avalie FIIs de papel com DY acima de 10%._';
        return response;
      }

      response += `Ativos abaixo do preco teto (modelo Bazin):\n\n`;
      response += opportunities.slice(0, 5).map((o, i) =>
        `${i + 1}. **${o.ticker}** — ${o.upside.toFixed(0)}% abaixo do teto | DY: ${o.dy.toFixed(1)}%`
      ).join('\n');

      // Check category concentration
      if (ctx.categoryBreakdown.length > 0) {
        const topCat = ctx.categoryBreakdown[0];
        if (topCat.weight > 50) {
          response += `\n\n⚠️ _Atencao: ${topCat.category} representa ${topCat.weight.toFixed(0)}% da carteira. Considere diversificar._`;
        }
      }

      return response;
    },
  },

  // ─── Analise de Ativo ──────────────────────────────────────────────────
  {
    pattern: /(?:analise|analisar|avalie|vale\s+a\s+pena|opinao)\s+([A-Z]{3,6}\d?)/i,
    handler: (ctx, match) => {
      const ticker = match[1]?.toUpperCase();
      const asset = ctx.assets.find(a => a.ticker.toUpperCase() === ticker);

      if (!asset) {
        return `Nao encontrei dados para **${ticker}**. Verifique o ticker e tente novamente.`;
      }

      const annualDiv = asset.price * (asset.dividendYield / 100);
      const ceiling = calculateClassicCeiling(annualDiv);
      const upside = ceiling ? ((ceiling - asset.price) / asset.price) * 100 : 0;

      const position = ctx.portfolio.find(p => p.assetId === asset.id || p.assetId === asset.ticker);

      let response = `📊 **Analise de ${asset.ticker}** — ${asset.name}\n\n`;
      response += `Preco Atual: **${formatBRL(asset.price)}**\n`;
      response += `Categoria: ${asset.category} / ${asset.subCategory}\n`;
      response += `Dividend Yield: **${asset.dividendYield.toFixed(2)}%**\n`;

      if (ceiling) {
        response += `Preco Teto (Bazin): **${formatBRL(ceiling)}** (${upside >= 0 ? '+' : ''}${upside.toFixed(1)}%)\n`;
      }

      if (asset.pvp !== undefined) {
        response += `P/VP: ${asset.pvp.toFixed(2)}\n`;
      }
      if (asset.pl !== undefined) {
        response += `P/L: ${asset.pl.toFixed(2)}\n`;
      }

      // Verdict
      if (upside >= 15) {
        response += `\n✅ **Veredito: OPORTUNIDADE** — Ativo com ${upside.toFixed(0)}% de desconto vs preco teto.`;
      } else if (upside >= -5) {
        response += `\n⚖️ **Veredito: NEUTRO** — Ativo no limiar do preco teto. Avalie outros criterios.`;
      } else {
        response += `\n⚠️ **Veredito: ATENCAO** — Ativo acima do preco teto. Pode estar sobrevalorizado.`;
      }

      if (position) {
        response += `\n\n_Voce possui ${position.quantity} cotas de ${asset.ticker}._`;
      } else {
        response += `\n\n_Voce nao possui posicao em ${asset.ticker}._`;
      }

      return response;
    },
  },

  // ─── Educacional ───────────────────────────────────────────────────────
  {
    pattern: /(?:o\s+que\s+e|explain|explique|como\s+funciona|me\s+ensina)\s*(DY|dividend\s*yield|preco\s+teto|graham|bazin|cdi|selic|p\/?vp|p\/?l|magic\s+number|bola\s+de\s+neve|streak|health\s*score)?/i,
    handler: (ctx, match) => {
      const topic = (match[1] || '').toLowerCase().replace(/\s/g, '');

      const topics: Record<string, string> = {
        'dy': '**Dividend Yield (DY)** e a relacao entre os dividendos pagos por uma empresa e o preco da sua acao.\n\nFormula: `DY = (Dividendo Anual / Preco) x 100`\n\nUm DY de 6% significa que para cada R$ 100 investidos, voce recebe R$ 6 por ano em dividendos.',
        'dividendyield': '**Dividend Yield (DY)** e a relacao entre os dividendos pagos por uma empresa e o preco da sua acao.\n\nFormula: `DY = (Dividendo Anual / Preco) x 100`\n\nUm DY de 6% significa que para cada R$ 100 investidos, voce recebe R$ 6 por ano.',
        'precoteto': '**Preco Teto** e o preco maximo recomendado para comprar uma acao, baseado no metodo de Bazin.\n\nFormula: `Preco Teto = DJA / 0.06`\n\nOnde DJA e o Dividendo por Acao dos ultimos 12 meses. Se o preco atual esta abaixo do preco teto, o ativo e considerado uma oportunidade.',
        'graham': '**Formula de Graham** calcula o preco justo de uma acao.\n\nFormula: `Preco = Raiz(22.5 x LPA x VPA)`\n\nOnde LPA = Lucro por Acao e VPA = Valor Patrimonial por Acao. E um metodo conservador de valuation.',
        'bazin': '**Metodo Bazin** (ou Barsi) define o preco teto para acoes dividendeiras.\n\nFormula: `Preco Teto = DJA / 0.06`\n\nSignifica que voce so deve comprar se o DY no seu preco for de pelo menos 6%. E o metodo principal do AutoInvest.',
        'cdi': '**CDI** (Certificado de Deposicoes Interbancarios) e a taxa base da renda fixa no Brasil.\n\nAtualmente em ~13.25% ao ano. E usado como benchmark: se seu investimento nao rende pelo menos o CDI, esta perdendo para a renda fixa.',
        'selic': '**Taxa Selic** e a taxa basica de juros da economia, definida pelo COPOM a cada 45 dias.\n\nE o parametro mais importante para investimentos no Brasil. Quando a Selic sobe, renda fixa fica mais atrativa. Quando cai, acoes e FIIs tendem a valorizar.',
        'pvp': '**P/VP** (Preco sobre Valor Patrimonial) indica se um FII ou acao esta caro ou barato vs seu patrimonio.\n\nP/VP = 1.0 significa que o preco e igual ao valor patrimonial. Abaixo de 1.0 pode indicar desconto. Para FIIs, P/VP < 0.85 e geralmente considerado bom.',
        'pl': '**P/L** (Preco sobre Lucro) indica em quantos anos o investimento se paga com o lucro da empresa.\n\nP/L = 10 significa que a empresa lucra 10% do seu valor de mercado por ano. P/L entre 5 e 15 e geralmente considerado justo para empresas maduras.',
        'magicnumber': '**Magic Number** e o numero de cotas necessario para que os dividendos de um ativo comprem 1 cota adicional por ano.\n\nFormula: `Magic Number = 1 / DY`\n\nExemplo: Se o DY e 8%, voce precisa de ~12.5 cotas para o "efeito bola de neve". Quanto antes atingir, mais rapido o patrimonio cresce.',
        'boladeneve': '**Efeito Bola de Neve** e o reinvestimento dos dividendos para comprar mais cotas, gerando mais dividendos no futuro.\n\nE o principio fundamental da renda passiva: no inicio e lento, mas apos 5-10 anos a curva se torna exponencial. O AutoInvest calcula automaticamente seu progresso via Magic Number.',
        'streak': '**Streak** e a sequencia de meses consecutivos com aportes. Manter um streak longo demonstra disciplina e e um dos pilares do Health Score.\n\n3+ meses: Bom\n6+ meses: Muito bom\n12+ meses: Excelente!',
        'healthscore': '**Health Score** e um score 0-100 que avalia a saude da sua carteira em 4 pilares:\n\n1. **Diversificacao** (25%): Numero de ativos e distribuicao por categoria\n2. **Rendimento** (25%): DY medio da carteira\n3. **Valuation** (25%): % ativos abaixo do preco teto\n4. **Disciplina** (25%): Regularidade de aportes (streak)',
      };

      const key = topic || 'default';
      if (topics[key]) {
        return topics[key];
      }

      return `Posso explicar varios conceitos financeiros! Tente perguntar sobre:\n\n• **DY / Dividend Yield** — Rendimento em dividendos\n• **Preco Teto / Bazin** — Valuation para dividendeiros\n• **Graham** — Formula de preco justo\n• **P/VP e P/L** — Multiplos de valuation\n• **CDI e Selic** — Taxas de referencia\n• **Magic Number** — Efeito bola de neve\n• **Health Score** — Saude da carteira\n• **Streak** — Disciplina de aportes`;
    },
  },

  // ─── Aportes / Streak ──────────────────────────────────────────────────
  {
    pattern: /(?:streak|sequencia|aportes?|disciplina|contribuicao|mensal)/i,
    handler: (ctx) => {
      if (ctx.streak === 0) {
        return `📅 **Streak de Aportes: 0 meses**\n\nVoce ainda nao aportou este mes. Mantenha a disciplina! Aportes regulares sao a chave para o sucesso no longo prazo.\n\n_Dica: Configure um valor fixo mensal e automatize se possivel._`;
      }
      return `🔥 **Streak de Aportes: ${ctx.streak} meses consecutivos!**\n\n${ctx.streak >= 12 ? '🏆 Incrivel! Voce e um exemplo de disciplina!' :
        ctx.streak >= 6 ? '👏 Excelente! Continue assim!' :
        ctx.streak >= 3 ? '✅ Bom trabalho! Mantenha o ritmo!' :
        '👍 Bom inicio! Continue consistente!'}`;
    },
  },

  // ─── Diversificacao ────────────────────────────────────────────────────
  {
    pattern: /(?:diversific|distribuicao|alocacao|peso|categoria|setor)/i,
    handler: (ctx) => {
      if (ctx.categoryBreakdown.length === 0) {
        return 'Sem dados de diversificacao. Adicione ativos a carteira!';
      }
      let response = `📊 **Diversificacao da Carteira:**\n\n`;
      response += `${ctx.portfolio.length} ativos em ${ctx.categoryBreakdown.length} categorias\n\n`;
      response += `Distribuicao por categoria:\n`;
      response += ctx.categoryBreakdown.map(c =>
        `• **${c.category}**: ${c.weight.toFixed(1)}%`
      ).join('\n');

      const topWeight = ctx.categoryBreakdown[0]?.weight || 0;
      if (topWeight > 50) {
        response += `\n\n⚠️ _Atencao: ${ctx.categoryBreakdown[0].category} representa mais da metade da carteira. Considere diversificar._`;
      } else if (ctx.categoryBreakdown.length >= 3) {
        response += `\n\n✅ _Boa diversificacao! Carteira bem distribuida entre categorias._`;
      }

      return response;
    },
  },

  // ─── Ajuda / Fallback ──────────────────────────────────────────────────
  {
    pattern: /(?:ajuda|help|comandos|o\s+que\s+voce\s+faz|funcionalidades)/i,
    handler: () => {
      return `🤖 **Comandos do Chat Advisor:**\n\n` +
        `📊 **Carteira:**\n• "Como esta minha carteira?"\n• "Qual meu P/L?"\n• "Meus dividendos"\n• "Diversificacao"\n\n` +
        `💡 **Investimento:**\n• "Onde investir?"\n• "Analise PETR4"\n• "Sugestao de aporte"\n\n` +
        `📚 **Educacional:**\n• "O que e DY?"\n• "Como funciona preco teto?"\n• "Explique Graham"\n• "O que e CDI?"\n\n` +
        `🏆 **Performance:**\n• "Health Score"\n• "Meu streak"\n• "Renda mensal"`;
    },
  },
];

// ─── Processador de Mensagens ────────────────────────────────────────────────

export const processMessage = (userMessage: string, context: ChatContext): string => {
  const normalized = userMessage.trim().toLowerCase();

  if (normalized.length < 2) {
    return 'Digite uma pergunta sobre sua carteira ou investimentos.';
  }

  // Check each intent
  for (const { pattern, handler } of intentHandlers) {
    const match = normalized.match(pattern);
    if (match) {
      return handler(context, match);
    }
  }

  // Fallback
  return `Nao entendi sua pergunta. Tente perguntar sobre:\n\n` +
    `• Sua carteira ("como esta minha carteira?")\n` +
    `• P/L e rentabilidade ("qual meu P/L?")\n` +
    `• Dividendos ("quanto recebo por mes?")\n` +
    `• Analise de ativo ("analise PETR4")\n` +
    `• Sugestoes ("onde investir?")\n` +
    `• Conceitos ("o que e DY?")\n\n` +
    `Ou digite "ajuda" para ver todos os comandos.`;
};

// ─── Quick Suggestions ───────────────────────────────────────────────────────

export const quickSuggestions = [
  'Como esta minha carteira?',
  'Qual meu P/L?',
  'Meus dividendos',
  'Onde investir?',
  'Health Score',
  'O que e DY?',
];
