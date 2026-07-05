import React, { useState, useEffect } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';
import { 
  Brain, CheckCircle, ChevronRight, ChevronLeft, Target, 
  TrendingUp, Shield, DollarSign, Clock, BookOpen, AlertTriangle,
  PieChart as PieIcon, ArrowRight, ShoppingBag, CloudUpload, Loader2,
  Zap, Compass, Wallet, Calendar, ToggleLeft, Activity
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { InvestorProfile, InvestmentPlan, generateInvestmentPlan } from '../services/aiAdvisor';
import { formatCurrency, cn } from '../lib/utils';
import { getAuthenticatedClient, ensureUserProfile } from '../services/database';
import { getUserData, setUserData } from '../services/userData';
import { useStore } from '../store/useStore';
import { PlanMission, PortfolioAlert } from '../types';

type Step = 'intro' | 'risk' | 'goal' | 'capital' | 'horizon' | 'contribution' | 'preferences' | 'result';

type SavedPlan = {
  id: string;
  createdAt: string;
  profile: InvestorProfile;
  plan: InvestmentPlan;
  arcaScore: number;
  arcaProfile: string | null;
};

const AIAdvisor: React.FC = () => {
  const { user } = useUser();
  const { getToken } = useAuth();
  const { missions, alerts, transactions, settings, setMissions, setAlerts, updateMissionStatus } = useStore();
  
  const [currentStep, setCurrentStep] = useState<Step>('intro');
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<InvestmentPlan | null>(null);
  const [savedPlans, setSavedPlans] = useState<SavedPlan[]>([]);
  const [planPersistedInCloud, setPlanPersistedInCloud] = useState<boolean | null>(null);
  const [cloudSaving, setCloudSaving] = useState(false);
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [cloudSuccess, setCloudSuccess] = useState(false);

  const [profile, setProfile] = useState<InvestorProfile>({
    riskTolerance: 'Moderado',
    mainGoal: 'Crescimento Patrimonial',
    timeHorizon: 'Médio (2 a 5 anos)',
    initialCapital: 100000,
    monthlyContribution: 500,
    knowledgeLevel: 'Iniciante',
    preferences: {
      wantsCrypto: false,
      acceptsVolatility: false,
      prefersPassiveIncome: true
    }
  });

  const [arcaAnswers, setArcaAnswers] = useState<{
    q1: number | null;
    q2: number | null;
    q3: number | null;
    q4: number | null;
    q5: number | null;
  }>({
    q1: null,
    q2: null,
    q3: null,
    q4: null,
    q5: null
  });

  const buyTransactions = transactions.filter(t => t.type === 'BUY');

  let contributionStreak = 0;
  if (settings.monthlyContribution > 0 && buyTransactions.length > 0) {
    const monthsWithBuys = new Set<string>();
    buyTransactions.forEach(tx => {
      const d = new Date(tx.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthsWithBuys.add(key);
    });

    const now = new Date();
    let year = now.getFullYear();
    let month = now.getMonth();

    for (;;) {
      const key = `${year}-${String(month + 1).padStart(2, '0')}`;
      if (monthsWithBuys.has(key)) {
        contributionStreak += 1;
        month -= 1;
        if (month < 0) {
          month = 11;
          year -= 1;
        }
      } else {
        break;
      }
    }
  }

  let tutorTipCopy = 'Configure transferências automáticas no dia que seu salário cai. A consistência é mais importante que o valor exato.';
  if (contributionStreak === 0) {
    tutorTipCopy =
      'Comece definindo um valor de aporte mensal e programe uma transferência automática no dia que seu salário cai. No início, a consistência vale mais do que o valor exato.';
  } else if (contributionStreak > 0 && contributionStreak < 6) {
    tutorTipCopy =
      `Você já vem mantendo aportes mensais há ${contributionStreak} ${contributionStreak === 1 ? 'mês' : 'meses'}. Considere travar esse hábito com uma transferência automática no dia que o salário cai.`;
  } else if (contributionStreak >= 6) {
    tutorTipCopy =
      `Excelente: você está há ${contributionStreak} meses seguidos aportando. Proteja esse hábito deixando a transferência automática no dia do salário rodar sozinha.`;
  }

  const buildMissionsFromPlan = (p: InvestmentPlan, prof: InvestorProfile): PlanMission[] => {
    const missionsFromSteps: PlanMission[] = p.steps.map((step) => ({
      id: `step-${step.order}`,
      title: step.title,
      description: step.description,
      status: 'pending',
      category: step.title.toLowerCase().includes('rebalance')
        ? 'rebalanceamento'
        : step.title.toLowerCase().includes('estudo') || step.title.toLowerCase().includes('educa')
        ? 'educacao'
        : undefined
    }));

    const missionsFromMonthly: PlanMission[] = p.monthlyContributionPlan.map((item, idx) => ({
      id: `monthly-${idx}-${item.assetClass}`,
      title: `Aportar em ${item.assetClass}`,
      description: `Aportar ${formatCurrency(item.amount, 'BRL')} por mês em ${item.assetClass}.`,
      status: 'pending',
      category: 'aporte'
    }));

    const baseMission: PlanMission | null =
      prof.monthlyContribution > 0
        ? {
            id: 'monthly-total',
            title: 'Manter aporte mensal',
            description: `Aportar ${formatCurrency(prof.monthlyContribution, 'BRL')} por mês conforme o plano do Tutor.`,
            status: 'pending',
            category: 'aporte'
          }
        : null;

    return [
      ...missionsFromSteps,
      ...missionsFromMonthly,
      ...(baseMission ? [baseMission] : [])
    ];
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!user) return;
    (async () => {
      try {
        const token = await getToken({ template: 'supabase' });
        if (!token) return;
        const data = await getUserData(token, ['ai_plans']);
        if (data['ai_plans'] && Array.isArray(data['ai_plans'])) {
          setSavedPlans(data['ai_plans'] as SavedPlan[]);
        }
      } catch { /* start empty */ }
    })();
  }, [user, getToken]);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const token = await getToken({ template: 'supabase' });
        if (!token) return;
        const client = getAuthenticatedClient(token);
        
        const { data } = await client
          .from('investment_profiles')
          .select('profile_data, generated_plan')
          .single();

        if (data) {
          if (data.profile_data) {
            const rawProfile = data.profile_data as any;
            const missionsState = rawProfile.missions_state as PlanMission[] | undefined;
            const alertsState = rawProfile.alerts_state as PortfolioAlert[] | undefined;
            const { missions_state, alerts_state, ...restProfile } = rawProfile;
            setProfile(prev => ({
              ...prev,
              ...restProfile,
              initialCapital: restProfile.initialCapital ?? 100000
            }));
            if (Array.isArray(missionsState)) {
              setMissions(missionsState);
            }
            if (Array.isArray(alertsState)) {
              setAlerts(alertsState);
            }
          }
          if (data.generated_plan) {
            setPlan(data.generated_plan);
            setPlanPersistedInCloud(true);
            setCurrentStep('result');
          }
        }
      } catch (err) {
        console.log('No existing profile found or error loading.');
      }
    };
    if (user) loadProfile();
  }, [user, getToken]);

  const saveProfile = async (newPlan: InvestmentPlan) => {
    try {
      setCloudSaving(true);
      setCloudError(null);
      if (!user) {
        setPlanPersistedInCloud(false);
        setCloudSaving(false);
        return false;
      }

      const token = await getToken({ template: 'supabase' });
      if (!token) {
        setPlanPersistedInCloud(false);
        setCloudError('Token de autenticação não disponível');
        setCloudSaving(false);
        return false;
      }
      const client = getAuthenticatedClient(token);
      await ensureUserProfile(token, user?.primaryEmailAddress?.emailAddress || undefined);

      const profilePayload: any = {
        ...profile,
        missions_state: missions,
        alerts_state: alerts,
      };

      const { error } = await client
        .from('investment_profiles')
        .upsert({
           // Since user_id is unique, we can use it as conflict key.
           user_id: user?.id, 
           profile_data: profilePayload,
           generated_plan: newPlan,
           updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

      if (error) {
        console.error('Error saving profile:', error);
        setPlanPersistedInCloud(false);
        setCloudError(error.message || 'Erro ao salvar perfil');
        setCloudSaving(false);
        return false;
      }

      const { error: versionError } = await client
        .from('investment_plan_versions')
        .insert({
          user_id: user?.id,
          profile_snapshot: profile,
          plan_snapshot: newPlan,
          arca_score: arcaScore,
          arca_profile: arcaProfile,
          created_at: new Date().toISOString()
        });

      if (versionError) {
        console.error('Error saving plan version:', versionError);
        setCloudError(versionError.message || 'Erro ao salvar versão do plano');
      }

      setPlanPersistedInCloud(true);
      setCloudSaving(false);
      setCloudSuccess(true);
      setTimeout(() => setCloudSuccess(false), 4000);
      return true;
    } catch (e) {
      console.error('Save failed', e);
      setPlanPersistedInCloud(false);
      setCloudError((e as any)?.message || 'Falha ao salvar na nuvem');
      setCloudSaving(false);
      return false;
    }
  };

  const generatePlan = () => {
    setLoading(true);
    setPlanPersistedInCloud(null);
    setTimeout(() => {
      const newPlan = generateInvestmentPlan(profile);
      setPlan(newPlan);
      const missionsFromPlan = buildMissionsFromPlan(newPlan, profile);
      setMissions(missionsFromPlan);
      saveProfile(newPlan);
      const newSaved: SavedPlan = {
        id: `${Date.now()}`,
        createdAt: new Date().toISOString(),
        profile,
        plan: newPlan,
        arcaScore,
        arcaProfile
      };
      setSavedPlans(prev => {
        const updated = [newSaved, ...prev].slice(0, 3);
        // Save to Supabase (fire-and-forget)
        getToken({ template: 'supabase' }).then(token => {
          if (token) setUserData(token, [{ data_key: 'ai_plans', data_value: updated }]).catch(() => {});
        }).catch(() => {});
        return updated;
      });
      setCurrentStep('result');
      setLoading(false);
    }, 1500); // Fake AI delay for UX
  };

  const handleNext = (next: Step) => setCurrentStep(next);

  const arcaScore =
    (arcaAnswers.q1 ?? 0) +
    (arcaAnswers.q2 ?? 0) +
    (arcaAnswers.q3 ?? 0) +
    (arcaAnswers.q4 ?? 0) +
    (arcaAnswers.q5 ?? 0);

  const arcaProfile =
    arcaScore === 0
      ? null
      : arcaScore <= 11
      ? 'Conservador'
      : arcaScore <= 19
      ? 'Moderado'
      : 'Arrojado';

  const allArcaAnswered =
    arcaAnswers.q1 !== null &&
    arcaAnswers.q2 !== null &&
    arcaAnswers.q3 !== null &&
    arcaAnswers.q4 !== null &&
    arcaAnswers.q5 !== null;

  const handleArcaAnswer = (question: 'q1' | 'q2' | 'q3' | 'q4' | 'q5', value: number) => {
    setArcaAnswers((prev) => ({ ...prev, [question]: value }));
  };

  const handleRiskNext = () => {
    if (!allArcaAnswered || !arcaProfile) return;
    const mappedRisk: InvestorProfile['riskTolerance'] =
      arcaProfile === 'Conservador' ? 'Conservador' : arcaProfile === 'Moderado' ? 'Moderado' : 'Agressivo';
    setProfile((prev) => ({ ...prev, riskTolerance: mappedRisk }));
    handleNext('goal');
  };

  const handleLoadSavedPlan = (saved: SavedPlan) => {
    setProfile(saved.profile);
    setPlan(saved.plan);
    const missionsFromPlan = buildMissionsFromPlan(saved.plan, saved.profile);
    setMissions(missionsFromPlan);
    saveProfile(saved.plan);
    setCurrentStep('result');
  };

  // --- Render Steps ---

  const renderIntro = () => (
    <div className="flex flex-col items-center justify-center text-center space-y-10 max-w-3xl mx-auto py-16 animate-in fade-in zoom-in duration-1000">
      <div className="relative">
        <div className="absolute inset-0 bg-emerald-500/20 blur-[50px] animate-pulse rounded-full" />
        <div className="bg-white/5 p-10 rounded-[3rem] border border-white/10 relative z-10 shadow-2xl">
          <Brain className="w-20 h-20 text-emerald-400" />
        </div>
      </div>
      
      <div className="space-y-4">
        <div className="flex items-center justify-center gap-3">
          <h1 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tighter">
            Neural <span className="text-emerald-500">Advisor</span>
          </h1>
          <span className="bg-emerald-500 text-black text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg shadow-emerald-500/20">Protocol v4.0</span>
        </div>
        <p className="text-gray-500 text-lg font-bold uppercase tracking-[0.15em] max-w-xl mx-auto leading-relaxed">
          Initialize your wealth deployment strategy with advanced logic and risk parity.
        </p>
      </div>

      <div className="glass-card rounded-[2.5rem] border-white/5 p-10 text-left w-full max-w-xl relative overflow-hidden group">
        <div className="absolute -top-10 -right-10 opacity-5 group-hover:opacity-10 transition-opacity">
           <Zap className="w-40 h-40 text-emerald-500" />
        </div>
        <h3 className="text-sm font-black text-emerald-500 uppercase tracking-[0.3em] mb-8 flex items-center gap-3">
          <CheckCircle className="w-5 h-5"/> Output Expectations
        </h3>
        <ul className="space-y-6 text-gray-400 font-black uppercase text-[11px] tracking-widest">
          <li className="flex items-center gap-4"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,1)]" /> Structural Risk Diagnosis</li>
          <li className="flex items-center gap-4"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,1)]" /> Optimized Asset Correlation (ARCA)</li>
          <li className="flex items-center gap-4"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,1)]" /> Multi-Phase Deployment Roadmap</li>
          <li className="flex items-center gap-4"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,1)]" /> Algorithmic Rebalancing Logic</li>
        </ul>
      </div>

      <button 
        onClick={() => handleNext('risk')}
        className="bg-white text-black font-black uppercase text-xs tracking-[0.3em] py-5 px-12 rounded-2xl hover:bg-emerald-500 transition-all transform hover:scale-105 shadow-2xl shadow-emerald-500/10 flex items-center gap-4 group"
      >
        Initialize Consult <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform"/>
      </button>
    </div>
  );

  const renderRisk = () => (
    <div className="space-y-10 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
           <h2 className="text-3xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
             <Shield className="w-8 h-8 text-emerald-500" /> Risk Spectrum <span className="text-emerald-500">Calibration</span>
           </h2>
           <p className="text-[10px] text-gray-600 font-black uppercase tracking-[0.3em]">Phase 01: Quantifying Volatility Tolerance</p>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl px-6 py-3 flex items-center gap-4">
           <div className="text-right">
              <div className="text-[9px] text-gray-600 font-black uppercase tracking-widest">Active Profile</div>
              <div className="text-emerald-500 font-black uppercase text-xs tracking-tighter">{arcaProfile ?? 'Pending Analysis'}</div>
           </div>
           <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-black font-black text-xs shadow-lg shadow-emerald-500/20">
              {arcaScore > 0 ? arcaScore : '?'}
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-8">
          <p className="text-gray-500 text-sm font-bold uppercase tracking-widest leading-relaxed">
            Organizing your capital into the four quadrants: <span className="text-white">Safety, Income, Growth, and Global</span>. 
            Calibrate your perspective on a hypothetical R$ 100k exposure.
          </p>

          <div className="space-y-12">
            {[
              {
                id: 'q1',
                title: 'What is your primary deployment objective?',
                options: [
                  { label: 'Preserve existing capital and minimize drawdown.', points: 1 },
                  { label: 'Outperform inflation with calculated volatility.', points: 3 },
                  { label: 'Maximize long-term growth via high equity beta.', points: 5 }
                ]
              },
              {
                id: 'q2',
                title: 'Define your strategy duration (Time Horizon)?',
                options: [
                  { label: 'Short-term focus (under 2 years).', points: 1 },
                  { label: 'Mid-term consolidation (2 to 5 years).', points: 3 },
                  { label: 'Long-term compounding (over 5 years).', points: 5 }
                ]
              },
              {
                id: 'q3',
                title: 'Reaction to a 15% local market flash crash?',
                options: [
                  { label: 'Immediate liquidation to prevent further loss.', points: 1 },
                  { label: 'Maintain position but halt further risk exposure.', points: 3 },
                  { label: 'Aggressive buy-in opportunity at lower cost.', points: 5 }
                ]
              },
              {
                id: 'q4',
                title: 'Current market knowledge & domain expertise?',
                options: [
                  { label: 'Novice: Familiar with basic savings/credit only.', points: 1 },
                  { label: 'Intermediate: Understand correlation and alpha.', points: 3 },
                  { label: 'Expert: Proficient in asset analysis and cycles.', points: 5 }
                ]
              },
              {
                id: 'q5',
                title: 'Emergency liquidity status (Off-plan)?',
                options: [
                  { label: 'None: These funds represent total liquidity.', points: 1 },
                  { label: 'Partial: These funds include my safety net.', points: 3 },
                  { label: 'Full: Separate emergency funds already secured.', points: 5 }
                ]
              }
            ].map((q, qIdx) => (
              <div key={q.id} className="glass-card rounded-[2.5rem] p-8 border-white/5 space-y-6 hover:border-white/10 transition-all">
                <div className="flex items-center gap-4 text-xs font-black text-white uppercase tracking-widest">
                  <span className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-gray-500 font-mono">
                    {qIdx + 1}
                  </span>
                  <span>{q.title}</span>
                </div>
                <div className="flex flex-col gap-3 ml-2">
                  {q.options.map((opt, oIdx) => (
                    <button
                      key={oIdx}
                      onClick={() => handleArcaAnswer(q.id as any, opt.points)}
                      className={cn(
                        "w-full text-left p-6 rounded-2xl border text-[11px] font-black uppercase tracking-widest transition-all relative overflow-hidden group",
                        arcaAnswers[q.id as keyof typeof arcaAnswers] === opt.points
                          ? "bg-emerald-500 text-black border-emerald-500 shadow-xl shadow-emerald-500/10"
                          : "bg-white/[0.01] border-white/5 text-gray-600 hover:text-white hover:border-white/10"
                      )}
                    >
                      <span className="relative z-10">{opt.label}</span>
                      <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-20 font-mono text-xs">{opt.points} PTS</div>
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <div className="flex justify-between items-center pt-10 border-t border-white/5">
              <button
                onClick={() => setCurrentStep('intro')}
                className="text-gray-700 hover:text-white text-[10px] font-black uppercase tracking-[0.2em] transition-all"
              >
                ← Back to Intro
              </button>
              
              <button
                onClick={handleRiskNext}
                disabled={!allArcaAnswered}
                className={cn(
                  "px-12 py-5 rounded-2xl font-black uppercase tracking-[0.25em] text-[11px] transition-all shadow-2xl",
                  allArcaAnswered
                    ? "bg-emerald-500 text-black shadow-emerald-500/20 hover:scale-105 active:scale-95"
                    : "bg-white/5 text-gray-700 cursor-not-allowed"
                )}
              >
                Analyze Protocol →
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="glass-card rounded-[2.5rem] border-emerald-500/20 bg-emerald-500/[0.02] p-8 space-y-6 sticky top-8">
            <div className="flex items-center gap-3">
              <BookOpen className="w-5 h-5 text-emerald-500" />
              <span className="text-emerald-500 font-black text-[11px] uppercase tracking-[0.3em]">
                Methodology
              </span>
            </div>
            <p className="text-gray-500 text-[11px] font-bold uppercase tracking-widest leading-loose">
              The advisor utilizes a multi-factor weighting engine based on the ARCA philosophy. It isolates structural risks before suggesting yield-generating assets.
            </p>
            <div className="space-y-4 pt-4 border-t border-white/5">
              <div className="space-y-1">
                 <div className="text-[10px] text-white font-black uppercase tracking-widest">5 to 11 pts</div>
                 <div className="text-[9px] text-gray-600 font-bold uppercase tracking-widest italic">Defensive Protocol (Drawdown focus)</div>
              </div>
              <div className="space-y-1">
                 <div className="text-[10px] text-white font-black uppercase tracking-widest">12 to 19 pts</div>
                 <div className="text-[9px] text-gray-600 font-bold uppercase tracking-widest italic">Equilibrium Protocol (Growth/Safety)</div>
              </div>
              <div className="space-y-1">
                 <div className="text-[10px] text-white font-black uppercase tracking-widest">20 to 25 pts</div>
                 <div className="text-[9px] text-gray-600 font-bold uppercase tracking-widest italic">Explorer Protocol (Multiplication focus)</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderGoal = () => (
    <div className="space-y-10 max-w-xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-4 py-1.5 rounded-full">
           <Target className="w-4 h-4 text-emerald-500" />
           <span className="text-[10px] text-emerald-500 font-black uppercase tracking-[0.3em]">Phase 02</span>
        </div>
        <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Strategic <span className="text-emerald-500">Objective</span></h2>
        <p className="text-gray-500 text-[11px] font-black uppercase tracking-widest">Select the primary purpose for this capital deployment.</p>
      </div>
      
      <div className="grid grid-cols-1 gap-4">
        {[
          { id: 'Reserva de Emergência', icon: Shield, desc: 'Capital preservation and high liquidity.' },
          { id: 'Renda Passiva', icon: DollarSign, desc: 'Consistent yield generation and recurring cashflow.' },
          { id: 'Crescimento Patrimonial', icon: TrendingUp, desc: 'Aggressive equity accumulation and alpha.' },
          { id: 'Aposentadoria', icon: Clock, desc: 'Ultra long-term security and compound growth.' },
          { id: 'Curto Prazo', icon: Calendar, desc: 'Specific tactical goal within a 24-month window.' }
        ].map((goal) => {
          const Icon = goal.icon;
          return (
            <button
              key={goal.id}
              onClick={() => setProfile({ ...profile, mainGoal: goal.id as any })}
              className={cn(
                "w-full text-left p-6 rounded-[2rem] border transition-all flex items-center gap-6 group relative overflow-hidden",
                profile.mainGoal === goal.id
                  ? "bg-emerald-500 border-emerald-500 shadow-2xl shadow-emerald-500/20" 
                  : "bg-white/[0.02] border-white/5 hover:border-white/10"
              )}
            >
              <div className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center transition-all",
                profile.mainGoal === goal.id ? "bg-white/20" : "bg-white/5 group-hover:bg-white/10"
              )}>
                <Icon className={cn("w-6 h-6", profile.mainGoal === goal.id ? "text-white" : "text-gray-500")} />
              </div>
              <div>
                <span className={cn("block font-black uppercase text-xs tracking-widest", profile.mainGoal === goal.id ? "text-black" : "text-white")}>
                  {goal.id}
                </span>
                <span className={cn("text-[10px] font-bold uppercase tracking-tight", profile.mainGoal === goal.id ? "text-black/60" : "text-gray-500")}>
                  {goal.desc}
                </span>
              </div>
              {profile.mainGoal === goal.id && (
                <div className="absolute right-8">
                   <div className="bg-white/20 w-3 h-3 rounded-full animate-ping" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex justify-between pt-8 items-center">
        <button 
          onClick={() => setCurrentStep('risk')} 
          className="text-gray-700 hover:text-white text-[10px] font-black uppercase tracking-widest transition-all"
        >
          ← Previous Protocol
        </button>
        <button 
          onClick={() => handleNext('capital')} 
          className="bg-white text-black font-black uppercase text-xs tracking-[0.2em] py-5 px-12 rounded-2xl hover:bg-emerald-500 transition-all translate-y-0 active:translate-y-1 shadow-2xl shadow-black/40"
        >
          Deploy Intelligence →
        </button>
      </div>
    </div>
  );

  const renderCapital = () => (
    <div className="space-y-10 max-w-xl mx-auto animate-in fade-in zoom-in duration-700">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-4 py-1.5 rounded-full">
           <Wallet className="w-4 h-4 text-emerald-500" />
           <span className="text-[10px] text-emerald-500 font-black uppercase tracking-[0.3em]">Phase 03</span>
        </div>
        <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Current <span className="text-emerald-500">Inventory</span></h2>
        <p className="text-gray-500 text-[11px] font-black uppercase tracking-widest leading-relaxed">
          Estimate total assets to be synchronized with the Bússola Protocol.
        </p>
      </div>

      <div className="glass-card rounded-[3rem] border-white/5 p-12 space-y-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-[40px] rounded-full" />
        
        <div className="space-y-1">
          <label className="text-[10px] text-gray-600 font-black uppercase tracking-widest ml-1">Deployable Capital (BRL)</label>
          <div className="relative group">
            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-emerald-500 font-black text-2xl">R$</div>
            <input
              type="number"
              min={0}
              value={profile.initialCapital}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  initialCapital: Number(e.target.value) || 0
                })
              }
              className="w-full bg-white/5 border border-white/10 rounded-3xl px-16 py-8 text-white text-4xl font-black outline-none focus:border-emerald-500/50 focus:bg-white/[0.08] transition-all"
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="bg-black/20 rounded-[2rem] p-6 border border-white/5">
           <div className="flex items-start gap-4">
              <Activity className="w-5 h-5 text-gray-500 mt-1" />
              <p className="text-gray-500 text-[11px] font-bold uppercase tracking-widest leading-relaxed">
                Aggregated value including <span className="text-white">Fixed Income, FIIs, Equities, and Liquid Cash</span>. Accurate data yields better parity suggestions.
              </p>
           </div>
        </div>
      </div>

      <div className="flex justify-between pt-8 items-center">
        <button 
          onClick={() => setCurrentStep('goal')} 
          className="text-gray-700 hover:text-white text-[10px] font-black uppercase tracking-widest transition-all"
        >
          ← Previous Phase
        </button>
        <button 
          onClick={() => handleNext('horizon')} 
          disabled={profile.initialCapital <= 0}
          className={cn(
            "font-black uppercase text-xs tracking-[0.2em] py-5 px-12 rounded-2xl transition-all shadow-2xl",
            profile.initialCapital > 0 
              ? "bg-white text-black hover:bg-emerald-500" 
              : "bg-white/5 text-gray-700 cursor-not-allowed"
          )}
        >
          Advance Core →
        </button>
      </div>
    </div>
  );

  const renderResult = () => {
    if (!plan) return null;
    return (
      <div className="space-y-12 animate-in fade-in duration-1000 pb-32">
        {/* Header Protocol */}
        <div className="glass-card rounded-[3rem] border-emerald-500/20 bg-emerald-500/[0.02] p-10 relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-emerald-500/10 blur-[80px] rounded-full" />
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                 <div className="bg-emerald-500 p-3 rounded-2xl shadow-xl shadow-emerald-500/20">
                    <Brain className="w-6 h-6 text-black" />
                 </div>
                 <div>
                    <h2 className="text-3xl font-black text-white uppercase tracking-tighter">{plan.profileAnalysis.title}</h2>
                    <div className="text-[10px] text-emerald-500 font-black uppercase tracking-[0.3em]">Neural Protocol Established</div>
                 </div>
              </div>
              <p className="text-gray-400 font-bold text-sm uppercase tracking-widest leading-relaxed max-w-2xl">{plan.profileAnalysis.description}</p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            {plan.profileAnalysis.warnings.map((w, i) => (
              <div key={i} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-yellow-500/10 text-yellow-500 px-4 py-2 rounded-xl border border-yellow-500/20">
                <AlertTriangle className="w-3 h-3" /> {w}
              </div>
            ))}
          </div>

          <div className="mt-10 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-4">
               {planPersistedInCloud === true ? (
                 <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-500/5 px-4 py-2 rounded-xl border border-emerald-500/20">
                    <CheckCircle className="w-3 h-3" /> Encrypted Cloud Sync Active
                 </div>
               ) : (
                 <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500 bg-white/5 px-4 py-2 rounded-xl border border-white/5">
                    <Activity className="w-3 h-3" /> Local Session Only
                 </div>
               )}
            </div>

            <div className="flex items-center gap-3">
               <button
                 disabled={!plan || cloudSaving}
                 onClick={() => plan && saveProfile(plan)}
                 className={cn(
                   "flex items-center gap-3 text-[10px] font-black uppercase tracking-widest px-6 py-3 rounded-xl border transition-all",
                   cloudSaving
                     ? "bg-white/5 text-gray-600 border-white/5 cursor-not-allowed"
                     : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500 hover:text-black hover:border-emerald-500 shadow-xl shadow-emerald-500/5"
                 )}
               >
                 {cloudSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CloudUpload className="w-3 h-3" />}
                 {cloudSaving ? 'Syncing...' : 'Sync to Cloud'}
               </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Allocation Matrix */}
          <div className="glass-card rounded-[3rem] border-white/5 p-10 space-y-8">
            <div className="flex justify-between items-center">
               <h3 className="text-sm font-black text-white uppercase tracking-[0.3em] flex items-center gap-3">
                 <PieIcon className="w-5 h-5 text-emerald-500"/> Allocation Matrix
               </h3>
               <div className="text-right">
                  <div className="text-[9px] text-gray-600 font-black uppercase tracking-widest">Base Inventory</div>
                  <div className="text-white font-black text-xl">{formatCurrency(plan.baseCapital ?? 0, 'BRL')}</div>
               </div>
            </div>

            <div className="h-[300px] w-full relative">
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                 <div className="text-center">
                    <div className="text-[10px] text-gray-600 font-black uppercase tracking-widest">Target</div>
                    <div className="text-emerald-500 font-black text-2xl">Parity</div>
                 </div>
              </div>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={plan.allocationStrategy}
                    innerRadius={80}
                    outerRadius={110}
                    paddingAngle={8}
                    dataKey="percentage"
                    nameKey="assetClass"
                    stroke="none"
                  >
                    {plan.allocationStrategy.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#020617', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '1.5rem', padding: '15px' }}
                    itemStyle={{ color: '#fff', fontSize: '10px', textTransform: 'uppercase', fontWeight: '900' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-4">
              {plan.allocationStrategy.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center p-4 rounded-2xl bg-white/[0.01] border border-white/5 group hover:border-emerald-500/30 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-2 h-2 rounded-full shadow-[0_0_10px_currentColor]" style={{ backgroundColor: item.color, color: item.color }}></div>
                    <span className="text-[11px] font-black uppercase tracking-widest text-gray-400 group-hover:text-white transition-colors">{item.assetClass}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-white tracking-tighter text-lg">{item.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Deployment Schedule */}
          <div className="glass-card rounded-[3rem] border-white/5 p-10 space-y-8 flex flex-col">
            <div className="flex justify-between items-center">
               <h3 className="text-sm font-black text-white uppercase tracking-[0.3em] flex items-center gap-3">
                 <DollarSign className="w-5 h-5 text-emerald-500"/> Deployment Schedule
               </h3>
               <div className="text-right">
                  <div className="text-[9px] text-gray-600 font-black uppercase tracking-widest">Monthly Batch</div>
                  <div className="text-white font-black text-xl">{formatCurrency(profile.monthlyContribution, 'BRL')}</div>
               </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
              <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Deployment Streak</span>
              {contributionStreak > 0 ? (
                <div className="flex items-center gap-2">
                   <Zap className="w-3 h-3 text-emerald-500" />
                   <span className="text-[11px] text-emerald-400 font-black uppercase tracking-tighter">
                     {contributionStreak} Cycles Active
                   </span>
                </div>
              ) : (
                <span className="text-[11px] text-gray-600 font-black uppercase tracking-tighter">Initialize Sequence</span>
              )}
            </div>

            <div className="space-y-3 flex-1">
              {plan.monthlyContributionPlan.map((item, idx) => (
                <div key={idx} className="bg-white/[0.02] p-5 rounded-2xl border border-white/5 flex justify-between items-center hover:bg-white/[0.04] transition-all group">
                   <div className="space-y-1">
                      <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest block">Node</span>
                      <span className="text-white font-black uppercase text-xs tracking-widest group-hover:text-emerald-500 transition-colors">{item.assetClass}</span>
                   </div>
                   <div className="text-right">
                      <span className="text-emerald-500 font-black text-lg tracking-tighter">{formatCurrency(item.amount, 'BRL')}</span>
                      <div className="text-[9px] text-gray-600 font-bold uppercase tracking-widest">Allocation</div>
                   </div>
                </div>
              ))}
            </div>

            <div className="mt-8 bg-black/40 p-6 rounded-[2rem] border border-white/5 relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
               <h4 className="text-blue-400 font-black uppercase text-[10px] tracking-[0.3em] mb-3 flex items-center gap-2">
                 <Brain className="w-4 h-4" /> Neural Insight
               </h4>
               <p className="text-gray-500 text-[11px] font-bold uppercase tracking-widest leading-loose italic">"{tutorTipCopy}"</p>
            </div>
          </div>
        </div>

        {/* Operational Missions */}
        <div className="glass-card rounded-[3rem] border-white/5 p-10">
          <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-1">
              <h3 className="text-sm font-black text-white uppercase tracking-[0.3em] flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-500"/> Operational Missions
              </h3>
              <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest">Phase-specific tasks for protocol alignment.</p>
            </div>
            <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl border border-white/5">
               <div className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Completion</div>
               <div className="text-xs font-black text-white uppercase">
                 {missions.filter(m => m.status === 'completed').length}/{missions.length}
               </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {missions.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => updateMissionStatus(m.id, m.status === 'pending' ? 'completed' : 'pending')}
                className={cn(
                  "flex items-center gap-6 p-6 rounded-[2rem] border text-left transition-all relative overflow-hidden group",
                  m.status === 'completed'
                    ? "bg-emerald-500/10 border-emerald-500/40 opacity-60"
                    : "bg-white/[0.02] border-white/5 hover:border-emerald-500/50"
                )}
              >
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-lg",
                  m.status === 'completed' ? "bg-emerald-500 text-black shadow-emerald-500/20" : "bg-white/5 text-gray-500"
                )}>
                  {m.status === 'completed' ? '✓' : '•'}
                </div>
                <div className="flex-1">
                  <div className={cn("text-xs font-black uppercase tracking-widest mb-1", m.status === 'completed' ? "text-emerald-500" : "text-white")}>{m.title}</div>
                  <div className="text-[10px] font-bold uppercase tracking-tight text-gray-500 line-clamp-1 group-hover:line-clamp-none transition-all">{m.description}</div>
                </div>
                {m.status === 'completed' && (
                  <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rotate-45 translate-x-10 -translate-y-10" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tactical Inventory Recommendations */}
        <div className="space-y-10">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1">
                   <h3 className="text-sm font-black text-white uppercase tracking-[0.3em] flex items-center gap-3">
                     <ShoppingBag className="w-5 h-5 text-emerald-500"/> Active Deployment Recommendations
                   </h3>
                   <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest italic">Optimized nodes for current market phase.</p>
                </div>
                <div className="bg-white/5 px-4 py-2 rounded-xl border border-white/5 text-[9px] font-black uppercase tracking-widest text-emerald-500">
                   Real-time Alpha Scoring Enabled
                </div>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {plan.tacticalRecommendations?.map((rec, idx) => (
                   <div key={idx} className="glass-card rounded-[3rem] border-white/5 overflow-hidden flex flex-col group hover:border-emerald-500/30 transition-all">
                      <div className="p-8 border-b border-white/5 bg-white/[0.02] space-y-4">
                         <div className="flex justify-between items-center">
                            <h4 className="font-black text-white uppercase text-xs tracking-widest">{rec.assetClass}</h4>
                            <span className="text-emerald-500 font-black text-lg tracking-tighter">{formatCurrency(rec.totalAmount, 'BRL')}</span>
                         </div>
                         <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-relaxed">"{rec.rationale}"</p>
                         </div>
                      </div>
                      
                      <div className="p-8 space-y-4">
                         {rec.suggestions.length > 0 ? (
                            rec.suggestions.map((asset, i) => (
                               <div key={i} className="bg-white/[0.01] p-5 rounded-2xl border border-white/5 hover:border-emerald-500/20 transition-all group/asset relative overflow-hidden">
                                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/[0.02] blur-2xl rounded-full" />
                                  <div className="flex justify-between items-start relative z-10">
                                     <div className="space-y-1">
                                        <div className="text-white font-black uppercase text-xs tracking-[0.2em]">{asset.ticker}</div>
                                        <div className="text-[9px] text-gray-600 font-bold uppercase tracking-widest">{asset.name}</div>
                                     </div>
                                     <div className="text-right">
                                        <div className="text-emerald-500 font-black text-sm tracking-tighter">{formatCurrency(asset.total, 'BRL')}</div>
                                        <div className="text-[9px] text-gray-600 font-bold uppercase tracking-widest">{asset.quantity} x {formatCurrency(asset.price, 'BRL')}</div>
                                     </div>
                                  </div>
                                  <div className="mt-4 text-[9px] font-black uppercase tracking-[0.2em] text-blue-400 bg-blue-500/5 px-3 py-1.5 rounded-xl border border-blue-500/10 w-fit flex items-center gap-2">
                                     <Target className="w-3 h-3" /> {asset.reason}
                                  </div>
                               </div>
                            ))
                         ) : (
                            <div className="text-center py-10">
                               <div className="text-[10px] text-gray-700 font-black uppercase tracking-[0.4em]">No specific nodes detected</div>
                            </div>
                         )}
                      </div>
                   </div>
                ))}
             </div>
        </div>

        {/* Roadmap Steps */}
        <div className="space-y-8">
           <h3 className="text-sm font-black text-white uppercase tracking-[0.3em] flex items-center gap-3">
             <Activity className="w-5 h-5 text-emerald-500"/> Strategic Roadmap
           </h3>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plan.steps.map((step) => (
                <div key={step.order} className="glass-card rounded-[3rem] border-white/5 p-8 hover:border-emerald-500/50 transition-all group text-left relative overflow-hidden">
                   <div className="absolute right-0 bottom-0 opacity-5 group-hover:scale-110 transition-transform">
                      <div className="text-9xl font-black text-white">{step.order}</div>
                   </div>
                   <div className="text-emerald-500 font-black text-[10px] uppercase tracking-[0.5em] mb-4">Phase 0{step.order}</div>
                   <h4 className="text-white font-black uppercase text-xs tracking-widest mb-4 group-hover:text-emerald-500 transition-colors leading-relaxed">{step.title}</h4>
                   <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest leading-loose">{step.description}</p>
                </div>
              ))}
           </div>
        </div>

        <div className="flex flex-col md:flex-row gap-8 pt-12">
          {/* Initial Allocation Distribution */}
          <div className="glass-card rounded-[3rem] border-white/5 p-10 flex-1">
            <h3 className="text-sm font-black text-white uppercase tracking-[0.3em] mb-10 flex items-center gap-3">
              <Wallet className="w-5 h-5 text-emerald-500" /> Initial Parity Matrix
            </h3>
            <div className="space-y-4">
              {plan.initialAllocationPlan && plan.initialAllocationPlan.length > 0 ? (
                plan.initialAllocationPlan.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center p-6 rounded-[2rem] bg-white/[0.01] border border-white/5 hover:border-white/10 transition-all group"
                  >
                    <div className="space-y-1">
                      <span className="text-white font-black uppercase text-xs tracking-widest group-hover:text-emerald-500 transition-colors">{item.assetClass}</span>
                      <span className="text-[10px] text-gray-600 font-black uppercase tracking-widest block">
                        Target: {item.percentage.toFixed(1)}% Weight
                      </span>
                    </div>
                    <div className="text-right">
                       <span className="text-emerald-500 font-black text-lg tracking-tighter">
                         {formatCurrency(item.amount, 'BRL')}
                       </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest text-center py-10">Historical Data Required for Matrix Update.</p>
              )}
            </div>
          </div>

          {/* Historical Plans Archive */}
          <div className="glass-card rounded-[3rem] border-white/5 p-10 w-full md:w-96">
            <h3 className="text-sm font-black text-white uppercase tracking-[0.3em] mb-10 flex items-center gap-3">
              <Clock className="w-5 h-5 text-emerald-500" /> Plan Archive
            </h3>
            <div className="space-y-4">
              {savedPlans.length === 0 && (
                <div className="text-center py-10 text-gray-700 text-[10px] font-black uppercase tracking-widest italic">No ARCHIVAL RECORDS found.</div>
              )}
              {savedPlans.map((saved) => (
                <button
                  key={saved.id}
                  onClick={() => handleLoadSavedPlan(saved)}
                  className="w-full text-left p-6 rounded-3xl border border-white/5 bg-white/[0.02] hover:border-emerald-500/50 transition-all group"
                >
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-white text-[11px] font-black uppercase tracking-widest">
                      {saved.arcaProfile ?? 'Protocol'} Log
                    </span>
                    <span className="text-[9px] text-gray-600 font-bold uppercase tracking-tight">
                      {new Date(saved.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                       <span className="text-gray-500">Inventory</span>
                       <span className="text-white">{formatCurrency(saved.plan.baseCapital ?? 0, 'BRL')}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                       <span className="text-gray-500">Batch</span>
                       <span className="text-white">{formatCurrency(saved.profile.monthlyContribution, 'BRL')}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-center pt-20 border-t border-white/5">
           <button 
             onClick={() => setCurrentStep('intro')} 
             className="text-gray-700 hover:text-emerald-500 text-[10px] font-black uppercase tracking-[0.4em] transition-all flex items-center gap-4 group"
           >
             <ToggleLeft className="w-5 h-5 group-hover:-translate-x-2 transition-transform" /> Re-initialize Protocol Analysis
           </button>
        </div>
      </div>
    );
  };

  // --- Main Render Switch ---

  return (
    <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-screen">
       {cloudSuccess && (
         <div className="fixed bottom-6 right-6 z-50 bg-emerald-500 text-white px-4 py-3 rounded-xl shadow-lg shadow-emerald-500/40 flex items-center gap-3 text-sm">
           <CheckCircle className="w-4 h-4" />
           <div>
             <div className="font-bold text-xs uppercase tracking-wide">Plano salvo na nuvem</div>
             <div className="text-[11px] text-emerald-50/90">Seu plano oficial foi atualizado e está pronto para uso no Rebalancear.</div>
           </div>
         </div>
       )}
       {loading ? (
         <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
            <Brain className="w-16 h-16 text-emerald-500 animate-bounce" />
            <p className="text-xl text-white font-medium animate-pulse">Processando seu perfil...</p>
            <p className="text-sm text-gray-500">Analisando milhares de cenários de alocação</p>
         </div>
       ) : (
         <>
           {currentStep === 'intro' && renderIntro()}
           {currentStep === 'risk' && renderRisk()}
          {currentStep === 'goal' && renderGoal()}
          {currentStep === 'capital' && renderCapital()}
           {currentStep === 'horizon' && (
             <div className="space-y-10 max-w-xl mx-auto animate-in fade-in slide-in-from-right-8 duration-700">
                <div className="text-center space-y-4">
                  <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-4 py-1.5 rounded-full">
                     <Clock className="w-4 h-4 text-emerald-500" />
                     <span className="text-[10px] text-emerald-500 font-black uppercase tracking-[0.3em]">Phase 04</span>
                  </div>
                  <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Temporal <span className="text-emerald-500">Horizon</span></h2>
                  <p className="text-gray-500 text-[11px] font-black uppercase tracking-widest">Duration of the capital lock-up or strategy cycle.</p>
                </div>

                <div className="space-y-4">
                  {[
                    { id: 'Curto (até 2 anos)', desc: 'Cyclical focus / High liquidity preference.' },
                    { id: 'Médio (2 a 5 anos)', desc: 'Structural growth / Moderate risk parity.' },
                    { id: 'Longo (5+ anos)', desc: 'Generational wealth / Maximum compounding.' }
                  ].map((opt) => (
                    <button 
                      key={opt.id} 
                      onClick={() => setProfile({ ...profile, timeHorizon: opt.id as any })} 
                      className={cn(
                        "w-full text-left p-6 rounded-3xl border transition-all flex justify-between items-center group",
                        profile.timeHorizon === opt.id 
                          ? "bg-emerald-500 border-emerald-500 text-black shadow-xl shadow-emerald-500/10" 
                          : "bg-white/[0.02] border-white/5 text-white hover:border-white/10"
                      )}
                    >
                      <div>
                        <span className="block font-black uppercase text-xs tracking-widest">{opt.id}</span>
                        <span className={cn("text-[10px] font-bold uppercase tracking-tight", profile.timeHorizon === opt.id ? "text-black/60" : "text-gray-500")}>
                          {opt.desc}
                        </span>
                      </div>
                      {profile.timeHorizon === opt.id && <ChevronRight className="w-5 h-5 text-black" />}
                    </button>
                  ))}
                </div>

                <div className="flex justify-between pt-8 items-center">
                    <button onClick={() => setCurrentStep('capital')} className="text-gray-700 hover:text-white text-[10px] font-black uppercase tracking-widest transition-all">← Back</button>
                    <button onClick={() => handleNext('contribution')} className="bg-white text-black font-black uppercase text-xs tracking-[0.2em] py-5 px-12 rounded-2xl hover:bg-emerald-500 transition-all shadow-2xl">Deploy Logic →</button>
                </div>
             </div>
           )}
           {currentStep === 'contribution' && (
             <div className="space-y-10 max-w-xl mx-auto animate-in fade-in slide-in-from-right-8 duration-700">
                <div className="text-center space-y-4">
                  <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-4 py-1.5 rounded-full">
                     <TrendingUp className="w-4 h-4 text-emerald-500" />
                     <span className="text-[10px] text-emerald-500 font-black uppercase tracking-[0.3em]">Phase 05</span>
                  </div>
                  <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Deployment <span className="text-emerald-500">Frequency</span></h2>
                  <p className="text-gray-500 text-[11px] font-black uppercase tracking-widest italic">Recurring monthly capital infusion.</p>
                </div>

                <div className="glass-card rounded-[3rem] border-white/5 p-12 space-y-8 relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-[40px] rounded-full" />
                   
                   <div className="space-y-1">
                      <label className="text-[10px] text-gray-600 font-black uppercase tracking-widest ml-1">Monthly Batch (BRL)</label>
                      <div className="relative group">
                         <div className="absolute left-6 top-1/2 -translate-y-1/2 text-emerald-500 font-black text-2xl">R$</div>
                         <input 
                           type="number" 
                           value={profile.monthlyContribution} 
                           onChange={(e) => setProfile({...profile, monthlyContribution: Number(e.target.value)})}
                           className="w-full bg-white/5 border border-white/10 rounded-3xl px-16 py-8 text-white text-4xl font-black outline-none focus:border-emerald-500/50 focus:bg-white/[0.08] transition-all"
                           placeholder="0.00"
                         />
                      </div>
                   </div>
                </div>

                <div className="flex justify-between pt-8 items-center">
                    <button onClick={() => setCurrentStep('horizon')} className="text-gray-700 hover:text-white text-[10px] font-black uppercase tracking-widest transition-all">← Back</button>
                    <button onClick={() => handleNext('preferences')} className="bg-white text-black font-black uppercase text-xs tracking-[0.2em] py-5 px-12 rounded-2xl hover:bg-emerald-500 transition-all shadow-2xl">Configure Node →</button>
                </div>
             </div>
           )}
           {currentStep === 'preferences' && (
             <div className="space-y-10 max-w-xl mx-auto animate-in fade-in slide-in-from-right-8 duration-700">
                <div className="text-center space-y-4">
                  <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-4 py-1.5 rounded-full">
                     <Compass className="w-4 h-4 text-emerald-500" />
                     <span className="text-[10px] text-emerald-500 font-black uppercase tracking-[0.3em]">Phase 06</span>
                  </div>
                  <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Tactical <span className="text-emerald-500">Fine-Tuning</span></h2>
                  <p className="text-gray-500 text-[11px] font-black uppercase tracking-widest">Final parameter synchronization.</p>
                </div>

                <div className="space-y-4">
                   <button 
                     onClick={() => setProfile({...profile, preferences: {...profile.preferences, wantsCrypto: !profile.preferences.wantsCrypto}})}
                     className={cn(
                       "flex items-center justify-between w-full p-8 rounded-3xl border transition-all relative overflow-hidden group",
                       profile.preferences.wantsCrypto ? "bg-emerald-500 text-black border-emerald-500" : "bg-white/[0.02] border-white/5 text-white"
                     )}
                   >
                      <div className="text-left">
                        <div className="font-black uppercase text-xs tracking-widest">Digital Asset Exposure</div>
                        <div className={cn("text-[10px] font-bold uppercase tracking-tight", profile.preferences.wantsCrypto ? "text-black/60" : "text-gray-500")}>Include Crypto-assets (BTC/ETH) in the mix.</div>
                      </div>
                      <div className={cn("w-12 h-6 rounded-full relative transition-all", profile.preferences.wantsCrypto ? "bg-black/20" : "bg-white/10")}>
                         <div className={cn("absolute top-1 w-4 h-4 rounded-full transition-all bg-white", profile.preferences.wantsCrypto ? "right-1" : "left-1")} />
                      </div>
                   </button>

                   <button 
                     onClick={() => setProfile({...profile, preferences: {...profile.preferences, prefersPassiveIncome: !profile.preferences.prefersPassiveIncome}})}
                     className={cn(
                       "flex items-center justify-between w-full p-8 rounded-3xl border transition-all relative overflow-hidden group",
                       profile.preferences.prefersPassiveIncome ? "bg-emerald-500 text-black border-emerald-500" : "bg-white/[0.02] border-white/5 text-white"
                     )}
                   >
                      <div className="text-left">
                        <div className="font-black uppercase text-xs tracking-widest">Yield Priority Mode</div>
                        <div className={cn("text-[10px] font-bold uppercase tracking-tight", profile.preferences.prefersPassiveIncome ? "text-black/60" : "text-gray-500")}>Focus on recurring monthly dividend output.</div>
                      </div>
                      <div className={cn("w-12 h-6 rounded-full relative transition-all", profile.preferences.prefersPassiveIncome ? "bg-black/20" : "bg-white/10")}>
                         <div className={cn("absolute top-1 w-4 h-4 rounded-full transition-all bg-white", profile.preferences.prefersPassiveIncome ? "right-1" : "left-1")} />
                      </div>
                   </button>
                </div>

                <div className="flex justify-between pt-8 items-center">
                    <button onClick={() => setCurrentStep('contribution')} className="text-gray-700 hover:text-white text-[10px] font-black uppercase tracking-widest transition-all">← Back</button>
                    <button onClick={generatePlan} className="bg-white text-black font-black uppercase text-xs tracking-[0.2em] py-5 px-12 rounded-2xl hover:bg-emerald-500 transition-all shadow-2xl w-full max-w-xs">Initialize Generation →</button>
                </div>
             </div>
           )}
           {currentStep === 'result' && renderResult()}
         </>
       )}
    </div>
  );
};

export default AIAdvisor;
