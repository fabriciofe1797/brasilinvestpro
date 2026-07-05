import { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { formatCurrency, formatPercent } from '../lib/utils';
import { TrendingUp, TrendingDown, DollarSign, Calendar, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '../lib/utils';

interface TimelineEvent {
  date: string;
  type: 'contribution' | 'dividend' | 'exchange' | 'buy' | 'sell';
  label: string;
  value: number;
  valueBRL: number;
  details?: string;
}

const PortfolioTimeline: React.FC = () => {
  const { transactions, assets, settings } = useStore();

  const events = useMemo((): TimelineEvent[] => {
    const eventList: TimelineEvent[] = [];
    const exchangeRate = settings.exchangeRate;

    // Process transactions
    transactions.forEach((tx) => {
      const asset = assets.find(a => a.id === tx.assetId || a.ticker === tx.assetId);
      const valueBRL = tx.type === 'BUY' 
        ? tx.quantity * tx.price + tx.fees 
        : tx.quantity * tx.price - tx.fees;

      eventList.push({
        date: tx.date,
        type: tx.type === 'BUY' ? 'buy' : 'sell',
        label: tx.type === 'BUY' ? 'Aporte' : 'Resgate',
        value: tx.type === 'BUY' ? tx.quantity * tx.price : valueBRL,
        valueBRL: valueBRL,
        details: `${tx.quantity} ${asset?.ticker || tx.assetId}`,
      });
    });

    // Add exchange rate snapshots (simulated from settings changes)
    if (settings.exchangeRateUpdatedAt) {
      eventList.push({
        date: settings.exchangeRateUpdatedAt,
        type: 'exchange',
        label: 'Câmbio Atualizado',
        value: settings.exchangeRate,
        valueBRL: settings.exchangeRate,
        details: `Fonte: ${settings.exchangeRateSource || 'API'}`,
      });
    }

    // Sort by date descending
    eventList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return eventList;
  }, [transactions, assets, settings]);

  // Prepare chart data
  const chartData = useMemo(() => {
    if (events.length === 0) return [];

    const sortedEvents = [...events].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    let cumulative = 0;
    return sortedEvents.map((event) => {
      cumulative += event.valueBRL;
      return {
        date: new Date(event.date).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: 'short',
        }),
        value: cumulative,
        rawValue: event.valueBRL,
      };
    });
  }, [events]);

  const totalInvested = useMemo(() => {
    return events
      .filter(e => e.type === 'buy')
      .reduce((acc, e) => acc + e.valueBRL, 0);
  }, [events]);

  const totalReturns = useMemo(() => {
    return events
      .filter(e => e.type === 'sell')
      .reduce((acc, e) => acc + e.valueBRL, 0);
  }, [events]);

  if (events.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-8 border border-white/5">
        <div className="text-center text-gray-500">
          <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-sm font-medium">Nenhum evento registado.</p>
          <p className="text-xs mt-2">Os eventos aparecem aqui após operar.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white/5 rounded-xl p-4 border border-white/5">
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
            <ArrowUpRight className="w-3 h-3 text-emerald-400" />
            Total Aportado
          </div>
          <div className="text-xl font-bold text-white">
            {formatCurrency(totalInvested, 'BRL')}
          </div>
        </div>
        <div className="bg-white/5 rounded-xl p-4 border border-white/5">
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
            <ArrowDownRight className="w-3 h-3 text-red-400" />
            Total Resgatado
          </div>
          <div className="text-xl font-bold text-white">
            {formatCurrency(totalReturns, 'BRL')}
          </div>
        </div>
        <div className="bg-white/5 rounded-xl p-4 border border-white/5">
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
            <DollarSign className="w-3 h-3 text-blue-400" />
            Patrimônio Líquido
          </div>
          <div className="text-xl font-bold text-emerald-400">
            {formatCurrency(totalInvested - totalReturns, 'BRL')}
          </div>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 1 && (
        <div className="glass-card rounded-2xl p-6 border border-white/5">
          <h3 className="text-sm font-bold text-white mb-4">Evolução do Patrimônio</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#6b7280', fontSize: 10 }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#6b7280', fontSize: 10 }}
                  tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0B1C17',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                  }}
                  labelStyle={{ color: '#9ca3af', fontSize: 12 }}
                  formatter={(value: number) => [formatCurrency(value, 'BRL'), 'Patrimônio']}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#colorValue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Events List */}
      <div className="glass-card rounded-2xl p-6 border border-white/5">
        <h3 className="text-sm font-bold text-white mb-4">Eventos Recentes</h3>
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {events.slice(0, 20).map((event, idx) => (
            <div 
              key={idx} 
              className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5"
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center",
                  event.type === 'buy' ? "bg-emerald-500/20" :
                  event.type === 'sell' ? "bg-red-500/20" :
                  event.type === 'exchange' ? "bg-blue-500/20" :
                  "bg-amber-500/20"
                )}>
                  {event.type === 'buy' ? <ArrowUpRight className="w-4 h-4 text-emerald-400" /> :
                  event.type === 'sell' ? <ArrowDownRight className="w-4 h-4 text-red-400" /> :
                  event.type === 'exchange' ? <TrendingUp className="w-4 h-4 text-blue-400" /> :
                  <DollarSign className="w-4 h-4 text-amber-400" />}
                </div>
                <div>
                  <div className="text-sm font-medium text-white">{event.label}</div>
                  <div className="text-xs text-gray-500">{event.details}</div>
                </div>
              </div>
              <div className="text-right">
                <div className={cn(
                  "text-sm font-bold",
                  event.type === 'sell' ? "text-red-400" : "text-white"
                )}>
                  {event.type === 'sell' ? '-' : ''}{formatCurrency(event.valueBRL, 'BRL')}
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(event.date).toLocaleDateString('pt-BR')}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PortfolioTimeline;