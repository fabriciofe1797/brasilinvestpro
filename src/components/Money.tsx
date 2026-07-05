import React from 'react';
import { useStore } from '../store/useStore';
import { formatCurrency } from '../lib/utils';

interface MoneyProps {
  value: number;
  className?: string;
  prefix?: string;
}

export const Money: React.FC<MoneyProps> = ({ value, className, prefix }) => {
  const { settings } = useStore();
  
  // Simple conversion logic (Mock)
  // In real app, we would use real-time rates
  const convertedValue = settings.baseCurrency === 'EUR' 
    ? value / settings.exchangeRate 
    : value;

  const formatted = formatCurrency(convertedValue, settings.baseCurrency);

  return (
    <span className={className}>
      {prefix}{formatted}
    </span>
  );
};
