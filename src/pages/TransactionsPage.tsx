import React, { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { formatCurrency } from '../lib/utils';
import { ArrowUpRight, ArrowDownLeft, Calendar, FileText, TrendingUp, TrendingDown, Wallet, Plus } from 'lucide-react';

const TransactionsPage: React.FC = () => {
  const { transactions, assets, settings } = useStore();

  // Sort transactions by date desc
  const sortedTransactions = [...transactions].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // KPIs Calculation
  const kpis = useMemo(() => {
    let totalInvested = 0;
    let totalSold = 0;

    transactions.forEach(tx => {
      if (tx.type === 'BUY') {
        totalInvested += tx.total;
      } else {
        totalSold += tx.total;
      }
    });

    const netResult = totalInvested - totalSold;

    return {
      totalInvested,
      totalSold,
      netResult
    };
  }, [transactions]);

  return (
    <div className="bg-premium min-h-screen">
      <div className="premium-glow-1" />
      <div className="premium-glow-2" />

      <div className="relative z-10 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 pt-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white uppercase underline decoration-emerald-500 decoration-4 underline-offset-8">Extrato <span className="text-emerald-500">Global</span></h1>
          <p className="text-gray-500 text-sm font-bold uppercase mt-4 tracking-widest">
            Histórico completo de sua inteligência financeira.
          </p>
        </div>

        {/* KPIs Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card rounded-[2rem] p-8 border-white/5 shadow-2xl relative overflow-hidden group hover:border-emerald-500/20 transition-all">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <TrendingUp className="w-24 h-24 text-emerald-500" />
            </div>
            <div className="flex flex-col relative z-10">
              <span className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] mb-4">Capital Alocado</span>
              <span className="text-4xl font-black text-white px-1 tracking-tighter">{formatCurrency(kpis.totalInvested, 'BRL')}</span>
              <div className="flex items-center gap-2 mt-6 text-[10px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-500/10 w-fit px-4 py-1.5 rounded-full border border-emerald-500/20">
                 <ArrowDownLeft className="w-3 h-3" /> BUY ORDERS
              </div>
            </div>
          </div>

          <div className="glass-card rounded-[2rem] p-8 border-white/5 shadow-2xl relative overflow-hidden group hover:border-red-500/20 transition-all">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <TrendingDown className="w-24 h-24 text-red-500" />
            </div>
            <div className="flex flex-col relative z-10">
              <span className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] mb-4">Capital Realizado</span>
              <span className="text-4xl font-black text-white px-1 tracking-tighter">{formatCurrency(kpis.totalSold, 'BRL')}</span>
              <div className="flex items-center gap-2 mt-6 text-[10px] font-black text-red-400 uppercase tracking-widest bg-red-500/10 w-fit px-4 py-1.5 rounded-full border border-red-500/20">
                 <ArrowUpRight className="w-3 h-3" /> SELL ORDERS
              </div>
            </div>
          </div>

          <div className="glass-card rounded-[2rem] p-8 border-white/5 shadow-2xl relative overflow-hidden group hover:border-blue-500/20 transition-all">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <Wallet className="w-24 h-24 text-blue-500" />
            </div>
            <div className="flex flex-col relative z-10">
              <span className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] mb-4">Net Balance Outcome</span>
              <span className="text-4xl font-black text-white px-1 tracking-tighter">{formatCurrency(kpis.netResult, 'BRL')}</span>
              <div className="flex items-center gap-2 mt-6 text-[10px] font-black text-blue-400 uppercase tracking-widest bg-blue-500/10 w-fit px-4 py-1.5 rounded-full border border-blue-500/20">
                 Portfolio Flow
              </div>
            </div>
          </div>
        </div>

        {sortedTransactions.length === 0 ? (
          <div className="text-center py-20 glass-card rounded-[2rem] border-dashed border-white/10">
            <div className="bg-white/5 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-white/5">
              <FileText className="h-8 w-8 text-gray-700" />
            </div>
            <p className="text-gray-400 font-bold uppercase text-xs tracking-widest">No intelligence record found.</p>
          </div>
        ) : (
          <div className="glass-card rounded-[2rem] overflow-hidden border-white/5 shadow-2xl">
            <div className="p-8 border-b border-white/5 bg-white/[0.01]">
               <h3 className="text-sm font-black text-white uppercase tracking-widest">Transaction Ledger</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] border-b border-white/5">
                    <th className="px-8 py-6">Asset Intelligence</th>
                    <th className="px-8 py-6">Operation</th>
                    <th className="px-8 py-6 text-right">Volume</th>
                    <th className="px-8 py-6 text-right">Execution Price</th>
                    <th className="px-8 py-6 text-right">Total Exposure</th>
                    <th className="px-8 py-6 text-right">Settled P/L</th>
                    <th className="px-8 py-6 text-center">Execution Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.02]">
                  {sortedTransactions.map((tx) => {
                    const asset = assets.find(a => a.id === tx.assetId);
                    const isBuy = tx.type === 'BUY';
                    
                    return (
                      <tr key={tx.id} className="group hover:bg-white/[0.02] transition-all">
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-500 group-hover:text-emerald-400 transition-colors">
                              <Plus className="w-4 h-4 opacity-40 hover:opacity-100" />
                            </div>
                            <div>
                               <p className="text-sm font-black text-white leading-none mb-1">{asset?.ticker || '???'}</p>
                               <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter truncate max-w-[120px]">{asset?.name || 'UNKNOWN ENTITY'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                            isBuy 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10' 
                              : 'bg-red-500/10 text-red-500 border border-red-500/10'
                          }`}>
                            {isBuy ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                            {isBuy ? 'IN' : 'OUT'}
                          </span>
                        </td>
                        <td className="px-8 py-6 text-right font-black text-sm text-gray-400">
                          {tx.quantity}
                        </td>
                        <td className="px-8 py-6 text-right font-mono text-sm text-gray-500">
                          {formatCurrency(tx.price, 'BRL')}
                        </td>
                        <td className="px-8 py-6 text-right">
                          <span className={`font-black text-sm ${isBuy ? 'text-emerald-400' : 'text-red-400'}`}>
                            {formatCurrency(tx.total, 'BRL')}
                          </span>
                        </td>
                        <td className="px-8 py-6 text-right">
                          {tx.type === 'SELL' ? (
                            <span className={`font-black text-sm px-2 py-0.5 rounded ${Number(tx.realizedPnl ?? 0) >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                              {tx.realizedPnl !== undefined && tx.realizedPnl !== null ? formatCurrency(Number(tx.realizedPnl), settings.baseCurrency) : '--'}
                            </span>
                          ) : (
                            <span className="text-gray-700 font-black text-xs">—</span>
                          )}
                        </td>
                        <td className="px-8 py-6 text-center">
                           <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-white/5 border border-white/5 text-[10px] font-black text-gray-500 uppercase tracking-tighter">
                              <Calendar className="w-2.5 h-2.5" />
                              {new Date(tx.date).toLocaleDateString('pt-BR')}
                           </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionsPage;
