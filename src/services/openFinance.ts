// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface BrokerConnection {
  id: string;
  broker: string;
  status: 'connected' | 'syncing' | 'error' | 'disconnected';
  connectedAt: string;
  lastSync: string | null;
  positionsCount: number;
}

export interface OpenFinancePosition {
  id: string;
  ticker: string;
  company: string;
  quantity: number;
  avgPrice: number;
  currentValue: number;
  broker: string;
  type: 'stocks' | 'fii' | 'etf' | 'bonds' | 'crypto';
  sector: string;
}

export interface BrokerInfo {
  id: string;
  name: string;
  logo: string; // emoji placeholder
  color: string;
  supported: boolean;
}

export interface SyncHistory {
  id: string;
  connectionId: string;
  broker: string;
  date: string;
  status: 'success' | 'error' | 'partial';
  positionsImported: number;
  transactionsImported: number;
}

// ─── Corretoras Suportadas ───────────────────────────────────────────────────

export const getSupportedBrokers = (): BrokerInfo[] => [
  { id: 'xp', name: 'XP Investimentos', logo: '🏦', color: 'from-green-500 to-green-700', supported: true },
  { id: 'btg', name: 'BTG Pactual', logo: '🏛️', color: 'from-blue-600 to-blue-800', supported: true },
  { id: 'itau', name: 'Itaú Corretora', logo: '🔷', color: 'from-orange-500 to-orange-700', supported: true },
  { id: 'rico', name: 'Rico', logo: '🟢', color: 'from-green-400 to-green-600', supported: true },
  { id: 'clear', name: 'Clear', logo: '🔴', color: 'from-red-500 to-red-700', supported: true },
  { id: 'nuinvest', name: 'NuInvest', logo: '🟣', color: 'from-purple-500 to-purple-700', supported: true },
];

// ─── Mock Data ───────────────────────────────────────────────────────────────

const generateMockPositions = (broker: string): OpenFinancePosition[] => {
  const positionsByBroker: Record<string, OpenFinancePosition[]> = {
    xp: [
      { id: 'xp1', ticker: 'PETR4', company: 'Petrobras PN', quantity: 500, avgPrice: 37.20, currentValue: 19450, broker: 'XP', type: 'stocks', sector: 'Energia' },
      { id: 'xp2', ticker: 'VALE3', company: 'Vale ON', quantity: 300, avgPrice: 61.80, currentValue: 18540, broker: 'XP', type: 'stocks', sector: 'Mineração' },
      { id: 'xp3', ticker: 'ITUB4', company: 'Itaú Unibanco PN', quantity: 1000, avgPrice: 33.50, currentValue: 34800, broker: 'XP', type: 'stocks', sector: 'Financeiro' },
      { id: 'xp4', ticker: 'MXRF11', company: 'Maxi Renda FII', quantity: 2000, avgPrice: 10.15, currentValue: 20600, broker: 'XP', type: 'fii', sector: 'Papel' },
      { id: 'xp5', ticker: 'BOVA11', company: 'iShares Ibovespa', quantity: 150, avgPrice: 128.40, currentValue: 19260, broker: 'XP', type: 'etf', sector: 'Index' },
    ],
    btg: [
      { id: 'btg1', ticker: 'BBAS3', company: 'Banco do Brasil ON', quantity: 800, avgPrice: 27.90, currentValue: 23120, broker: 'BTG', type: 'stocks', sector: 'Financeiro' },
      { id: 'btg2', ticker: 'WEGE3', company: 'WEG ON', quantity: 400, avgPrice: 41.50, currentValue: 16840, broker: 'BTG', type: 'stocks', sector: 'Industrial' },
      { id: 'btg3', ticker: 'HGLG11', company: 'CSHG Logística FII', quantity: 100, avgPrice: 155.00, currentValue: 15800, broker: 'BTG', type: 'fii', sector: 'Logística' },
    ],
    itau: [
      { id: 'itau1', ticker: 'SANB11', company: 'Santander Brasil', quantity: 600, avgPrice: 31.80, currentValue: 19680, broker: 'Itaú', type: 'stocks', sector: 'Financeiro' },
      { id: 'itau2', ticker: 'TAEE11', company: 'Taesa', quantity: 1500, avgPrice: 12.40, currentValue: 18750, broker: 'Itaú', type: 'stocks', sector: 'Utilidade' },
      { id: 'itau3', ticker: 'KNRI11', company: 'Kinea Renda Imobiliária', quantity: 80, avgPrice: 142.00, currentValue: 11520, broker: 'Itaú', type: 'fii', sector: 'Misto' },
    ],
    rico: [
      { id: 'rico1', ticker: 'ABEV3', company: 'Ambev SA', quantity: 2000, avgPrice: 12.50, currentValue: 25600, broker: 'Rico', type: 'stocks', sector: 'Consumo' },
      { id: 'rico2', ticker: 'TRPL4', company: 'Transmissão Paulista', quantity: 500, avgPrice: 23.80, currentValue: 12250, broker: 'Rico', type: 'stocks', sector: 'Utilidade' },
    ],
    clear: [
      { id: 'clear1', ticker: 'ELET3', company: 'Eletrobras PN', quantity: 700, avgPrice: 41.20, currentValue: 29750, broker: 'Clear', type: 'stocks', sector: 'Energia' },
      { id: 'clear2', ticker: 'BBDC4', company: 'Bradesco PN', quantity: 1200, avgPrice: 14.80, currentValue: 18360, broker: 'Clear', type: 'stocks', sector: 'Financeiro' },
    ],
    nuinvest: [
      { id: 'nu1', ticker: 'MGLU3', company: 'Magazine Luiza ON', quantity: 3000, avgPrice: 2.15, currentValue: 6900, broker: 'NuInvest', type: 'stocks', sector: 'Varejo' },
      { id: 'nu2', ticker: 'FIIB11', company: 'FII Base Imobiliária', quantity: 500, avgPrice: 9.80, currentValue: 5100, broker: 'NuInvest', type: 'fii', sector: 'Tijolo' },
    ],
  };

  return positionsByBroker[broker] || [];
};

const generateMockSyncHistory = (): SyncHistory[] => {
  const now = new Date();
  const history: SyncHistory[] = [];

  const entries = [
    { daysAgo: 0, broker: 'XP', status: 'success' as const, positions: 5, transactions: 3 },
    { daysAgo: 1, broker: 'BTG', status: 'success' as const, positions: 3, transactions: 1 },
    { daysAgo: 3, broker: 'XP', status: 'success' as const, positions: 5, transactions: 0 },
    { daysAgo: 5, broker: 'Itaú', status: 'partial' as const, positions: 2, transactions: 2 },
    { daysAgo: 7, broker: 'BTG', status: 'success' as const, positions: 3, transactions: 1 },
    { daysAgo: 10, broker: 'XP', status: 'success' as const, positions: 4, transactions: 5 },
    { daysAgo: 14, broker: 'Rico', status: 'error' as const, positions: 0, transactions: 0 },
    { daysAgo: 15, broker: 'Rico', status: 'success' as const, positions: 2, transactions: 0 },
  ];

  for (const entry of entries) {
    const date = new Date(now);
    date.setDate(date.getDate() - entry.daysAgo);
    history.push({
      id: `sync_${entry.daysAgo}_${entry.broker}`,
      connectionId: entry.broker.toLowerCase(),
      broker: entry.broker,
      date: date.toISOString(),
      status: entry.status,
      positionsImported: entry.positions,
      transactionsImported: entry.transactions,
    });
  }

  return history.sort((a, b) => b.date.localeCompare(a.date));
};

// ─── Serviço ─────────────────────────────────────────────────────────────────

export const initiateConnection = async (brokerId: string): Promise<{ success: boolean; connectionId: string }> => {
  // Simula fluxo OAuth com delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  const broker = getSupportedBrokers().find(b => b.id === brokerId);
  if (!broker) throw new Error('Corretora não suportada');

  return {
    success: true,
    connectionId: `conn_${brokerId}_${Date.now()}`,
  };
};

export const syncPositions = async (connectionId: string): Promise<OpenFinancePosition[]> => {
  // Simula sincronização com delay
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Extrai brokerId do connectionId
  const brokerId = connectionId.split('_')[1] || 'xp';
  return generateMockPositions(brokerId);
};

export const mapBrokerPositionsToTransactions = (positions: OpenFinancePosition[]) => {
  // Converte posições em formato compatível com transações do store
  return positions.map(p => ({
    id: `of_${p.id}_${Date.now()}`,
    date: new Date().toISOString().slice(0, 10),
    ticker: p.ticker,
    type: 'buy' as const,
    quantity: p.quantity,
    price: p.avgPrice,
    value: p.avgPrice * p.quantity,
    broker: p.broker,
    source: 'open_finance' as const,
  }));
};

export const getSyncHistory = (): SyncHistory[] => {
  return generateMockSyncHistory();
};

export const getPositionsForBroker = (brokerId: string): OpenFinancePosition[] => {
  return generateMockPositions(brokerId);
};

// ─── Conexoes Supabase ───────────────────────────────────────────────

import { getUserData, setUserData } from './userData';

const DATA_KEY = 'broker_connections';

export const getInitialConnections = async (token: string): Promise<BrokerConnection[]> => {
  try {
    const data = await getUserData(token, [DATA_KEY]);
    if (data[DATA_KEY] && Array.isArray(data[DATA_KEY])) {
      return data[DATA_KEY] as BrokerConnection[];
    }
  } catch { /* ignore */ }
  return [];
};

export const saveConnections = async (token: string, connections: BrokerConnection[]): Promise<void> => {
  try {
    await setUserData(token, [{ data_key: DATA_KEY, data_value: connections }]);
  } catch { /* ignore */ }
};
