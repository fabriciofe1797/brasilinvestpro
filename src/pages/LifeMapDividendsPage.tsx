import React, { useState } from 'react';
import { Heart, Plus, Trash2, TrendingUp, Target, Clock, Sparkles, X, Check } from 'lucide-react';
import { useLifeMap } from '../hooks/useLifeMap';
import { getExpenseIcon, getExpenseLabel, getPurchasingPower } from '../services/lifeMap';
import { formatCurrency } from '../lib/utils';
import type { LifeExpense } from '../types';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';

const CATEGORIES: { value: LifeExpense['category']; icon: string }[] = [
  { value: 'moradia', icon: '🏠' },
  { value: 'alimentacao', icon: '🛒' },
  { value: 'transporte', icon: '🚗' },
  { value: 'educacao', icon: '📚' },
  { value: 'lazer', icon: '🎮' },
  { value: 'saude', icon: '💊' },
  { value: 'outros', icon: '📦' },
];

const PRIORITIES: { value: LifeExpense['priority']; color: string }[] = [
  { value: 'essential', color: 'text-red-400 bg-red-500/10 border-red-500/20' },
  { value: 'important', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  { value: 'optional', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
];

export default function LifeMapDividendsPage() {
  const { expenses, addExpense, removeExpense, items, summary } = useLifeMap();
  const { t } = useTranslation();

  const categoryLabels = t('lifeMapDiv.categories', { returnObjects: true }) as Record<string, string>;
  const priorityLabels = t('lifeMapDiv.priorities', { returnObjects: true }) as Record<string, string>;
  const [showAddForm, setShowAddForm] = useState(false);
  const [newExpense, setNewExpense] = useState({
    name: '',
    category: 'outros' as LifeExpense['category'],
    monthlyAmount: 0,
    currency: 'BRL' as 'BRL' | 'EUR',
    priority: 'important' as LifeExpense['priority'],
  });

  const handleAdd = () => {
    if (!newExpense.name || newExpense.monthlyAmount <= 0) return;
    addExpense(newExpense);
    setNewExpense({ name: '', category: 'outros', monthlyAmount: 0, currency: 'BRL', priority: 'important' });
    setShowAddForm(false);
  };

  const purchasingPower = getPurchasingPower(summary.totalDividendIncomeBRL);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white tracking-tight">{t('lifeMapDiv.title')}</h1>
              <p className="text-gray-400 text-sm">{t('lifeMapDiv.subtitle')}</p>
            </div>
          </div>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all text-sm font-bold"
        >
          <Plus className="w-4 h-4" />
          {t('lifeMapDiv.addExpense')}
        </button>
      </div>

      {/* Add Expense Form */}
      {showAddForm && (
        <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-bold text-sm uppercase tracking-wider">{t('lifeMapDiv.formTitle')}</h3>
            <button onClick={() => setShowAddForm(false)} className="text-gray-500 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-2">
              <label className="text-gray-400 text-xs font-bold uppercase mb-1 block">{t('lifeMapDiv.nameLabel')}</label>
              <input
                type="text"
                value={newExpense.name}
                onChange={e => setNewExpense(p => ({ ...p, name: e.target.value }))}
                placeholder={t('lifeMapDiv.namePlaceholder')}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-emerald-500/50 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-gray-400 text-xs font-bold uppercase mb-1 block">{t('lifeMapDiv.categoryLabel')}</label>
              <select
                value={newExpense.category}
                onChange={e => setNewExpense(p => ({ ...p, category: e.target.value as LifeExpense['category'] }))}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-emerald-500/50 focus:outline-none"
              >
                {CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.icon} {categoryLabels[c.value] ?? c.value}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-gray-400 text-xs font-bold uppercase mb-1 block">{t('lifeMapDiv.valueLabel')}</label>
              <div className="flex gap-1">
                <input
                  type="number"
                  value={newExpense.monthlyAmount || ''}
                  onChange={e => setNewExpense(p => ({ ...p, monthlyAmount: Number(e.target.value) }))}
                  placeholder="0"
                  className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-emerald-500/50 focus:outline-none"
                />
                <select
                  value={newExpense.currency}
                  onChange={e => setNewExpense(p => ({ ...p, currency: e.target.value as 'BRL' | 'EUR' }))}
                  className="bg-black/40 border border-white/10 rounded-xl px-2 py-2.5 text-white text-sm focus:border-emerald-500/50 focus:outline-none"
                >
                  <option value="BRL">R$</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
            </div>
            <div className="flex items-end">
              <button
                onClick={handleAdd}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 text-black font-bold text-sm hover:bg-emerald-400 transition-all"
              >
                <Check className="w-4 h-4" />
                {t('lifeMapDiv.add')}
              </button>
            </div>
          </div>
          {/* Priority */}
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-xs font-bold uppercase">{t('lifeMapDiv.priorityLabel')}</span>
            {PRIORITIES.map(p => (
              <button
                key={p.value}
                onClick={() => setNewExpense(prev => ({ ...prev, priority: p.value }))}
                className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${
                  newExpense.priority === p.value ? p.color : 'text-gray-600 bg-transparent border-transparent'
                }`}
              >
                {priorityLabels[p.value] ?? p.value}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-pink-500/10 to-pink-500/5 border border-pink-500/20 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-pink-400" />
            <span className="text-gray-400 text-xs font-bold uppercase">{t('lifeMapDiv.kpiCoverage')}</span>
          </div>
          <p className="text-3xl font-black text-white">{summary.overallCoveragePct}%</p>
          <p className="text-pink-400 text-xs mt-1 font-bold">{t('lifeMapDiv.kpiCoverageSub')}</p>
        </div>

        <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span className="text-gray-400 text-xs font-bold uppercase">{t('lifeMapDiv.kpiIncome')}</span>
          </div>
          <p className="text-2xl font-black text-white">{formatCurrency(summary.totalDividendIncomeBRL, 'BRL')}</p>
          <p className="text-emerald-400 text-xs mt-1 font-bold">{t('lifeMapDiv.kpiIncomeSub')}</p>
        </div>

        <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-blue-400" />
            <span className="text-gray-400 text-xs font-bold uppercase">{t('lifeMapDiv.kpiIndependence')}</span>
          </div>
          {summary.monthsToFullIndependence ? (
            <>
              <p className="text-2xl font-black text-white">
                {t('lifeMapDiv.yearsMonths', { years: Math.floor(summary.monthsToFullIndependence / 12), months: summary.monthsToFullIndependence % 12 })}
              </p>
              <p className="text-blue-400 text-xs mt-1 font-bold">{t('lifeMapDiv.kpiIndependenceSub')}</p>
            </>
          ) : (
            <>
              <p className="text-lg font-black text-amber-400">{t('lifeMapDiv.kpiIndependenceNA')}</p>
              <p className="text-gray-500 text-xs mt-1 font-bold">{t('lifeMapDiv.kpiIndependenceNASub')}</p>
            </>
          )}
        </div>

        <div className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/20 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="text-gray-400 text-xs font-bold uppercase">{t('lifeMapDiv.kpiStatus')}</span>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-white text-xs font-bold">{t('lifeMapDiv.coveredCount', { count: summary.fullyCoveredExpenses })}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-white text-xs font-bold">{t('lifeMapDiv.partialCount', { count: summary.partiallyCoveredExpenses })}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-400" />
              <span className="text-white text-xs font-bold">{t('lifeMapDiv.uncoveredCount', { count: summary.uncoveredExpenses })}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Purchasing Power */}
      {purchasingPower.length > 0 && (
        <div className="bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20 rounded-2xl p-6">
          <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-3">{t('lifeMapDiv.purchasingTitle')}</h3>
          <p className="text-gray-400 text-xs mb-4">{t('lifeMapDiv.purchasingSub')}</p>
          <div className="flex flex-wrap gap-4">
            {purchasingPower.map((pp, idx) => (
              <div key={idx} className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3 border border-white/5">
                <span className="text-2xl">{pp.emoji}</span>
                <div>
                  <p className="text-white font-black text-lg">{pp.quantity}</p>
                  <p className="text-gray-400 text-xs">{pp.item}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expense Coverage Cards */}
      <div className="space-y-4">
        <h3 className="text-white font-bold text-sm uppercase tracking-wider">{t('lifeMapDiv.coverageTitle')}</h3>
        {items.map((item) => (
          <div key={item.expense.id} className="bg-white/[0.02] border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-all">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{getExpenseIcon(item.expense.category)}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-white font-bold">{item.expense.name}</h4>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                      item.expense.priority === 'essential' ? 'text-red-400 bg-red-500/10 border-red-500/20' :
                      item.expense.priority === 'important' ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' :
                      'text-blue-400 bg-blue-500/10 border-blue-500/20'
                    }`}>
                      {priorityLabels[item.expense.priority] ?? item.expense.priority}
                    </span>
                  </div>
                  <p className="text-gray-400 text-xs">{getExpenseLabel(item.expense.category)} &middot; {item.expense.currency === 'EUR' ? `${item.expense.monthlyAmount.toLocaleString(i18n.language)} EUR` : formatCurrency(item.expense.monthlyAmount, 'BRL')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white font-black text-lg">{t('lifeMapDiv.perMonth', { value: formatCurrency(item.expenseBRL, 'BRL') })}</span>
                <button onClick={() => removeExpense(item.expense.id)} className="text-gray-600 hover:text-red-400 transition-colors p-1">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-gray-400 text-xs">{t('lifeMapDiv.coverageByDividends')}</span>
                <span className={`font-bold text-sm ${
                  item.coveragePct >= 100 ? 'text-emerald-400' :
                  item.coveragePct >= 50 ? 'text-amber-400' :
                  'text-red-400'
                }`}>
                  {item.coveragePct}%
                </span>
              </div>
              <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${
                    item.coveragePct >= 100 ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' :
                    item.coveragePct >= 50 ? 'bg-gradient-to-r from-amber-500 to-amber-400' :
                    'bg-gradient-to-r from-red-500 to-red-400'
                  }`}
                  style={{ width: `${Math.min(100, item.coveragePct)}%` }}
                />
              </div>
            </div>

            {/* Coverage Details */}
            <div className="mt-3 flex flex-col md:flex-row md:items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1">
                {item.coveredBy.length > 0 ? (
                  item.coveredBy.map((c, idx) => (
                    <span key={idx} className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {c.ticker}: {formatCurrency(c.monthlyIncome, 'BRL')}
                    </span>
                  ))
                ) : (
                  <span className="text-gray-600 text-xs">{t('lifeMapDiv.noCoverage')}</span>
                )}
              </div>
              {item.monthsToFullCoverage && item.coveragePct < 100 && (
                <span className="text-gray-400 text-xs">
                  {t('lifeMapDiv.fullCoverageIn', { years: Math.floor(item.monthsToFullCoverage / 12), months: item.monthsToFullCoverage % 12 })}
                </span>
              )}
            </div>

            {/* Suggestion */}
            <p className="mt-3 text-gray-400 text-xs italic">{item.suggestion}</p>
          </div>
        ))}
      </div>

      {/* Next Milestone */}
      {summary.nextMilestone && (
        <div className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/20 rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <Target className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-white font-bold text-sm">{t('lifeMapDiv.nextMilestoneTitle')}</p>
              <p className="text-gray-300 text-sm">{summary.nextMilestone}</p>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {expenses.length === 0 && (
        <div className="text-center py-16">
          <Heart className="w-12 h-12 text-gray-700 mx-auto mb-4" />
          <h3 className="text-white font-bold text-lg mb-2">{t('lifeMapDiv.emptyTitle')}</h3>
          <p className="text-gray-400 text-sm max-w-md mx-auto">
            {t('lifeMapDiv.emptySub')}
          </p>
        </div>
      )}
    </div>
  );
}
