/**
 * MarketTicker — Carrossel de mercado em tempo real
 * 
 * Componente compartilhado que exibe um ticker animado com
 * dados de indices, cambio, cripto e acoes populares.
 * Usado na LandingPage e no Layout do app interno.
 */

import React from 'react';
import { cn } from '../lib/utils';
import { useMarketTicker, type TickerItem } from '../hooks/useMarketTicker';

interface MarketTickerProps {
  /** Variante visual do ticker */
  variant?: 'landing' | 'app';
}

const TickerItemView: React.FC<{ item: TickerItem }> = ({ item }) => (
  <div className="flex items-center gap-2 px-4 border-r border-white/10 last:border-0">
    <span className="text-[10px] font-black text-gray-400">{item.label}</span>
    <span className="text-xs font-bold text-white tracking-widest">{item.value}</span>
    <span className={cn('text-[10px] font-black', item.up ? 'text-emerald-400' : 'text-rose-500')}>
      {item.change}
    </span>
  </div>
);

export default function MarketTicker({ variant = 'landing' }: MarketTickerProps) {
  const { items } = useMarketTicker();

  const isApp = variant === 'app';

  // Enquanto carrega, mostra placeholders
  const displayItems: TickerItem[] = items.length > 0
    ? items
    : [
        { label: 'IBOVESPA', value: '---', change: '---', up: true, source: 'loading' },
        { label: 'EUR/BRL',  value: '---', change: '---', up: true, source: 'loading' },
        { label: 'USD/BRL',  value: '---', change: '---', up: true, source: 'loading' },
        { label: 'IFIX',     value: '---', change: '---', up: true, source: 'loading' },
        { label: 'BTC/USD',  value: '---', change: '---', up: true, source: 'loading' },
        { label: 'ETH/USD',  value: '---', change: '---', up: true, source: 'loading' },
        { label: 'SOL/USD',  value: '---', change: '---', up: true, source: 'loading' },
        { label: 'BTLG11',   value: '---', change: '---', up: true, source: 'loading' },
        { label: 'HGLG11',   value: '---', change: '---', up: true, source: 'loading' },
        { label: 'PETR4',    value: '---', change: '---', up: true, source: 'loading' },
        { label: 'VALE3',    value: '---', change: '---', up: true, source: 'loading' },
      ];

  return (
    <div className={cn(
      'fixed top-0 left-0 right-0 z-[60] overflow-hidden whitespace-nowrap backdrop-blur-md',
      isApp
        ? 'bg-[#030816]/90 border-b border-white/5 py-1.5'
        : 'bg-emerald-500/10 border-b border-emerald-500/20 py-2'
    )}>
      <div className="flex animate-marquee gap-8 items-center">
        {[...displayItems, ...displayItems].map((item, i) => (
          <TickerItemView key={i} item={item} />
        ))}
      </div>
    </div>
  );
}
