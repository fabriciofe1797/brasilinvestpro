import React, { useState } from 'react';
import { useGoalSimulator, Goal } from '../hooks/useGoalSimulator';
import { formatCurrency } from '../lib/utils';
import { Plus, X, TrendingUp, Calendar, DollarSign, CheckCircle, AlertTriangle } from 'lucide-react';
import { cn } from '../lib/utils';
import { useStore } from '../store/useStore';
import { useTranslation } from 'react-i18next';

const GoalSimulator: React.FC = () => {
  const { projections, addGoal, removeGoal } = useGoalSimulator();
  const { settings } = useStore();
  const { t } = useTranslation();
  const [isAdding, setIsAdding] = useState(false);
  const [newGoal, setNewGoal] = useState<Omit<Goal, 'id'>>({
    name: '',
    targetAmount: 10000,
    currency: 'EUR',
    targetDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
    monthlyContribution: 500,
    expectedYield: 7,
  });

  const handleAdd = () => {
    if (newGoal.name && newGoal.targetAmount > 0) {
      addGoal(newGoal);
      setNewGoal({
        name: '',
        targetAmount: 10000,
        currency: 'EUR',
        targetDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
        monthlyContribution: 500,
        expectedYield: 7,
      });
      setIsAdding(false);
    }
  };

  return (
    <div className="bg-premium min-h-screen">
      <div className="premium-glow-1" />
      <div className="premium-glow-2" />

      <div className="relative z-10 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 pt-4">
        
        {/* Header */}
        <div className="flex flex-col space-y-4">
          <div className="flex items-center gap-4">
             <h1 className="text-3xl font-black tracking-tight text-white uppercase underline decoration-blue-500 decoration-4 underline-offset-8">{t('goalSim.titleStart')}<span className="text-blue-400">{t('goalSim.titleHighlight')}</span></h1>
             <span className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg shadow-blue-500/20">{t('goalSim.badge')}</span>
          </div>
          <p className="text-gray-500 text-sm font-bold uppercase tracking-widest">
            {t('goalSim.subtitle')}
          </p>
        </div>

        {/* Current Exchange Rate Info */}
        <div className="glass-card rounded-[2rem] p-6 border border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              <span className="text-gray-500 text-sm">{t('goalSim.exchangeLabel')}</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {t('goalSim.exchangeRate', { value: settings.exchangeRate.toFixed(2) })}
            </div>
          </div>
        </div>

        {/* Add New Goal */}
        {isAdding && (
          <div className="glass-card rounded-[2rem] p-8 border border-blue-500/20">
            <h3 className="text-lg font-black text-white mb-6">{t('goalSim.newGoalTitle')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <input 
                type="text"
                placeholder={t('goalSim.namePlaceholder')}
                value={newGoal.name}
                onChange={e => setNewGoal(prev => ({ ...prev, name: e.target.value }))}
                className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-600"
              />
              <div className="flex gap-2">
                <input 
                  type="number"
                  placeholder={t('goalSim.targetPlaceholder')}
                  value={newGoal.targetAmount || ''}
                  onChange={e => setNewGoal(prev => ({ ...prev, targetAmount: Number(e.target.value) }))}
                  className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white"
                />
                <select 
                  value={newGoal.currency}
                  onChange={e => setNewGoal(prev => ({ ...prev, currency: e.target.value as 'EUR' | 'BRL' }))}
                  className="px-2 py-3 bg-white/5 border border-white/10 rounded-xl text-white"
                >
                  <option value="EUR">EUR</option>
                  <option value="BRL">BRL</option>
                </select>
              </div>
              <input 
                type="date"
                value={newGoal.targetDate}
                onChange={e => setNewGoal(prev => ({ ...prev, targetDate: e.target.value }))}
                className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white"
              />
              <div className="flex gap-2">
                <input 
                  type="number"
                  placeholder={t('goalSim.contributionPlaceholder')}
                  value={newGoal.monthlyContribution || ''}
                  onChange={e => setNewGoal(prev => ({ ...prev, monthlyContribution: Number(e.target.value) }))}
                  className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white"
                />
                <select 
                  value={newGoal.currency}
                  onChange={e => setNewGoal(prev => ({ ...prev, currency: e.target.value as 'EUR' | 'BRL' }))}
                  className="px-2 py-3 bg-white/5 border border-white/10 rounded-xl text-white"
                >
                  <option value="EUR">EUR</option>
                  <option value="BRL">BRL</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={handleAdd} className="px-6 py-3 bg-blue-500 text-white font-bold rounded-xl hover:bg-blue-400">
                {t('goalSim.create')}
              </button>
              <button onClick={() => setIsAdding(false)} className="px-6 py-3 bg-white/5 text-gray-400 rounded-xl hover:text-white">
                {t('goalSim.cancel')}
              </button>
            </div>
          </div>
        )}

        {/* Goals List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {projections.map((proj) => (
            <div key={proj.goal.id} className="glass-card rounded-[2rem] p-8 border-white/5">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white">{proj.goal.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {t('goalSim.goalMeta', { target: formatCurrency(proj.goal.targetAmount, proj.goal.currency), months: t('goalSim.monthsRemaining', { count: proj.monthsRemaining }) })}
                  </p>
                </div>
                <button onClick={() => removeGoal(proj.goal.id)} className="text-gray-600 hover:text-red-400">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Progress */}
              <div className="mb-6">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-500">{t('goalSim.progressLabel')}</span>
                  <span className="font-bold text-white">{proj.progressPct.toFixed(1)}%</span>
                </div>
                <div className="h-3 w-full bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "h-full rounded-full transition-all",
                      proj.achievable ? "bg-emerald-500" : "bg-amber-500"
                    )}
                    style={{ width: `${Math.min(100, proj.progressPct)}%` }}
                  />
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                    <TrendingUp className="w-3 h-3" />{t('goalSim.statFinal')}
                  </div>
                  <div className="text-lg font-bold text-white">
                    {formatCurrency(proj.finalAmount, proj.goal.currency)}
                  </div>
                </div>
                <div className="bg-white/5 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                    <Calendar className="w-3 h-3" />{t('goalSim.statIncome')}
                  </div>
                  <div className="text-lg font-bold text-emerald-400">
                    +{formatCurrency(proj.monthlyIncomeGenerated, proj.goal.currency)}
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className={cn(
                "mt-6 p-4 rounded-xl flex items-center gap-3",
                proj.achievable ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-amber-500/10 border border-amber-500/20"
              )}>
                {proj.achievable ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                    <span className="text-emerald-400 font-bold">{t('goalSim.achievable')}</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                    <span className="text-amber-400 font-bold">
                      {t('goalSim.shortfall', { value: formatCurrency(proj.shortfall, proj.goal.currency) })}
                    </span>
                  </>
                )}
              </div>
            </div>
          ))}

          {/* Add Button */}
          {!isAdding && (
            <button 
              onClick={() => setIsAdding(true)}
              className="glass-card rounded-[2rem] p-8 border border-dashed border-white/10 hover:border-blue-500/30 flex items-center justify-center gap-3 transition-all"
            >
              <Plus className="w-6 h-6 text-gray-600" />
              <span className="text-gray-600 font-bold">{t('goalSim.addButton')}</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

export default GoalSimulator;