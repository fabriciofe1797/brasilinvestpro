import React, { useMemo, useState } from 'react';
import { useStore } from '../store/useStore';
import { formatCurrency, getMagicNumber, getMagicStatus } from '../lib/utils';
import { 
  TrendingUp, Calendar, Lock, CheckCircle2, 
  Zap, Snowflake, Info, Sparkles, TrendingDown,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';

const DividendsPage: React.FC = () => {
  const { portfolio, assets, transactions } = useStore();
  const { t } = useTranslation();
  const [calendarDate, setCalendarDate] = useState(new Date());

  const monthNames = t('dividends.monthsShort', { returnObjects: true }) as string[];
  const weekDays = t('dividends.weekDays', { returnObjects: true }) as string[];

  // 1. Enrich Portfolio with Dividend Data & Magic Number
  const dividendPortfolio = useMemo(() => {
    return portfolio.map(item => {
      const assetDetails = assets.find(a => a.id === item.assetId);
      
      const price = assetDetails?.price || item.averagePrice;
      const lastDividend = assetDetails?.lastDividend || 0;
      const dy = assetDetails?.dividendYield || 0;
      
      const magicNumber = getMagicNumber(dy, assetDetails?.magicNumber);
      const magic = getMagicStatus(item.quantity, magicNumber);
      
      const monthlyIncome = item.quantity * lastDividend;

      return {
        ...item,
        ticker: assetDetails?.ticker || item.assetId,
        name: assetDetails?.name || item.assetId,
        price,
        lastDividend,
        magicNumber,
        magic,
        monthlyIncome,
        category: assetDetails?.category || 'Outros'
      };
    }).filter(item => item.monthlyIncome > 0 || item.lastDividend > 0)
      .sort((a, b) => b.magic.progress - a.magic.progress);
  }, [portfolio, assets]);

  // 2. Aggregate Stats
  const stats = useMemo(() => {
    const totalMonthly = dividendPortfolio.reduce((sum, item) => sum + item.monthlyIncome, 0);
    const magicNumberAchieved = dividendPortfolio.filter(item => item.magic.reached).length;
    
    const projection = Array.from({ length: 12 }, (_, i) => {
      const variation = 0.95 + (Math.random() * 0.1); 
      return {
        month: monthNames[i],
        amount: totalMonthly * variation
      };
    });

    return { totalMonthly, magicNumberAchieved, projection };
  }, [dividendPortfolio, monthNames]);

  return (
    <div className="bg-premium min-h-screen">
      <div className="premium-glow-1" />
      <div className="premium-glow-2" />

      <div className="relative z-10 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 pt-4">
        {/* Header */}
        <div className="flex flex-col space-y-4">
          <div className="flex items-center gap-4">
             <h1 className="text-3xl font-black tracking-tight text-white uppercase underline decoration-emerald-500 decoration-4 underline-offset-8">{t('dividends.titleStart')}<span className="text-emerald-500">{t('dividends.titleHighlight')}</span></h1>
             <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-black text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg shadow-amber-500/20">{t('dividends.badge')}</span>
          </div>
          <p className="text-gray-500 text-sm font-bold uppercase tracking-widest">
            {t('dividends.subtitle')}
          </p>
        </div>

        {/* Top KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card rounded-[2rem] p-8 border-white/5 relative overflow-hidden group hover:border-emerald-500/20 transition-all">
             <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                <Calendar className="w-24 h-24 text-emerald-500" />
             </div>
             <div className="flex items-center gap-2 mb-4">
               <span className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em]">{t('dividends.kpiMonthly')}</span>
               <Info className="w-3.5 h-3.5 text-emerald-500/50" />
             </div>
             <div className="text-4xl font-black text-white px-1 tracking-tighter">{formatCurrency(stats.totalMonthly, 'BRL')}</div>
             <div className="flex items-center gap-2 mt-6 text-[9px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-500/10 w-fit px-4 py-1.5 rounded-full border border-emerald-500/20">
                <Zap className="w-3 h-3" /> {t('dividends.kpiMonthlyBadge')}
             </div>
          </div>

          <div className="glass-card rounded-[2rem] p-8 border-white/5 relative overflow-hidden group hover:border-blue-500/20 transition-all">
             <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                <Snowflake className="w-24 h-24 text-blue-500" />
             </div>
             <span className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] mb-4 block">{t('dividends.kpiSnowball')}</span>
             <div className="text-4xl font-black text-blue-400 px-1 tracking-tighter">
                {stats.magicNumberAchieved} <span className="text-lg text-gray-700 uppercase tracking-[0.1em]">{t('dividends.assetsLabel')}</span>
             </div>
             <div className="flex items-center gap-2 mt-6 text-[9px] font-black text-blue-400 uppercase tracking-widest bg-blue-500/10 w-fit px-4 py-1.5 rounded-full border border-blue-500/20">
                {t('dividends.kpiSnowballBadge')}
             </div>
          </div>

          <div className="glass-card rounded-[2rem] p-8 border-white/5 relative overflow-hidden group hover:border-purple-500/20 transition-all">
             <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                <TrendingUp className="w-24 h-24 text-purple-500" />
             </div>
             <span className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] mb-4 block">{t('dividends.kpiProjection')}</span>
             <div className="text-4xl font-black text-purple-400 px-1 tracking-tighter">{formatCurrency(stats.totalMonthly * 12, 'BRL')}</div>
             <div className="flex items-center gap-2 mt-6 text-[9px] font-black text-purple-400 uppercase tracking-widest bg-purple-500/10 w-fit px-4 py-1.5 rounded-full border border-purple-500/20">
                {t('dividends.kpiProjectionBadge')}
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           {/* Chart Section */}
           <div className="lg:col-span-2 glass-card rounded-[2.5rem] p-10 border-white/5 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-blue-500 opacity-50" />
              <div className="flex items-center justify-between mb-10">
                 <h3 className="text-lg font-black text-white uppercase tracking-[0.2em] flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-emerald-500"/> {t('dividends.chartTitle')}
                 </h3>
                 <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">{t('dividends.chartSub')}</span>
              </div>
              
              <div className="h-[350px] w-full mt-4">
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.projection} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                       <defs>
                          <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                             <stop offset="0%" stopColor="#10B981" stopOpacity={0.8}/>
                             <stop offset="100%" stopColor="#10B981" stopOpacity={0.1}/>
                          </linearGradient>
                       </defs>
                       <XAxis 
                          dataKey="month" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#4B5563', fontSize: 10, fontWeight: 900, textAnchor: 'middle' }} 
                       />
                       <YAxis hide />
                       <Tooltip 
                          cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                          contentStyle={{ 
                             backgroundColor: '#030816', 
                             border: '1px solid rgba(255,255,255,0.05)', 
                             borderRadius: '1rem',
                             boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                             padding: '12px'
                          }}
                          itemStyle={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', color: '#10B981' }}
                          labelStyle={{ fontSize: '12px', fontWeight: '900', color: '#fff', marginBottom: '8px' }}
                          formatter={(value: number) => [formatCurrency(value, 'BRL'), t('dividends.tooltipLabel')]}
                       />
                       <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                          {stats.projection.map((entry, index) => (
                             <Cell key={`cell-${index}`} fill="url(#barGradient)" />
                          ))}
                       </Bar>
                    </BarChart>
                 </ResponsiveContainer>
              </div>
           </div>

           {/* Magic Number List (Gamification Refined) */}
           <div className="glass-card rounded-[2.5rem] p-8 border-white/5 shadow-2xl flex flex-col h-full bg-white/[0.01]">
              <div className="mb-8">
                 <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-black text-white uppercase tracking-[0.2em] flex items-center gap-3">
                       <Snowflake className="w-5 h-5 text-blue-500"/> {t('dividends.snowballTitle')}
                    </h3>
                    <div className="bg-blue-500/10 text-blue-400 p-2 rounded-xl border border-blue-500/20">
                       <Sparkles className="w-4 h-4" />
                    </div>
                 </div>
                 <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest leading-relaxed">
                    {t('dividends.snowballSub')}
                 </p>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 space-y-4 no-scrollbar max-h-[480px]">
                 {dividendPortfolio.map((asset) => (
                    <div key={asset.assetId} className="bg-white/[0.02] border border-white/5 p-5 rounded-3xl hover:border-emerald-500/30 transition-all group relative overflow-hidden">
                       <div className="flex justify-between items-start mb-4 relative z-10">
                          <div className="flex items-center gap-4">
                             {asset.magic.reached ? (
                                <div className="bg-emerald-500/20 p-2 rounded-xl text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                                   <CheckCircle2 className="w-4 h-4" />
                                </div>
                             ) : (
                                <div className="bg-white/5 p-2 rounded-xl text-gray-700 border border-white/5 group-hover:text-emerald-500/50 transition-all">
                                   <Lock className="w-4 h-4" />
                                </div>
                             )}
                             <div>
                                <div className="font-black text-white text-base tracking-tighter">{asset.ticker}</div>
                                <div className="text-[9px] text-gray-600 font-black uppercase tracking-widest">{formatCurrency(asset.lastDividend, 'BRL')} {t('dividends.perShare')}</div>
                             </div>
                          </div>
                          <div className="text-right">
                             <div className="text-[10px] text-gray-600 font-black uppercase tracking-tighter">{t('dividends.target')} <span className="text-white">{asset.magicNumber || '??'}</span></div>
                             <div className="text-[10px] text-emerald-500 font-black uppercase tracking-tighter mt-0.5">{t('dividends.held')} {asset.quantity}</div>
                          </div>
                       </div>
                       
                       {/* Neon Progress Bar */}
                       <div className="relative h-2 w-full bg-white/5 rounded-full overflow-hidden p-[1px] relative z-10">
                          <div 
                             className={`absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ${asset.magic.reached ? 'bg-gradient-to-r from-emerald-500 to-blue-500' : 'bg-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]'}`}
                             style={{ width: `${asset.magic.progress}%` }}
                          />
                       </div>
                       
                       {!asset.magic.reached && asset.magicNumber > 0 && (
                          <div className="mt-3 flex justify-between items-center relative z-10">
                             <span className="text-[8px] font-black text-gray-700 uppercase tracking-widest">{t('dividends.percentDone', { value: asset.magic.progress.toFixed(0) })}</span>
                             <span className="text-[8px] font-black text-emerald-400 bg-emerald-500/5 px-2 py-0.5 rounded-lg border border-emerald-500/10 uppercase tracking-widest">
                                {t('dividends.sharesRemaining', { count: asset.magic.remaining })}
                             </span>
                          </div>
                       )}
                    </div>
                 ))}

                 {dividendPortfolio.length === 0 && (
                    <div className="text-center py-20 px-8">
                       <div className="w-16 h-16 bg-white/5 border border-white/5 rounded-3xl flex items-center justify-center mx-auto mb-6">
                          <TrendingDown className="w-8 h-8 text-gray-700" />
                       </div>
                       <p className="text-gray-500 font-black uppercase text-xs tracking-[0.2em] leading-relaxed">
                          {t('dividends.empty')}
                       </p>
                    </div>
                 )}
              </div>
           </div>
        </div>

        {/* Histórico de Dividendos (Calendário) */}
        <div className="glass-card rounded-[2.5rem] p-10 border-white/5 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-blue-500 opacity-50" />
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-black text-white uppercase tracking-[0.2em] flex items-center gap-3">
              <Calendar className="w-5 h-5 text-emerald-500" />
              {t('dividends.historyTitle')}
            </h3>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1))}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
              >
                <ChevronLeft className="w-4 h-4 text-white" />
              </button>
              <span className="text-sm font-black text-white uppercase tracking-widest min-w-[140px] text-center">
                {calendarDate.toLocaleString(i18n.language, { month: 'long', year: 'numeric' })}
              </span>
              <button 
                onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1))}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
              >
                <ChevronRight className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2 mb-6">
            {weekDays.map(day => (
              <div key={day} className="text-center text-[10px] font-black text-gray-600 uppercase tracking-widest py-2">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {(() => {
              const year = calendarDate.getFullYear();
              const month = calendarDate.getMonth();
              const firstDay = new Date(year, month, 1).getDay();
              const daysInMonth = new Date(year, month + 1, 0).getDate();
              const days: React.ReactElement[] = [];

              // Empty cells for days before month starts
              for (let i = 0; i < firstDay; i++) {
                days.push(<div key={`empty-${i}`} className="aspect-square bg-white/[0.01] rounded-lg" />);
              }

              // Days of the month
              for (let day = 1; day <= daysInMonth; day++) {
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const dayTransactions = transactions.filter(tx => tx.date.startsWith(dateStr) && tx.type === 'DIVIDEND');
                const totalDividends = dayTransactions.reduce((sum, tx) => sum + tx.total, 0);
                const hasDividends = dayTransactions.length > 0;

                days.push(
                  <div 
                    key={day} 
                    className={`aspect-square rounded-lg p-2 border transition-all ${
                      hasDividends 
                        ? 'bg-emerald-500/10 border-emerald-500/30 hover:border-emerald-500/50' 
                        : 'bg-white/[0.02] border-white/5 hover:border-white/10'
                    }`}
                  >
                    <div className={`text-xs font-black ${hasDividends ? 'text-emerald-400' : 'text-gray-600'}`}>
                      {day}
                    </div>
                    {hasDividends && (
                      <div className="mt-1">
                        <div className="text-[8px] font-black text-emerald-400 uppercase tracking-tighter">
                          {formatCurrency(totalDividends, 'BRL')}
                        </div>
                        <div className="text-[7px] text-gray-500 font-bold mt-0.5">
                          {t('dividends.txCount', { count: dayTransactions.length })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              }

              return days;
            })()}
          </div>

          {/* Monthly Summary */}
          <div className="mt-8 pt-6 border-t border-white/5 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2">{t('dividends.totalReceived')}</div>
              <div className="text-2xl font-black text-emerald-400">
                {formatCurrency(
                  transactions
                    .filter(tx => tx.date.startsWith(`${calendarDate.getFullYear()}-${String(calendarDate.getMonth() + 1).padStart(2, '0')}`) && tx.type === 'DIVIDEND')
                    .reduce((sum, tx) => sum + tx.total, 0),
                  'BRL'
                )}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2">{t('dividends.numTransactions')}</div>
              <div className="text-2xl font-black text-white">
                {transactions.filter(tx => tx.date.startsWith(`${calendarDate.getFullYear()}-${String(calendarDate.getMonth() + 1).padStart(2, '0')}`) && tx.type === 'DIVIDEND').length}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2">{t('dividends.payingAssets')}</div>
              <div className="text-2xl font-black text-blue-400">
                {new Set(
                  transactions
                    .filter(tx => tx.date.startsWith(`${calendarDate.getFullYear()}-${String(calendarDate.getMonth() + 1).padStart(2, '0')}`) && tx.type === 'DIVIDEND')
                    .map(tx => tx.assetId)
                ).size}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DividendsPage;
