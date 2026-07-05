import React, { useState } from 'react';
import { Heart, Plus, Trash2, TrendingUp, Target, Clock, Sparkles, X, Check } from 'lucide-react';
import { useLifeMap } from '../hooks/useLifeMap';
import { getExpenseIcon, getExpenseLabel, getPurchasingPower } from '../services/lifeMap';
import { formatCurrency } from '../lib/utils';
import type { LifeExpense } from '../types';

const CATEGORIES: { value: LifeExpense['category']; label: string; icon: string }[] = [
  { value: 'moradia', label: 'Moradia', icon: '🏠' },
  { value: 'alimentacao', label: 'Alimentação', icon: '🛒' },
  { value: 'transporte', label: 'Transporte', icon: '🚗' },
  { value: 'educacao', label: 'Educação', icon: '📚' },
  { value: 'lazer', label: 'Lazer', icon: '🎮' },
  { value: 'saude', label: 'Saúde', icon: '💊' },
  { value: 'outros', label: 'Outros', icon: '📦' },
];

const PRIORITIES: { value: LifeExpense['priority']; label: string; color: string }[] = [
  { value: 'essential', label: 'Essencial', color: 'text-red-400 bg-red-500/10 border-red-500/20' },
  { value: 'important', label: 'Importante', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  { value: 'optional', label: 'Opcional', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
];

export default function LifeMapDividendsPage() {
  const { expenses, addExpense, removeExpense, items, summary } = useLifeMap();
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
              <h1 className="text-3xl font-black text-white tracking-tight">Mapa de Vida</h1>
              <p className="text-gray-400 text-sm">Seus dividendos pagam quais contas da sua vida?</p>
            </div>
          </div>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all text-sm font-bold"
        >
          <Plus className="w-4 h-4" />
          Adicionar Despesa
        </button>
      </div>

      {/* Add Expense Form */}
      {showAddForm && (
        <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-bold text-sm uppercase tracking-wider">Nova Despesa Mensal</h3>
            <button onClick={() => setShowAddForm(false)} className="text-gray-500 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-2">
              <label className="text-gray-400 text-xs font-bold uppercase mb-1 block">Nome</label>
              <input
                type="text"
                value={newExpense.name}
                onChange={e => setNewExpense(p => ({ ...p, name: e.target.value }))}
                placeholder="Ex: Aluguel, Internet..."
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-emerald-500/50 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-gray-400 text-xs font-bold uppercase mb-1 block">Categoria</label>
              <select
                value={newExpense.category}
                onChange={e => setNewExpense(p => ({ ...p, category: e.target.value as LifeExpense['category'] }))}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-emerald-500/50 focus:outline-none"
              >
                {CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-gray-400 text-xs font-bold uppercase mb-1 block">Valor</label>
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
                Adicionar
              </button>
            </div>
          </div>
          {/* Priority */}
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-xs font-bold uppercase">Prioridade:</span>
            {PRIORITIES.map(p => (
              <button
                key={p.value}
                onClick={() => setNewExpense(prev => ({ ...prev, priority: p.value }))}
                className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${
                  newExpense.priority === p.value ? p.color : 'text-gray-600 bg-transparent border-transparent'
                }`}
              >
                {p.label}
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
            <span className="text-gray-400 text-xs font-bold uppercase">Cobertura Total</span>
          </div>
          <p className="text-3xl font-black text-white">{summary.overallCoveragePct}%</p>
          <p className="text-pink-400 text-xs mt-1 font-bold">das despesas cobertas</p>
        </div>

        <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span className="text-gray-400 text-xs font-bold uppercase">Renda Dividendos</span>
          </div>
          <p className="text-2xl font-black text-white">{formatCurrency(summary.totalDividendIncomeBRL, 'BRL')}</p>
          <p className="text-emerald-400 text-xs mt-1 font-bold">por mês</p>
        </div>

        <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-blue-400" />
            <span className="text-gray-400 text-xs font-bold uppercase">Independência</span>
          </div>
          {summary.monthsToFullIndependence ? (
            <>
              <p className="text-2xl font-black text-white">
                {Math.floor(summary.monthsToFullIndependence / 12)}a {summary.monthsToFullIndependence % 12}m
              </p>
              <p className="text-blue-400 text-xs mt-1 font-bold">para cobrir tudo</p>
            </>
          ) : (
            <>
              <p className="text-lg font-black text-amber-400">Aporte mais</p>
              <p className="text-gray-500 text-xs mt-1 font-bold">para calcular</p>
            </>
          )}
        </div>

        <div className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/20 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="text-gray-400 text-xs font-bold uppercase">Status</span>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-white text-xs font-bold">{summary.fullyCoveredExpenses} cobertas</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-white text-xs font-bold">{summary.partiallyCoveredExpenses} parciais</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-400" />
              <span className="text-white text-xs font-bold">{summary.uncoveredExpenses} sem cobertura</span>
            </div>
          </div>
        </div>
      </div>

      {/* Purchasing Power */}
      {purchasingPower.length > 0 && (
        <div className="bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20 rounded-2xl p-6">
          <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-3">Poder de Compra dos Dividendos</h3>
          <p className="text-gray-400 text-xs mb-4">Seus dividendos mensais equivalem a:</p>
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
        <h3 className="text-white font-bold text-sm uppercase tracking-wider">Cobertura por Despesa</h3>
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
                      {item.expense.priority === 'essential' ? 'Essencial' : item.expense.priority === 'important' ? 'Importante' : 'Opcional'}
                    </span>
                  </div>
                  <p className="text-gray-400 text-xs">{getExpenseLabel(item.expense.category)} &middot; {item.expense.currency === 'EUR' ? `${item.expense.monthlyAmount.toLocaleString('pt-PT')} EUR` : formatCurrency(item.expense.monthlyAmount, 'BRL')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white font-black text-lg">{formatCurrency(item.expenseBRL, 'BRL')}/mês</span>
                <button onClick={() => removeExpense(item.expense.id)} className="text-gray-600 hover:text-red-400 transition-colors p-1">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-gray-400 text-xs">Cobertura por dividendos</span>
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
                  <span className="text-gray-600 text-xs">Sem cobertura ainda</span>
                )}
              </div>
              {item.monthsToFullCoverage && item.coveragePct < 100 && (
                <span className="text-gray-400 text-xs">
                  Cobertura total em ~{Math.floor(item.monthsToFullCoverage / 12)}a {item.monthsToFullCoverage % 12}m
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
              <p className="text-white font-bold text-sm">Próximo Marco</p>
              <p className="text-gray-300 text-sm">{summary.nextMilestone}</p>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {expenses.length === 0 && (
        <div className="text-center py-16">
          <Heart className="w-12 h-12 text-gray-700 mx-auto mb-4" />
          <h3 className="text-white font-bold text-lg mb-2">Adicione suas despesas mensais</h3>
          <p className="text-gray-400 text-sm max-w-md mx-auto">
            Cadastre aluguel, supermercado, transporte e outras despesas para descobrir quanto dos seus dividendos já cobre sua vida.
          </p>
        </div>
      )}
    </div>
  );
}
