import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useStore } from '../store/useStore';
import { usePortfolioMetrics } from './usePortfolioMetrics';
import { useContributionStreak } from './useContributionStreak';
import { useHealthScore } from './useHealthScore';
import { getUserData, setUserData } from '../services/userData';
import {
  SmartAlert,
  AlertSeverity,
  SmartAlertType,
  DividendCalendarEntry,
  generateSmartAlerts,
  getDividendCalendar,
} from '../services/alertEngine';

const DATA_KEY = 'alert_read_ids';

interface UseAlertEngineResult {
  smartAlerts: SmartAlert[];
  dividendCalendar: DividendCalendarEntry[];
  unreadCount: number;
  refreshAlerts: () => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  dismissAlert: (id: string) => void;
  getAlertsBySeverity: (severity: AlertSeverity) => SmartAlert[];
  getAlertsByType: (type: SmartAlertType) => SmartAlert[];
}

export const useAlertEngine = (): UseAlertEngineResult => {
  const { portfolio, assets } = useStore();
  const { getToken, isSignedIn } = useAuth();
  const metrics = usePortfolioMetrics();
  const { streak, lastContributionDate } = useContributionStreak();
  const { score: healthScore } = useHealthScore();
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load read IDs from Supabase on mount
  useEffect(() => {
    if (!isSignedIn) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken({ template: 'supabase' });
        if (!token) return;
        const data = await getUserData(token, [DATA_KEY]);
        if (!cancelled && data[DATA_KEY] && Array.isArray(data[DATA_KEY])) {
          setReadIds(new Set(data[DATA_KEY] as string[]));
        }
      } catch { /* start empty */ }
    })();
    return () => { cancelled = true; };
  }, [isSignedIn, getToken]);

  // Debounced save read IDs to Supabase
  const scheduleSave = useCallback((ids: Set<string>) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        const token = await getToken({ template: 'supabase' });
        if (!token) return;
        await setUserData(token, [{ data_key: DATA_KEY, data_value: [...ids] }]);
      } catch { /* ignore */ }
    }, 1000);
  }, [getToken]);

  useEffect(() => {
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, []);

  // Build context for alert generation
  const context = useMemo(() => ({
    portfolio,
    assets,
    totalMarketValue: metrics.totalMarketValue,
    totalInvested: metrics.totalInvested,
    monthlyIncome: metrics.monthlyIncome,
    streak,
    lastContributionDate,
    healthScore,
    categoryBreakdown: metrics.categoryBreakdown.map(c => ({
      category: c.category,
      weight: c.weight,
    })),
  }), [portfolio, assets, metrics, streak, lastContributionDate, healthScore]);

  // Generate alerts
  const generatedAlerts = useMemo(() => {
    return generateSmartAlerts(context);
  }, [context]);

  // Dividend calendar
  const dividendCalendar = useMemo(() => {
    return getDividendCalendar(portfolio, assets);
  }, [portfolio, assets]);

  // Merge with read/dismissed state
  const smartAlerts = useMemo(() => {
    return generatedAlerts
      .filter(a => !dismissedIds.has(a.id))
      .map(a => ({
        ...a,
        read: readIds.has(a.id),
      }));
  }, [generatedAlerts, dismissedIds, readIds]);

  const unreadCount = smartAlerts.filter(a => !a.read).length;

  const refreshAlerts = useCallback(() => {
    // Force re-evaluation by triggering a re-render
    // In a real implementation, this would fetch fresh data
  }, []);

  const markAsRead = useCallback((id: string) => {
    setReadIds(prev => {
      const next = new Set([...prev, id]);
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave]);

  const markAllAsRead = useCallback(() => {
    const allIds = smartAlerts.map(a => a.id);
    setReadIds(prev => {
      const next = new Set([...prev, ...allIds]);
      scheduleSave(next);
      return next;
    });
  }, [smartAlerts, scheduleSave]);

  const dismissAlert = useCallback((id: string) => {
    setDismissedIds(prev => new Set([...prev, id]));
  }, []);

  const getAlertsBySeverity = useCallback(
    (severity: AlertSeverity) => smartAlerts.filter(a => a.severity === severity),
    [smartAlerts]
  );

  const getAlertsByType = useCallback(
    (type: SmartAlertType) => smartAlerts.filter(a => a.type === type),
    [smartAlerts]
  );

  return {
    smartAlerts,
    dividendCalendar,
    unreadCount,
    refreshAlerts,
    markAsRead,
    markAllAsRead,
    dismissAlert,
    getAlertsBySeverity,
    getAlertsByType,
  };
};
