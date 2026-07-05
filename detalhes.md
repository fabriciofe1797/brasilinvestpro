# AutoInvest - Análise Detalhada da Lógica e Funcionalidades

## 1. Visão Geral do Produto

**AutoInvest** (marca: *BrasilInvest Pro*) é uma aplicação web de gestão de investimentos voltada para **brasileiros expatriados**, especialmente os que vivem em Portugal. A proposta central é permitir o gerenciamento unificado de patrimônio em reais (FIIs, Ações, Renda Fixa, Cripto) com inteligência cambial EUR/BRL, planejamento fiscal e recomendações automatizadas.

**Stack Tecnológica:**
- **Frontend:** React 18 + TypeScript + Vite
- **Estado:** Zustand (store global)
- **UI:** Tailwind CSS + Recharts (gráficos) + Lucide React (ícones)
- **Backend/DB:** Supabase (PostgreSQL + Edge Functions + RLS)
- **Autenticação:** Clerk (com template JWT para Supabase)
- **Pagamentos:** Stripe (links de checkout por plano)
- **Cotações:** BrAPI + CoinGecko (via Edge Function `refresh-prices`)
- **Câmbio:** AwesomeAPI / exchangerate.host (fallback)

---

## 2. Arquitetura da Aplicação

### 2.1 Estrutura de Pastas

```
src/
├── components/     → Componentes reutilizáveis (widgets, modais, cards)
├── data/           → Dados mock (catálogo base de ativos)
├── hooks/          → Hooks customizados (sync, alertas, impostos, tema)
├── lib/            → Utilitários (formatação, cálculos, fórmulas)
├── pages/          → Páginas/Rotas do app (18 páginas)
├── services/       → Camada de dados (API, banco, billing, IA, rebalancer)
├── store/          → Zustand store (estado global)
└── types/          → Tipagens TypeScript
```

### 2.2 Sistema de Rotas e Autenticação

Todas as rotas protegidas usam o padrão `SignedIn` / `SignedOut` do Clerk:
- **Não autenticado** → Redireciona para `/sign-in`
- **Autenticado** → Renderiza dentro do `<Layout>` (sidebar + header)
- **Plan-gated** → Algumas rotas usam `<RequirePlan min="starter|pro|master">` para bloquear funcionalidades por plano

**Rotas Públicas:** `/`, `/sign-in`, `/sign-up`
**Rotas Protegidas Livres (todos os planos):** `/market`, `/calculator`, `/transactions`, `/timeline`, `/goals`, `/settings`, `/premium`
**Rotas com RequirePlan:**
- `starter`: `/dividends`, `/rebalance`, `/import`
- `pro`: `/advisor`, `/tax`, `/simulators`, `/premium/analytics`
- `master`: `/life-map`, `/radar`, `/comparator`, `/community`

---

## 3. Funcionalidades Detalhadas

### 3.1 Dashboard (`/`)
**Arquivo:** `src/pages/Dashboard.tsx`

- **Boas-vindas personalizadas** com nome do usuário (Clerk)
- **Cartão EUR/BRL** com taxa em tempo real, variação percentual, fonte e mini-gráfico SVG
- **Total Portfolio Equity** com conversão bidirecional BRL ↔ EUR
- **Renda mensal e projeção anual** baseada em dividendos
- **Magic Number Tracker** — indicador circular de progresso para "bola de neve" (quantas cotas faltam para os dividendos se auto-sustentarem)
- **Tabela Top Assets** — resumo dos 5 maiores ativos do portfólio
- **MonthlyDecisionsWidget** — decisões do mês
- **RebalancingWidget** — sugestões de rebalanceamento rápido
- **DividendCalendar** — próximos dividendos
- **Plan Missions** — missões operacionais (aporte, rebalanceamento, educação)
- **Smart Alerts** — alertas inteligentes (drift de alocação, queda de preço, câmbio)

### 3.2 Hub de Mercado (`/market`)
**Arquivo:** `src/pages/MarketHub.tsx`

- **Catálogo de ativos** unindo dados mock + dados do usuário
- **Busca** por ticker ou nome
- **Filtros por categoria:** Todos, Tijolo, Papel, Agro, Ações, Renda Fixa, Internacional, Cripto
- **Sincronização de cotações** via Edge Function (BrAPI/CoinGecko)
- **AssetCard** com informações de preço, DY, P/VP, fonte da cotação
- Clique no ativo → abre modal para **registrar aporte**

### 3.3 Advisor / Tutor IA (`/advisor`) — Requer plano `pro`
**Arquivo:** `src/pages/AIAdvisor.tsx` (1239 linhas — a maior do projeto)

**Fluxo em 7 fases (wizard):**
1. **Intro** — Apresentação do "Neural Advisor"
2. **Risk (ARCA)** — Questionário de 5 perguntas para perfil de risco (Conservador/Moderado/Arrojado)
3. **Goal** — Objetivo estratégico (Reserva, Renda Passiva, Crescimento, Aposentadoria, Curto Prazo)
4. **Capital** — Capital inicial investível
5. **Horizon** — Horizonte temporal
6. **Contribution** — Aporte mensal
7. **Preferences** — Toggle para cripto e preferência por renda passiva

**Saída (resultado):**
- **Profile Analysis** com título, descrição e warnings
- **Allocation Matrix** — gráfico de pizza com % por classe
- **Deployment Schedule** — aporte mensal por classe + streak de aportes
- **Operational Missions** — lista de tarefas acionáveis
- **Tactical Recommendations** — ativos específicos com ticker, quantidade, valor e razão
- **Strategic Roadmap** — passos numerados
- **Initial Parity Matrix** — distribuição do capital inicial
- **Plan Archive** — histórico de planos anteriores (localStorage)
- **Cloud Sync** — salva perfil + plano no Supabase (`investment_profiles`)
- **Versionamento** — salva versão do plano em `investment_plan_versions`

**Lógica de geração do plano** (`src/services/aiAdvisor.ts`):
- Alocação base por perfil de risco (60/20/10/10, 40/25/25/10, 20/25/35/20)
- Ajuste de cripto (2-10% conforme perfil)
- Normalização de percentuais
- Seleção tática de ativos do catálogo mock por classe
- Priorização de ativos acessíveis ao orçamento

### 3.4 Transações (`/transactions`)
**Arquivo:** `src/pages/TransactionsPage.tsx`

- **KPIs:** Capital Alocado (BUY), Capital Realizado (SELL), Net Balance
- **Tabela completa** com: Ativo, Operação (IN/OUT), Volume, Preço, Total, P/L Realizado, Data
- **P/L realizado** exibido apenas para vendas

### 3.5 Dividendos (`/dividends`) — Requer plano `starter`
**Arquivo:** `src/pages/DividendsPage.tsx`

- **Renda mensal estimada** total
- **Snowball Index** — quantos ativos atingiram o Número Mágico
- **Projeção anual** (12 meses)
- **Gráfico de barras** com previsão de cashflow (Recharts)
- **Snowball Meter** — lista de ativos com barra de progresso para o Número Mágico (cotas necessárias para dividendos comprarem 1 cota)

### 3.6 Rebalanceamento (`/rebalance`) — Requer plano `starter`
**Arquivo:** `src/pages/RebalancePage.tsx` (867 linhas)

- **Carrega plano** do Supabase (nuvem) ou localStorage (fallback)
- **Score de aderência** (0-100%) — o quão perto está da meta
- **Agressividade de vendas** — Conservador (30%), Balanceado (60%), Agressivo (100%)
- **Modo só aporte** — usa apenas novos aportes sem vender
- **Sugestões por classe** — BUY/SELL/HOLD com diferença em R$
- **Sugestões de ativos específicos** baseadas no plano do Tutor
- **Proteção do Número Mágico** — não vende cotas abaixo do magic number
- **Executar ordem** — abre modal de transação pré-preenchido
- **Executar todas** — compra em lote por classe

**Lógica do rebalancer** (`src/services/rebalancer.ts`):
- Mapeia categorias de ativos para classes (Renda Fixa, FIIs, Ações, Internacional, Cripto)
- Compara % atual vs % alvo do plano
- Tolerância de 2% para considerar HOLD
- Status: OK (<5%), WARNING (5-10%), CRITICAL (>10%)
- Score = 100 - (soma dos desvios / 2)

### 3.7 Otimizador Fiscal (`/tax`) — Requer plano `pro`
**Arquivo:** `src/pages/TaxOptimizer.tsx` + `src/hooks/useTaxOptimizer.ts`

- **DARF do mês** — imposto estimado a pagar
- **Carry-forward losses** — prejuízos acumulados para compensar
- **Volume de vendas** do mês
- **Tabela de posições** com: ticker, quantidade, PM, custo total, valor de mercado, P/L não realizado + ROI%
- **Tax Loss Harvesting** (Master/Elite) — sugere vender ativos em prejuízo para compensar ganhos
- **Histórico mensal** — ledger de obrigações fiscais

**Lógica fiscal** (`useTaxOptimizer.ts`):
- Replay cronológico de transações para calcular PM
- Cálculo de lucro realizado por venda
- Taxa flat de 15% (simplificado — não diferencia ações/FII/isenção 20k)
- Compensação automática de prejuízos

### 3.8 Importação de Notas (`/import`) — Requer plano `starter`
**Arquivo:** `src/pages/ImportNotes.tsx`

- Upload de notas de corretagem em PDF
- Parsing via `pdfParser.ts` (pdfjs-dist)
- Extração de transações e importação para o portfólio

### 3.9 Simuladores (`/simulators`) — Requer plano `pro`
**Arquivo:** `src/pages/SimulatorsPage.tsx`

- Simulador de juros compostos (DRIP)
- Simulador de independência financeira
- Projeção de dividendos

### 3.10 Radar de Arbitragem (`/radar`) — Requer plano `master`
**Arquivo:** `src/pages/ArbitrageRadar.tsx`

- Detecção de oportunidades de arbitragem entre mercados

### 3.11 Comparador de Ativos (`/comparator`) — Requer plano `master`
**Arquivo:** `src/pages/AssetComparator.tsx`

- Comparação lado a lado de múltiplos ativos

### 3.12 Comunidade (`/community`) — Requer plano `master`
**Arquivo:** `src/pages/CommunityHub.tsx`

- Hub social da comunidade de investidores

### 3.13 LifeMap (`/life-map`) — Requer plano `master`
**Arquivo:** `src/pages/LifeMap.tsx`

- Mapa de vida financeira com projeções de longo prazo

### 3.14 Metas (`/goals`)
**Arquivo:** `src/pages/GoalSimulator.tsx`

- Simulador de metas financeiras

### 3.15 Timeline (`/timeline`)
**Arquivo:** `src/components/PortfolioTimeline.tsx`

- Evolução patrimonial ao longo do tempo (timeseries do Supabase)

### 3.16 Landing Page (`/` quando não autenticado)
**Arquivo:** `src/pages/LandingPage.tsx` (1184 linhas)

- **Market Ticker** animado no topo
- **Hero** com CTA e calculadora do Número Mágico
- **Impact Stats** com contadores animados
- **How It Works** em 3 passos
- **Pain Points** do expatriado
- **Feature Showcase** com 4 cards
- **DRIP Simulator** interativo (aportes, anos, DY, câmbio)
- **Comparação** antes/depois
- **Testimonials** com carrossel infinito
- **FAQ** com accordion
- **Planos** (5 tiers) com toggle mensal/anual
- **Trust Bar** (SSL, GDPR, Stripe, Read-only)

### 3.17 Configurações (`/settings`)
**Arquivo:** `src/pages/SettingsPage.tsx`

- Configurações de moeda base, taxa de câmbio, aporte mensal, meta de dividendos
- Alvos de alocação por categoria
- Taxa de custódia e threshold Selic

---

## 4. Lógica Central do Portfólio

### 4.1 Store Zustand (`src/store/useStore.ts`)

**Estado global:**
- `assets[]` — catálogo de ativos (mock + dados do usuário)
- `portfolio[]` — posições atuais (assetId, quantidade, preço médio)
- `transactions[]` — histórico de transações
- `settings` — configurações (moeda, câmbio, plano, alvos)
- `notifications[]` — notificações do sistema
- `missions[]` — missões do plano
- `alerts[]` — alertas do portfólio

**Lógica de transação (addTransaction):**
1. Verifica limites do plano (transações/mês e ativos distintos)
2. Calcula `total = (preço × quantidade) + taxas`
3. Para **BUY**: recalcula preço médio ponderado
4. Para **SELL**: reduz quantidade (mantém PM)
5. Limpa alertas de contribuição se for BUY
6. Atualiza missões (marca "monthly-total" como completed)
7. Persiste no estado local (optimistic update)

**Sync de transações (syncTransactions):**
- Recebe transações do Supabase
- Rebuild do portfólio do zero (replay cronológico)
- Ordena por data ascendente
- Recalcula PM a cada BUY
- Remove posições com quantidade zerada

### 4.2 Sincronização de Dados (`src/hooks/useDataSync.ts` + `DataSynchronizer.tsx`)

- Na inicialização (após 1s do login): busca transações, ativos, cotações, câmbio e licença do Supabase
- Sincroniza o store local com dados remotos
- Gerencia fallbacks para cotações e câmbio

### 4.3 Sistema de Licenças e Planos

**5 tiers:** `free` → `starter` → `pro` → `master` → `elite`

| Limite | Free | Starter | Pro | Master | Elite |
|--------|------|---------|-----|--------|-------|
| Ativos | 3 | 10 | 25 | 50 | ∞ |
| Transações/mês | 20 | 200 | 1000 | 1000 | ∞ |

- **Verificação local** no `addTransaction` (bloqueia se exceder)
- **Verificação no backend** via Edge Function (garante consistência)
- **Upgrade Modal** com cooldown de 60s no localStorage
- **Planos pagos** via Stripe links (com `client_reference_id` para atribuição)
- **Webhook Stripe** (`stripe-webhook`) atualiza plano no banco

### 4.4 Alertas Inteligentes (`src/hooks/useSmartAlerts.ts`)

- **Allocation Drift** — alerta se alocação atual difere >10% da meta
- **Price Events** — alerta para quedas >15% no dia
- **Exchange Alert** — variação cambial >5%
- **Oportunidades** — ativos com score ≥65 fora do portfólio
- Combina alertas gerados + alertas do banco

### 4.5 Scoring de Ativos (`src/lib/utils.ts`)

**calculateAssetScore** — score 0-100 com 4 fatores:
- **Valuation (25%)** — P/VP para FIIs, P/L para ações
- **Dividend Score (35%)** — DY ≥8% = +30, ≥6% = +20, ≥4% = +10
- **Price Score (25%)** — quedas recentes = oportunidade
- **Category Score (15%)** — FII estável (+10), Cripto volátil (-10)

**Labels:** Excelente (≥75), Bom (≥55), Moderado (≥35), Baixo (<35)

---

## 5. Serviços Backend (Supabase Edge Functions)

### 5.1 `app-proxy` (`supabase/functions/app-proxy/index.ts`)
Proxy centralizado para todas as operações:
- `ensure_profile` — cria perfil do usuário
- `get_transactions` / `save_transaction` — CRUD de transações
- `get_assets` / `upsert_asset` — CRUD de ativos
- `get_portfolio` / `get_portfolio_timeseries` — portfólio calculado
- `get_quotes` — cotações (BrAPI/CoinGecko)
- `get_exchange_rates` — câmbio EUR/BRL e USD/BRL
- `get_savings_products` / `seed_savings_products` — produtos de poupança
- `get_user_license` — licença/plan do usuário

### 5.2 `refresh-prices` (`supabase/functions/refresh-prices/index.ts`)
- Atualização periódica de preços dos ativos

### 5.3 `check-licenses` (`supabase/functions/check-licenses/index.ts`)
- Verificação de licenças expiradas

### 5.4 `stripe-webhook` (`supabase/functions/stripe-webhook/index.ts`)
- Webhook para eventos Stripe (criação/alteração de assinatura)

---

## 6. Melhorias Identificadas e Novas Funcionalidades

### 🔴 Críticas (Alta Prioridade)

| # | Melhoria | Descrição |
|---|----------|-----------|
| 1 | **Cálculo fiscal incompleto** | O `useTaxOptimizer` usa taxa flat de 15% e **não diferencia** tipos de ativo (ações têm isenção de 20k/mês para vendas, FIIs têm 20%, renda fixa tem tabela regressiva). Isso gera DARFs incorretos. |
| 2 | **P/L realizado não calculado na venda** | O `addTransaction` no store não calcula `realizedPnl` nem `costBasis` ao vender. Esses campos ficam `undefined`, causando `--` na UI. |
| 3 | **Performance do Dashboard** | O Dashboard recalcula `totalValueBRL` e `monthlyIncomeBRL` a cada render sem memoização. Com muitos ativos, isso causa re-renders desnecessários. |
| 4 | **Concorrência no portfólio** | O `syncTransactions` faz rebuild completo, mas o `addTransaction` faz update incremental. Se uma sync ocorrer durante uma transação local, pode haver inconsistência. |
| 5 | **Bug no useSmartAlerts** | Linha 72 contém texto em chinês (`不利于`) misturado com português — provável artefato de desenvolvimento. |

### 🟡 Importantes (Média Prioridade)

| # | Melhoria | Descrição |
|---|----------|-----------|
| 6 | **Persistência do estado Zustand** | O store é 100% volátil (exceto via sync). Se o usuário ficar offline, perde dados. Implementar `zustand/middleware` com `persist` (localStorage ou IndexedDB). |
| 7 | **Validação de transações duplicadas** | Não há check de duplicidade ao registrar transação (mesmo ativo, data, quantidade). Pode gerar dados fantasmas. |
| 8 | **Magic Number hardcoded** | A fórmula `Math.ceil(1200 / dividendYield)` assume R$1.200/mês como base. Deveria ser configurável pelo usuário (meta mensal customizada). |
| 9 | **Contribution Streak mockada** | No Dashboard, `contributionStreak = 4` é hardcoded. No AIAdvisor, é calculada corretamente. Unificar lógica. |
| 10 | **Filtros de datas nas transações** | A página de transações não permite filtrar por período, tipo (BUY/SELL) ou ativo específico. |
| 11 | **Internacional não mapeado corretamente** | O `mapCategoryToClass` não trata `Renda Fixa ETF` como Renda Fixa automaticamente em todos os casos. |
| 12 | **Cotações sem cache** | Cada chamada ao MarketHub dispara `refreshQuotes` via Edge Function. Implementar cache local com TTL (ex: 5 min). |
| 13 | **Sell sem cálculo de P/L no rebalancer** | O `buildSellSuggestions` calcula `returnPct` mas não estima o imposto da venda sugerida. |
| 14 | **Plano não considera ativos já possuídos** | O `generateInvestmentPlan` sugere ativos do mock sem verificar se o usuário já os possui na carteira real. |
| 15 | **Landing Page com dados estáticos** | Tickers, depoimentos e stats são 100% estáticos. Não há integração com dados reais. |

### 🟢 Desejáveis (Baixa Prioridade / Inovação)

| # | Nova Funcionalidade | Descrição |
|---|---------------------|-----------|
| 16 | **Modo offline (PWA)** | Transformar em PWA com Service Worker para funcionar sem internet. Dados sincronizam quando reconectar. |
| 17 | **Notificações push** | Enviar push notification quando: câmbio favorável, dividendos caindo, alerta de rebalanceamento. |
| 18 | **Importação automática (Open Finance)** | Como mencionado na Landing Page, integrar com Open Finance para importar dados de corretoras automaticamente. |
| 19 | **Relatório PDF mensal** | Gerar relatório completo (portfólio, dividendos, IR) em PDF para download. |
| 20 | **Comparador de corretoras** | Comparar taxas de corretura, fundos disponíveis e condições entre XP, Rico, Clear, etc. |
| 21 | **Simulador de aposentadoria** | Calcular quando o usuário atinge independência financeira baseado em aportes, DY e inflação. |
| 22 | **Social features** | Rankings anônimos, carteiras-modelo de outros usuários, copy trading (seguir estratégias). |
| 23 | **Alertas de oportunidades via IA** | Usar LLM para analisar notícias do mercado e sugerir oportunidades alinhadas ao perfil. |
| 24 | **Multi-moeda** | Suportar USD, GBP além de EUR/BRL para expatriados em outros países. |
| 25 | **API pública** | Expor endpoints REST para integração com outros apps (ex: planilhas, bots). |
| 26 | **Backtesting de estratégias** | Permitir testar "e se" com dados históricos (ex: "se eu tivesse comprado X em 2020..."). |
| 27 | **Integração com contabilidade** | Exportar dados em formato compatível com softwares de contabilidade para declaração de IR. |
| 28 | **Dark/Light theme funcional** | O toggle existe no store mas o tema claro não está implementado visualmente. |
| 29 | **Gamificação avançada** | Badges, conquistas, níveis por consistência de aportes, diversificação, etc. |
| 30 | **Widget para celular** | Widget iOS/Android com resumo do portfólio e cotações na tela inicial. |

---

## 7. Análise de Qualidade do Código

### Pontos Fortes
- **TypeScript consistente** — tipagens bem definidas em `types/index.ts`
- **Separação de responsabilidades** — services, hooks, store, pages bem isolados
- **UI premium** — design system coeso com glass-morphism e animações
- **Fallbacks** — serviços de banco têm fallback para acesso direto quando Edge Function falha
- **Gamificação** — Número Mágico, Missões, Streak criam engajamento

### Pontos Fracos
- **Arquivos muito grandes** — AIAdvisor (1239 linhas), LandingPage (1184 linhas), RebalancePage (867 linhas) — difíceis de manter
- **Lógica fiscal simplificada demais** — não usable para declaração real de IR
- **console.warn como debug** — vários `console.warn` de debug espalhados (devem ser removidos em produção)
- **Sem testes** — não há arquivos de teste no projeto
- **Mock data como base** — o catálogo mock é usado em produção como fallback, o que pode gerar dados inconsistentes
- **Hardcoded strings** — muitos textos em inglês misturados com português sem i18n
- **Sem error boundaries globais** — apenas `ErrorBoundary.tsx` existe como componente, mas não está envolviendo o app inteiro

---

## 8. Resumo Executivo

O **AutoInvest** é um produto ambicioso e bem desenhado visualmente, com uma proposta de valor clara para um nicho específico (brasileiros em Portugal). A arquitetura é sólida para um MVP, com boa separação de camadas e uso adequado de Supabase + Clerk.

Os **principais riscos** são:
1. Cálculo fiscal incorreto pode gerar multas para usuários
2. Ausência de testes automatizados
3. Escalabilidade do estado global sem persistência offline
4. Dependência de dados mock para o catálogo base

As **oportunidades** mais promissoras são:
1. Implementar cálculo fiscal correto (diferenciando tipos de ativo)
2. Adicionar modo offline (PWA)
3. Criar integrações reais com corretoras (Open Finance)
4. Expandir para outros mercados (EUA, Reino Unido)
5. Adicionar IA generativa para recomendações personalizadas


---

# 🚀 Plano Estratégico de Upgrade: AutoInvest vs AGF

## Análise Comparativa Crítica

### O que o AGF já faz bem (e o AutoInvest precisa igualar)

| Funcionalidade AGF | Status no AutoInvest | Gap |
|---|---|---|
| **Import via B3** (importação automática pela bolsa) | ❌ Inexistente | CRÍTICO — AGF importa direto da B3; AutoInvest depende de PDF/manual |
| **MDI (Mapa de Dividendos)** com histórico de 10 anos | ⚠️ Parcial (DividendCalendar existe, mas não tem MDI histórico) | ALTO — MDI é o "carro-chefe" do AGF |
| **Preço Teto** (Média, Projetivo, Consenso) | ⚠️ Parcial (Simulador de Preço Teto proposto) | ALTO — AGF tem 3 tipos de preço-teto; AutoInvest não tem nenhum |
| **Yield on Cost (YoC)** | ❌ Inexistente | ALTO — Métrica essencial para investidores de dividendos |
| **Ranking de Empresas** com filtros avançados | ⚠️ Parcial (MarketHub existe, mas sem ranking) | MÉDIO |
| **Comunidade** (posts, comentários, polls, @menções) | ⚠️ Parcial (CommunityHub existe mas é placeholder) | MÉDIO |
| **Conteúdo Educacional** (cursos, lives) | ❌ Inexistente | MÉDIO — AGF tem parceria com Columbia Business School |
| **2FA / Segurança** | ✅ Clerk já fornece 2FA nativo | OK |
| **300k+ usuários** | 0 (lançamento) | Gap de escala massivo |
| **R$ 2.5B em dividendos rastreados** | 0 | Gap de dados |

### O que o AutoInvest já faz MELHOR que o AGF

| Funcionalidade AutoInvest | Vantagem Competitiva |
|---|---|
| **Magic Number** (Bola de Neve) | 🟢 EXCLUSIVO — Nenhuma calculadora no AGF |
| **Rebalanceamento Automático** com sugestões de ordens | 🟢 SUPERIOR — AGF não rebalanceia |
| **Otimizador Fiscal** (DARF + carry-forward) | 🟢 EXCLUSIVO — AGF não calcula imposto |
| **AI Advisor** com wizard ARCA + plano personalizado | 🟢 SUPERIOR — AGF não tem consultoria automatizada |
| **Multi-moeda** (BRL/EUR/USD com conversão ao vivo) | 🟢 EXCLUSIVO — AGF é só BRL |
| **Arbitrage Radar** (cripto + DeFi) | 🟢 EXCLUSIVO — AGF não cobre cripto |
| **Comparador de Ativos** com gráficos | 🟢 SUPERIOR — AGF tem ranking básico |
| **Simulador de Independência Financeira** | 🟢 EXCLUSIVO — AGF não projeta futuro |
| **Portfolio Timeline** (histórico visual) | 🟢 SUPERIOR — AGF não tem timeline |
| **Tax Loss Harvesting** | 🟢 EXCLUSIVO — Nenhum app brasileiro tem |
| **Stocks/REITs internacionais** | 🟢 EXCLUSIVO — AGF é 100% focado em Brasil |

---

## 🎯 Estratégia de Superação: 7 Pilares

### Pilar 1: Dados Automatizados (Eliminar Fricção de Entrada)

**Problema atual:** O maior gargalo do AutoInvest é a entrada manual de dados. O AGF resolve isso com importação B3.

**Solução proposta (superior ao AGF):**

```
1. Open Finance Brasil (API Pluggy/Linker)
   - Conectar com XP, BTG, Itaú, Rico, Clear, NuInvest, etc.
   - Sync automático de posições e transações
   - Diferencial vs AGF: AGF só importa da B3 (atraso de 1 dia)
   - Open Finance tem dados em tempo real

2. Importação B3 (fallback)
   - Implementar parser do relatório B3 (CEI/Balcão B3)
   - Sync de posições custodiadas

3. Importação Internacional
   - Parser de PDFs da Interactive Brokers, Degiro, Revolut
   - API da Wise para conversão automática

4. Detecção Automática de Dividendos
   - Microserviço que lê dados abertos da CVM diariamente
   - Captura dividendos anunciados antes das APIs comerciais
   - Edge Function Supabase roda cron (a cada 6h) para sync
```

**Diferencial:** AGF importa da B3 com delay. AutoInvest com Open Finance terá dados em tempo real + cobertura internacional.

---

### Pilar 2: Motor de Inteligência de Dividendos (MDI 2.0)

**O que o AGF faz:** MDI mostra quando empresas historicamente anunciam dividendos.

**O que o AutoInvest deve fazer (MDI 2.0 — superior):**

```
MDI 2.0 = MDI do AGF + Preditivo + IA + Multi-moeda

Componentes:
├── Calendário Histórico (igual ao AGF, baseado em 10 anos)
├── Previsão Probabilística (EXCLUSIVO)
│   └── Algoritmo: Regressão de séries temporais + fluxo de caixa livre
│   └── Output: "87% de chance de ITSA4 anunciar dividendos entre 15-25/03"
├── Detector de Recorrência (EXCLUSIVO)
│   └── Classifica dividendos em: Mensal, Trimestral, Semestral, Anual, Extraordinário
│   └── Detecta mudanças de padrão (ex: empresa mudou de trimestral para semestral)
├── Preço Teto Triplo (inspirado no AGF, executado com IA)
│   ├── Preço Teto Clássico (Barsi): DJA / 0.06
│   ├── Preço Teto Projetivo: usa projeções de analistas
│   └── Preço Teto IA: normaliza dividendos excluindo não-recorrentes
├── Yield on Cost (YoC) — igualar AGF
│   └── Rentabilidade sobre preço médio ponderado
│   └── Exibir por ativo e por carteira total
└── Tradutor de Poder de Compra (EXCLUSIVO)
    └── "Seus dividendos pagam X cafés em Lisboa" ou "Y seguros saúde"
    └── Conversão automática BRL → EUR → poder de compra local
```

**Diferencial:** AGF mostra histórico. AutoInvest vai prever o futuro e contextualizar globalmente.

---

### Pilar 3: IA Generativa como Diferencial Competitivo

**O AGF não tem IA generativa.** Esta é a maior oportunidade de diferenciação.

```
Neural Advisor 2.0 — Arquitetura

Camada 1: Análise Quantitativa (já existe parcialmente no AIAdvisor)
├── Questionário ARCA (perfil de risco)
├── Alocação por classe (Conservador/Moderado/Agressivo)
└── Seleção de ativos por score

Camada 2: Análise Qualitativa (NOVO — LLM)
├── Titan Analyst (EXCLUSIVO)
│   ├── Input: ITR/DFP da CVM + notícias + dados de mercado
│   ├── Processamento: LLM resume em 3 pilares
│   │   ├── Saúde da Dívida (Net Debt/EBITDA, cobertura de juros)
│   │   ├── Sustentabilidade do Dividendo (Payout, FCF Yield)
│   │   └── Risco Setorial (concentração, regulação, concorrência)
│   └── Output: Score 0-100 + resumo em linguagem natural
│
├── Explicador de Balanço (EXCLUSIVO)
│   └── Botão em cada ativo: "Explique este balanço"
│   └── IA gera resumo em 3 parágrafos do último relatório
│
└── Chat Advisor (EXCLUSIVO)
    └── Chat com IA contextualizado no portfólio do usuário
    └── Perguntas: "Devo vender VALE3?" "Como rebalancear?"
    └── IA responde com base nos dados reais da carteira

Camada 3: Análise de Sentimento (EXCLUSIVO)
├── Monitoramento de notícias (API de news financeira)
├── Classificação: Positivo/Negativo/Neutro por ativo
├── Alertas proativos:
│   "ITSA4 anunciou reinvestimento de R$2B. Dividendo pode cair 10% 
│    no curto prazo, mas FCF projetado cresce 15% em 2 anos."
└── Resumo semanal: "Sua carteira teve sentimento +0.3 esta semana"
```

**Diferencial:** AGF é estático (dados + metodologia Barsi). AutoInvest será dinâmico (IA + dados em tempo real + predição).

---

### Pilar 4: Otimização Fiscal Profissional (Inexistente no AGF)

**O AGF não calcula imposto.** Este é um diferencial massivo.

```
Tax Engine 2.0 — Evolução do Otimizador Fiscal

Módulo 1: Cálculo Fiscal Real (substituir taxa flat de 15%)
├── Ações: Isenção R$20k/mês para vendas + 15% sobre excedente
├── FIIs: 20% flat (sem isenção)
├── Renda Fixa: Tabela regressiva IR (15%-22.5%)
├── Cripto: 15% sobre ganho (isenção até R$35k/mês para cripto)
├── Day Trade: 20% sobre ganho
├── Internacional: 15% + IOF + spread
└── DARF mensal com cálculo preciso

Módulo 2: Planejamento Fiscal Proativo (EXCLUSIVO)
├── Simulador: "Se eu vender X hoje, quanto de imposto pago?"
├── Alerta: "Você está a R$3.000 do limite de isenção de R$20k"
├── Sugestão: "Venda em lotes para aproveitar isenção mensal"
├── Carry-forward automático de prejuízos
└── Relatório anual para Declaração de IR

Módulo 3: Bitributação Internacional (EXCLUSIVO — Diferencial Expatriado)
├── Cálculo de crédito de imposto Brasil ↔ Portugal
├── Acordo de Bitributação: mapeamento por tipo de ativo
├── Withholding tax por país (EUA: 30%, Portugal: 28%, etc.)
├── Formulário automático para recuperação de imposto
└── Alerta: "Seu dividendo de KO teve 30% retido nos EUA. 
    Você pode creditar X em Portugal."
```

**Diferencial:** AGF ignora completamente a parte fiscal. AutoInvest pode ser o único app a resolver isso.

---

### Pilar 5: Experiência do Usuário (UX) Superior

```
UX Diferenciais vs AGF:

1. Dashboard Preditivo (EXCLUSIVO)
   AGF mostra: "Você tem R$50.000 em ações"
   AutoInvest mostra: "Sua carteira vai gerar R$450/mês em dividendos 
   em 2026 (baseado em projeções). Você precisa de R$12.000/mês para 
   FI. Faltam 26 meses no ritmo atual."

2. Magic Number Tracker (EXCLUSIVO — já existe!)
   - Bola de neve visual: "Faltam 230 cotas para o Magic Number"
   - Projeção: "No ritmo atual, você atinge em Março/2027"
   - AGF não tem NADA equivalente

3. Portfolio Health Score (EXCLUSIVO)
   - Score 0-100 que mede saúde do portfólio
   - Critérios: Diversificação, qualidade dos ativos, aderência ao plano,
     sustentabilidade de dividendos, risco fiscal
   - Evolução temporal (gráfico)
   - Recomendações automáticas para melhorar o score

4. Notificações Inteligentes (superior ao AGF)
   - Preço-teto atingido: "ITSA4 está 8% abaixo do preço-teto"
   - Drift de alocação: "Renda Fixa está 15% acima do alvo"
   - Oportunidade: "BBAS3 pagará data-com amanhã. DY projetado: 8.2%"
   - Fiscal: "Faltam 5 dias para o DARF de Fevereiro"

5. Modo Escuro Nativo (já existe!) vs AGF (sem modo escuro nativo)

6. Onboarding Gamificado (EXCLUSIVO)
   - Wizard de 5 minutos para primeira configuração
   - Missões diárias: "Adicione sua primeira transação"
   - Badges: "Primeira bola de neve", "100 transações", "Diversificador"
   - AGF tem onboarding básico
```

---

### Pilar 6: Funcionalidades Exclusivas (O que NINGUÉM tem)

```
Funcionalidades que posicionam o AutoInvest como único no mercado:

1. 🌍 Multi-Portfolio Internacional (EXCLUSIVO TOTAL)
   - Portfólio em BRL + EUR + USD consolidado
   - Conversão ao vivo com taxas reais (AwesomeAPI)
   - P/L cambial separado do P/L operacional
   - "Seu portfólio em BRL rendeu 12%, mas em EUR rendeu 8% 
     (desvalorização cambial)"
   - AGF é 100% BRL — não atende expatriados

2. 🔄 Rebalanceamento Automático com Execução (EXCLUSIVO)
   - Já calcula rebalanceamento (RebalancePage)
   - Próximo passo: gerar ordens de compra/venda prontas
   - Integração com corretora para execução (futuro)
   - AGF não rebalanceia

3. 📉 Tax Loss Harvesting Automatizado (EXCLUSIVO)
   - Já existe no TaxOptimizer
   - Detecta automaticamente oportunidades de venda com prejuízo
   - Calcula impacto fiscal e sugere timing
   - Nenhum app brasileiro tem isso

4. 🎯 Simulador de Bola de Neve (Magic Number) (EXCLUSIVO)
   - Já existe! (getMagicNumber em utils.ts)
   - Cotas necessárias para dividendo comprar 1 cota
   - Projeção temporal com aporte mensal
   - AGF não tem

5. 🤖 AI Advisor com Plano Personalizado (SUPERIOR)
   - Wizard ARCA + geração de plano de investimento
   - Sugestões por classe de ativo com ativos reais
   - AGF não tem consultoria automatizada

6. 📊 Portfolio Backtesting (EXCLUSIVO — a implementar)
   - "E se eu tivesse seguido a estratégia do Advisor desde 2020?"
   - Simulação com dados históricos reais
   - Comparação com CDI, Ibovespa, CDI+6%

7. 🔍 Rastreador de Insiders (EXCLUSIVO — a implementar)
   - Monitora compras/vendas de diretores (dados CVM)
   - Alerta: "Diretor da VALE3 comprou R$5M em ações"
   - Sinal de confiança na gestão

8. 💶 Arbitragem Cambial Inteligente (EXCLUSIVO)
   - Analisa câmbio BRL/EUR/USD
   - Sugere melhor momento para aportar em ativos internacionais
   - "Real desvalorizou 5% esta semana. Bom momento para converter."
```

---

### Pilar 7: Monetização e Posicionamento de Mercado

```
Evolução do Modelo de Negócios:

TIER        PREÇO       FOCO                           DIFERENCIAL vs AGF
Free        R$0         3 ativos, dashboard básico     AGF: 7 dias grátis
Starter     R$19/mês    10 ativos + transações         AGF: R$29/mês (básico)
Pro         R$39/mês    AI Advisor + Fiscal            AGF: R$59/mês (com MDI)
Master      R$69/mês    MDI + Bitributação + Backtest  AGF: R$99/mês (premium)
Elite       R$129/mês   IA ilimitada + Open Finance    AGF: não tem

Diferenciais de Monetização:
1. Preço 30-40% menor que AGF em todos os tiers
2. Plano gratuito mais generoso (3 ativos vs 0 do AGF)
3. Cobertura internacional (AGF é só Brasil)
4. IA generativa (AGF não tem)
5. Otimização fiscal (AGF não tem)

Receitas Adicionais:
- Marketplace de Câmbio: parceria Wise/Nomad (cashback por conversão)
- Marketplace de Seguros: parceria para seguro de vida/investimento
- Afiliados de Corretoras: comissão por indicação
- Cursos Premium: conteúdo educacional (concorrente direto do AGF Academy)
```

---

## 📋 Roadmap de Implementação (Priorizado por Impacto Competitivo)

### Fase 1 — Fundação (Mês 1-2) — "Fechar Gaps Críticos"

```
PRIORIDADE ALTA (sem isso, não compete):

1. ✅ Corrigir bugs existentes (texto chinês, P/L realizado)
2. ✅ Implementar cálculo fiscal real (substituir taxa flat 15%)
3. ✅ Persistência offline (zustand/persist + Service Workers)
4. ✅ Preço Teto (3 tipos: Clássico, Projetivo, Consenso)
5. ✅ Yield on Cost (YoC) por ativo e por carteira
6. ✅ Importação B3 (parser do relatório CEI/Balcão B3)
7. ✅ MDI Histórico (calendário de dividendos com 10 anos de dados)
```

### Fase 2 — Inteligência (Mês 3-4) — "Criar Diferenciais"

```
PRIORIDADE ALTA (diferenciação):

1. ✅ MDI 2.0 com previsão probabilística
2. ✅ Titan Analyst MVP (IA resumindo ITRs)
3. ✅ Chat Advisor contextualizado no portfólio
4. ✅ Portfolio Health Score
5. ✅ Análise de Sentimento (monitoramento de notícias)
6. ✅ Simulador de Backtesting
7. ✅ Notificações push inteligentes
```

### Fase 3 — Conectividade (Mês 5-6) — "Eliminar Fricção"

```
PRIORIDADE MÉDIA (retenção):

1. ✅ Open Finance (Pluggy) — sync automático com corretoras
2. ✅ Microserviço CVM (dados abertos — dividendos em tempo real)
3. ✅ Importação internacional (Interactive Brokers, Degiro)
4. ✅ Rastreador de Insiders (compras de diretores via CVM)
5. ✅ PWA completo (install, offline, push)
```

### Fase 4 — Expansão (Mês 7-9) — "Dominar Mercados"

```
PRIORIDADE MÉDIA (crescimento):

1. ✅ Suporte a Stocks/REITs americanos (dados + impostos EUA)
2. ✅ Bitributação Brasil ↔ Portugal (módulo fiscal internacional)
3. ✅ Arbitragem Cambial Inteligente
4. ✅ Comunidade funcional (posts, comentários, rankings)
5. ✅ Gamificação (badges, streaks, rankings anônimos)
6. ✅ Internacionalização i18n (PT-BR, PT-PT, EN-US)
```

### Fase 5 — Dominação (Mês 10-12) — "Ser o #1"

```
PRIORIDADE BAIXA (escala):

1. ✅ Marketplace de Câmbio (Wise/Nomad)
2. ✅ Conteúdo Educacional (cursos, webinars)
3. ✅ API pública para desenvolvedores terceiros
4. ✅ White-label para assessores de investimento
5. ✅ Lançamento oficial marca "Dividend Titan" (nome internacional)
```

---

## 🏗️ Arquitetura Proposta para Escala

```
Arquitetura Atual (Monolito Frontend):
┌─────────────────────────────────┐
│  React + Vite (SPA)             │
│  ├── Zustand (estado)           │
│  ├── Supabase Client (API)      │
│  └── Edge Functions (proxy)     │
└─────────────────────────────────┘

Arquitetura Proposta (Microserviços + Edge):
┌─────────────────────────────────────────────────┐
│  Frontend (React + Vite + PWA)                  │
│  ├── Zustand + persist (offline-first)          │
│  ├── react-i18next (PT/EN)                      │
│  └── Service Workers (cache + push)             │
├─────────────────────────────────────────────────┤
│  Edge Layer (Supabase Edge Functions)           │
│  ├── app-proxy (API gateway — já existe)        │
│  ├── ai-proxy (LLM gateway — GPT-4o/Claude)    │
│  ├── quote-sync (cotações cron — já existe)     │
│  └── dividend-detector (CVM parser — NOVO)      │
├─────────────────────────────────────────────────┤
│  Microserviços (Supabase/Cloudflare Workers)    │
│  ├── cvm-ingest (Go/Node — dados abertos CVM)  │
│  ├── sentiment-engine (NLP — notícias)          │
│  ├── tax-engine (cálculo fiscal real)           │
│  └── open-finance-bridge (Pluggy adapter)       │
├─────────────────────────────────────────────────┤
│  Dados (Supabase PostgreSQL)                    │
│  ├── Tabelas existentes (assets, transactions)  │
│  ├── dividend_intelligence (NOVO)               │
│  ├── ai_company_insights (NOVO)                 │
│  ├── tax_history (NOVO)                         │
│  ├── sentiment_cache (NOVO)                     │
│  └── insider_transactions (NOVO)                │
└─────────────────────────────────────────────────┘
```

---

## 📊 Tabela de Novas Tabelas SQL Propostas

```sql
-- 1. Dividend Intelligence (MDI 2.0)
CREATE TABLE dividend_intelligence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticker VARCHAR(15) NOT NULL,
    announcement_date DATE,
    date_com DATE,
    ex_dividend_date DATE,
    payment_date DATE,
    value_per_share NUMERIC(15,6),
    total_value NUMERIC(18,2),
    dividend_type VARCHAR(20), -- 'dividendo', 'jcp', 'rendimento'
    frequency VARCHAR(20),     -- 'mensal', 'trimestral', 'semestral', 'anual'
    is_recurring BOOLEAN DEFAULT true,
    currency VARCHAR(3) DEFAULT 'BRL',
    source VARCHAR(20) DEFAULT 'CVM',  -- 'CVM', 'B3', 'brapi'
    source_document_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_div_intel_ticker ON dividend_intelligence(ticker);
CREATE INDEX idx_div_intel_date_com ON dividend_intelligence(date_com);

-- 2. AI Company Insights (Titan Analyst)
CREATE TABLE ai_company_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticker VARCHAR(15) NOT NULL,
    quarter_ref VARCHAR(10),      -- ex: '2T2024'
    debt_health_score FLOAT,      -- 0-100
    dividend_sustainability FLOAT, -- 0-100
    sector_risk_score FLOAT,      -- 0-100
    overall_score FLOAT,          -- 0-100
    sentiment_score FLOAT,        -- -1 a 1
    summary_md TEXT,
    raw_analysis JSONB,           -- resposta completa do LLM
    model_used VARCHAR(50),       -- 'gpt-4o', 'claude-3.5'
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_ai_insights_ticker ON ai_company_insights(ticker);

-- 3. Ceiling Prices (Preço Teto Triplo)
CREATE TABLE ceiling_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticker VARCHAR(15) NOT NULL,
    classic_ceiling NUMERIC(12,4),    -- Barsi: DJA / 0.06
    projective_ceiling NUMERIC(12,4), -- projeções analistas
    ai_ceiling NUMERIC(12,4),         -- IA normalizada
    consensus_price NUMERIC(12,4),    -- consenso mercado
    current_price NUMERIC(12,4),
    upside_pct FLOAT,                 -- % abaixo do preço-teto
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_ceiling_ticker ON ceiling_prices(ticker);

-- 4. Tax History (Histórico Fiscal)
CREATE TABLE tax_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    tax_year INT NOT NULL,
    tax_month INT NOT NULL,
    asset_type VARCHAR(20),     -- 'acoes', 'fiis', 'renda_fixa', 'cripto', 'internacional'
    total_sales NUMERIC(18,2),
    total_cost NUMERIC(18,2),
    capital_gain NUMERIC(18,2),
    exemption_applied NUMERIC(18,2),
    taxable_gain NUMERIC(18,2),
    tax_rate FLOAT,
    tax_due NUMERIC(18,2),
    darf_generated BOOLEAN DEFAULT false,
    darf_number VARCHAR(50),
    carry_forward_loss NUMERIC(18,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_tax_history_user ON tax_history(user_id, tax_year, tax_month);

-- 5. Insider Transactions (Rastreador de Insiders)
CREATE TABLE insider_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticker VARCHAR(15) NOT NULL,
    insider_name TEXT,
    insider_role VARCHAR(100),   -- 'Diretor', 'Conselheiro', 'Controlador'
    transaction_type VARCHAR(10), -- 'Compra', 'Venda'
    quantity BIGINT,
    price NUMERIC(12,4),
    total_value NUMERIC(18,2),
    transaction_date DATE,
    filing_date DATE,
    cvm_document_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_insider_ticker ON insider_transactions(ticker);
CREATE INDEX idx_insider_date ON insider_transactions(transaction_date);

-- 6. Sentiment Cache (Análise de Sentimento)
CREATE TABLE sentiment_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticker VARCHAR(15) NOT NULL,
    news_title TEXT,
    news_source VARCHAR(100),
    published_at TIMESTAMPTZ,
    sentiment FLOAT,            -- -1 a 1
    confidence FLOAT,           -- 0 a 1
    summary TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_sentiment_ticker ON sentiment_cache(ticker);
CREATE INDEX idx_sentiment_date ON sentiment_cache(published_at);
```

---

## 🎯 Veredito Final: Caminho para o #1

```
RESUMO COMPETITIVO:

                    AGF          AutoInvest (Atual)    AutoInvest (Pós-Upgrade)
─────────────────────────────────────────────────────────────────────────────
Base de Usuários  300k+          ~0 (novo)             Foco: 10k no ano 1
Preço Teto        ✅ 3 tipos     ❌ Nenhum             ✅ 3 tipos + IA
MDI               ✅ Histórico   ⚠️ Básico             ✅ Preditivo + IA
YoC               ✅             ❌                    ✅
Import B3         ✅             ❌                    ✅ + Open Finance
IA Generativa     ❌             ⚠️ Wizard básico      ✅ LLM + Chat + Analyst
Fiscal            ❌             ⚠️ Simplificado       ✅ Profissional
Multi-moeda       ❌             ✅                    ✅ + Arbitragem
Magic Number      ❌             ✅                    ✅
Rebalanceamento   ❌             ✅                    ✅ + Execução
Tax Loss Harv.    ❌             ✅                    ✅
Backtesting       ❌             ❌                    ✅
Insiders          ❌             ❌                    ✅
Internacional     ❌             ✅                    ✅ + Impostos globais
Preço             R$29-99/mês    R$0-129/mês           30-40% mais barato
─────────────────────────────────────────────────────────────────────────────

CONCLUSÃO:

O AGF é líder consolidado com 300k+ usuários e R$13B em carteiras, 
mas é um app ESTÁTICO — olha para o passado (histórico, média, ranking).

O AutoInvest tem a oportunidade de se tornar o app DINÂMICO — 
olha para o futuro (predição, IA, otimização, automação).

A estratégia não é COPIAR o AGF, mas TRANSBORDÁ-LO:
- Onde o AGF é forte → igualar rápido (Preço Teto, MDI, YoC, Import B3)
- Onde o AGF é fraco → dominar completamente (IA, Fiscal, Multi-moeda, Rebalanceamento)
- Onde ninguém existe → criar categoria (Magic Number, Tax Loss Harvesting, Bitributação)

O AutoInvest não precisa ser "melhor que o AGF". 
Precisa ser "diferente de tudo que existe" — e o AGF por definição ficará para trás.
```