import React, { useEffect, useMemo, useState } from 'react';
import { useStore } from '../store/useStore';
import { Link } from 'react-router-dom';
import { Crown } from 'lucide-react';

function getVariant() {
  try {
    let v = localStorage.getItem('ab_variant');
    if (!v) {
      v = Math.random() < 0.5 ? 'A' : 'B';
      localStorage.setItem('ab_variant', v);
    }
    return v;
  } catch {
    return 'A';
  }
}

function getOrCreateCoupon(target: 'pro' | 'elite', kind: 'monthly' | 'annual') {
  try {
    const key = `coupon_${target}_${kind}`;
    const raw = localStorage.getItem(key);
    const now = Date.now();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    if (raw) {
      const obj = JSON.parse(raw);
      if (now < obj.expiresAt) return obj;
    }
    const code = `${kind === 'annual' ? 'SAVE20' : 'SAVE10'}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const obj = { code, discount: kind === 'annual' ? 20 : 10, expiresAt: now + sevenDays };
    localStorage.setItem(key, JSON.stringify(obj));
    return obj;
  } catch {
    return { code: 'SAVE10', discount: 10, expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 };
  }
}

const UpgradePrompt: React.FC = () => {
  const { showUpgradeModal, upgradeContext, dismissUpgradeModal, settings, triggerUpgradeModal } = useStore();
  const [now, setNow] = useState(Date.now());
  
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  
  useEffect(() => {
    const handler = () => {
      triggerUpgradeModal?.('report');
    };
    window.addEventListener('require-plan-block', handler as EventListener);
    return () => window.removeEventListener('require-plan-block', handler as EventListener);
  }, [triggerUpgradeModal]);

  const variant = useMemo(() => getVariant(), []);
  const monthlyCoupon = useMemo(() => getOrCreateCoupon('pro', 'monthly'), []);
  const annualCoupon = useMemo(() => getOrCreateCoupon('pro', 'annual'), []);

  const monthlyLeft = Math.max(0, Math.floor((monthlyCoupon.expiresAt - now) / 1000));
  const annualLeft = Math.max(0, Math.floor((annualCoupon.expiresAt - now) / 1000));

  const formatLeft = (sec: number) => {
    const d = Math.floor(sec / 86400);
    const h = Math.floor((sec % 86400) / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return `${d}d ${h}h ${m}m`;
  };

  if (!showUpgradeModal) return null;

  const onPrimaryClick = () => {
    try {
      const events = JSON.parse(localStorage.getItem('upgrade_events') || '[]');
      events.push({ ts: Date.now(), action: 'click_upgrade', ctx: upgradeContext, plan: settings.plan });
      localStorage.setItem('upgrade_events', JSON.stringify(events));
    } catch {}
  };

  const heading = "Ação Bloqueada - Créditos Insuficientes";
  const messageA = "Para aumentar seus aportes, adicionar ativos e melhorar a gestão da sua conta, é necessário fazer upgrade do seu plano.";
  const messageB = "Você atingiu o limite do seu plano. Faça upgrade para liberar novas compras, ativos e relatórios avançados.";
  const message = variant === 'A' ? messageA : messageB;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={dismissUpgradeModal} />
      <div className="relative bg-[#0B1C17] border border-emerald-500/20 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in duration-200">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-yellow-400 text-lg">⚠️</span>
          <h3 className="text-xl font-bold text-white">{heading}</h3>
        </div>
        <p className="text-gray-300 text-sm">{message}</p>

        {/* Coupons */}
        <div className="mt-4 grid grid-cols-1 gap-3">
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-emerald-400 text-xs font-bold uppercase">Desconto Mensal</div>
                <div className="text-white font-bold text-lg">10% OFF</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-400">Cupom</div>
                <div className="font-mono text-sm text-white">{monthlyCoupon.code}</div>
                <div className="text-[10px] text-gray-500">Expira em {formatLeft(monthlyLeft)}</div>
              </div>
            </div>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-blue-400 text-xs font-bold uppercase">Desconto Anual</div>
                <div className="text-white font-bold text-lg">20% OFF</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-400">Cupom</div>
                <div className="font-mono text-sm text-white">{annualCoupon.code}</div>
                <div className="text-[10px] text-gray-500">Expira em {formatLeft(annualLeft)}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2">
          <Link
            to={`/premium?utm_source=upgrade_modal&utm_variant=${variant}`}
            onClick={onPrimaryClick}
            className="text-center bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-3 rounded-xl shadow-lg shadow-emerald-500/20 transition-colors flex items-center justify-center gap-2 animate-[fadeInOut_1.5s_ease-in-out_infinite]"
          >
            <Crown className="w-4 h-4" /> Fazer Upgrade Agora
          </Link>
          <Link
            to="/premium"
            className="text-center border border-white/10 text-white hover:bg-white/5 font-bold py-3 rounded-xl"
            onClick={() => {
              try {
                const events = JSON.parse(localStorage.getItem('upgrade_events') || '[]');
                events.push({ ts: Date.now(), action: 'click_have_plan', ctx: upgradeContext });
                localStorage.setItem('upgrade_events', JSON.stringify(events));
              } catch {}
            }}
          >
            Já tenho um plano
          </Link>
        </div>

        <button onClick={dismissUpgradeModal} className="absolute top-3 right-3 text-gray-400 hover:text-white text-sm">Fechar</button>
        <style>
          {`@keyframes fadeInOut {
            0% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.85; transform: scale(0.99); }
            100% { opacity: 1; transform: scale(1); }
          }`}
        </style>
      </div>
    </div>
  );
};

export default UpgradePrompt;
