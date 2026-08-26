import React, { useState, useEffect } from 'react';
import { X, Search, Check, Calendar, Loader2, AlertTriangle } from 'lucide-react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { useStore } from '../store/useStore';
import { saveTransaction, ensureUserProfile, upsertAsset, getQuotes, getTransactions } from '../services/database';
import { searchAssets, fetchAssetQuote, fetchCryptoQuote, SearchResult } from '../services/api';
import { formatCurrency, applyTickerAlias } from '../lib/utils';
import { cn } from '../lib/utils';
import { Asset } from '../types';
import { getPlanLimits } from '../services/billing';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface AddInvestmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  preSelectedAssetId?: string;
  prefillType?: 'BUY' | 'SELL';
  prefillQuantity?: number;
  prefillDate?: string;
}

const AddInvestmentModal: React.FC<AddInvestmentModalProps> = ({ isOpen, onClose, preSelectedAssetId, prefillType, prefillQuantity, prefillDate }) => {
  const { getToken } = useAuth();
  const { user } = useUser();
  const { t } = useTranslation();
  const { assets, addTransaction, registerAsset, settings, portfolio, transactions, triggerUpgradeModal } = useStore();
  const navigate = useNavigate();
  const [selectedAssetId, setSelectedAssetId] = useState<string>(preSelectedAssetId || '');
  const [type, setType] = useState<'BUY' | 'SELL'>(prefillType ?? 'BUY');
  const [quantity, setQuantity] = useState<string>(prefillQuantity != null ? String(prefillQuantity) : '');
  const [price, setPrice] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  
  // Search State
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [loadingAssetDetails, setLoadingAssetDetails] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [warning, setWarning] = useState<{ kind: 'plan' | 'sync'; text: string } | null>(null);

  // Debounced Search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (search.length >= 3) {
        setIsSearching(true);
        const results = await searchAssets(search);
        setSearchResults(results);
        setIsSearching(false);
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [search]);

  // Effect to update price when asset changes
  useEffect(() => {
    if (selectedAssetId) {
      const asset = assets.find(a => a.id === selectedAssetId);
      if (asset) {
        setPrice(asset.price.toString());
      }
    }
  }, [selectedAssetId, assets]);

  useEffect(() => {
    if (preSelectedAssetId) setSelectedAssetId(preSelectedAssetId);
  }, [preSelectedAssetId]);

  useEffect(() => {
    if (!isOpen) return;
    setWarning(null);
    if (prefillType) setType(prefillType);
    if (prefillQuantity != null) setQuantity(String(prefillQuantity));
    if (prefillDate) setDate(prefillDate);
  }, [isOpen, prefillType, prefillQuantity, prefillDate]);

  if (!isOpen) return null;

  const selectedAsset = assets.find(a => a.id === selectedAssetId);
  // Saldo líquido (compras - vendas) — mesma contabilidade do inventário da nuvem
  const availableQty = transactions
    .filter(t => t.assetId === selectedAssetId)
    .reduce((acc, t) => acc + (t.type === 'BUY' ? t.quantity : -t.quantity), 0);
  const sanitizeDecimal = (v: string) => {
    const s = v.replace(',', '.');
    return s.replace(/[eE+-]/g, '');
  };
  
  // Combine local filtering with API results
  // If search is empty or short, show local filtering (optional, or just show nothing)
  // Actually, let's prioritize API search but fallback to local matches if query is short?
  // Or better: Show local matches immediately, and API results when they arrive.
  const localMatches = assets.filter(a => 
    a.ticker.toLowerCase().includes(search.toLowerCase()) || 
    a.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelectAsset = async (result: SearchResult) => {
    // Check plan asset limit before registering new asset/position (for BUY flow that will follow)
    const limits = getPlanLimits(settings.plan ?? 'free');
    if (limits.assets !== null) {
      const positions = new Set(portfolio.map(p => p.assetId));
      if (positions.size >= limits.assets) {
        triggerUpgradeModal?.('asset');
        return;
      }
    }
    // 1. Check if we already have it locally
    // For API results, result.ticker might match local ticker
    // For cryptos, result.id (bitcoin) vs ticker (BTC).
    // Our local assets use Ticker as ID usually.
    
    // Normalize ID: For stocks, use ticker. For crypto, use ticker?
    // In our mock data, we use Ticker as ID.
    // Let's stick to Ticker as ID for consistency in MVP.
    const targetId = applyTickerAlias(result.ticker); 
    
    const existing = assets.find(a => a.ticker === targetId);
    
    if (existing) {
      setSelectedAssetId(existing.id);
      setSearch('');
      setSearchResults([]);
      return;
    }

    setLoadingAssetDetails(true);
    try {
      let details: any = null;
      let price: number | null = null;
      let previousClose: number | null = null;

      try {
        const token = await getToken({ template: 'supabase' });
        if (token) {
          const map = await getQuotes([result.ticker], token);
          const p = map[result.ticker];
          if (typeof p === 'number' && p > 0) {
            price = p;
            previousClose = p;
          }
        }
      } catch {
      }

      if (!price) {
        if (result.type === 'crypto' && result.id) {
          details = await fetchCryptoQuote(result.id, result.ticker);
        } else {
          details = await fetchAssetQuote(result.ticker);
        }
        if (details?.price) {
          price = details.price;
          previousClose = details.previousClose || details.price;
        }
      }

      if (price) {
        const newAsset: Asset = {
          id: targetId,
          ticker: targetId,
          name: result.name,
          category: result.type === 'crypto' ? 'Cripto' : (result.type === 'fii' ? 'FII Tijolo' : 'Ações Dividendos'),
          subCategory: result.type === 'crypto' ? 'Altcoins' : (result.type === 'fii' ? 'Papel' : 'Geral'),
          price,
          lastClose: previousClose || price,
          dividendYield: 0,
          lastDividend: 0,
          magicNumber: 100,
          currency: 'BRL',
          logo: result.logo
        };

        registerAsset(newAsset);
        setSelectedAssetId(newAsset.id);
        setSearch('');
        setSearchResults([]);
      } else {
        alert(t('addInvestment.alertNoDetails'));
      }
    } catch (error) {
      console.error('Error selecting asset:', error);
      alert(t('addInvestment.alertError'));
    } finally {
      setLoadingAssetDetails(false);
    }
  };

  // Envia compras locais ainda não persistidas na nuvem e tenta salvar a venda novamente.
  // Resolve inventário dessincronizado sem exigir ação manual do usuário.
  const reconcileInventoryAndSave = async (token: string) => {
    const ticker = selectedAsset?.ticker || selectedAssetId;
    const cloudTxs = await getTransactions(token);
    const localBuys = useStore.getState().transactions
      .filter(l => l.type === 'BUY' && (l.assetId === ticker || l.assetId === selectedAssetId))
      .sort((a, b) => a.date.localeCompare(b.date));
    const missing = localBuys.filter(l => !cloudTxs.some(c =>
      c.type === 'BUY' && c.assetId === ticker && c.date === l.date &&
      Math.abs(c.quantity - l.quantity) < 1e-9 && Math.abs(c.price - l.price) < 1e-6
    ));
    for (const m of missing) {
      await saveTransaction({ assetId: ticker, type: 'BUY', quantity: m.quantity, price: m.price, date: m.date, fees: m.fees ?? 0 }, token);
    }
    await saveTransaction({ assetId: ticker, type, quantity: Number(quantity), price: Number(price), date, fees: 0 }, token);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedAssetId && quantity && price && date) {
      if (type === 'SELL' && Number(quantity) > availableQty + 1e-9) {
        setWarning({ kind: 'sync', text: t('addInvestment.errNoPosition', { qtd: availableQty }) });
        return;
      }
      setIsSubmitting(true);
      try {
        const token = await getToken({ template: 'supabase' });
        
        if (token) {
           // setAuthToken(token); // Deprecated
           // Ensure profile exists before saving
           const profileExists = await ensureUserProfile(token, user?.primaryEmailAddress?.emailAddress);
           if (!profileExists) {
             throw new Error(t('addInvestment.errProfile'));
           }
        }

        // Check limits + atualizar store
        const ok = addTransaction({
          assetId: selectedAssetId,
          type,
          quantity: Number(quantity),
          price: Number(price),
          date,
          fees: 0
        });
        if (!ok) {
          setIsSubmitting(false);
          return;
        }

        if (token) {
           // Save Asset to DB (Upsert) to ensure it exists for other sessions
           // We do this in parallel or before transaction
           const assetToSave = assets.find(a => a.id === selectedAssetId) || selectedAsset;
           if (assetToSave) {
             upsertAsset(assetToSave, token);
           }

           try {
             await saveTransaction({
              assetId: selectedAsset?.ticker || selectedAssetId,
              type,
              quantity: Number(quantity),
              price: Number(price),
              date,
              fees: 0
            }, token);
           } catch (saveErr: any) {
             // Inventário dessincronizado: reconcilia compras locais e tenta de novo
             if (type === 'SELL' && String(saveErr?.message || '').includes('insufficient_inventory')) {
               await reconcileInventoryAndSave(token);
             } else {
               throw saveErr;
             }
           }
        }
        
        setWarning(null);
        onClose();
        // Reset form
        setQuantity('');
        setSearch('');
        setType('BUY');
      } catch (error: any) {
        console.error('Failed to save transaction:', error);
        const rawMessage = error.message || t('addInvestment.errUnknown');

        const isLicenseError =
          rawMessage.includes('license_expired') ||
          rawMessage.includes('license_inactive') ||
          rawMessage.includes('limit_exceeded');

        if (settings.plan === 'elite' && isLicenseError) {
          setWarning(null);
          onClose();
          setQuantity('');
          setSearch('');
          setType('BUY');
        } else {
          let errorMessage = rawMessage;
          let kind: 'plan' | 'sync' = 'sync';
          
          if (rawMessage.includes('No JWT template exists')) {
            errorMessage = t('addInvestment.errClerk');
          } else if (rawMessage.includes('license_expired')) {
            errorMessage = t('addInvestment.errLicenseExpired');
            kind = 'plan';
          } else if (rawMessage.includes('license_inactive')) {
            errorMessage = t('addInvestment.errLicenseInactive');
            kind = 'plan';
          } else if (rawMessage.includes('limit_exceeded')) {
            errorMessage = t('addInvestment.errLimitExceeded');
            kind = 'plan';
          } else if (rawMessage.includes('insufficient_inventory') || rawMessage.includes('inventory_fetch_failed')) {
            errorMessage = t('addInvestment.errInsufficient');
          }

          setWarning({ kind, text: errorMessage });
          if (kind === 'plan') {
            triggerUpgradeModal?.('transaction');
          }
        }
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md glass-card rounded-2xl shadow-2xl overflow-hidden animate-scale-in border-emerald-500/20">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/5 bg-white/5">
          <h2 className="text-xl font-black text-white tracking-tight">{t('addInvestment.title')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {warning && (
          <div className="px-6 pt-4">
            <div className="flex items-start justify-between gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-xs text-amber-50">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-300 mt-0.5" />
                <div>
                  <div className="font-semibold text-amber-200">{warning.kind === 'plan' ? t('addInvestment.planLimitTitle') : t('addInvestment.syncIssueTitle')}</div>
                  <div className="mt-1 text-[11px] text-amber-100/90 whitespace-pre-line">
                    {warning.text}
                  </div>
                </div>
              </div>
              {warning.kind === 'plan' && (
                <button
                  type="button"
                  onClick={() => {
                    navigate('/premium');
                    triggerUpgradeModal?.('transaction');
                  }}
                  className="ml-4 px-3 py-1.5 rounded-full bg-emerald-400 text-black text-[11px] font-semibold hover:bg-emerald-300 whitespace-nowrap"
                >
                  {t('addInvestment.viewPlans')}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {/* Transaction Type Toggle */}
          <div className="grid grid-cols-2 gap-2 bg-black/40 p-1.5 rounded-xl border border-white/5">
            <button
              type="button"
              onClick={() => setType('BUY')}
              className={cn(
                "py-2 rounded-lg text-sm font-bold transition-all",
                type === 'BUY' 
                  ? "bg-emerald-500 text-black shadow-lg" 
                  : "text-gray-400 hover:text-white"
              )}
            >
              {t('addInvestment.buy')}
            </button>
            <button
              type="button"
              onClick={() => setType('SELL')}
              className={cn(
                "py-2 rounded-lg text-sm font-bold transition-all",
                type === 'SELL' 
                  ? "bg-red-500 text-white shadow-lg" 
                  : "text-gray-400 hover:text-white"
              )}
            >
              {t('addInvestment.sell')}
            </button>
          </div>

          {/* Asset Selection */}
          <div className="space-y-2">
            <label className="text-sm text-gray-400 font-medium">{t('addInvestment.assetLabel')}</label>
            {!selectedAsset ? (
              <div className="relative group">
                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-500 group-focus-within:text-emerald-500 transition-colors" />
                <input
                  type="text"
                  placeholder={t('addInvestment.searchPlaceholder')}
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                
                {/* Search Results Dropdown */}
                {search && (
                  <div className="absolute z-10 w-full mt-2 bg-[#0F2922] border border-emerald-500/20 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                    {loadingAssetDetails && (
                       <div className="p-4 text-center text-emerald-500 flex items-center justify-center gap-2">
                         <Loader2 className="w-4 h-4 animate-spin" /> {t('addInvestment.loadingDetails')}
                       </div>
                    )}

                    {!loadingAssetDetails && (
                      <>
                        {/* API Results */}
                        {searchResults.length > 0 && (
                          <div className="p-2">
                             <div className="text-[10px] text-gray-500 uppercase font-bold px-2 mb-1">{t('addInvestment.searchResultsTitle')}</div>
                             {searchResults.map(result => (
                                <button
                                  key={result.id || result.ticker}
                                  type="button"
                                  onClick={() => handleSelectAsset(result)}
                                  className="w-full flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg transition-colors text-left"
                                >
                                  {result.logo ? (
                                    <img src={result.logo} alt="" className="w-6 h-6 rounded-full" />
                                  ) : (
                                    <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold">
                                      {result.ticker.substring(0, 2)}
                                    </div>
                                  )}
                                  <div>
                                    <div className="font-bold text-white text-sm">{result.ticker}</div>
                                    <div className="text-xs text-gray-400 truncate max-w-[200px]">{result.name}</div>
                                  </div>
                                  <span className={cn("ml-auto text-[10px] px-1.5 py-0.5 rounded uppercase font-bold", 
                                    result.type === 'fii' ? 'bg-blue-500/10 text-blue-400' :
                                    result.type === 'fiagro' ? 'bg-green-500/10 text-green-400' :
                                    result.type === 'fiinfra' ? 'bg-cyan-500/10 text-cyan-400' :
                                    result.type === 'fidc' ? 'bg-violet-500/10 text-violet-400' :
                                    result.type === 'fip' ? 'bg-pink-500/10 text-pink-400' :
                                    result.type === 'crypto' ? 'bg-amber-500/10 text-amber-400' :
                                    'bg-white/10 text-gray-400'
                                  )}>
                                    {result.type === 'fii' ? 'FII' : result.type === 'fiagro' ? 'FIAGRO' :
                                     result.type === 'fiinfra' ? 'FI-Infra' : result.type === 'fidc' ? 'FIDC' :
                                     result.type === 'fip' ? 'FIP' : result.type === 'crypto' ? t('addInvestment.typeCrypto') :
                                     result.type === 'stock' ? t('addInvestment.typeStock') : result.type}
                                  </span>
                                </button>
                             ))}
                          </div>
                        )}

                        {/* Local Matches (if any, and not in API results) */}
                        {localMatches.length > 0 && searchResults.length === 0 && !isSearching && (
                           <div className="p-2">
                              <div className="text-[10px] text-gray-500 uppercase font-bold px-2 mb-1">{t('addInvestment.myAssets')}</div>
                              {localMatches.map(asset => (
                                <button
                                  key={asset.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedAssetId(asset.id);
                                    setSearch('');
                                  }}
                                  className="w-full flex items-center justify-between p-2 hover:bg-white/5 rounded-lg transition-colors text-left"
                                >
                                  <div>
                                    <span className="font-bold text-emerald-400 text-sm">{asset.ticker}</span>
                                    <span className="ml-2 text-xs text-gray-400">{asset.name}</span>
                                  </div>
                                </button>
                              ))}
                           </div>
                        )}
                        
                        {/* No Results */}
                        {searchResults.length === 0 && localMatches.length === 0 && !isSearching && search.length >= 3 && (
                          <div className="p-4 text-center text-gray-500 text-sm">
                            {t('addInvestment.noAssetsFound')}
                          </div>
                        )}
                        
                         {isSearching && (
                          <div className="p-4 text-center text-gray-500 text-sm flex items-center justify-center gap-2">
                            <Loader2 className="w-3 h-3 animate-spin" /> {t('addInvestment.searching')}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between p-4 glass-emerald rounded-xl border-emerald-500/20">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-emerald-500 text-black flex items-center justify-center font-black text-xs shadow-lg shadow-emerald-500/20">
                    {selectedAsset.ticker.substring(0, 2)}
                  </div>
                  <div>
                    <div className="font-bold text-white">{selectedAsset.ticker}</div>
                    <div className="text-xs text-gray-400">{selectedAsset.name}</div>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => setSelectedAssetId('')}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-medium px-2 py-1 rounded-md hover:bg-emerald-500/10 transition-colors"
                >
                  {t('addInvestment.change')}
                </button>
              </div>
            )}
          </div>

          {/* Date Input */}
          <div className="space-y-2">
            <label className="text-sm text-gray-400 font-medium">{t('addInvestment.dateLabel')}</label>
            <div className="relative group">
              <Calendar className="absolute left-3 top-3 w-4 h-4 text-gray-500 group-focus-within:text-emerald-500 transition-colors" />
              <input
                type="date"
                required
                className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all [color-scheme:dark]"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          {/* Quantity & Price Inputs */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm text-gray-400 font-medium">{t('addInvestment.quantityLabel')}</label>
              <input
                type="number"
                min="0"
                step="1"
                required
                className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                placeholder="0"
                value={quantity}
                inputMode="decimal"
                pattern="[0-9]*[.,]?[0-9]*"
                onKeyDown={(e) => {
                  if (['e','E','+','-'].includes(e.key)) e.preventDefault();
                }}
                onChange={(e) => setQuantity(sanitizeDecimal(e.target.value))}
              />
              {type === 'SELL' && (
                <p className="text-[10px] text-gray-500 font-bold">{t('addInvestment.sellAvailable', { qtd: Math.max(0, availableQty) })}</p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-400 font-medium">{t('addInvestment.priceLabel')}</label>
              <input
                type="number"
                min="0"
                step="any"
                required
                className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                placeholder="0,00"
                value={price}
                inputMode="decimal"
                onKeyDown={(e) => {
                  if (['e','E','+','-'].includes(e.key)) e.preventDefault();
                }}
                onChange={(e) => setPrice(sanitizeDecimal(e.target.value))}
              />
            </div>
          </div>

          {/* Summary */}
          {quantity && price && (
            <div className={cn(
               "p-4 rounded-xl border flex justify-between items-center",
               type === 'BUY' 
                 ? "bg-emerald-500/5 border-emerald-500/20" 
                 : "bg-red-500/5 border-red-500/20"
            )}>
              <span className="text-sm text-gray-400">{type === 'BUY' ? t('addInvestment.totalBuy') : t('addInvestment.totalSell')}</span>
              <span className={cn(
                "text-lg font-bold",
                type === 'BUY' ? "text-emerald-400" : "text-red-400"
              )}>
                {formatCurrency(Number(quantity) * Number(price), 'BRL')}
              </span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!selectedAssetId || !quantity || !price || !date || isSubmitting}
            className={cn(
              "w-full py-3.5 font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed",
              type === 'BUY'
                ? "bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/20"
                : "bg-red-500 hover:bg-red-400 text-white shadow-red-500/20"
            )}
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
            {type === 'BUY' ? t('addInvestment.confirmBuy') : t('addInvestment.confirmSell')}
          </button>

        </form>
      </div>
    </div>
  );
};

export default AddInvestmentModal;
