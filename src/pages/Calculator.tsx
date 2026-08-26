import React, { useState, useEffect, useMemo } from 'react';
import { formatCurrency } from '../lib/utils';
import { TrendingUp, RefreshCw, BarChart as BarChartIcon, Table as TableIcon, Sparkles } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { cn } from '../lib/utils';
import { useTranslation } from 'react-i18next';

interface SimulationRow {
  month: number;
  year: number;
  invested: number;
  interest: number;
  total: number;
  totalInterest: number;
}

const COLORS = ['#10b981', '#3b82f6']; // Emerald-500, Blue-500

const Calculator: React.FC = () => {
  const { t } = useTranslation();
  // --- State ---
  const [initialAmount, setInitialAmount] = useState(10000);
  const [monthlyContribution, setMonthlyContribution] = useState(1000);
  const [years, setYears] = useState(10);
  const [interestRate, setInterestRate] = useState(10); // Annual %
  
  const [data, setData] = useState<SimulationRow[]>([]);
  const [summary, setSummary] = useState({ total: 0, invested: 0, totalInterest: 0 });
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');
  const [tablePeriod, setTablePeriod] = useState<'annual' | 'monthly'>('annual');

  // --- Calculation Logic ---
  useEffect(() => {
    const r = interestRate / 100 / 12;
    const n = years * 12;
    
    let currentBalance = initialAmount;
    let totalInvested = initialAmount;
    let totalInterest = 0;
    
    const rows: SimulationRow[] = [];

    for (let i = 1; i <= n; i++) {
      const interest = currentBalance * r;
      currentBalance += interest + monthlyContribution;
      totalInvested += monthlyContribution;
      totalInterest += interest;

      rows.push({
        month: i,
        year: Math.ceil(i / 12),
        invested: totalInvested,
        interest: interest,
        totalInterest: totalInterest,
        total: currentBalance
      });
    }

    setData(rows);
    setSummary({
      total: currentBalance,
      invested: totalInvested,
      totalInterest: totalInterest
    });
  }, [initialAmount, monthlyContribution, years, interestRate]);

  // --- Derived Data for Charts ---
  const annualData = useMemo(() => {
    return data.filter(row => row.month % 12 === 0).map(row => ({
      name: t('calculator.year', { year: row.year }),
      invested: row.invested,
      interest: row.totalInterest,
      total: row.total
    }));
  }, [data, t]);

  const pieData = [
    { name: t('calculator.pieCapital'), value: summary.invested },
    { name: t('calculator.pieInterest'), value: summary.totalInterest },
  ];

  const tableData = tablePeriod === 'annual' ? annualData : data;

  return (
    <div className="bg-premium min-h-screen">
      <div className="premium-glow-1" />
      <div className="premium-glow-2" />

      <div className="relative z-10 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 pt-4">
        
        {/* Header */}
        <div className="flex flex-col space-y-4">
          <div className="flex items-center gap-4">
             <h1 className="text-3xl font-black tracking-tight text-white uppercase underline decoration-emerald-500 decoration-4 underline-offset-8">{t('calculator.titleStart')}<span className="text-emerald-500">{t('calculator.titleHighlight')}</span></h1>
             <span className="bg-emerald-500/10 text-emerald-500 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-emerald-500/20 shadow-lg shadow-emerald-500/10">{t('calculator.badge')}</span>
          </div>
          <p className="text-gray-500 text-sm font-bold uppercase tracking-widest">
            {t('calculator.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT COLUMN: Inputs (4 cols) */}
          <div className="lg:col-span-4 space-y-8">
            <div className="glass-card rounded-[2.5rem] p-8 border-white/5 shadow-2xl relative overflow-hidden">
              <div className="flex items-center justify-between mb-8">
                 <h3 className="text-sm font-black text-white uppercase tracking-[0.2em] flex items-center gap-3">
                   <RefreshCw className="w-5 h-5 text-emerald-500" /> {t('calculator.controlTitle')}
                 </h3>
                 <Sparkles className="w-4 h-4 text-emerald-500/30" />
              </div>
              
              <div className="space-y-8">
                {/* Initial Amount */}
                <div className="space-y-3">
                  <label className="text-[10px] text-gray-600 font-black uppercase tracking-[0.2em] ml-1">{t('calculator.initialLabel')}</label>
                  <div className="relative group">
                    <input
                      type="number"
                      value={initialAmount}
                      onChange={(e) => setInitialAmount(Number(e.target.value))}
                      className="w-full bg-white/[0.02] border border-white/5 rounded-2xl px-6 py-4 text-lg text-white font-black tracking-tighter focus:border-emerald-500/30 transition-all outline-none"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-gray-700 font-black uppercase">{t('calculator.initialSuffix')}</div>
                  </div>
                </div>

                {/* Monthly Contribution */}
                <div className="space-y-3">
                  <label className="text-[10px] text-gray-600 font-black uppercase tracking-[0.2em] ml-1">{t('calculator.contributionLabel')}</label>
                  <div className="relative group">
                    <input
                      type="number"
                      value={monthlyContribution}
                      onChange={(e) => setMonthlyContribution(Number(e.target.value))}
                      className="w-full bg-white/[0.02] border border-white/5 rounded-2xl px-6 py-4 text-lg text-white font-black tracking-tighter focus:border-emerald-500/30 transition-all outline-none"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-gray-700 font-black uppercase">{t('calculator.contributionSuffix')}</div>
                  </div>
                </div>

                {/* Interest Rate Slider */}
                <div className="space-y-4 pt-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] text-gray-600 font-black uppercase tracking-[0.2em]">{t('calculator.rateLabel')}</label>
                    <span className="text-emerald-500 font-black text-sm">{interestRate}%</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="30"
                    step="0.5"
                    value={interestRate}
                    onChange={(e) => setInterestRate(Number(e.target.value))}
                    className="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                </div>

                {/* Years Slider */}
                <div className="space-y-4 pt-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] text-gray-600 font-black uppercase tracking-[0.2em]">{t('calculator.horizonLabel')}</label>
                    <span className="text-emerald-500 font-black text-sm">{years}Y</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    step="1"
                    value={years}
                    onChange={(e) => setYears(Number(e.target.value))}
                    className="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Pie Chart Card */}
            <div className="hidden lg:block glass-card rounded-[2.5rem] p-8 border-white/5 shadow-2xl bg-white/[0.01]">
              <h4 className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] mb-8 block text-center">{t('calculator.pieTitle')}</h4>
              <div className="h-64 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={90}
                      paddingAngle={8}
                      dataKey="value"
                      stroke="none"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#030816', 
                        border: '1px solid rgba(255,255,255,0.05)', 
                        borderRadius: '1rem',
                        padding: '12px'
                      }}
                      itemStyle={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', color: '#fff' }}
                      labelStyle={{ display: 'none' }}
                      formatter={(value: number) => formatCurrency(value, 'BRL')}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                   <div className="text-[10px] font-black text-gray-600 uppercase tracking-widest">{t('calculator.efficiency')}</div>
                   <div className="text-xl font-black text-emerald-500 tracking-tighter">{((summary.totalInterest / summary.total) * 100).toFixed(0)}%</div>
                </div>
              </div>
              <div className="flex justify-center gap-8 mt-4">
                 <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">{t('calculator.legendCapital')}</span>
                 </div>
                 <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">{t('calculator.legendInterest')}</span>
                 </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Results & Charts (8 cols) */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Total Result Hero Card */}
            <div className="glass-card rounded-[2.5rem] p-10 border-white/5 shadow-2xl relative overflow-hidden bg-white/[0.01]">
               <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-500/10 blur-[120px] rounded-full" />
               <div className="relative z-10">
                 <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                    <span className="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em]">{t('calculator.finalLabel')}</span>
                 </div>
                 <div className="text-6xl font-black text-white tracking-tighter mb-4">
                   {formatCurrency(summary.total, 'BRL')}
                 </div>
                 <div className="flex items-center gap-4">
                    <div className="bg-emerald-500 text-black text-[9px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full">
                       {t('calculator.horizonBadge', { years })}
                    </div>
                    <div className="text-emerald-500/70 text-[10px] font-black uppercase tracking-widest">
                       {t('calculator.netGain', { value: ((summary.totalInterest / summary.invested) * 100).toFixed(1) })}
                    </div>
                 </div>
               </div>
            </div>

            {/* Split Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="glass-card rounded-[2rem] p-8 border-white/5 relative overflow-hidden group">
                <span className="text-[9px] text-gray-600 font-black uppercase tracking-[0.2em] mb-4 block">{t('calculator.activeCommitment')}</span>
                <span className="text-3xl font-black text-white block tracking-tighter">
                  {formatCurrency(summary.invested, 'BRL')}
                </span>
                <div className="w-full bg-white/5 h-1 mt-6 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full shadow-[0_0_10px_rgba(16,185,129,0.5)] transition-all duration-1000" style={{ width: `${(summary.invested / summary.total) * 100}%` }} />
                </div>
                <div className="mt-4 text-[8px] text-gray-700 font-black uppercase tracking-widest">{t('calculator.activeSub')}</div>
              </div>

              <div className="glass-card rounded-[2rem] p-8 border-white/5 relative overflow-hidden group">
                <span className="text-[9px] text-gray-600 font-black uppercase tracking-[0.2em] mb-4 block">{t('calculator.compoundInterest')}</span>
                <span className="text-3xl font-black text-blue-400 block tracking-tighter">
                  {formatCurrency(summary.totalInterest, 'BRL')}
                </span>
                <div className="w-full bg-white/5 h-1 mt-6 rounded-full overflow-hidden">
                  <div className="bg-blue-500 h-full shadow-[0_0_10px_rgba(59,130,246,0.5)] transition-all duration-1000" style={{ width: `${(summary.totalInterest / summary.total) * 100}%` }} />
                </div>
                <div className="mt-4 text-[8px] text-gray-700 font-black uppercase tracking-widest">{t('calculator.interestSub')}</div>
              </div>
            </div>

            {/* Visualizer Frame */}
            <div className="glass-card rounded-[2.5rem] p-10 border-white/5 shadow-2xl relative">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-12">
                <h3 className="text-sm font-black text-white uppercase tracking-[0.2em] flex items-center gap-3">
                  <BarChartIcon className="w-5 h-5 text-emerald-500" /> {t('calculator.visualizerTitle')}
                </h3>
                
                <div className="flex bg-white/[0.03] p-1.5 rounded-2xl border border-white/5">
                  <button
                    onClick={() => setViewMode('chart')}
                    className={cn(
                      "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                      viewMode === 'chart' ? "bg-emerald-500 text-black shadow-lg" : "text-gray-600 hover:text-white"
                    )}
                  >
                    <BarChartIcon className="w-3.5 h-3.5" /> {t('calculator.chartBtn')}
                  </button>
                  <button
                    onClick={() => setViewMode('table')}
                    className={cn(
                      "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                      viewMode === 'table' ? "bg-emerald-500 text-black shadow-lg" : "text-gray-600 hover:text-white"
                    )}
                  >
                    <TableIcon className="w-3.5 h-3.5" /> {t('calculator.tableBtn')}
                  </button>
                </div>
              </div>

              <div className="h-[450px] w-full">
                {viewMode === 'chart' ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={annualData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                      barSize={20}
                    >
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#4B5563', fontSize: 10, fontWeight: 900 }}
                      />
                      <YAxis hide />
                      <Tooltip
                        cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                        contentStyle={{ 
                          backgroundColor: '#030816', 
                          border: '1px solid rgba(255,255,255,0.05)', 
                          borderRadius: '1.5rem',
                          padding: '20px',
                          boxShadow: '0 25px 50px rgba(0,0,0,0.5)'
                        }}
                        itemStyle={{ fontSize: '11px', fontWeight: '900', textTransform: 'uppercase' }}
                        labelStyle={{ fontSize: '13px', fontWeight: '900', color: '#fff', marginBottom: '12px', borderBottom: '1px solid #ffffff10', paddingBottom: '8px' }}
                        formatter={(value: number) => [formatCurrency(value, 'BRL'), t('calculator.tooltipValue')]}
                      />
                      <Bar dataKey="invested" name={t('calculator.seriesInvested')} stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} opacity={0.6} />
                      <Bar dataKey="interest" name={t('calculator.seriesInterest')} stackId="a" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col">
                    <div className="flex justify-end mb-6">
                       <div className="flex bg-white/[0.03] p-1 rounded-xl border border-white/5">
                          <button
                            onClick={() => setTablePeriod('annual')}
                            className={cn(
                              "px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                              tablePeriod === 'annual' ? "bg-white/10 text-white" : "text-gray-600"
                            )}
                          >
                            {t('calculator.annualBtn')}
                          </button>
                          <button
                            onClick={() => setTablePeriod('monthly')}
                            className={cn(
                              "px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                              tablePeriod === 'monthly' ? "bg-white/10 text-white" : "text-gray-600"
                            )}
                          >
                            {t('calculator.monthlyBtn')}
                          </button>
                       </div>
                    </div>
                    
                    <div className="overflow-y-auto pr-4 no-scrollbar flex-1 border border-white/[0.03] rounded-[2rem] bg-white/[0.01]">
                      <table className="w-full text-left">
                        <thead className="sticky top-0 bg-[#030816] z-10">
                          <tr className="border-b border-white/5">
                            <th className="py-6 px-8 text-[9px] font-black text-gray-500 uppercase tracking-widest">{t('calculator.colPeriod')}</th>
                            <th className="py-6 px-8 text-[9px] font-black text-gray-500 uppercase tracking-widest text-right">{t('calculator.colYield')}</th>
                            <th className="py-6 px-8 text-[9px] font-black text-gray-500 uppercase tracking-widest text-right">{t('calculator.colInvested')}</th>
                            <th className="py-6 px-8 text-[9px] font-black text-gray-500 uppercase tracking-widest text-right">{t('calculator.colNet')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.02]">
                          {tableData.map((row, idx) => (
                            <tr key={idx} className="group hover:bg-white/[0.02] transition-colors">
                              <td className="py-5 px-8 text-xs font-black text-gray-400 group-hover:text-white tracking-widest uppercase">
                                {tablePeriod === 'annual' ? row.name : `M.${row.month} (Y.${row.year})`}
                              </td>
                              <td className="py-5 px-8 text-[11px] font-black text-right text-blue-400 font-mono">
                                +{formatCurrency((row as any).interest, 'BRL')}
                              </td>
                              <td className="py-5 px-8 text-[11px] font-bold text-right text-gray-600 font-mono">
                                {formatCurrency((row as any).invested, 'BRL')}
                              </td>
                              <td className="py-5 px-8 text-sm font-black text-right text-white font-mono tracking-tighter">
                                {formatCurrency((row as any).total, 'BRL')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Calculator;
