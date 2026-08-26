import { Link } from 'react-router-dom';
import { Asset, MarketQuote, QuoteSource } from '../types';
import { formatCurrency, formatPercent, getMagicNumber, getMagicStatus } from '../lib/utils';
import { calculateClassicCeiling } from '../lib/formulas';
import { useStore } from '../store/useStore';
import { Info, TrendingUp, TrendingDown, Target } from 'lucide-react';
import FreshnessBadge from './FreshnessBadge';
import { useTranslation } from 'react-i18next';

interface AssetCardProps {
  asset: Asset;
  onClick?: () => void;
  quote?: MarketQuote;
  // Legacy props (backward compatibility)
  source?: string;
  updatedAt?: string;
}

const AssetCard: React.FC<AssetCardProps> = ({ asset, onClick, quote, source, updatedAt }) => {
  const { portfolio, settings } = useStore();
  const { t } = useTranslation();
  
  // Find user's position for this asset
  const userPosition = portfolio.find(p => p.assetId === asset.id);
  const ownedQuantity = userPosition ? userPosition.quantity : 0;
  
  const magicNumber = getMagicNumber(asset.dividendYield, asset.magicNumber);
  const magic = getMagicStatus(ownedQuantity, magicNumber);
  
  // Financials
  const investedBRL = ownedQuantity * asset.price;
  const investedEUR = investedBRL / settings.exchangeRate;

  // Monthly Income Estimate
  // (Price * (DY/100)) / 12 * Quantity
  const annualIncomePerShare = asset.price * (asset.dividendYield / 100);
  const monthlyIncomePerShare = annualIncomePerShare / 12;
  const monthlyIncomeBRL = ownedQuantity * monthlyIncomePerShare;
  const monthlyIncomeEUR = monthlyIncomeBRL / settings.exchangeRate;

  // Financials to Goal
  const costToGoalBRL = magic.remaining * asset.price;
  const costToGoalEUR = costToGoalBRL / settings.exchangeRate;

  // Design helpers
  const isFairPrice = asset.pvp ? asset.pvp <= 1.05 : asset.pl ? asset.pl < 15 : true;
  const priceChange = ((asset.price - asset.lastClose) / asset.lastClose * 100);
  
  // Ceiling Price upside
  const annualDivPerShare = asset.price * (asset.dividendYield / 100);
  const classicCeiling = calculateClassicCeiling(annualDivPerShare);
  const ceilingUpside = classicCeiling ? ((classicCeiling - asset.price) / asset.price) * 100 : 0;
  const hasCeilingData = classicCeiling !== null && asset.dividendYield > 0;

  // Resolve freshness data from quote or legacy props or asset metadata
  const quoteSource: QuoteSource = quote?.source || (source?.toLowerCase() as QuoteSource) || asset.quoteSource || 'mock';
  const quoteUpdatedAt: string | null = quote?.lastUpdatedAt || updatedAt || asset.quoteUpdatedAt || null;

  return (
    <Link 
      to={`/assets/${asset.id}`}
      onClick={(e) => {
        if (onClick) {
          e.preventDefault();
          onClick();
        }
      }}
      className="glass-card rounded-[1.75rem] p-6 border-white/5 hover:border-emerald-500/30 transition-all cursor-pointer group relative overflow-hidden shadow-2xl block h-full card-border-glow"
    >
      <div className="premium-glow-1 opacity-20" />

      {/* Header Section */}
      <div className="flex justify-between items-start mb-6 relative z-10">
        <div>
          <h3 className="font-black text-2xl text-white tracking-tighter group-hover:text-emerald-400 transition-colors">
            {asset.ticker}
          </h3>
          <div className="mt-0.5 flex flex-wrap items-center gap-2">
            <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">
              {asset.name}
            </p>
            {source && (
              <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-emerald-300">
                {source}
              </span>
            )}
            <FreshnessBadge source={quoteSource} lastUpdatedAt={quoteUpdatedAt} compact />
          </div>
        </div>
        <div className="text-right">
          <div className="font-black text-xl text-white tracking-tighter">
            {formatCurrency(asset.price, asset.currency)}
          </div>
          <div className={`text-[10px] font-black uppercase tracking-widest flex items-center justify-end gap-1 mt-1 ${priceChange >= 0 ? 'text-emerald-400' : 'text-red-500'}`}>
            {priceChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 mb-6 relative z-10">
        <div className="bg-white/[0.03] rounded-2xl p-4 border border-white/5 text-center group-hover:bg-emerald-500/5 transition-colors">
          <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-2">DY (12M)</span>
          <span className="font-black text-emerald-400 text-lg tracking-tighter">
            {formatPercent(asset.dividendYield)}
          </span>
        </div>
        <div className="bg-white/[0.03] rounded-2xl p-4 border border-white/5 text-center group-hover:bg-emerald-500/5 transition-colors">
          <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-2">
            {asset.pvp ? 'P/VP' : 'P/L'}
          </span>
          <span className={`font-black text-lg tracking-tighter ${isFairPrice ? 'text-emerald-400' : 'text-amber-500'}`}>
            {asset.pvp?.toFixed(2) || asset.pl?.toFixed(1)}
          </span>
        </div>
      </div>

      {/* Ceiling Price Badge */}
      {hasCeilingData && (
        <div className="flex items-center justify-between px-4 py-2 mb-4 rounded-xl bg-white/[0.02] border border-white/5 relative z-10">
          <div className="flex items-center gap-1.5">
            <Target className="w-3 h-3 text-emerald-500" />
            <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{t('assetCard.ceilingPrice')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-gray-400">{formatCurrency(classicCeiling!, asset.currency)}</span>
            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${ceilingUpside > 0 ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'}`}>
              {ceilingUpside > 0 ? '+' : ''}{ceilingUpside.toFixed(0)}%
            </span>
          </div>
        </div>
      )}

      {/* Financial Summary (if owned) */}
      {ownedQuantity > 0 && (
         <div className="grid grid-cols-2 gap-6 py-4 border-t border-white/5 relative z-10">
           <div>
             <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest block mb-1">{t('assetCard.totalInvested')}</span>
             <div className="text-white font-black text-sm tracking-tight">{formatCurrency(investedBRL, 'BRL')}</div>
             <div className="text-emerald-500 text-[10px] font-bold">~ {formatCurrency(investedEUR, 'EUR')}</div>
           </div>
           
           <div className="text-right">
             <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest block mb-1">{t('assetCard.estMonthlyIncome')}</span>
             <div className="text-emerald-400 font-black text-sm tracking-tight">+ {formatCurrency(monthlyIncomeBRL, 'BRL')}</div>
             <div className="text-emerald-700 text-[10px] font-bold">~ {formatCurrency(monthlyIncomeEUR, 'EUR')}</div>
           </div>
         </div>
      )}

      {/* Magic Number Progress */}
      <div className="pt-4 border-t border-white/5 relative z-10">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">{t('assetCard.snowballIndex')}</span>
            <div className="relative inline-block group">
              <Info className="w-3 h-3 text-emerald-400/50 cursor-help" />
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-3 z-30 hidden group-hover:block transition-all">
                <div className="glass-card text-white text-[10px] font-black uppercase tracking-tight px-3 py-2 rounded-xl border border-emerald-500/20 w-48 text-center shadow-2xl">
                   {t('assetCard.snowballHint')}
                </div>
              </div>
            </div>
          </div>
          <div className="text-right font-black">
             <span className="text-white text-base">{ownedQuantity}</span>
             <span className="text-gray-600 text-[10px] ml-1">/ {magicNumber || '?'}</span>
          </div>
        </div>
        
        {/* Neon Progress Bar */}
        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden p-[1px]">
          <div 
            className="h-full bg-gradient-to-r from-emerald-600 to-blue-500 rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(16,185,129,0.3)]" 
            style={{ width: `${magic.progress}%` }} 
          />
        </div>

        <div className="mt-3 flex justify-between items-center">
           <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest">
              {magic.remaining > 0 ? t('assetCard.sharesRemaining', { qtd: magic.remaining }) : t('assetCard.goalIntegrated')}
           </p>
           {magic.remaining > 0 && magicNumber > 0 && (
              <span className="text-[9px] font-black text-white px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 uppercase tracking-widest">
                 ~ {formatCurrency(costToGoalEUR, 'EUR')} {t('assetCard.neededSuffix')}
              </span>
           )}
        </div>
        <div className="mt-2">
          <FreshnessBadge source={quoteSource} lastUpdatedAt={quoteUpdatedAt} />
        </div>
      </div>
    </Link>
  );
};

export default AssetCard;
