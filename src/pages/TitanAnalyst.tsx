import React from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { useTitanAnalyst } from '../hooks/useTitanAnalyst';
import { useStore } from '../store/useStore';
import { formatCurrency } from '../lib/utils';
import {
  ArrowLeft,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Shield,
  Target,
  Zap,
  BarChart3,
  Award,
} from 'lucide-react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from 'recharts';

const TitanAnalyst: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { assets } = useStore();
  const analysis = useTitanAnalyst(id || '');

  if (!id) return <Navigate to="/market" replace />;

  const asset = assets.find(a => a.id === id || a.ticker === id);
  if (!asset) return <Navigate to="/market" replace />;

  if (!analysis) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500">Carregando análise...</div>
      </div>
    );
  }

  const { score, verdict, pillars, strengths, weaknesses, sectorComparison, narrative } = analysis;

  // Radar chart data
  const radarData = [
    { axis: 'Dividendos', value: pillars.dividendos },
    { axis: 'Valuation', value: pillars.valuation },
    { axis: 'Crescimento', value: pillars.crescimento },
    { axis: 'Solidez', value: pillars.solidez },
    { axis: 'Momentum', value: pillars.momentum },
  ];

  const verdictColor =
    verdict === 'COMPRAR'
      ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
      : verdict === 'MANTER'
      ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
      : 'text-red-400 bg-red-500/10 border-red-500/20';

  const scoreColor =
    score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';

  const circumference = 2 * Math.PI * 54;
  const dashOffset = circumference - (circumference * score) / 100;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to={`/assets/${id}`}
          className="p-2 hover:bg-white/5 rounded-full text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold text-white tracking-tight">{analysis.ticker}</h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/10 text-gray-400 border border-white/5 uppercase">
              Titan Analyst
            </span>
          </div>
          <p className="text-gray-400">{analysis.name}</p>
        </div>
        <div className="ml-auto flex items-center gap-6">
          <div className="text-right">
            <div className="text-2xl font-bold text-white">{formatCurrency(asset.price, asset.currency)}</div>
            <div className="text-sm font-medium text-gray-400">Preço Atual</div>
          </div>
          <div
            className={`px-4 py-2 rounded-xl border text-sm font-black uppercase tracking-wider ${verdictColor}`}
          >
            {verdict}
          </div>
        </div>
      </div>

      {/* Score + Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Score Gauge */}
        <div className="bg-[#0B1C17] border border-white/5 rounded-2xl p-6 shadow-lg flex flex-col items-center justify-center">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-emerald-500" />
            Score Titan
          </h3>
          <div className="relative w-40 h-40">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
              <circle
                cx="60"
                cy="60"
                r="54"
                fill="none"
                stroke="rgba(255,255,255,0.05)"
                strokeWidth="8"
              />
              <circle
                cx="60"
                cy="60"
                r="54"
                fill="none"
                stroke={scoreColor}
                strokeWidth="8"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                className="transition-all duration-1000"
                style={{ filter: `drop-shadow(0 0 8px ${scoreColor}40)` }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-black text-white">{score}</span>
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                / 100
              </span>
            </div>
          </div>
          <div className="mt-4 text-center">
            <div className={`text-sm font-black uppercase tracking-wider ${verdictColor.split(' ')[0]}`}>
              {verdict}
            </div>
            <p className="text-[11px] text-gray-500 mt-1">
              {score >= 75 ? 'Oportunidade' : score >= 50 ? 'Manter Posição' : 'Reduzir'}
            </p>
          </div>
        </div>

        {/* Radar Chart */}
        <div className="lg:col-span-2 bg-[#0B1C17] border border-white/5 rounded-2xl p-6 shadow-lg">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-500" />
            5 Pilares da Análise
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="rgba(255,255,255,0.1)" />
              <PolarAngleAxis
                dataKey="axis"
                tick={{ fill: '#9ca3af', fontSize: 11, fontWeight: 600 }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                tick={{ fill: '#6b7280', fontSize: 9 }}
                axisLine={false}
              />
              <Radar
                name="Score"
                dataKey="value"
                stroke="#10b981"
                fill="#10b981"
                fillOpacity={0.3}
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Strengths & Weaknesses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Strengths */}
        <div className="bg-[#0B1C17] border border-white/5 rounded-2xl p-6 shadow-lg">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            Pontos Fortes
          </h3>
          {strengths.length > 0 ? (
            <div className="space-y-3">
              {strengths.map((s, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-300 font-medium">{s}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">Nenhum ponto forte destacado.</p>
          )}
        </div>

        {/* Weaknesses */}
        <div className="bg-[#0B1C17] border border-white/5 rounded-2xl p-6 shadow-lg">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Pontos Fracos
          </h3>
          {weaknesses.length > 0 ? (
            <div className="space-y-3">
              {weaknesses.map((w, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/10"
                >
                  <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-300 font-medium">{w}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">Nenhum ponto fraco destacado.</p>
          )}
        </div>
      </div>

      {/* Sector Comparison */}
      <div className="bg-[#0B1C17] border border-white/5 rounded-2xl p-6 shadow-lg">
        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
          <Target className="w-5 h-5 text-purple-500" />
          Comparação com o Setor
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* DY */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/5">
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
              Dividend Yield
            </div>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-black text-white">
                {sectorComparison.dy.toFixed(2)}%
              </span>
              <span className="text-xs text-gray-500 mb-1">
                vs {sectorComparison.sectorDY.toFixed(2)}% (setor)
              </span>
            </div>
            <div
              className={`text-xs font-bold mt-1 ${
                sectorComparison.dy > sectorComparison.sectorDY
                  ? 'text-emerald-400'
                  : 'text-red-400'
              }`}
            >
              {sectorComparison.dy > sectorComparison.sectorDY ? '↑ Acima' : '↓ Abaixo'}
            </div>
          </div>

          {/* P/L */}
          {!asset.category.includes('FII') && (
            <div className="p-4 rounded-xl bg-white/5 border border-white/5">
              <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                P/L
              </div>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-black text-white">
                  {sectorComparison.pl.toFixed(1)}
                </span>
                <span className="text-xs text-gray-500 mb-1">
                  vs {sectorComparison.sectorPL.toFixed(1)} (setor)
                </span>
              </div>
              <div
                className={`text-xs font-bold mt-1 ${
                  sectorComparison.pl < sectorComparison.sectorPL
                    ? 'text-emerald-400'
                    : 'text-amber-400'
                }`}
              >
                {sectorComparison.pl < sectorComparison.sectorPL ? '↑ Abaixo (bom)' : '↓ Acima'}
              </div>
            </div>
          )}

          {/* P/VP */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/5">
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
              P/VP
            </div>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-black text-white">
                {sectorComparison.pvp > 0 ? sectorComparison.pvp.toFixed(2) : 'N/A'}
              </span>
              <span className="text-xs text-gray-500 mb-1">
                vs {sectorComparison.sectorPVP.toFixed(1)} (setor)
              </span>
            </div>
            {sectorComparison.pvp > 0 && (
              <div
                className={`text-xs font-bold mt-1 ${
                  sectorComparison.pvp <= sectorComparison.sectorPVP
                    ? 'text-emerald-400'
                    : 'text-amber-400'
                }`}
              >
                {sectorComparison.pvp <= sectorComparison.sectorPVP ? '↑ Abaixo (bom)' : '↓ Acima'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Narrative */}
      <div className="bg-[#0B1C17] border border-white/5 rounded-2xl p-6 shadow-lg">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-emerald-500" />
          Análise Titan
        </h3>
        <p className="text-sm text-gray-300 leading-relaxed">{narrative}</p>
      </div>

      {/* Pillars Detail */}
      <div className="bg-[#0B1C17] border border-white/5 rounded-2xl p-6 shadow-lg">
        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-500" />
          Detalhamento dos 5 Pilares
        </h3>
        <div className="space-y-4">
          {[
            { name: 'Dividendos', value: pillars.dividendos, icon: TrendingUp, color: '#10b981' },
            { name: 'Valuation', value: pillars.valuation, icon: Target, color: '#3b82f6' },
            { name: 'Crescimento', value: pillars.crescimento, icon: TrendingUp, color: '#8b5cf6' },
            { name: 'Solidez', value: pillars.solidez, icon: Shield, color: '#f59e0b' },
            { name: 'Momentum', value: pillars.momentum, icon: Zap, color: '#ef4444' },
          ].map(pillar => {
            const Icon = pillar.icon;
            return (
              <div key={pillar.name} className="flex items-center gap-4">
                <Icon className="w-4 h-4 flex-shrink-0" style={{ color: pillar.color }} />
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                      {pillar.name}
                    </span>
                    <span className="text-xs font-black text-white">{pillar.value}/100</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${pillar.value}%`,
                        backgroundColor: pillar.color,
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TitanAnalyst;
