import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { useStore } from '../store/useStore';
import { getTransactions, getAssets, getExchangeRates, getQuotesDetailed, saveTransaction } from '../services/database';
import { getUserData, setUserData } from '../services/userData';
import { fetchLicense } from '../services/license';
import { Asset, QuoteSource, PlanMission, PortfolioAlert, Transaction } from '../types';
import type { Notification } from '../store/useStore';

const ALL_USER_DATA_KEYS = [
  'settings',
  'notifications',
  'missions',
  'alerts',
  'life_expenses',
  'chat_messages',
  'ai_plans',
  'backtest_history',
  'broker_connections',
  'dual_tax_config',
  'alert_read_ids',
];

const AUTO_SAVE_DEBOUNCE_MS = 2000;

export const useDataSync = () => {
  const { getToken, isSignedIn } = useAuth();
  const { user } = useUser();
  const {
    syncTransactions, mergeAssets, setPlan,
    updateExchangeRate, updateAssetsWithQuotes, loadFromSupabase,
    settings, notifications, missions, alerts,
  } = useStore();
  const hardSetTransactions = useStore.getState().setTransactions;
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasSynced, setHasSynced] = useState(false);

  // ─── Auto-save debounce ──────────────────────────────────────
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<{
    settings?: string;
    notifications?: string;
    missions?: string;
    alerts?: string;
  }>({});

  const scheduleAutoSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        const token = await getToken({ template: 'supabase' });
        if (!token) return;

        const items: Array<{ data_key: string; data_value: unknown }> = [];
        const settingsStr = JSON.stringify(settings);
        if (settingsStr !== lastSavedRef.current.settings) {
          items.push({ data_key: 'settings', data_value: settings });
          lastSavedRef.current.settings = settingsStr;
        }
        const notifStr = JSON.stringify(notifications);
        if (notifStr !== lastSavedRef.current.notifications) {
          items.push({ data_key: 'notifications', data_value: notifications });
          lastSavedRef.current.notifications = notifStr;
        }
        const missStr = JSON.stringify(missions);
        if (missStr !== lastSavedRef.current.missions) {
          items.push({ data_key: 'missions', data_value: missions });
          lastSavedRef.current.missions = missStr;
        }
        const alertStr = JSON.stringify(alerts);
        if (alertStr !== lastSavedRef.current.alerts) {
          items.push({ data_key: 'alerts', data_value: alerts });
          lastSavedRef.current.alerts = alertStr;
        }

        if (items.length > 0) {
          await setUserData(token, items);
        }
      } catch {
        // Auto-save falhou — silently ignore, retry on next change
      }
    }, AUTO_SAVE_DEBOUNCE_MS);
  }, [getToken, settings, notifications, missions, alerts]);

  // Trigger auto-save whenever tracked state changes
  useEffect(() => {
    if (hasSynced) {
      scheduleAutoSave();
    }
  }, [settings, notifications, missions, alerts, hasSynced, scheduleAutoSave]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  // ─── Sync ────────────────────────────────────────────────────
  const sync = useCallback(async () => {
    // Prevent concurrent syncs
    if (isSyncing) return;
    if (!isSignedIn || !user) return;
    // Only sync once per session unless forced
    if (hasSynced) return;
    
    setIsSyncing(true);
    
    try {
      const token = await getToken({ template: 'supabase' });
      if (!token) { setIsSyncing(false); return; }

      // ─ Fetch each data source independently ──
      // If one fails, the others still load
      
      let dbTransactions: Transaction[] | null = null;
      try {
        dbTransactions = await getTransactions(token);
      } catch (err) {
        console.error('⚠️ Failed to fetch transactions:', err);
      }

      let dbAssets: any[] | null = null;
      try {
        dbAssets = await getAssets(token);
      } catch (err) {
        console.error('️ Failed to fetch assets:', err);
      }

      let userData: Record<string, unknown> = {};
      try {
        userData = await getUserData(token, ALL_USER_DATA_KEYS);
      } catch (err) {
        console.error('️ Failed to fetch user_data:', err);
      }

      // ── Load user data into store ──
      const loadPayload: {
        settings?: any;
        notifications?: Notification[];
        missions?: PlanMission[];
        alerts?: PortfolioAlert[];
      } = {};
      if (userData.settings) loadPayload.settings = userData.settings as any;
      if (userData.notifications) loadPayload.notifications = userData.notifications as Notification[];
      if (userData.missions) loadPayload.missions = userData.missions as PlanMission[];
      if (userData.alerts) loadPayload.alerts = userData.alerts as PortfolioAlert[];
      if (Object.keys(loadPayload).length > 0) {
        loadFromSupabase(loadPayload);
      }

      // Update lastSavedRef to avoid re-saving just-loaded data
      lastSavedRef.current = {
        settings: JSON.stringify(useStore.getState().settings),
        notifications: JSON.stringify(useStore.getState().notifications),
        missions: JSON.stringify(useStore.getState().missions),
        alerts: JSON.stringify(useStore.getState().alerts),
      };

      // ── License ──
      try {
        const licenseData = await fetchLicense(token);
        if (licenseData?.plan) setPlan(licenseData.plan);
      } catch { /* ignore */ }

      // ── Exchange rates ──
      try {
        const rates = await getExchangeRates(token);
        if (rates?.EUR && rates.EUR > 0) {
          updateExchangeRate(rates.EUR, {
            source: rates.source || 'api',
            updatedAt: rates.updatedAt,
            sourceUpdatedAt: rates.sourceUpdatedAt,
            changePct: rates.changes.EUR ?? undefined,
          });
        }
      } catch { /* ignore */ }

      // ── Assets + Quotes ──
      if (dbAssets && dbAssets.length > 0) {
        const tickers = dbAssets.map((a: any) => a.ticker).filter(Boolean);
        let livePrices: Record<string, number> = {};
        let liveSources: Record<string, string> = {};
        let liveUpdatedAt: Record<string, string> = {};
        
        if (tickers.length > 0) {
          try {
            const { prices, sources, updatedAt } = await getQuotesDetailed(tickers, token);
            livePrices = prices;
            liveSources = sources;
            liveUpdatedAt = updatedAt;
          } catch { /* use db prices if api fails */ }
        }
        
        const mappedAssets: Asset[] = dbAssets.map((a: any): Asset => ({
            id: a.ticker,
            ticker: a.ticker,
            name: a.name,
            category: a.category,
            subCategory: 'Geral',
            price: (livePrices[a.ticker] ?? a.price) ?? 0,
            lastClose: a.last_close ?? (livePrices[a.ticker] ?? a.price) ?? 0,
            dividendYield: a.dividend_yield ?? 0,
            lastDividend: a.last_dividend ?? 0,
            magicNumber: a.magic_number ?? Math.ceil(1200 / Math.max(1, a.dividend_yield ?? 0.01)),
            pvp: a.pvp ?? undefined,
            pl: a.pl ?? undefined,
            currency: a.currency || 'BRL',
            quoteSource: (liveSources[a.ticker] as QuoteSource) || 'mock',
            quoteUpdatedAt: liveUpdatedAt[a.ticker] || null
        }));
        mergeAssets(mappedAssets);
        
        // Update existing assets with live quotes (prices + freshness metadata)
        const quotesForUpdate = tickers
          .filter(t => livePrices[t])
          .map(t => ({
            ticker: t,
            price: livePrices[t],
            source: (liveSources[t] as QuoteSource) || 'mock',
            updatedAt: liveUpdatedAt[t] || new Date().toISOString()
          }));
        
        if (quotesForUpdate.length > 0) {
          updateAssetsWithQuotes(quotesForUpdate);
        }
        
        if (Object.keys(livePrices).length > 0) {
          console.log(`✅ ${Object.keys(livePrices).length} cotacoes atualizadas via BrAPI/CoinGecko`);
        } else {
          console.warn('⚠️ Nenhuma cotacao live obtida — usando precos do banco');
        }
      }

      // ── Transactions ──
      // Merge nuvem + local (nunca sobrescreve registros locais ainda não sincronizados)
      if (dbTransactions) {
        const localTxs = useStore.getState().transactions;
        const sameTx = (a: Transaction, b: Transaction) =>
          a.assetId === b.assetId && a.type === b.type && a.date === b.date &&
          Math.abs(a.quantity - b.quantity) < 1e-9 &&
          // Tolerância relativa: o banco pode devolver preços com deriva de
          // ponto flutuante (ex.: 371319.000002) — sem isso, o merge reenvia
          // a mesma transação e cria duplicatas na nuvem
          Math.abs(a.price - b.price) <= Math.max(0.01, Math.abs(a.price) * 1e-6);
        const localOnly = localTxs.filter(l => !dbTransactions.some(c => sameTx(c, l)));
        const merged = [...dbTransactions, ...localOnly];
        hardSetTransactions(merged);
        syncTransactions(merged);

        // Envia registros locais ausentes na nuvem (cronológico, compras primeiro)
        if (localOnly.length > 0) {
          const sorted = [...localOnly].sort((a, b) => a.date.localeCompare(b.date) || (a.type === 'BUY' ? -1 : 1));
          for (const tx of sorted) {
            try {
              await saveTransaction({ assetId: tx.assetId, type: tx.type, quantity: tx.quantity, price: tx.price, date: tx.date, fees: tx.fees ?? 0 }, token);
            } catch (err) {
              console.warn('⚠️ Falha ao enviar transação local para a nuvem:', tx.assetId, tx.type, err);
            }
          }
        }
      }
      
      // Mark sync as complete only after everything succeeded
      setHasSynced(true);
      
    } catch (err) {
      console.error('Sync error:', err);
      // hasSynced stays false — DataSynchronizer will retry
    } finally {
      setIsSyncing(false);
    }
  }, [isSignedIn, user, getToken, isSyncing, hasSynced, syncTransactions, mergeAssets, setPlan, updateExchangeRate, hardSetTransactions, getQuotesDetailed, updateAssetsWithQuotes, loadFromSupabase]);

  return { sync, isSyncing, hasSynced };
};
