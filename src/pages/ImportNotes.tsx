import React, { useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useStore } from '../store/useStore';
import { getPlanLimits } from '../services/billing';
import { parseBrokerageNote, parseCsvTransactions, ExtractedTransaction, CsvProvider } from '../services/pdfParser';
import { applyTickerAlias } from '../lib/utils';
import { saveTransaction } from '../services/database';
import { Upload, FileText, Check, AlertCircle, Loader2 } from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';

const PROVIDER_IDS: CsvProvider[] = ['b3', 'kinvo', 'trademap', 'gorila', 'realvalor', 'broker', 'generic'];

const ImportNotes: React.FC = () => {
  const { getToken } = useAuth();
  const { settings, portfolio, transactions: storeTx, addTransaction, addNotification } = useStore();
  const { t } = useTranslation();

  const providerLabels = t('importNotes.providerLabels', { returnObjects: true }) as string[];
  const guides = t('importNotes.guides', { returnObjects: true }) as Record<string, { title: string; steps: string[] }>;
  
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [transactions, setTransactions] = useState<ExtractedTransaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState(0);
  const [provider, setProvider] = useState<CsvProvider>('generic');

  const toggleTransaction = (idx: number) => {
    setTransactions(prev => prev.map((tx, i) => 
      i === idx ? { ...tx, _valid: tx._valid === false ? true : false } : tx
    ));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      processFiles(files);
    }
  };

  const processFiles = async (files: File[]) => {
    setIsParsing(true);
    setError(null);
    setSuccessCount(0);
    const allTransactions: ExtractedTransaction[] = [];

    for (const file of files) {
      const name = file.name.toLowerCase();
      const isPdf = name.endsWith('.pdf');
      const isCsv = name.endsWith('.csv');

      if (!isPdf && !isCsv) {
        setError(t('importNotes.errFileTypes'));
        continue;
      }

      try {
        const extracted = isPdf
          ? await parseBrokerageNote(file)
          : await parseCsvTransactions(file, provider);
        allTransactions.push(...extracted);
      } catch (err) {
        console.error(err);
        setError(t('importNotes.errRead'));
      }
    }

    if (allTransactions.length === 0 && !error) {
        setError(t('importNotes.errNoTx'));
    }

    setTransactions(allTransactions);
    setIsParsing(false);
  };

  const handleConfirmImport = async () => {
    setIsSaving(true);
    try {
      const token = await getToken({ template: 'supabase' });
      if (!token) throw new Error(t('importNotes.errAuth'));

      let saved = 0;
      let skipped = 0;
      const limits = getPlanLimits(settings.plan ?? 'free');
      let txCount = storeTx.length;
      const positions = new Set(portfolio.map(p => p.assetId));
      const validTxs = transactions.filter(tx => tx._valid !== false);

      for (const tx of validTxs) {
        // Enforce transaction count limit
        if (limits.transactions !== null && txCount >= limits.transactions) {
          skipped += (transactions.length - (saved + skipped));
          addNotification({
            title: t('importNotes.notifTxLimitTitle'),
            message: t('importNotes.notifTxLimitMsg', { count: limits.transactions }),
            type: 'warning'
          });
          break;
        }

        // Enforce asset count limit only when creating a new position on BUY
        const isNewPosition = tx.type === 'BUY' && !positions.has(tx.ticker);
        if (isNewPosition && limits.assets !== null && positions.size >= limits.assets) {
          skipped++;
          addNotification({
            title: t('importNotes.notifAssetLimitTitle'),
            message: t('importNotes.notifAssetLimitMsg', { count: limits.assets, ticker: tx.ticker }),
            type: 'warning'
          });
          continue;
        }

        // 1. Ensure Asset Exists (Auto-Register if needed)
        // Check if asset exists in store or DB
        // Simple heuristic: If not in store, register as 'Outros' or try to guess
        // We will just register basic info if missing
        
        // Save Transaction
        const ticker = applyTickerAlias(tx.ticker);
        await saveTransaction({
            assetId: ticker,
            type: tx.type,
            quantity: tx.quantity,
            price: tx.price,
            date: tx.date,
            fees: tx.fee
        }, token);
        saved++;

        // Reflect locally only after successful save
        const ok = addTransaction({
          assetId: ticker,
          type: tx.type,
          quantity: tx.quantity,
          price: tx.price,
          date: tx.date,
          fees: tx.fee
        });
        if (!ok) {
          // Should not happen given prior checks, but guard anyway
          skipped++;
        } else {
          txCount++;
          if (isNewPosition) positions.add(ticker);
        }
      }
      
      setSuccessCount(saved);
      setTransactions([]); // Clear list
      
      // Trigger global refresh? 
      // Ideally we should reload transactions in store, but user can just go to dashboard.
      if (skipped > 0) {
        alert(t('importNotes.alertPartial', { saved, skipped }));
      } else {
        alert(t('importNotes.alertSuccess', { saved, total: validTxs.length }));
      }
      
    } catch (err) {
      console.error(err);
      const msg = (err as any)?.message || '';
      if (msg.includes('license_expired')) {
        setError(t('importNotes.errLicenseExpired'));
      } else if (msg.includes('license_inactive')) {
        setError(t('importNotes.errLicenseInactive'));
      } else if (msg.includes('limit_exceeded')) {
        setError(t('importNotes.errLimitExceeded'));
      } else {
        setError(t('importNotes.errSave'));
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      {/* Header */}
        <div className="flex flex-col space-y-2">
        <div className="flex items-center gap-2">
           <h1 className="text-2xl font-bold tracking-tight text-white">{t('importNotes.title')}</h1>
           <span className="bg-gradient-to-r from-emerald-500 to-green-500 text-black text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider">{t('importNotes.badge')}</span>
        </div>
        <p className="text-gray-400 text-sm">
          {t('importNotes.subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#0B1C17] border border-white/10 rounded-2xl p-5 space-y-4">
          <h2 className="text-lg font-bold text-white">{t('importNotes.connectTitle')}</h2>
          <p className="text-gray-400 text-sm">
            {t('importNotes.connectDesc')}
          </p>
          <div className="flex flex-wrap gap-2 text-xs">
            {PROVIDER_IDS.map((pid, i) => (
              <button
                key={pid}
                type="button"
                onClick={() => setProvider(pid)}
                className={`px-2 py-1 rounded-full border text-[11px] ${
                  provider === pid
                    ? 'bg-emerald-500 text-black border-emerald-400'
                    : 'bg-white/5 text-gray-300 border-white/10 hover:border-emerald-400/60'
                }`}
              >
                {providerLabels[i] ?? pid}
              </button>
            ))}
          </div>
          <div className="bg-black/20 border border-white/5 rounded-xl p-3 text-[11px] text-gray-300 space-y-1">
            {guides[provider] && (
              <>
                <p className="font-semibold text-white">{guides[provider].title}</p>
                {guides[provider].steps.map((step, i) => (
                  <p key={i}>{step}</p>
                ))}
              </>
            )}
            <p className="text-[10px] text-gray-500 pt-1">
              {t('importNotes.masterNote')}
            </p>
          </div>
        </div>
      </div>

      {/* Dropzone */}
      {!transactions.length && successCount === 0 && (
        <div 
            className={`border-2 border-dashed rounded-3xl h-64 flex flex-col items-center justify-center transition-all cursor-pointer ${
                isDragging ? 'border-emerald-500 bg-emerald-500/10' : 'border-white/10 bg-[#0B1C17] hover:border-emerald-500/50'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => document.getElementById('fileInput')?.click()}
        >
            <input 
                type="file" 
                id="fileInput" 
                multiple 
                accept=".pdf,.csv" 
                className="hidden" 
                onChange={handleFileSelect}
            />
            
            {isParsing ? (
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
                    <p className="text-white font-medium">{t('importNotes.reading')}</p>
                </div>
            ) : (
                <>
                    <div className="bg-white/5 p-4 rounded-full mb-4">
                        <Upload className="w-8 h-8 text-emerald-400" />
                    </div>
                    <p className="text-white font-bold text-lg">{t('importNotes.dropTitle')}</p>
                    <p className="text-gray-500 text-sm mt-2">{t('importNotes.dropHint')}</p>
                </>
            )}
        </div>
      )}

      {/* Error Message */}
      {error && (
          <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center gap-3 text-red-400">
              <AlertCircle className="w-5 h-5" />
              {error}
          </div>
      )}

      {/* Success Message */}
      {successCount > 0 && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-xl flex flex-col items-center text-center gap-4 animate-in zoom-in duration-300">
              <div className="bg-emerald-500 p-3 rounded-full text-black">
                  <Check className="w-8 h-8" />
              </div>
              <div>
                  <h3 className="text-xl font-bold text-white">{t('importNotes.successTitle', { count: successCount })}</h3>
                  <p className="text-gray-400 text-sm">{t('importNotes.successSub')}</p>
              </div>
              <button onClick={() => setSuccessCount(0)} className="text-emerald-400 hover:text-emerald-300 text-sm underline">
                  {t('importNotes.importMore')}
              </button>
          </div>
      )}

      {/* Preview Table */}
      {transactions.length > 0 && (
          <div className="space-y-4">
              <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-500"/> {t('importNotes.preview', { count: transactions.length })}
                  </h3>
                  <div className="flex gap-2">
                      <button 
                        onClick={() => setTransactions([])}
                        className="px-4 py-2 text-sm text-gray-400 hover:text-white"
                      >
                          {t('importNotes.cancel')}
                      </button>
                      <button 
                        onClick={handleConfirmImport}
                        disabled={isSaving}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-6 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50"
                      >
                          {isSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Check className="w-4 h-4"/>}
                          {t('importNotes.confirm')}
                      </button>
                  </div>
              </div>

              <div className="bg-[#0B1C17] border border-white/10 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-sm text-gray-400">
                      <thead className="bg-white/5 text-white uppercase text-xs">
                          <tr>
                              <th className="p-4">{t('importNotes.colDate')}</th>
                              <th className="p-4">{t('importNotes.colAsset')}</th>
                              <th className="p-4">{t('importNotes.colOperation')}</th>
                              <th className="p-4 text-right">{t('importNotes.colQuantity')}</th>
                              <th className="p-4 text-right">{t('importNotes.colPrice')}</th>
                              <th className="p-4 text-right">{t('importNotes.colTotal')}</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                          {transactions.map((tx, idx) => (
                              <tr key={idx} className={`hover:bg-white/5 transition-colors ${tx._valid === false ? 'opacity-40' : ''}`}>
                                  <td className="p-4">
                                    <input 
                                      type="checkbox" 
                                      checked={tx._valid !== false}
                                      onChange={() => toggleTransaction(idx)}
                                      className="w-4 h-4 rounded border-white/20 bg-white/5 text-emerald-500"
                                    />
                                  </td>
                                  <td className="p-4">{new Date(tx.date).toLocaleDateString(i18n.language)}</td>
                                  <td className="p-4 font-bold text-white">{tx.ticker}</td>
                                  <td className="p-4">
                                      <span className={`px-2 py-1 rounded text-[10px] font-bold ${tx.type === 'BUY' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                          {tx.type === 'BUY' ? t('importNotes.typeBuy') : t('importNotes.typeSell')}
                                      </span>
                                  </td>
                                  <td className="p-4 text-right">{tx.quantity}</td>
                                  <td className="p-4 text-right">{formatCurrency(tx.price, 'BRL')}</td>
                                  <td className="p-4 text-right font-mono text-white">{formatCurrency(tx.total, 'BRL')}</td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      )}
    </div>
  );
};

export default ImportNotes;
