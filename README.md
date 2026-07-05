# AutoInvest

Plataforma de acompanhamento de carteira, renda passiva e inteligência de investimentos para usuários com exposição ao mercado brasileiro, com foco especial em FIIs, ações, cripto e contexto multi-moeda.

## O produto em poucas linhas

O app combina:

- dashboard de carteira
- extrato e importação de operações
- hub de mercado com descoberta de ativos
- cálculo de dividendos e rebalanceamento
- simuladores e ferramentas premium
- autenticação com Clerk
- backend com Supabase Edge Functions

O objetivo do produto não é só mostrar cotações, mas ajudar o usuário a transformar aportes recorrentes em metas tangíveis de patrimônio e renda passiva.

## Stack atual

- `React 18`
- `TypeScript`
- `Vite`
- `Tailwind CSS`
- `Zustand`
- `Clerk` para autenticação
- `Supabase` para banco, funções e persistência
- `Stripe` para cobrança

## Estrutura principal

```text
src/
  components/     Componentes reutilizáveis e layout
  pages/          Telas do produto
  services/       Integrações, parsing e regras de acesso
  store/          Estado global com Zustand
  data/           Catálogo inicial mockado
  lib/            Utilitários e fórmulas

supabase/
  functions/      Edge Functions de backend

migrations/
  SQLs de evolução do banco e políticas
```

## Como o app funciona hoje

### Frontend

- autentica o usuário via Clerk
- controla navegação e gating de planos
- mantém estado local da carteira, ativos, alertas e missões
- usa um catálogo inicial mockado para descoberta de ativos
- sincroniza transações, licença e parte dos ativos com o backend

### Backend

- centraliza transações, licença e perfil via `supabase/functions/app-proxy`
- calcula portfólio consolidado e série temporal
- atualiza preços com funções server-side
- registra upgrades de plano via webhook Stripe

## Fontes de dados atuais

- `brapi.dev` para ações, FIIs e parte dos dados de mercado
- `CoinGecko` para cripto
- `AwesomeAPI` para câmbio

Observação importante:
parte do produto ainda depende de valores mockados ou dados sincronizados sob demanda. Isso significa que nem toda tela exibe, hoje, a mesma qualidade de atualização.

## Estado atual do projeto

Pontos fortes:

- produto com proposta clara
- boa cobertura de casos de uso para investidor pessoa física
- backend já suporta persistência real e regras de plano
- base visual forte para um SaaS premium

Pontos que precisam de evolução:

- documentação estava ausente
- há mistura entre dados mockados e dados reais
- nem todos os ativos exibidos recebem atualização consistente
- ainda existem problemas de encoding em vários textos
- o lint do projeto ainda precisa de saneamento

## Documentação complementar

O diagnóstico de produto, auditoria da coleta de dados, plano de melhorias e roadmap recomendado estão em:

- [docs/PRODUCT_STRATEGY.md](C:/Users/fabricio.araujo/Documents/PROJETOS_PESSOAIS/autoinvest/docs/PRODUCT_STRATEGY.md)

## Ambiente local

### Scripts

- `npm run dev`
- `npm run build`
- `npm run check`
- `npm run lint`

### Variáveis de ambiente esperadas

- `VITE_CLERK_PUBLISHABLE_KEY`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_STRIPE_LINK_STARTER`
- `VITE_STRIPE_LINK_PRO`
- `VITE_STRIPE_LINK_MASTER`
- `VITE_STRIPE_LINK_ELITE`

## Prioridade recomendada

Se a próxima fase for focada em confiança e conversão, a ordem sugerida é:

1. consolidar pipeline de dados e carimbo de atualização
2. reduzir dependência de mocks em produção
3. corrigir encoding e qualidade estática
4. lançar diferenciais premium baseados em metas reais do usuário
