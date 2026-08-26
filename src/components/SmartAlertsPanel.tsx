import React, { useState } from 'react';
import { useAlertEngine } from '../hooks/useAlertEngine';
import { SmartAlertType, AlertSeverity } from '../services/alertEngine';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Info,
  TrendingUp,
  DollarSign,
  Target,
  Calendar,
  X,
  CheckCheck,
  Filter,
  Eye,
  Zap,
} from 'lucide-react';

interface SmartAlertsPanelProps {
  compact?: boolean; // For Dashboard widget mode
  maxItems?: number;
}

const severityConfig: Record<AlertSeverity, { color: string; bgColor: string; borderColor: string; icon: React.ElementType }> = {
  critical: { color: 'text-red-400', bgColor: 'bg-red-500/5', borderColor: 'border-red-500/20', icon: AlertTriangle },
  warning: { color: 'text-amber-400', bgColor: 'bg-amber-500/5', borderColor: 'border-amber-500/20', icon: AlertTriangle },
  info: { color: 'text-blue-400', bgColor: 'bg-blue-500/5', borderColor: 'border-blue-500/20', icon: Info },
  success: { color: 'text-emerald-400', bgColor: 'bg-emerald-500/5', borderColor: 'border-emerald-500/20', icon: CheckCircle2 },
};

const typeIcons: Record<SmartAlertType, React.ElementType> = {
  dividend_upcoming: DollarSign,
  price_target_hit: Target,
  insider_signal: Eye,
  health_score_change: Zap,
  contribution_reminder: Calendar,
  opportunity: TrendingUp,
  sector_rotation: Filter,
  allocation_drift: Filter,
  price_event: TrendingUp,
  exchange_alert: DollarSign,
};

const filterOptions: { id: SmartAlertType | 'all' | 'unread'; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'unread', label: 'Nao Lidos' },
  { id: 'dividend_upcoming', label: 'Dividendos' },
  { id: 'opportunity', label: 'Oportunidades' },
  { id: 'price_target_hit', label: 'Price Target' },
  { id: 'contribution_reminder', label: 'Aportes' },
  { id: 'health_score_change', label: 'Health' },
];

const SmartAlertsPanel: React.FC<SmartAlertsPanelProps> = ({ compact = false, maxItems = 10 }) => {
  const {
    smartAlerts,
    unreadCount,
    markAsRead,
    markAllAsRead,
    dismissAlert,
  } = useAlertEngine();

  const [filter, setFilter] = useState<'all' | 'unread' | SmartAlertType>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredAlerts = smartAlerts
    .filter(a => {
      if (filter === 'all') return true;
      if (filter === 'unread') return !a.read;
      return a.type === filter;
    })
    .slice(0, maxItems);

  if (smartAlerts.length === 0) {
    return (
      <div className="bg-[#0B1C17] border border-white/5 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-emerald-500" />
            <h3 className="text-lg font-bold text-white">Alertas Inteligentes</h3>
          </div>
        </div>
        <div className="p-6 rounded-xl bg-white/[0.01] border border-dashed border-white/10 text-center">
          <Bell className="w-8 h-8 text-gray-600 mx-auto mb-2" />
          <p className="text-xs text-gray-500 font-bold">Nenhum alerta para sua carteira no momento.</p>
          <p className="text-[10px] text-gray-600 mt-1">Adicione ativos para receber alertas personalizados.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0B1C17] border border-white/5 rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-emerald-500" />
          <h3 className="text-lg font-bold text-white">Alertas Inteligentes</h3>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[10px] font-black border border-red-500/30">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Marcar todos como lidos
          </button>
        )}
      </div>

      {/* Filters */}
      {!compact && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {filterOptions.map(opt => {
            const isActive = filter === opt.id;
            const count = opt.id === 'all'
              ? smartAlerts.length
              : opt.id === 'unread'
                ? unreadCount
                : smartAlerts.filter(a => a.type === opt.id).length;

            if (count === 0 && opt.id !== 'all') return null;

            return (
              <button
                key={opt.id}
                onClick={() => setFilter(opt.id)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                  isActive
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-white/5 text-gray-500 border border-transparent hover:text-white hover:bg-white/10'
                }`}
              >
                {opt.label}
                {count > 0 && (
                  <span className="ml-1 opacity-60">({count})</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Alerts List */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto no-scrollbar">
        {filteredAlerts.length === 0 ? (
          <div className="p-4 text-center">
            <p className="text-xs text-gray-500">Nenhum alerta neste filtro.</p>
          </div>
        ) : (
          filteredAlerts.map(alert => {
            const severity = severityConfig[alert.severity];
            const TypeIcon = typeIcons[alert.type] || Bell;
            const SeverityIcon = severity.icon;
            const isExpanded = expandedId === alert.id;

            return (
              <div
                key={alert.id}
                className={`rounded-xl border p-3 transition-all cursor-pointer ${
                  severity.bgColor
                } ${severity.borderColor} ${
                  !alert.read ? 'ring-1 ring-white/5' : 'opacity-70'
                }`}
                onClick={() => {
                  if (!alert.read) markAsRead(alert.id);
                  setExpandedId(isExpanded ? null : alert.id);
                }}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-1.5 rounded-lg ${severity.bgColor} ${severity.color}`}>
                    <TypeIcon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-xs font-bold truncate ${!alert.read ? 'text-white' : 'text-gray-400'}`}>
                        {alert.title}
                      </p>
                      {!alert.read && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-2">
                      {alert.message}
                    </p>

                    {/* Expanded content */}
                    {isExpanded && alert.actionable && (
                      <div className="mt-2 pt-2 border-t border-white/5">
                        <div className="flex items-start gap-2">
                          <SeverityIcon className={`w-3 h-3 mt-0.5 flex-shrink-0 ${severity.color}`} />
                          <p className="text-[10px] text-gray-400 font-medium">
                            <span className={`font-bold ${severity.color}`}>Acao sugerida: </span>
                            {alert.actionable}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      dismissAlert(alert.id);
                    }}
                    className="p-1 rounded-lg hover:bg-white/10 text-gray-600 hover:text-white transition-colors flex-shrink-0"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>

                {/* Ticker badge */}
                {alert.ticker && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-white/5 text-[9px] font-black text-gray-400 uppercase">
                      {alert.ticker}
                    </span>
                    {alert.value !== undefined && (
                      <span className="text-[9px] text-gray-500">
                        {alert.type === 'opportunity' || alert.type === 'price_target_hit'
                          ? `${alert.value >= 0 ? '+' : ''}${alert.value.toFixed(1)}% upside`
                          : `R$ ${alert.value.toFixed(2)}`}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      {smartAlerts.length > maxItems && !compact && (
        <div className="mt-3 pt-3 border-t border-white/5 text-center">
          <p className="text-[10px] text-gray-500">
            Mostrando {maxItems} de {smartAlerts.length} alertas
          </p>
        </div>
      )}
    </div>
  );
};

export default SmartAlertsPanel;
