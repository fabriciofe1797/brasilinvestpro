import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, TrendingUp, Calculator, History, Menu, X,
  Brain, Coins, Scale, FileInput, Receipt, Crown, Settings, 
  Sparkles, Navigation, GitCompare, Users, LineChart, Heart, Target,
  BarChart3, Zap, Bell, MessageSquare, Eye, Link2, Globe2,
  Compass, HeartHandshake, Rocket, Building2, Trophy, Percent
} from 'lucide-react';
import { UserButton, useUser } from '@clerk/clerk-react';
import { useTranslation } from 'react-i18next';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import NotificationCenter from './NotificationCenter';
import UpgradePrompt from './UpgradePrompt';
import LicenseExpiryPrompt from './LicenseExpiryPrompt';
import { useStore } from '../store/useStore';
import DataSynchronizer from './DataSynchronizer';
import MarketTicker from './MarketTicker';
import LanguageSwitcher from './LanguageSwitcher';

interface LayoutProps {
  children: React.ReactNode;
}

type PlanLevel = 'free' | 'starter' | 'pro' | 'master' | 'elite';

type NavItem =
  | { type: 'divider' }
  | { type?: undefined; icon: LucideIcon; label: string; path: string; plan: PlanLevel };

const isDivider = (item: NavItem): item is Extract<NavItem, { type: 'divider' }> =>
  item.type === 'divider';

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user } = useUser();
  const { settings } = useStore();
  const { t } = useTranslation();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const order: PlanLevel[] = ['free', 'starter', 'pro', 'master', 'elite'];
  const currentPlan = settings.plan ?? 'free';

  const navItems: NavItem[] = [
    // FREE - Todos os usuários
    { icon: LayoutDashboard, label: t('layout.nav.dashboard'), path: '/', plan: 'free' },
    { icon: TrendingUp, label: t('layout.nav.market'), path: '/market', plan: 'free' },
    { icon: Building2, label: t('layout.nav.fiis'), path: '/fiis', plan: 'free' },
    { icon: Trophy, label: t('layout.nav.rankings'), path: '/rankings', plan: 'free' },
    { icon: Percent, label: t('layout.nav.benchmarks'), path: '/benchmarks', plan: 'free' },
    { icon: Calculator, label: t('layout.nav.simulator'), path: '/calculator', plan: 'free' },
    { icon: Settings, label: t('layout.nav.settings'), path: '/settings', plan: 'free' },
    // Divider
    { type: 'divider' },
    // STARTER
    { icon: History, label: t('layout.nav.transactions'), path: '/transactions', plan: 'starter' },
    { icon: LineChart, label: t('layout.nav.timeline'), path: '/timeline', plan: 'starter' },
    { icon: BarChart3, label: t('layout.nav.ceilingPrice'), path: '/ceiling-price', plan: 'starter' },
    { icon: FileInput, label: t('layout.nav.import'), path: '/import', plan: 'starter' },
    { icon: Coins, label: t('layout.nav.dividends'), path: '/dividends', plan: 'starter' },
    { icon: Bell, label: t('layout.nav.alerts'), path: '/alerts', plan: 'starter' },
    { icon: Compass, label: t('layout.nav.decisions'), path: '/decisions', plan: 'starter' },
    { icon: Scale, label: t('layout.nav.rebalance'), path: '/rebalance', plan: 'starter' },
    // Divider
    { type: 'divider' },
    // PRO
    { icon: Receipt, label: t('layout.nav.tax'), path: '/tax', plan: 'pro' },
    { icon: Sparkles, label: t('layout.nav.aiAdvisor'), path: '/advisor', plan: 'pro' },
    { icon: MessageSquare, label: t('layout.nav.chat'), path: '/chat', plan: 'pro' },
    { icon: Brain, label: t('layout.nav.simulators'), path: '/simulators', plan: 'pro' },
    { icon: Zap, label: t('layout.nav.backtest'), path: '/backtest', plan: 'pro' },
    { icon: Rocket, label: t('layout.nav.drip'), path: '/drip', plan: 'pro' },
    { icon: Crown, label: t('layout.nav.analytics'), path: '/premium/analytics', plan: 'pro' },
    // Divider
    { type: 'divider' },
    // MASTER
    { icon: Heart, label: t('layout.nav.life'), path: '/life-map', plan: 'master' },
    { icon: HeartHandshake, label: t('layout.nav.lifeMap'), path: '/life-map-dividends', plan: 'master' },
    { icon: Target, label: t('layout.nav.goals'), path: '/goals', plan: 'master' },
    { icon: Navigation, label: t('layout.nav.exchange'), path: '/radar', plan: 'master' },
    { icon: GitCompare, label: t('layout.nav.comparator'), path: '/comparator', plan: 'master' },
    { icon: Users, label: t('layout.nav.community'), path: '/community', plan: 'master' },
    { icon: Eye, label: t('layout.nav.insiders'), path: '/insiders', plan: 'master' },
    { icon: Link2, label: t('layout.nav.openFinance'), path: '/open-finance', plan: 'master' },
    // Divider
    { type: 'divider' },
    // ELITE
    { icon: Globe2, label: t('layout.nav.dualTax'), path: '/dual-tax', plan: 'elite' },
  ];

const SidebarContent = () => (
    <div className="flex flex-col h-full bg-[#030816] border-r border-white/[0.03] shadow-2xl relative overflow-hidden">
       {/* Background Glow */}
       <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-500/5 blur-[100px]" />
       
       {/* Logo */}
       <div className="p-4 flex-shrink-0 flex items-center gap-3 relative z-10">
          <div className="bg-gradient-to-br from-emerald-400 to-emerald-600 w-10 h-10 rounded-xl flex items-center justify-center text-black font-black text-xl shadow-[0_0_20px_rgba(52,211,153,0.3)]">
             B
          </div>
          <div className="flex flex-col">
             <h1 className="font-black text-white text-lg leading-none tracking-tighter uppercase">{t('layout.brand')}</h1>
             <span className="text-[8px] text-emerald-500 font-black uppercase tracking-[0.3em]">{t('layout.tagline')}</span>
          </div>
       </div>

{/* Nav - Fixed height with internal scrolling */}
        <nav className="flex-1 px-3 py-2 overflow-y-auto no-scrollbar relative z-10">
           {navItems.map((item, idx) => {
              // Divider
              if (isDivider(item)) {
                return <div key={idx} className="my-3 border-t border-white/10" />;
              }
              
              const isActive = item.path === '/'
               ? location.pathname === '/'
               : location.pathname.startsWith(item.path);
               
              const itemPlan = item.plan;
              const disabled = order.indexOf(currentPlan) < order.indexOf(itemPlan);

              // Determine badge color based on plan
              const planLabel = item.plan ? t(`layout.planBadge.${item.plan}`) : '';
              const badgeColor = itemPlan === 'starter' ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' 
                : itemPlan === 'pro' ? 'text-purple-400 bg-purple-500/10 border-purple-500/20'
                : itemPlan === 'master' ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                : '';

              return (
                 <Link
                    key={item.path}
                    to={disabled ? '/premium' : item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                       "flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wide transition-all group relative",
                       disabled
                         ? "text-gray-700 cursor-not-allowed filter grayscale"
                         : isActive 
                           ? "bg-white/[0.03] text-emerald-400 border border-white/5" 
                           : "text-gray-500 hover:text-white hover:bg-white/[0.02] border border-transparent"
                    )}
                 >
                    <item.icon className={cn("w-4 h-4 shrink-0", disabled ? "text-gray-800" : (isActive ? "text-emerald-400" : "text-gray-600 group-hover:text-emerald-400"))} />
                    <span className="relative z-10 truncate">{item.label}</span>
                    
                    {disabled && (
                      <span className={cn("ml-auto text-[8px] font-black px-1.5 py-0.5 rounded border uppercase", badgeColor)}>
                        {planLabel}
                      </span>
                    )}
                    
                   {isActive && !disabled && (
                     <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-emerald-500 rounded-r-full" />
                   )}
                </Link>
             );
           })}
        </nav>

       {/* Premium CTA - Extreme Modern Glow (oculto para usuários elite) */}
       {(settings.plan ?? 'free') !== 'elite' && (
       <div className="p-6 relative z-10">
          <Link to="/premium" onClick={() => setIsMobileMenuOpen(false)}>
             <div className="relative group p-[2px] rounded-[2rem] overflow-hidden transition-all hover:scale-[1.02] active:scale-95 shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-600 animate-gradient-x opacity-80 group-hover:opacity-100 transition-opacity" />
                <div className="relative bg-[#030816] rounded-[1.95rem] p-6 overflow-hidden">
                   <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform rotate-12 group-hover:rotate-0 duration-700">
                      <Sparkles className="w-16 h-16 text-white" />
                   </div>
                   <div className="relative z-10">
                      <div className="flex items-center gap-2 text-white font-black text-xs uppercase tracking-[0.2em] mb-2">
                         <Crown className="w-3.5 h-3.5 text-emerald-400" /> {t('layout.cta.title')}
                      </div>
                      <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mb-4 leading-relaxed">
                         {t('layout.cta.subtitle')}
                      </p>
                      <div className="bg-emerald-500 text-black rounded-xl py-2 px-4 text-[10px] font-black uppercase tracking-[0.25em] text-center group-hover:bg-white transition-all shadow-[0_4px_15px_rgba(16,185,129,0.3)]">
                         {t('layout.cta.button')}
                      </div>
                   </div>
                </div>
             </div>
          </Link>
       </div>
       )}

       {/* User Footer - Sophisticated Dark */}
       <div className="p-6 border-t border-white/[0.03] bg-black/40 backdrop-blur-3xl">
          <div className="flex items-center gap-2 justify-between">
             <div className="flex items-center gap-3">
                <UserButton 
                    appearance={{
                    elements: {
                        userButtonAvatarBox: "w-10 h-10 border-2 border-emerald-500/20 hover:border-emerald-400/50 transition-all shadow-lg"
                    }
                    }}
                />
                <div className="flex flex-col">
                    <p className="text-sm font-black text-white leading-none tracking-tight">{user?.firstName || t('common.operator')}</p>
                    <div className="mt-1.5">
                       {(() => {
                         const p = settings.plan ?? 'free';
                         const config = {
                           free: { label: t('layout.planFooter.free'), color: 'bg-gray-800 text-gray-400 border-gray-700' },
                           starter: { label: t('layout.planFooter.starter'), color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
                           pro: { label: t('layout.planFooter.pro'), color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
                           master: { label: t('layout.planFooter.master'), color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
                           elite: { label: t('layout.planFooter.elite'), color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' }
                         };
                         const cur = config[p as keyof typeof config] || config.free;
                         return (
                           <span className={cn("text-[8px] font-black uppercase tracking-[0.3em] px-2 py-0.5 rounded-full border", cur.color)}>
                              {cur.label}
                           </span>
                         );
                       })()}
                    </div>
                </div>
             </div>
             <LanguageSwitcher compact dropDirection="up" className="flex-shrink-0" />
             <NotificationCenter />
          </div>
       </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#020617] text-gray-100 font-sans selection:bg-emerald-500/30">
       <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-30">
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[150px] mix-blend-screen" />
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[150px] mix-blend-screen" />
       </div>

       <MarketTicker variant="app" />
       <DataSynchronizer />
       <UpgradePrompt />
       <LicenseExpiryPrompt />
       
       {/* Desktop Sidebar */}
       <aside className="hidden md:block w-72 h-full shrink-0 animate-in slide-in-from-left duration-700 border-r border-white/5 shadow-2xl relative z-50">
          <SidebarContent />
       </aside>

       {/* Mobile Header & Overlay */}
       <div className="md:hidden fixed top-7 left-0 right-0 z-50 bg-[#030816]/90 backdrop-blur-2xl border-b border-white/[0.03] px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
             <button onClick={() => setIsMobileMenuOpen(true)} className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-gray-400 hover:text-white transition-all active:scale-90">
                <Menu className="w-5 h-5" />
             </button>
             <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-black font-black text-sm">B</div>
                <span className="font-black text-white text-lg tracking-tighter uppercase hidden min-[420px]:block">BrasilInvest</span>
             </div>
          </div>
          <div className="flex items-center gap-2">
             <UserButton />
             <LanguageSwitcher compact />
             <NotificationCenter />
          </div>
       </div>

       {/* Mobile Drawer */}
       {isMobileMenuOpen && (
          <div className="fixed inset-0 z-[100] md:hidden">
             {/* Backdrop */}
             <div className="absolute inset-0 bg-black/80 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setIsMobileMenuOpen(false)} />
             
             {/* Drawer Content */}
             <div className="absolute top-0 left-0 bottom-0 w-[85%] max-w-xs bg-[#030816] animate-in slide-in-from-left duration-500 shadow-2xl border-r border-white/10">
                <div className="absolute top-6 right-6 z-20">
                   <button onClick={() => setIsMobileMenuOpen(false)} className="w-8 h-8 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-gray-400 hover:text-white">
                      <X className="w-4 h-4" />
                   </button>
                </div>
                <SidebarContent />
             </div>
          </div>
       )}

       {/* Main Content Area */}
       <main className="flex-1 h-full overflow-y-auto overflow-x-hidden relative scroll-smooth md:pt-0 pt-16 no-scrollbar">
          <div className="max-w-[1400px] mx-auto p-6 md:p-12 min-h-full">
             {children}
          </div>
       </main>

    </div>
  );
};

export default Layout;
