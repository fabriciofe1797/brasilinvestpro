import React, { useMemo, useState } from 'react';
import { useStore } from '../store/useStore';
import { formatCurrency } from '../lib/utils';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Settings, RefreshCw, AlertCircle, Info, PieChart as PieChartIcon } from 'lucide-react';
import { AssetCategory } from '../types';
import { useTranslation } from 'react-i18next';

const COLORS: Record<string, string> = {
  'FII Tijolo': '#10b981',
  'FII Papel': '#3b82f6',
  'FII Agro': '#f59e0b',
  'Ações Dividendos': '#8b5cf6',
  'Cripto': '#f97316',
  'Renda Fixa': '#06b6d4',
  'Renda Fixa ETF': '#06b6d4',
  'Ações Internacional': '#ec4899',
  'Outros': '#6b7280',
};

const PALETTE = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#f97316', '#06b6d4', '#ec4899', '#6b7280', '#84cc16', '#e11d48'];

interface RebalancingWidgetProps {
  categoryBreakdown?: { category: string; value: number; weight: number }[];
}

const RebalancingWidget: React.FC<RebalancingWidgetProps> = ({ categoryBreakdown: externalBreakdown }) => {
  const { portfolio, assets, settings, updateAllocationTargets } = useStore();
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [tempTargets, setTempTargets] = useState(settings.allocationTargets);

  const hasTargets = settings.allocationTargets.length > 0;

  // Calculate Current Allocation
  const allocationData = useMemo(() => {
    const totalValue = portfolio.reduce((acc, item) => {
      const asset = assets.find(a => a.id === item.assetId);
      return acc + (asset ? asset.price * item.quantity : 0);
    }, 0);

    if (totalValue === 0) return [];

    if (hasTargets) {
      const currentAllocation = settings.allocationTargets.map(target => {
        const categoryValue = portfolio.reduce((acc, item) => {
          const asset = assets.find(a => a.id === item.assetId);
          if (asset && asset.category === target.category) {
            return acc + (asset.price * item.quantity);
          }
          return acc;
        }, 0);

        const currentPercentage = (categoryValue / totalValue) * 100;
        
        return {
          category: target.category,
          currentValue: categoryValue,
          currentPercentage,
          targetPercentage: target.targetPercentage,
          deviation: currentPercentage - target.targetPercentage,
          color: COLORS[target.category] || '#6b7280'
        };
      });

      return currentAllocation.sort((a, b) => b.currentPercentage - a.currentPercentage);
    }

    // Fallback: use categoryBreakdown from usePortfolioMetrics
    if (externalBreakdown && externalBreakdown.length > 0) {
      return externalBreakdown.map((item, idx) => ({
        category: item.category,
        currentValue: item.value,
        currentPercentage: item.weight,
        targetPercentage: 0,
        deviation: 0,
        color: COLORS[item.category] || PALETTE[idx % PALETTE.length]
      }));
    }

    return [];
  }, [portfolio, assets, settings.allocationTargets, hasTargets, externalBreakdown]);

  const totalTarget = tempTargets.reduce((acc, t) => acc + t.targetPercentage, 0);

  const handleSaveTargets = () => {
    if (totalTarget === 100) {
      updateAllocationTargets(tempTargets);
      setIsEditing(false);
    }
  };

  const handleTargetChange = (category: AssetCategory, value: number) => {
    setTempTargets(prev => prev.map(t => 
      t.category === category ? { ...t, targetPercentage: value } : t
    ));
  };

  return (
    <div className="bg-[#0B1C17] border border-white/5 rounded-2xl p-6 shadow-lg h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-emerald-500" />
            {t('rebalancing.title')}
          </h3>
          <div className="relative inline-block group">
            <Info className="w-3 h-3 text-emerald-400 cursor-default" />
            <div className="absolute left-1/2 -translate-x-1/2 mt-2 z-20 hidden group-hover:block">
              <div className="bg-black/80 text-white text-[10px] font-bold px-2 py-1 rounded-md border border-white/10 max-w-xs text-center">
                {t('rebalancing.infoHint')}
              </div>
            </div>
          </div>
        </div>
        <button 
          onClick={() => setIsEditing(!isEditing)}
          className="p-2 hover:bg-white/5 rounded-lg transition-colors text-gray-400 hover:text-white"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {allocationData.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 py-12 text-center">
          <PieChartIcon className="w-12 h-12 text-gray-600 mb-4" />
          <p className="text-sm text-gray-400 font-medium">{t('rebalancing.empty')}</p>
          <p className="text-xs text-gray-600 mt-1">{t('rebalancing.emptyHint')}</p>
        </div>
      ) : isEditing ? (
        <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar">
          <p className="text-sm text-gray-400 mb-2">{t('rebalancing.defineIdeal')}</p>
          {tempTargets.map((target) => (
            <div key={target.category} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-white font-medium">{target.category}</span>
                <span className="text-emerald-400 font-mono">{target.targetPercentage}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={target.targetPercentage}
                onChange={(e) => handleTargetChange(target.category, Number(e.target.value))}
                className="w-full h-2 bg-[#050B09] rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>
          ))}
          
          <div className="pt-4 border-t border-white/10 mt-4">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm text-gray-400">{t('rebalancing.total')}</span>
              <span className={`text-sm font-bold ${totalTarget === 100 ? 'text-emerald-500' : 'text-red-500'}`}>
                {totalTarget}%
              </span>
            </div>
            <button
              onClick={handleSaveTargets}
              disabled={totalTarget !== 100}
              className="w-full py-2 bg-emerald-500 text-black font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-400 transition-colors"
            >
              {t('rebalancing.saveTargets')}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col md:flex-row gap-6 h-full">
          {/* Chart */}
          <div className="h-48 md:h-auto md:w-1/2 min-h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={allocationData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={60}
                  paddingAngle={5}
                  dataKey="currentValue"
                >
                  {allocationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value, 'BRL')}
                  contentStyle={{ backgroundColor: '#0B1C17', borderColor: '#ffffff20', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* List / Suggestions */}
          <div className="md:w-1/2 space-y-3 flex flex-col justify-center">
            {allocationData.map((item) => {
              const isUnderweight = hasTargets && item.deviation < -2;
              
              return (
                <div key={item.category} className="flex flex-col">
                  <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-gray-300">{item.category}</span>
                    </div>
                    <span className="text-white font-mono font-medium">
                      {item.currentPercentage.toFixed(1)}%
                      {hasTargets && (
                        <span className="text-gray-500 text-xs"> / {item.targetPercentage}%</span>
                      )}
                    </span>
                  </div>
                  
                  {/* Progress / Deviation Bar */}
                  <div className="w-full bg-[#050B09] h-1.5 rounded-full mt-1.5 overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500" 
                      style={{ 
                        width: `${hasTargets ? Math.min(100, (item.currentPercentage / item.targetPercentage) * 100) : item.currentPercentage}%`,
                        backgroundColor: item.color 
                      }} 
                    />
                  </div>

                  {isUnderweight && (
                    <div className="flex items-center gap-1 mt-1 text-[10px] text-emerald-400 animate-pulse">
                      <AlertCircle className="w-3 h-3" />
                      <span>{t('rebalancing.suggestedHere')}</span>
                    </div>
                  )}
                </div>
              );
            })}
            {!hasTargets && (
              <button
                onClick={() => setIsEditing(true)}
                className="text-[10px] text-emerald-400 hover:text-emerald-300 transition-colors font-bold uppercase tracking-wider mt-2"
              >
                {t('rebalancing.defineTargets')}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RebalancingWidget;
