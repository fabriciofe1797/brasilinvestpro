import React, { useState } from 'react';
import { GitCompare, TrendingUp, CheckCircle2, Info, ArrowRight, Star } from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';

const mockAssets = [
  { id: 'BTLG11', name: 'BTG Pactual Logística', type: 'FII Logístico', price: 102.45, dy: 8.4, pvp: 0.98, liquidity: 'High' },
  { id: 'HGLG11', name: 'CSHG Logística', type: 'FII Logístico', price: 165.20, dy: 7.9, pvp: 1.05, liquidity: 'Very High' },
  { id: 'TRXF11', name: 'TRX Real Estate', type: 'FII Híbrido', price: 110.12, dy: 10.2, pvp: 1.01, liquidity: 'Medium' },
  { id: 'VISC11', name: 'Vinci Shopping Centers', type: 'FII Shopping', price: 120.30, dy: 8.1, pvp: 0.94, liquidity: 'High' },
];

const AssetComparator: React.FC = () => {
  const [assetA, setAssetA] = useState(mockAssets[0]);
  const [assetB, setAssetB] = useState(mockAssets[1]);

  return (
    <div className="space-y-10 animate-in fade-in duration-1000 pb-32">
      {/* Header Protocol */}
      <div className="glass-card rounded-[3rem] border-emerald-500/20 bg-emerald-500/[0.02] p-10 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-emerald-500/10 blur-[80px] rounded-full" />
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
               <div className="bg-emerald-500 p-3 rounded-2xl shadow-xl shadow-emerald-500/20">
                  <GitCompare className="w-6 h-6 text-black" />
               </div>
               <div>
                  <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Asset <span className="text-emerald-500">Comparator</span></h2>
                  <div className="text-[10px] text-emerald-500 font-black uppercase tracking-[0.3em]">Cross-Asset Delta Analysis</div>
               </div>
            </div>
            <p className="text-gray-400 font-bold text-sm uppercase tracking-widest leading-relaxed max-w-2xl">
              Simultaneous metric synchronization between two high-liquidity nodes. Algorithmic superiority calculation enabled.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Comparison Matrix */}
        <div className="glass-card rounded-[3rem] border-white/5 p-10 space-y-10">
           <div className="flex items-center justify-between gap-6">
              <div className="flex-1 space-y-3">
                 <label className="text-[10px] font-black text-gray-600 uppercase tracking-[0.4em] ml-1">Node Alpha</label>
                 <select 
                    value={assetA.id} 
                    onChange={(e) => setAssetA(mockAssets.find(a => a.id === e.target.value) || mockAssets[0])}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-black uppercase text-xs tracking-widest outline-none focus:border-emerald-500/50 focus:bg-white/[0.08] transition-all appearance-none"
                 >
                    {mockAssets.map(a => <option key={a.id} value={a.id} className="bg-slate-900 text-white">{a.id} — {a.name}</option>)}
                 </select>
              </div>
              <div className="mt-8 text-emerald-500 font-black italic text-xl drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]">VS</div>
              <div className="flex-1 space-y-3">
                 <label className="text-[10px] font-black text-gray-600 uppercase tracking-[0.4em] ml-1">Node Beta</label>
                 <select 
                    value={assetB.id} 
                    onChange={(e) => setAssetB(mockAssets.find(a => a.id === e.target.value) || mockAssets[1])}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-black uppercase text-xs tracking-widest outline-none focus:border-emerald-500/50 focus:bg-white/[0.08] transition-all appearance-none"
                 >
                    {mockAssets.map(a => <option key={a.id} value={a.id} className="bg-slate-900 text-white">{a.id} — {a.name}</option>)}
                 </select>
              </div>
           </div>

           <div className="space-y-4">
              <ComparisonRow label="Inventory Value" valA={formatCurrency(assetA.price, 'BRL')} valB={formatCurrency(assetB.price, 'BRL')} />
              <ComparisonRow label="Dividend Yield (12M)" valA={`${assetA.dy.toFixed(2)}%`} valB={`${assetB.dy.toFixed(2)}%`} highlightA={assetA.dy > assetB.dy} highlightB={assetB.dy > assetA.dy} />
              <ComparisonRow label="Price/Equity Ratio (P/VP)" valA={assetA.pvp.toFixed(2)} valB={assetB.pvp.toFixed(2)} highlightA={assetA.pvp < 1} highlightB={assetB.pvp < 1} />
              <ComparisonRow label="Liquidity Node" valA={assetA.liquidity} valB={assetB.liquidity} />
              <ComparisonRow label="Asset Taxonomy" valA={assetA.type} valB={assetB.type} />
           </div>
        </div>

        {/* AI Deployment Insight */}
        <div className="space-y-8">
           {/* Neural Verdict */}
           <div className="glass-card rounded-[3rem] border-emerald-500/20 bg-emerald-500/[0.02] p-10 relative overflow-hidden group">
              <div className="absolute -top-10 -right-10 opacity-5 group-hover:opacity-10 transition-opacity">
                 <Star className="w-32 h-32 text-emerald-500 animate-[spin_10s_linear_infinite]" />
              </div>
              <div className="relative z-10 space-y-8">
                 <div className="space-y-2">
                    <h3 className="font-black text-white uppercase text-sm tracking-[0.3em] flex items-center gap-3">
                       <CheckCircle2 className="text-emerald-500 w-5 h-5" /> Neural Verdict
                    </h3>
                    <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest">Calculated superior allocation node.</p>
                 </div>

                 <div className="space-y-6">
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest leading-loose">
                       Analyzing current macro volatility, <span className="text-white bg-emerald-500/20 px-3 py-1 rounded-lg border border-emerald-500/30">{assetA.dy > assetB.dy ? assetA.id : assetB.id}</span> provides a superior risk-adjusted yield of <span className="text-emerald-500">{Math.max(assetA.dy, assetB.dy)}%</span>.
                    </p>
                    <div className="p-6 rounded-[2rem] bg-black/40 border border-white/5 relative overflow-hidden">
                       <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 blur-2xl" />
                       <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest leading-loose italic">
                          "Protocol Detection: The {assetA.pvp < 1 ? assetA.id : assetB.id} node is currently trading <span className="text-blue-400">Below Parity (P/VP &lt; 1.0)</span>, suggesting a strategic entry window for long-term equity accumulation."
                       </p>
                    </div>
                    <button className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.4em] text-white hover:text-emerald-500 transition-all group/btn">
                       Access Deep Thesis Protocol <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-2 transition-transform" />
                    </button>
                 </div>
              </div>
           </div>

           {/* Deployment Strategy Guide */}
           <div className="glass-card rounded-[3rem] border-white/5 p-10 space-y-8">
              <h3 className="text-sm font-black text-white uppercase tracking-[0.3em] flex items-center gap-3">
                 <Info className="w-5 h-5 text-blue-500" /> Strategy Parameters
              </h3>
              <div className="grid grid-cols-1 gap-6">
                 {[
                    { t: "Parity Correction", d: "P/VP values below 1.0 indicate the node is trading below its tangible asset value." },
                    { t: "Liquidity Depth", d: "Measures the operational capacity to exit positions without inducing price slippage." },
                    { t: "Sector Resilience", d: "Logistics nodes typically exhibit higher survival coefficients during recessionary cycles." }
                 ].map((tip, i) => (
                    <div key={i} className="flex gap-4 group">
                       <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0 group-hover:bg-emerald-500/10 transition-all">
                          <TrendingUp className="w-4 h-4 text-gray-600 group-hover:text-emerald-500" />
                       </div>
                       <div className="space-y-1">
                          <p className="text-[11px] font-black text-white uppercase tracking-widest">{tip.t}</p>
                          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-tight leading-relaxed">{tip.d}</p>
                       </div>
                    </div>
                 ))}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

const ComparisonRow = ({ label, valA, valB, highlightA, highlightB }: any) => (
  <div className="space-y-3 p-6 rounded-3xl bg-white/[0.01] border border-white/5 hover:border-white/10 transition-all group">
     <div className="text-[9px] font-black text-gray-600 uppercase tracking-[0.4em] text-center mb-4">{label}</div>
     <div className="flex gap-6">
        <div className={cn(
           "flex-1 p-5 rounded-2xl border text-center font-black text-xs uppercase tracking-widest transition-all",
           highlightA ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400 shadow-lg shadow-emerald-500/10" : "bg-black/20 border-white/5 text-gray-500"
        )}>{valA}</div>
        <div className={cn(
           "flex-1 p-5 rounded-2xl border text-center font-black text-xs uppercase tracking-widest transition-all",
           highlightB ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400 shadow-lg shadow-emerald-500/10" : "bg-black/20 border-white/5 text-gray-500"
        )}>{valB}</div>
     </div>
  </div>
);

export default AssetComparator;
