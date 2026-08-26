import React from 'react';
import { useTranslation } from 'react-i18next';
import { Users, TrendingUp, Target, Award, ArrowUpRight, MessageSquare, Heart, Share2 } from 'lucide-react';
import { cn } from '../lib/utils';

const mockRankings = [
  { rank: 1, id: 'BTLG11', name: 'BTG Pactual Logística', pct: 12, users: 842 },
  { rank: 2, id: 'HGLG11', name: 'CSHG Logística', pct: 8, users: 756 },
  { rank: 3, id: 'IVVB11', name: 'iShares S&P 500', pct: 15, users: 620 },
  { rank: 4, id: 'BTC', name: 'Bitcoin', pct: 22, users: 580 },
];

const mockMilestones = [
  { user: 'Ricardo M.', type: 'magic' },
  { user: 'Ana Paula', type: 'import' },
  { user: 'Gabriel S.', type: 'rebalance' },
];

const CommunityHub: React.FC = () => {
  const { t } = useTranslation();
  const milestoneText: Record<string, string> = {
    magic: t('community.milestoneMagic'),
    import: t('community.milestoneImport'),
    rebalance: t('community.milestoneRebalance'),
  };
  const milestoneTime: Record<string, string> = {
    magic: t('community.time2min'),
    import: t('community.time15min'),
    rebalance: t('community.time1h'),
  };
  return (
    <div className="space-y-10 animate-in fade-in duration-1000 pb-32">
      {/* Header Protocol */}
      <div className="glass-card rounded-[3rem] border-emerald-500/20 bg-emerald-500/[0.02] p-10 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-cyan-500/10 blur-[80px] rounded-full" />
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
               <div className="bg-cyan-500 p-3 rounded-2xl shadow-xl shadow-cyan-500/20">
                  <Users className="w-6 h-6 text-black" />
               </div>
               <div>
                  <h2 className="text-3xl font-black text-white uppercase tracking-tighter">{t('community.titleStart')} <span className="text-cyan-500">{t('community.titleHighlight')}</span></h2>
                  <div className="text-[10px] text-cyan-500 font-black uppercase tracking-[0.3em]">{t('community.protocol')}</div>
               </div>
            </div>
            <p className="text-gray-400 font-bold text-sm uppercase tracking-widest leading-relaxed max-w-2xl">
              {t('community.desc')}
            </p>
          </div>
          <div className="flex -space-x-4">
             {[1,2,3,4,5].map(i => (
                <img 
                  key={i} 
                  className="h-12 w-12 rounded-full ring-4 ring-slate-950 bg-gray-800 object-cover border-2 border-white/5"
                  src={`https://ui-avatars.com/api/?name=User+${i}&background=random&color=fff`} 
                  alt="" 
                />
             ))}
             <div className="flex items-center justify-center h-12 w-12 rounded-full ring-4 ring-slate-950 bg-emerald-500 text-[10px] font-black text-black border-2 border-emerald-500/50 shadow-lg shadow-emerald-500/20">
                +2.4K
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Global Progress: Liberation Goal */}
        <div className="lg:col-span-2 glass-card rounded-[3rem] border-white/5 p-10 relative overflow-hidden group">
           <div className="absolute -bottom-20 -right-20 opacity-5 group-hover:opacity-10 transition-opacity">
              <Target className="w-80 h-80 text-emerald-500" />
           </div>
           
           <div className="relative z-10 space-y-10">
              <div className="space-y-2">
                 <h3 className="text-sm font-black text-white uppercase tracking-[0.4em] flex items-center gap-3">
                   <TrendingUp className="w-5 h-5 text-emerald-500"/> {t('community.freedomGoal')}
                 </h3>
                 <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest">{t('community.freedomSub')}</p>
              </div>

              <div className="space-y-6">
                 <div className="flex justify-between items-end">
                    <div className="space-y-1">
                       <div className="text-emerald-400 font-black text-4xl tracking-tighter">R$ 4.28M</div>
                       <div className="text-[9px] text-gray-600 font-black uppercase tracking-widest ml-1">{t('community.monthlyDividends')}</div>
                    </div>
                    <div className="text-right">
                       <span className="text-xs font-black text-white uppercase tracking-widest">{t('community.synced', { value: 68 })}</span>
                    </div>
                 </div>
                 <div className="h-6 w-full bg-white/5 rounded-2xl overflow-hidden p-1.5 border border-white/10">
                    <div className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.3)] animate-pulse" style={{ width: '68%' }} />
                 </div>
                 <div className="flex justify-between text-[8px] font-black text-gray-700 uppercase tracking-[0.3em]">
                    <span>{t('community.nodeStart')}</span>
                    <span>{t('community.protocolComplete')}</span>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="p-6 rounded-[2rem] bg-black/40 border border-white/5 space-y-2">
                    <p className="text-[9px] text-gray-600 font-black uppercase tracking-widest">{t('community.aggregatedAssets')}</p>
                    <p className="text-2xl font-black text-white tracking-tighter">R$ 158.4M</p>
                 </div>
                 <div className="p-6 rounded-[2rem] bg-black/40 border border-white/5 space-y-2">
                    <p className="text-[9px] text-gray-600 font-black uppercase tracking-widest">{t('community.networkMembers')}</p>
                    <p className="text-2xl font-black text-white tracking-tighter">{t('community.investorsValue')}</p>
                 </div>
              </div>
           </div>
        </div>

        {/* Neural Rankings */}
        <div className="glass-card rounded-[3rem] border-white/5 p-10 flex flex-col space-y-8">
           <div className="space-y-1">
              <h3 className="text-sm font-black text-white uppercase tracking-[0.3em] flex items-center gap-3">
                 <TrendingUp className="w-5 h-5 text-emerald-500" /> {t('community.trendingTitle')}
              </h3>
              <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest">{t('community.trendingSub')}</p>
           </div>
           
           <div className="space-y-2 flex-grow">
              {mockRankings.map((asset) => (
                 <div key={asset.id} className="group p-5 rounded-2xl bg-white/[0.01] border border-transparent hover:border-emerald-500/20 hover:bg-emerald-500/5 transition-all">
                    <div className="flex justify-between items-center">
                       <div className="flex items-center gap-4">
                          <span className="text-xl font-black text-slate-800 group-hover:text-emerald-500 transition-colors tracking-tighter">0{asset.rank}</span>
                          <div>
                             <p className="font-black text-white text-xs uppercase tracking-widest">{asset.id}</p>
                             <p className="text-[9px] text-gray-600 font-bold uppercase tracking-tight italic">{asset.name}</p>
                          </div>
                       </div>
                       <div className="text-right">
                          <p className="text-[10px] font-black text-emerald-500 tracking-tighter">{t('community.activityThisMonth', { value: asset.pct })}</p>
                          <p className="text-[8px] text-gray-700 font-black uppercase tracking-widest">{t('community.usersCount', { count: asset.users })}</p>
                       </div>
                    </div>
                 </div>
              ))}
           </div>
           <button className="w-full py-5 rounded-2xl bg-white/5 text-gray-400 text-[10px] font-black uppercase tracking-[0.3em] hover:bg-white text-black transition-all flex items-center justify-center gap-3">
              {t('community.fullRanking')} <ArrowUpRight className="w-4 h-4" />
           </button>
        </div>
      </div>

      {/* Neural Feed & External Pulse */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Collective Milestones */}
        <div className="lg:col-span-2 glass-card rounded-[3rem] border-white/5 p-10 space-y-10">
           <div className="space-y-1">
              <h3 className="text-sm font-black text-white uppercase tracking-[0.3em] flex items-center gap-3">
                 <Award className="w-5 h-5 text-yellow-500" /> {t('community.milestonesTitle')}
              </h3>
              <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest">{t('community.milestonesSub')}</p>
           </div>

           <div className="space-y-8">
              {mockMilestones.map((m, i) => (
                 <div key={i} className="flex gap-6 items-start group">
                    <div className={cn(
                       "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg transition-all group-hover:scale-110",
                       m.type === 'magic' ? "bg-emerald-500/10 text-emerald-500 shadow-emerald-500/10" : "bg-blue-500/10 text-blue-500 shadow-blue-500/10"
                    )}>
                       {m.type === 'magic' ? <Target className="w-6 h-6" /> : <Award className="w-6 h-6" />}
                    </div>
                    <div className="flex-grow space-y-4 pb-8 border-b border-white/5">
                       <p className="text-sm text-gray-400 font-bold uppercase tracking-widest leading-relaxed">
                          <span className="font-black text-white">{m.user}</span> {milestoneText[m.type]}
                       </p>
                       <div className="flex items-center gap-6">
                          <span className="text-[9px] text-gray-600 font-black uppercase tracking-widest">{milestoneTime[m.type]}</span>
                          <button className="flex items-center gap-2 text-[9px] text-emerald-500/50 hover:text-emerald-500 font-black uppercase tracking-widest transition-all">
                             <Heart className="w-4 h-4" /> {t('community.recognize')}
                          </button>
                          <button className="flex items-center gap-2 text-[9px] text-gray-600 hover:text-white font-black uppercase tracking-widest transition-all">
                             <MessageSquare className="w-4 h-4" /> {t('community.comments', { count: 12 })}
                          </button>
                       </div>
                    </div>
                 </div>
              ))}
           </div>
        </div>

        {/* Neural Pulse Preview */}
        <div className="glass-card rounded-[3rem] border-blue-500/20 bg-blue-500/[0.02] p-10 flex flex-col justify-between space-y-10 relative overflow-hidden">
           <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-[60px] rounded-full" />
           <div className="space-y-6 relative z-10">
              <div className="space-y-1">
                 <h4 className="font-black text-white uppercase text-sm tracking-[0.3em] flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-[ping_2s_infinite]" /> {t('community.pulseTitle')}
                 </h4>
                 <p className="text-[10px] text-blue-500 font-black uppercase tracking-widest italic">{t('community.pulseSub')}</p>
              </div>
              <p className="text-sm text-gray-400 font-bold uppercase tracking-widest leading-loose italic">
                 "{t('community.pulseQuote')}"
              </p>
           </div>
           
           <div className="space-y-6 relative z-10">
              <div className="flex gap-3">
                 <input 
                   disabled
                   placeholder={t('community.upgradePlaceholder')}
                   className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-[10px] text-gray-600 font-black uppercase tracking-widest outline-none italic cursor-not-allowed"
                 />
                 <button className="p-4 bg-blue-500 rounded-2xl text-black shadow-lg shadow-blue-500/20 active:scale-95 transition-all">
                    <Share2 className="w-5 h-5" />
                 </button>
              </div>
              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[9px] text-blue-400 text-center uppercase tracking-[0.5em] font-black">
                 {t('community.platinumRestricted')}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default CommunityHub;
