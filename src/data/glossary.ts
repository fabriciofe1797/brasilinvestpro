/**
 * Glossário educacional — explicações curtas e contextual dos termos
 * financeiros exibidos na plataforma.
 */

export interface GlossaryTerm {
  key: string;
  label: string;
  definition: string;
}

export const GLOSSARY: Record<string, GlossaryTerm> = {
  pvp: {
    key: 'pvp',
    label: 'P/VP',
    definition:
      'Preço sobre Valor Patrimonial: quanto você paga por cada R$ 1 de patrimônio do ativo. Abaixo de 1 indica desconto sobre o valor patrimonial.',
  },
  pl: {
    key: 'pl',
    label: 'P/L',
    definition:
      'Preço sobre Lucro: quantos anos levaria para recuperar o investimento se o lucro atual se mantivesse. Quanto menor, mais "barato" em relação ao lucro.',
  },
  dy: {
    key: 'dy',
    label: 'Dividend Yield (DY)',
    definition:
      'Percentual de proventos pagos nos últimos 12 meses em relação ao preço atual. É a renda passiva anual que o ativo gera em % do preço.',
  },
  dividend: {
    key: 'dividend',
    label: 'Dividendos',
    definition:
      'Parte do lucro distribuída aos acionistas. FIIs pagam rendimentos mensais; ações pagam dividendos e JCP (Juros sobre Capital Próprio).',
  },
  graham: {
    key: 'graham',
    label: 'Preço Justo (Graham)',
    definition:
      'Fórmula de Benjamin Graham: raiz quadrada de (22,5 × lucro por ação × valor patrimonial por ação). Indica preço justo para ações de valor.',
  },
  bazin: {
    key: 'bazin',
    label: 'Preço Justo (Bazin)',
    definition:
      'Método de Décio Bazin: dividendo por ação ÷ 6%. É o preço máximo a pagar para garantir pelo menos 6% de retorno em dividendos.',
  },
  ceiling: {
    key: 'ceiling',
    label: 'Preço Teto',
    definition:
      'Preço máximo recomendado para comprar o ativo mantendo margem de segurança. Acima do teto, o ativo está caro para os critérios usados.',
  },
  magicNumber: {
    key: 'magicNumber',
    label: 'Magic Number',
    definition:
      'Quantidade de cotas necessária para que os rendimentos mensais comprem uma nova cota — o "ponto mágico" do reinvestimento automático.',
  },
  cdi: {
    key: 'cdi',
    label: 'CDI',
    definition:
      'Certificado de Depósito Interbancário: taxa de referência da renda fixa. Seu benchmark mínimo — a carteira deveria superá-lo no longo prazo.',
  },
  yoc: {
    key: 'yoc',
    label: 'Yield on Cost (YoC)',
    definition:
      'Rendimento atual em relação ao preço médio que VOCÊ pagou. Quanto mais você acumula cotas baratas, maior seu YoC sobre o capital investido.',
  },
};
