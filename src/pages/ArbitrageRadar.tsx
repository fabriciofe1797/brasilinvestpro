import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { Navigation, ArrowRightLeft, TrendingUp, Info, AlertTriangle, CheckCircle2, Globe } from 'lucide-react';
import { cn } from '../lib/utils';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const mockData = [
  { date: '01/03', rate: 5.42 },
  { date: '05/03', rate: 5.45 },
  { date: '10/03', rate: 5.38 },
  { date: '15/03', rate: 5.48 },
  { date: '20/03', rate: 5.51 },
  { date: '22/03', rate: 5.54 },
];

const ArbitrageRadar: React.FC = () => {
  const [amount, setAmount] = useState<number>(1000);
  const { t } = useTranslation();
  const currentRate = 5.54;
  const bankRate = 5.38;
  const spread = ((currentRate - bankRate) / currentRate) * 100;
  const totalBRL = amount * currentRate;
  const bankBRL = amount * bankRate;
  const savings = totalBRL - bankBRL;

  return (
    <div className="space-y-10 animate-in fade-in duration-1000 pb-32">
      {/* Header Protocol */}
      <div className="glass-card rounded-[3rem] border-emerald-500/20 bg-emerald-500/[0.02] p-10 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-emerald-500/10 blur-[80px] rounded-full" />
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
               <div className="bg-emerald-500 p-3 rounded-2xl shadow-xl shadow-emerald-500/20">
                  <Globe className="w-6 h-6 text-black" />
               </div>
               <div>
                  <h2 className="text-3xl font-black text-white uppercase tracking-tighter">{t('arbitrage.titleStart')} <span className="text-emerald-500">{t('arbitrage.titleHighlight')}</span></h2>
                  <div className="text-[10px] text-emerald-500 font-black uppercase tracking-[0.3em]">{t('arbitrage.protocol')}</div>
               </div>
            </div>
            <p className="text-gray-400 font-bold text-sm uppercase tracking-widest leading-relaxed max-w-2xl">
              {t('arbitrage.desc')}
            </p>
          </div>
          <div className="bg-black/40 border border-white/5 rounded-2xl px-6 py-4 flex items-center gap-4 backdrop-blur-md">
             <div className="flex flex-col text-right">
                <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest">{t('arbitrage.parityLabel')}</span>
                <span className="text-emerald-500 font-black text-xl tracking-tighter">{t('arbitrage.parityValue', { rate: currentRate.toFixed(2) })}</span>
             </div>
             <div className="w-1.5 h-10 rounded-full bg-emerald-500/20 relative overflow-hidden">
                <div className="absolute top-0 w-full bg-emerald-500 animate-[bounce_2s_infinite]" style={{ height: '40%' }} />
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Main Chart: Liquidity Matrix */}
        <div className="lg:col-span-2 glass-card rounded-[3rem] border-white/5 p-10 space-y-10">
           <div className="flex items-center justify-between">
              <div className="space-y-1">
                 <h3 className="text-sm font-black text-white uppercase tracking-[0.3em] flex items-center gap-3">
                   <TrendingUp className="w-5 h-5 text-emerald-500"/> {t('arbitrage.liquidityTitle')}
                 </h3>
                 <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest">{t('arbitrage.liquiditySub')}</p>
              </div>
              <div className="flex gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/5">
                 {['1W', '1M', '3M', '1Y'].map((p) => (
                    <button key={p} className={cn(
                       "px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                       p === '1M' ? "bg-emerald-500 text-black shadow-lg" : "text-gray-500 hover:text-white"
                    )}>{p}</button>
                 ))}
              </div>
           </div>

           <div className="h-[350px] w-full group">
              <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={mockData}>
                    <defs>
                       <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                       </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="0" stroke="rgba(255,255,255,0.03)" vertical={false} />
                    <XAxis 
                       dataKey="date" 
                       axisLine={false} 
                       tickLine={false} 
                       tick={{fill: 'rgba(255,255,255,0.2)', fontSize: 9, fontWeight: 900}}
                       dy={15}
                    />
                    <YAxis 
                       hide 
                       domain={['dataMin - 0.1', 'dataMax + 0.1']}
                    />
                    <Tooltip 
                       contentStyle={{backgroundColor: '#020617', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '1.5rem', padding: '20px'}}
                       itemStyle={{color: '#10b981', fontSize: '10px', textTransform: 'uppercase', fontWeight: 900}}
                       cursor={{ stroke: 'rgba(16,185,129,0.2)', strokeWidth: 2 }}
                    />
                    <Area 
                       type="monotone" 
                       dataKey="rate" 
                       stroke="#10b981" 
                       strokeWidth={4}
                       fillOpacity={1} 
                       fill="url(#colorRate)" 
                       animationDuration={2000}
                    />
                 </AreaChart>
              </ResponsiveContainer>
           </div>
        </div>

        {/* Action Sidebar: Tactical Command */}
        <div className="space-y-8">
           {/* Alpha Calculator */}
           <div className="glass-card rounded-[3rem] border-white/5 p-10 space-y-8 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-[40px] rounded-full group-hover:bg-blue-500/10 transition-all" />
              <h3 className="text-sm font-black text-white uppercase tracking-[0.3em] flex items-center gap-3">
                 <ArrowRightLeft className="w-5 h-5 text-blue-500" /> {t('arbitrage.alphaTitle')}
              </h3>
              
              <div className="space-y-6">
                 <div className="space-y-2">
                    <label className="text-[10px] text-gray-600 font-black uppercase tracking-widest ml-1">{t('arbitrage.capitalLabel')}</label>
                    <div className="relative group">
                       <div className="absolute left-6 top-1/2 -translate-y-1/2 text-white font-black text-xl">€</div>
                       <input 
                         type="number" 
                         value={amount}
                         onChange={(e) => setAmount(Number(e.target.value))}
                         className="w-full bg-white/5 border border-white/10 rounded-2xl px-12 py-5 text-white text-3xl font-black outline-none focus:border-emerald-500/50 focus:bg-white/[0.08] transition-all"
                       />
                    </div>
                 </div>

                 <div className="p-6 rounded-[2rem] bg-black/40 border border-white/5 space-y-4">
                    <div className="flex justify-between items-center">
                       <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">{t('arbitrage.neuralYield')}</span>
                       <span className="text-emerald-500 font-black text-lg tracking-tighter">R$ {totalBRL.toLocaleString(i18n.language, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between items-center opacity-50">
                       <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">{t('arbitrage.bankStandard')}</span>
                       <span className="text-gray-400 font-black text-sm line-through tracking-tighter">R$ {bankBRL.toLocaleString(i18n.language, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="pt-4 border-t border-white/5 flex justify-between items-center">
                       <span className="text-[11px] text-white font-black uppercase tracking-widest">{t('arbitrage.deltaGain')}</span>
                       <div className="text-right">
                          <div className="text-emerald-400 font-black text-2xl tracking-tighter">R$ {savings.toLocaleString(i18n.language, { minimumFractionDigits: 2 })}</div>
                          <div className="text-[8px] text-emerald-500 font-black uppercase tracking-widest">{t('arbitrage.superiority', { value: spread.toFixed(2) })}</div>
                       </div>
                    </div>
                 </div>

                 <button className="w-full py-6 rounded-2xl bg-white text-black font-black uppercase text-xs tracking-[0.3em] hover:bg-emerald-500 transition-all shadow-2xl active:scale-95">
                    {t('arbitrage.execute')}
                 </button>
              </div>
           </div>

           {/* Tactical Signal */}
           <div className={cn(
             "p-8 rounded-[3rem] border transition-all relative overflow-hidden group",
             spread > 2 
               ? "bg-emerald-500/10 border-emerald-500/30" 
               : "bg-blue-500/10 border-blue-500/30"
           )}>
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-current opacity-5 blur-2xl rounded-full" />
              <div className="flex items-center gap-6 relative z-10">
                 <div className={cn(
                   "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg",
                   spread > 2 ? "bg-emerald-500 text-black shadow-emerald-500/20" : "bg-blue-500 text-black shadow-blue-500/20"
                 )}>
                    {spread > 2 ? <CheckCircle2 className="w-6 h-6" /> : <Info className="w-6 h-6" />}
                 </div>
                 <div>
                    <h4 className="font-black text-white text-xs uppercase tracking-[0.2em]">
                       {spread > 2 ? t('arbitrage.alphaDetected') : t('arbitrage.standby')}
                    </h4>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-2 leading-relaxed">
                       {spread > 2 
                          ? t('arbitrage.signalDetected') 
                          : t('arbitrage.signalStandby')}
                    </p>
                 </div>
              </div>
           </div>
        </div>
      </div>

      {/* Comparison Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
         <StatCard icon={<Globe className="w-5 h-5 text-blue-400" />} label={t('arbitrage.statParity')} value="R$ 5.54" sub={t('arbitrage.statParitySub')} />
         <StatCard icon={<AlertTriangle className="w-5 h-5 text-yellow-500" />} label={t('arbitrage.statRetail')} value="R$ 5.71" sub={t('arbitrage.statRetailSub')} />
         <StatCard icon={<ArrowRightLeft className="w-5 h-5 text-emerald-500" />} label={t('arbitrage.statInst')} value="R$ 5.52" sub={t('arbitrage.statInstSub')} />
         <StatCard icon={<Navigation className="w-5 h-5 text-purple-500" />} label={t('arbitrage.statVolume')} value="€ 1.28M" sub={t('arbitrage.statVolumeSub')} />
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value, sub }: any) => (
  <div className="glass-card p-8 rounded-[2.5rem] border-white/5 space-y-6 group hover:border-white/10 transition-all transition-transform hover:-translate-y-2">
     <div className="w-12 h-12 rounded-2xl bg-white/[0.03] flex items-center justify-center group-hover:bg-white/10 transition-all">
        {icon}
     </div>
     <div className="space-y-1">
        <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">{label}</p>
        <p className="text-2xl font-black text-white tracking-tighter">{value}</p>
        <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest mt-1">{sub}</p>
     </div>
  </div>
);

export default ArbitrageRadar;
