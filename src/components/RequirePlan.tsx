import React from 'react';
import { useStore } from '../store/useStore';
import { Link } from 'react-router-dom';

type Plan = 'free' | 'starter' | 'pro' | 'master' | 'elite';

const order: Plan[] = ['free', 'starter', 'pro', 'master', 'elite'];

export default function RequirePlan({ min, children }: { min: Plan; children: React.ReactNode }) {
  const { settings } = useStore();
  const current = settings.plan ?? 'free';
  const ok = order.indexOf(current) >= order.indexOf(min);

  if (ok) return <>{children}</>;

  // Trigger upgrade prompt via store (with local cooldown handled inside)
  try {
    const evt = new CustomEvent('require-plan-block', { detail: { min } });
    window.dispatchEvent(evt);
  } catch {}

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="bg-[#0B1C17] border border-emerald-500/20 rounded-2xl p-8 max-w-lg text-center space-y-4">
        <h2 className="text-2xl font-bold text-white">Recurso Premium</h2>
        <p className="text-gray-400">
          Este recurso requer o plano {min.toUpperCase()} ou superior. Faça upgrade para desbloquear.
        </p>
        <div className="flex justify-center gap-2">
          <Link to="/premium" className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold px-6 py-2 rounded-xl">
            Ver Planos
          </Link>
          <Link to="/" className="border border-white/10 text-white hover:bg-white/5 font-bold px-6 py-2 rounded-xl">
            Voltar
          </Link>
        </div>
        <div className="text-xs text-gray-500">Plano atual: {current.toUpperCase()}</div>
      </div>
    </div>
  );
}
