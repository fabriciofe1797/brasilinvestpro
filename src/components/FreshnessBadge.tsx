/**
 * FreshnessBadge — Indicador visual de confiança dos dados
 * 
 * Mostra fonte, horário de atualização e status (live/delayed/stale).
 */

import React from 'react';
import { Clock, Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { 
  getFreshnessStatus, getFreshnessColor, getFreshnessLabel,
  getSourceLabel, getSourceColor, formatLastUpdated,
  getConfidenceColor, getConfidenceLabel,
} from '../services/dataPipeline';
import type { FreshnessStatus, QuoteSource } from '../types';

interface FreshnessBadgeProps {
  source: QuoteSource;
  lastUpdatedAt: string | null;
  compact?: boolean;
}

export default function FreshnessBadge({ source, lastUpdatedAt, compact = false }: FreshnessBadgeProps) {
  const status = getFreshnessStatus(lastUpdatedAt);
  const freshnessColor = getFreshnessColor(status);
  const sourceColor = getSourceColor(source);
  const sourceLabel = getSourceLabel(source);
  const freshnessLabel = getFreshnessLabel(status);
  const timeLabel = formatLastUpdated(lastUpdatedAt);

  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        <div className={`w-1.5 h-1.5 rounded-full ${
          status === 'live' ? 'bg-emerald-400 animate-pulse' :
          status === 'delayed' ? 'bg-amber-400' :
          status === 'stale' ? 'bg-orange-400' : 'bg-red-400'
        }`} />
        <span className={`text-[10px] font-bold ${freshnessColor}`}>{timeLabel}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Source Badge */}
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${sourceColor}`}>
        {sourceLabel}
      </span>

      {/* Freshness Badge */}
      <div className={`flex items-center gap-1 text-[10px] font-bold ${freshnessColor}`}>
        {status === 'live' ? <Wifi className="w-3 h-3" /> :
         status === 'unavailable' ? <WifiOff className="w-3 h-3" /> :
         <Clock className="w-3 h-3" />}
        <span>{freshnessLabel}</span>
      </div>

      {/* Time */}
      <span className="text-[10px] text-gray-500">{timeLabel}</span>
    </div>
  );
}

/**
 * DataConfidenceBar — Barra de confiança visual para cards
 */
export function DataConfidenceBar({ source, lastUpdatedAt }: { source: QuoteSource; lastUpdatedAt: string | null }) {
  const status = getFreshnessStatus(lastUpdatedAt);
  const confidence = status === 'live' ? 'high' : status === 'delayed' ? 'medium' : 'low';
  const color = getConfidenceColor(confidence);
  const label = getConfidenceLabel(confidence);
  const width = confidence === 'high' ? '100%' : confidence === 'medium' ? '60%' : '30%';

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className={`text-[10px] font-bold ${color}`}>{label}</span>
        <FreshnessBadge source={source} lastUpdatedAt={lastUpdatedAt} compact />
      </div>
      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            confidence === 'high' ? 'bg-emerald-400' :
            confidence === 'medium' ? 'bg-amber-400' : 'bg-red-400'
          }`}
          style={{ width }}
        />
      </div>
    </div>
  );
}
