import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SignedIn, SignedOut, RedirectToSignIn, SignIn, SignUp } from '@clerk/clerk-react';
import React, { Suspense, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import MarketHub from './pages/MarketHub';
import LandingPage from './pages/LandingPage';
import RequirePlan from './components/RequirePlan';
import i18n from './i18n';
import { useStore } from './store/useStore';

// Lazy-loaded pages for code splitting (reduce initial bundle)
const Calculator = React.lazy(() => import('./pages/Calculator'));
const TransactionsPage = React.lazy(() => import('./pages/TransactionsPage'));
const AssetDetailsPage = React.lazy(() => import('./pages/AssetDetailsPage'));
const AIAdvisor = React.lazy(() => import('./pages/AIAdvisor'));
const DividendsPage = React.lazy(() => import('./pages/DividendsPage'));
const RebalancePage = React.lazy(() => import('./pages/RebalancePage'));
const ImportNotes = React.lazy(() => import('./pages/ImportNotes'));
const TaxOptimizer = React.lazy(() => import('./pages/TaxOptimizer'));
const PremiumPlans = React.lazy(() => import('./pages/PremiumPlans'));
const PremiumAnalytics = React.lazy(() => import('./pages/PremiumAnalytics'));
const SettingsPage = React.lazy(() => import('./pages/SettingsPage'));
const SimulatorsPage = React.lazy(() => import('./pages/SimulatorsPage'));
const ArbitrageRadar = React.lazy(() => import('./pages/ArbitrageRadar'));
const AssetComparator = React.lazy(() => import('./pages/AssetComparator'));
const CommunityHub = React.lazy(() => import('./pages/CommunityHub'));
const PortfolioTimeline = React.lazy(() => import('./components/PortfolioTimeline'));
const LifeMap = React.lazy(() => import('./pages/LifeMap'));
const GoalSimulator = React.lazy(() => import('./pages/GoalSimulator'));
const CeilingPricePage = React.lazy(() => import('./pages/CeilingPricePage'));
const TitanAnalyst = React.lazy(() => import('./pages/TitanAnalyst'));
const BacktestPage = React.lazy(() => import('./pages/BacktestPage'));
const AlertsPage = React.lazy(() => import('./pages/AlertsPage'));
const ChatAdvisorPage = React.lazy(() => import('./pages/ChatAdvisorPage'));
const InsiderMonitorPage = React.lazy(() => import('./pages/InsiderMonitorPage'));
const OpenFinancePage = React.lazy(() => import('./pages/OpenFinancePage'));
const DualTaxPage = React.lazy(() => import('./pages/DualTaxPage'));
const DRIPProjectionPage = React.lazy(() => import('./pages/DRIPProjectionPage'));
const LifeMapDividendsPage = React.lazy(() => import('./pages/LifeMapDividendsPage'));
const DecisionCockpitPage = React.lazy(() => import('./pages/DecisionCockpitPage'));
const FIIsPage = React.lazy(() => import('./pages/FIIsPage'));
const RankingsPage = React.lazy(() => import('./pages/RankingsPage'));
const BenchmarksPage = React.lazy(() => import('./pages/BenchmarksPage'));
const AdminPage = React.lazy(() => import('./pages/AdminPage'));

// Loading fallback for lazy routes
const PageLoader = () => (
  <div className="flex items-center justify-center h-64">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
      <span className="text-gray-500 text-xs font-bold uppercase tracking-wider">Carregando...</span>
    </div>
  </div>
);

const AuthBackground = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen bg-[#020617] flex items-center justify-center relative overflow-hidden">
     {/* Background Blobs - Consistent with Landing Page */}
      <div className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-emerald-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none" />
     <div className="relative z-10 animate-fade-in-up">
       {children}
     </div>
  </div>
);

function App() {
  const { settings } = useStore();

  // Mantém o i18next sincronizado com o idioma persistido nas configurações
  useEffect(() => {
    const lang = settings.language ?? 'pt-BR';
    if (i18n.language !== lang) i18n.changeLanguage(lang);
  }, [settings.language]);

  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public Routes */}
        <Route path="/sign-in/*" element={
          <AuthBackground>
            <SignIn 
              routing="path" 
              path="/sign-in" 
              appearance={{
                elements: {
                  rootBox: "mx-auto",
                  card: "bg-[#020617]/80 backdrop-blur-xl border border-white/10 shadow-2xl",
                  headerTitle: "text-white",
                  headerSubtitle: "text-gray-400",
                  socialButtonsBlockButton: "bg-white/5 border-white/10 text-white hover:bg-white/10",
                  formFieldLabel: "text-gray-300",
                  formFieldInput: "bg-white/5 border-white/10 text-white",
                  footerActionText: "text-gray-400",
                  footerActionLink: "text-emerald-400 hover:text-emerald-300"
                }
              }}
            />
          </AuthBackground>
        } />
        
        <Route path="/sign-up/*" element={
          <AuthBackground>
            <SignUp 
              routing="path" 
              path="/sign-up" 
              appearance={{
                elements: {
                  rootBox: "mx-auto",
                  card: "bg-[#020617]/80 backdrop-blur-xl border border-white/10 shadow-2xl",
                  headerTitle: "text-white",
                  headerSubtitle: "text-gray-400",
                  socialButtonsBlockButton: "bg-white/5 border-white/10 text-white hover:bg-white/10",
                  formFieldLabel: "text-gray-300",
                  formFieldInput: "bg-white/5 border-white/10 text-white",
                  footerActionText: "text-gray-400",
                  footerActionLink: "text-emerald-400 hover:text-emerald-300"
                }
              }}
            />
          </AuthBackground>
        } />

        {/* Root Route: Landing Page (Public) or Dashboard (Protected) */}
        <Route path="/" element={
          <>
            <SignedOut>
              <LandingPage />
            </SignedOut>
            <SignedIn>
              <Layout>
                <Dashboard />
              </Layout>
            </SignedIn>
          </>
        } />

        {/* Protected App Routes */}
        <Route path="/market" element={
          <>
            <SignedIn>
              <Layout>
                <MarketHub />
              </Layout>
            </SignedIn>
            <SignedOut>
              <RedirectToSignIn />
            </SignedOut>
          </>
        } />

        <Route path="/fiis" element={
          <>
            <SignedIn>
              <Layout>
                <FIIsPage />
              </Layout>
            </SignedIn>
            <SignedOut>
              <RedirectToSignIn />
            </SignedOut>
          </>
        } />

        <Route path="/rankings" element={
          <>
            <SignedIn>
              <Layout>
                <RankingsPage />
              </Layout>
            </SignedIn>
            <SignedOut>
              <RedirectToSignIn />
            </SignedOut>
          </>
        } />

        <Route path="/benchmarks" element={
          <>
            <SignedIn>
              <Layout>
                <BenchmarksPage />
              </Layout>
            </SignedIn>
            <SignedOut>
              <RedirectToSignIn />
            </SignedOut>
          </>
        } />

        <Route path="/ceiling-price" element={
          <>
            <SignedIn>
              <Layout>
                <CeilingPricePage />
              </Layout>
            </SignedIn>
            <SignedOut>
              <RedirectToSignIn />
            </SignedOut>
          </>
        } />

        <Route path="/assets/:id" element={
          <>
            <SignedIn>
              <Layout>
                <AssetDetailsPage />
              </Layout>
            </SignedIn>
            <SignedOut>
              <RedirectToSignIn />
            </SignedOut>
          </>
        } />

        <Route path="/titan/:id" element={
          <>
            <SignedIn>
              <Layout>
                <RequirePlan min="pro">
                  <TitanAnalyst />
                </RequirePlan>
              </Layout>
            </SignedIn>
            <SignedOut>
              <RedirectToSignIn />
            </SignedOut>
          </>
        } />

        <Route path="/backtest" element={
          <>
            <SignedIn>
              <Layout>
                <RequirePlan min="pro">
                  <BacktestPage />
                </RequirePlan>
              </Layout>
            </SignedIn>
            <SignedOut>
              <RedirectToSignIn />
            </SignedOut>
          </>
        } />

        <Route path="/alerts" element={
          <>
            <SignedIn>
              <Layout>
                <RequirePlan min="starter">
                  <AlertsPage />
                </RequirePlan>
              </Layout>
            </SignedIn>
            <SignedOut>
              <RedirectToSignIn />
            </SignedOut>
          </>
        } />

        <Route path="/chat" element={
          <>
            <SignedIn>
              <Layout>
                <RequirePlan min="pro">
                  <ChatAdvisorPage />
                </RequirePlan>
              </Layout>
            </SignedIn>
            <SignedOut>
              <RedirectToSignIn />
            </SignedOut>
          </>
        } />

        <Route path="/insiders" element={
          <>
            <SignedIn>
              <Layout>
                <RequirePlan min="master">
                  <InsiderMonitorPage />
                </RequirePlan>
              </Layout>
            </SignedIn>
            <SignedOut>
              <RedirectToSignIn />
            </SignedOut>
          </>
        } />

        <Route path="/open-finance" element={
          <>
            <SignedIn>
              <Layout>
                <RequirePlan min="master">
                  <OpenFinancePage />
                </RequirePlan>
              </Layout>
            </SignedIn>
            <SignedOut>
              <RedirectToSignIn />
            </SignedOut>
          </>
        } />

        <Route path="/dual-tax" element={
          <>
            <SignedIn>
              <Layout>
                <RequirePlan min="elite">
                  <DualTaxPage />
                </RequirePlan>
              </Layout>
            </SignedIn>
            <SignedOut>
              <RedirectToSignIn />
            </SignedOut>
          </>
        } />

        <Route path="/drip" element={
          <>
            <SignedIn>
              <Layout>
                <RequirePlan min="pro">
                  <DRIPProjectionPage />
                </RequirePlan>
              </Layout>
            </SignedIn>
            <SignedOut>
              <RedirectToSignIn />
            </SignedOut>
          </>
        } />

        <Route path="/life-map-dividends" element={
          <>
            <SignedIn>
              <Layout>
                <RequirePlan min="master">
                  <LifeMapDividendsPage />
                </RequirePlan>
              </Layout>
            </SignedIn>
            <SignedOut>
              <RedirectToSignIn />
            </SignedOut>
          </>
        } />

        <Route path="/decisions" element={
          <>
            <SignedIn>
              <Layout>
                <RequirePlan min="starter">
                  <DecisionCockpitPage />
                </RequirePlan>
              </Layout>
            </SignedIn>
            <SignedOut>
              <RedirectToSignIn />
            </SignedOut>
          </>
        } />

        <Route path="/calculator" element={
          <>
            <SignedIn>
              <Layout>
                <Calculator />
              </Layout>
            </SignedIn>
            <SignedOut>
              <RedirectToSignIn />
            </SignedOut>
          </>
        } />

        <Route path="/transactions" element={
          <>
            <SignedIn>
              <Layout>
                <TransactionsPage />
              </Layout>
            </SignedIn>
            <SignedOut>
              <RedirectToSignIn />
            </SignedOut>
          </>
        } />

        <Route path="/timeline" element={
          <>
            <SignedIn>
              <Layout>
                <PortfolioTimeline />
              </Layout>
            </SignedIn>
            <SignedOut>
              <RedirectToSignIn />
            </SignedOut>
          </>
        } />

        <Route path="/life-map" element={
          <>
            <SignedIn>
              <Layout>
                <RequirePlan min="master">
                  <LifeMap />
                </RequirePlan>
              </Layout>
            </SignedIn>
            <SignedOut>
              <RedirectToSignIn />
            </SignedOut>
          </>
        } />

        <Route path="/goals" element={
          <>
            <SignedIn>
              <Layout>
                <GoalSimulator />
              </Layout>
            </SignedIn>
            <SignedOut>
              <RedirectToSignIn />
            </SignedOut>
          </>
        } />

        <Route path="/advisor" element={
          <>
            <SignedIn>
              <Layout>
                <RequirePlan min="pro">
                  <AIAdvisor />
                </RequirePlan>
              </Layout>
            </SignedIn>
            <SignedOut>
              <RedirectToSignIn />
            </SignedOut>
          </>
        } />

        <Route path="/dividends" element={
          <>
            <SignedIn>
              <Layout>
                <RequirePlan min="starter">
                  <DividendsPage />
                </RequirePlan>
              </Layout>
            </SignedIn>
            <SignedOut>
              <RedirectToSignIn />
            </SignedOut>
          </>
        } />

        <Route path="/rebalance" element={
          <>
            <SignedIn>
              <Layout>
                <RequirePlan min="starter">
                  <RebalancePage />
                </RequirePlan>
              </Layout>
            </SignedIn>
            <SignedOut>
              <RedirectToSignIn />
            </SignedOut>
          </>
        } />

        <Route path="/import" element={
          <>
            <SignedIn>
              <Layout>
                <RequirePlan min="starter">
                  <ImportNotes />
                </RequirePlan>
              </Layout>
            </SignedIn>
            <SignedOut>
              <RedirectToSignIn />
            </SignedOut>
          </>
        } />

        <Route path="/tax" element={
          <>
            <SignedIn>
              <Layout>
                <RequirePlan min="pro">
                  <TaxOptimizer />
                </RequirePlan>
              </Layout>
            </SignedIn>
            <SignedOut>
              <RedirectToSignIn />
            </SignedOut>
          </>
        } />

        <Route path="/simulators" element={
          <>
            <SignedIn>
              <Layout>
                <RequirePlan min="pro">
                  <SimulatorsPage />
                </RequirePlan>
              </Layout>
            </SignedIn>
            <SignedOut>
              <RedirectToSignIn />
            </SignedOut>
          </>
        } />

        <Route path="/radar" element={
          <>
            <SignedIn>
              <Layout>
                <RequirePlan min="master">
                  <ArbitrageRadar />
                </RequirePlan>
              </Layout>
            </SignedIn>
            <SignedOut>
              <RedirectToSignIn />
            </SignedOut>
          </>
        } />

        <Route path="/comparator" element={
          <>
            <SignedIn>
              <Layout>
                <RequirePlan min="master">
                  <AssetComparator />
                </RequirePlan>
              </Layout>
            </SignedIn>
            <SignedOut>
              <RedirectToSignIn />
            </SignedOut>
          </>
        } />

        <Route path="/community" element={
          <>
            <SignedIn>
              <Layout>
                <RequirePlan min="master">
                  <CommunityHub />
                </RequirePlan>
              </Layout>
            </SignedIn>
            <SignedOut>
              <RedirectToSignIn />
            </SignedOut>
          </>
        } />

        <Route path="/premium" element={
          <>
            <SignedIn>
              <Layout>
                <PremiumPlans />
              </Layout>
            </SignedIn>
            <SignedOut>
              <RedirectToSignIn />
            </SignedOut>
          </>
        } />
        
        <Route path="/premium/analytics" element={
          <>
            <SignedIn>
              <Layout>
                <RequirePlan min="pro">
                  <PremiumAnalytics />
                </RequirePlan>
              </Layout>
            </SignedIn>
            <SignedOut>
              <RedirectToSignIn />
            </SignedOut>
          </>
        } />

        <Route path="/settings" element={
          <>
            <SignedIn>
              <Layout>
                <SettingsPage />
              </Layout>
            </SignedIn>
            <SignedOut>
              <RedirectToSignIn />
            </SignedOut>
          </>
        } />

        {/* Painel administrativo (gate adicional por userId dentro da página) */}
        <Route path="/admin" element={
          <>
            <SignedIn>
              <Layout>
                <AdminPage />
              </Layout>
            </SignedIn>
            <SignedOut>
              <RedirectToSignIn />
            </SignedOut>
          </>
        } />

        {/* Catch all - redirect to root */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
