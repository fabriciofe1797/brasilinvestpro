import React from 'react';
import { useHealthScore } from '../hooks/useHealthScore';
import { Activity, AlertTriangle, CheckCircle2, TrendingUp, PieChart } from 'lucide-react';

const HealthScoreWidget: React.FC = () => {
  const { score, diversification, yield: yieldScore, valuation, discipline, label, color, recommendations } = useHealthScore();

  const circumference = 2 * Math.PI * 54; // r=54
  const dashOffset = circumference - (circumference * score) / 100;

  const pillars = [
    { name: 'Diversificacao', value: diversification, icon: PieChart, color: '#3b82f6' },
    { name: 'Rendimento', value: yieldScore, icon: TrendingUp, color: '#10b981' },
    { name: 'Valuation', value: valuation, icon: Activity, color: '#8b5cf6' },
    { name: 'Disciplina', value: discipline, icon: CheckCircle2, color: '#f59e0b' },
  ];

  return (
    <div className="bg-[#0B1C17] border border-white/5 rounded-2xl p-6 shadow-lg h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-emerald-500" />
          <h3 className="text-lg font-bold text-white">Health Score</h3>
        </div>
        <div
          className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border"
          style={{
            color,
            borderColor: `${color}40`,
            backgroundColor: `${color}10`,
          }}
        >
          {label}
        </div>
      </div>

      {/* Score Gauge */}
      <div className="flex items-center gap-8 mb-6">
        <div className="relative w-32 h-32 flex-shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
            <circle
              cx="60" cy="60" r="54"
              fill="none"
              stroke={color}
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              className="transition-all duration-1000"
              style={{ filter: `drop-shadow(0 0 8px ${color}40)` }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-black text-white">{score}</span>
            <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">/ 100</span>
          </div>
        </div>

        {/* Pillars */}
        <div className="flex-1 space-y-3">
          {pillars.map(p => {
            const Icon = p.icon;
            return (
              <div key={p.name} className="flex items-center gap-3">
                <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: p.color }} />
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{p.name}</span>
                    <span className="text-[10px] font-black text-white">{p.value}</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${p.value}%`, backgroundColor: p.color }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="mt-auto pt-4 border-t border-white/5 space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Recomendacoes</span>
          </div>
          {recommendations.map((rec, i) => (
            <p key={i} className="text-[11px] text-gray-400 font-medium leading-relaxed">
              <span className="text-white font-bold mr-1">#{i + 1}</span> {rec}
            </p>
          ))}
        </div>
      )}

      {recommendations.length === 0 && score > 0 && (
        <div className="mt-auto pt-4 border-t border-white/5">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span className="text-[11px] text-emerald-400 font-bold">Carteira em otimo estado! Continue assim.</span>
          </div>
        </div>
      )}

      {score === 0 && (
        <div className="mt-auto pt-4 border-t border-white/5">
          <p className="text-[11px] text-gray-600 font-bold text-center">
            Adicione ativos a carteira para calcular seu Health Score.
          </p>
        </div>
      )}
    </div>
  );
};

export default HealthScoreWidget;
