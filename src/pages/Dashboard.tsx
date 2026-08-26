import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { formatCurrency } from '../lib/utils';
import { cn } from '../lib/utils';
import { Wallet, TrendingUp, ArrowRight, Plus, CheckCircle, Bell, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import AddInvestmentModal from '../components/AddInvestmentModal';
import RebalancingWidget from '../components/RebalancingWidget';
import DividendCalendar from '../components/DividendCalendar';
import HealthScoreWidget from '../components/HealthScoreWidget';
import MonthlyDecisionsWidget from '../components/MonthlyDecisionsWidget';
import SmartAlertsPanel from '../components/SmartAlertsPanel';
import { useUser } from '@clerk/clerk-react';
import { usePortfolioMetrics } from '../hooks/usePortfolioMetrics';
import { useContributionStreak } from '../hooks/useContributionStreak';
import { useMissionsGenerator } from '../hooks/useMissionsGenerator';
import { useExchangeRatePolling } from '../hooks/useExchangeRatePolling';
import FreshnessBadge from '../components/FreshnessBadge';
import MarketOverview from '../components/MarketOverview';
import AssetRankings from '../components/AssetRankings';
import MarketSummary from '../components/MarketSummary';
import { useDashboardWidgets } from '../hooks/useDashboardWidgets';
import type { QuoteSource } from '../types';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';

const Dashboard: React.FC = () => {
  const { user } = useUser();
  const { t } = useTranslation();
  const { portfolio, assets, settings } = useStore();
  const metrics = usePortfolioMetrics();
  const { streak: contributionStreak } = useContributionStreak();
  const generatedMissions = useMissionsGenerator();
  const { history: exchangeRateHistory, isPolling: isExchangeRatePolling } = useExchangeRatePolling();
  const { isEnabled, toggleWidget, availableWidgets } = useDashboardWidgets();
  const [showWidgetConfig, setShowWidgetConfig] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedAssetForModal, setSelectedAssetForModal] = useState<string | undefined>(undefined);

  // Get user name - prioritize first name, fall back to full name or email
  const userName = user?.firstName || user?.fullName || user?.primaryEmailAddress?.emailAddress?.split('@')[0] || t('dashboard.investor');

  // Calculate Total Value
  const totalValueBRL = metrics.totalMarketValue;

  // Currency Display Logic
  const mainCurrency = settings.baseCurrency;
  const mainTotalValue = mainCurrency === 'EUR' ? totalValueBRL / settings.exchangeRate : totalValueBRL;
  const secCurrency = mainCurrency === 'EUR' ? 'BRL' : 'EUR';
  const secTotalValue = mainCurrency === 'EUR' ? totalValueBRL : totalValueBRL / settings.exchangeRate;
  const exchangeRateLabel = settings.exchangeRateUpdatedAt
    ? new Date(settings.exchangeRateUpdatedAt).toLocaleString(i18n.language, {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    : null;
  const exchangeRateChange = settings.exchangeRateChangePct ?? 0;

  const monthlyIncomeBRL = metrics.monthlyIncome;
  const mainMonthlyIncome = mainCurrency === 'EUR' ? monthlyIncomeBRL / settings.exchangeRate : monthlyIncomeBRL;

  // Snowball Progress
  const snowballProgress = portfolio.length > 0 
    ? portfolio.reduce((acc, item) => {
        const asset = assets.find(a => a.id === item.assetId);
        if (!asset) return acc;
        const magicNumber = asset.magicNumber || Math.ceil(1200 / asset.dividendYield);
        const progress = Math.min(1, item.quantity / magicNumber);
        return acc + progress;
      }, 0) / portfolio.length * 100
    : 0;

  const pendingMissions = generatedMissions.filter(m => m.status === 'pending');
  const completedMissions = generatedMissions.filter(m => m.status === 'completed');
  const nextMissions = [...pendingMissions, ...completedMissions].slice(0, 3);

  const handleOpenAddModal = (assetId?: string) => {
    setSelectedAssetForModal(assetId);
    setIsAddModalOpen(true);
  };

  return (
    <div className="bg-premium min-h-screen">
      {/* Background Glows */}
      <div className="premium-glow-1" />
      <div className="premium-glow-2" />

      <div className="relative z-10 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 pt-4">
        {/* Header / Welcome */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
               {t('dashboard.welcomeGreeting')} <span className="text-emerald-400">{userName}</span>
            </h1>
            <p className="text-gray-500 text-sm font-medium">{t('dashboard.subtitle')}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-emerald-400 hover:bg-emerald-500/10 transition-colors cursor-pointer">
              <Bell className="h-5 w-5" />
            </div>
            <button 
              onClick={() => handleOpenAddModal()}
              className="h-10 px-4 rounded-xl bg-emerald-500 text-black font-black text-xs flex items-center justify-center gap-2 hover:bg-emerald-400 transition-colors cursor-pointer shadow-lg shadow-emerald-500/20"
            >
               <Plus className="w-4 h-4" /> {t('dashboard.newContribution')}
            </button>
          </div>
        </div>

        {/* Top Stats: Exchange Rate & Magic Number */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-12">
            <MonthlyDecisionsWidget />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* EUR/BRL Card */}
          <div className="lg:col-span-4 glass-card rounded-[2rem] p-8 border-white/5 hover:border-emerald-500/20 transition-all group overflow-hidden relative">
             <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                <TrendingUp className="w-32 h-32 text-emerald-500" />
             </div>
             
             <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
                   <div className="flex items-center justify-between mb-8">
                      <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{t('dashboard.exchangeRateTitle')}</span>
                      <div className="flex items-center gap-1.5">
                         {isExchangeRatePolling && (
                            <RefreshCw className="w-3 h-3 text-emerald-400 animate-spin" />
                         )}
                         <div className={`w-2 h-2 rounded-full ${isExchangeRatePolling ? 'bg-emerald-500 animate-pulse' : 'bg-gray-500'}`} />
                      </div>
                   </div>
                   
                   <div className="flex items-baseline gap-3 mb-2">
                      <h2 className="text-6xl font-black text-emerald-400 tracking-tighter">
                         {settings.exchangeRate.toFixed(2)}
                      </h2>
                      <span className="text-xl font-bold text-gray-500">BRL</span>
                   </div>
                   <div className={`flex items-center gap-2 text-xs font-bold ${exchangeRateChange >= 0 ? 'text-emerald-500/80' : 'text-red-400'}`}>
                      <TrendingUp className="w-3 h-3" />
                      <span>
                        {exchangeRateChange >= 0 ? '+' : ''}{exchangeRateChange.toFixed(2)}%
                        {exchangeRateLabel ? ` • ${exchangeRateLabel}` : ''}
                      </span>
                   </div>
                   <div className="mt-2">
                      <FreshnessBadge 
                        source={(settings.exchangeRateSource as QuoteSource) || 'awesomeapi'} 
                        lastUpdatedAt={settings.exchangeRateUpdatedAt || null} 
                      />
                   </div>
                </div>

                {/* Mini Chart — dados reais do historico */}
                <div className="mt-8 h-20 w-full relative">
                   {exchangeRateHistory.length >= 2 ? (
                      <>
                         <svg className="w-full h-full" viewBox="0 0 100 30" preserveAspectRatio="none">
                            {(() => {
                               const displayPoints = exchangeRateHistory.slice(-48); // ultimas ~4h
                               const rates = displayPoints.map(p => p.rate);
                               const minRate = Math.min(...rates);
                               const maxRate = Math.max(...rates);
                               const range = maxRate - minRate || 0.01;
                               const isUp = rates[rates.length - 1] >= rates[0];
                               const colorClass = isUp ? 'text-emerald-500/40' : 'text-red-400/40';
                               const fillId = isUp ? 'gradient-green-dash' : 'gradient-red-dash';
                               const pathD = displayPoints
                                  .map((p, i) => {
                                     const x = (i / (displayPoints.length - 1)) * 100;
                                     const y = 28 - ((p.rate - minRate) / range) * 24;
                                     return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
                                  })
                                  .join(' ');
                               const areaD = pathD + ` L100 30 L0 30 Z`;
                               return (
                                  <>
                                     <path d={pathD} fill="none" stroke="currentColor" strokeWidth="2" className={colorClass} />
                                     <path d={areaD} fill={`url(#${fillId})`} className="opacity-10" />
                                     <defs>
                                        <linearGradient id="gradient-green-dash" x1="0" x2="0" y1="0" y2="1">
                                           <stop offset="0%" stopColor="#10b981" />
                                           <stop offset="100%" stopColor="transparent" />
                                        </linearGradient>
                                        <linearGradient id="gradient-red-dash" x1="0" x2="0" y1="0" y2="1">
                                           <stop offset="0%" stopColor="#f87171" />
                                           <stop offset="100%" stopColor="transparent" />
                                        </linearGradient>
                                     </defs>
                                  </>
                               );
                            })()}
                         </svg>
                         <div className="flex justify-between mt-2 text-[8px] font-black text-gray-600 uppercase tracking-tighter">
                            <span>{new Date(exchangeRateHistory[Math.max(0, exchangeRateHistory.length - 48)].timestamp).toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' })}</span>
                            <span>{new Date(exchangeRateHistory[Math.max(0, exchangeRateHistory.length - 24)].timestamp).toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' })}</span>
                            <span>{new Date(exchangeRateHistory[Math.max(0, exchangeRateHistory.length - 12)].timestamp).toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' })}</span>
                            <span>{new Date(exchangeRateHistory[exchangeRateHistory.length - 1].timestamp).toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' })}</span>
                         </div>
                      </>
                   ) : (
                      <>
                         <svg className="w-full h-full" viewBox="0 0 100 30" preserveAspectRatio="none">
                            <path d="M0 25 Q 10 20, 20 22 T 40 15 T 60 18 T 80 10 T 100 5" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-500/40" />
                            <path d="M0 25 Q 10 20, 20 22 T 40 15 T 60 18 T 80 10 T 100 5 V 30 H 0 Z" fill="url(#gradient-green-dash)" className="opacity-10" />
                            <defs>
                               <linearGradient id="gradient-green-dash" x1="0" x2="0" y1="0" y2="1">
                                  <stop offset="0%" stopColor="#10b981" />
                                  <stop offset="100%" stopColor="transparent" />
                               </linearGradient>
                            </defs>
                         </svg>
                         <div className="flex justify-between mt-2 text-[8px] font-black text-gray-600 uppercase tracking-tighter">
                            <span>09:00</span><span>12:00</span><span>15:00</span><span>18:00</span>
                         </div>
                      </>
                   )}
                </div>
             </div>
          </div>

          {/* TOTAL EQUITY CARD */}
          <div className="lg:col-span-4 glass-card rounded-[2rem] p-8 border-white/5 hover:border-blue-500/20 transition-all group overflow-hidden relative">
             <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                <Wallet className="w-32 h-32 text-blue-500" />
             </div>
             <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-8 block">{t('dashboard.totalEquity')}</span>
                  <h2 className="text-5xl font-black text-white tracking-tighter mb-2">
                    {formatCurrency(mainTotalValue, mainCurrency)}
                  </h2>
                  <p className="text-gray-500 font-mono text-sm tracking-tight">
                    ≈ {formatCurrency(secTotalValue, secCurrency)}
                  </p>
                </div>
                
                <div className="mt-8 p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                   <div>
                      <p className="text-[9px] font-black text-gray-500 uppercase">{t('dashboard.monthlyIncome')}</p>
                      <p className="text-sm font-bold text-emerald-400">{formatCurrency(mainMonthlyIncome, mainCurrency)}</p>
                   </div>
                   <div className="text-right">
                      <p className="text-[9px] font-black text-gray-500 uppercase">{t('dashboard.annualProjection')}</p>
                      <p className="text-sm font-bold text-white">{formatCurrency(mainMonthlyIncome * 12, mainCurrency)}</p>
                   </div>
                </div>
             </div>
          </div>

          {/* MAGIC NUMBER TRACKER (Neon Circular) */}
          <div className="lg:col-span-4 glass-card rounded-[2rem] p-8 border-white/5 hover:border-purple-500/20 transition-all group overflow-hidden relative">
             <div className="relative z-10 flex flex-col items-center justify-center h-full">
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-6 w-full">{t('dashboard.magicNumberTracker')}</span>
                
                <div className="relative w-40 h-40 flex items-center justify-center">
                   {/* Background Circle */}
                   <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
                      <circle 
                         cx="80" cy="80" r="70" 
                         fill="none" 
                         stroke="rgba(255,255,255,0.05)" 
                         strokeWidth="12" 
                      />
                      {/* Progress Circle with Glow */}
                      <circle 
                         cx="80" cy="80" r="70" 
                         fill="none" 
                         stroke="url(#gradient-neon-dash)" 
                         strokeWidth="12" 
                         strokeDasharray={440}
                         strokeDashoffset={440 - (440 * snowballProgress) / 100}
                         strokeLinecap="round"
                         className="transition-all duration-1000"
                      />
                      <defs>
                         <linearGradient id="gradient-neon-dash" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="#10b981" />
                            <stop offset="100%" stopColor="#3b82f6" />
                         </linearGradient>
                      </defs>
                   </svg>
                   <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-4xl font-black text-white">{snowballProgress.toFixed(0)}%</span>
                   </div>
                </div>

                <div className="mt-8 text-center text-white">
                   <h3 className="text-xl font-black">
                      {snowballProgress.toFixed(1)}% <span className="text-gray-600">{t('dashboard.completed')}</span>
                   </h3>
                   <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mt-1">{t('dashboard.statusArrivingGoal')}</p>
                </div>
             </div>
          </div>
        </div>

        {/* Assets Table Section */}
        <div className="glass-card rounded-[2rem] overflow-hidden border-white/5">
           <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
              <div>
                 <h3 className="text-lg font-black text-white uppercase tracking-tighter underline decoration-emerald-500 decoration-2 underline-offset-4">{t('dashboard.topAssetsTitle')}</h3>
                 <p className="text-[10px] text-gray-500 font-bold uppercase mt-1">{t('dashboard.topAssetsSubtitle')}</p>
              </div>
              <Link to="/market" className="text-[10px] font-black text-emerald-400 hover:text-emerald-300 transition-colors uppercase tracking-widest flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                 {t('dashboard.marketIntelligence')} <ArrowRight className="w-3 h-3" />
              </Link>
           </div>
           
           <div className="overflow-x-auto">
              <table className="w-full text-left">
                 <thead>
                    <tr className="text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-white/5 px-8">
                       <th className="px-8 py-6">{t('dashboard.colAsset')}</th>
                       <th className="px-8 py-6">{t('dashboard.colStatus')}</th>
                       <th className="px-8 py-6 text-right">{t('dashboard.colPrice')}</th>
                       <th className="px-8 py-6 text-right">{t('dashboard.colProfitLoss')}</th>
                       <th className="px-8 py-6 text-right">{t('dashboard.colDividendYield')}</th>
                       <th className="px-8 py-6 text-right">{t('dashboard.colWeight')}</th>
                       <th className="px-8 py-6 text-right">{t('dashboard.colConfidence')}</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-white/[0.02]">
                    {metrics.assets.slice(0, 5).map((asset) => (
                       <tr key={asset.assetId} className="group hover:bg-white/[0.02] transition-all">
                          <td className="px-8 py-6">
                             <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 group-hover:text-emerald-400 transition-colors text-[10px] font-black">
                                   {asset.ticker.substring(0, 2)}
                                </div>
                                <div>
                                   <p className="text-sm font-black text-white">{asset.ticker}</p>
                                   <p className="text-[10px] text-gray-500 font-bold uppercase">{asset.name || t('dashboard.financialAsset')}</p>
                                </div>
                             </div>
                          </td>
                          <td className="px-8 py-6">
                             <div className="w-24 h-6 text-emerald-400/40">
                                <svg className="w-full h-full" viewBox="0 0 100 30" preserveAspectRatio="none">
                                   <path 
                                      d={asset.profitLoss >= 0 
                                        ? "M0 25 L 10 22 L 20 23 L 30 18 L 40 20 L 50 15 L 60 16 L 70 10 L 80 12 L 90 5 L 100 8"
                                        : "M0 5 L 10 8 L 20 7 L 30 12 L 40 10 L 50 15 L 60 14 L 70 20 L 80 18 L 90 25 L 100 22"
                                      } 
                                      fill="none" stroke="currentColor" strokeWidth="2"
                                   />
                                </svg>
                             </div>
                          </td>
                          <td className="px-8 py-6 text-right text-white font-mono text-sm leading-none">
                             {formatCurrency(asset.currentPrice, 'BRL')}
                          </td>
                          <td className="px-8 py-6 text-right">
                             <div className={`font-black text-xs ${asset.profitLoss >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                <div>{asset.profitLoss >= 0 ? '+' : ''}{formatCurrency(asset.profitLoss, 'BRL')}</div>
                                <div className="text-[10px]">{asset.profitLossPct >= 0 ? '+' : ''}{asset.profitLossPct.toFixed(2)}%</div>
                             </div>
                          </td>
                          <td className="px-8 py-6 text-right text-gray-400 font-black text-sm">
                             {asset.dividendYield.toFixed(1)}%
                          </td>
                          <td className="px-8 py-6 text-right text-gray-400 font-black text-sm">
                             {asset.weight.toFixed(1)}%
                          </td>
                          <td className="px-8 py-6 text-right">
                             <FreshnessBadge 
                               source={asset.quoteSource} 
                               lastUpdatedAt={asset.quoteUpdatedAt} 
                               compact 
                             />
                          </td>
                       </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           <RebalancingWidget categoryBreakdown={metrics.categoryBreakdown} />
           <HealthScoreWidget />
           <div className="glass-card rounded-[2rem] p-8">
              <DividendCalendar />
           </div>
        </div>

        {/* Missions & Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           <div className="glass-card rounded-[2rem] p-8 border-white/5">
              <div className="flex items-center justify-between mb-8">
                 <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-3">
                    <CheckCircle className="w-4 h-4 text-emerald-400" /> {t('dashboard.planMissions')}
                 </h3>
                 <span className="text-[10px] font-black text-emerald-400 px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                    {t('dashboard.streak', { meses: contributionStreak })}
                 </span>
              </div>
              <div className="space-y-4">
                 {nextMissions.map(m => (
                    <div key={m.id} className={cn(
                      "p-4 rounded-3xl border transition-all",
                      m.status === 'completed'
                        ? 'bg-emerald-500/5 border-emerald-500/20'
                        : 'bg-white/[0.01] border-white/5 hover:border-emerald-500/20'
                    )}>
                       <div className="flex items-start gap-3">
                          <div className={cn(
                            "mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0",
                            m.status === 'completed' ? 'bg-emerald-500/20' : 'bg-white/5'
                          )}>
                             {m.status === 'completed'
                               ? <CheckCircle className="w-3 h-3 text-emerald-400" />
                               : <div className="w-2 h-2 rounded-full bg-amber-400" />
                             }
                          </div>
                          <div className="flex-1 min-w-0">
                             <p className="text-[10px] font-black text-emerald-500 uppercase mb-1">{m.category}</p>
                             <p className="text-sm font-bold text-white">{m.title}</p>
                             <p className="text-[11px] text-gray-500 mt-1">{m.description}</p>
                          </div>
                       </div>
                    </div>
                 ))}
              </div>
           </div>

           <SmartAlertsPanel compact maxItems={5} />
        </div>

        {/* Widget Config Toggle */}
        <div className="glass-card rounded-[2rem] p-6 border-white/5">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setShowWidgetConfig(!showWidgetConfig)}
              className="text-[10px] font-black text-gray-500 hover:text-emerald-400 transition-colors uppercase tracking-widest"
            >
              {showWidgetConfig ? t('dashboard.closeConfig') : t('dashboard.customizeWidgets')}
            </button>
          </div>
          {showWidgetConfig && (
            <div className="flex flex-wrap gap-2">
              {availableWidgets.map(w => (
                <button
                  key={w.id}
                  onClick={() => toggleWidget(w.id)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border',
                    isEnabled(w.id)
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-white/5 text-gray-600 border-white/5 hover:text-white'
                  )}
                >
                  {t(w.labelKey)}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Market Overview Widget */}
        {isEnabled('market_overview') && (
          <div className="glass-card rounded-[2rem] p-8 border-white/5">
            <MarketOverview compact />
          </div>
        )}

        {/* Market Summary Widget */}
        {isEnabled('rankings') && (
          <div className="glass-card rounded-[2rem] p-8 border-white/5">
            <MarketSummary compact />
          </div>
        )}

        {/* Asset Rankings Widget */}
        {isEnabled('fiis_destaque') && (
          <div className="glass-card rounded-[2rem] p-8 border-white/5">
            <AssetRankings compact />
          </div>
        )}
      </div>

      <AddInvestmentModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)}
        preSelectedAssetId={selectedAssetForModal}
      />
    </div>
  );
};

export default Dashboard;
