import React, { useState } from 'react';
import { useLifeExpenses } from '../hooks/useLifeExpenses';
import { LifeExpense } from '../hooks/useLifeExpenses';
import { formatCurrency } from '../lib/utils';
import { Home, Car, BookOpen, Coffee, Plane, Plus, X, TrendingUp, DollarSign, Target } from 'lucide-react';
import { cn } from '../lib/utils';

const categoryIcons: Record<string, React.ReactNode> = {
  moradia: <Home className="w-4 h-4" />,
  transporte: <Car className="w-4 h-4" />,
  alimentacao: <Coffee className="w-4 h-4" />,
  educacao: <BookOpen className="w-4 h-4" />,
  lazer: <Plane className="w-4 h-4" />,
  outros: <DollarSign className="w-4 h-4" />,
};

const categoryColors: Record<string, string> = {
  moradia: 'text-blue-400 bg-blue-500/20 border-blue-500/30',
  transporte: 'text-amber-400 bg-amber-500/20 border-amber-500/30',
  alimentacao: 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30',
  educacao: 'text-purple-400 bg-purple-500/20 border-purple-500/30',
  lazer: 'text-pink-400 bg-pink-500/20 border-pink-500/30',
  outros: 'text-gray-400 bg-gray-500/20 border-gray-500/30',
};

const LifeMap: React.FC = () => {
  const { 
    totalExpensesBRL, 
    monthlyIncomeBRL, 
    coveragePct, 
    coverageDetails,
    addExpense,
    removeExpense 
  } = useLifeExpenses();

  const [isAdding, setIsAdding] = useState(false);
  const [newExpense, setNewExpense] = useState<Omit<LifeExpense, 'id'>>({
    name: '',
    category: 'outros',
    monthlyBRL: 0,
    currency: 'BRL',
  });

  const handleAdd = () => {
    if (newExpense.name && newExpense.monthlyBRL > 0) {
      addExpense(newExpense);
      setNewExpense({ name: '', category: 'outros', monthlyBRL: 0, currency: 'BRL' });
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
             <h1 className="text-3xl font-black tracking-tight text-white uppercase underline decoration-purple-500 decoration-4 underline-offset-8">Mapa de <span className="text-purple-400">Vida</span></h1>
             <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg shadow-purple-500/20">Unique Feature</span>
          </div>
          <p className="text-gray-500 text-sm font-bold uppercase tracking-widest">
            Descubra quanto seus dividendos cobrem da sua vida real. Traduza investimentos em liberdade.
          </p>
        </div>

        {/* Coverage Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card rounded-[2rem] p-8 border-white/5 relative overflow-hidden group hover:border-purple-500/20 transition-all">
             <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                <Target className="w-24 h-24 text-purple-500" />
             </div>
             <span className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] mb-4 block">TOTAL INCOME COVERAGE</span>
             <div className="text-5xl font-black text-purple-400 px-1 tracking-tighter">
                {coveragePct.toFixed(0)}%
             </div>
             <div className="mt-4 text-[10px] font-black text-gray-600 uppercase tracking-widest">
                dos gastos mensais
             </div>
          </div>

          <div className="glass-card rounded-[2rem] p-8 border-white/5 relative overflow-hidden group hover:border-emerald-500/20 transition-all">
             <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                <DollarSign className="w-24 h-24 text-emerald-500" />
             </div>
             <span className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] mb-4 block">RENDA MENSAL ATUAL</span>
             <div className="text-5xl font-black text-emerald-400 px-1 tracking-tighter">
                {formatCurrency(monthlyIncomeBRL, 'BRL')}
             </div>
             <div className="mt-4 text-[10px] font-black text-gray-600 uppercase tracking-widest">
                via dividendos
             </div>
          </div>

          <div className="glass-card rounded-[2rem] p-8 border-white/5 relative overflow-hidden group hover:border-blue-500/20 transition-all">
             <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                <TrendingUp className="w-24 h-24 text-blue-500" />
             </div>
             <span className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] mb-4 block">GASTOS TOTAIS</span>
             <div className="text-5xl font-black text-blue-400 px-1 tracking-tighter">
                {formatCurrency(totalExpensesBRL, 'BRL')}
             </div>
             <div className="mt-4 text-[10px] font-black text-gray-600 uppercase tracking-widest">
                por mês
             </div>
          </div>
        </div>

        {/* Expenses Map */}
        <div className="glass-card rounded-[2rem] p-8 border-white/5 shadow-2xl">
          <div className="flex justify-between items-center mb-8">
             <h3 className="text-lg font-black text-white uppercase tracking-[0.2em] flex items-center gap-3">
                <Target className="w-5 h-5 text-purple-500" /> Cobertura por Despesa
             </h3>
             <button 
               onClick={() => setIsAdding(true)}
               className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg border border-purple-500/30 text-sm font-bold hover:bg-purple-500/30 transition-colors"
             >
               <Plus className="w-4 h-4" /> Adicionar Despesa
             </button>
          </div>

          {/* Add New Expense Form */}
          {isAdding && (
            <div className="mb-6 p-6 rounded-2xl bg-purple-500/10 border border-purple-500/20">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <input 
                  type="text"
                  placeholder="Nome da despesa"
                  value={newExpense.name}
                  onChange={e => setNewExpense(prev => ({ ...prev, name: e.target.value }))}
                  className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-gray-600"
                />
                <select 
                  value={newExpense.category}
                  onChange={e => setNewExpense(prev => ({ ...prev, category: e.target.value as LifeExpense['category'] }))}
                  className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                >
                  <option value="moradia">Moradia</option>
                  <option value="transporte">Transporte</option>
                  <option value="alimentacao">Alimentação</option>
                  <option value="educacao">Educação</option>
                  <option value="lazer">Lazer</option>
                  <option value="outros">Outros</option>
                </select>
                <div className="flex gap-2">
                  <input 
                    type="number"
                    placeholder="Valor"
                    value={newExpense.monthlyBRL || ''}
                    onChange={e => setNewExpense(prev => ({ ...prev, monthlyBRL: Number(e.target.value) }))}
                    className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-gray-600"
                  />
                  <select 
                    value={newExpense.currency}
                    onChange={e => setNewExpense(prev => ({ ...prev, currency: e.target.value as 'BRL' | 'EUR' }))}
                    className="px-2 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
                  >
                    <option value="BRL">BRL</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={handleAdd}
                    className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg font-bold hover:bg-purple-400"
                  >
                    Adicionar
                  </button>
                  <button 
                    onClick={() => setIsAdding(false)}
                    className="px-4 py-2 bg-white/5 text-gray-400 rounded-lg hover:text-white"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Expenses Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {coverageDetails.map((detail) => {
              const exp = detail.expense;
              const expBRL = exp.currency === 'EUR' 
                ? exp.monthlyBRL * 6.2 // Use default rate if not available
                : exp.monthlyBRL;
              const coverage = (monthlyIncomeBRL / expBRL) * 100;
              
              return (
                <div 
                  key={exp.id}
                  className="p-6 rounded-2xl bg-white/5 border border-white/5 hover:border-purple-500/30 transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", categoryColors[exp.category])}>
                        {categoryIcons[exp.category]}
                      </div>
                      <div>
                        <h4 className="font-bold text-white">{exp.name}</h4>
                        <p className="text-xs text-gray-500 uppercase">{exp.category}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => removeExpense(exp.id)}
                      className="text-gray-600 hover:text-red-400"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 uppercase mb-1">Valor Mensal</p>
                      <p className="text-lg font-bold text-white">
                        {formatCurrency(exp.monthlyBRL, exp.currency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase mb-1">Cobertura</p>
                      <p className={cn(
                        "text-lg font-bold",
                        coverage >= 100 ? "text-emerald-400" :
                        coverage >= 50 ? "text-amber-400" :
                        "text-red-400"
                      )}>
                        {coverage.toFixed(0)}%
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-4">
                    <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full rounded-full transition-all",
                          coverage >= 100 ? "bg-emerald-500" :
                          coverage >= 50 ? "bg-amber-500" :
                          "bg-red-500"
                        )}
                        style={{ width: `${Math.min(100, coverage)}%` }}
                      />
                    </div>
                  </div>

                  {coverage >= 100 && (
                    <p className="mt-3 text-xs text-emerald-400 font-bold">
                      ✓ Totalmente coberto pelos seus Dividendos!
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {coverageDetails.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma despesa adicionada ainda.</p>
              <p className="text-xs mt-2">Adicione suas despesas mensais para ver a cobertura.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default LifeMap;