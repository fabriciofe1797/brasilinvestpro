import { create } from 'zustand';
import { Asset, PortfolioItem, UserSettings, Transaction, AllocationTarget, PlanMission, PortfolioAlert, QuoteSource } from '../types';
import { MOCK_ASSETS } from '../data/mockData';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  date: string;
  read: boolean;
}

interface AppState {
  assets: Asset[];
  portfolio: PortfolioItem[];
  transactions: Transaction[];
  settings: UserSettings & { theme: 'dark' | 'light' }; // Extend with theme
  notifications: Notification[];
  missions: PlanMission[];
  alerts: PortfolioAlert[];
  showUpgradeModal?: boolean;
  upgradeContext?: 'asset' | 'transaction' | 'report' | 'contribution';
  
  // Actions
  addTransaction: (transaction: Omit<Transaction, 'id' | 'total'>) => boolean;
  setBaseCurrency: (currency: 'EUR' | 'BRL') => void;
  setLanguage: (language: 'pt-BR' | 'en' | 'es') => void;
  updateExchangeRate: (rate: number, meta?: { source?: string; updatedAt?: string; changePct?: number }) => void;
  updateAllocationTargets: (targets: AllocationTarget[]) => void;
  updateCustodyRate: (rate: number) => void;
  updateSelicCustodyThreshold: (threshold: number) => void;
  updateAssetPrice: (ticker: string, price: number, lastClose?: number) => void;
  updateAssetsWithQuotes: (quotes: { ticker: string; price: number; source: QuoteSource; updatedAt: string }[]) => void;
  setTransactions: (transactions: Transaction[]) => void;
  setPortfolio: (portfolio: PortfolioItem[]) => void;
  syncTransactions: (transactions: Transaction[]) => void;
  registerAsset: (asset: Asset) => void;
  mergeAssets: (newAssets: Asset[]) => void;
  setPlan: (plan: NonNullable<UserSettings['plan']>) => void;
  triggerUpgradeModal: (ctx: AppState['upgradeContext']) => void;
  dismissUpgradeModal: () => void;
  
  // Notifications & Settings
  addNotification: (notification: Omit<Notification, 'id' | 'date' | 'read'>) => void;
  markAllAsRead: () => void;
  toggleTheme: () => void;

  // Missions & Alerts (Fase 2 groundwork)
  setMissions: (missions: PlanMission[]) => void;
  addMission: (mission: PlanMission) => void;
  updateMissionStatus: (id: string, status: PlanMission['status']) => void;
   setAlerts: (alerts: PortfolioAlert[]) => void;
  addAlert: (alert: Omit<PortfolioAlert, 'id' | 'createdAt' | 'read'>) => void;
  markAlertAsRead: (id: string) => void;
  clearAlerts: () => void;

  // Supabase sync helpers
  loadFromSupabase: (data: {
    settings?: Partial<UserSettings & { theme: 'dark' | 'light' }>;
    notifications?: Notification[];
    missions?: PlanMission[];
    alerts?: PortfolioAlert[];
  }) => void;
}

export const useStore = create<AppState>()(
  (set, get) => ({
  assets: MOCK_ASSETS,
  portfolio: [],
  transactions: [],
  notifications: [
    { id: '1', title: 'Bem-vindo ao BrasilInvest Pro', message: 'Explore as novas ferramentas Premium.', type: 'info', date: new Date().toISOString(), read: false }
  ],
  missions: [],
  alerts: [],
  settings: {
    baseCurrency: 'BRL',
    exchangeRate: 6.20, 
    exchangeRateSource: 'fallback',
    exchangeRateUpdatedAt: undefined,
    exchangeRateChangePct: 0,
    monthlyContribution: 1000,
    targetDividend: 500,
    allocationTargets: [],
    plan: 'free',
    language: 'pt-BR',
    custodyRate: 0.002,
    selicCustodyThreshold: 10000,
    theme: 'dark'
  },
  showUpgradeModal: false,
  upgradeContext: undefined,

  addNotification: (n) => set((state) => ({
    notifications: [{ 
      ...n, 
      id: crypto.randomUUID(), 
      date: new Date().toISOString(), 
      read: false 
    }, ...state.notifications]
  })),

  markAllAsRead: () => set((state) => ({
    notifications: state.notifications.map(n => ({ ...n, read: true }))
  })),

  toggleTheme: () => set((state) => ({
    settings: { ...state.settings, theme: state.settings.theme === 'dark' ? 'light' : 'dark' }
  })),

  setMissions: (missions) => set(() => ({ missions })),
  addMission: (mission) => set((state) => ({
    missions: [...state.missions.filter(m => m.id !== mission.id), mission]
  })),
  updateMissionStatus: (id, status) => set((state) => ({
    missions: state.missions.map(m => (m.id === id ? { ...m, status } : m))
  })),
  setAlerts: (alerts) => set(() => ({ alerts })),
  addAlert: (alert) => set((state) => ({
    alerts: [
      {
        ...alert,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        read: false
      },
      ...state.alerts
    ]
  })),
  markAlertAsRead: (id) => set((state) => ({
    alerts: state.alerts.map(a => (a.id === id ? { ...a, read: true } : a))
  })),
  clearAlerts: () => set(() => ({ alerts: [] })),

  setPlan: (plan) => set((state) => {
    const order: NonNullable<UserSettings['plan']>[] = ['free', 'starter', 'pro', 'master', 'elite'];
    const current = (state.settings.plan ?? 'free') as NonNullable<UserSettings['plan']>;
    const currentIdx = order.indexOf(current);
    const nextIdx = order.indexOf(plan as NonNullable<UserSettings['plan']>);
    if (nextIdx === -1) {
      return { settings: { ...state.settings, plan } };
    }
    if (nextIdx > currentIdx) {
      return { settings: { ...state.settings, plan } };
    }
    return state;
  }),
  triggerUpgradeModal: (ctx) => set(() => {
    try {
      const cooldownKey = 'upgrade_modal_last_shown';
      const last = localStorage.getItem(cooldownKey);
      const now = Date.now();
      if (!last || now - Number(last) > 60000) {
        localStorage.setItem(cooldownKey, String(now));
        return { showUpgradeModal: true, upgradeContext: ctx };
      }
    } catch {}
    return { showUpgradeModal: true, upgradeContext: ctx };
  }),
  dismissUpgradeModal: () => set(() => ({ showUpgradeModal: false, upgradeContext: undefined })),

  mergeAssets: (newAssets) =>
    set((state) => {
      const currentIds = new Set(state.assets.map(a => a.id));
      const assetsToAdd = newAssets.filter(a => !currentIds.has(a.id));
      
      if (assetsToAdd.length === 0) return {};
      
      return { assets: [...state.assets, ...assetsToAdd] };
    }),

  registerAsset: (newAsset) =>
    set((state) => {
      const exists = state.assets.some(a => a.id === newAsset.id);
      if (exists) return {};
      // Registro de ativo no catálogo é livre. Limites são aplicados ao criar posição/transação.
      return { assets: [...state.assets, newAsset] };
    }),

  addTransaction: (transactionData) => {
    const state = get();
    const plan = state.settings.plan ?? 'free';
    const txLimits: Record<NonNullable<UserSettings['plan']>, number | null> = {
      free: 20,
      starter: 200,
      pro: 1000,
      master: 1000,
      elite: null,
    };
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    const txUsedMonth = state.transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === month && d.getFullYear() === year;
    }).length;
    const maxTx = txLimits[plan];
    if (transactionData.type !== 'SELL' && maxTx !== null && txUsedMonth >= maxTx) {
      set({
        notifications: [{ id: crypto.randomUUID(), title: 'Limite atingido', message: `Seu plano atual permite até ${maxTx} transações por mês. Faça upgrade para registrar mais.`, type: 'warning', date: new Date().toISOString(), read: false }, ...state.notifications]
      });
      get().triggerUpgradeModal?.('transaction');
      return false;
    }
    // Limite de quantidade de ativos distintos no portfólio (apenas quando cria posição nova via BUY)
    const assetLimits: Record<NonNullable<UserSettings['plan']>, number | null> = {
      free: 3,
      starter: 10,
      pro: 25,
      master: 50,
      elite: null,
    };
    const maxAssets = assetLimits[plan];
    const hasPosition = state.portfolio.some(p => p.assetId === transactionData.assetId);
    if (transactionData.type === 'BUY' && !hasPosition && maxAssets !== null) {
      const currentPositions = state.portfolio.length;
      if (currentPositions >= maxAssets) {
        set({
          notifications: [{ id: crypto.randomUUID(), title: 'Limite de ativos atingido', message: `Seu plano atual permite até ${maxAssets} ativos no portfólio. Faça upgrade para adicionar mais posições.`, type: 'warning', date: new Date().toISOString(), read: false }, ...state.notifications]
        });
        get().triggerUpgradeModal?.('asset');
        return false;
      }
    }
    // Local optimistic update
    const total = (transactionData.price * transactionData.quantity) + transactionData.fees;
    
    // Calculate realized P/L for SELL transactions
    let realizedPnl: number | null = null;
    let costBasis: number | null = null;
    if (transactionData.type === 'SELL') {
      const existingPosition = state.portfolio.find(p => p.assetId === transactionData.assetId);
      if (existingPosition && existingPosition.quantity > 0) {
        // Cost basis = average price * quantity sold
        costBasis = existingPosition.averagePrice * transactionData.quantity;
        // Net proceeds = total sell value minus fees (fees are already added in total, so for sell: net = price*qty - fees)
        const netProceeds = (transactionData.price * transactionData.quantity) - transactionData.fees;
        realizedPnl = netProceeds - costBasis;
      }
    }
    
    const newTransaction: Transaction = {
      ...transactionData,
      id: crypto.randomUUID(),
      total,
      realizedPnl,
      costBasis,
    };
    // Recalculate Portfolio (Core Logic)
    const existingPosition = state.portfolio.find(p => p.assetId === transactionData.assetId);
    let newPortfolio = [...state.portfolio];
    if (transactionData.type === 'BUY') {
      if (existingPosition) {
        const currentTotalValue = existingPosition.quantity * existingPosition.averagePrice;
        const newTotalValue = currentTotalValue + (transactionData.quantity * transactionData.price + transactionData.fees);
        const newQuantity = existingPosition.quantity + transactionData.quantity;
        const newAveragePrice = newTotalValue / newQuantity;
        newPortfolio = state.portfolio.map(p => 
          p.assetId === transactionData.assetId
            ? { ...p, quantity: newQuantity, averagePrice: newAveragePrice }
            : p
        );
      } else {
        const averagePrice = (transactionData.price * transactionData.quantity + transactionData.fees) / transactionData.quantity;
        newPortfolio.push({
          assetId: transactionData.assetId,
          quantity: transactionData.quantity,
          averagePrice,
        });
      }
    } else if (transactionData.type === 'SELL') {
      if (existingPosition) {
        const newQuantity = existingPosition.quantity - transactionData.quantity;
        if (newQuantity <= 0) {
          newPortfolio = state.portfolio.filter(p => p.assetId !== transactionData.assetId);
        } else {
          newPortfolio = state.portfolio.map(p => 
            p.assetId === transactionData.assetId
              ? { ...p, quantity: newQuantity }
              : p
          );
        }
      }
    }

    const cleanedAlerts =
      transactionData.type === 'BUY'
        ? state.alerts.filter(a => a.type !== 'contribution_gap')
        : state.alerts;

    const updatedMissions: PlanMission[] =
      transactionData.type === 'BUY'
        ? state.missions.map(m =>
            m.id === 'monthly-total' && m.status === 'pending'
              ? { ...m, status: 'completed' as const }
              : m
          )
        : state.missions;

    set({
      transactions: [newTransaction, ...state.transactions],
      portfolio: newPortfolio,
      alerts: cleanedAlerts,
      missions: updatedMissions
    });
    return true;
  },

  setBaseCurrency: (currency) =>
    set((state) => ({ settings: { ...state.settings, baseCurrency: currency } })),
  
  setLanguage: (language) => {
    try { localStorage.setItem('app_language', language); } catch { /* ignore */ }
    set((state) => ({ settings: { ...state.settings, language } }));
  },

  updateExchangeRate: (rate, meta) => 
    set((state) => ({
      settings: {
        ...state.settings,
        exchangeRate: rate,
        exchangeRateSource: meta?.source ?? state.settings.exchangeRateSource,
        exchangeRateUpdatedAt: meta?.updatedAt ?? state.settings.exchangeRateUpdatedAt,
        exchangeRateChangePct: meta?.changePct ?? state.settings.exchangeRateChangePct,
      }
    })),

  updateAllocationTargets: (targets) =>
    set((state) => ({ settings: { ...state.settings, allocationTargets: targets } })),

  updateCustodyRate: (rate) =>
    set((state) => ({ settings: { ...state.settings, custodyRate: rate } })),

  updateSelicCustodyThreshold: (threshold) =>
    set((state) => ({ settings: { ...state.settings, selicCustodyThreshold: threshold } })),

  updateAssetPrice: (ticker, price, lastClose) =>
    set((state) => ({
      assets: state.assets.map(asset => 
        asset.ticker === ticker 
          ? { ...asset, price, lastClose: lastClose || asset.lastClose } 
          : asset
      )
    })),

  updateAssetsWithQuotes: (quotes) =>
    set((state) => ({
      assets: state.assets.map(asset => {
        const quote = quotes.find(q => q.ticker === asset.ticker);
        if (!quote) return asset;
        return { 
          ...asset, 
          price: quote.price, 
          lastClose: quote.price,
          quoteSource: quote.source,
          quoteUpdatedAt: quote.updatedAt
        };
      })
    })),

  setTransactions: (transactions) => set({ transactions }),
  setPortfolio: (portfolio) => set({ portfolio }),

  syncTransactions: (transactions) => 
    set(() => {
      console.debug('🔄 Syncing Transactions:', transactions.length);
      // Rebuild Portfolio from scratch based on transaction history
      // 1. Sort transactions by date ascending to ensure correct PM calculation
      const sortedTx = [...transactions].sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      const calculatedPortfolio: PortfolioItem[] = [];
      // Enrich SELL transactions with realized P/L
      const enrichedTx: Transaction[] = [];
      // Contabilidade líquida (igual à da nuvem): vendas sem lastro geram um
      // "déficit" que é abatido das próximas compras — o saldo local fica
      // sempre igual ao saldo real do inventário do backend
      const deficit = new Map<string, number>();

      sortedTx.forEach(tx => {
        const existingIndex = calculatedPortfolio.findIndex(p => p.assetId === tx.assetId);

        if (tx.type === 'BUY') {
          // Abate primeiro o déficit de vendas excedentes passadas deste ativo
          const owed = deficit.get(tx.assetId) || 0;
          const absorbed = Math.min(owed, tx.quantity);
          if (absorbed > 0) deficit.set(tx.assetId, owed - absorbed);
          const remaining = tx.quantity - absorbed;
          if (remaining <= 0) {
            enrichedTx.push(tx);
            return;
          }

          if (existingIndex >= 0) {
            const current = calculatedPortfolio[existingIndex];
            const currentTotalValue = current.quantity * current.averagePrice;
            const txTotalValue = (remaining * tx.price) + tx.fees;
            
            const newQuantity = current.quantity + remaining;
            const newAveragePrice = (currentTotalValue + txTotalValue) / newQuantity;

            calculatedPortfolio[existingIndex] = {
              ...current,
              quantity: newQuantity,
              averagePrice: newAveragePrice
            };
          } else {
             const averagePrice = ((remaining * tx.price) + tx.fees) / remaining;
             calculatedPortfolio.push({
               assetId: tx.assetId,
               quantity: remaining,
               averagePrice
             });
          }
          enrichedTx.push(tx);
        } else if (tx.type === 'SELL') {
          // Calculate realized P/L
          let realizedPnl = tx.realizedPnl ?? null;
          let costBasis = tx.costBasis ?? null;
          const held = existingIndex >= 0 ? calculatedPortfolio[existingIndex].quantity : 0;
          if (existingIndex >= 0) {
            const current = calculatedPortfolio[existingIndex];
            costBasis = current.averagePrice * tx.quantity;
            const netProceeds = (tx.price * tx.quantity) - tx.fees;
            realizedPnl = netProceeds - costBasis;

            const newQuantity = current.quantity - tx.quantity;
            
            if (newQuantity <= 0) {
              calculatedPortfolio.splice(existingIndex, 1);
            } else {
              calculatedPortfolio[existingIndex] = {
                ...current,
                quantity: newQuantity
              };
            }
          }
          // Parte da venda sem lastro local → registra como déficit a abater de compras futuras
          const oversold = tx.quantity - held;
          if (oversold > 0) {
            deficit.set(tx.assetId, (deficit.get(tx.assetId) || 0) + oversold);
          }
          enrichedTx.push({ ...tx, realizedPnl, costBasis });
        }
      });
      
      console.debug('✅ Final Portfolio:', calculatedPortfolio);

      return {
        transactions: enrichedTx,
        portfolio: calculatedPortfolio
      };
    }),

  loadFromSupabase: (data) => set((state) => {
    const updates: Partial<AppState> = {};
    if (data.settings) {
      updates.settings = { ...state.settings, ...data.settings };
    }
    if (data.notifications) {
      updates.notifications = data.notifications;
    }
    if (data.missions) {
      updates.missions = data.missions;
    }
    if (data.alerts) {
      updates.alerts = data.alerts;
    }
    return updates;
  }),
  })
);
