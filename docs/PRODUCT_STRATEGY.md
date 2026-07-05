# AutoInvest - Documentação de Produto e Plano de Evolução

## 1. Resumo Executivo

O AutoInvest já tem base suficiente para se posicionar como um produto premium de gestão de carteira e renda passiva com apelo forte para:

- investidores brasileiros que acompanham FIIs, ações e cripto
- usuários que vivem ou planejam viver entre moedas
- assinantes que valorizam automação, clareza visual e inteligência de decisão

Hoje o produto transmite ambição de plataforma completa, mas ainda opera com um modelo híbrido entre protótipo avançado e SaaS em produção:

- a arquitetura central existe
- a proposta de valor é clara
- as integrações principais estão conectadas
- porém a consistência dos dados e da documentação ainda não acompanha a ambição do produto

Este documento organiza:

- a visão atual do produto
- a auditoria da forma de coleta de dados
- o diagnóstico do que precisa melhorar
- um plano de evolução em fases
- funcionalidades premium recomendadas
- uma proposta fora da caixa para diferenciação real

## 2. Proposta de Valor Atual

### O que o produto já entrega bem

- centralização da carteira num só lugar
- registro e importação de operações
- visão de dividendos e rebalanceamento
- separação por planos com monetização clara
- identidade visual forte para o público premium

### O que o produto precisa passar a entregar de forma inequívoca

- confiança de dados
- sensação de “tempo real confiável”
- clareza sobre origem e horário das cotações
- inteligência realmente personalizada
- consistência entre o que o marketing promete e o que o app mostra

## 3. Arquitetura Atual do Produto

### Frontend

- `React + Zustand` mantém o estado principal da experiência
- o catálogo inicial de ativos nasce de `src/data/mockData.ts`
- o usuário navega por dashboard, mercado, extrato, importação, simuladores, fiscal e módulos premium
- o gating por plano acontece no cliente via `RequirePlan`

### Backend

- `supabase/functions/app-proxy` concentra as ações principais do backend
- o proxy cuida de perfil, transações, licença, cotações, portfólio e séries históricas
- `stripe-webhook` atualiza licenças
- `refresh-prices` atualiza preços persistidos no Supabase
- `check-licenses` gerencia expiração e grace period

### Modelo operacional atual

O produto trabalha com três camadas de informação:

1. catálogo inicial mockado para garantir descoberta e UX
2. dados do banco sincronizados para usuário autenticado
3. cotações consultadas via provedores externos

Esse desenho acelera produto, mas cria risco de divergência visual e funcional se não houver política clara de “fonte da verdade”.

## 4. Auditoria da Coleta de Dados

## 4.1 Fontes usadas hoje

### Ações, FIIs e parte do mercado brasileiro

- fonte principal: `brapi.dev`
- uso no projeto:
  - client-side em `src/services/api.ts`
  - server-side em `supabase/functions/app-proxy/index.ts`
  - atualização massiva em `supabase/functions/refresh-prices/index.ts`

Segundo a documentação oficial da brapi.dev, a API fornece cotações, histórico, dividendos, fundamentos e dados de mercado, e recomenda uso autenticado no backend para produção.
Fonte: [Documentação brapi.dev](https://brapi.dev/docs), [Endpoint de ações](https://brapi.dev/docs/acoes)

### Criptomoedas

- fonte principal: `CoinGecko`
- uso no projeto:
  - busca e preço em `src/services/api.ts`
  - consulta de preço em `app-proxy`

A documentação oficial da CoinGecko informa que o endpoint `/simple/price` é adequado para preço rápido e permite sinalizar `include_24hr_change` e `include_last_updated_at`.
Fonte: [CoinGecko /simple/price](https://docs.coingecko.com/reference/simple-price), [Visão geral da API](https://www.coingecko.com/en/api)

### Câmbio

- fonte principal: `AwesomeAPI`
- uso no projeto:
  - `src/services/api.ts`

A documentação oficial informa que o endpoint `/last` retorna moedas selecionadas e que chamadas sem chave podem sofrer cache. Também recomenda API key para acesso em tempo real.
Fonte: [AwesomeAPI - API de Cotações](https://docs.awesomeapi.com.br/api-de-moedas), [Instruções de API Key](https://docs.awesomeapi.com.br/instrucoes-api-key)

## 4.2 O que está correto na abordagem atual

- usar backend para parte relevante da coleta é a direção certa
- usar provedores especializados por domínio é uma boa decisão
- persistir preços no banco para consultas subsequentes também é correto
- o proxy reduz exposição de tokens e prepara o caminho para regras mais fortes

## 4.3 O que está incompleto ou inconsistente hoje

### 1. O app não atualiza todo o catálogo exibido ao usuário

No `MarketHub`, a tela mostra um merge entre:

- catálogo mockado
- ativos sincronizados do store

Mas a atualização de cotações chama `getQuotesDetailed` apenas para os ativos já existentes no `store`, não para todo o catálogo exibido.

Impacto:

- o usuário pode ver muitos ativos na tela com valores antigos/mockados
- a sensação de “hub de mercado” fica inferior ao que a interface promete

### 2. O backend de cripto cobre apenas parte do catálogo atual

Hoje o proxy mapeia explicitamente:

- `BTC`
- `ETH`

Enquanto o catálogo mockado também contém:

- `SOL`
- `USDC`

Impacto:

- parte dos ativos de cripto mostrados no app não recebe atualização consistente

### 3. O app mistura “dados reais” com “narrativa visual”

Há telas com:

- taxas de câmbio hardcoded
- variações percentuais estáticas
- tickers e números promocionais na landing

Impacto:

- isso é aceitável para marketing
- mas não deve contaminar telas que o usuário interpreta como operacionais

### 4. Não existe uma estratégia forte de carimbo de atualização

Falta exibir claramente:

- fonte do dado
- horário da última atualização
- se o dado é cacheado, estimado, importado ou em tempo real

Impacto:

- o usuário não sabe se o preço está atual
- a confiança do produto cai, especialmente para assinantes pagos

### 5. O câmbio ainda depende de chamada direta no cliente

O app usa AwesomeAPI client-side para taxa cambial. A API oficial informa que chamadas sem chave podem sofrer cache.

Impacto:

- possíveis inconsistências de atualização
- ausência de controle centralizado do freshness
- menor governança sobre falhas e limites

### 6. Há sobreposição de responsabilidade entre frontend e backend

Regras de plano, limites e parte do comportamento comercial existem no cliente e também no servidor.

Impacto:

- risco de divergência funcional
- manutenção mais cara

## 4.4 Veredito sobre os dados atuais

### A coleta atual está “correta”?

Parcialmente.

Ela está correta como base de MVP e produto em evolução, mas ainda não está madura o bastante para sustentar a promessa de “mercado atualizado e confiável” em todas as áreas do app.

### Onde está boa

- persistência de transações
- cálculo de portfólio
- proxy de backend para regras e leitura
- uso de provedores adequados por categoria

### Onde ainda não está boa o suficiente

- atualização completa do catálogo
- cobertura de todos os criptoativos mostrados
- transparência sobre freshness
- unificação da fonte da verdade
- remoção gradual de mocks em telas operacionais

## 5. Recomendação de Arquitetura de Dados

## 5.1 Princípio central

Toda tela operacional deve depender de uma camada única de dados normalizados, com:

- `source`
- `last_updated_at`
- `staleness_status`
- `confidence_level`

### Exemplo de contrato desejado

```ts
type MarketQuote = {
  ticker: string
  price: number | null
  currency: 'BRL' | 'USD' | 'EUR'
  changePercent24h?: number | null
  source: 'brapi' | 'coingecko' | 'awesomeapi' | 'manual' | 'derived'
  lastUpdatedAt: string | null
  status: 'live' | 'delayed' | 'stale' | 'unavailable'
}
```

## 5.2 Modelo recomendado

### Camada 1. Ingestão

- coletar preços apenas no backend
- nunca depender do frontend para cotações oficiais
- usar jobs agendados para atualização de preços

### Camada 2. Normalização

- padronizar schema para ações, FIIs, cripto, ETFs e câmbio
- centralizar aliases de ticker
- separar claramente ativo, preço atual e série histórica

### Camada 3. Exposição

- servir ao frontend apenas dados já tratados
- incluir metadata de atualização
- devolver fallback explicitamente rotulado

### Camada 4. UX de confiança

- badge “Atualizado às 14:05”
- fonte exibida no card/modal
- indicador visual para “dado estimado” ou “offline”

## 6. Melhorias Prioritárias de Engenharia e Produto

## Fase 1. Confiança e base profissional

### 1. Remover mock como fonte operacional

- manter mocks apenas para onboarding, dev ou fallback explícito
- telas autenticadas devem priorizar dados do backend

### 2. Atualizar catálogo inteiro do MarketHub

- cotar todos os ativos exibidos, não só os ativos da carteira
- armazenar resultado e carimbo de atualização

### 3. Expandir cobertura de cripto

- incluir no backend todo ativo cripto exibido no catálogo
- suportar mapeamento por `CoinGecko ID`

### 4. Centralizar câmbio no backend

- mover AwesomeAPI para o proxy
- adicionar API key e política de cache

### 5. Expor freshness no frontend

- última atualização
- origem do dado
- badge de atraso

### 6. Corrigir encoding e qualidade estática

- saneamento de textos com caracteres quebrados
- redução agressiva de `any`, `@ts-ignore` e hooks problemáticos

## Fase 2. Conversão e valor percebido

### 7. Timeline de patrimônio

- mostrar evolução com eventos importantes
- aporte, compra, venda, dividendos, mudança de câmbio

### 8. Centro de alertas realmente inteligente

- drift de alocação
- dividendos abaixo do normal
- ativos com queda relevante
- janela cambial favorável

### 9. Importação de operações mais confiável

- fila de parsing
- validação por corretora
- revisão assistida antes do commit

### 10. Página de ativo mais profissional

- fundamentos
- histórico
- tese resumida
- proventos
- posição do usuário

## Fase 3. Premium e diferenciação

### 11. Simulador de metas em EUR e BRL

- objetivo em euro
- cobertura via dividendos em real
- efeito do câmbio ao longo do tempo

### 12. Otimizador de aportes

- com base em:
  - plano-alvo
  - alocação atual
  - orçamento mensal
  - preço de mercado
  - meta de renda passiva

### 13. Radar fiscal mais útil

- acompanhamento de vendas tributáveis
- cálculo de preço médio auditável
- preparação de relatório anual

### 14. Comunidade premium com dados acionáveis

- watchlists compartilhadas
- debates por tese
- ranking de carteiras-modelo

## 7. Funcionalidades TOP para deixar o app mais profissional e agradável

## Experiência

### Cockpit pessoal

Uma home que responda imediatamente:

- quanto tenho
- quanto rendo por mês
- quanto falta para minha próxima meta
- onde devo aportar agora
- se o câmbio está ajudando ou atrapalhando

### Modo “decisão do mês”

Em vez de só mostrar dados, o app entrega:

- 3 ações sugeridas
- 2 FIIs prioritários
- 1 ajuste de alocação
- 1 alerta fiscal
- 1 insight cambial

### Centro de confiança

Cada dado importante com:

- fonte
- horário
- qualidade
- explicação curta

## Inteligência

### Watchlist com nota composta

Score por ativo com:

- valuation
- dividendos
- preço vs média
- aderência ao perfil do usuário
- impacto no objetivo de renda

### Missões de investidor

Gamificação premium de alto nível:

- “complete sua reserva”
- “atinja 10% da meta de dividendos”
- “reduza concentração em setor”

### Coach de rebalanceamento

Não só mostrar pizza:

- dizer o que comprar
- quanto comprar
- por que isso melhora a carteira

## Visual e UX

### Cards com semântica de decisão

Cada card deve responder:

- está barato ou caro?
- contribui para a meta?
- aumenta ou reduz risco?
- vale aportar agora?

### Visualização de renda futura

Linha do tempo mostrando:

- renda mensal projetada
- meses em que meta será atingida
- impacto de novo aporte

## 8. Funcionalidade Fora da Caixa

## Nome sugerido

### “Mapa de Vida em Dividendos”

## Ideia

O usuário cadastra gastos reais da sua vida em Portugal ou em outra moeda:

- aluguel
- supermercado
- transporte
- escola
- lazer

O app converte isso em metas de cobertura por dividendos e monta um mapa visual:

- “seu aluguel está 37% coberto pelos seus FIIs”
- “sua conta de energia já poderia ser paga por dividendos de X e Y”
- “com mais R$ 12.400 alocados, sua meta de supermercado entra em piloto automático”

## Por que isso é único

Quase todos os apps mostram:

- patrimônio
- rentabilidade
- gráfico

Pouquíssimos conectam carteira a pedaços concretos da vida do usuário.

Esse recurso transforma o produto de “painel financeiro” em “motor de independência financeira tangível”.

## Como funcionaria

### Entrada

- despesas mensais em EUR e/ou BRL
- moeda-base do usuário
- ativos geradores de renda
- perfil de risco

### Saída

- cobertura atual por categoria de vida
- projeção de quando cada despesa ficará “paga por dividendos”
- sugestão do melhor próximo aporte para destravar a próxima meta real

### Exemplo de mensagem

> Seu portfólio já cobre 62% do seu aluguel em Lisboa. Se você mantiver os aportes atuais e priorizar HGLG11 + BBAS3 + IVVB11, a cobertura total projetada chega em 8 meses.

## Como monetizar

- recurso exclusivo do plano `master` ou `elite`
- excelente peça de marketing
- alto apelo emocional e de retenção

## 9. Roadmap Recomendado

## 0 a 30 dias

- documentar arquitetura e dados
- centralizar câmbio no backend
- corrigir atualização do catálogo do mercado
- ampliar cobertura de cripto
- mostrar `last updated` no app

## 30 a 60 dias

- página de ativo mais completa
- centro de alertas inteligentes
- importação mais robusta
- redução dos principais problemas de lint e hooks

## 60 a 90 dias

- cockpit de decisão mensal
- score de ativos
- timeline patrimonial
- primeiro MVP do `Mapa de Vida em Dividendos`

## 10. Decisões de Produto que valem ouro

### O que o app deve deixar de ser

- apenas mais um agregador bonito de preços

### O que o app deve passar a ser

- um sistema de decisão para construção de renda passiva real
- com linguagem visual premium
- com confiança de dados
- e com narrativa personalizada para a vida do usuário

## 11. Conclusão

O AutoInvest já tem base, identidade e ambição para virar um produto muito acima da média. O passo mais importante agora não é adicionar dezenas de telas novas, e sim aumentar:

- credibilidade dos dados
- consistência da experiência
- personalização útil
- clareza de posicionamento premium

Se o time fizer bem a próxima etapa, o produto pode sair da categoria “app bonito com features” para a categoria “plataforma que o usuário passa a depender para decidir seus aportes”.
