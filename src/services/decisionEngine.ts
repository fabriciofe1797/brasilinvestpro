/**
 * Decision Engine Service — Motor de Decisão Prescritiva
 * 
 * Analisa portfólio, metas, mercado e fiscal para gerar
 * até 5 ações concretas e priorizadas para o mês.
 */

import type { Asset, PortfolioItem, Transaction, UserSettings } from '../types';
import { calculateAssetScore } from '../lib/utils';
import { formatCurrency } from '../lib/utils';

export interface PrescriptiveAction {
  id: string;
  type: 'buy' | 'sell' | 'hold' | 'rebalance' | 'tax' | 'exchange' | 'milestone';
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  ticker?: string;
  amount?: number;
  currency?: 'BRL' | 'EUR';
  reason: string;
  impact: string;           // What happens if user follows this
  deadline?: string;        // "Até dia 15" or "Este mês"
  category: 'aporte' | 'fiscal' | 'rebalanceamento' | 'oportunidade' | 'meta' | 'câmbio';
}

export interface DecisionResult {
  actions: PrescriptiveAction[];
  summary: {
    totalActions: number;
    criticalCount: number;
    highCount: number;
    totalInvestmentNeeded: number;
    topPriority: string;
  };
  monthLabel: string;
  generatedAt: string;
}

/**
 * Gera decisões prescritivas baseadas no estado completo do portfólio
 */
export function generatePrescriptiveActions(
  portfolio: PortfolioItem[],
  assets: Asset[],
  transactions: Transaction[],
  settings: UserSettings,
): DecisionResult {
  const actions: PrescriptiveAction[] = [];
  const now = new Date();
  const monthLabel = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthlyBudget = settings.monthlyContribution || 1000;
  const exchangeRate = settings.exchangeRate || 6.2;

  // 1. Check if monthly contribution was made
  const hasContributionThisMonth = transactions.some(
    tx => tx.type === 'BUY' && new Date(tx.date) >= startOfMonth
  );

  if (!hasContributionThisMonth) {
    const daysLeft = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate();
    actions.push({
      id: 'monthly-contribution',
      type: 'buy',
      priority: 'critical',
      title: `Faça seu aporte de ${formatCompact(monthlyBudget)} este mês`,
      description: `Você ainda não registrou nenhum aporte este mês. A consistência de aportes é o fator #1 para construção de patrimônio.`,
      amount: monthlyBudget,
      currency: 'BRL',
      reason: 'Nenhum BUY registrado este mês.',
      impact: `Mantenha a disciplina. Aportes consistentes geram o efeito composto que constrói riqueza.`,
      deadline: `Faltam ${daysLeft} dias para fechar o mês`,
      category: 'aporte',
    });
  }

  // 2. Allocation drift — detect imbalances and suggest specific actions
  if (settings.allocationTargets.length > 0 && portfolio.length > 0) {
    const totalValue = portfolio.reduce((acc, item) => {
      const asset = assets.find(a => a.id === item.assetId);
      return acc + (asset ? asset.price * item.quantity : 0);
    }, 0);

    if (totalValue > 0) {
      const currentAllocation: Record<string, number> = {};
      portfolio.forEach(item => {
        const asset = assets.find(a => a.id === item.assetId);
        if (asset) {
          const value = asset.price * item.quantity;
          currentAllocation[asset.category] = (currentAllocation[asset.category] || 0) + value / totalValue;
        }
      });

      settings.allocationTargets.forEach(target => {
        const current = currentAllocation[target.category] || 0;
        const targetPct = target.targetPercentage / 100;
        const drift = current - targetPct;

        if (drift > 0.15) {
          const excessValue = drift * totalValue;
          actions.push({
            id: `reduce-${target.category}`,
            type: 'sell',
            priority: 'high',
            title: `Reduza ${target.category}: ${(current * 100).toFixed(0)}% vs meta ${(targetPct * 100).toFixed(0)}%`,
            description: `Sua posição em ${target.category} está ${(drift * 100).toFixed(0)}% acima da meta. Considere realizar lucros parciais de ~${formatCompact(excessValue)}.`,
            amount: excessValue,
            currency: 'BRL',
            reason: `Drift de alocação: +${(drift * 100).toFixed(0)}% acima do alvo.`,
            impact: `Rebalancear reduz risco concentrado e melhora a eficiência do portfólio.`,
            category: 'rebalanceamento',
          });
        } else if (drift < -0.15 && hasContributionThisMonth) {
          const neededValue = Math.abs(drift) * totalValue;
          actions.push({
            id: `increase-${target.category}`,
            type: 'buy',
            priority: 'medium',
            title: `Aumente ${target.category}: ${(current * 100).toFixed(0)}% vs meta ${(targetPct * 100).toFixed(0)}%`,
            description: `Destine o próximo aporte para ${target.category}. Necessário ~${formatCompact(neededValue)} para equilibrar.`,
            amount: neededValue,
            currency: 'BRL',
            reason: `Drift de alocação: ${(Math.abs(drift) * 100).toFixed(0)}% abaixo do alvo.`,
            impact: `Aportar na classe sub-representada melhora diversificação e retorno ajustado ao risco.`,
            category: 'rebalanceamento',
          });
        }
      });
    }
  }

  // 3. High-scoring opportunities not in portfolio
  if (hasContributionThisMonth) {
    const portfolioTickers = new Set(portfolio.map(p => p.assetId));
    const opportunities = assets
      .filter(a => !portfolioTickers.has(a.id) && a.dividendYield >= 6)
      .map(a => ({
        asset: a,
        score: calculateAssetScore({
          dividendYield: a.dividendYield,
          price: a.price,
          lastClose: a.lastClose,
          pvp: a.pvp,
          pl: a.pl,
          category: a.category,
        }),
      }))
      .filter(o => o.score.total >= 60)
      .sort((a, b) => b.score.total - a.score.total)
      .slice(0, 2);

    opportunities.forEach((opp, idx) => {
      const affordableQty = Math.floor(monthlyBudget / opp.asset.price);
      if (affordableQty > 0) {
        actions.push({
          id: `opportunity-${opp.asset.ticker}`,
          type: 'buy',
          priority: idx === 0 ? 'high' : 'medium',
          title: `${opp.asset.ticker} — Score ${opp.score.total} (${opp.score.label})`,
          description: `DY ${opp.asset.dividendYield.toFixed(1)}% com score "${opp.score.label}". ${opp.score.reasons.join('. ')}. Considere ${affordableQty} cotas (~${formatCompact(affordableQty * opp.asset.price)}).`,
          ticker: opp.asset.ticker,
          amount: affordableQty * opp.asset.price,
          currency: 'BRL',
          reason: `Score ${opp.score.total}/100. ${opp.score.reasons.slice(0, 2).join(', ')}.`,
          impact: `Aporte de ${formatCompact(affordableQty * opp.asset.price)} geraria ~${formatCompact((affordableQty * opp.asset.price * opp.asset.dividendYield / 100) / 12)}/mês em dividendos.`,
          category: 'oportunidade',
        });
      }
    });
  }

  // 4. Exchange rate opportunity
  if (settings.exchangeRateChangePct !== undefined && settings.exchangeRateChangePct < -3) {
    actions.push({
      id: 'exchange-opportunity',
      type: 'exchange',
      priority: 'medium',
      title: `Câmbio favorável: EUR/BRL caiu ${Math.abs(settings.exchangeRateChangePct).toFixed(1)}%`,
      description: `O real fortaleceu recentemente. Se planeja aportar em ativos internacionais, este é um bom momento para converter.`,
      reason: `Variação cambial: ${settings.exchangeRateChangePct.toFixed(1)}% (queda do EUR).`,
      impact: `Converter agora pode economizar centenas de reais em comparação com a taxa média do mês.`,
      category: 'câmbio',
    });
  }

  // 5. Tax awareness — approaching exemption limit
  const thisMonthSales = transactions
    .filter(tx => tx.type === 'SELL' && new Date(tx.date) >= startOfMonth)
    .reduce((acc, tx) => acc + tx.total, 0);

  if (thisMonthSales > 15000 && thisMonthSales < 20000) {
    const remaining = 20000 - thisMonthSales;
    actions.push({
      id: 'tax-exemption-warning',
      type: 'tax',
      priority: 'high',
      title: `Atenção: limite de isenção de R$20k próximo`,
      description: `Você já vendeu R$${formatCompact(thisMonthSales)} em ações este mês. Faltam apenas ${formatCompact(remaining)} para o limite de isenção de IR sobre ganhos de capital.`,
      amount: remaining,
      currency: 'BRL',
      reason: `Vendas do mês: R$${formatCompact(thisMonthSales)}. Limite: R$20.000.`,
      impact: `Vendas acima de R$20k/mês em ações estão sujeitas a 15% de IR sobre o ganho.`,
      deadline: 'Até o fim do mês',
      category: 'fiscal',
    });
  }

  // 6. Dividend milestone approaching
  const monthlyIncome = portfolio.reduce((acc, item) => {
    const asset = assets.find(a => a.id === item.assetId);
    if (!asset) return acc;
    return acc + (asset.price * (asset.dividendYield / 100) / 12) * item.quantity;
  }, 0);

  const milestones = [100, 500, 1000, 2000, 5000];
  for (const ms of milestones) {
    if (monthlyIncome < ms && monthlyIncome >= ms * 0.8) {
      const gap = ms - monthlyIncome;
      const neededCapital = gap / (0.08 / 12); // Assuming 8% DY
      actions.push({
        id: `milestone-${ms}`,
        type: 'milestone',
        priority: 'medium',
        title: `Meta de R$${ms.toLocaleString('pt-BR')}/mês próxima!`,
        description: `Sua renda mensal atual é ${formatCurrency(monthlyIncome, 'BRL')}. Faltam apenas ${formatCompact(gap)} em dividendos. Com ~${formatCompact(neededCapital)} investidos a 8% DY, você atinge este marco.`,
        amount: neededCapital,
        currency: 'BRL',
        reason: `Renda atual: ${formatCurrency(monthlyIncome, 'BRL')}. Meta: R$${ms.toLocaleString('pt-BR')}/mês.`,
        impact: `Atingir R$${ms.toLocaleString('pt-BR')}/mês em dividendos é um marco significativo de renda passiva.`,
        category: 'meta',
      });
      break; // Only show the nearest milestone
    }
  }

  // Sort by priority
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  actions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  // Limit to 5 actions
  const topActions = actions.slice(0, 5);

  const criticalCount = topActions.filter(a => a.priority === 'critical').length;
  const highCount = topActions.filter(a => a.priority === 'high').length;
  const totalInvestment = topActions.reduce((acc, a) => acc + (a.amount || 0), 0);

  return {
    actions: topActions,
    summary: {
      totalActions: topActions.length,
      criticalCount,
      highCount,
      totalInvestmentNeeded: totalInvestment,
      topPriority: topActions[0]?.title || 'Nenhuma ação pendente',
    },
    monthLabel,
    generatedAt: new Date().toISOString(),
  };
}

function formatCompact(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `R$${(value / 1000).toFixed(0)}k`;
  return `R$${value.toFixed(0)}`;
}
