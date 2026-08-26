import React from 'react';
import { useStore } from '../store/useStore';
import { useUser, useClerk, useAuth } from '@clerk/clerk-react';
import { useDataSync } from '../hooks/useDataSync';
import { 
  Moon, Sun, LogOut, 
  Globe, Shield, Bell, RefreshCw, Zap, Sparkles, Calculator, AlertCircle
} from 'lucide-react';
import PlanLimitsCard from '../components/PlanLimitsCard';
import { getPlanLimits } from '../services/billing';
import { cn } from '../lib/utils';

const SettingsPage: React.FC = () => {
  const { settings, toggleTheme, setBaseCurrency, portfolio, transactions, addNotification, updateCustodyRate, updateSelicCustodyThreshold } = useStore();
  const { user } = useUser();
  const { signOut } = useClerk();
  const { sync, isSyncing } = useDataSync();
  const { getToken, isSignedIn } = useAuth();
  
  const limits = getPlanLimits(settings.plan ?? 'free');
  const exhaustedAssets = limits.assets !== null && portfolio.length >= limits.assets;
  const exhaustedTx = limits.transactions !== null && transactions.length >= limits.transactions;
  const exhausted = exhaustedAssets || exhaustedTx;
  const exhaustedLabel = exhaustedAssets 
    ? `${limits.assets} assets`
    : exhaustedTx 
      ? `${limits.transactions} transactions`
      : '';

  const testConnections = async () => {
    try {
      if (!isSignedIn) {
        addNotification({ title: 'Auth Required', message: 'Login to test secure database connection.', type: 'warning' });
        return;
      }
      const token = await getToken({ template: 'supabase' });
      if (!token) {
        addNotification({ title: 'Token Error', message: 'Auth provider failed to issue session token.', type: 'error' });
        return;
      }
      const ok = await (await import('../services/database')).ensureUserProfile(token, user?.primaryEmailAddress?.emailAddress);
      if (!ok) {
         addNotification({ title: 'Handshake Failed', message: 'Profile synchronization error.', type: 'error' });
         return;
      }
      addNotification({ title: 'Handshake Success', message: 'Node logic connection established.', type: 'success' });
    } catch (e: any) {
      addNotification({ title: 'Connection Refused', message: String(e?.message || e), type: 'error' });
    }
  };

  return (
    <div className="bg-premium min-h-screen">
      <div className="premium-glow-1" />
      <div className="premium-glow-2" />

      <div className="relative z-10 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 pt-4">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex flex-col space-y-4">
            <div className="flex items-center gap-4">
               <h1 className="text-3xl font-black tracking-tight text-white uppercase underline decoration-emerald-500 decoration-4 underline-offset-8">Settings <span className="text-emerald-500">& Protocol</span></h1>
               <span className="bg-white/5 text-emerald-500 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-white/5">System v2.0.4</span>
            </div>
            <p className="text-gray-500 text-sm font-bold uppercase tracking-widest">
              Manage your intelligence profile and local system constants.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
             <button 
                 onClick={testConnections} 
                 className="flex items-center gap-2 bg-white/5 text-gray-400 px-6 py-3 rounded-2xl text-[10px] uppercase font-black tracking-widest hover:text-white hover:bg-white/10 transition-all border border-white/5"
             >
                 <Shield className="w-3.5 h-3.5" /> Handshake Test
             </button>
             <button 
                 onClick={sync} 
                 disabled={isSyncing}
                 className="flex items-center gap-2 bg-emerald-500 text-black px-6 py-3 rounded-2xl text-[10px] uppercase font-black tracking-widest hover:bg-white transition-all shadow-[0_4px_20px_rgba(16,185,129,0.3)] disabled:opacity-50"
             >
                 <RefreshCw className={cn("w-3.5 h-3.5", isSyncing && "animate-spin")} />
                 {isSyncing ? 'Syncing...' : 'Force Global Sync'}
             </button>
          </div>
        </div>

        {exhausted && (
          <div className="glass-card rounded-[2rem] p-6 border-red-500/20 bg-red-500/[0.03] animate-pulse">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-2xl bg-red-500/20 flex items-center justify-center text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
                    <AlertCircle className="w-6 h-6" />
                 </div>
                 <div>
                    <h4 className="font-black text-white uppercase tracking-tighter">Quota Exhausted</h4>
                    <p className="text-[10px] text-red-400 font-black uppercase tracking-widest mt-1">
                      You reached the limit of {exhaustedLabel} on {settings.plan || 'FREE'} tier.
                    </p>
                 </div>
              </div>
              <a href="/premium" className="bg-red-500 text-white font-black uppercase text-[10px] tracking-widest px-8 py-4 rounded-xl shadow-lg shadow-red-500/20 hover:scale-105 transition-transform">
                Upgrade Engine Now
              </a>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           {/* Main Settings Column */}
           <div className="lg:col-span-2 space-y-8">
              
              {/* Appearance */}
              <div className="glass-card rounded-[2.5rem] overflow-hidden border-white/5 shadow-2xl relative">
                 <div className="p-8 border-b border-white/5 bg-white/[0.01]">
                    <h3 className="text-sm font-black text-white uppercase tracking-[0.2em] flex items-center gap-3">
                       <Zap className="w-5 h-5 text-yellow-500"/> Core Appearance
                    </h3>
                 </div>
                 <div className="p-10 space-y-8">
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-4">
                          <div className={cn("p-4 rounded-2xl transition-all", settings.theme === 'dark' ? 'bg-purple-500/10 text-purple-400' : 'bg-yellow-500/10 text-yellow-500')}>
                             {settings.theme === 'dark' ? <Moon className="w-6 h-6" /> : <Sun className="w-6 h-6" />}
                          </div>
                          <div>
                             <div className="text-white font-black uppercase tracking-widest text-sm">Visual Spectrum</div>
                             <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Toggle Stealth Mode on/off.</div>
                          </div>
                       </div>
                       <button 
                          onClick={toggleTheme}
                          className={cn(
                             "w-16 h-8 rounded-full transition-all relative p-1 shadow-inner",
                             settings.theme === 'dark' ? "bg-emerald-500 border-white/10" : "bg-gray-800 border-white/5"
                          )}
                       >
                          <div className={cn(
                             "w-6 h-6 bg-white rounded-full shadow-lg transition-all flex items-center justify-center",
                             settings.theme === 'dark' ? "translate-x-8" : "translate-x-0"
                          )}>
                             {settings.theme === 'dark' ? <Sparkles className="w-3 h-3 text-emerald-600" /> : <Sun className="w-3 h-3 text-yellow-500" />}
                          </div>
                       </button>
                    </div>
                 </div>
              </div>

              {/* Regional Preferences */}
              <div className="glass-card rounded-[2.5rem] overflow-hidden border-white/5 shadow-2xl relative">
                 <div className="p-8 border-b border-white/5 bg-white/[0.01]">
                    <h3 className="text-sm font-black text-white uppercase tracking-[0.2em] flex items-center gap-3">
                       <Globe className="w-5 h-5 text-blue-500"/> Regional Constants
                    </h3>
                 </div>
                 <div className="p-10 space-y-10">
                    <div>
                       <label className="text-[10px] text-gray-600 font-black uppercase tracking-[0.2em] mb-6 block">Base Currency Protocol</label>
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          <button 
                             onClick={() => setBaseCurrency('BRL')}
                             className={cn(
                                "p-8 rounded-[2rem] border transition-all flex flex-col items-center gap-4 relative overflow-hidden group",
                                settings.baseCurrency === 'BRL' 
                                   ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.1)]" 
                                   : "bg-white/[0.02] border-white/5 text-gray-500 hover:border-white/10"
                             )}
                          >
                             <span className="text-3xl font-black tracking-tighter relative z-10">R$ BRL</span>
                             <span className="text-[9px] font-black uppercase tracking-[0.3em] relative z-10">Real Brasileiro</span>
                             {settings.baseCurrency === 'BRL' && <div className="absolute inset-0 bg-emerald-500/5 backdrop-blur-3xl animate-pulse" />}
                          </button>
                          <button 
                             onClick={() => setBaseCurrency('EUR')}
                             className={cn(
                                "p-8 rounded-[2rem] border transition-all flex flex-col items-center gap-4 relative overflow-hidden group",
                                settings.baseCurrency === 'EUR' 
                                   ? "bg-blue-500/10 border-blue-500/30 text-blue-400 shadow-[0_0_30px_rgba(59,130,246,0.1)]" 
                                   : "bg-white/[0.02] border-white/5 text-gray-500 hover:border-white/10"
                             )}
                          >
                             <span className="text-3xl font-black tracking-tighter relative z-10">€ EUR</span>
                             <span className="text-[9px] font-black uppercase tracking-[0.3em] relative z-10">Euro Standard</span>
                             {settings.baseCurrency === 'EUR' && <div className="absolute inset-0 bg-blue-500/5 backdrop-blur-3xl animate-pulse" />}
                          </button>
                       </div>
                    </div>
                 </div>
              </div>

              {/* Advanced Math Constants */}
              <div className="glass-card rounded-[2.5rem] overflow-hidden border-white/5 shadow-2xl relative">
                 <div className="p-8 border-b border-white/5 bg-white/[0.01]">
                    <h3 className="text-sm font-black text-white uppercase tracking-[0.2em] flex items-center gap-3">
                       <Calculator className="w-5 h-5 text-emerald-500"/> Mathematical Offsets (B3)
                    </h3>
                 </div>
                 <div className="p-10 space-y-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="space-y-4">
                          <label className="text-[10px] text-gray-600 font-black uppercase tracking-[0.2em] block ml-1">CUSTODY COEFFICIENT (ANNUAL)</label>
                          <div className="relative group">
                             <input
                                type="number"
                                step="0.0001"
                                min="0"
                                value={Number(settings.custodyRate ?? 0).toString()}
                                onChange={(e) => updateCustodyRate(Number(e.target.value) || 0)}
                                className="w-full bg-white/[0.02] border border-white/5 rounded-2xl px-6 py-4 text-sm text-white font-mono focus:border-emerald-500/30 transition-all outline-none"
                             />
                             <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-gray-700 font-black uppercase">Factor</div>
                          </div>
                          <p className="text-[9px] text-gray-700 font-bold uppercase tracking-widest px-1 leading-relaxed">Example: 0.002 = 0.20% (Standard B3 Fee)</p>
                       </div>
                       <div className="space-y-4">
                          <label className="text-[10px] text-gray-600 font-black uppercase tracking-[0.2em] block ml-1">SELIC EXEMPTION THRESHOLD</label>
                          <div className="relative group">
                             <input
                                type="number"
                                step="100"
                                min="0"
                                value={Number(settings.selicCustodyThreshold ?? 0).toString()}
                                onChange={(e) => updateSelicCustodyThreshold(Math.max(0, Number(e.target.value) || 0))}
                                className="w-full bg-white/[0.02] border border-white/5 rounded-2xl px-6 py-4 text-sm text-white font-mono focus:border-emerald-500/30 transition-all outline-none"
                             />
                             <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-gray-700 font-black uppercase">Base R$</div>
                          </div>
                          <p className="text-[9px] text-gray-700 font-bold uppercase tracking-widest px-1 leading-relaxed">Current B3 Threshold for Tesouro Selic</p>
                       </div>
                    </div>
                 </div>
              </div>
           </div>

           {/* Account Identity Column */}
           <div className="space-y-8">
              <PlanLimitsCard />
              
              <div className="glass-card rounded-[2.5rem] overflow-hidden border-white/5 shadow-2xl relative">
                 <div className="p-10 flex flex-col items-center text-center">
                    <div className="relative mb-8 group">
                       <div className="absolute inset-0 bg-emerald-500/20 blur-3xl group-hover:bg-emerald-500/40 transition-all" />
                       <img 
                          src={user?.imageUrl} 
                          alt={user?.fullName || ''} 
                          className="w-24 h-24 rounded-[2rem] border-4 border-white/5 relative z-10 shadow-2xl"
                       />
                    </div>
                    
                    <h3 className="text-xl font-black text-white tracking-tighter uppercase">{user?.fullName || 'Operator'}</h3>
                    <p className="text-[11px] text-gray-500 font-black uppercase tracking-[0.2em] mt-2 mb-8">{user?.primaryEmailAddress?.emailAddress}</p>
                    
                    <div className="w-full space-y-4 mb-2">
                       <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 flex flex-col items-center gap-3 relative overflow-hidden">
                          <div className="text-[10px] text-gray-600 font-black uppercase tracking-widest">Active License</div>
                          {(() => {
                            const p = settings.plan ?? 'free';
                            const config = {
                              free: { label: 'Bronze Default', color: 'bg-gray-800 text-gray-400 border-gray-700' },
                              starter: { label: 'Silver Starter', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
                              pro: { label: 'Gold Professional', color: 'bg-amber-500/20 text-amber-500 border-amber-500/30' },
                              master: { label: 'Platinum Elite', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
                              elite: { label: 'Diamond Master', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' }
                            };
                            const cur = config[p as keyof typeof config] || config.free;
                            return (
                              <span className={cn("text-xs font-black uppercase tracking-[0.2em] px-6 py-2 rounded-xl border relative z-10", cur.color)}>
                                 {cur.label}
                                 {p === 'elite' && <div className="absolute inset-0 bg-purple-500/10 animate-pulse rounded-xl" />}
                              </span>
                            );
                          })()}
                          <div className="text-[9px] text-gray-700 font-black uppercase tracking-[0.1em] mt-2 leading-relaxed">
                            {(() => {
                              const plan = settings.plan ?? 'free';
                              const lim = getPlanLimits(plan);
                              if (plan === 'elite') return 'Unlimited Assets • Full AI Protocol';
                              return `Quota: ${lim.assets || 'Unlimited'} Assets • ${lim.transactions || 'Unlimited'} Trans.`;
                            })()}
                          </div>
                       </div>
                    </div>
                    
                    <a href="/premium" className="text-emerald-500 text-[10px] font-black uppercase tracking-[0.25em] hover:text-white transition-all underline decoration-emerald-500/20 underline-offset-8 py-4">
                       Scale Deployment Plan
                    </a>
                 </div>
                 
                 <div className="p-4 border-t border-white/5 bg-black/40">
                    <button onClick={() => signOut()} className="w-full py-4 rounded-2xl text-red-500/50 hover:text-red-500 hover:bg-red-500/5 flex items-center justify-center gap-3 transition-all text-xs font-black uppercase tracking-widest">
                       <LogOut className="w-4 h-4" /> Terminate Session
                    </button>
                 </div>
              </div>

              {/* Notification Protocol */}
              <div className="glass-card rounded-[2rem] p-8 border-purple-500/20 bg-purple-500/[0.03] shadow-2xl relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-8 opacity-5">
                    <Bell className="w-32 h-32 text-purple-500" />
                 </div>
                 <h4 className="font-black text-white uppercase tracking-[0.2em] mb-4 flex items-center gap-3">
                    <Bell className="w-4 h-4 text-purple-400" /> Notification Protocol
                 </h4>
                 <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-8 leading-relaxed">
                    Real-time alerts for dividends, goal triggers, and market arbitrage.
                 </p>
                 <div className="space-y-6">
                    <div className="flex items-center justify-between text-[11px] font-black text-gray-300 uppercase tracking-widest">
                       <span>Yield Inbound Triggers</span>
                       <div className="w-10 h-5 bg-emerald-500 rounded-full relative shadow-[0_0_15px_rgba(16,185,129,0.4)]"><div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full"></div></div>
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-black text-gray-300 uppercase tracking-widest">
                       <span>Quota Threshold Alerts</span>
                       <div className="w-10 h-5 bg-emerald-500 rounded-full relative shadow-[0_0_15px_rgba(16,185,129,0.4)]"><div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full"></div></div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
