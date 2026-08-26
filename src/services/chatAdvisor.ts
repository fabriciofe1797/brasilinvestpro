import { Asset, PortfolioItem } from '../types';
import { calculateClassicCeiling } from '../lib/formulas';
import i18n from '../i18n';

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

const formatBRL = (v: number) => `R$ ${v.toLocaleString(i18n.language, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatPct = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;

const intentHandlers: { pattern: RegExp; handler: IntentHandler }[] = [
  // ─── Portfolio Overview ────────────────────────────────────────────────
  {
    pattern: /(?:como\s+(?:esta|está|vai|anda)|status|resumo|panorama|minha\s+carteira|portfolio|carteira|how\s+is|cartera)/i,
    handler: (ctx) => {
      if (ctx.portfolio.length === 0) {
        return i18n.t('ai.chat.emptyPortfolio');
      }
      return i18n.t('ai.chat.overviewTitle', { count: ctx.portfolio.length, value: formatBRL(ctx.totalMarketValue) }) +
        i18n.t('ai.chat.overviewPnl', { value: formatBRL(ctx.totalProfitLoss), pct: formatPct(ctx.totalProfitLossPct) }) +
        i18n.t('ai.chat.overviewIncome', { value: formatBRL(ctx.monthlyIncome) }) +
        i18n.t('ai.chat.overviewHealth', { score: ctx.healthScore }) +
        i18n.t('ai.chat.overviewStreak', { count: ctx.streak }) +
        i18n.t('ai.chat.overviewTop') +
        ctx.topAssets.slice(0, 3).map((a, i) =>
          i18n.t('ai.chat.overviewItem', { index: i + 1, ticker: a.ticker, weight: a.weight.toFixed(1), pnl: formatPct(a.profitLossPct), dy: a.dividendYield.toFixed(1) })
        ).join('\n');
    },
  },

  // ─── P/L ───────────────────────────────────────────────────────────────
  {
    pattern: /(?:p\/?l|profit|lucro|preju[ií]zo|rentabilidade|performance|resultado|loss|returns)/i,
    handler: (ctx) => {
      if (ctx.portfolio.length === 0) {
        return i18n.t('ai.chat.noPositions');
      }
      const emoji = ctx.totalProfitLoss >= 0 ? '📈' : '📉';
      let response = i18n.t('ai.chat.pnlTitle', { emoji });
      response += i18n.t('ai.chat.pnlInvested', { value: formatBRL(ctx.totalInvested) });
      response += i18n.t('ai.chat.pnlMarket', { value: formatBRL(ctx.totalMarketValue) });
      response += i18n.t('ai.chat.pnlTotal', { value: formatBRL(ctx.totalProfitLoss), pct: formatPct(ctx.totalProfitLossPct) });

      const winners = ctx.topAssets.filter(a => a.profitLossPct > 0).sort((a, b) => b.profitLossPct - a.profitLossPct);
      const losers = ctx.topAssets.filter(a => a.profitLossPct < 0).sort((a, b) => a.profitLossPct - b.profitLossPct);

      if (winners.length > 0) {
        response += i18n.t('ai.chat.pnlWinners');
        response += winners.slice(0, 3).map(a => `  ✅ ${a.ticker}: ${formatPct(a.profitLossPct)}`).join('\n');
        response += '\n';
      }
      if (losers.length > 0) {
        response += i18n.t('ai.chat.pnlLosers');
        response += losers.slice(0, 3).map(a => `  ❌ ${a.ticker}: ${formatPct(a.profitLossPct)}`).join('\n');
      }

      return response;
    },
  },

  // ─── Dividendos / Renda ────────────────────────────────────────────────
  {
    pattern: /(?:dividendo|dividendos|dividends|dy|yield|renda|rendimento|provento|pagamento|ingresos)/i,
    handler: (ctx) => {
      if (ctx.portfolio.length === 0) {
        return i18n.t('ai.chat.divEmpty');
      }
      const annualIncome = ctx.monthlyIncome * 12;
      const weightedDY = ctx.topAssets.reduce((sum, a) => sum + a.dividendYield * (a.weight / 100), 0);

      let response = i18n.t('ai.chat.divTitle');
      response += i18n.t('ai.chat.divMonthly', { value: formatBRL(ctx.monthlyIncome) });
      response += i18n.t('ai.chat.divAnnual', { value: formatBRL(annualIncome) });
      response += i18n.t('ai.chat.divWeighted', { value: weightedDY.toFixed(2) });

      response += i18n.t('ai.chat.divTop');
      const divAssets = [...ctx.topAssets].sort((a, b) => b.dividendYield - a.dividendYield);
      response += divAssets.slice(0, 5).map(a =>
        i18n.t('ai.chat.divItem', { ticker: a.ticker, dy: a.dividendYield.toFixed(1), value: formatBRL(a.dividendYield / 100 * ctx.totalMarketValue * (a.weight / 100) / 12) })
      ).join('\n');

      if (weightedDY < 4) {
        response += i18n.t('ai.chat.divTipLow');
      } else if (weightedDY >= 6) {
        response += i18n.t('ai.chat.divTipHigh');
      }

      return response;
    },
  },

  // ─── Health Score ──────────────────────────────────────────────────────
  {
    pattern: /(?:health\s*score|sa[uú]de|score|salud|como\s+esta\s+a\s+carteira)/i,
    handler: (ctx) => {
      if (ctx.healthScore === 0) {
        return i18n.t('ai.chat.healthEmpty');
      }
      let labelKey: string;
      let emoji: string;
      if (ctx.healthScore >= 80) { labelKey = 'healthGen.labelExcellent'; emoji = '🏆'; }
      else if (ctx.healthScore >= 60) { labelKey = 'healthGen.labelHealthy'; emoji = '✅'; }
      else if (ctx.healthScore >= 40) { labelKey = 'healthGen.labelAttention'; emoji = '⚠️'; }
      else { labelKey = 'healthGen.labelCritical'; emoji = '🚨'; }

      let response = i18n.t('ai.chat.healthTitle', { emoji, score: ctx.healthScore, label: i18n.t(labelKey) });
      response += i18n.t('ai.chat.healthPillars');
      response += i18n.t('ai.chat.healthDiversification', { assets: ctx.portfolio.length, categories: ctx.categoryBreakdown.length });
      response += i18n.t('ai.chat.healthYield', { dy: ctx.topAssets.reduce((s, a) => s + a.dividendYield * (a.weight / 100), 0).toFixed(1) });
      response += i18n.t('ai.chat.healthValuation');
      response += i18n.t('ai.chat.healthDiscipline', { count: ctx.streak });

      if (ctx.healthScore < 60) {
        response += i18n.t('ai.chat.healthTipLow');
      } else if (ctx.healthScore < 80) {
        response += i18n.t('ai.chat.healthTipMid');
      } else {
        response += i18n.t('ai.chat.healthTipHigh');
      }

      return response;
    },
  },

  // ─── Sugestao de Aporte ────────────────────────────────────────────────
  {
    pattern: /(?:sugest[aã]o|sugerir|onde\s+investir|o\s+que\s+comprar|aporte|recomenda[çc][aã]o|dica|where\s+(?:to\s+)?invest|suggestion|donde\s+invertir|qu[eé]\s+comprar)/i,
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

      let response = i18n.t('ai.chat.suggTitle');

      if (opportunities.length === 0) {
        response += i18n.t('ai.chat.suggNone');
        return response;
      }

      response += i18n.t('ai.chat.suggList');
      response += opportunities.slice(0, 5).map((o, i) =>
        i18n.t('ai.chat.suggItem', { index: i + 1, ticker: o.ticker, upside: o.upside.toFixed(0), dy: o.dy.toFixed(1) })
      ).join('\n');

      // Check category concentration
      if (ctx.categoryBreakdown.length > 0) {
        const topCat = ctx.categoryBreakdown[0];
        if (topCat.weight > 50) {
          response += i18n.t('ai.chat.suggConcentration', { category: topCat.category, weight: topCat.weight.toFixed(0) });
        }
      }

      return response;
    },
  },

  // ─── Analise de Ativo ──────────────────────────────────────────────────
  {
    pattern: /(?:analise|an[aá]lise|analyze|analisar|analizar|avalie|vale\s+a\s+pena|opini[aã]o)\s+([A-Za-z]{3,6}\d?)/i,
    handler: (ctx, match) => {
      const ticker = match[1]?.toUpperCase();
      const asset = ctx.assets.find(a => a.ticker.toUpperCase() === ticker);

      if (!asset) {
        return i18n.t('ai.chat.analysisNotFound', { ticker });
      }

      const annualDiv = asset.price * (asset.dividendYield / 100);
      const ceiling = calculateClassicCeiling(annualDiv);
      const upside = ceiling ? ((ceiling - asset.price) / asset.price) * 100 : 0;

      const position = ctx.portfolio.find(p => p.assetId === asset.id || p.assetId === asset.ticker);

      let response = i18n.t('ai.chat.analysisTitle', { ticker: asset.ticker, name: asset.name });
      response += i18n.t('ai.chat.analysisPrice', { value: formatBRL(asset.price) });
      response += i18n.t('ai.chat.analysisCategory', { category: asset.category, subCategory: asset.subCategory });
      response += i18n.t('ai.chat.analysisDy', { value: asset.dividendYield.toFixed(2) });

      if (ceiling) {
        response += i18n.t('ai.chat.analysisCeiling', { value: formatBRL(ceiling), upside: `${upside >= 0 ? '+' : ''}${upside.toFixed(1)}` });
      }

      if (asset.pvp !== undefined) {
        response += i18n.t('ai.chat.analysisPvp', { value: asset.pvp.toFixed(2) });
      }
      if (asset.pl !== undefined) {
        response += i18n.t('ai.chat.analysisPl', { value: asset.pl.toFixed(2) });
      }

      // Verdict
      if (upside >= 15) {
        response += i18n.t('ai.chat.verdictOpportunity', { upside: upside.toFixed(0) });
      } else if (upside >= -5) {
        response += i18n.t('ai.chat.verdictNeutral');
      } else {
        response += i18n.t('ai.chat.verdictCaution');
      }

      if (position) {
        response += i18n.t('ai.chat.hasPosition', { qty: position.quantity, ticker: asset.ticker });
      } else {
        response += i18n.t('ai.chat.noPosition', { ticker: asset.ticker });
      }

      return response;
    },
  },

  // ─── Educacional ───────────────────────────────────────────────────────
  {
    pattern: /(?:o\s+que\s+(?:e|é)|what\s+is|qu[eé]\s+es|explain|explique|explica|como\s+funciona|how\s+does|me\s+ensina)\s*(DY|dividend\s*yield|preco\s+teto|preço\s+teto|ceiling\s+price|graham|bazin|cdi|selic|p\/?vp|p\/?l|magic\s+number|bola\s+de\s+neve|snowball|streak|health\s*score)?/i,
    handler: (ctx, match) => {
      const topic = (match[1] || '').toLowerCase().replace(/\s/g, '');

      const topics: Record<string, string> = {
        'dy': 'ai.chat.topicDy',
        'dividendyield': 'ai.chat.topicDy',
        'precoteto': 'ai.chat.topicPrecoTeto',
        'ceilingprice': 'ai.chat.topicPrecoTeto',
        'graham': 'ai.chat.topicGraham',
        'bazin': 'ai.chat.topicBazin',
        'cdi': 'ai.chat.topicCdi',
        'selic': 'ai.chat.topicSelic',
        'pvp': 'ai.chat.topicPvp',
        'pl': 'ai.chat.topicPl',
        'magicnumber': 'ai.chat.topicMagicNumber',
        'boladeneve': 'ai.chat.topicBolaDeNeve',
        'snowball': 'ai.chat.topicBolaDeNeve',
        'streak': 'ai.chat.topicStreak',
        'healthscore': 'ai.chat.topicHealthScore',
      };

      const key = topic || 'default';
      if (topics[key]) {
        return i18n.t(topics[key]);
      }

      return i18n.t('ai.chat.topicsHelp');
    },
  },

  // ─── Aportes / Streak ──────────────────────────────────────────────────
  {
    pattern: /(?:streak|sequ[eê]ncia|aportes?|disciplina|contribui[çc][aã]o|mensal|racha|consecutive)/i,
    handler: (ctx) => {
      if (ctx.streak === 0) {
        return i18n.t('ai.chat.streakZero');
      }
      return i18n.t('ai.chat.streakTitle', { count: ctx.streak }) +
        (ctx.streak >= 12 ? i18n.t('ai.chat.streakMsg12') :
        ctx.streak >= 6 ? i18n.t('ai.chat.streakMsg6') :
        ctx.streak >= 3 ? i18n.t('ai.chat.streakMsg3') :
        i18n.t('ai.chat.streakMsgStart'));
    },
  },

  // ─── Diversificacao ────────────────────────────────────────────────────
  {
    pattern: /(?:diversific|distribui[çc]|aloca[çc]|allocation|peso|weight|categoria|setor)/i,
    handler: (ctx) => {
      if (ctx.categoryBreakdown.length === 0) {
        return i18n.t('ai.chat.diversEmpty');
      }
      let response = i18n.t('ai.chat.diversTitle');
      response += i18n.t('ai.chat.diversSummary', { assets: ctx.portfolio.length, categories: ctx.categoryBreakdown.length });
      response += i18n.t('ai.chat.diversDist');
      response += ctx.categoryBreakdown.map(c =>
        i18n.t('ai.chat.diversItem', { category: c.category, weight: c.weight.toFixed(1) })
      ).join('\n');

      const topWeight = ctx.categoryBreakdown[0]?.weight || 0;
      if (topWeight > 50) {
        response += i18n.t('ai.chat.diversWarning', { category: ctx.categoryBreakdown[0].category });
      } else if (ctx.categoryBreakdown.length >= 3) {
        response += i18n.t('ai.chat.diversGood');
      }

      return response;
    },
  },

  // ─── Ajuda / Fallback ──────────────────────────────────────────────────
  {
    pattern: /(?:ajuda|help|comandos|commands|ayuda|o\s+que\s+voce\s+faz|what\s+do\s+you\s+do|funcionalidades|features)/i,
    handler: () => {
      return i18n.t('ai.chat.helpTitle') +
        i18n.t('ai.chat.helpPortfolio') +
        i18n.t('ai.chat.helpInvest') +
        i18n.t('ai.chat.helpEducational') +
        i18n.t('ai.chat.helpPerformance');
    },
  },
];

// ─── Processador de Mensagens ────────────────────────────────────────────────

export const processMessage = (userMessage: string, context: ChatContext): string => {
  const normalized = userMessage.trim().toLowerCase();

  if (normalized.length < 2) {
    return i18n.t('ai.chat.shortInput');
  }

  // Check each intent
  for (const { pattern, handler } of intentHandlers) {
    const match = normalized.match(pattern);
    if (match) {
      return handler(context, match);
    }
  }

  // Fallback
  return i18n.t('ai.chat.fallback');
};

// ─── Quick Suggestions ───────────────────────────────────────────────────────

export const getQuickSuggestions = (): string[] => [
  i18n.t('ai.chat.quick1'),
  i18n.t('ai.chat.quick2'),
  i18n.t('ai.chat.quick3'),
  i18n.t('ai.chat.quick4'),
  i18n.t('ai.chat.quick5'),
  i18n.t('ai.chat.quick6'),
];
