import { Asset, PortfolioItem } from '../types';
import { calculateClassicCeiling } from '../lib/formulas';

// ─── Tipos ───────────────────────────────────────────────────────────────────

export type SmartAlertType =
  | 'dividend_upcoming'
  | 'price_target_hit'
  | 'insider_signal'
  | 'health_score_change'
  | 'contribution_reminder'
  | 'opportunity'
  | 'sector_rotation'
  | 'allocation_drift'
  | 'price_event'
  | 'exchange_alert';

export type AlertSeverity = 'critical' | 'warning' | 'info' | 'success';

export interface SmartAlert {
  id: string;
  type: SmartAlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  ticker?: string;
  value?: number;
  timestamp: string;
  read: boolean;
  actionable?: string; // Sugestao de acao
}

export interface DividendCalendarEntry {
  ticker: string;
  company: string;
  exDate: string;       // Data ex-dividendo
  paymentDate: string;  // Data de pagamento
  valuePerShare: number;
  type: 'dividendo' | 'jcp' | 'rendimento';
  totalEstimated: number; // Baseado na posicao do usuario
}

export interface AlertContext {
  portfolio: PortfolioItem[];
  assets: Asset[];
  totalMarketValue: number;
  totalInvested: number;
  monthlyIncome: number;
  streak: number;
  lastContributionDate: string | null;
  healthScore: number;
  categoryBreakdown: { category: string; weight: number }[];
}

// ─── Calendario de Dividendos (Mock Realista) ────────────────────────────────

const generateDividendCalendar = (portfolio: PortfolioItem[], assets: Asset[]): DividendCalendarEntry[] => {
  const now = new Date();
  const entries: DividendCalendarEntry[] = [];

  const dividendSchedules: Record<string, { dayOffset: number; valuePct: number; type: DividendCalendarEntry['type'] }> = {
    'PETR4': { dayOffset: 5, valuePct: 0.018, type: 'dividendo' },
    'VALE3': { dayOffset: 8, valuePct: 0.022, type: 'dividendo' },
    'ITUB4': { dayOffset: 3, valuePct: 0.012, type: 'jcp' },
    'BBAS3': { dayOffset: 12, valuePct: 0.015, type: 'dividendo' },
    'BBDC4': { dayOffset: 6, valuePct: 0.010, type: 'jcp' },
    'TAEE11': { dayOffset: 10, valuePct: 0.008, type: 'rendimento' },
    'HGLG11': { dayOffset: 4, valuePct: 0.006, type: 'rendimento' },
    'MXRF11': { dayOffset: 7, valuePct: 0.009, type: 'rendimento' },
    'KNRI11': { dayOffset: 15, valuePct: 0.007, type: 'rendimento' },
    'TRPL4': { dayOffset: 9, valuePct: 0.011, type: 'dividendo' },
    'ELET3': { dayOffset: 14, valuePct: 0.013, type: 'jcp' },
    'SANB11': { dayOffset: 11, valuePct: 0.009, type: 'dividendo' },
    'WEGE3': { dayOffset: 20, valuePct: 0.005, type: 'dividendo' },
    'ABEV3': { dayOffset: 18, valuePct: 0.008, type: 'dividendo' },
  };

  for (const item of portfolio) {
    const asset = assets.find(a => a.id === item.assetId || a.ticker === item.assetId);
    if (!asset) continue;

    const schedule = dividendSchedules[asset.ticker];
    if (!schedule) continue;

    const exDate = new Date(now);
    exDate.setDate(exDate.getDate() + schedule.dayOffset);

    const paymentDate = new Date(exDate);
    paymentDate.setDate(paymentDate.getDate() + 15);

    const valuePerShare = asset.price * schedule.valuePct;
    const totalEstimated = valuePerShare * item.quantity;

    entries.push({
      ticker: asset.ticker,
      company: asset.name,
      exDate: exDate.toISOString().slice(0, 10),
      paymentDate: paymentDate.toISOString().slice(0, 10),
      valuePerShare,
      type: schedule.type,
      totalEstimated,
    });
  }

  return entries.sort((a, b) => a.exDate.localeCompare(b.exDate));
};

// ─── Gerador de Alertas ──────────────────────────────────────────────────────

export const generateSmartAlerts = (ctx: AlertContext): SmartAlert[] => {
  const alerts: SmartAlert[] = [];
  const now = new Date();

  // 1. Dividendos proximos (proximo 7 dias)
  const divCalendar = generateDividendCalendar(ctx.portfolio, ctx.assets);
  const upcomingDivs = divCalendar.filter(d => {
    const exDate = new Date(d.exDate);
    const diff = (exDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 7;
  });

  for (const div of upcomingDivs) {
    const daysUntil = Math.ceil((new Date(div.exDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    alerts.push({
      id: `div_${div.ticker}_${div.exDate}`,
      type: 'dividend_upcoming',
      severity: daysUntil <= 2 ? 'critical' : 'info',
      title: `Dividendo ${daysUntil <= 2 ? 'imminente' : 'proximo'}: ${div.ticker}`,
      message: `Ex-dividend em ${daysUntil === 0 ? 'hoje' : `${daysUntil} dia${daysUntil > 1 ? 's' : ''}`}. Estimativa: R$ ${div.totalEstimated.toFixed(2)} (${div.type}).`,
      ticker: div.ticker,
      value: div.totalEstimated,
      timestamp: now.toISOString(),
      read: false,
      actionable: daysUntil <= 2
        ? 'Compre ate hoje para ter direito ao dividendo.'
        : `Avalie comprar antes da data ex para receber R$ ${div.totalEstimated.toFixed(2)}.`,
    });
  }

  // 2. Price Target atingido ou abaixo do preco teto
  for (const item of ctx.portfolio) {
    const asset = ctx.assets.find(a => a.id === item.assetId || a.ticker === item.assetId);
    if (!asset) continue;

    const annualDiv = asset.price * (asset.dividendYield / 100);
    const ceiling = calculateClassicCeiling(annualDiv);
    if (!ceiling || ceiling <= 0) continue;

    const upside = ((ceiling - asset.price) / asset.price) * 100;

    if (upside >= 15) {
      alerts.push({
        id: `opp_${asset.ticker}`,
        type: 'opportunity',
        severity: upside >= 25 ? 'success' : 'info',
        title: `Oportunidade: ${asset.ticker} abaixo do preco teto`,
        message: `Preco atual R$ ${asset.price.toFixed(2)} vs teto R$ ${ceiling.toFixed(2)} (+${upside.toFixed(1)}%). Modelo Bazin.`,
        ticker: asset.ticker,
        value: upside,
        timestamp: now.toISOString(),
        read: false,
        actionable: `Considere aportar em ${asset.ticker}. Desconto de ${upside.toFixed(0)}% vs preco teto.`,
      });
    } else if (upside <= -20) {
      alerts.push({
        id: `overval_${asset.ticker}`,
        type: 'price_target_hit',
        severity: 'warning',
        title: `${asset.ticker} acima do preco teto`,
        message: `Preco R$ ${asset.price.toFixed(2)} vs teto R$ ${ceiling.toFixed(2)} (${upside.toFixed(1)}%). Sobrevalorizado.`,
        ticker: asset.ticker,
        value: upside,
        timestamp: now.toISOString(),
        read: false,
        actionable: `Avalie reduzir posicao em ${asset.ticker} ou nao aportar no momento.`,
      });
    }
  }

  // 3. Lembrete de aporte (streak em risco)
  if (ctx.portfolio.length > 0) {
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const isEndOfMonth = dayOfMonth >= daysInMonth - 3;

    if (ctx.streak === 0 || (ctx.lastContributionDate && new Date(ctx.lastContributionDate).getMonth() !== now.getMonth())) {
      alerts.push({
        id: 'contribution_reminder',
        type: 'contribution_reminder',
        severity: isEndOfMonth ? 'critical' : 'warning',
        title: isEndOfMonth ? 'Streak em risco!' : 'Aporte mensal pendente',
        message: isEndOfMonth
          ? 'Faltam poucos dias para fechar o mes sem aporte. Seu streak sera zerado!'
          : 'Voce ainda nao aportou este mes. Mantenha a disciplina!',
        timestamp: now.toISOString(),
        read: false,
        actionable: 'Faca um aporte antes do fim do mes para manter seu streak.',
      });
    } else if (ctx.streak >= 3) {
      alerts.push({
        id: 'streak_positive',
        type: 'contribution_reminder',
        severity: 'success',
        title: `Streak: ${ctx.streak} meses consecutivos!`,
        message: `Parabens! Voce esta ha ${ctx.streak} meses aportando consistentemente.`,
        timestamp: now.toISOString(),
        read: false,
      });
    }
  }

  // 4. Concentracao setorial
  if (ctx.categoryBreakdown.length > 0) {
    const topCategory = ctx.categoryBreakdown[0];
    if (topCategory.weight > 50) {
      alerts.push({
        id: 'sector_concentration',
        type: 'sector_rotation',
        severity: topCategory.weight > 70 ? 'critical' : 'warning',
        title: `Concentracao em ${topCategory.category}`,
        message: `${topCategory.category} representa ${topCategory.weight.toFixed(1)}% da carteira. Diversificacao recomendada.`,
        timestamp: now.toISOString(),
        read: false,
        actionable: `Considere diversificar para outras categorias e reduzir o peso em ${topCategory.category}.`,
      });
    }
  }

  // 5. Health Score mudou significativamente
  if (ctx.healthScore > 0) {
    if (ctx.healthScore >= 80) {
      alerts.push({
        id: 'health_excellent',
        type: 'health_score_change',
        severity: 'success',
        title: 'Carteira em estado excelente!',
        message: `Health Score: ${ctx.healthScore}/100. Sua carteira esta bem diversificada, rendendo e com boa disciplina.`,
        timestamp: now.toISOString(),
        read: false,
      });
    } else if (ctx.healthScore < 40) {
      alerts.push({
        id: 'health_critical',
        type: 'health_score_change',
        severity: 'critical',
        title: 'Health Score critico',
        message: `Health Score: ${ctx.healthScore}/100. Sua carteira precisa de atencao em diversificacao, rendimento ou disciplina.`,
        timestamp: now.toISOString(),
        read: false,
        actionable: 'Revise a aba Health Score para ver recomendacoes especificas.',
      });
    }
  }

  // 6. Renda mensal vs meta
  if (ctx.monthlyIncome > 0) {
    const targetMonthly = 500; // Meta padrao
    if (ctx.monthlyIncome >= targetMonthly) {
      alerts.push({
        id: 'income_goal',
        type: 'dividend_upcoming',
        severity: 'success',
        title: 'Meta de renda mensal atingida!',
        message: `Renda mensal projetada: R$ ${ctx.monthlyIncome.toFixed(2)} (meta: R$ ${targetMonthly.toFixed(2)}).`,
        timestamp: now.toISOString(),
        read: false,
      });
    }
  }

  // Ordenar: critical primeiro, depois warning, info, success
  const severityOrder: Record<AlertSeverity, number> = { critical: 0, warning: 1, info: 2, success: 3 };
  alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return alerts.slice(0, 15);
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

export const getDividendCalendar = (portfolio: PortfolioItem[], assets: Asset[]): DividendCalendarEntry[] => {
  return generateDividendCalendar(portfolio, assets);
};

export const checkPriceTargets = (portfolio: PortfolioItem[], assets: Asset[]): { ticker: string; price: number; ceiling: number; upside: number; verdict: string }[] => {
  return portfolio.map(item => {
    const asset = assets.find(a => a.id === item.assetId || a.ticker === item.assetId);
    if (!asset) return { ticker: item.assetId, price: 0, ceiling: 0, upside: 0, verdict: 'unknown' };

    const annualDiv = asset.price * (asset.dividendYield / 100);
    const ceiling = calculateClassicCeiling(annualDiv);
    const upside = ceiling ? ((ceiling - asset.price) / asset.price) * 100 : 0;

    let verdict = 'neutral';
    if (upside >= 15) verdict = 'buy';
    else if (upside >= -5) verdict = 'hold';
    else if (upside >= -20) verdict = 'neutral';
    else verdict = 'sell';

    return { ticker: asset.ticker, price: asset.price, ceiling: ceiling || 0, upside, verdict };
  });
};

export const getActionableSuggestions = (alerts: SmartAlert[]): string[] => {
  return alerts
    .filter(a => a.actionable)
    .map(a => a.actionable!)
    .slice(0, 5);
};
