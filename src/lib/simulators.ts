export type SimulatorResult = {
  totalInvested: number;
  grossReturn: number;
  irTax: number;
  feeTax: number;
  netValue: number;
};

export const getIrRate = (days: number) => {
  if (days <= 180) return 0.225;
  if (days <= 360) return 0.2;
  if (days <= 720) return 0.175;
  return 0.15;
};

const yearFraction = (days: number) => days / 365;

type CustodyKind = 'tesouro_prefixado' | 'tesouro_ipca' | 'tesouro_selic' | 'cdb' | 'lci' | 'lca';
export const CUSTODY = { rate: 0.002, selicThreshold: 10000 };
type CustodyConfig = { rate: number; selicThreshold: number };
const computeCustody = (kind: CustodyKind, initial: number, vf: number, days: number, cfg?: CustodyConfig) => {
  const n = yearFraction(days);
  const conf = cfg ?? CUSTODY;
  if (kind === 'tesouro_selic') {
    const base = initial > conf.selicThreshold ? initial - conf.selicThreshold : 0;
    return base * conf.rate * n;
  }
  if (kind === 'tesouro_prefixado' || kind === 'tesouro_ipca') {
    return vf * conf.rate * n;
  }
  return 0;
};

export const simulateTesouroPrefixado = (initial: number, annualRate: number, days: number, compounding: 'annual' | 'daily' = 'annual', custody?: CustodyConfig): SimulatorResult => {
  const eff = annualRate;
  let vf = initial;
  if (compounding === 'daily') {
    const daily = Math.pow(1 + eff, 1 / 365) - 1;
    const d = Math.max(0, Math.floor(days));
    vf = initial * Math.pow(1 + daily, d);
  } else {
    const n = yearFraction(days);
    vf = initial * Math.pow(1 + eff, n);
  }
  const gross = vf - initial;
  const ir = gross * getIrRate(days);
  const custodyFee = computeCustody('tesouro_prefixado', initial, vf, days, custody);
  const net = vf - ir - custodyFee;
  return {
    totalInvested: initial,
    grossReturn: gross,
    irTax: ir,
    feeTax: custodyFee,
    netValue: net,
  };
};

export const simulateCdb = (initial: number, cdiAnnual: number, cdiPercent: number, days: number): SimulatorResult => {
  const n = yearFraction(days);
  const eff = cdiAnnual * cdiPercent;
  const vf = initial * Math.pow(1 + eff, n);
  const gross = vf - initial;
  const ir = gross * getIrRate(days);
  const net = vf - ir;
  return {
    totalInvested: initial,
    grossReturn: gross,
    irTax: ir,
    feeTax: 0,
    netValue: net,
  };
};

export const simulateLciLca = (initial: number, cdiAnnual: number, cdiPercent: number, days: number): SimulatorResult => {
  const n = yearFraction(days);
  const eff = cdiAnnual * cdiPercent;
  const vf = initial * Math.pow(1 + eff, n);
  const gross = vf - initial;
  return {
    totalInvested: initial,
    grossReturn: gross,
    irTax: 0,
    feeTax: 0,
    netValue: vf,
  };
};

export const simulateTesouroSelic = (initial: number, selicAnnual: number, fixedAnnual: number, days: number, compounding: 'annual' | 'daily' = 'annual', custody?: CustodyConfig): SimulatorResult => {
  const eff = selicAnnual + fixedAnnual;
  let vf = initial;
  if (compounding === 'daily') {
    const daily = Math.pow(1 + eff, 1 / 365) - 1;
    const d = Math.max(0, Math.floor(days));
    vf = initial * Math.pow(1 + daily, d);
  } else {
    const n = yearFraction(days);
    vf = initial * Math.pow(1 + eff, n);
  }
  const gross = vf - initial;
  const ir = gross * getIrRate(days);
  const custodyFee = computeCustody('tesouro_selic', initial, vf, days, custody);
  const net = vf - ir - custodyFee;
  return {
    totalInvested: initial,
    grossReturn: gross,
    irTax: ir,
    feeTax: custodyFee,
    netValue: net,
  };
};

export const simulateTesouroIpcaMais = (initial: number, ipcaAnnual: number, fixedAnnual: number, days: number, compounding: 'annual' | 'monthly' | 'daily' = 'annual', custody?: CustodyConfig): SimulatorResult => {
  const eff = ipcaAnnual + fixedAnnual;
  let vf = initial;
  if (compounding === 'monthly') {
    const monthly = Math.pow(1 + eff, 1 / 12) - 1;
    const daily = Math.pow(1 + eff, 1 / 365) - 1;
    const months = Math.floor(days / 30);
    const remDays = Math.max(0, days - months * 30);
    vf = initial * Math.pow(1 + monthly, months) * Math.pow(1 + daily, remDays);
  } else if (compounding === 'daily') {
    const daily = Math.pow(1 + eff, 1 / 365) - 1;
    const d = Math.max(0, Math.floor(days));
    vf = initial * Math.pow(1 + daily, d);
  } else {
    const n = yearFraction(days);
    vf = initial * Math.pow(1 + eff, n);
  }
  const gross = vf - initial;
  const ir = gross * getIrRate(days);
  const custodyFee = computeCustody('tesouro_ipca', initial, vf, days, custody);
  const net = vf - ir - custodyFee;
  return {
    totalInvested: initial,
    grossReturn: gross,
    irTax: ir,
    feeTax: custodyFee,
    netValue: net,
  };
};

