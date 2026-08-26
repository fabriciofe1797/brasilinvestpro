import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { useTaxOptimizer } from '../hooks/useTaxOptimizer';
import { formatCurrency } from '../lib/utils';
import {
  Calculator, TrendingDown, TrendingUp, AlertCircle,
  FileText, DollarSign, Calendar, Sparkles, Info, ChevronDown, ChevronUp,
  Shield, Building2, Coins, Bitcoin, Download
} from 'lucide-react';

/** Gera e baixa um CSV compatível com Excel pt-BR (BOM + separador ;) */
const downloadCSV = (filename: string, rows: (string | number)[][]) => {
  const csv = rows
    .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';'))
    .join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const TaxOptimizer: React.FC = () => {
  const { assetPositions, monthlyTax, summary } = useTaxOptimizer();
  const { t } = useTranslation();
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);
  const monthNames = t('dividends.monthsShort', { returnObjects: true }) as string[];

  const currentMonth = new Date().toISOString().substring(0, 7);
  const currentTax = monthlyTax.find(m => m.month === currentMonth);

  const toggleMonth = (month: string) => {
    setExpandedMonth(prev => prev === month ? null : month);
  };

  const formatMonth = (month: string) => {
    const [year, m] = month.split('-');
    return `${monthNames[parseInt(m) - 1]}/${year}`;
  };

  // ─── Exportação para IRPF ─────────────────────────────────────────────────
  const exportMonthlyCSV = () => {
    const rows: (string | number)[][] = [
      [t('tax.csvReportTitle'), '', '', '', '', '', ''],
      [t('tax.csvGenerated'), new Date().toLocaleString(i18n.language), '', '', '', '', ''],
      [],
      [t('tax.csvMonth'), t('tax.csvSales'), t('tax.csvResult'), t('tax.csvExemption'), t('tax.csvLoss'), t('tax.csvBase'), t('tax.csvIr'), t('tax.csvRate')],
      ...monthlyTax.map(m => [
        formatMonth(m.month),
        m.salesTotal.toFixed(2),
        m.profit.toFixed(2),
        m.hasExemption ? t('tax.csvYes') : t('tax.csvNo'),
        m.lossCarriedForward.toFixed(2),
        m.taxableGain.toFixed(2),
        m.taxDue.toFixed(2),
        m.effectiveRate.toFixed(2),
      ]),
      [],
      [t('tax.csvTotal'), summary.totalSales.toFixed(2), summary.totalProfit.toFixed(2), '', summary.totalLossCarried.toFixed(2), '', '', ''],
    ];
    downloadCSV(`relatorio-fiscal-${new Date().getFullYear()}.csv`, rows);
  };

  const exportPositionsCSV = () => {
    const rows: (string | number)[][] = [
      [t('tax.csvPositionsTitle'), '', '', '', ''],
      [t('tax.csvGenerated'), new Date().toLocaleString(i18n.language), '', '', ''],
      [],
      [t('tax.csvAsset'), t('tax.csvCategory'), t('tax.csvQuantity'), t('tax.csvAvg'), t('tax.csvCost')],
      ...assetPositions.map(p => [
        p.ticker,
        p.category,
        p.quantity,
        p.averagePrice.toFixed(2),
        p.totalCost.toFixed(2),
      ]),
    ];
    downloadCSV(`posicoes-preco-medio-${new Date().getFullYear()}.csv`, rows);
  };

  return (
    <div className="bg-premium min-h-screen">
      <div className="premium-glow-1" />
      <div className="premium-glow-2" />

      <div className="relative z-10 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 pt-4">

        {/* Header */}
        <div className="flex flex-col space-y-4">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-black tracking-tight text-white uppercase underline decoration-red-500 decoration-4 underline-offset-8">
              {t('tax.titleStart')}<span className="text-red-500">{t('tax.titleHighlight')}</span>
            </h1>
            <span className="bg-gradient-to-r from-red-500 to-pink-500 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg shadow-red-500/20">
              {t('tax.badge')}
            </span>
          </div>
          <p className="text-gray-500 text-sm font-bold uppercase tracking-widest">
            {t('tax.subtitle')}
          </p>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={exportMonthlyCSV} disabled={monthlyTax.length === 0}
              className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-emerald-400 hover:bg-emerald-500/10 transition-all disabled:opacity-40 flex items-center gap-2">
              <Download className="w-3 h-3" /> {t('tax.exportMonthly')}
            </button>
            <button type="button" onClick={exportPositionsCSV} disabled={assetPositions.length === 0}
              className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-blue-400 hover:bg-blue-500/10 transition-all disabled:opacity-40 flex items-center gap-2">
              <Download className="w-3 h-3" /> {t('tax.exportPositions')}
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* DARF do Mês */}
          <div className="bg-[#0B1C17] border border-white/5 rounded-2xl p-5 group hover:border-red-500/20 transition-all">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-red-500" />
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{t('tax.darfLabel', { month: formatMonth(currentMonth) })}</span>
            </div>
            <div className="text-2xl font-black text-white">{formatCurrency(currentTax?.taxDue || 0, 'BRL')}</div>
            {currentTax?.taxDue ? (
              <div className="mt-3 flex items-center gap-2 text-[9px] font-black text-red-400 uppercase tracking-widest bg-red-500/10 w-fit px-3 py-1 rounded-full border border-red-500/20">
                <AlertCircle className="w-3 h-3" /> {t('tax.darfDue')}
              </div>
            ) : (
              <div className="mt-3 text-[9px] font-black text-gray-700 uppercase tracking-widest">{t('tax.noTaxMonth')}</div>
            )}
          </div>

          {/* Prejuízo Acumulado */}
          <div className="bg-[#0B1C17] border border-white/5 rounded-2xl p-5 group hover:border-blue-500/20 transition-all">
            <div className="flex items-center gap-2 mb-3">
              <TrendingDown className="w-4 h-4 text-blue-500" />
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{t('tax.kpiLossCarried')}</span>
            </div>
            <div className="text-2xl font-black text-blue-400">{formatCurrency(summary.totalLossCarried, 'BRL')}</div>
            <div className="mt-3 text-[9px] font-black text-gray-700 uppercase tracking-widest">
              {summary.totalLossCarried > 0 ? t('tax.lossAvailable') : t('tax.noLoss')}
            </div>
          </div>

          {/* Total Vendido */}
          <div className="bg-[#0B1C17] border border-white/5 rounded-2xl p-5 group hover:border-emerald-500/20 transition-all">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="w-4 h-4 text-emerald-500" />
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{t('tax.kpiTotalSales')}</span>
            </div>
            <div className="text-2xl font-black text-emerald-400">{formatCurrency(summary.totalSales, 'BRL')}</div>
            <div className="mt-3 text-[9px] font-black text-gray-700 uppercase tracking-widest">{t('tax.totalSalesSub')}</div>
          </div>

          {/* Resultado Total */}
          <div className="bg-[#0B1C17] border border-white/5 rounded-2xl p-5 group hover:border-purple-500/20 transition-all">
            <div className="flex items-center gap-2 mb-3">
              <Calculator className="w-4 h-4 text-purple-500" />
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{t('tax.kpiNetResult')}</span>
            </div>
            <div className={`text-2xl font-black ${summary.totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {formatCurrency(summary.totalProfit, 'BRL')}
            </div>
            <div className="mt-3 text-[9px] font-black text-gray-700 uppercase tracking-widest">
              {summary.monthsWithExemption > 0 && t('tax.monthsWithExemption', { count: summary.monthsWithExemption })}
            </div>
          </div>
        </div>

        {/* Regras Fiscais */}
        <div className="bg-[#0B1C17] border border-white/5 rounded-2xl p-6">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-emerald-500" />
            {t('tax.rulesTitle')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white/5 rounded-xl p-4 border border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-white">{t('tax.ruleStocks')}</span>
              </div>
              <p className="text-[10px] text-gray-400 leading-relaxed">
                <span className="text-emerald-400 font-bold">{t('tax.exemptionLabel')}</span> {t('tax.stocksExemption')}<br />
                <span className="text-white font-bold">{t('tax.rateLabel')}</span> {t('tax.stocksRate')}
              </p>
            </div>
            <div className="bg-white/5 rounded-xl p-4 border border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-bold text-white">{t('tax.ruleFiis')}</span>
              </div>
              <p className="text-[10px] text-gray-400 leading-relaxed">
                <span className="text-red-400 font-bold">{t('tax.noExemption')}</span><br />
                <span className="text-white font-bold">{t('tax.rateLabel')}</span> {t('tax.fiisRate')}
              </p>
            </div>
            <div className="bg-white/5 rounded-xl p-4 border border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <Coins className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-white">{t('tax.ruleFixed')}</span>
              </div>
              <p className="text-[10px] text-gray-400 leading-relaxed">
                <span className="text-white font-bold">{t('tax.regressiveLabel')}</span><br />
                {t('tax.fixedRates')}
              </p>
            </div>
            <div className="bg-white/5 rounded-xl p-4 border border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <Bitcoin className="w-4 h-4 text-orange-400" />
                <span className="text-xs font-bold text-white">{t('tax.ruleCrypto')}</span>
              </div>
              <p className="text-[10px] text-gray-400 leading-relaxed">
                <span className="text-emerald-400 font-bold">{t('tax.exemptionLabel')}</span> {t('tax.cryptoExemption')}<br />
                <span className="text-white font-bold">{t('tax.rateLabel')}</span> {t('tax.cryptoRate')}
              </p>
            </div>
          </div>
        </div>

        {/* Posições Ativas */}
        <div className="bg-[#0B1C17] border border-white/5 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-white/5 bg-white/[0.01]">
            <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-3">
              <Calculator className="w-5 h-5 text-emerald-500" />
              {t('tax.positionsTitle')}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] border-b border-white/5">
                  <th className="px-6 py-4">{t('tax.colAsset')}</th>
                  <th className="px-6 py-4 text-right">{t('tax.colQty')}</th>
                  <th className="px-6 py-4 text-right">{t('tax.colAvgPrice')}</th>
                  <th className="px-6 py-4 text-right">{t('tax.colTotalCost')}</th>
                  <th className="px-6 py-4 text-right">{t('tax.colCurrentPrice')}</th>
                  <th className="px-6 py-4 text-right">{t('tax.colUnrealized')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.02]">
                {assetPositions.map((pos) => (
                  <tr key={pos.ticker} className="group hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-black text-gray-400">
                          {pos.ticker.substring(0, 2)}
                        </div>
                        <div>
                          <p className="text-sm font-black text-white">{pos.ticker}</p>
                          <p className="text-[10px] text-gray-500">{pos.category}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-gray-400">{pos.quantity}</td>
                    <td className="px-6 py-4 text-right font-mono text-sm text-yellow-500/80">{formatCurrency(pos.averagePrice, 'BRL')}</td>
                    <td className="px-6 py-4 text-right font-mono text-sm text-gray-500">{formatCurrency(pos.totalCost, 'BRL')}</td>
                    <td className="px-6 py-4 text-right font-mono text-sm text-gray-500">{formatCurrency(pos.currentPrice, 'BRL')}</td>
                    <td className="px-6 py-4 text-right">
                      <span className={`font-black text-sm px-2 py-0.5 rounded ${pos.unrealizedResult >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                        {formatCurrency(pos.unrealizedResult, 'BRL')}
                      </span>
                      {pos.totalCost > 0 && (
                        <div className="text-[10px] font-black uppercase text-gray-700 mt-1">
                          {((pos.unrealizedResult / pos.totalCost) * 100).toFixed(2)}% ROI
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {assetPositions.length === 0 && (
            <div className="text-center py-12 text-gray-700 font-black uppercase text-[10px] tracking-widest">
              {t('tax.noPositions')}
            </div>
          )}
        </div>

        {/* Tax Loss Harvesting */}
        {assetPositions.some(p => p.unrealizedResult < -100) && (
          <div className="bg-[#0B1C17] border border-blue-500/20 rounded-2xl p-6 relative overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black text-white flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-blue-400" />
                {t('tax.harvestTitle')}
              </h3>
              <span className="bg-blue-500/20 text-blue-400 text-[8px] font-black px-2 py-1 rounded-lg border border-blue-500/20 uppercase tracking-widest">
                MASTER/ELITE
              </span>
            </div>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-6 leading-relaxed">
              {t('tax.harvestDesc')}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {assetPositions.filter(p => p.unrealizedResult < -100).map(pos => (
                <div key={pos.ticker} className="bg-white/5 border border-white/5 rounded-xl p-4 flex items-center justify-between hover:border-blue-500/30 transition-all">
                  <div>
                    <p className="font-black text-white text-base tracking-tighter">{pos.ticker}</p>
                    <p className="text-[9px] text-gray-600 font-black uppercase tracking-widest mt-1">{t('tax.harvestLossLabel')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-red-400 font-black text-lg tracking-tighter">{formatCurrency(pos.unrealizedResult, 'BRL')}</p>
                    <p className="text-[9px] text-gray-600 font-black uppercase tracking-widest mt-1">
                      {t('tax.harvestEconomy', { value: formatCurrency(Math.abs(pos.unrealizedResult) * 0.15, 'BRL') })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            {assetPositions.filter(p => p.unrealizedResult < -100).length > 0 && (
              <div className="mt-6 flex items-center gap-4 p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
                <Calculator className="w-5 h-5 text-blue-400" />
                <p className="text-xs text-blue-200/50 font-bold uppercase tracking-wider leading-relaxed">
                  {t('tax.harvestCreditStart')}
                  <span className="text-blue-400 font-black mx-2 underline decoration-blue-500/50 underline-offset-4">
                    {formatCurrency(Math.abs(assetPositions.filter(p => p.unrealizedResult < -100).reduce((acc, p) => acc + p.unrealizedResult, 0)), 'BRL')}
                  </span>
                  {t('tax.harvestCreditEnd')}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Histórico Mensal Detalhado */}
        <div className="bg-[#0B1C17] border border-white/5 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-white/5 bg-white/[0.01]">
            <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-3">
              <Calendar className="w-5 h-5 text-blue-500" />
              {t('tax.historyTitle')}
            </h3>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {monthlyTax.map((m) => {
                const isExpanded = expandedMonth === m.month;
                return (
                  <div key={m.month} className="border border-white/5 rounded-xl overflow-hidden">
                    {/* Month Header */}
                    <button
                      onClick={() => toggleMonth(m.month)}
                      className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="bg-white/5 px-3 py-1.5 rounded-lg text-white font-black text-xs uppercase tracking-widest border border-white/5">
                          {formatMonth(m.month)}
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-[10px] font-bold text-gray-500">
                            {t('tax.salesLabel')} <span className="text-gray-300">{formatCurrency(m.salesTotal, 'BRL')}</span>
                          </div>
                          <div className={`text-[10px] font-bold ${m.profit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                            {t('tax.resultLabel')} {formatCurrency(m.profit, 'BRL')}
                          </div>
                          {m.hasExemption && (
                            <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                              {t('tax.exemptionBadge')}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-[9px] font-black text-gray-700 uppercase tracking-wider">{t('tax.irDue')}</div>
                          <div className="text-white font-black text-sm">{formatCurrency(m.taxDue, 'BRL')}</div>
                        </div>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                      </div>
                    </button>

                    {/* Expanded Detail */}
                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-white/5 pt-4">
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                          {/* Ações */}
                          <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                            <div className="flex items-center gap-1.5 mb-2">
                              <TrendingUp className="w-3 h-3 text-emerald-400" />
                              <span className="text-[9px] font-black text-gray-400 uppercase">{t('tax.catStocks')}</span>
                            </div>
                            <div className="text-[10px] text-gray-500">{t('tax.salesLabel')} {formatCurrency(m.breakdown.stocks.sales, 'BRL')}</div>
                            <div className={`text-[10px] ${m.breakdown.stocks.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {t('tax.profitShort')} {formatCurrency(m.breakdown.stocks.profit, 'BRL')}
                            </div>
                            <div className="text-[10px] text-white font-bold">{t('tax.irShort')} {formatCurrency(m.breakdown.stocks.tax, 'BRL')}</div>
                            {m.breakdown.stocks.exempt && (
                              <span className="text-[8px] text-emerald-400 font-bold">{t('tax.exemptStocks')}</span>
                            )}
                          </div>

                          {/* FIIs */}
                          <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                            <div className="flex items-center gap-1.5 mb-2">
                              <Building2 className="w-3 h-3 text-blue-400" />
                              <span className="text-[9px] font-black text-gray-400 uppercase">{t('tax.catFiis')}</span>
                            </div>
                            <div className="text-[10px] text-gray-500">{t('tax.salesLabel')} {formatCurrency(m.breakdown.fiis.sales, 'BRL')}</div>
                            <div className={`text-[10px] ${m.breakdown.fiis.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {t('tax.profitShort')} {formatCurrency(m.breakdown.fiis.profit, 'BRL')}
                            </div>
                            <div className="text-[10px] text-white font-bold">{t('tax.irShort')} {formatCurrency(m.breakdown.fiis.tax, 'BRL')} (20%)</div>
                          </div>

                          {/* Renda Fixa */}
                          <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                            <div className="flex items-center gap-1.5 mb-2">
                              <Coins className="w-3 h-3 text-amber-400" />
                              <span className="text-[9px] font-black text-gray-400 uppercase">{t('tax.catFixed')}</span>
                            </div>
                            <div className="text-[10px] text-gray-500">{t('tax.salesLabel')} {formatCurrency(m.breakdown.fixedIncome.sales, 'BRL')}</div>
                            <div className={`text-[10px] ${m.breakdown.fixedIncome.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {t('tax.profitShort')} {formatCurrency(m.breakdown.fixedIncome.profit, 'BRL')}
                            </div>
                            <div className="text-[10px] text-white font-bold">{t('tax.irShort')} {formatCurrency(m.breakdown.fixedIncome.tax, 'BRL')}</div>
                          </div>

                          {/* Cripto */}
                          <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                            <div className="flex items-center gap-1.5 mb-2">
                              <Bitcoin className="w-3 h-3 text-orange-400" />
                              <span className="text-[9px] font-black text-gray-400 uppercase">{t('tax.catCrypto')}</span>
                            </div>
                            <div className="text-[10px] text-gray-500">{t('tax.salesLabel')} {formatCurrency(m.breakdown.crypto.sales, 'BRL')}</div>
                            <div className={`text-[10px] ${m.breakdown.crypto.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {t('tax.profitShort')} {formatCurrency(m.breakdown.crypto.profit, 'BRL')}
                            </div>
                            <div className="text-[10px] text-white font-bold">{t('tax.irShort')} {formatCurrency(m.breakdown.crypto.tax, 'BRL')}</div>
                            {m.breakdown.crypto.exempt && (
                              <span className="text-[8px] text-emerald-400 font-bold">{t('tax.exemptCrypto')}</span>
                            )}
                          </div>

                          {/* Resumo */}
                          <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                            <div className="flex items-center gap-1.5 mb-2">
                              <Info className="w-3 h-3 text-purple-400" />
                              <span className="text-[9px] font-black text-gray-400 uppercase">{t('tax.catSummary')}</span>
                            </div>
                            <div className="text-[10px] text-gray-500">{t('tax.lossComp')} {formatCurrency(m.lossCarriedForward, 'BRL')}</div>
                            <div className="text-[10px] text-gray-500">{t('tax.taxableBase')} {formatCurrency(m.taxableGain, 'BRL')}</div>
                            <div className="text-[10px] text-white font-bold">{t('tax.effectiveRate')} {m.effectiveRate.toFixed(2)}%</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {monthlyTax.length === 0 && (
                <div className="text-center py-12 text-gray-700 font-black uppercase text-[10px] tracking-widest">
                  {t('tax.noHistory')}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaxOptimizer;
