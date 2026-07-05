import React, { useEffect, useMemo, useState } from 'react';
import { useStore } from '../store/useStore';
import { getPlanLimits } from '../services/billing';
import { Shield, Medal, Star, Gem } from 'lucide-react';
import { useAuth } from '@clerk/clerk-react';
import { fetchLicense } from '../services/license';

const PlanLimitsCard: React.FC = () => {
  const { settings, portfolio, transactions } = useStore();
  const plan = settings.plan ?? 'free';
  const limits = getPlanLimits(plan);
  const { getToken, isSignedIn } = useAuth();
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [autoRenew, setAutoRenew] = useState<boolean>(false);
  const [monthlyLimit, setMonthlyLimit] = useState<number | null>(limits.transactions);

  const assetsUsed = portfolio.length;
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  const txUsedMonth = transactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === month && d.getFullYear() === year;
  }).length;

  const assetsLabel = limits.assets === null ? 'ilimitado' : `${assetsUsed}/${limits.assets}`;
  const txLabel = monthlyLimit === null ? 'ilimitadas' : `${txUsedMonth}/${monthlyLimit} /mês`;
  const remainingTx = monthlyLimit === null ? null : Math.max(0, monthlyLimit - txUsedMonth);
  const thresholdTx = plan === 'free' ? 5 : 10;

  const nearing = (remaining: number | null, max: number | null) => max !== null && remaining !== null && remaining <= thresholdTx;

  const badge = useMemo(() => {
    if (plan === 'free') return { label: 'Bronze', icon: <Shield className="w-4 h-4" />, cls: 'bg-gray-700 text-white' };
    if (plan === 'starter') return { label: 'Prata', icon: <Medal className="w-4 h-4" />, cls: 'bg-emerald-600 text-black' };
    if (plan === 'pro') return { label: 'Ouro', icon: <Star className="w-4 h-4 text-yellow-300" />, cls: 'bg-yellow-500 text-black' };
    if (plan === 'master') return { label: 'Platina', icon: <Gem className="w-4 h-4 text-cyan-300" />, cls: 'bg-cyan-600 text-black' };
    return { label: 'Diamante', icon: <Gem className="w-4 h-4" />, cls: 'bg-purple-600 text-white' };
  }, [plan]);

  const nextTier = plan === 'free' ? 'Prata' : plan === 'starter' ? 'Ouro' : plan === 'pro' ? 'Platina' : plan === 'master' ? 'Diamante' : null;
  const nextProgress = useMemo(() => {
    const assetsPct = limits.assets !== null ? (assetsUsed / limits.assets) : 0;
    const txPct = monthlyLimit !== null ? (txUsedMonth / monthlyLimit) : 0;
    const p = Math.max(assetsPct, txPct);
    return Math.min(100, Math.round(p * 100));
  }, [assetsUsed, txUsedMonth, limits.assets, monthlyLimit]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!isSignedIn) return;
        const token = await getToken({ template: 'supabase' });
        if (!token) return;
        const lic = await fetchLicense(token);
        setAutoRenew(!!lic.auto_renew_flag);
        if (mounted) setMonthlyLimit(limits.transactions);
        if (lic.end_date && (plan === 'starter' || plan === 'pro' || plan === 'master' || plan === 'elite')) {
          const end = new Date(lic.end_date).getTime();
          const diff = Math.ceil((end - Date.now()) / (24 * 60 * 60 * 1000));
          if (mounted) setDaysLeft(diff);
        } else {
          if (mounted) setDaysLeft(null);
        }
      } catch {
        // noop
      }
    })();
    return () => { mounted = false; };
  }, [getToken, isSignedIn, plan, limits.transactions]);
  return (
    <div className="bg-[#0B1C17] border border-white/10 rounded-2xl overflow-hidden">
      <div className="p-6 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">Limites do Plano</h3>
            <p className="text-xs text-gray-500 mt-1">Acompanhe seu consumo e faça upgrade quando precisar.</p>
            {plan !== 'free' && daysLeft !== null && daysLeft <= 7 && daysLeft > 0 && (
              <div className="mt-2 inline-flex items-center gap-2 text-[11px] px-2 py-1 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400">
                Licença expira em {daysLeft === 1 ? '1 dia' : `${daysLeft} dias`} {autoRenew ? '(renovação automática ativa)' : ''}
              </div>
            )}
          </div>
          <div className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${badge.cls}`}>
            {badge.icon} {badge.label}
          </div>
        </div>
      </div>
      <div className="p-6 space-y-4">
        {nextTier && (
          <>
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-400">Rumo ao {nextTier}</div>
              <div className="text-xs text-emerald-400 font-bold">{nextProgress}%</div>
            </div>
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-600 to-teal-400 rounded-full"
                style={{ width: `${nextProgress}%` }}
              />
            </div>
          </>
        )}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-400">Ativos no Portfólio</div>
            <div className="text-white font-bold">{assetsLabel}</div>
          </div>
          {limits.assets !== null && (
            <div className={`text-xs px-2 py-1 rounded ${nearing(assetsUsed, limits.assets) ? 'bg-amber-500/20 text-amber-400' : 'bg-white/5 text-gray-400'}`}>
              {nearing(assetsUsed, limits.assets) ? 'Quase no limite' : 'Dentro do limite'}
            </div>
          )}
        </div>
        {monthlyLimit !== null && remainingTx !== null && remainingTx > 0 && remainingTx <= thresholdTx && (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center justify-between">
            <span>Faltam {remainingTx} transações neste mês</span>
            <a href="/premium" className="text-emerald-400 hover:text-emerald-300 font-bold">Ver planos</a>
          </div>
        )}
        {monthlyLimit !== null && remainingTx === 0 && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center justify-between">
            <span>Você atingiu o limite deste mês</span>
            <a href="/premium" className="text-emerald-400 hover:text-emerald-300 font-bold">Ver planos</a>
          </div>
        )}
        {limits.assets !== null && (
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full"
              style={{ width: `${Math.min(100, (assetsUsed / limits.assets) * 100)}%` }}
            />
          </div>
        )}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-400">Transações</div>
            <div className="text-white font-bold">{txLabel}</div>
          </div>
          {monthlyLimit !== null && (
            <div className={`text-xs px-2 py-1 rounded ${nearing(remainingTx, monthlyLimit) ? 'bg-amber-500/20 text-amber-400' : 'bg-white/5 text-gray-400'}`}>
              {nearing(remainingTx, monthlyLimit) ? 'Quase no limite' : 'Dentro do limite'}
            </div>
          )}
        </div>
        {monthlyLimit !== null && (
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full"
              style={{ width: `${Math.min(100, (txUsedMonth / monthlyLimit) * 100)}%` }}
            />
          </div>
        )}
        <a href="/premium" className="inline-block mt-2 text-emerald-400 text-xs font-bold hover:text-emerald-300">
          Ver planos e benefícios
        </a>
      </div>
      <div className="px-6 py-3 border-t border-white/5 text-[11px] text-gray-500">
        Plano atual: <span className="text-white font-bold">{plan.toUpperCase()}</span>
      </div>
    </div>
  );
};

export default PlanLimitsCard;
