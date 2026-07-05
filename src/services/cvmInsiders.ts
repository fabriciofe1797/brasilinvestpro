// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface InsiderTransaction {
  id: string;
  date: string;
  company: string;
  ticker: string;
  insider: string;
  role: string;
  type: 'buy' | 'sell';
  quantity: number;
  price: number;
  value: number;
  isRelevant: boolean; // >R$1M ou >1% capital
}

export interface InsiderSummary {
  ticker: string;
  company: string;
  totalBuys30d: number;
  totalSells30d: number;
  netPosition: number; // Positive = net buying
  totalVolume30d: number;
  topInsiders: { name: string; role: string; buys: number; sells: number }[];
  lastMovement: string;
  signal: 'bullish' | 'bearish' | 'neutral';
}

// ─── Mock Data Realista ──────────────────────────────────────────────────────

const generateMockInsiderData = (): InsiderTransaction[] => {
  const now = new Date();
  const transactions: InsiderTransaction[] = [];

  const insiderData = [
    // PETR4
    { company: 'Petrobras PN', ticker: 'PETR4', insider: 'Jean Paul Terra Prates', role: 'CEO', movements: [
      { daysAgo: 3, type: 'buy' as const, qty: 50000, price: 38.50 },
      { daysAgo: 15, type: 'buy' as const, qty: 30000, price: 37.80 },
    ]},
    { company: 'Petrobras PN', ticker: 'PETR4', insider: 'Ricardo Pereira de Oliveira', role: 'CFO', movements: [
      { daysAgo: 7, type: 'sell' as const, qty: 15000, price: 39.20 },
    ]},
    // VALE3
    { company: 'Vale ON', ticker: 'VALE3', insider: 'Eduardo Bartolameo', role: 'CEO', movements: [
      { daysAgo: 2, type: 'buy' as const, qty: 100000, price: 62.30 },
      { daysAgo: 10, type: 'buy' as const, qty: 80000, price: 61.50 },
    ]},
    { company: 'Vale ON', ticker: 'VALE3', insider: 'Marcelo Silva Azevedo', role: 'Diretor Financeiro', movements: [
      { daysAgo: 5, type: 'sell' as const, qty: 25000, price: 63.00 },
    ]},
    // ITUB4
    { company: 'Itau Unibanco PN', ticker: 'ITUB4', insider: 'Milton Maluhy Filho', role: 'CEO', movements: [
      { daysAgo: 4, type: 'buy' as const, qty: 200000, price: 34.80 },
    ]},
    { company: 'Itau Unibanco PN', ticker: 'ITUB4', insider: 'Rodrigo Ferreira dos Santos', role: 'CFO', movements: [
      { daysAgo: 12, type: 'sell' as const, qty: 50000, price: 35.20 },
    ]},
    // BBAS3
    { company: 'Banco do Brasil ON', ticker: 'BBAS3', insider: 'Tarcisio Jose de Holanda', role: 'Presidente', movements: [
      { daysAgo: 6, type: 'buy' as const, qty: 75000, price: 28.90 },
      { daysAgo: 20, type: 'buy' as const, qty: 40000, price: 27.50 },
    ]},
    // WEGE3
    { company: 'WEG ON', ticker: 'WEGE3', insider: 'Harry Schmelzer Jr', role: 'Presidente do Conselho', movements: [
      { daysAgo: 8, type: 'buy' as const, qty: 150000, price: 42.10 },
    ]},
    { company: 'WEG ON', ticker: 'WEGE3', insider: 'Dirceu Ramos Reis', role: 'Diretor', movements: [
      { daysAgo: 18, type: 'sell' as const, qty: 20000, price: 43.50 },
    ]},
    // BBDC4
    { company: 'Bradesco PN', ticker: 'BBDC4', insider: 'Octavio de Lazari Junior', role: 'Presidente', movements: [
      { daysAgo: 9, type: 'buy' as const, qty: 300000, price: 15.20 },
    ]},
    // ELET3
    { company: 'Eletrobras PN', ticker: 'ELET3', insider: 'Rodrigo Limp Nascimento', role: 'CEO', movements: [
      { daysAgo: 11, type: 'sell' as const, qty: 40000, price: 42.80 },
    ]},
    // SANB11
    { company: 'Santander Brasil', ticker: 'SANB11', insider: 'Mario L. Leal', role: 'CEO', movements: [
      { daysAgo: 14, type: 'buy' as const, qty: 100000, price: 32.50 },
    ]},
    // TAEE11
    { company: 'Taesa', ticker: 'TAEE11', insider: 'Jose Carlos Miranda', role: 'Diretor', movements: [
      { daysAgo: 1, type: 'buy' as const, qty: 25000, price: 12.80 },
      { daysAgo: 16, type: 'buy' as const, qty: 15000, price: 12.50 },
    ]},
    // TRPL4
    { company: 'Transmissao Paulista', ticker: 'TRPL4', insider: 'Rodrigo Costa Lima', role: 'Diretor', movements: [
      { daysAgo: 13, type: 'buy' as const, qty: 60000, price: 24.30 },
    ]},
    // ABEV3
    { company: 'Ambev SA', ticker: 'ABEV3', insider: 'Joao Castro Neves', role: 'CEO', movements: [
      { daysAgo: 17, type: 'sell' as const, qty: 500000, price: 12.80 },
    ]},
    // MXRF11
    { company: 'Maxi Renda FII', ticker: 'MXRF11', insider: 'Antonio Carlos de Freitas', role: 'Gestor', movements: [
      { daysAgo: 5, type: 'buy' as const, qty: 500000, price: 10.25 },
    ]},
    // HGLG11
    { company: 'CSHG Logistica FII', ticker: 'HGLG11', insider: 'Gustavo Mascarenhas', role: 'Gestor', movements: [
      { daysAgo: 19, type: 'buy' as const, qty: 30000, price: 158.00 },
    ]},
  ];

  for (const data of insiderData) {
    for (const mov of data.movements) {
      const date = new Date(now);
      date.setDate(date.getDate() - mov.daysAgo);
      const value = mov.qty * mov.price;

      transactions.push({
        id: `insider_${data.ticker}_${data.insider}_${mov.daysAgo}`,
        date: date.toISOString().slice(0, 10),
        company: data.company,
        ticker: data.ticker,
        insider: data.insider,
        role: data.role,
        type: mov.type,
        quantity: mov.qty,
        price: mov.price,
        value,
        isRelevant: value >= 1000000, // >R$1M
      });
    }
  }

  return transactions.sort((a, b) => b.date.localeCompare(a.date));
};

// ─── Servico ─────────────────────────────────────────────────────────────────

export const fetchInsiderTransactions = (ticker?: string): InsiderTransaction[] => {
  const all = generateMockInsiderData();
  if (ticker) {
    return all.filter(t => t.ticker.toUpperCase() === ticker.toUpperCase());
  }
  return all;
};

export const getInsiderSummary = (ticker: string): InsiderSummary | null => {
  const transactions = fetchInsiderTransactions(ticker);
  if (transactions.length === 0) return null;

  const company = transactions[0]?.company || ticker;
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recent = transactions.filter(t => new Date(t.date) >= thirtyDaysAgo);
  const buys = recent.filter(t => t.type === 'buy');
  const sells = recent.filter(t => t.type === 'sell');

  const totalBuys30d = buys.reduce((s, t) => s + t.value, 0);
  const totalSells30d = sells.reduce((s, t) => s + t.value, 0);
  const netPosition = totalBuys30d - totalSells30d;

  // Top insiders
  const insiderMap: Record<string, { name: string; role: string; buys: number; sells: number }> = {};
  for (const t of recent) {
    if (!insiderMap[t.insider]) {
      insiderMap[t.insider] = { name: t.insider, role: t.role, buys: 0, sells: 0 };
    }
    if (t.type === 'buy') insiderMap[t.insider].buys += t.value;
    else insiderMap[t.insider].sells += t.value;
  }

  const topInsiders = Object.values(insiderMap).sort((a, b) => (b.buys - b.sells) - (a.buys - a.sells));

  let signal: InsiderSummary['signal'] = 'neutral';
  if (netPosition > 0 && totalBuys30d > totalSells30d * 2) signal = 'bullish';
  else if (netPosition < 0 && totalSells30d > totalBuys30d * 2) signal = 'bearish';

  return {
    ticker: ticker.toUpperCase(),
    company,
    totalBuys30d,
    totalSells30d,
    netPosition,
    totalVolume30d: totalBuys30d + totalSells30d,
    topInsiders,
    lastMovement: recent[0]?.date || '',
    signal,
  };
};

export const detectRelevantMovements = (transactions: InsiderTransaction[]): InsiderTransaction[] => {
  return transactions.filter(t => t.isRelevant);
};

export const getTopSignals = (limit: number = 10): { ticker: string; company: string; signal: 'bullish' | 'bearish' | 'neutral'; netValue: number; movements: number }[] => {
  const all = generateMockInsiderData();
  const tickerMap: Record<string, { company: string; buys: number; sells: number; count: number }> = {};

  for (const t of all) {
    if (!tickerMap[t.ticker]) {
      tickerMap[t.ticker] = { company: t.company, buys: 0, sells: 0, count: 0 };
    }
    tickerMap[t.ticker].count++;
    if (t.type === 'buy') tickerMap[t.ticker].buys += t.value;
    else tickerMap[t.ticker].sells += t.value;
  }

  return Object.entries(tickerMap)
    .map(([ticker, data]) => ({
      ticker,
      company: data.company,
      signal: (data.buys > data.sells * 1.5 ? 'bullish' : data.sells > data.buys * 1.5 ? 'bearish' : 'neutral') as 'bullish' | 'bearish' | 'neutral',
      netValue: data.buys - data.sells,
      movements: data.count,
    }))
    .sort((a, b) => Math.abs(b.netValue) - Math.abs(a.netValue))
    .slice(0, limit);
};
