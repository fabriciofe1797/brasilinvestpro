import React, { useState } from 'react';
import { useDualTax } from '../hooks/useDualTax';
import { DualTaxConfig } from '../services/dualTax';
import { formatCurrency } from '../lib/utils';
import {
  Globe2,
  FileText,
  Shield,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Building2,
  Coins,
  Bitcoin,
  Sparkles,
  Calendar,
  Info,
  ArrowRightLeft,
  Clock,
} from 'lucide-react';

const DualTaxPage: React.FC = () => {
  const { config, setConfig, results, summary, declarationGuide, comparison } = useDualTax();
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<'guide' | 'optimize' | null>(null);

  const formatBRL = (v: number) => formatCurrency(v, 'BRL');
  const formatMonth = (month: string) => {
    const [year, m] = month.split('-');
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${months[parseInt(m) - 1]}/${year}`;
  };

  const updateResidence = (field: 'br' | 'pt', status: 'resident' | 'non-resident') => {
    const newConfig: DualTaxConfig = { ...config };
    if (field === 'br') {
      newConfig.brResidence = { country: 'BR', status };
    } else {
      newConfig.ptResidence = { country: 'PT', status };
    }
    setConfig(newConfig);
  };

  const toggleNHR = (enabled: boolean) => {
    setConfig({ ...config, nhrRegime: enabled, nhrType: enabled ? 'new' : undefined });
  };

  const setNHRType = (type: 'old' | 'new') => {
    setConfig({ ...config, nhrType: type });
  };

  const categoryIcon = (cat: string) => {
    if (cat.includes('FII')) return <Building2 className="w-4 h-4 text-blue-400" />;
    if (cat === 'Renda Fixa' || cat === 'Renda Fixa ETF') return <Coins className="w-4 h-4 text-amber-400" />;
    if (cat === 'Cripto') return <Bitcoin className="w-4 h-4 text-orange-400" />;
    if (cat === 'Dividendos') return <TrendingUp className="w-4 h-4 text-emerald-400" />;
    return <TrendingUp className="w-4 h-4 text-emerald-400" />;
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <Globe2 className="w-8 h-8 text-emerald-500" />
            Bitributação Brasil/Portugal
          </h1>
          <p className="text-gray-500 text-sm font-medium mt-1">
            Calculo fiscal dual com tratado internacional para evitar dupla tributação.
          </p>
        </div>
        <span className="bg-gradient-to-r from-emerald-500 to-blue-500 text-white text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest">
          Tratado BR-PT
        </span>
      </div>

      {/* Configuração de Residência */}
      <div className="bg-[#0B1C17] border border-white/5 rounded-2xl p-6">
        <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4 text-emerald-500" />
          Configuração de Residência Fiscal
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Brasil */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <p className="text-[10px] font-bold text-gray-500 uppercase mb-3">Residência Brasil</p>
            <div className="flex gap-2">
              <button
                onClick={() => updateResidence('br', 'resident')}
                className={`flex-1 px-3 py-2 rounded-lg text-[10px] font-bold transition-all ${
                  config.brResidence.status === 'resident'
                    ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400'
                    : 'bg-white/5 border border-white/10 text-gray-500 hover:text-white'
                }`}
              >
                Residente
              </button>
              <button
                onClick={() => updateResidence('br', 'non-resident')}
                className={`flex-1 px-3 py-2 rounded-lg text-[10px] font-bold transition-all ${
                  config.brResidence.status === 'non-resident'
                    ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400'
                    : 'bg-white/5 border border-white/10 text-gray-500 hover:text-white'
                }`}
              >
                Não-Residente
              </button>
            </div>
          </div>

          {/* Portugal */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <p className="text-[10px] font-bold text-gray-500 uppercase mb-3">Residência Portugal</p>
            <div className="flex gap-2">
              <button
                onClick={() => updateResidence('pt', 'resident')}
                className={`flex-1 px-3 py-2 rounded-lg text-[10px] font-bold transition-all ${
                  config.ptResidence.status === 'resident'
                    ? 'bg-blue-500/20 border border-blue-500/30 text-blue-400'
                    : 'bg-white/5 border border-white/10 text-gray-500 hover:text-white'
                }`}
              >
                Residente
              </button>
              <button
                onClick={() => updateResidence('pt', 'non-resident')}
                className={`flex-1 px-3 py-2 rounded-lg text-[10px] font-bold transition-all ${
                  config.ptResidence.status === 'non-resident'
                    ? 'bg-blue-500/20 border border-blue-500/30 text-blue-400'
                    : 'bg-white/5 border border-white/10 text-gray-500 hover:text-white'
                }`}
              >
                Não-Residente
              </button>
            </div>
          </div>

          {/* NHR */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <p className="text-[10px] font-bold text-gray-500 uppercase mb-3">Regime NHR</p>
            <div className="flex gap-2">
              <button
                onClick={() => toggleNHR(false)}
                className={`flex-1 px-3 py-2 rounded-lg text-[10px] font-bold transition-all ${
                  !config.nhrRegime
                    ? 'bg-purple-500/20 border border-purple-500/30 text-purple-400'
                    : 'bg-white/5 border border-white/10 text-gray-500 hover:text-white'
                }`}
              >
                Standard
              </button>
              <button
                onClick={() => toggleNHR(true)}
                className={`flex-1 px-3 py-2 rounded-lg text-[10px] font-bold transition-all ${
                  config.nhrRegime
                    ? 'bg-purple-500/20 border border-purple-500/30 text-purple-400'
                    : 'bg-white/5 border border-white/10 text-gray-500 hover:text-white'
                }`}
              >
                NHR
              </button>
            </div>
            {config.nhrRegime && (
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => setNHRType('old')}
                  className={`flex-1 px-2 py-1.5 rounded text-[9px] font-bold transition-all ${
                    config.nhrType === 'old' ? 'bg-amber-500/20 text-amber-400' : 'bg-white/5 text-gray-600'
                  }`}
                >
                  Antigo (0%)
                </button>
                <button
                  onClick={() => setNHRType('new')}
                  className={`flex-1 px-2 py-1.5 rounded text-[9px] font-bold transition-all ${
                    config.nhrType === 'new' ? 'bg-amber-500/20 text-amber-400' : 'bg-white/5 text-gray-600'
                  }`}
                >
                  Novo (20%)
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tratado info */}
        <div className="mt-4 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10 flex items-start gap-3">
          <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-[10px] text-emerald-300 font-bold">Convenção Brasil-Portugal (Decreto 83.036/1979)</p>
            <p className="text-[9px] text-gray-500 mt-1">
              Dividendos: 15% WHT no BR com crédito em PT. Ganhos de capital: tributados no país de residência.
              {config.nhrRegime && config.nhrType === 'old' && ' Regime NHR antigo: dividendos e juros isentos em Portugal.'}
            </p>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#0B1C17] border border-white/5 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[10px] font-bold text-gray-500 uppercase">IR Brasil</span>
          </div>
          <p className="text-xl font-black text-white">{formatBRL(summary.totalBrazil)}</p>
          <p className="text-[9px] text-gray-600">DARF total</p>
        </div>
        <div className="bg-[#0B1C17] border border-white/5 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Globe2 className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-[10px] font-bold text-gray-500 uppercase">IRS Portugal</span>
          </div>
          <p className="text-xl font-black text-white">{formatBRL(summary.totalPortugal)}</p>
          <p className="text-[9px] text-gray-600">Líquido após crédito</p>
        </div>
        <div className="bg-[#0B1C17] border border-white/5 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <ArrowRightLeft className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-[10px] font-bold text-gray-500 uppercase">Crédito Fiscal</span>
          </div>
          <p className="text-xl font-black text-purple-400">{formatBRL(summary.totalCredits)}</p>
          <p className="text-[9px] text-gray-600">Economia do tratado</p>
        </div>
        <div className="bg-[#0B1C17] border border-white/5 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[10px] font-bold text-gray-500 uppercase">Carga Efetiva</span>
          </div>
          <p className="text-xl font-black text-white">{summary.effectiveRate.toFixed(2)}%</p>
          <p className="text-[9px] text-gray-600">Total / vendas</p>
        </div>
      </div>

      {/* Comparativo */}
      {comparison.savings > 0 && (
        <div className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/20 rounded-2xl p-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Sparkles className="w-6 h-6 text-emerald-400" />
            <div>
              <p className="text-sm font-bold text-white">Economia com o Tratado BR-PT</p>
              <p className="text-[10px] text-gray-500">Sem tratado, pagaria R$ {comparison.withoutTreaty.toLocaleString()} em impostos</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black text-emerald-400">{formatBRL(comparison.savings)}</p>
            <p className="text-[9px] text-emerald-500 font-bold">ECONOMIA</p>
          </div>
        </div>
      )}

      {/* Breakdown por Categoria */}
      {results.length > 0 && results[0].brazil.taxByCategory.length > 0 && (
        <div className="bg-[#0B1C17] border border-white/5 rounded-2xl p-6">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            Breakdown por Categoria de Ativo
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {results[0].brazil.taxByCategory.map((cat) => {
              const ptCat = results[0].portugal.taxByCategory.find(p => p.category === cat.category);
              const treatyCredit = results[0].treaty.credits.find(c => c.incomeType === cat.category);
              const totalTax = cat.taxDue + (ptCat?.taxDue || 0) - (treatyCredit?.creditAllowed || 0);

              return (
                <div key={cat.category} className="bg-white/5 border border-white/5 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    {categoryIcon(cat.category)}
                    <span className="text-xs font-bold text-white">{cat.category}</span>
                    {cat.exempt && (
                      <span className="ml-auto px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[8px] font-black">
                        ISENTO BR
                      </span>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-gray-500">IR Brasil</span>
                      <span className="text-emerald-400 font-bold">{formatBRL(cat.taxDue)}</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-gray-500">IRS Portugal</span>
                      <span className="text-blue-400 font-bold">{formatBRL(ptCat?.taxDue || 0)}</span>
                    </div>
                    {treatyCredit && treatyCredit.creditAllowed > 0 && (
                      <div className="flex justify-between text-[10px]">
                        <span className="text-gray-500">Crédito</span>
                        <span className="text-purple-400 font-bold">-{formatBRL(treatyCredit.creditAllowed)}</span>
                      </div>
                    )}
                    <div className="border-t border-white/5 pt-1.5 flex justify-between text-[10px]">
                      <span className="text-white font-bold">Total</span>
                      <span className="text-white font-black">{formatBRL(totalTax)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Histórico Mensal */}
      <div className="bg-[#0B1C17] border border-white/5 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-white/5 bg-white/[0.01]">
          <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-3">
            <Calendar className="w-5 h-5 text-blue-500" />
            Histórico Fiscal Mensal Dual
          </h3>
        </div>
        <div className="p-6">
          <div className="space-y-3">
            {results.map((r) => {
              const isExpanded = expandedMonth === r.month;
              return (
                <div key={r.month} className="border border-white/5 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setExpandedMonth(isExpanded ? null : r.month)}
                    className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="bg-white/5 px-3 py-1.5 rounded-lg text-white font-black text-xs">
                        {formatMonth(r.month)}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-emerald-400 font-bold">BR: {formatBRL(r.brazil.totalTax)}</span>
                        <span className="text-[10px] text-blue-400 font-bold">PT: {formatBRL(r.treaty.netLiability)}</span>
                        {r.treaty.doubleTaxRelief > 0 && (
                          <span className="text-[9px] text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                            Crédito: {formatBRL(r.treaty.doubleTaxRelief)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-[9px] text-gray-600">Carga Total</div>
                        <div className="text-white font-black text-sm">{formatBRL(r.totalBurden)}</div>
                      </div>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-white/5 pt-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Brasil */}
                        <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                          <div className="flex items-center gap-1.5 mb-2">
                            <FileText className="w-3 h-3 text-emerald-400" />
                            <span className="text-[9px] font-black text-emerald-400 uppercase">Brasil</span>
                          </div>
                          {r.brazil.taxByCategory.map(c => (
                            <div key={c.category} className="flex justify-between text-[10px] py-0.5">
                              <span className="text-gray-500">{c.category}</span>
                              <span className="text-white font-bold">{formatBRL(c.taxDue)}</span>
                            </div>
                          ))}
                          {r.brazil.exemptions.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-white/5">
                              {r.brazil.exemptions.map((e, i) => (
                                <p key={i} className="text-[8px] text-emerald-400">{e}</p>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Portugal */}
                        <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                          <div className="flex items-center gap-1.5 mb-2">
                            <Globe2 className="w-3 h-3 text-blue-400" />
                            <span className="text-[9px] font-black text-blue-400 uppercase">Portugal</span>
                          </div>
                          {r.portugal.taxByCategory.map(c => (
                            <div key={c.category} className="flex justify-between text-[10px] py-0.5">
                              <span className="text-gray-500">{c.category}</span>
                              <span className="text-white font-bold">{formatBRL(c.taxDue)}</span>
                            </div>
                          ))}
                          {r.portugal.exemptions.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-white/5">
                              {r.portugal.exemptions.map((e, i) => (
                                <p key={i} className="text-[8px] text-blue-400">{e}</p>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Tratado */}
                        <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                          <div className="flex items-center gap-1.5 mb-2">
                            <ArrowRightLeft className="w-3 h-3 text-purple-400" />
                            <span className="text-[9px] font-black text-purple-400 uppercase">Tratado</span>
                          </div>
                          {r.treaty.credits.map((c, i) => (
                            <div key={i} className="text-[10px] py-0.5">
                              <span className="text-gray-500">{c.incomeType}: </span>
                              <span className="text-purple-400 font-bold">-{formatBRL(c.creditAllowed)}</span>
                            </div>
                          ))}
                          <div className="mt-2 pt-2 border-t border-white/5">
                            <div className="flex justify-between text-[10px]">
                              <span className="text-gray-500">Alívio total</span>
                              <span className="text-purple-400 font-bold">{formatBRL(r.treaty.doubleTaxRelief)}</span>
                            </div>
                            <div className="flex justify-between text-[10px]">
                              <span className="text-gray-500">IRS líquido</span>
                              <span className="text-white font-bold">{formatBRL(r.treaty.netLiability)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {results.length === 0 && (
              <div className="text-center py-12 text-gray-700 font-black uppercase text-[10px] tracking-widest">
                Nenhuma operação registrada. Adicione transações para calcular a bitributação.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Otimização */}
      {results.some(r => r.optimization.length > 0) && (
        <div className="bg-[#0B1C17] border border-amber-500/20 rounded-2xl overflow-hidden">
          <button
            onClick={() => setExpandedSection(expandedSection === 'optimize' ? null : 'optimize')}
            className="w-full p-6 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
          >
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <h3 className="text-lg font-bold text-white">Otimização Fiscal</h3>
            </div>
            {expandedSection === 'optimize' ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
          </button>
          {expandedSection === 'optimize' && (
            <div className="px-6 pb-6 grid grid-cols-1 md:grid-cols-2 gap-3">
              {results.flatMap(r => r.optimization).map((opt, i) => (
                <div key={i} className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-white font-bold">{opt.suggestion}</p>
                      <p className="text-[10px] text-amber-400 font-bold mt-1">
                        Economia potencial: {formatBRL(opt.savings)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Guia de Declaração */}
      <div className="bg-[#0B1C17] border border-white/5 rounded-2xl overflow-hidden">
        <button
          onClick={() => setExpandedSection(expandedSection === 'guide' ? null : 'guide')}
          className="w-full p-6 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-blue-500" />
            <h3 className="text-lg font-bold text-white">Guia de Declaração Fiscal</h3>
          </div>
          {expandedSection === 'guide' ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
        </button>
        {expandedSection === 'guide' && (
          <div className="px-6 pb-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            {declarationGuide.map((guide) => (
              <div key={guide.country} className="bg-white/5 border border-white/5 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-white">{guide.form}</h4>
                  <span className="text-[9px] text-gray-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {guide.deadline}
                  </span>
                </div>
                <div className="space-y-2">
                  {guide.items.map((item, i) => (
                    <div key={i} className="flex items-start gap-2">
                      {item.required ? (
                        <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <div className="w-3 h-3 rounded-full border border-gray-600 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p className="text-[10px] text-white font-bold">{item.description}</p>
                        <p className="text-[8px] text-gray-600">{item.details}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Regras Fiscais */}
      <div className="bg-[#0B1C17] border border-white/5 rounded-2xl p-6">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4 text-emerald-500" />
          Regras Fiscais Aplicadas
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Brasil */}
          <div className="bg-white/5 rounded-xl p-4 border border-white/5">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-white">Brasil</span>
            </div>
            <div className="space-y-2 text-[10px] text-gray-400">
              <p><span className="text-emerald-400 font-bold">Ações:</span> 15% (isenção ≤R$20k/mês)</p>
              <p><span className="text-blue-400 font-bold">FIIs:</span> 20% (sem isenção)</p>
              <p><span className="text-amber-400 font-bold">Renda Fixa:</span> 15-22,5% (regressiva)</p>
              <p><span className="text-orange-400 font-bold">Cripto:</span> 15% (isenção ≤R$35k/mês)</p>
              <p><span className="text-emerald-400 font-bold">Dividendos:</span> Isentos para PF</p>
            </div>
          </div>
          {/* Portugal */}
          <div className="bg-white/5 rounded-xl p-4 border border-white/5">
            <div className="flex items-center gap-2 mb-3">
              <Globe2 className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-bold text-white">Portugal</span>
            </div>
            <div className="space-y-2 text-[10px] text-gray-400">
              <p><span className="text-white font-bold">Ganhos de capital:</span> 28% flat rate</p>
              <p><span className="text-white font-bold">Dividendos:</span> 28% withholding</p>
              <p><span className="text-orange-400 font-bold">Cripto:</span> 0% se {'>'}365 dias, 28% caso contrário</p>
              {config.nhrRegime && (
                <>
                  <p className="pt-2 border-t border-white/5">
                    <span className="text-purple-400 font-bold">NHR {config.nhrType === 'old' ? '(antigo)' : '(2024+)'}</span>:
                    {config.nhrType === 'old' ? ' 0% dividendos/juros' : ' 20% flat'}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DualTaxPage;
