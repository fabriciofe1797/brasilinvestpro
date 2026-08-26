import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { fetchLicense } from '../services/license';
import { AlertTriangle, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const daysBetween = (a: Date, b: Date) => {
  const msDay = 24 * 60 * 60 * 1000;
  return Math.ceil((b.getTime() - a.getTime()) / msDay);
};

export default function LicenseExpiryPrompt() {
  const { getToken, isSignedIn } = useAuth();
  const { t } = useTranslation();
  const [show, setShow] = useState(false);
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [plan, setPlan] = useState<string>('free');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!isSignedIn) return;
        const token = await getToken({ template: 'supabase' });
        if (!token) return;
        const lic = await fetchLicense(token);
        const p = (lic.plan_type as string) ?? 'free';
        setPlan(p);
        if (p === 'free') return; // Apenas planos pagos têm expiração
        if (!lic.end_date) return;
        const now = new Date();
        const end = new Date(lic.end_date);
        const left = daysBetween(now, end);
        if (!mounted) return;
        setDaysLeft(left);
        // Exibir quando faltar entre 1 e 5 dias
        if (left > 0 && left <= 5) setShow(true);
      } catch {
        // Erros silenciosos para não atrapalhar a UX
      }
    })();
    return () => { mounted = false; };
  }, [getToken, isSignedIn]);

  const label = useMemo(() => {
    if (!daysLeft || daysLeft <= 0) return '';
    if (daysLeft === 1) return t('licenseExpiry.oneDay');
    return t('licenseExpiry.days', { count: daysLeft });
  }, [daysLeft, t]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#0B1C17] border border-amber-500/30 rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-2 text-amber-400">
            <AlertTriangle className="w-5 h-5" />
            <h2 className="text-xl font-bold text-white">{t('licenseExpiry.title')}</h2>
          </div>
          <p className="text-gray-300">
            {t('licenseExpiry.messageStart', { plano: plan.toUpperCase() })} <span className="font-bold text-white">{label}</span>. 
            {t('licenseExpiry.messageEnd')}
          </p>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Clock className="w-4 h-4" />
            <span>{t('licenseExpiry.hint')}</span>
          </div>
          <div className="flex gap-2 pt-2">
            <Link to="/premium" className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-6 py-2 rounded-xl text-center">
              {t('licenseExpiry.renewNow')}
            </Link>
            <button onClick={() => setShow(false)} className="border border-white/10 text-white hover:bg-white/5 font-bold px-6 py-2 rounded-xl">
              {t('licenseExpiry.later')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
