import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useStore } from '../store/useStore';
import { formatCurrency } from '../lib/utils';
import { simulateTesouroPrefixado, simulateCdb, simulateLciLca, simulateTesouroSelic, simulateTesouroIpcaMais } from '../lib/simulators';
import { Calculator, Info, Sparkles, Zap, Shield, TrendingUp, Calendar, ArrowRight } from 'lucide-react';
import { getSavingsProducts } from '../services/database';
import { cn } from '../lib/utils';
import { useTranslation } from 'react-i18next';

type TabId = 'prefixado' | 'cdb' | 'lci' | 'selic' | 'ipca';

const TAB_IDS: TabId[] = ['prefixado', 'cdb', 'lci', 'selic', 'ipca'];

type SavingsProduct = {
  id: string;
  bank_name: string;
  product_name: string;
  type: string;
  rate_type: string;
  rate_value: number;
  liquidity: string | null;
};

const SimulatorsPage: React.FC = () => {
  const { settings } = useStore();
  const { getToken } = useAuth();
  const { t } = useTranslation();
  const tabLabels = t('fixedIncome.tabLabels', { returnObjects: true }) as string[];
  const [tab, setTab] = useState<TabId>('prefixado');
  const [initial, setInitial] = useState('1000');
  const [days, setDays] = useState('365');
  const [ratePrefixado, setRatePrefixado] = useState('0.1');
  const [cdiAnnual, setCdiAnnual] = useState('0.1115');
  const [cdiPercentCdb, setCdiPercentCdb] = useState('1');
  const [cdiPercentLci, setCdiPercentLci] = useState('0.9');
  const [selicAnnual, setSelicAnnual] = useState('0.105');
  const [selicFixed, setSelicFixed] = useState('0.001');
  const [ipcaAnnual, setIpcaAnnual] = useState('0.04');
  const [ipcaFixed, setIpcaFixed] = useState('0.0');
  const [savings, setSavings] = useState<SavingsProduct[]>([]);
  const [, setLoadingSavings] = useState(false);
  const [selectedSavings, setSelectedSavings] = useState<SavingsProduct | null>(null);
  const [ipcaCompounding] = useState<'annual' | 'monthly' | 'daily'>('annual');
  const [selicCompounding] = useState<'annual' | 'daily'>('annual');
  const [preCompounding, setPreCompounding] = useState<'annual' | 'daily'>('annual');

  const parsedInitial = Number(initial) || 0;
  const parsedDays = Number(days) || 0;

  useEffect(() => {
    const run = async () => {
      try {
        setLoadingSavings(true);
        const token = await getToken({ template: 'supabase' });
        if (!token) return;
        let products = await getSavingsProducts(token);
        if (!products || products.length === 0) {
          const s = await import('../services/database').then(m => m.seedSavingsProducts(token));
          if (s.ok) {
            products = await getSavingsProducts(token);
          }
        }
        setSavings(products);
        try {
          const savedId = localStorage.getItem('selected_savings_id');
          if (savedId) {
            const found = products.find(p => p.id === savedId);
            if (found) {
              handleSelectSavingsProduct(found);
            }
          }
        } catch {}
      } finally {
        setLoadingSavings(false);
      }
    };
    run();
  }, [getToken]);

  const handleSelectSavingsProduct = (p: SavingsProduct) => {
    const rt = (p.rate_type || '').toUpperCase();
    setSelectedSavings(p);
    try { localStorage.setItem('selected_savings_id', p.id); } catch {}
    if (rt === '%CDI') {
      setTab('cdb');
      setCdiPercentCdb(String(p.rate_value));
      return;
    }
    if (rt === '%SELIC') {
      setTab('selic');
      const base = Number(selicAnnual) || 0.105;
      const adjusted = base * p.rate_value;
      setSelicAnnual(String(adjusted));
      return;
    }
    if (rt === '%IPCA') {
      setTab('ipca');
      const base = Number(ipcaAnnual) || 0.04;
      const adjusted = base * p.rate_value;
      setIpcaAnnual(String(adjusted));
      return;
    }
    if (rt === 'SELIC' || rt === 'SELIC_ANUAL') {
      setTab('selic');
      setSelicAnnual(String(p.rate_value));
      return;
    }
    if (rt === 'CDI_ANUAL') {
      setTab('cdb');
      setCdiAnnual(String(p.rate_value));
      return;
    }
    if (rt === 'SELIC+FIXA') {
      setTab('selic');
      setSelicFixed(String(p.rate_value));
      return;
    }
    if (rt === 'PRE' || rt === 'FIXA_ANUAL') {
      setTab('prefixado');
      setRatePrefixado(String(p.rate_value));
      return;
    }
    if (rt === 'IPCA+FIXA') {
      setTab('ipca');
      setIpcaFixed(String(p.rate_value));
      return;
    }
    if (rt === 'IPCA_ANUAL') {
      setTab('ipca');
      setIpcaAnnual(String(p.rate_value));
      return;
    }
  };

  const result = useMemo(() => {
    if (parsedInitial <= 0 || parsedDays <= 0) return null;
    const custodyObj = { rate: settings.custodyRate ?? 0.002, selicThreshold: settings.selicCustodyThreshold ?? 10000 };
    
    if (tab === 'prefixado') {
      return simulateTesouroPrefixado(parsedInitial, Number(ratePrefixado) || 0, parsedDays, preCompounding, custodyObj);
    }
    if (tab === 'cdb') {
      return simulateCdb(parsedInitial, Number(cdiAnnual) || 0, Number(cdiPercentCdb) || 0, parsedDays);
    }
    if (tab === 'lci') {
      return simulateLciLca(parsedInitial, Number(cdiAnnual) || 0, Number(cdiPercentLci) || 0, parsedDays);
    }
    if (tab === 'selic') {
      return simulateTesouroSelic(parsedInitial, Number(selicAnnual) || 0, Number(selicFixed) || 0, parsedDays, selicCompounding, custodyObj);
    }
    return simulateTesouroIpcaMais(parsedInitial, Number(ipcaAnnual) || 0, Number(ipcaFixed) || 0, parsedDays, ipcaCompounding, custodyObj);
  }, [tab, parsedInitial, parsedDays, ratePrefixado, cdiAnnual, cdiPercentCdb, cdiPercentLci, selicAnnual, selicFixed, ipcaAnnual, ipcaFixed, ipcaCompounding, preCompounding, selicCompounding, settings.custodyRate, settings.selicCustodyThreshold]);

  const baseCurrency = settings.baseCurrency;

  return (
    <div className="bg-premium min-h-screen">
      <div className="premium-glow-1" />
      <div className="premium-glow-2" />

      <div className="relative z-10 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 pt-4">
        
        {/* Header */}
        <div className="flex flex-col space-y-4">
          <div className="flex items-center gap-4">
             <h1 className="text-3xl font-black tracking-tight text-white uppercase underline decoration-emerald-500 decoration-4 underline-offset-8">{t('fixedIncome.titleStart')}<span className="text-emerald-500">{t('fixedIncome.titleHighlight')}</span></h1>
             <span className="bg-emerald-500/10 text-emerald-500 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-emerald-500/20 shadow-lg shadow-emerald-500/10">{t('fixedIncome.badge')}</span>
          </div>
          <p className="text-gray-500 text-sm font-bold uppercase tracking-widest">
            {t('fixedIncome.subtitle')}
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="glass-card rounded-[2.5rem] p-3 border-white/5 shadow-2xl overflow-x-auto no-scrollbar">
           <div className="flex gap-2 min-w-max">
              {TAB_IDS.map((tid, i) => (
                <button
                  key={tid}
                  onClick={() => setTab(tid)}
                  className={cn(
                    "px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
                    tab === tid ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/20" : "text-gray-500 hover:text-white hover:bg-white/5"
                  )}
                >
                  {tabLabels[i] ?? tid}
                </button>
              ))}
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Form Parameters */}
          <div className="glass-card rounded-[2.5rem] p-10 border-white/5 shadow-2xl relative overflow-hidden">
             <div className="flex items-center justify-between mb-10">
                <h3 className="text-sm font-black text-white uppercase tracking-[0.2em] flex items-center gap-3">
                   <Calculator className="w-5 h-5 text-emerald-500" /> {t('fixedIncome.controlTitle')}
                </h3>
                <Sparkles className="w-4 h-4 text-emerald-500/30" />
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="space-y-4">
                  <label className="text-[10px] text-gray-600 font-black uppercase tracking-[0.2em] ml-1">{t('fixedIncome.initialLabel')}</label>
                  <div className="relative">
                    <input
                      className="w-full bg-white/[0.02] border border-white/5 rounded-2xl px-6 py-4 text-sm text-white font-black tracking-tighter focus:border-emerald-500/30 transition-all outline-none"
                      value={initial}
                      onChange={e => setInitial(e.target.value.replace(',', '.'))}
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-gray-700 font-black">BRL</div>
                  </div>
               </div>
               <div className="space-y-4">
                  <label className="text-[10px] text-gray-600 font-black uppercase tracking-[0.2em] ml-1">{t('fixedIncome.daysLabel')}</label>
                  <div className="relative">
                    <input
                      className="w-full bg-white/[0.02] border border-white/5 rounded-2xl px-6 py-4 text-sm text-white font-black tracking-tighter focus:border-emerald-500/30 transition-all outline-none"
                      value={days}
                      onChange={e => setDays(e.target.value.replace(',', '.'))}
                    />
                    <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-700" />
                  </div>
               </div>

               {/* Dynamic Fields Based on Tab */}
               {tab === 'prefixado' && (
                 <>
                   <div className="space-y-4">
                     <label className="text-[10px] text-gray-600 font-black uppercase tracking-[0.2em] ml-1">{t('fixedIncome.fixedRateLabel')}</label>
                     <input
                       className="w-full bg-white/[0.02] border border-white/5 rounded-2xl px-6 py-4 text-sm text-white font-black tracking-tighter outline-none"
                       value={ratePrefixado}
                       onChange={e => setRatePrefixado(e.target.value.replace(',', '.'))}
                     />
                   </div>
                   <div className="space-y-4">
                     <label className="text-[10px] text-gray-600 font-black uppercase tracking-[0.2em] ml-1">{t('fixedIncome.compoundingLabel')}</label>
                     <div className="flex gap-2">
                       {['annual', 'daily'].map(type => (
                         <button
                           key={type}
                           onClick={() => setPreCompounding(type as any)}
                           className={cn(
                             "flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all",
                             preCompounding === type ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500" : "bg-black/20 border-white/5 text-gray-700"
                           )}
                         >
                           {type === 'annual' ? t('fixedIncome.compoundingAnnual') : t('fixedIncome.compoundingDaily')}
                         </button>
                       ))}
                     </div>
                   </div>
                 </>
               )}
               {tab === 'cdb' && (
                 <>
                   <div className="space-y-4">
                     <label className="text-[10px] text-gray-600 font-black uppercase tracking-[0.2em] ml-1">{t('fixedIncome.cdiBaseLabel')}</label>
                     <input
                       className="w-full bg-white/[0.02] border border-white/5 rounded-2xl px-6 py-4 text-sm text-white font-black tracking-tighter outline-none"
                       value={cdiAnnual}
                       onChange={e => setCdiAnnual(e.target.value.replace(',', '.'))}
                     />
                   </div>
                   <div className="space-y-4">
                     <label className="text-[10px] text-gray-600 font-black uppercase tracking-[0.2em] ml-1">{t('fixedIncome.cdbYieldLabel')}</label>
                     <input
                       className="w-full bg-white/[0.02] border border-white/5 rounded-2xl px-6 py-4 text-sm text-white font-black tracking-tighter outline-none"
                       value={cdiPercentCdb}
                       onChange={e => setCdiPercentCdb(e.target.value.replace(',', '.'))}
                     />
                   </div>
                 </>
               )}
               {tab === 'lci' && (
                 <>
                   <div className="space-y-4">
                     <label className="text-[10px] text-gray-600 font-black uppercase tracking-[0.2em] ml-1">{t('fixedIncome.cdiBaseLabel')}</label>
                     <input
                       className="w-full bg-white/[0.02] border border-white/5 rounded-2xl px-6 py-4 text-sm text-white font-black tracking-tighter outline-none"
                       value={cdiAnnual}
                       onChange={e => setCdiAnnual(e.target.value.replace(',', '.'))}
                     />
                   </div>
                   <div className="space-y-4">
                     <label className="text-[10px] text-gray-600 font-black uppercase tracking-[0.2em] ml-1">{t('fixedIncome.lciYieldLabel')}</label>
                     <input
                       className="w-full bg-white/[0.02] border border-white/5 rounded-2xl px-6 py-4 text-sm text-white font-black tracking-tighter outline-none"
                       value={cdiPercentLci}
                       onChange={e => setCdiPercentLci(e.target.value.replace(',', '.'))}
                     />
                   </div>
                 </>
               )}
               {tab === 'selic' && (
                 <>
                   <div className="space-y-4">
                     <label className="text-[10px] text-gray-600 font-black uppercase tracking-[0.2em] ml-1">{t('fixedIncome.selicBaseLabel')}</label>
                     <input
                       className="w-full bg-white/[0.02] border border-white/5 rounded-2xl px-6 py-4 text-sm text-white font-black tracking-tighter outline-none"
                       value={selicAnnual}
                       onChange={e => setSelicAnnual(e.target.value.replace(',', '.'))}
                     />
                   </div>
                   <div className="space-y-4">
                     <label className="text-[10px] text-gray-600 font-black uppercase tracking-[0.2em] ml-1">{t('fixedIncome.spreadLabel')}</label>
                     <input
                       className="w-full bg-white/[0.02] border border-white/5 rounded-2xl px-6 py-4 text-sm text-white font-black tracking-tighter outline-none"
                       value={selicFixed}
                       onChange={e => setSelicFixed(e.target.value.replace(',', '.'))}
                     />
                   </div>
                 </>
               )}
               {tab === 'ipca' && (
                 <>
                   <div className="space-y-4">
                     <label className="text-[10px] text-gray-600 font-black uppercase tracking-[0.2em] ml-1">{t('fixedIncome.ipcaLabel')}</label>
                     <input
                       className="w-full bg-white/[0.02] border border-white/5 rounded-2xl px-6 py-4 text-sm text-white font-black tracking-tighter outline-none"
                       value={ipcaAnnual}
                       onChange={e => setIpcaAnnual(e.target.value.replace(',', '.'))}
                     />
                   </div>
                   <div className="space-y-4">
                     <label className="text-[10px] text-gray-600 font-black uppercase tracking-[0.2em] ml-1">{t('fixedIncome.realGainLabel')}</label>
                     <input
                       className="w-full bg-white/[0.02] border border-white/5 rounded-2xl px-6 py-4 text-sm text-white font-black tracking-tighter outline-none"
                       value={ipcaFixed}
                       onChange={e => setIpcaFixed(e.target.value.replace(',', '.'))}
                     />
                   </div>
                 </>
               )}
             </div>

             {/* Chosen Product Signal */}
             {selectedSavings && (
               <div className="mt-10 p-6 rounded-[2rem] bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-between animate-in fade-in zoom-in duration-500">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                       <Shield className="w-6 h-6" />
                    </div>
                    <div>
                       <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">{t('fixedIncome.productActive')}</p>
                       <p className="text-white font-black uppercase tracking-tighter">{selectedSavings.bank_name} • {selectedSavings.product_name}</p>
                    </div>
                 </div>
                 <button
                    onClick={() => { setSelectedSavings(null); try { localStorage.removeItem('selected_savings_id'); } catch {} }}
                    className="text-[9px] font-black uppercase tracking-widest text-emerald-500 hover:text-white transition-colors"
                 >
                    {t('fixedIncome.resetConstants')}
                 </button>
               </div>
             )}

             {/* Savings Registry */}
             {savings.length > 0 && (
               <div className="mt-12 space-y-6">
                 <div className="flex items-center gap-3 ml-1">
                    <TrendingUp className="w-4 h-4 text-gray-700" />
                    <span className="text-[10px] font-black text-gray-700 uppercase tracking-widest">{t('fixedIncome.productsTitle')}</span>
                 </div>
                 <div className="grid grid-cols-1 gap-4 max-h-[280px] overflow-y-auto pr-4 no-scrollbar">
                   {savings.map(p => (
                     <button
                       key={p.id}
                       onClick={() => handleSelectSavingsProduct(p)}
                       className="w-full flex items-center justify-between p-6 rounded-3xl bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 transition-all group overflow-hidden relative"
                     >
                       <div className="relative z-10 flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-gray-500 group-hover:text-emerald-500 transition-colors">
                             <Zap className="w-4 h-4" />
                          </div>
                          <div className="text-left">
                            <div className="font-black text-white text-sm tracking-tighter uppercase">{p.bank_name}</div>
                            <div className="text-[9px] text-gray-600 font-bold uppercase tracking-widest mt-1">{p.product_name}</div>
                          </div>
                       </div>
                       <div className="relative z-10 text-right">
                         <div className="font-black text-emerald-500 text-lg tracking-tighter">
                           {(p.rate_value * (p.rate_type.includes('%') ? 100 : 1)).toFixed(p.rate_type.includes('%') ? 0 : 2)}{p.rate_type.includes('%') ? '%' : ''}
                         </div>
                         <div className="text-[8px] text-gray-700 font-black uppercase tracking-widest mt-0.5">{t('fixedIncome.rateSuffix', { type: p.rate_type.replace('%', '') })}</div>
                       </div>
                       <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-[40px] opacity-0 group-hover:opacity-100 transition-opacity" />
                     </button>
                   ))}
                 </div>
               </div>
             )}
          </div>

          {/* Right Column: Calculations Breakdown */}
          <div className="lg:col-span-1 space-y-8">
             <div className="glass-card rounded-[2.5rem] p-10 border-white/5 shadow-2xl relative overflow-hidden bg-white/[0.01]">
                <div className="absolute -top-20 -right-20 w-80 h-80 bg-emerald-500/10 blur-[100px] rounded-full" />
                
                <div className="flex items-center justify-between mb-10">
                   <h3 className="text-sm font-black text-white uppercase tracking-[0.2em] flex items-center gap-3">
                      {t('fixedIncome.analysisTitle')}
                   </h3>
                   <div className="bg-emerald-500 text-black text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg shadow-emerald-500/20">
                      {t('fixedIncome.netBadge')}
                   </div>
                </div>

                {result ? (
                  <div className="space-y-10 relative z-10">
                    <div className="space-y-2">
                       <span className="text-[10px] text-gray-600 font-black uppercase tracking-[0.3em] block">{t('fixedIncome.totalLabel')}</span>
                       <div className="text-6xl font-black text-white tracking-tighter">
                         {formatCurrency(result.netValue, baseCurrency)}
                       </div>
                       <p className="text-emerald-500 font-black uppercase text-[10px] tracking-widest mt-4 flex items-center gap-2">
                          <TrendingUp className="w-3.5 h-3.5" /> {t('fixedIncome.growthLabel')}
                       </p>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                       <div className="space-y-2 border-l-2 border-white/5 pl-4">
                          <span className="text-[9px] text-gray-700 font-black uppercase tracking-widest">{t('fixedIncome.grossReturn')}</span>
                          <p className="text-white font-black tracking-tight">{formatCurrency(result.grossReturn, baseCurrency)}</p>
                       </div>
                       <div className="space-y-2 border-l-2 border-white/5 pl-4">
                          <span className="text-[9px] text-gray-700 font-black uppercase tracking-widest">{t('fixedIncome.principal')}</span>
                          <p className="text-gray-500 font-black tracking-tight">{formatCurrency(result.totalInvested, baseCurrency)}</p>
                       </div>
                    </div>

                    <div className="space-y-6 pt-6 border-t border-white/5">
                       <div className="flex justify-between items-center">
                          <span className="text-[9px] text-gray-700 font-black uppercase tracking-widest">{t('fixedIncome.irTax')}</span>
                          <span className="text-red-500/80 font-black tracking-tighter">-{formatCurrency(result.irTax, baseCurrency)}</span>
                       </div>
                       <div className="flex justify-between items-center">
                          <span className="text-[9px] text-gray-700 font-black uppercase tracking-widest">{t('fixedIncome.feeTax')}</span>
                          <span className="text-red-500/80 font-black tracking-tighter">-{formatCurrency(result.feeTax, baseCurrency)}</span>
                       </div>
                       
                       <div className="mt-8 p-6 rounded-3xl bg-white/5 border border-white/5 space-y-4">
                          <div className="flex items-center gap-3">
                             <Info className="w-4 h-4 text-emerald-500" />
                             <span className="text-[9px] text-emerald-500 font-black uppercase tracking-widest">{t('fixedIncome.protocolParams')}</span>
                          </div>
                          <div className="grid grid-cols-1 gap-3">
                             <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-gray-700">
                                <span>{t('fixedIncome.custodyRate')}</span>
                                <span>{t('fixedIncome.custodyValue', { value: (Number(settings.custodyRate ?? 0.002) * 100).toFixed(2) })}</span>
                             </div>
                             <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-gray-700">
                                <span>{t('fixedIncome.selicExemption')}</span>
                                <span>{formatCurrency(Number(settings.selicCustodyThreshold ?? 10000), 'BRL')}</span>
                             </div>
                          </div>
                       </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
                     <div className="w-16 h-16 bg-white/5 rounded-3xl flex items-center justify-center text-gray-800">
                        <TrendingUp className="w-8 h-8" />
                     </div>
                     <p className="text-[10px] text-gray-700 font-black uppercase tracking-widest leading-relaxed max-w-[200px]">
                        {t('fixedIncome.emptyHint')}
                     </p>
                  </div>
                )}
             </div>

             <div className="glass-card rounded-[2rem] p-8 border-purple-500/20 bg-purple-500/[0.03] shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                   <ArrowRight className="w-24 h-24 text-purple-500" />
                </div>
                <h4 className="font-black text-white uppercase tracking-[0.2em] mb-3 flex items-center gap-3 relative z-10">
                   <Sparkles className="w-4 h-4 text-purple-400" /> {t('fixedIncome.assistantTitle')}
                </h4>
                <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest leading-relaxed mb-6 relative z-10">
                   {t('fixedIncome.assistantDesc')}
                </p>
                <div className="bg-purple-500 text-white text-[9px] font-black uppercase px-6 py-3 rounded-xl w-fit relative z-10 hover:bg-white hover:text-purple-600 transition-all cursor-pointer shadow-lg shadow-purple-500/20">
                   {t('fixedIncome.assistantBtn')}
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimulatorsPage;
