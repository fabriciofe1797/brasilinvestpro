# BrasilInvest Pro - Plano de Negócios

## 1. Roadmap de Implementação (MVP até Scale)

### Fase 1 - MVP (Mês 1-3)
**Objetivo:** Lançar versão mínima viável com funcionalidades essenciais

**Entregáveis:**
- Dashboard multi-moeda com câmbio EUR/BRL
- Monitoramento de 3-5 FIIs principais (BTLG11, VISC11, TRXF11)
- Calculadora do "Número Mágico"
- Simulador básico de juros compostos
- Alertas de bitributação simplificados
- Design mobile-first com dark mode

**Métricas de Sucesso:**
- 100 usuários ativos mensais
- 60% de retenção após 30 dias
- 4.0+ rating na app store

### Fase 2 - Product-Market Fit (Mês 4-6)
**Objetivo:** Expandir funcionalidades e validar modelo de negócio

**Entregáveis:**
- Hub de mercado inteligente com 50+ ativos
- Sistema de busca e filtros avançados
- Timeline de jornada do investidor
- Central de alertas personalizados
- Sistema de assinatura Freemium

**Métricas de Sucesso:**
- 1.000 usuários ativos mensais
- 5% taxa de conversão para planos pagos
- €10.000 MRR (Monthly Recurring Revenue)

### Fase 3 - Growth (Mês 7-12)
**Objetivo:** Escalar usuários e receita

**Entregáveis:**
- API própria de dados de mercado
- Inteligência artificial para recomendações
- Comunidade integrada no app
- Web dashboard desktop
- Integração com corretoras parceiras

**Métricas de Sucesso:**
- 10.000 usuários ativos mensais
- 8% taxa de conversão
- €50.000 MRR

### Fase 4 - Scale (Ano 2-3)
**Objetivo:** Dominar nicho e expandir geograficamente

**Entregáveis:**
- Expansão para outros países europeus
- Suporte multi-idioma
- Produtos financeiros próprios
- White-label para bancos/corretoras
- Marketplace de investimentos

**Métricas de Sucesso:**
- 100.000 usuários ativos mensais
- €500.000 MRR
- Presença em 5+ países europeus

## 2. Arquitetura de Dados para Múltiplos Ativos

### 2.1 Modelo de Dados Principal

```mermaid
erDiagram
    USER ||--o{ PORTFOLIO : has
    USER ||--o{ SUBSCRIPTION : has
    PORTFOLIO ||--o{ HOLDING : contains
    ASSET ||--o{ HOLDING : referenced
    ASSET ||--o{ QUOTE : has
    ASSET ||--o{ DIVIDEND : pays
    ASSET ||--o{ MAGIC_NUMBER : tracks
    EXCHANGE_RATE ||--o{ CONVERSION : used_in

    USER {
        uuid id PK
        string email
        string name
        string country
        string plan_type
        timestamp created_at
        timestamp last_login
    }

    ASSET {
        uuid id PK
        string ticker
        string name
        string category
        string subcategory
        string exchange
        string currency
        decimal current_price
        decimal p_vp
        decimal dividend_yield
        string sector
        boolean is_active
    }

    PORTFOLIO {
        uuid id PK
        uuid user_id FK
        string name
        string base_currency
        decimal total_value
        timestamp updated_at
    }

    HOLDING {
        uuid id PK
        uuid portfolio_id FK
        uuid asset_id FK
        decimal quantity
        decimal avg_price
        decimal current_value
        decimal total_invested
        decimal total_dividends
        timestamp created_at
    }

    QUOTE {
        uuid id PK
        uuid asset_id FK
        decimal price
        decimal change
        decimal change_percent
        timestamp timestamp
    }

    DIVIDEND {
        uuid id PK
        uuid asset_id FK
        decimal amount_per_share
        date payment_date
        date ex_date
        decimal total_amount
        string currency
    }

    MAGIC_NUMBER {
        uuid id PK
        uuid asset_id FK
        uuid user_id FK
        decimal target_amount
        decimal current_progress
        decimal shares_needed
        decimal monthly_dividend
        timestamp projected_date
    }

    EXCHANGE_RATE {
        uuid id PK
        string from_currency
        string to_currency
        decimal rate
        decimal spread
        timestamp timestamp
    }
}
```

### 2.2 Categorização de Ativos

**FIIs de Tijolo:**
- Logística: HGLG11, BTLG11, HGRE11
- Shoppings: XPML11, VISC11, BRCO11
- Renda Urbana: HGRU11, HGCR11

**FIIs de Papel/Agro:**
- Papéis: KNCR11, XPPR11
- Agrícolas: MXRF11, KNCA11

**Ações de Dividendos:**
- Bancos: BBAS3, ITUB4, SANB11
- Elétricas: TAEE11, TRPL4, CPLE6
- Seguradoras: BBSE3, SULA11
- Commodities: VALE3, PETR4

### 2.3 Dados de Mercado em Tempo Real

**Fontes de Dados:**
- Yahoo Finance API (gratuito, delay 15min)
- Alpha Vantage (freemium, 5 calls/min)
- Brapi (Brasil, gratuito)
- Status Invest (scraping, rate limited)

**Cache e Atualização:**
- Redis para cache de cotações (TTL: 5min)
- Atualização assíncrona via WebSocket
- Fallback para dados históricos em caso de falha

### 2.4 Segurança e Compliance

**Bitributação Brasil-Portugal:**
- Tracking automático de dividendos recebidos
- Cálculo de crédito fiscal disponível
- Alertas de limite de isenção
- Geração de relatórios para contador

**LGPD/GDPR:**
- Criptografia de dados sensíveis
- Consentimento explícito para dados financeiros
- Direito ao esquecimento implementado
- Logs de auditoria completos

## 3. Modelagem Financeira (SaaS)

### 3.1 Estrutura de Planos

| Plano | Preço | Usuários Alvo | Features Principais |
|-------|--------|---------------|-------------------|
| **Freemium** | Grátis | 70% | 3 ativos, dashboard básico, alertas limitados |
| **Essential** | €9,90/mês | 20% | 15 ativos, simulador completo, alertas ilimitados |
| **Professional** | €19,90/mês | 10% | Ativos ilimitados, IA recomendações, API, suporte prioritário |

### 3.2 Projeção de Receita (5 Anos)

**Premissas:**
- Crescimento mensal de usuários: 15% (ano 1), 10% (ano 2-5)
- Taxa de conversão Freemium→Pago: 5% (ano 1), 8% (anos 2-5)
- Churn mensal: 5% (ano 1), 3% (anos 2-5)
- Mix de planos pagos: 70% Essential, 30% Professional

**Ano 1:**
- Usuários ativos (final): 10.000
- Receita total: €120.000
- MRR final: €15.000

**Ano 2:**
- Usuários ativos (final): 50.000
- Receita total: €720.000
- MRR final: €80.000

**Ano 3:**
- Usuários ativos (final): 150.000
- Receita total: €2.160.000
- MRR final: €250.000

**Ano 4:**
- Usuários ativos (final): 300.000
- Receita total: €4.320.000
- MRR final: €500.000

**Ano 5:**
- Usuários ativos (final): 500.000
- Receita total: €7.200.000
- MRR final: €900.000

### 3.3 Fontes Adicionais de Receita

**Rev Share Corretagem (Ano 2+):**
- 20% de comissão sobre novos clientes
- Estimativa: €50-100 por usuário ativo/ano
- Projeção Ano 5: €2.500.000

**Spread de Câmbio (Ano 3+):**
- 0.5-1% spread em transações
- Parceria com fintechs de remessa
- Projeção Ano 5: €1.000.000

**Publicidade Segmentada (Ano 4+):**
- Anúncios para serviços financeiros
- Lead generation para corretoras
- Projeção Ano 5: €500.000

### 3.4 Estrutura de Custos

**Custos Fixos Mensais (Ano 1):**
- Infraestrutura (AWS/Supabase): €2.000
- Equipe (8 pessoas): €40.000
- Dados de mercado: €5.000
- Marketing: €10.000
- **Total: €57.000/mês**

**Custos Variáveis:**
- Processamento de pagamentos: 3% da receita
- Suporte cliente: €1/usuário ativo/mês
- Compliance/Legal: €0.50/usuário ativo/mês

**Break-even:** Mês 18 (€80.000 MRR)

### 3.5 Métricas Chave (KPIs)

**CAC (Customer Acquisition Cost):**
- Ano 1: €50
- Ano 3: €30
- Ano 5: €20

**LTV (Lifetime Value):**
- Ano 1: €300
- Ano 3: €500
- Ano 5: €800

**LTV/CAC Ratio:** 6:1 (meta mínima 3:1)

**MRR Growth Rate:** 15% mensal (ano 1), 8% (anos 2-5)

**Net Revenue Retention:** 110%+ (expansão revenue > churn)

### 3.6 Estratégia de Precificação Dinâmica

**Testes A/B (Ano 2):**
- Preço Essential: €7,90 vs €9,90 vs €12,90
- Preço Professional: €15,90 vs €19,90 vs €24,90
- Análise de elasticidade por país

**Preços por Região:**
- Portugal/Espanha: Preço base
- França/Alemanha: +20%
- Europa do Leste: -30%
- Brasil (expatriados): -15%

**Descontos Estratégicos:**
- Anual: 2 meses grátis (17% desconto)
- Estudantes: 50% desconto
- Senior (60+): 30% desconto
- Família: +50% para 3+ contas

## 4. Conclusão e Próximos Passos

O BrasilInvest Pro tem potencial de se tornar o principal app de investimentos para brasileiros na Europa, com:

- **TAM (Total Addressable Market):** 2M+ brasileiros na Europa
- **SAM (Serviceable Addressable Market):** 500K brasileiros investidores
- **SOM (Serviceable Obtainable Market):** 50K usuários em 5 anos (10% penetracão)

**Próximos passos imediatos:**
1. Validar MVP com 100 usuários beta
2. Estabelecer parcerias com corretoras brasileiras
3. Implementar sistema de afiliados
4. Preparar para rodada Seed (€2M) no mês 6

**Meta final:** IPO ou aquisição por fintech major em 7-10 anos, com valuation alvo de €500M+.