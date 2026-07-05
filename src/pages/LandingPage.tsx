import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  ShieldCheck,
  Globe,
  ArrowRight,
  Zap,
  Plus,
  Snowflake,
  CheckCircle,
  CheckCircle2,
  Gem,
  Star,
  Shield,
  Calculator,
  Users,
  Bell,
  FileText,
  BarChart2,
  Lock,
  ChevronDown,
  Sparkles,
  Target,
  Clock,
  Award,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { cn } from '../lib/utils';
import MarketTicker from '../components/MarketTicker';
import MarketOverview from '../components/MarketOverview';
import MarketSummary from '../components/MarketSummary';
import AssetRankings from '../components/AssetRankings';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TestimonialData {
  name: string;
  location: string;
  avatar: string;
  text: string;
  result: string;
}

// ─── Static data ──────────────────────────────────────────────────────────────

const FII_DATA: Record<string, { price: number; dividend: number; dy: number }> = {
  BTLG11: { price: 98.50,  dividend: 0.76, dy: 9.26 },
  VISC11: { price: 112.20, dividend: 0.80, dy: 8.56 },
  TRXF11: { price: 105.10, dividend: 0.85, dy: 9.70 },
  HGLG11: { price: 165.40, dividend: 1.10, dy: 7.98 },
};

const TESTIMONIALS: TestimonialData[] = [
  { name: 'Ricardo S.',  location: 'Cascais',  avatar: 'R', text: 'Economizei €800 num único aporte graças ao alerta de câmbio. Indispensável.',        result: '€800 economizados' },
  { name: 'Camila M.',   location: 'Porto',    avatar: 'C', text: 'O radar de bitributação me salvou de uma multa de R$4.200 na Receita Federal.',       result: 'R$4.200 de multa evitada' },
  { name: 'Felipe T.',   location: 'Lisboa',   avatar: 'F', text: 'Em 8 meses atingi 68% do meu Número Mágico. Nunca pensei que fosse tão rápido.',      result: '68% da meta em 8 meses' },
  { name: 'João P.',     location: 'Braga',    avatar: 'J', text: 'Melhor interface para FIIs que já usei. O DRIP simulator é viciante.',                result: '+12% de rendimento' },
  { name: 'Maria L.',    location: 'Algarve',  avatar: 'M', text: 'Consigo ver patrimônio BR e PT unificado em 30 segundos. Mudou minha vida.',          result: 'R$48k em gestão' },
  { name: 'Pedro H.',    location: 'Sintra',   avatar: 'P', text: 'O alerta de timing me fez aportar no momento certo. Ganhei 6% só no câmbio.',         result: '+6% só no câmbio' },
  { name: 'Sofia G.',    location: 'Coimbra',  avatar: 'S', text: 'Relatório fiscal automático para BR e PT. Zero stress em Abril.',                     result: 'Declaração sem stress' },
  { name: 'André C.',    location: 'Aveiro',   avatar: 'A', text: 'A projeção de dividendos é muito precisa. Bato a meta todo mês.',                     result: 'Meta batida todo mês' },
  { name: 'Beatriz V.',  location: 'Évora',    avatar: 'B', text: 'Uso diariamente para acompanhar câmbio. Já mandei 3 amigos para a plataforma.',       result: '3 indicações feitas' },
  { name: 'Tiago R.',    location: 'Lisboa',   avatar: 'T', text: 'App indispensável para quem quer renda passiva em reais vivendo em Portugal.',         result: 'R$2.300/mês de dividendos' },
  { name: 'Gabriela F.', location: 'Porto',    avatar: 'G', text: 'Interface limpa, rápida e sem complicação. O suporte respondeu em 2 minutos.',        result: 'Suporte 10/10' },
  { name: 'Lucas N.',    location: 'Cascais',  avatar: 'L', text: 'O plano Diamond vale cada centavo. Consultoria humana me poupou muito tempo.',         result: '20h/mês economizadas' },
  { name: 'Patrícia D.', location: 'Setúbal',  avatar: 'P', text: 'Finalmente tenho controle total. Antes gastava 3h por semana em planilhas.',          result: '3h/semana recuperadas' },
  { name: 'Vitor K.',    location: 'Braga',    avatar: 'V', text: 'FIIs, Ações e Cripto no mesmo lugar. Nota 10 sem hesitar.',                           result: 'Carteira unificada' },
  { name: 'Elena S.',    location: 'Funchal',  avatar: 'E', text: 'Mudei-me para Portugal há 6 meses e o app já era. Não consigo imaginar sem ele.',     result: 'Setup em 2 minutos' },
];

// ─── Utility hooks ────────────────────────────────────────────────────────────

function useCountUp(target: number, duration = 1800, prefix = '', suffix = '') {
  const [value, setValue] = useState('0');
  const started = useRef(false);

  const start = useCallback(() => {
    if (started.current) return;
    started.current = true;
    const startTime = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(eased * target);
      setValue(`${prefix}${current.toLocaleString('pt-BR')}${suffix}`);
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration, prefix, suffix]);

  return { value, start };
}

function useIntersectionObserver(threshold = 0.2) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

// ─── Animated stat card ───────────────────────────────────────────────────────

const StatCard = ({
  target, prefix, suffix, label, triggerStart,
}: {
  target: number; prefix?: string; suffix?: string; label: string; triggerStart: boolean;
}) => {
  const { value, start } = useCountUp(target, 1600, prefix, suffix);
  useEffect(() => { if (triggerStart) start(); }, [triggerStart, start]);
  return (
    <div className="glass-card rounded-2xl p-6 text-center border-white/5 hover:border-emerald-500/20 transition-all">
      <div className="text-3xl md:text-4xl font-black text-white mb-1">
        {value}<span className="text-emerald-400" />
      </div>
      <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{label}</div>
    </div>
  );
};

// ─── How it works ─────────────────────────────────────────────────────────────

const HowItWorks = () => {
  const { ref, visible } = useIntersectionObserver();
  const steps = [
    {
      num: '01',
      icon: <FileText className="w-6 h-6" />,
      title: 'Conecte sua carteira',
      desc: 'Importe via CSV das corretoras (XP, Rico, Clear) ou adicione ativos manualmente em segundos. FIIs, ações e cripto unificados.',
      tag: '⚡ 2 minutos para começar',
      color: 'emerald',
    },
    {
      num: '02',
      icon: <Target className="w-6 h-6" />,
      title: 'Defina seu Número Mágico',
      desc: 'Informe sua meta mensal em euros. A IA calcula cotas necessárias, aporte ideal e prazo realista baseado em DY real.',
      tag: '🤖 IA em tempo real',
      color: 'blue',
    },
    {
      num: '03',
      icon: <Bell className="w-6 h-6" />,
      title: 'Receba alertas e conquiste',
      desc: 'Alerta proativo quando câmbio está 2%+ acima da média. Relatório fiscal automático. Dividendos que crescem todo mês.',
      tag: '🎯 Automático e inteligente',
      color: 'purple',
    },
  ];

  const colorMap = {
    emerald: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/30 text-emerald-400',
    blue: 'from-blue-500/20 to-blue-500/5 border-blue-500/30 text-blue-400',
    purple: 'from-purple-500/20 to-purple-500/5 border-purple-500/30 text-purple-400',
  };

  return (
    <section id="how" className="py-32 relative z-10" ref={ref}>
      <div className="container mx-auto px-6">
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-black tracking-widest uppercase mb-6">
            <Zap className="w-3 h-3 fill-emerald-400" /> Como Funciona
          </div>
          <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-4">
            Do caos à clareza em <span className="text-emerald-400">3 passos.</span>
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Sem configurações complexas. Sem planilhas. Em menos de 5 minutos você tem uma visão completa do seu patrimônio.
          </p>
        </div>

        <div className="relative max-w-5xl mx-auto">
          {/* Connecting line */}
          <div className="hidden md:block absolute top-16 left-[16.66%] right-[16.66%] h-px bg-gradient-to-r from-emerald-500/40 via-blue-500/40 to-purple-500/40" />

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, i) => (
              <div
                key={i}
                className={cn(
                  'relative p-8 rounded-3xl bg-gradient-to-br border transition-all duration-700',
                  colorMap[step.color as keyof typeof colorMap],
                  visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                )}
                style={{ transitionDelay: `${i * 150}ms` }}
              >
                <div className="flex items-center justify-between mb-6">
                  <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center bg-white/10')}>
                    {step.icon}
                  </div>
                  <span className="text-5xl font-black opacity-20">{step.num}</span>
                </div>
                <h3 className="text-xl font-black text-white mb-3">{step.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed mb-4">{step.desc}</p>
                <div className="inline-flex text-[11px] font-bold px-3 py-1 rounded-full bg-white/10 text-white">
                  {step.tag}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

// ─── Animated stats section ───────────────────────────────────────────────────

const ImpactStats = () => {
  const { ref, visible } = useIntersectionObserver();
  const stats = [
    { target: 48,   prefix: 'R$', suffix: 'M+',  label: 'em patrimônio gerenciado' },
    { target: 1200, prefix: '',   suffix: '+',    label: 'expatriados ativos' },
    { target: 12,   prefix: '',   suffix: '.4%',  label: 'rendimento médio / ano' },
    { target: 5,    prefix: '',   suffix: ' min', label: 'para conectar carteira' },
  ];
  return (
    <section className="py-20 relative z-10" ref={ref}>
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
          {stats.map((s, i) => (
            <StatCard key={i} {...s} triggerStart={visible} />
          ))}
        </div>
      </div>
    </section>
  );
};

// ─── DRIP Growth Chart ────────────────────────────────────────────────────────

const DRIPSimulator = () => {
  const [aporte, setAporte]  = useState(500);
  const [anos, setAnos]      = useState(10);
  const [dy, setDy]          = useState(9);
  const [fx, setFx]          = useState(6.1);

  const chartData = React.useMemo(() => {
    const months = anos * 12;
    const monthlyRate = dy / 100 / 12;
    const aporteBRL = aporte * fx;
    const data: { ano: string; drip: number; semDrip: number }[] = [];
    let pat = 0;
    let patSimples = 0;
    for (let m = 0; m <= months; m++) {
      if (m % 12 === 0) {
        data.push({
          ano: `Ano ${m / 12}`,
          drip: Math.round(pat),
          semDrip: Math.round(patSimples),
        });
      }
      pat = (pat + aporteBRL) * (1 + monthlyRate);
      patSimples += aporteBRL;
    }
    return data;
  }, [aporte, anos, dy, fx]);

  const final     = chartData[chartData.length - 1]?.drip ?? 0;
  const divMes    = Math.round(final * (dy / 100 / 12));
  const totalAp   = Math.round(aporte * anos * 12);
  const ganho     = Math.round(((final / (totalAp * fx)) - 1) * 100);

  const fmtBRL = (n: number) =>
    n >= 1_000_000
      ? `R$ ${(n / 1_000_000).toFixed(1)}M`
      : `R$ ${Math.round(n).toLocaleString('pt-BR')}`;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="glass-card p-4 rounded-xl border-white/10 text-sm">
        <p className="font-black text-white mb-2">{label}</p>
        <p className="text-emerald-400">Com DRIP: {fmtBRL(payload[0]?.value)}</p>
        <p className="text-gray-500">Sem DRIP: {fmtBRL(payload[1]?.value)}</p>
      </div>
    );
  };

  return (
    <section className="py-32 relative z-10">
      <div className="container mx-auto px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-black tracking-widest uppercase mb-6">
              <BarChart2 className="w-3 h-3" /> Simulador DRIP
            </div>
            <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-4">
              Veja seu patrimônio <span className="text-emerald-400">crescer.</span>
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Reinvestir dividendos automaticamente (DRIP) é o segredo dos grandes patrimônios. Experimente agora.
            </p>
          </div>

          <div className="glass-card rounded-[2.5rem] p-8 md:p-12 border-white/5">
            {/* Controls */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                  Aporte mensal
                </label>
                <div className="text-2xl font-black text-white">€ {aporte}</div>
                <input
                  type="range" min={100} max={3000} step={50} value={aporte}
                  onChange={e => setAporte(+e.target.value)}
                  className="w-full accent-emerald-500"
                />
                <div className="flex justify-between text-[10px] text-gray-600">
                  <span>€100</span><span>€3.000</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                  Período
                </label>
                <div className="text-2xl font-black text-white">{anos} anos</div>
                <input
                  type="range" min={3} max={30} step={1} value={anos}
                  onChange={e => setAnos(+e.target.value)}
                  className="w-full accent-emerald-500"
                />
                <div className="flex justify-between text-[10px] text-gray-600">
                  <span>3a</span><span>30a</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                  DY anual estimado
                </label>
                <div className="text-2xl font-black text-white">{dy}%</div>
                <input
                  type="range" min={6} max={14} step={0.5} value={dy}
                  onChange={e => setDy(+e.target.value)}
                  className="w-full accent-emerald-500"
                />
                <div className="flex justify-between text-[10px] text-gray-600">
                  <span>6%</span><span>14%</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                  Taxa EUR/BRL
                </label>
                <div className="text-2xl font-black text-white">R$ {fx.toFixed(1)}</div>
                <input
                  type="range" min={5.5} max={7.5} step={0.1} value={fx}
                  onChange={e => setFx(+e.target.value)}
                  className="w-full accent-emerald-500"
                />
                <div className="flex justify-between text-[10px] text-gray-600">
                  <span>5.5</span><span>7.5</span>
                </div>
              </div>
            </div>

            {/* Chart */}
            <div className="h-[280px] mb-8">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="drip" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="semdrip" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#6b7280" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#6b7280" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="ano" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false}
                    tickFormatter={v => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`}
                    width={52}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="drip"    name="Com DRIP"    stroke="#10b981" strokeWidth={2.5} fill="url(#drip)"    dot={false} />
                  <Area type="monotone" dataKey="semDrip" name="Sem DRIP"    stroke="#6b7280" strokeWidth={1.5} fill="url(#semdrip)" dot={false} strokeDasharray="5 3" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="flex gap-6 justify-center mb-8 text-xs text-gray-400">
              <span className="flex items-center gap-2">
                <span className="w-8 h-0.5 bg-emerald-400 inline-block rounded" />
                Com reinvestimento (DRIP)
              </span>
              <span className="flex items-center gap-2">
                <span className="w-8 border-t border-dashed border-gray-500 inline-block" />
                Apenas aportes
              </span>
            </div>

            {/* Results */}
            <div className="grid grid-cols-3 gap-4">
              <div className="glass-emerald p-6 rounded-2xl text-center border-emerald-500/20">
                <div className="text-xs text-emerald-400 font-black uppercase tracking-widest mb-2">Patrimônio Final</div>
                <div className="text-2xl md:text-3xl font-black text-white">{fmtBRL(final)}</div>
              </div>
              <div className="glass-card p-6 rounded-2xl text-center border-white/5">
                <div className="text-xs text-gray-500 font-black uppercase tracking-widest mb-2">Dividendos / Mês</div>
                <div className="text-2xl md:text-3xl font-black text-white">{fmtBRL(divMes)}</div>
              </div>
              <div className="glass-card p-6 rounded-2xl text-center border-white/5">
                <div className="text-xs text-gray-500 font-black uppercase tracking-widest mb-2">Ganho vs Aporte Simples</div>
                <div className="text-2xl md:text-3xl font-black text-emerald-400">+{ganho}%</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// ─── Magic Number Calculator ──────────────────────────────────────────────────

const MagicNumberCalculator = () => {
  const [targetEuro, setTargetEuro] = useState('500');
  const [selectedFii, setSelectedFii] = useState('BTLG11');
  const eurToBrl   = 6.12;
  const targetBrl  = parseFloat(targetEuro || '0') * eurToBrl;
  const fii        = FII_DATA[selectedFii];
  const shares     = Math.ceil(targetBrl / (fii?.dividend ?? 1));
  const totalBRL   = shares * (fii?.price ?? 0);
  const totalEUR   = totalBRL / eurToBrl;
  const progress   = Math.min((parseFloat(targetEuro) / 3000) * 100, 100);

  return (
    <div className="glass-emerald p-8 md:p-10 rounded-[2.5rem] border-emerald-500/30 shadow-2xl relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
        <Calculator className="w-32 h-32 text-white" />
      </div>

      <div className="relative z-10 space-y-8">
        <div className="space-y-1">
          <div className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Calculadora do Número Mágico</div>
          <h3 className="text-2xl font-black text-white">Quanto falta para sua liberdade?</h3>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Ativo Alvo</label>
            <select
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-all appearance-none"
              value={selectedFii}
              onChange={e => setSelectedFii(e.target.value)}
            >
              {Object.keys(FII_DATA).map(f => (
                <option key={f} value={f} className="bg-slate-900">{f} — DY {FII_DATA[f].dy}%</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Meta Mensal (€)</label>
            <input
              type="number"
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-all font-bold"
              value={targetEuro}
              onChange={e => setTargetEuro(e.target.value)}
            />
          </div>
        </div>

        <div className="p-6 bg-[#020617]/60 rounded-2xl border border-white/5 space-y-4">
          <div className="flex justify-between items-end">
            <span className="text-gray-400 text-sm font-medium">Cotas necessárias:</span>
            <span className="text-3xl font-black text-white">
              {shares.toLocaleString('pt-BR')} <span className="text-sm font-medium text-gray-500 uppercase tracking-tighter">cotas</span>
            </span>
          </div>
          <div className="h-2 bg-emerald-500/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-700 shadow-[0_0_15px_rgba(16,185,129,0.5)]"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-gray-600">
            <span>0 cotas</span>
            <span>{shares.toLocaleString('pt-BR')} cotas = €{targetEuro}/mês</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-1">
            <div className="text-[10px] text-gray-500 font-bold uppercase">Investimento Total</div>
            <div className="text-xl font-black text-white">
              € {totalEUR.toLocaleString('pt-PT', { maximumFractionDigits: 0 })}
            </div>
            <div className="text-[10px] text-gray-600">R$ {totalBRL.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</div>
          </div>
          <div className="space-y-1 text-right">
            <div className="text-[10px] text-gray-500 font-bold uppercase">Renda Mensal Alvo</div>
            <div className="text-xl font-black text-emerald-400">
              R$ {targetBrl.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
            </div>
            <div className="text-[10px] text-gray-600">Dividend: R$ {fii.dividend.toFixed(2)}/cota</div>
          </div>
        </div>

        <Link
          to="/sign-up"
          className="w-full py-4 text-sm font-black text-[#020617] bg-white rounded-xl hover:bg-emerald-400 transition-all active:scale-95 shadow-xl shadow-white/5 flex items-center justify-center gap-2 group"
        >
          Ver análise completa no App <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    </div>
  );
};

// ─── Feature showcase cards ───────────────────────────────────────────────────

const FeatureCard = ({
  icon, title, desc, result, color,
}: {
  icon: React.ReactNode; title: string; desc: string; result: string;
  color: 'emerald' | 'blue' | 'amber' | 'purple';
}) => {
  const colors = {
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    blue:    'text-blue-400 bg-blue-500/10 border-blue-500/20',
    amber:   'text-amber-400 bg-amber-500/10 border-amber-500/20',
    purple:  'text-purple-400 bg-purple-500/10 border-purple-500/20',
  };
  return (
    <div className="glass-card p-8 rounded-3xl border-white/5 hover:border-white/10 hover:-translate-y-1 transition-all group">
      <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center mb-5 border', colors[color])}>
        {icon}
      </div>
      <h4 className="text-lg font-black text-white mb-2">{title}</h4>
      <p className="text-gray-500 text-sm leading-relaxed mb-4">{desc}</p>
      <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full">
        <TrendingUp className="w-3 h-3" /> {result}
      </div>
    </div>
  );
};

// ─── Pain cards ───────────────────────────────────────────────────────────────

const PainCard = ({ title, desc }: { title: string; desc: string }) => (
  <div className="glass-card p-10 rounded-3xl border-red-500/10 hover:border-red-500/30 transition-all hover:-translate-y-2 group">
    <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 mb-6 group-hover:scale-110 transition-transform">
      <Plus className="rotate-45" />
    </div>
    <h4 className="text-xl font-black text-white mb-4">{title}</h4>
    <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
  </div>
);

// ─── Testimonial card ─────────────────────────────────────────────────────────

const TestimonialCard = ({ name, location, text, avatar, result, index }: TestimonialData & { index: number }) => {
  const themes    = ['glass-card border-white/5', 'glass-emerald border-emerald-500/20', 'glass-blue border-blue-500/20', 'glass-card border-white/5'];
  const theme     = themes[index % themes.length];
  return (
    <div className={cn('w-[300px] flex-shrink-0 p-6 rounded-3xl border whitespace-normal', theme)}>
      <div className="flex items-center gap-4 mb-4">
        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white font-black text-sm">
          {avatar}
        </div>
        <div className="flex-1">
          <div className="text-white font-black text-sm">{name}</div>
          <div className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">{location}</div>
        </div>
        <div className="flex gap-0.5">
          {[...Array(5)].map((_, i) => <Star key={i} className="w-2.5 h-2.5 text-yellow-400 fill-yellow-400" />)}
        </div>
      </div>
      <p className="text-gray-300 italic text-xs leading-relaxed mb-3">"{text}"</p>
      <div className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
        <TrendingUp className="w-2.5 h-2.5" /> {result}
      </div>
    </div>
  );
};

// ─── FAQ item ─────────────────────────────────────────────────────────────────

const FAQItem = ({ question, answer }: { question: string; answer: string }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-white/5 rounded-2xl overflow-hidden glass-card">
      <button
        onClick={() => setOpen(!open)}
        className="w-full p-6 text-left flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <span className="font-bold text-white">{question}</span>
        <ChevronDown className={cn('w-5 h-5 text-gray-400 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="p-6 pt-0 text-gray-400 text-sm border-t border-white/5 bg-white/[0.01] leading-relaxed">
          {answer}
        </div>
      )}
    </div>
  );
};

// ─── Plan card ────────────────────────────────────────────────────────────────

const PlanCard = ({
  tag, name, priceMonthly, priceAnnual, period, desc, features, btnText, to, popular, theme, badgeColor, isAnnual,
}: {
  tag: string; name: string; priceMonthly: string; priceAnnual: string; period?: string;
  desc: string; features: string[]; btnText: string; to: string; popular?: boolean;
  theme: string; badgeColor: string; isAnnual: boolean;
}) => {
  const price = isAnnual ? priceAnnual : priceMonthly;
  return (
    <div className={cn(
      'glass-card rounded-[2.5rem] p-8 flex flex-col relative transition-all hover:scale-[1.02] border-white/5 h-full',
      popular && 'border-emerald-500 shadow-2xl shadow-emerald-500/10 md:scale-105 z-20',
      theme,
    )}>
      {tag && (
        <div className={cn(
          'absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-black px-4 py-1 rounded-full uppercase tracking-widest whitespace-nowrap',
          badgeColor,
        )}>
          {tag}
        </div>
      )}
      <h3 className="text-xl font-black text-white mb-2 mt-2">{name}</h3>
      <div className="flex items-baseline gap-1 mb-1">
        <span className="text-3xl font-black text-white">{price}</span>
        {period && <span className="text-gray-500 text-sm">{period}</span>}
      </div>
      {isAnnual && price !== 'Grátis' && (
        <div className="text-[10px] text-emerald-400 font-bold mb-3">🎉 2 meses grátis no plano anual</div>
      )}
      <p className="text-gray-400 text-[10px] mb-8 leading-relaxed h-12 overflow-hidden">{desc}</p>
      <ul className="space-y-4 mb-10 flex-1">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-3 text-gray-300 text-[11px] leading-snug">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <Link
        to={to}
        className={cn(
          'py-4 rounded-xl font-black text-sm text-center transition-all',
          popular
            ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/25 hover:bg-emerald-400'
            : 'border border-white/10 text-white hover:bg-white/5',
        )}
      >
        {btnText}
      </Link>
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

const LandingPage = () => {
  const [isAnnual, setIsAnnual] = useState(false);

  return (
    <div className="min-h-screen bg-[#020617] text-white selection:bg-emerald-500/30 font-sans overflow-x-hidden relative">
      <MarketTicker />

      {/* Background blobs */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[70vw] h-[70vw] rounded-full bg-emerald-500/10 blur-[130px] animate-pulse-slow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[70vw] h-[70vw] rounded-full bg-blue-600/10 blur-[130px] animate-pulse-slow delay-1000" />
        <div className="absolute top-[30%] left-[40%] w-[50vw] h-[50vw] rounded-full bg-purple-600/5 blur-[120px]" />
      </div>

      {/* ── HEADER ── */}
      <header className="fixed top-9 left-0 right-0 z-50 border-b border-white/5 bg-[#020617]/70 backdrop-blur-xl">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 group cursor-pointer">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-[#020617] font-black text-xl shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform">
              B
            </div>
            <span className="font-bold text-xl tracking-tighter">
              BrasilInvest <span className="text-emerald-400">Pro</span>
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-400">
            <a href="#problem"  className="hover:text-white transition-colors">A Dor</a>
            <a href="#how"      className="hover:text-white transition-colors">Como Funciona</a>
            <a href="#showcase" className="hover:text-white transition-colors">Funcionalidades</a>
            <a href="#plans"    className="hover:text-white transition-colors">Planos</a>
          </div>

          <div className="flex items-center gap-4">
            <Link to="/sign-in" className="text-sm font-bold text-gray-300 hover:text-white transition-colors px-4 py-2">
              Entrar
            </Link>
            <Link
              to="/sign-up"
              className="inline-flex items-center justify-center px-6 py-2.5 text-sm font-black text-[#020617] transition-all bg-emerald-400 rounded-xl hover:bg-emerald-300 hover:shadow-lg hover:shadow-emerald-500/25 active:scale-95"
            >
              Criar Conta
            </Link>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="relative z-10 pt-40 pb-20 container mx-auto px-6">
        <div className="flex flex-col lg:flex-row items-center gap-16">
          <div className="lg:w-1/2 space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-black tracking-widest uppercase">
              <Zap className="w-3 h-3 fill-emerald-400" /> Inteligência para Expatriados
            </div>

            <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-[1.05]">
              Transforme seu Euro em uma{' '}
              <span className="text-gradient">máquina de dividendos</span> no Brasil.
            </h1>

            <p className="text-lg md:text-xl text-gray-400 max-w-xl leading-relaxed">
              Gerencie, projete e conquiste seu{' '}
              <span className="text-emerald-400 font-bold">Número Mágico</span> sem sair de Portugal. O gestor inteligente que une o melhor de dois mundos.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link
                to="/sign-up"
                className="inline-flex items-center justify-center px-10 py-5 text-lg font-black text-[#020617] transition-all bg-emerald-400 rounded-2xl hover:bg-emerald-300 hover:shadow-2xl hover:shadow-emerald-500/20 hover:-translate-y-1 group"
              >
                Começar grátis <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to="/sign-in"
                className="inline-flex items-center justify-center px-10 py-5 text-lg font-black text-white transition-all bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 backdrop-blur-md"
              >
                Acessar Demo
              </Link>
            </div>

            {/* Trust micro-signals */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-4 text-gray-500 text-xs font-medium">
              <div className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Sem cartão de crédito</div>
              <div className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> FIIs, Ações & Cripto</div>
              <div className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> GDPR Compliant</div>
              <div className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Cancele quando quiser</div>
            </div>
          </div>

          {/* Hero right: calculator */}
          <div className="lg:w-1/2 w-full">
            <MagicNumberCalculator />
          </div>
        </div>
      </section>

      {/* ── IMPACT STATS ── */}
      <ImpactStats />

      {/* ── MARKET OVERVIEW (indices em tempo real) ── */}
      <section className="py-16 relative z-10">
        <div className="container mx-auto px-6">
          <MarketOverview />
        </div>
      </section>

      {/* ── MARKET SUMMARY (resumo classificado) ── */}
      <section className="py-16 relative z-10">
        <div className="container mx-auto px-6">
          <MarketSummary />
        </div>
      </section>

      {/* ── ASSET RANKINGS ── */}
      <section className="py-16 relative z-10">
        <div className="container mx-auto px-6">
          <AssetRankings />
        </div>
      </section>

      {/* ── SOCIAL PROOF logos ── */}
      <section className="py-12 border-y border-white/5 bg-white/[0.02]">
        <div className="container mx-auto px-6 text-center">
          <h5 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-10">
            Integrado com os maiores players do mercado
          </h5>
          <div className="flex flex-wrap justify-center items-center gap-12 md:gap-20 opacity-40 hover:opacity-70 grayscale hover:grayscale-0 transition-all duration-700">
            <span className="text-xl font-black text-white tracking-tighter italic">XP INVESTIMENTOS</span>
            <span className="text-xl font-black text-white tracking-tighter">investing.com</span>
            <span className="text-xl font-black text-white tracking-tighter">B3</span>
            <span className="text-xl font-black text-white tracking-tighter">TradingView</span>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <HowItWorks />

      {/* ── PAIN SECTION ── */}
      <section id="problem" className="py-32 bg-premium relative">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center space-y-4 mb-20">
            <h2 className="text-emerald-400 font-black uppercase tracking-widest text-sm">O Caos do Expatriado</h2>
            <h3 className="text-4xl md:text-5xl font-black text-white">Chega de perder dinheiro no escuro.</h3>
            <p className="text-gray-400 text-lg">Você se reconhece em alguma dessas situações?</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <PainCard
              title="Timing de Câmbio Ruim"
              desc="Perde 5% a 10% do seu aporte por enviar euros no momento errado. Sem alerta, sem referência — só intuição."
            />
            <PainCard
              title="Terror Fiscal Duplo"
              desc="Medo constante da Receita Federal e do Fisco português. Bitributação é um fantasma que drena sua rentabilidade."
            />
            <PainCard
              title="Meta Abstrata e Distante"
              desc="Você sabe que quer 'independência financeira', mas não sabe quantas cotas faltam, nem em que mês chega lá."
            />
          </div>
        </div>
      </section>

      {/* ── FEATURE SHOWCASE ── */}
      <section id="showcase" className="py-32 relative">
        <div className="container mx-auto px-6">
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-black tracking-widest uppercase mb-6">
              <Sparkles className="w-3 h-3" /> Funcionalidades
            </div>
            <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-4">
              Gestão <span className="text-emerald-400">Inteligente.</span> Resultados Reais.
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Cada funcionalidade foi construída para resolver um problema real do expatriado brasileiro.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto mb-20">
            <FeatureCard
              icon={<Globe className="w-6 h-6" />}
              title="Radar de Câmbio EUR/BRL"
              desc="Alerta quando a taxa está 2%+ acima da média de 30 dias. Você aporta mais com o mesmo euro."
              result="Ganho médio: +4.8% por aporte"
              color="emerald"
            />
            <FeatureCard
              icon={<Snowflake className="w-6 h-6" />}
              title="Número Mágico"
              desc="Saiba quantas cotas de BTLG11 pagam seu aluguel em Lisboa. Meta tangível, não percentual abstrato."
              result="Meta visual e atualizada diariamente"
              color="blue"
            />
            <FeatureCard
              icon={<ShieldCheck className="w-6 h-6" />}
              title="Radar de Bitributação"
              desc="Relatório mensal de impostos nos dois países. Evite multas e aproveite o acordo vigente."
              result="Economia média: R$2.100/ano"
              color="amber"
            />
            <FeatureCard
              icon={<Calculator className="w-6 h-6" />}
              title="DRIP Simulator"
              desc="Juros compostos com reinvestimento automático de dividendos e aportes mensais. Veja o futuro."
              result="Patrimônio 3x maior em 20 anos"
              color="purple"
            />
          </div>

          {/* AI Feature highlight */}
          <div className="glass-emerald rounded-[2.5rem] p-10 md:p-16 border-emerald-500/20 max-w-4xl mx-auto relative overflow-hidden text-center">
            <div className="absolute inset-0 opacity-5 pointer-events-none flex items-center justify-center">
              <Sparkles className="w-96 h-96 text-white" />
            </div>
            <div className="relative z-10">
              <div className="inline-flex bg-emerald-500/20 text-emerald-400 px-4 py-1 rounded-full text-xs font-black mb-6">
                AI ANALYTICS
              </div>
              <h4 className="text-3xl md:text-4xl font-black text-white mb-6">A Inteligência que Antecipa.</h4>
              <blockquote className="text-gray-300 text-lg italic leading-relaxed mb-8 max-w-2xl mx-auto">
                "O Euro subiu 3% hoje. Este é o momento ideal para aportar no VISC11 e acelerar sua meta em 4 meses."
              </blockquote>
              <Link
                to="/sign-up"
                className="inline-flex items-center gap-2 text-emerald-400 font-bold hover:gap-4 transition-all"
              >
                Experimentar a IA <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── DRIP SIMULATOR ── */}
      <DRIPSimulator />

      {/* ── COMPARISON ── */}
      <section className="py-32 bg-[#020617]">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-emerald-400 font-black uppercase tracking-widest text-sm">O Salto Tecnológico</h2>
            <h3 className="text-4xl md:text-5xl font-black">
              Sua vida antes e depois do <span className="text-gradient">Pro.</span>
            </h3>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <div className="glass-card p-10 rounded-[2.5rem] border-rose-500/10 grayscale opacity-60">
              <h4 className="text-rose-400 font-bold mb-6 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-rose-500/10 flex items-center justify-center">✕</span>
                Sem BrasilInvest Pro
              </h4>
              <ul className="space-y-5 text-gray-500 text-sm">
                {[
                  'Perde 6%+ na remessa por timing errado de câmbio',
                  'Passa horas por semana atualizando planilhas',
                  'Declara imposto no chute, arriscando multa da Receita',
                  'Não sabe quantas cotas faltam para a liberdade financeira',
                  'FIIs, ações e cripto em apps diferentes sem visão unificada',
                ].map((item, i) => (
                  <li key={i} className="flex gap-3 items-start">
                    <span className="text-rose-500 mt-0.5 flex-shrink-0">✕</span> {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="glass-emerald p-10 rounded-[2.5rem] border-emerald-500/30 relative overflow-hidden">
              <h4 className="text-emerald-400 font-bold mb-6 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">✓</span>
                Com BrasilInvest Pro
              </h4>
              <ul className="space-y-5 text-gray-200 text-sm">
                {[
                  'Alerta proativo quando câmbio está 2%+ acima da média',
                  'Dashboard automático — carteira atualizada em tempo real',
                  'Relatório IR pronto para BR e PT todo mês, sem esforço',
                  'Número Mágico: sabe o dia exato em que os dividendos cobrem tudo',
                  'FIIs, Ações e Cripto unidos em uma visão 360° completa',
                ].map((item, i) => (
                  <li key={i} className="flex gap-3 items-start">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" /> {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="py-32 relative overflow-hidden bg-[#020617]">
        <div className="container mx-auto px-6 mb-16">
          <div className="text-center space-y-4">
            <h2 className="text-emerald-400 font-black uppercase tracking-widest text-sm">Comunidade Global</h2>
            <h3 className="text-4xl md:text-5xl font-black">
              A escolha dos expatriados <span className="text-gradient">vencedores.</span>
            </h3>
            <p className="text-gray-500 text-sm">Resultados reais de usuários reais.</p>
          </div>
        </div>

        <div className="flex overflow-hidden select-none gap-8">
          <div className="flex animate-marquee gap-8 whitespace-nowrap">
            {[...TESTIMONIALS.slice(0, 8), ...TESTIMONIALS.slice(0, 8)].map((t, i) => (
              <TestimonialCard key={i} {...t} index={i} />
            ))}
          </div>
        </div>

        <div className="flex overflow-hidden select-none gap-8 mt-8">
          <div className="flex animate-marquee-slow gap-8 whitespace-nowrap">
            {[...TESTIMONIALS.slice(8), ...TESTIMONIALS.slice(8)].map((t, i) => (
              <TestimonialCard key={i} {...t} index={i + 1} />
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section className="py-20 container mx-auto px-6">
        <div className="glass-emerald rounded-[3rem] p-12 relative overflow-hidden text-center max-w-5xl mx-auto border-emerald-500/20 shadow-2xl shadow-emerald-500/10">
          <div className="absolute inset-0 opacity-5 pointer-events-none flex items-center justify-center">
            <Award className="w-96 h-96 text-white" />
          </div>
          <div className="relative z-10">
            <h3 className="text-3xl md:text-4xl font-black mb-4">Pronto para sua liberdade financeira?</h3>
            <p className="text-gray-200 mb-10 max-w-xl mx-auto text-lg">
              Junte-se a +1.200 expatriados construindo patrimônio real e gerando renda passiva em reais.
            </p>
            <Link
              to="/sign-up"
              className="inline-flex items-center justify-center gap-2 px-12 py-5 text-xl font-black text-[#020617] transition-all bg-white rounded-2xl hover:bg-emerald-400 hover:shadow-2xl active:scale-95 group"
            >
              Criar conta grátis <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <p className="text-emerald-300/60 text-xs mt-4">Sem cartão de crédito. Cancele quando quiser.</p>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-32 bg-[#020617]">
        <div className="container mx-auto px-6 max-w-4xl">
          <div className="text-center mb-16">
            <h3 className="text-4xl font-black">Perguntas Frequentes</h3>
          </div>
          <div className="space-y-6">
            <FAQItem
              question="O app é seguro? Ele acessa minha corretora?"
              answer="Não. O BrasilInvest Pro é 100% read-only. Você importa dados via CSV ou insere manualmente. Nunca pedimos senhas de corretoras. Utilizamos criptografia de nível bancário (SSL 256-bit), Clerk para autenticação e Supabase para dados. Somos GDPR Compliant para residentes em Portugal."
            />
            <FAQItem
              question="Como funciona o alerta de bitributação?"
              answer="O app monitora as leis vigentes do acordo de bitributação Brasil-Portugal e calcula automaticamente o que deve ser declarado em cada país. Você recebe um relatório mensal pronto, com os valores já separados para cada declaração. Isso evita a dupla cobrança e multas desnecessárias."
            />
            <FAQItem
              question="Posso conectar minha corretora do Brasil?"
              answer="Atualmente oferecemos importação via notas de corretagem (PDF/CSV) e gestão manual inteligente. Estamos desenvolvendo integração direta via Open Finance com XP, Rico e Clear — prevista para os próximos meses."
            />
            <FAQItem
              question="O simulador DRIP é preciso?"
              answer="O simulador usa Dividend Yield histórico real dos FIIs cadastrados, taxa de câmbio ao vivo e reinvestimento mensal composto. Os resultados são estimativas baseadas em dados reais — mercado pode variar, mas a projeção reflete o comportamento histórico dos ativos."
            />
            <FAQItem
              question="Posso cancelar o plano quando quiser?"
              answer="Sim. Você pode cancelar a qualquer momento, sem multa e sem burocracia. No plano anual, você economiza 2 meses e mantém acesso até o fim do período contratado."
            />
          </div>
        </div>
      </section>

      {/* ── PLANS ── */}
      <section id="plans" className="py-32 relative">
        <div className="container mx-auto px-6 text-center mb-16">
          <h2 className="text-4xl font-black mb-4">
            Escolha seu caminho para a <span className="text-gradient">Liberdade.</span>
          </h2>
          <p className="text-gray-400 mb-10">Planos flexíveis para cada estágio da sua jornada investidora.</p>

          {/* Billing toggle */}
          <div className="inline-flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl p-1.5">
            <button
              onClick={() => setIsAnnual(false)}
              className={cn(
                'px-6 py-2.5 rounded-xl text-sm font-black transition-all',
                !isAnnual ? 'bg-emerald-500 text-black' : 'text-gray-400 hover:text-white',
              )}
            >
              Mensal
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={cn(
                'px-6 py-2.5 rounded-xl text-sm font-black transition-all flex items-center gap-2',
                isAnnual ? 'bg-emerald-500 text-black' : 'text-gray-400 hover:text-white',
              )}
            >
              Anual <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-black', isAnnual ? 'bg-black/20 text-black' : 'bg-emerald-500/20 text-emerald-400')}>-17%</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 max-w-[1400px] mx-auto px-6 items-stretch">
          <PlanCard
            tag="BRONZE" name="Iniciante"
            priceMonthly="Grátis" priceAnnual="Grátis"
            desc="Organização básica para quem está começando agora."
            features={['Dashboard Real-Time', 'Hub de Mercado', 'Extrato de transações', 'Até 5 ativos', 'Simulador Juros Simples', '20 transações / mês']}
            theme="glass-card" badgeColor="bg-gray-500/20 text-gray-400"
            btnText="Começar Grátis" to="/sign-up" isAnnual={isAnnual}
          />
          <PlanCard
            tag="PRATA" name="Starter"
            priceMonthly="R$ 24,99" priceAnnual="R$ 20,82"
            period="/mês"
            desc="Para evoluir com monitoramento de proventos e rebalanceamento."
            features={['Tudo do Grátis', 'Calendário de Dividendos', 'Rebalanceador básico', 'Importação Manual (CSV)', 'Até 15 ativos', '200 transações / mês']}
            theme="glass-blue" badgeColor="bg-blue-500/20 text-blue-400"
            btnText="Assinar Prata" to="/sign-up" isAnnual={isAnnual}
          />
          <PlanCard
            tag="MAIS POPULAR" name="Pro ⭐"
            priceMonthly="R$ 39,99" priceAnnual="R$ 33,25"
            period="/mês"
            desc="O pacote completo para construir riqueza com inteligência."
            features={['Tudo do Starter', 'Advisor (AI Tutor)', 'Calculadora IR Completa', 'DRIP Simulator Premium', 'Até 30 ativos', '1000 transações / mês']}
            theme="glass-emerald" badgeColor="bg-emerald-400 text-[#020617]"
            popular btnText="Assinar Pro" to="/sign-up" isAnnual={isAnnual}
          />
          <PlanCard
            tag="PLATINA" name="Master"
            priceMonthly="R$ 50,00" priceAnnual="R$ 41,66"
            period="/mês"
            desc="Aparato profissional para expatriados com foco em Portugal."
            features={['Tudo do Pro', 'Radar de Câmbio EUR/BRL', 'Comparador de Ativos Pro', 'Comunidade VIP Hub', 'Importação Automática', 'Até 50 ativos']}
            theme="glass-blue" badgeColor="bg-cyan-500/20 text-cyan-400"
            btnText="Assinar Platina" to="/sign-up" isAnnual={isAnnual}
          />
          <PlanCard
            tag="DIAMANTE" name="Elite"
            priceMonthly="R$ 99,99" priceAnnual="R$ 83,25"
            period="/mês"
            desc="Gestão de alto nível com IA avançada e consultoria humana."
            features={['Tudo do Platina', 'Tax Loss Harvesting (IA)', 'Consultoria Humana Mensal', 'Relatórios Customizados', 'Ativos Ilimitados', 'VIP Concierge 24h']}
            theme="glass-purple" badgeColor="bg-purple-500/20 text-purple-400"
            btnText="Assinar Diamante" to="/sign-up" isAnnual={isAnnual}
          />
        </div>
      </section>

      {/* ── TRUST BAR ── */}
      <section className="py-16 border-t border-white/5 bg-black/20">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {[
              { icon: <Lock className="w-5 h-5 text-emerald-400" />,  title: 'SSL 256-bit',     sub: 'Criptografia bancária' },
              { icon: <Shield className="w-5 h-5 text-blue-400" />,   title: 'GDPR Compliant', sub: 'Lei europeia de dados' },
              { icon: <Gem className="w-5 h-5 text-purple-400" />,    title: 'Stripe Verified', sub: 'Pagamento seguro' },
              { icon: <CheckCircle2 className="w-5 h-5 text-cyan-400" />, title: 'Read-only',  sub: 'Nunca acessa sua corretora' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 glass-card p-4 rounded-2xl border-white/5">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
                  {item.icon}
                </div>
                <div>
                  <div className="text-sm font-black text-white">{item.title}</div>
                  <div className="text-[10px] text-gray-500">{item.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-20 border-t border-white/5 bg-[#020617] relative z-20">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-emerald-500 flex items-center justify-center text-[#020617] font-black shadow-lg">B</div>
              <span className="font-bold text-lg tracking-tighter">BrasilInvest Pro</span>
            </div>
            <p className="text-gray-500 text-sm">© 2024 BrasilInvest Pro. Transformando a vida de brasileiros em Portugal.</p>
            <div className="flex items-center gap-6">
              <Link to="/sign-in" className="text-sm text-gray-400 hover:text-white transition-colors">Termos</Link>
              <Link to="/sign-in" className="text-sm text-gray-400 hover:text-white transition-colors">Privacidade</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
