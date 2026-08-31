import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Shield, Users, Activity, RefreshCw, Search, X, Loader2, CalendarClock, AlertTriangle } from 'lucide-react';
import {
  adminOverview,
  adminListUsers,
  adminGetUser,
  adminSetPlan,
  isAdminId,
} from '../services/admin';
import type {
  AdminLicenseRow,
  AdminPlanChange,
  AdminUserSummary,
  AdminUserDetail,
  AdminPlan,
} from '../services/admin';
import { PLAN_CATALOG, FOUNDER_PROMO, formatBRL } from '../services/billing';

// Painel interno: textos fixos em pt-BR, sem i18n.

const PLAN_ORDER: AdminPlan[] = ['free', 'starter', 'pro', 'master', 'elite'];
const PLAN_LABEL: Record<AdminPlan, string> = {
  free: 'Free',
  starter: 'Starter',
  pro: 'Pro',
  master: 'Master',
  elite: 'Elite',
};
const PAGE_SIZE = 25;
const DAY_MS = 24 * 60 * 60 * 1000;

const fmtDate = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR');
};

const fmtDateTime = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
};

/** MRR estimado: preço mensal por licença ativa (anual convertido para mês). */
const licenseMonthlyValue = (lic: AdminLicenseRow): number => {
  const plan = lic.plan_type as keyof typeof PLAN_CATALOG;
  const entry = PLAN_CATALOG[plan];
  if (!entry) return 0;
  let value = lic.billing_interval === 'annual' ? entry.annual : entry.monthly;
  if (lic.promo === 'founder') value = Math.round(value * (100 - FOUNDER_PROMO.discountPct)) / 100;
  return value;
};

const subscriptionState = (lic: AdminLicenseRow): { dot: string; label: string } => {
  if (lic.payment_status === 'past_due') return { dot: 'text-amber-400', label: 'Atrasada' };
  if (lic.payment_status === 'expired') return { dot: 'text-red-400', label: 'Expirada' };
  if (!lic.end_date) return { dot: 'text-emerald-400', label: 'Ativa' };
  const daysLeft = Math.ceil((new Date(lic.end_date).getTime() - Date.now()) / DAY_MS);
  if (daysLeft < 0) return { dot: 'text-red-400', label: 'Expirada' };
  if (daysLeft <= 7) return { dot: 'text-red-400', label: `Expira em ${daysLeft}d` };
  if (daysLeft <= 30) return { dot: 'text-amber-400', label: `Expira em ${daysLeft}d` };
  return { dot: 'text-emerald-400', label: 'Ativa' };
};

const PlanBadge: React.FC<{ plan: string }> = ({ plan }) => {
  const colors: Record<string, string> = {
    free: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
    starter: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    pro: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    master: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    elite: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  };
  return (
    <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${colors[plan] ?? colors.free}`}>
      {PLAN_LABEL[plan as AdminPlan] ?? plan}
    </span>
  );
};

const KpiCard: React.FC<{ label: string; value: string; sub?: string }> = ({ label, value, sub }) => (
  <div className="glass-card rounded-[2rem] p-6 border-white/5 shadow-2xl">
    <span className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em]">{label}</span>
    <div className="text-3xl font-black text-white tracking-tighter mt-2">{value}</div>
    {sub && <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-2">{sub}</div>}
  </div>
);

const AdminPage: React.FC = () => {
  const { userId, getToken } = useAuth();
  const [tab, setTab] = useState<'overview' | 'users'>('overview');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ─── Visão Geral ───
  const [licenses, setLicenses] = useState<AdminLicenseRow[]>([]);
  const [totalProfiles, setTotalProfiles] = useState(0);
  const [recentChanges, setRecentChanges] = useState<AdminPlanChange[]>([]);

  // ─── Usuários ───
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState<AdminPlan | ''>('');
  const [page, setPage] = useState(0);

  // ─── Detalhe do usuário ───
  const [selected, setSelected] = useState<AdminUserSummary | null>(null);
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // ─── Formulário de alteração de plano ───
  const [newPlan, setNewPlan] = useState<AdminPlan>('pro');
  const [days, setDays] = useState(30);
  const [customDays, setCustomDays] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const getTokenSafe = useCallback(async () => {
    const token = await getToken({ template: 'supabase' });
    if (!token) throw new Error('Token de autenticação indisponível');
    return token;
  }, [getToken]);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getTokenSafe();
      const data = await adminOverview(token);
      setLicenses(data.licenses);
      setTotalProfiles(data.totalProfiles);
      setRecentChanges(data.recentPlanChanges);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [getTokenSafe]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getTokenSafe();
      const data = await adminListUsers(token, {
        query: search.trim() || undefined,
        plan: planFilter || null,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      });
      setUsers(data.users);
      setTotalUsers(data.total);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [getTokenSafe, search, planFilter, page]);

  useEffect(() => {
    if (!isAdminId(userId)) return;
    loadOverview();
  }, [userId, loadOverview]);

  useEffect(() => {
    if (!isAdminId(userId)) return;
    if (tab === 'users') loadUsers();
  }, [userId, tab, loadUsers]);

  const openUser = useCallback(async (u: AdminUserSummary) => {
    setSelected(u);
    setDetail(null);
    setDetailLoading(true);
    setSaveMsg(null);
    setNewPlan(u.plan === 'free' ? 'starter' : u.plan);
    setReason('');
    try {
      const token = await getTokenSafe();
      setDetail(await adminGetUser(token, u.id));
    } catch (e) {
      setSaveMsg(`Erro ao carregar detalhes: ${(e as Error).message}`);
    } finally {
      setDetailLoading(false);
    }
  }, [getTokenSafe]);

  const confirmPlanChange = useCallback(async () => {
    if (!selected) return;
    const effectiveDays = days === -1 ? Number(customDays) : days;
    if (!Number.isFinite(effectiveDays) || effectiveDays < 1) {
      setSaveMsg('Informe uma duração válida (dias).');
      return;
    }
    if (!reason.trim()) {
      setSaveMsg('Informe o motivo da alteração.');
      return;
    }
    setSaving(true);
    setSaveMsg(null);
    try {
      const token = await getTokenSafe();
      const result = await adminSetPlan(token, {
        user_id: selected.id,
        plan: newPlan,
        days: Math.floor(effectiveDays),
        reason: reason.trim(),
      });
      setSaveMsg(`Plano alterado: ${result.fromPlan} → ${result.toPlan} (até ${fmtDate(result.end_date)})`);
      setReason('');
      loadUsers();
      loadOverview();
      openUser({ ...selected, plan: result.toPlan as AdminPlan });
    } catch (e) {
      setSaveMsg(`Erro: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  }, [selected, days, customDays, reason, newPlan, getTokenSafe, loadUsers, loadOverview, openUser]);

  // KPIs derivados das licenças
  const kpis = useMemo(() => {
    const paid = licenses.filter((l) => l.plan_type !== 'free');
    const active = paid.filter((l) => l.payment_status === 'active');
    const now = Date.now();
    const expiring7 = paid.filter((l) => l.end_date && new Date(l.end_date).getTime() - now > 0 && new Date(l.end_date).getTime() - now <= 7 * DAY_MS).length;
    const expiring30 = paid.filter((l) => l.end_date && new Date(l.end_date).getTime() - now > 0 && new Date(l.end_date).getTime() - now <= 30 * DAY_MS).length;
    const mrr = active.reduce((sum, l) => sum + licenseMonthlyValue(l), 0);
    const byPlan = PLAN_ORDER.map((p) => ({
      plan: p,
      count: p === 'free' ? totalProfiles - licenses.length : licenses.filter((l) => l.plan_type === p).length,
    }));
    return { paidCount: paid.length, activeCount: active.length, expiring7, expiring30, mrr, byPlan };
  }, [licenses, totalProfiles]);

  if (!isAdminId(userId)) {
    return (
      <div className="bg-premium min-h-screen flex items-center justify-center">
        <div className="glass-card rounded-[2rem] p-10 border-white/5 text-center">
          <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-4" />
          <p className="text-white font-black uppercase tracking-widest text-sm">Acesso restrito</p>
        </div>
      </div>
    );
  }

  const totalPages = Math.max(Math.ceil(totalUsers / PAGE_SIZE), 1);

  return (
    <div className="bg-premium min-h-screen">
      <div className="premium-glow-1" />
      <div className="premium-glow-2" />

      <div className="relative z-10 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 pt-4">
        {/* Cabeçalho */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white uppercase underline decoration-emerald-500 decoration-4 underline-offset-8">
              PAINEL <span className="text-emerald-500">ADMIN</span>
            </h1>
            <p className="text-gray-500 text-sm font-bold uppercase mt-4 tracking-widest">
              Gestão de usuários, licenças e receita
            </p>
          </div>
          <div className="flex gap-2">
            {(['overview', 'users'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-[11px] font-black uppercase tracking-widest border transition-all ${
                  tab === t
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'glass-card text-gray-400 border-white/5 hover:border-emerald-500/20'
                }`}
              >
                {t === 'overview' ? <Activity className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                {t === 'overview' ? 'Visão Geral' : 'Usuários'}
              </button>
            ))}
            <button
              onClick={() => (tab === 'overview' ? loadOverview() : loadUsers())}
              className="glass-card p-2.5 rounded-full border-white/5 hover:border-emerald-500/20 transition-all"
              title="Recarregar"
            >
              <RefreshCw className={`w-4 h-4 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {error && (
          <div className="glass-card rounded-2xl p-4 border-red-500/30 text-red-400 text-sm font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        {/* ─── VISÃO GERAL ─── */}
        {tab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard label="Usuários" value={String(totalProfiles)} sub={`${licenses.length} com licença registrada`} />
              <KpiCard label="Assinaturas pagas" value={String(kpis.paidCount)} sub={`${kpis.activeCount} ativas`} />
              <KpiCard label="MRR estimado" value={formatBRL(kpis.mrr)} sub={`ARR ${formatBRL(kpis.mrr * 12)}`} />
              <KpiCard label="Vencendo" value={`${kpis.expiring7} / ${kpis.expiring30}`} sub="7 / 30 dias" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Distribuição por plano */}
              <div className="glass-card rounded-[2rem] p-8 border-white/5 shadow-2xl">
                <div className="flex items-center gap-2 mb-6">
                  <Users className="w-4 h-4 text-emerald-400" />
                  <span className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em]">Usuários por plano</span>
                </div>
                <div className="space-y-4">
                  {kpis.byPlan.map(({ plan, count }) => {
                    const pct = totalProfiles > 0 ? Math.round((count / totalProfiles) * 100) : 0;
                    return (
                      <div key={plan}>
                        <div className="flex justify-between text-[11px] font-black uppercase tracking-widest mb-1">
                          <span className="text-gray-400">{PLAN_LABEL[plan]}</span>
                          <span className="text-white">{count} ({pct}%)</span>
                        </div>
                        <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                          <div className="h-full rounded-full bg-emerald-500/60" style={{ width: `${Math.max(pct, count > 0 ? 2 : 0)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Assinaturas com status */}
              <div className="glass-card rounded-[2rem] p-8 border-white/5 shadow-2xl">
                <div className="flex items-center gap-2 mb-6">
                  <CalendarClock className="w-4 h-4 text-emerald-400" />
                  <span className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em]">Assinaturas</span>
                </div>
                {licenses.length === 0 ? (
                  <p className="text-gray-500 text-sm">Nenhuma licença registrada.</p>
                ) : (
                  <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
                    {licenses.map((l) => {
                      const st = subscriptionState(l);
                      return (
                        <div key={l.user_id} className="flex items-center justify-between gap-3 bg-white/[0.02] rounded-xl px-4 py-3 border border-white/5">
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-white truncate">{l.user_id}</div>
                            <div className="text-[10px] text-gray-500">até {fmtDate(l.end_date)}</div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <PlanBadge plan={l.plan_type} />
                            <span className={`text-[10px] font-black uppercase ${st.dot}`}>● {st.label}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Últimas mudanças de plano */}
            <div className="glass-card rounded-[2rem] p-8 border-white/5 shadow-2xl">
              <div className="flex items-center gap-2 mb-6">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em]">Últimas mudanças de plano (auditoria)</span>
              </div>
              {recentChanges.length === 0 ? (
                <p className="text-gray-500 text-sm">Nenhuma mudança registrada.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-gray-500 text-[10px] font-black uppercase tracking-widest border-b border-white/5">
                        <th className="py-2 pr-4">Data</th>
                        <th className="py-2 pr-4">Usuário</th>
                        <th className="py-2 pr-4">De → Para</th>
                        <th className="py-2 pr-4">Motivo</th>
                        <th className="py-2">Admin</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentChanges.map((c) => (
                        <tr key={c.id} className="border-b border-white/5 last:border-0">
                          <td className="py-3 pr-4 text-gray-400 whitespace-nowrap">{fmtDateTime(c.changed_at)}</td>
                          <td className="py-3 pr-4 text-white font-bold">{c.user_id}</td>
                          <td className="py-3 pr-4 text-gray-300">{c.from_plan} → {c.to_plan}</td>
                          <td className="py-3 pr-4 text-gray-400">{c.reason ?? '—'}</td>
                          <td className="py-3 text-gray-400">{c.admin_id ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── USUÁRIOS ─── */}
        {tab === 'users' && (
          <div className="space-y-6">
            <div className="glass-card rounded-[2rem] p-6 border-white/5 shadow-2xl flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                  onKeyDown={(e) => e.key === 'Enter' && loadUsers()}
                  placeholder="Buscar por email ou user_id..."
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/40"
                />
              </div>
              <select
                value={planFilter}
                onChange={(e) => { setPlanFilter(e.target.value as AdminPlan | ''); setPage(0); }}
                className="bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500/40"
              >
                <option value="">Todos os planos</option>
                {PLAN_ORDER.map((p) => (
                  <option key={p} value={p}>{PLAN_LABEL[p]}</option>
                ))}
              </select>
              <button
                onClick={loadUsers}
                className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-emerald-500/30 transition-all"
              >
                Buscar
              </button>
            </div>

            <div className="glass-card rounded-[2rem] border-white/5 shadow-2xl overflow-hidden">
              {loading && users.length === 0 ? (
                <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 text-emerald-400 animate-spin" /></div>
              ) : users.length === 0 ? (
                <p className="p-10 text-gray-500 text-sm text-center">Nenhum usuário encontrado.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-gray-500 text-[10px] font-black uppercase tracking-widest border-b border-white/5">
                        <th className="py-3 px-6">Email</th>
                        <th className="py-3 px-4">User ID</th>
                        <th className="py-3 px-4">Plano</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Expira</th>
                        <th className="py-3 px-4">Desde</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => {
                        const st = subscriptionState({
                          user_id: u.id,
                          plan_type: u.plan,
                          payment_status: u.payment_status as AdminLicenseRow['payment_status'],
                          start_date: null,
                          end_date: u.end_date,
                          billing_interval: (u.billing_interval ?? null) as AdminLicenseRow['billing_interval'],
                          promo: u.promo,
                        });
                        return (
                          <tr
                            key={u.id}
                            onClick={() => openUser(u)}
                            className="border-b border-white/5 last:border-0 hover:bg-white/[0.03] cursor-pointer transition-colors"
                          >
                            <td className="py-3 px-6 text-white font-bold">{u.email ?? '—'}</td>
                            <td className="py-3 px-4 text-gray-400 font-mono text-[10px]">{u.id}</td>
                            <td className="py-3 px-4"><PlanBadge plan={u.plan} /></td>
                            <td className={`py-3 px-4 text-[10px] font-black uppercase ${st.dot}`}>● {u.plan === 'free' ? 'Free' : st.label}</td>
                            <td className="py-3 px-4 text-gray-400">{fmtDate(u.end_date)}</td>
                            <td className="py-3 px-4 text-gray-400">{fmtDate(u.created_at)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Paginação */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-white/5">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                  {totalUsers} usuário(s) · página {page + 1} de {totalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={page === 0 || loading}
                    onClick={() => setPage((p) => p - 1)}
                    className="px-4 py-2 rounded-lg border border-white/10 text-gray-400 text-[10px] font-black uppercase disabled:opacity-30 hover:border-emerald-500/30"
                  >
                    Anterior
                  </button>
                  <button
                    disabled={page >= totalPages - 1 || loading}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-4 py-2 rounded-lg border border-white/10 text-gray-400 text-[10px] font-black uppercase disabled:opacity-30 hover:border-emerald-500/30"
                  >
                    Próxima
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── MODAL DE DETALHE / ALTERAÇÃO DE PLANO ─── */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setSelected(null)}>
          <div
            className="glass-card rounded-[2rem] border-white/10 shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-8 space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-black text-white uppercase tracking-tight">{selected.email ?? selected.id}</h2>
                <p className="text-[10px] font-mono text-gray-500 mt-1">{selected.id}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {detailLoading ? (
              <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 text-emerald-400 animate-spin" /></div>
            ) : detail ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-white/[0.03] rounded-xl p-4 border border-white/5">
                    <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Plano atual</div>
                    <PlanBadge plan={detail.license?.plan_type ?? 'free'} />
                  </div>
                  <div className="bg-white/[0.03] rounded-xl p-4 border border-white/5">
                    <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Expira em</div>
                    <div className="text-sm font-bold text-white">{fmtDate(detail.license?.end_date)}</div>
                  </div>
                  <div className="bg-white/[0.03] rounded-xl p-4 border border-white/5">
                    <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Transações</div>
                    <div className="text-sm font-bold text-white">{detail.transactionsCount}</div>
                  </div>
                  <div className="bg-white/[0.03] rounded-xl p-4 border border-white/5">
                    <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Conta criada</div>
                    <div className="text-sm font-bold text-white">{fmtDate(detail.profile?.created_at ?? selected.created_at)}</div>
                  </div>
                </div>

                {/* Alterar plano */}
                <div className="space-y-4 border-t border-white/5 pt-6">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-400" />
                    <span className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em]">Alterar plano manualmente</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">Novo plano</label>
                      <select
                        value={newPlan}
                        onChange={(e) => setNewPlan(e.target.value as AdminPlan)}
                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500/40"
                      >
                        {PLAN_ORDER.map((p) => (
                          <option key={p} value={p}>{PLAN_LABEL[p]}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">Período</label>
                      <div className="flex gap-2">
                        <select
                          value={days}
                          onChange={(e) => setDays(Number(e.target.value))}
                          className="flex-1 bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500/40"
                        >
                          <option value={30}>30 dias</option>
                          <option value={90}>90 dias</option>
                          <option value={180}>180 dias</option>
                          <option value={365}>365 dias</option>
                          <option value={3650}>10 anos</option>
                          <option value={-1}>Personalizado</option>
                        </select>
                        {days === -1 && (
                          <input
                            type="number"
                            min={1}
                            max={3650}
                            value={customDays}
                            onChange={(e) => setCustomDays(e.target.value)}
                            placeholder="Dias"
                            className="w-24 bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500/40"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">Motivo (obrigatório — fica na auditoria)</label>
                    <input
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Ex.: Pagamento manual via PIX"
                      className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/40"
                    />
                  </div>
                  {saveMsg && (
                    <div className={`text-xs font-bold rounded-xl px-4 py-3 border ${saveMsg.startsWith('Erro') || saveMsg.startsWith('Informe') ? 'text-red-400 border-red-500/30 bg-red-500/5' : 'text-emerald-400 border-emerald-500/30 bg-emerald-500/5'}`}>
                      {saveMsg}
                    </div>
                  )}
                  <button
                    onClick={confirmPlanChange}
                    disabled={saving}
                    className="w-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-6 py-3.5 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-emerald-500/30 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    Confirmar alteração
                  </button>
                </div>

                {/* Histórico */}
                {detail.planChanges.length > 0 && (
                  <div className="border-t border-white/5 pt-6">
                    <span className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] block mb-3">Histórico de mudanças</span>
                    <div className="space-y-2">
                      {detail.planChanges.map((c) => (
                        <div key={c.id} className="flex items-center justify-between text-xs bg-white/[0.02] rounded-lg px-4 py-2.5 border border-white/5">
                          <span className="text-gray-300">{c.from_plan} → <span className="text-white font-bold">{c.to_plan}</span></span>
                          <span className="text-gray-500">{c.reason ?? '—'}</span>
                          <span className="text-gray-500 whitespace-nowrap">{fmtDateTime(c.changed_at)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
