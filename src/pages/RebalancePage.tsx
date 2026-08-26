import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { useAuth, useUser } from '@clerk/clerk-react';
import { getAuthenticatedClient, saveTransaction, ensureUserProfile, upsertAsset } from '../services/database';
import { calculateRebalancing, RebalanceResult, mapCategoryToClass } from '../services/rebalancer';
import { InvestmentPlan, AllocationRecommendation } from '../services/aiAdvisor';
import { formatCurrency, applyTickerAlias, getMagicNumber, getMagicStatus } from '../lib/utils';
import {
  Scale,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  PieChart as PieIcon,
  Bell,
  Info
} from 'lucide-react';
import { PieChart, Pie, ResponsiveContainer, Tooltip } from 'recharts';
import { Link } from 'react-router-dom';
import AddInvestmentModal from '../components/AddInvestmentModal';
import { useTranslation } from 'react-i18next';

const RebalancePage: React.FC = () => {
  const { portfolio, assets, alerts, addTransaction, markAlertAsRead } = useStore();
  const { t } = useTranslation();
  const { getToken } = useAuth();
  const { user } = useUser();
  
  const [plan, setPlan] = useState<InvestmentPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<RebalanceResult | null>(null);
  const [planSource, setPlanSource] = useState<'cloud' | 'local' | null>(null);
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
  const [tradeAssetId, setTradeAssetId] = useState<string | undefined>(undefined);
  const [tradeType, setTradeType] = useState<'BUY' | 'SELL'>('BUY');
  const [tradeQuantity, setTradeQuantity] = useState<number | undefined>(undefined);
  const [onlyContributions, setOnlyContributions] = useState(false);
  const [contributionInput, setContributionInput] = useState('');
  const [sellAggressiveness, setSellAggressiveness] = useState<'conservative' | 'balanced' | 'aggressive'>('balanced');

  // Load Plan
  useEffect(() => {
    const loadPlan = async () => {
      if (!user) return;
      try {
        setLoading(true);
        const token = await getToken({ template: 'supabase' });
        if (!token) return;
        
        const client = getAuthenticatedClient(token);
        const { data } = await client
          .from('investment_profiles')
          .select('generated_plan')
          .single();

        if (data && data.generated_plan) {
          setPlan(data.generated_plan);
          setPlanSource('cloud');
        } else {
          if (typeof window !== 'undefined') {
            try {
              const raw = window.localStorage.getItem('aiadvisor_plans_v1');
              if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.plan) {
                  setPlan(parsed[0].plan as InvestmentPlan);
                  setPlanSource('local');
                }
              }
            } catch {}
          }
        }
      } catch (err) {
        console.error('Failed to load plan', err);
      } finally {
        setLoading(false);
      }
    };
    loadPlan();
  }, [user, getToken]);

  // Calculate Rebalancing
  useEffect(() => {
    if (plan && portfolio.length > 0) {
      const calc = calculateRebalancing(portfolio, assets, plan);
      setResult(calc);
    }
  }, [plan, portfolio, assets]);

  const openTrade = (ticker: string, type: 'BUY' | 'SELL', quantity: number) => {
    const canonical = applyTickerAlias(ticker);
    const asset = assets.find(a => applyTickerAlias(a.ticker) === canonical);
    if (!asset) return;
    setTradeAssetId(asset.id);
    setTradeType(type);
    setTradeQuantity(quantity);
    setIsTradeModalOpen(true);
  };

  const executeAllBuys = async (
    buys: { ticker: string; name: string; quantity: number; total: number; reason?: string }[]
  ) => {
    if (!user) return;
    if (!buys || buys.length === 0) return;

    const confirmed = window.confirm(
      t('rebalance.confirmBuys', { count: buys.length })
    );
    if (!confirmed) return;

    let token: string | null = null;
    try {
      token = await getToken({ template: 'supabase' });
    } catch {
      token = null;
    }

    if (token) {
      const profileExists = await ensureUserProfile(
        token,
        user?.primaryEmailAddress?.emailAddress || undefined
      );
      if (!profileExists) {
        alert(t('rebalance.profileError'));
        return;
      }
    }

    const today = new Date().toISOString().split('T')[0];

    for (const buy of buys) {
      const canonical = applyTickerAlias(buy.ticker);
      const asset = assets.find(a => applyTickerAlias(a.ticker) === canonical);
      if (!asset) continue;
      const price = asset.price || 0;
      if (price <= 0) continue;

      const ok = addTransaction({
        assetId: asset.id,
        type: 'BUY',
        quantity: buy.quantity,
        price,
        date: today,
        fees: 0
      });
      if (!ok) break;

      if (token) {
        try {
          await upsertAsset(asset, token);
          await saveTransaction(
            {
              assetId: asset.ticker,
              type: 'BUY',
              quantity: buy.quantity,
              price,
              date: today,
              fees: 0
            },
            token
          );
        } catch {
        }
      }
    }
  };

  const handleNewContribution = () => {
    setTradeAssetId(undefined);
    setTradeType('BUY');
    setTradeQuantity(undefined);
    setIsTradeModalOpen(true);
  };

  const perClassAssetSuggestions = useMemo(() => {
    if (!plan || !result) return {};

    const map: Record<
      string,
      {
        buys?: { ticker: string; name: string; quantity: number; total: number; reason?: string }[];
        sells?: { ticker: string; name: string; quantity: number; total: number; returnPct: number }[];
      }
    > = {};

    const tacticalByClass = new Map<string, AllocationRecommendation>();
    plan.tacticalRecommendations.forEach(rec => {
      tacticalByClass.set(rec.assetClass.toLowerCase(), rec);
    });

    const findTacticalFor = (assetClass: string): AllocationRecommendation | undefined => {
      const key = assetClass.toLowerCase();
      if (tacticalByClass.has(key)) return tacticalByClass.get(key);
      for (const [k, value] of tacticalByClass.entries()) {
        if (key === 'renda fixa' && (k.includes('renda fixa') || k.includes('caixa'))) return value;
        if (key === 'fiis' && k.includes('fii')) return value;
        if (key === 'ações' && k.includes('ações') && !k.includes('internacional')) return value;
        if (key === 'internacional' && (k.includes('internacional') || k.includes('exterior'))) return value;
        if (key === 'criptomoedas' && k.includes('cripto')) return value;
      }
      return undefined;
    };

    const buildScaledBuys = (assetClass: string, amount: number) => {
      if (amount <= 0) return undefined;

      const key = assetClass.toLowerCase();
      const supportedTickers = new Set(assets.map(a => applyTickerAlias(a.ticker)));

      const tactical = findTacticalFor(assetClass);
      if (tactical && tactical.suggestions.length > 0) {
        const usableSuggestions = tactical.suggestions.filter(s =>
          supportedTickers.has(applyTickerAlias(s.ticker))
        );
        if (usableSuggestions.length > 0) {
          const baseTotal = usableSuggestions.reduce((sum, s) => sum + s.total, 0);
          if (baseTotal > 0) {
            const factor = amount / baseTotal;

            const buysFromPlan = usableSuggestions
              .map(s => {
                const scaledBudget = s.total * factor;
                const qty = s.price > 0 ? Math.round(scaledBudget / s.price) : 0;
                if (qty <= 0) return null;
                const total = qty * s.price;
                const ticker = applyTickerAlias(s.ticker);
                return {
                  ticker,
                  name: s.name,
                  quantity: qty,
                  total,
                  reason: s.reason,
                };
              })
              .filter(Boolean) as {
              ticker: string;
              name: string;
              quantity: number;
              total: number;
              reason?: string;
            }[];

            if (buysFromPlan.length > 0) return buysFromPlan;
          }
        }
      }

      if (key.includes('renda fixa')) {
        const classAssets = assets.filter(
          a => mapCategoryToClass(a.category, a.subCategory) === assetClass
        );
        if (classAssets.length === 0) return undefined;

        const perAssetBudget = amount / classAssets.length;
        const balancedBuys = classAssets
          .map(a => {
            const price = a.price || 0;
            if (price <= 0) return null;
            const qty = Math.floor(perAssetBudget / price);
            if (qty <= 0) return null;
            const total = qty * price;
            return {
              ticker: applyTickerAlias(a.ticker),
              name: a.name,
              quantity: qty,
              total,
              reason: t('rebalance.balancedReason', { assetClass }),
            };
          })
          .filter(Boolean) as {
          ticker: string;
          name: string;
          quantity: number;
          total: number;
          reason?: string;
        }[];

        if (balancedBuys.length > 0) return balancedBuys;
      }

      return undefined;
    };

    const buildSellSuggestions = (assetClass: string, amountToSell: number) => {
      if (amountToSell <= 0) return undefined;
      const classHoldings = portfolio
        .map(item => {
          const canonicalId = applyTickerAlias(item.assetId);
          const asset = assets.find(a => applyTickerAlias(a.ticker) === canonicalId);
          if (!asset) return null;
          const mapped = mapCategoryToClass(asset.category, asset.subCategory);
          if (mapped !== assetClass) return null;
          const price = asset.price || item.averagePrice;
          const currentValue = price * item.quantity;
          const returnPct = item.averagePrice > 0 ? (price / item.averagePrice - 1) * 100 : 0;
          const magicNumber = getMagicNumber(asset.dividendYield, asset.magicNumber);
          const magic = getMagicStatus(item.quantity, magicNumber);
          const protectedFloor = magicNumber;
          return {
            asset,
            item,
            price,
            currentValue,
            returnPct,
            magic,
            protectedFloor,
          };
        })
        .filter(Boolean) as {
        asset: typeof assets[number];
        item: typeof portfolio[number];
        price: number;
        currentValue: number;
        returnPct: number;
        magic: ReturnType<typeof getMagicStatus>;
        protectedFloor: number;
      }[];

      if (classHoldings.length === 0) return undefined;

      classHoldings.sort((a, b) => {
        if (a.returnPct === b.returnPct) return a.currentValue - b.currentValue;
        return a.returnPct - b.returnPct;
      });

      let remaining = amountToSell;
      const sells: { ticker: string; name: string; quantity: number; total: number; returnPct: number }[] = [];

      for (const h of classHoldings) {
        if (remaining <= 0) break;
        const floor = h.protectedFloor > 0 ? h.protectedFloor : 0;
        const maxQty = h.item.quantity > floor ? h.item.quantity - floor : 0;
        const maxValue = h.price * maxQty;
        if (maxValue <= 0) continue;

        const desiredQty = Math.floor(remaining / h.price);
        if (desiredQty <= 0) continue;
        const qty = Math.min(maxQty, desiredQty);
        const total = qty * h.price;

        sells.push({
          ticker: h.asset.ticker,
          name: h.asset.name,
          quantity: qty,
          total,
          returnPct: h.returnPct,
        });

        remaining -= total;
      }

      if (sells.length === 0) return undefined;
      return sells;
    };

    const aporte = Number(contributionInput.replace(',', '.')) || 0;
    const useOnlyContrib = onlyContributions && aporte > 0;

    const positiveDiffs = result.suggestions.filter(s => s.difference > 0);
    const totalPositiveDiff = positiveDiffs.reduce((sum, s) => sum + s.difference, 0);

    const sellFactor =
      sellAggressiveness === 'conservative'
        ? 0.3
        : sellAggressiveness === 'balanced'
        ? 0.6
        : 1;

    result.suggestions.forEach(sug => {
      const entry: {
        buys?: { ticker: string; name: string; quantity: number; total: number; reason?: string }[];
        sells?: { ticker: string; name: string; quantity: number; total: number; returnPct: number }[];
      } = {};

      if (useOnlyContrib) {
        if (sug.difference > 0 && totalPositiveDiff > 0) {
          const classBudget = (aporte * sug.difference) / totalPositiveDiff;
          if (classBudget > 0) {
            entry.buys = buildScaledBuys(sug.assetClass, classBudget);
          }
        }
      } else {
        if (sug.action === 'BUY' && sug.difference > 0) {
          entry.buys = buildScaledBuys(sug.assetClass, sug.difference);
        }
  
        if (sug.action === 'SELL' && sug.difference < 0) {
          const targetSell = Math.abs(sug.difference) * sellFactor;
          if (targetSell > 0) {
            entry.sells = buildSellSuggestions(sug.assetClass, targetSell);
          }
        }
      }

      if (entry.buys || entry.sells) {
        map[sug.assetClass] = entry;
      }
    });

    return map;
  }, [plan, result, portfolio, assets, onlyContributions, contributionInput, sellAggressiveness, t]);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-6 text-center">
        <Scale className="w-20 h-20 text-gray-700" />
        <h2 className="text-2xl font-bold text-white">{t('rebalance.loginTitle')}</h2>
        <p className="text-gray-400 max-w-md">
          {t('rebalance.loginDesc')}
        </p>
        <Link to="/advisor" className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-8 rounded-full transition-all">
          {t('rebalance.loginCta')}
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <RefreshCw className="w-10 h-10 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-6 text-center">
        <Scale className="w-20 h-20 text-gray-700" />
        <h2 className="text-2xl font-bold text-white">{t('rebalance.noPlanTitle')}</h2>
        <p className="text-gray-400 max-w-md">
          {t('rebalance.noPlanDesc')}
        </p>
        <Link to="/advisor" className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-8 rounded-full transition-all">
          {t('rebalance.noPlanCta')}
        </Link>
      </div>
    );
  }

  if (!result || portfolio.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-6 text-center">
        <PieIcon className="w-20 h-20 text-gray-700" />
        <h2 className="text-2xl font-bold text-white">{t('rebalance.emptyTitle')}</h2>
        <p className="text-gray-400 max-w-md">
          {t('rebalance.emptyDesc')}
        </p>
      </div>
    );
  }

  // Data for Chart
  const chartData = result.suggestions.map(s => ({
    name: s.assetClass,
    Current: s.currentPercentage,
    Target: s.targetPercentage
  }));

  const driftAlert = alerts.find(a => a.type === 'allocation_drift');
  const contributionAlert = alerts.find(a => a.type === 'contribution_gap');

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      
      {/* Header */}
      <div className="flex flex-col space-y-2">
        <div className="flex items-center gap-2">
           <h1 className="text-2xl font-bold tracking-tight text-white">{t('rebalance.title')}</h1>
           <span className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider">{t('rebalance.badge')}</span>
           <div className="relative inline-block group">
             <Info className="w-3 h-3 text-emerald-400 cursor-default" />
             <div className="absolute left-1/2 -translate-x-1/2 mt-2 z-20 hidden group-hover:block">
               <div className="bg-black/80 text-white text-[10px] font-bold px-2 py-1 rounded-md border border-white/10 max-w-xs text-center">
                 {t('rebalance.tooltip')}
               </div>
             </div>
           </div>
        </div>
        <p className="text-gray-400 text-sm">
          {t('rebalance.subtitle')}
        </p>
        {planSource === 'local' && (
          <div className="inline-flex items-center gap-2 text-[11px] bg-blue-500/10 text-blue-200 px-3 py-1.5 rounded-full border border-blue-500/40 mt-1">
            <AlertTriangle className="w-3 h-3" />
            <span>
              {t('rebalance.planLocalNote')}
            </span>
          </div>
        )}
        {planSource === 'cloud' && (
          <div className="inline-flex items-center gap-2 text-[11px] bg-emerald-500/10 text-emerald-200 px-3 py-1.5 rounded-full border border-emerald-500/40 mt-1">
            <CheckCircle className="w-3 h-3" />
            <span>{t('rebalance.planCloudNote')}</span>
          </div>
        )}
        {driftAlert && (
          <div className="mt-3 flex items-start justify-between gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-xs text-amber-100">
            <div className="flex items-start gap-2">
              <Bell className="h-4 w-4 text-amber-300 mt-0.5" />
              <div>
                <div className="font-semibold">{driftAlert.title}</div>
                <div className="text-[11px]">{driftAlert.message}</div>
              </div>
            </div>
            {!driftAlert.read && (
              <button
                type="button"
                onClick={() => markAlertAsRead(driftAlert.id)}
                className="text-[10px] font-semibold text-amber-200 hover:text-white"
              >
                {t('rebalance.markRead')}
              </button>
            )}
          </div>
        )}
        {contributionAlert && (
          <div className="mt-2 flex items-start justify-between gap-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-100">
            <div className="flex items-start gap-2">
              <Bell className="h-4 w-4 text-emerald-300 mt-0.5" />
              <div>
                <div className="font-semibold">{contributionAlert.title}</div>
                <div className="text-[11px]">{contributionAlert.message}</div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <button
                type="button"
                onClick={handleNewContribution}
                className="px-3 py-1 rounded-lg bg-emerald-400 text-black font-semibold text-[10px] hover:bg-emerald-300"
              >
                {t('rebalance.registerContribution')}
              </button>
              {!contributionAlert.read && (
                <button
                  type="button"
                  onClick={() => markAlertAsRead(contributionAlert.id)}
                  className="text-[10px] font-semibold text-emerald-200 hover:text-white"
                >
                  {t('rebalance.markRead')}
                </button>
              )}
            </div>
          </div>
        )}
        <div className="inline-flex items-center gap-2 text-[11px] bg-white/5 text-gray-200 px-3 py-1.5 rounded-full border border-white/10 mt-2">
          <ArrowRight className="w-3 h-3 text-emerald-400" />
          <span>
            {t('rebalance.executeHintStart')} <span className="font-bold text-emerald-400">{t('rebalance.executeHintHighlight')}</span> {t('rebalance.executeHintEnd')}
          </span>
        </div>
      </div>

      {/* Score Card */}
      <div className="bg-[#0B1C17] border border-white/10 p-6 rounded-2xl flex items-center justify-between">
         <div>
            <h3 className="text-lg font-bold text-white mb-1">{t('rebalance.adherenceTitle')}</h3>
            <p className="text-sm text-gray-400">{t('rebalance.adherenceSub')}</p>
         </div>
         <div className="flex items-center gap-4">
            <div className="text-right">
               <div className="text-3xl font-bold text-white">{result.score.toFixed(0)}%</div>
               <div className={`text-xs font-bold ${result.score > 80 ? 'text-emerald-400' : (result.score > 50 ? 'text-yellow-400' : 'text-red-400')}`}>
                  {result.score > 80 ? t('rebalance.scoreExcellent') : (result.score > 50 ? t('rebalance.scoreAttention') : t('rebalance.scoreUnbalanced'))}
               </div>
            </div>
            <div className="h-16 w-16 relative">
               <svg className="h-full w-full" viewBox="0 0 36 36">
                  <path
                    className="text-gray-800"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className={result.score > 80 ? 'text-emerald-500' : (result.score > 50 ? 'text-yellow-500' : 'text-red-500')}
                    strokeDasharray={`${result.score}, 100`}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
               </svg>
            </div>
         </div>
      </div>

      <div className="bg-[#0B1C17] border border-red-500/30 p-4 rounded-2xl flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-red-300 uppercase tracking-wider">{t('rebalance.aggressivenessLabel')}</span>
          <span className="text-xs text-gray-300">
            {t('rebalance.aggressivenessDesc')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSellAggressiveness('conservative')}
            className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border ${
              sellAggressiveness === 'conservative'
                ? 'bg-red-500 text-black border-red-500'
                : 'border-white/20 text-gray-200 hover:bg-white/5'
            }`}
          >
            {t('rebalance.conservative')}
          </button>
          <button
            type="button"
            onClick={() => setSellAggressiveness('balanced')}
            className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border ${
              sellAggressiveness === 'balanced'
                ? 'bg-yellow-400 text-black border-yellow-400'
                : 'border-white/20 text-gray-200 hover:bg-white/5'
            }`}
          >
            {t('rebalance.balanced')}
          </button>
          <button
            type="button"
            onClick={() => setSellAggressiveness('aggressive')}
            className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border ${
              sellAggressiveness === 'aggressive'
                ? 'bg-red-600 text-white border-red-500'
                : 'border-white/20 text-gray-200 hover:bg-white/5'
            }`}
          >
            {t('rebalance.aggressive')}
          </button>
        </div>
      </div>

      <div className="bg-[#0B1C17] border border-emerald-500/30 p-4 rounded-2xl flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-emerald-300 uppercase tracking-wider">{t('rebalance.contribOnlyLabel')}</span>
          <span className="text-xs text-gray-300">
            {t('rebalance.contribOnlyDesc')}
          </span>
        </div>
        <div className="flex flex-col items-start md:items-end gap-2">
          <label className="inline-flex items-center gap-2 text-xs text-gray-200">
            <input
              type="checkbox"
              className="h-3 w-3 rounded border-gray-600 bg-black"
              checked={onlyContributions}
              onChange={e => setOnlyContributions(e.target.checked)}
            />
            <span>{t('rebalance.contribOnlyCheckbox')}</span>
          </label>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-gray-400">{t('rebalance.contributeNow')}</span>
            <div className="flex items-center rounded-lg border border-white/10 bg-black/40 px-2 py-1">
              <span className="text-[11px] text-gray-400 mr-1">R$</span>
              <input
                type="number"
                min={0}
                step={100}
                className="bg-transparent text-xs text-white w-24 outline-none"
                value={contributionInput}
                onChange={e => setContributionInput(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         {/* Action List */}
         <div className="lg:col-span-2 space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2"><Scale className="w-5 h-5 text-blue-500"/> {t('rebalance.suggestionsTitle')}</h3>
            
            {result.suggestions.map((sug, idx) => {
               const details = perClassAssetSuggestions[sug.assetClass];
               const buyTotal = details?.buys?.reduce((sum, b) => sum + b.total, 0) ?? 0;
               const sellTotal = details?.sells?.reduce((sum, s) => sum + s.total, 0) ?? 0;
               const aporte = Number(contributionInput.replace(',', '.')) || 0;
               const isOnlyContrib = onlyContributions && aporte > 0;
               const hasBuys = buyTotal > 0;
               let panelAction: 'BUY' | 'SELL' | 'HOLD' = sug.action;
               let panelAmount = Math.abs(sug.difference);

               if (isOnlyContrib) {
                 if (hasBuys) {
                   panelAction = 'BUY';
                   panelAmount = buyTotal;
                 } else if (panelAction !== 'HOLD') {
                   panelAction = 'HOLD';
                   panelAmount = 0;
                 }
               }
               return (
               <div key={idx} className={`bg-[#0B1C17] border p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4 transition-all ${
                  sug.status === 'CRITICAL' ? 'border-red-500/50 bg-red-500/5' : 
                  (sug.status === 'WARNING' ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-white/10')
               }`}>
                  <div className="flex-1 w-full">
                     <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-white">{sug.assetClass}</h4>
                        {sug.status === 'CRITICAL' && <span className="text-[10px] bg-red-500 text-white px-2 rounded-full">{t('rebalance.critical')}</span>}
                     </div>
                     <div className="flex items-center gap-4 text-xs text-gray-400">
                        <span>{t('rebalance.currentLabel')} <strong className="text-white">{sug.currentPercentage.toFixed(1)}%</strong></span>
                        <span>{t('rebalance.targetLabel')} <strong className="text-white">{sug.targetPercentage.toFixed(1)}%</strong></span>
                     </div>
                     <div className="w-full bg-gray-800 h-1.5 rounded-full mt-2 overflow-hidden">
                        <div className="h-full bg-blue-500/50" style={{ width: `${sug.targetPercentage}%` }}></div>
                        <div className="h-full bg-white relative top-[-6px] opacity-50" style={{ width: `${sug.currentPercentage}%` }}></div>
                     </div>
                    {details?.buys && details.buys.length > 0 && (
                      <div className="mt-3 space-y-1 text-xs text-gray-300">
                        <div className="flex items-center justify-between">
                          <div className="text-[10px] uppercase tracking-wider text-emerald-300/80 font-semibold">
                            {t('rebalance.tutorBuys')}
                          </div>
                          <button
                            type="button"
                            onClick={() => executeAllBuys(details.buys!)}
                            className="text-[10px] px-3 py-1 rounded-full border border-emerald-500/60 text-emerald-300 hover:bg-emerald-500/10"
                          >
                            {t('rebalance.executeAll')}
                          </button>
                        </div>
                        {details.buys.map(buy => (
                          <div key={buy.ticker} className="flex items-center justify-between gap-3">
                            <span className="truncate mr-2">{buy.ticker} · {buy.name}</span>
                            <div className="flex items-center gap-3">
                              <span className="font-mono text-white">
                                {formatCurrency(buy.total, 'BRL')}
                              </span>
                              <button
                                type="button"
                                onClick={() => openTrade(buy.ticker, 'BUY', buy.quantity)}
                                className="text-[10px] px-2 py-1 rounded-lg border border-emerald-500/60 text-emerald-400 hover:bg-emerald-500/10"
                              >
                                {t('rebalance.execute')}
                              </button>
                            </div>
                          </div>
                        ))}
                        <div className="text-[10px] text-gray-400">
                          {t('rebalance.totalLabel')}{' '}
                          <span className="font-mono text-white">
                            {formatCurrency(buyTotal, 'BRL')}
                          </span>
                          {' '}{t('rebalance.of')}{' '}
                          <span className="font-mono text-white">
                            {formatCurrency(Math.abs(sug.difference), 'BRL')}
                          </span>{' '}{t('rebalance.planned')}
                        </div>
                      </div>
                    )}
                    {details?.sells && details.sells.length > 0 && (
                      <div className="mt-3 space-y-1 text-xs text-gray-300">
                        <div className="text-[10px] uppercase tracking-wider text-red-300/80 font-semibold">{t('rebalance.sellsTitle')}</div>
                        {details.sells.map(sell => (
                          <div key={sell.ticker} className="flex items-center justify-between gap-3">
                            <span className="truncate mr-2">
                              {sell.ticker} · {sell.name}
                            </span>
                            <div className="flex items-center gap-3">
                              <span className="font-mono text-white">
                                {sell.quantity}x · {formatCurrency(sell.total, 'BRL')}
                              </span>
                              <button
                                type="button"
                                onClick={() => openTrade(sell.ticker, 'SELL', sell.quantity)}
                                className="text-[10px] px-2 py-1 rounded-lg border border-red-500/60 text-red-400 hover:bg-red-500/10"
                              >
                                {t('rebalance.execute')}
                              </button>
                            </div>
                          </div>
                        ))}
                        <div className="text-[10px] text-gray-400">
                          {t('rebalance.totalLabel')}{' '}
                          <span className="font-mono text-white">
                            {formatCurrency(sellTotal, 'BRL')}
                          </span>
                          {' '}{t('rebalance.of')}{' '}
                          <span className="font-mono text-white">
                            {formatCurrency(Math.abs(sug.difference), 'BRL')}
                          </span>{' '}{t('rebalance.planned')}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-4 min-w-[200px] justify-end">
                    {panelAction === 'HOLD' ? (
                        <div className="flex items-center gap-2 text-emerald-500 bg-emerald-500/10 px-4 py-2 rounded-lg">
                           <CheckCircle className="w-5 h-5" />
                           <span className="font-bold">{t('rebalance.hold')}</span>
                        </div>
                     ) : (
                        <div className={`flex items-center gap-3 px-4 py-2 rounded-lg w-full justify-between ${
                           panelAction === 'BUY' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                           <div className="flex flex-col">
                              <span className="text-[10px] font-bold uppercase tracking-wider">{panelAction === 'BUY' ? t('rebalance.buy') : t('rebalance.sell')}</span>
                              <span className="font-mono font-bold text-lg">{formatCurrency(panelAmount, 'BRL')}</span>
                           </div>
                           {panelAction === 'BUY' ? <ArrowLeft className="w-6 h-6 rotate-45" /> : <ArrowRight className="w-6 h-6 -rotate-45" />}
                        </div>
                     )}
                  </div>
               </div>
            )})}
         </div>

         {/* Mini Chart */}
         <div className="bg-[#0B1C17] border border-white/10 p-6 rounded-2xl h-fit">
            <h3 className="text-lg font-bold text-white mb-4">{t('rebalance.chartTitle')}</h3>
            <div className="h-[250px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                     <Pie
                        data={chartData}
                        dataKey="Current"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={60}
                        fill="#3B82F6"
                        stroke="none"
                     />
                     <Pie
                        data={chartData}
                        dataKey="Target"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={80}
                        fill="#10B981"
                        stroke="none"
                        label
                     />
                     <Tooltip 
                        contentStyle={{ backgroundColor: '#000', borderColor: '#333' }}
                     />
                  </PieChart>
               </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 text-xs mt-4">
               <div className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-500 rounded-full"></div> {t('rebalance.legendCurrent')}</div>
               <div className="flex items-center gap-1"><div className="w-3 h-3 bg-emerald-500 rounded-full"></div> {t('rebalance.legendTarget')}</div>
            </div>
         </div>
      </div>
      <AddInvestmentModal
        isOpen={isTradeModalOpen}
        onClose={() => setIsTradeModalOpen(false)}
        preSelectedAssetId={tradeAssetId}
        prefillType={tradeType}
        prefillQuantity={tradeQuantity}
      />
    </div>
  );
};

export default RebalancePage;
