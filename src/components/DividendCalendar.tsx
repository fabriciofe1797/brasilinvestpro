import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { formatCurrency, getMonthlyDividendIncome } from '../lib/utils';
import { Calendar as CalendarIcon, TrendingUp, Info } from 'lucide-react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const DividendCalendar: React.FC = () => {
  const { portfolio, assets } = useStore();

  const data = useMemo(() => {
    const totalMonthly = getMonthlyDividendIncome(portfolio, assets);
    return MONTHS.map((month) => ({
      name: month,
      value: totalMonthly,
    }));
  }, [portfolio, assets]);

  const totalAnnual = data.reduce((acc, curr) => acc + curr.value, 0);
  const monthlyAverage = totalAnnual / 12;

  return (
    <div className="bg-[#0B1C17] border border-white/5 rounded-2xl p-6 shadow-lg h-full flex flex-col">
      <div className="flex justify-between items-start mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-emerald-500" />
              Calendário de Proventos
            </h3>
            <div className="relative inline-block group">
              <Info className="w-3 h-3 text-emerald-400 cursor-default" />
              <div className="absolute left-1/2 -translate-x-1/2 mt-2 z-20 hidden group-hover:block">
                <div className="bg-black/80 text-white text-[10px] font-bold px-2 py-1 rounded-md border border-white/10 max-w-xs text-center">
                  Projeção mensal calculada a partir do último dividendo pago por cota
                  em cada ativo da sua carteira, repetido para os próximos 12 meses.
                </div>
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Estimativa para os próximos 12 meses, calculada com base no último dividendo
            registrado na B3 para cada ativo.
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-emerald-400">{formatCurrency(totalAnnual, 'BRL')}</div>
          <div className="text-xs text-gray-500 font-medium">Total Anual Estimado</div>
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#6b7280', fontSize: 10 }} 
              dy={10}
            />
            <Tooltip 
              cursor={{ fill: '#ffffff05' }}
              contentStyle={{ backgroundColor: '#0F2922', borderColor: '#10b98130', borderRadius: '8px', color: '#fff' }}
              itemStyle={{ color: '#34d399' }}
              formatter={(value: number) => [formatCurrency(value, 'BRL'), 'Recebimento']}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.value > monthlyAverage ? '#10b981' : '#059669'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center text-xs">
        <div className="flex items-center gap-2">
           <div className="w-2 h-2 rounded-full bg-emerald-500" />
           <span className="text-gray-400">Média Mensal: <span className="text-white font-medium">{formatCurrency(monthlyAverage, 'BRL')}</span></span>
        </div>
        <Link to="/market" className="text-emerald-500 hover:text-emerald-400 font-medium flex items-center gap-1">
           Ver Detalhes <TrendingUp className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
};

export default DividendCalendar;
