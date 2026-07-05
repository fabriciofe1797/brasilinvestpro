import React from 'react';
import { Users, TrendingUp, Target, Award, ArrowUpRight, MessageSquare, Heart, Share2 } from 'lucide-react';
import { cn } from '../lib/utils';

const mockRankings = [
  { rank: 1, id: 'BTLG11', name: 'BTG Pactual Logística', activity: '+12% este mês', users: 842 },
  { rank: 2, id: 'HGLG11', name: 'CSHG Logística', activity: '+8% este mês', users: 756 },
  { rank: 3, id: 'IVVB11', name: 'iShares S&P 500', activity: '+15% este mês', users: 620 },
  { rank: 4, id: 'BTC', name: 'Bitcoin', activity: '+22% este mês', users: 580 },
];

const mockMilestones = [
  { user: 'Ricardo M.', action: 'atingiu o 1º Número Mágico!', time: 'há 2 min', type: 'magic' },
  { user: 'Ana Paula', action: 'lançou sua 10ª Nota de Corretagem', time: 'há 15 min', type: 'import' },
  { user: 'Gabriel S.', action: 'completou o rebalanceamento proativo', time: 'há 1 hora', type: 'rebalance' },
];

const CommunityHub: React.FC = () => {
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
                  <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Community <span className="text-cyan-500">Hub</span></h2>
                  <div className="text-[10px] text-cyan-500 font-black uppercase tracking-[0.3em]">Collective Intelligence Protocol</div>
               </div>
            </div>
            <p className="text-gray-400 font-bold text-sm uppercase tracking-widest leading-relaxed max-w-2xl">
              Real-time synchronization of shared investment alpha and progress milestones from the BrasilInvest network.
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
                   <TrendingUp className="w-5 h-5 text-emerald-500"/> Global Liberation Goal
                 </h3>
                 <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest">Aggregate network yield towards 100% financial parity.</p>
              </div>

              <div className="space-y-6">
                 <div className="flex justify-between items-end">
                    <div className="space-y-1">
                       <div className="text-emerald-400 font-black text-4xl tracking-tighter">R$ 4.28M</div>
                       <div className="text-[9px] text-gray-600 font-black uppercase tracking-widest ml-1">Total Monthly Dividend Output</div>
                    </div>
                    <div className="text-right">
                       <span className="text-xs font-black text-white uppercase tracking-widest">68% Synchronized</span>
                    </div>
                 </div>
                 <div className="h-6 w-full bg-white/5 rounded-2xl overflow-hidden p-1.5 border border-white/10">
                    <div className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.3)] animate-pulse" style={{ width: '68%' }} />
                 </div>
                 <div className="flex justify-between text-[8px] font-black text-gray-700 uppercase tracking-[0.3em]">
                    <span>Genesis Node</span>
                    <span>100% Protocol Completion</span>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="p-6 rounded-[2rem] bg-black/40 border border-white/5 space-y-2">
                    <p className="text-[9px] text-gray-600 font-black uppercase tracking-widest">Aggregate Assets Managed</p>
                    <p className="text-2xl font-black text-white tracking-tighter">R$ 158.4M</p>
                 </div>
                 <div className="p-6 rounded-[2rem] bg-black/40 border border-white/5 space-y-2">
                    <p className="text-[9px] text-gray-600 font-black uppercase tracking-widest">Network Nodes (Portugal)</p>
                    <p className="text-2xl font-black text-white tracking-tighter">2,482 Investors</p>
                 </div>
              </div>
           </div>
        </div>

        {/* Neural Rankings */}
        <div className="glass-card rounded-[3rem] border-white/5 p-10 flex flex-col space-y-8">
           <div className="space-y-1">
              <h3 className="text-sm font-black text-white uppercase tracking-[0.3em] flex items-center gap-3">
                 <TrendingUp className="w-5 h-5 text-emerald-500" /> Hot Nodes
              </h3>
              <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest">Aggregated holder sentiment.</p>
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
                          <p className="text-[10px] font-black text-emerald-500 tracking-tighter">{asset.activity}</p>
                          <p className="text-[8px] text-gray-700 font-black uppercase tracking-widest">{asset.users} Units</p>
                       </div>
                    </div>
                 </div>
              ))}
           </div>
           <button className="w-full py-5 rounded-2xl bg-white/5 text-gray-400 text-[10px] font-black uppercase tracking-[0.3em] hover:bg-white text-black transition-all flex items-center justify-center gap-3">
              Full Spectrum Ranking <ArrowUpRight className="w-4 h-4" />
           </button>
        </div>
      </div>

      {/* Neural Feed & External Pulse */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Collective Milestones */}
        <div className="lg:col-span-2 glass-card rounded-[3rem] border-white/5 p-10 space-y-10">
           <div className="space-y-1">
              <h3 className="text-sm font-black text-white uppercase tracking-[0.3em] flex items-center gap-3">
                 <Award className="w-5 h-5 text-yellow-500" /> Operational Milestones
              </h3>
              <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest">Shared accomplishments from the network.</p>
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
                          <span className="font-black text-white">{m.user}</span> {m.action}
                       </p>
                       <div className="flex items-center gap-6">
                          <span className="text-[9px] text-gray-600 font-black uppercase tracking-widest">{m.time}</span>
                          <button className="flex items-center gap-2 text-[9px] text-emerald-500/50 hover:text-emerald-500 font-black uppercase tracking-widest transition-all">
                             <Heart className="w-4 h-4" /> Acknowledge
                          </button>
                          <button className="flex items-center gap-2 text-[9px] text-gray-600 hover:text-white font-black uppercase tracking-widest transition-all">
                             <MessageSquare className="w-4 h-4" /> Insight (12)
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
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-[ping_2s_infinite]" /> Market Heartbeat
                 </h4>
                 <p className="text-[10px] text-blue-500 font-black uppercase tracking-widest italic">Encrypted Insight Stream</p>
              </div>
              <p className="text-sm text-gray-400 font-bold uppercase tracking-widest leading-loose italic">
                 "BTLG11 emissions protocol initialized. 62% of network nodes confirmed capital participation via Rights Protocol."
              </p>
           </div>
           
           <div className="space-y-6 relative z-10">
              <div className="flex gap-3">
                 <input 
                   disabled
                   placeholder="Upgrade to Platinum for Insight Access..." 
                   className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-[10px] text-gray-600 font-black uppercase tracking-widest outline-none italic cursor-not-allowed"
                 />
                 <button className="p-4 bg-blue-500 rounded-2xl text-black shadow-lg shadow-blue-500/20 active:scale-95 transition-all">
                    <Share2 className="w-5 h-5" />
                 </button>
              </div>
              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[9px] text-blue-400 text-center uppercase tracking-[0.5em] font-black">
                 Platinum Logic Restricted
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default CommunityHub;
